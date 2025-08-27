/* eslint-disable @next/next/no-img-element */
'use client';

// CSS imports
import 'katex/dist/katex.min.css';

// React and React-related imports
import React, { memo, useCallback, useEffect, useMemo, useRef, useState, useReducer } from 'react';

// Third-party library imports
import { useChat, UseChatOptions } from '@ai-sdk/react';
import { Crown } from '@phosphor-icons/react';
import { Search, List, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { parseAsString, useQueryState } from 'nuqs';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

// Internal app imports
import { suggestQuestions, updateChatVisibility } from '@/app/actions';

// Component imports
import { ChatDialogs } from '@/components/chat-dialogs';
import Messages from '@/components/messages';
import { Button } from '@/components/ui/button';
import FormComponent from '@/components/ui/form-component';
import { SourcesPanel } from '@/components/sources-panel';
import { Sidebar } from '@/components/sidebar';
import { HoverBorderGradient } from '@/components/ui/hover-border-gradient';
import { ChatTitles } from '@/components/chat-titles';

// Hook imports
import { useAutoResume } from '@/hooks/use-auto-resume';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useUsageData } from '@/hooks/use-usage-data';
import { useProUserStatus } from '@/hooks/use-user-data';
import { extractResearchData, exportToPDF, exportToWord } from '@/lib/export-utils';
import { useOptimizedScroll } from '@/hooks/use-optimized-scroll';
import { useChatThreads } from '@/hooks/use-chat-threads';
import { useIsMobile } from '@/hooks/use-mobile';

// Utility and type imports
import { SEARCH_LIMITS } from '@/lib/constants';
import { ChatSDKError } from '@/lib/errors';
import { cn, SearchGroupId, invalidateChatsCache } from '@/lib/utils';

// State management imports
import { chatReducer, createInitialState } from '@/components/chat-state';

interface Attachment {
  name: string;
  contentType: string;
  url: string;
  size: number;
}

interface ChatInterfaceProps {
  initialChatId?: string;
  initialMessages?: any[];
  initialVisibility?: 'public' | 'private';
  isOwner?: boolean;
}

const ChatInterface = memo(
  ({
    initialChatId,
    initialMessages,
    initialVisibility = 'private',
    isOwner = true,
  }: ChatInterfaceProps): React.JSX.Element => {
    const router = useRouter();
    const [query] = useQueryState('query', parseAsString.withDefault(''));
    const [q] = useQueryState('q', parseAsString.withDefault(''));

    // Use localStorage hook directly for model selection with a default
    const [selectedModel, setSelectedModel] = useLocalStorage<string>('ola-selected-model', 'ola-default'); // Use Ola Simple by default
    const [selectedGroup, setSelectedGroup] = useLocalStorage<SearchGroupId>('ola-selected-group', 'web');
    const [isCustomInstructionsEnabled, setIsCustomInstructionsEnabled] = useLocalStorage(
      'ola-custom-instructions-enabled',
      true,
    );

    // Get persisted values for dialog states
    const [persistedHasShownUpgradeDialog, setPersitedHasShownUpgradeDialog] = useLocalStorage(
      'ola-upgrade-prompt-shown',
      false,
    );
    const [persistedHasShownSignInPrompt, setPersitedHasShownSignInPrompt] = useLocalStorage(
      'ola-signin-prompt-shown',
      false,
    );
    const [persistedHasShownAnnouncementDialog, setPersitedHasShownAnnouncementDialog] = useLocalStorage(
      'ola-announcement-prompt-shown',
      false,
    );

    

    // Use reducer for complex state management
    const [chatState, dispatch] = useReducer(
      chatReducer,
      createInitialState(
        initialVisibility,
        persistedHasShownUpgradeDialog,
        persistedHasShownSignInPrompt,
        persistedHasShownAnnouncementDialog,
      ),
    );

    const {
      user,
      subscriptionData,
      isProUser: isUserPro,
      isLoading: proStatusLoading,
      shouldCheckLimits: shouldCheckUserLimits,
      shouldBypassLimitsForModel,
    } = useProUserStatus();

    const initialState = useMemo(
      () => ({
        query: query || q,
      }),
      [query, q],
    );

    const lastSubmittedQueryRef = useRef(initialState.query);
    const bottomRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null!);
    const inputRef = useRef<HTMLTextAreaElement>(null!);
    const initializedRef = useRef(false);

    // Use optimized scroll hook
    const { isAtBottom, hasManuallyScrolled, scrollToElement, resetManualScroll } = useOptimizedScroll(bottomRef, {
      enabled: true,
      threshold: 100,
      behavior: 'smooth',
      debounceMs: 100,
    });

    // Use clean React Query hooks for all data fetching
    const { data: usageData, refetch: refetchUsage } = useUsageData(user || null);

    // Sign-in prompt timer
    const signInTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Announcement dialog timer
    const announcementTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Generate a consistent ID for new chats
    const chatId = useMemo(() => initialChatId ?? uuidv4(), [initialChatId]);

    // Track previous chat ID to detect navigation
    const [previousChatId, setPreviousChatId] = useState<string | undefined>(initialChatId);

    // Pro users bypass all limit checks - much cleaner!
    const shouldBypassLimits = shouldBypassLimitsForModel(selectedModel);
    const hasExceededLimit =
      shouldCheckUserLimits &&
      !proStatusLoading &&
      !shouldBypassLimits &&
      usageData &&
      usageData.count >= SEARCH_LIMITS.DAILY_SEARCH_LIMIT;
    const isLimitBlocked = Boolean(hasExceededLimit);

    // Timer for sign-in prompt for unauthenticated users
    useEffect(() => {
      // If user becomes authenticated, reset the prompt flag and clear timer
      if (user) {
        if (signInTimerRef.current) {
          clearTimeout(signInTimerRef.current);
          signInTimerRef.current = null;
        }
        // Reset the flag so it can show again in future sessions if they log out
        setPersitedHasShownSignInPrompt(false);
        return;
      }

      // Only start timer if user is not authenticated and hasn't been shown the prompt yet
      if (!user && !chatState.hasShownSignInPrompt) {
        // Clear any existing timer
        if (signInTimerRef.current) {
          clearTimeout(signInTimerRef.current);
        }

        // Set timer for 1 minute (60000 ms)
        signInTimerRef.current = setTimeout(() => {
          dispatch({ type: 'SET_SHOW_SIGNIN_PROMPT', payload: true });
          dispatch({ type: 'SET_HAS_SHOWN_SIGNIN_PROMPT', payload: true });
          setPersitedHasShownSignInPrompt(true);
        }, 60000);
      }

      // Cleanup timer on unmount
      return () => {
        if (signInTimerRef.current) {
          clearTimeout(signInTimerRef.current);
        }
      };
    }, [user, chatState.hasShownSignInPrompt, setPersitedHasShownSignInPrompt]);

    // Timer for announcement dialog
    useEffect(() => {
      // Only start timer if announcement hasn't been shown yet
      if (!chatState.hasShownAnnouncementDialog) {
        // Clear any existing timer
        if (announcementTimerRef.current) {
          clearTimeout(announcementTimerRef.current);
        }

        // Set timer for 30 seconds (30000 ms)
        announcementTimerRef.current = setTimeout(() => {
          dispatch({ type: 'SET_SHOW_ANNOUNCEMENT_DIALOG', payload: true });
          dispatch({ type: 'SET_HAS_SHOWN_ANNOUNCEMENT_DIALOG', payload: true });
          setPersitedHasShownAnnouncementDialog(true);
        }, 30000);
      }

      // Cleanup timer on unmount
      return () => {
        if (announcementTimerRef.current) {
          clearTimeout(announcementTimerRef.current);
        }
      };
    }, [chatState.hasShownAnnouncementDialog, setPersitedHasShownAnnouncementDialog]);

    

    type VisibilityType = 'public' | 'private';

    const chatOptions: UseChatOptions = useMemo(
      () => ({
        id: chatId,
        api: '/api/search',
        experimental_throttle: selectedModel === 'ola-anthropic' ? 1000 : 100,
        sendExtraMessageFields: true,
        maxSteps: 5,
        retryCount: 3,
        retryInterval: 1000,
        body: {
          id: chatId,
          model: selectedModel,
          group: selectedGroup,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          ...(initialChatId ? { chat_id: initialChatId } : {}),
          selectedVisibilityType: chatState.selectedVisibilityType,
          isCustomInstructionsEnabled: isCustomInstructionsEnabled,
        },
        onResponse: (response: Response) => {
          // If we get a response, clear any previous error state
          if (response.ok) {
            return;
          }
        },
        onFinish: async (message, { finishReason }) => {
          console.log('[finish reason]:', finishReason);

          // Refresh usage data after message completion for authenticated users
          if (user) {
            refetchUsage();
          }

          // Show upgrade dialog after message completion if user is not Pro and hasn't seen it before
          // We'll check the actual message count in a separate useEffect after messages are available
          if (!isUserPro && !proStatusLoading && !chatState.hasShownUpgradeDialog && user) {
            console.log('Scheduling upgrade dialog check...');
            setTimeout(() => {
              dispatch({ type: 'SET_SHOW_UPGRADE_DIALOG', payload: true });
              dispatch({ type: 'SET_HAS_SHOWN_UPGRADE_DIALOG', payload: true });
              setPersitedHasShownUpgradeDialog(true);
            }, 1000);
          }

          // Note: Suggested questions are now generated automatically via API data stream
          // The useEffect above handles the 'suggested-questions' data stream events
        },
        onError: (error) => {
          // Ignore connection errors and retry silently
          if (error instanceof Error && 
              (error.name === 'AggregateError' || 
               error.message?.includes('connection') || 
               error.message?.includes('network'))) {
            console.log('Retrying due to connection error:', error);
            return;
          }

          // Enhanced error logging
          console.log('=== Chat Error Debug Info ===');
          console.log('Error object:', {
            name: error.name,
            message: error.message,
            cause: error.cause,
            type: error instanceof ChatSDKError ? error.type : 'unknown',
            surface: error instanceof ChatSDKError ? error.surface : 'unknown',
            stack: error.stack
          });
          console.log('Current chat state:', {
            model: selectedModel,
            group: selectedGroup,
            chatId,
            messageCount: messages.length,
            isAuthenticated: !!user
          });
          console.log('========================');

          // Don't show toast for ChatSDK errors as they will be handled by the enhanced error display
          if (error instanceof ChatSDKError) {
            console.log('ChatSDK Error:', error.type, error.surface, error.message);
            // Only show toast for certain error types that need immediate attention
            if (error.type === 'offline' || error.surface === 'stream') {
              toast.error('Connection Error', {
                description: error.message,
              });
            }
          } else {
            console.error('Chat error:', error.cause, error.message);
            toast.error('An error occurred.', {
              description: `Oops! An error occurred while processing your request. ${error.cause || error.message}`,
            });
          }
        },
        initialMessages: initialMessages,
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }),
      [
        selectedModel,
        selectedGroup,
        chatId,
        initialChatId,
        initialMessages,
        chatState.selectedVisibilityType,
        isCustomInstructionsEnabled,
      ],
    );

    const {
      input,
      messages,
      setInput,
      append,
      handleSubmit,
      setMessages,
      reload,
      stop,
      data,
      status,
      error,
      experimental_resume,
    } = useChat(chatOptions);

    // Debug error structure
    if (error) {
      console.log('[useChat error]:', error);
      console.log('[error type]:', typeof error);
      console.log('[error message]:', error.message);
      console.log('[error instance]:', error instanceof Error, error instanceof ChatSDKError);
    }

    useAutoResume({
      autoResume: true,
      initialMessages: initialMessages || [],
      experimental_resume,
      data,
      setMessages,
    });

    useEffect(() => {
      if (status) {
        console.log('[status]:', status);
      }
    }, [status]);

            // Handle data stream events for suggested questions (kept for compatibility)
    useEffect(() => {
      if (data && Array.isArray(data)) {
        data.forEach((item) => {
          if (
            item && 
            typeof item === 'object' && 
            !Array.isArray(item) && 
            'type' in item && 
            item.type === 'suggested-questions' && 
            'questions' in item && 
            item.questions &&
            Array.isArray(item.questions) &&
            item.questions.every(q => typeof q === 'string')
          ) {
            console.log('Received suggested questions from stream:', item.questions);
            dispatch({ type: 'SET_SUGGESTED_QUESTIONS', payload: item.questions as string[] });
          }
        });
      }
    }, [data]);

    useEffect(() => {
      if (user && status === 'streaming' && messages.length > 0) {
        console.log('[chatId]:', chatId);
        // Invalidate chats cache to refresh the list
        invalidateChatsCache();
      }
    }, [user, status, router, chatId, initialChatId, messages.length]);



    // Check for upgrade dialog after messages are available
    useEffect(() => {
      const isFirstMessage = messages.length <= 1;
      
      console.log('Upgrade dialog check:', {
        isFirstMessage,
        isProUser: isUserPro,
        hasShownUpgradeDialog: chatState.hasShownUpgradeDialog,
        user: !!user,
        messagesLength: messages.length,
      });

      // Show upgrade dialog after first message if user is not Pro and hasn't seen it before
      if (isFirstMessage && !isUserPro && !proStatusLoading && !chatState.hasShownUpgradeDialog && user && messages.length > 0) {
        console.log('Showing upgrade dialog...');
        setTimeout(() => {
          dispatch({ type: 'SET_SHOW_UPGRADE_DIALOG', payload: true });
          dispatch({ type: 'SET_HAS_SHOWN_UPGRADE_DIALOG', payload: true });
          setPersitedHasShownUpgradeDialog(true);
        }, 1000);
      }
    }, [messages.length, isUserPro, proStatusLoading, chatState.hasShownUpgradeDialog, user, setPersitedHasShownUpgradeDialog]);

    useEffect(() => {
      if (!initializedRef.current && initialState.query && !messages.length && !initialChatId) {
        initializedRef.current = true;
        console.log('[initial query]:', initialState.query);
        append({
          content: initialState.query,
          role: 'user',
        });
      }
    }, [initialState.query, append, setInput, messages.length, initialChatId]);

    // Generate suggested questions when opening a chat directly
    useEffect(() => {
      const generateSuggestionsForInitialMessages = async () => {
        // Only generate if we have initial messages, no suggested questions yet,
        // user is authenticated or chat is private, and status is not streaming
        if (
          initialMessages &&
          initialMessages.length >= 2 &&
          !chatState.suggestedQuestions.length &&
          (user || chatState.selectedVisibilityType === 'private') &&
          status === 'ready'
        ) {
          const lastUserMessage = initialMessages.filter((m) => m.role === 'user').pop();
          const lastAssistantMessage = initialMessages.filter((m) => m.role === 'assistant').pop();

          if (lastUserMessage && lastAssistantMessage) {
            const newHistory = [
              { role: 'user', content: lastUserMessage.content },
              { role: 'assistant', content: lastAssistantMessage.content },
            ];
            try {
              const { questions } = await suggestQuestions(newHistory);
              dispatch({ type: 'SET_SUGGESTED_QUESTIONS', payload: questions });
            } catch (error) {
              console.error('Error generating suggested questions:', error);
            }
          }
        }
      };

      generateSuggestionsForInitialMessages();
    }, [initialMessages, chatState.suggestedQuestions.length, status, user, chatState.selectedVisibilityType]);

    // Reset suggested questions when status changes to streaming
    useEffect(() => {
      if (status === 'streaming') {
        // Clear suggested questions when a new message is being streamed
        dispatch({ type: 'RESET_SUGGESTED_QUESTIONS' });
      }
    }, [status]);

    // Generate suggested questions when AI response is complete
    useEffect(() => {
      const generateQuestionsAfterResponse = async () => {
        // Only generate if status is ready (response complete), we have messages, no current questions, and proper visibility
        if (
          status === 'ready' &&
          messages.length >= 2 &&
          !chatState.suggestedQuestions.length &&
          (user || chatState.selectedVisibilityType === 'private')
        ) {
          // Get the last user and assistant messages
          const lastUserMessage = messages.filter(m => m.role === 'user').pop();
          const lastAssistantMessage = messages.filter(m => m.role === 'assistant').pop();

          // Only generate if we have both a user message and assistant response
          if (lastUserMessage && lastAssistantMessage) {
            try {
              console.log('🔄 Generating suggested questions on client side...');
              const conversationHistory = [
                { role: 'user', content: lastUserMessage.content },
                { role: 'assistant', content: lastAssistantMessage.content }
              ];
              
              const { questions } = await suggestQuestions(conversationHistory);
              console.log('✅ Client-side generated questions:', questions);
              
              if (questions && questions.length > 0) {
                dispatch({ type: 'SET_SUGGESTED_QUESTIONS', payload: questions });
                console.log('✅ Dispatched questions to state');
              }
            } catch (error) {
              console.error('Error generating suggested questions on client:', error);
            }
          }
        }
      };

      generateQuestionsAfterResponse();
    }, [status, messages.length, chatState.suggestedQuestions.length, user, chatState.selectedVisibilityType]);

    const lastUserMessageIndex = useMemo(() => {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
          return i;
        }
      }
      return -1;
    }, [messages]);

    useEffect(() => {
      // Reset manual scroll when streaming starts
      if (status === 'streaming') {
        resetManualScroll();
        // Initial scroll to bottom when streaming starts
        scrollToElement();
      }
    }, [status, resetManualScroll, scrollToElement]);

    // Auto-scroll on new content if user is at bottom or hasn't manually scrolled away
    useEffect(() => {
      if (status === 'streaming' && (isAtBottom || !hasManuallyScrolled)) {
        scrollToElement();
      } else if (
        messages.length > 0 &&
        chatState.suggestedQuestions.length > 0 &&
        (isAtBottom || !hasManuallyScrolled)
      ) {
        // Scroll when suggested questions appear
        scrollToElement();
      }
    }, [
      messages.length,
      chatState.suggestedQuestions.length,
      status,
      isAtBottom,
      hasManuallyScrolled,
      scrollToElement,
    ]);

    // Dialog management state - track command dialog state in chat state
    useEffect(() => {
      dispatch({
        type: 'SET_ANY_DIALOG_OPEN',
        payload:
          chatState.commandDialogOpen ||
          chatState.showSignInPrompt ||
          chatState.showUpgradeDialog ||
          chatState.showAnnouncementDialog,
      });
    }, [
      chatState.commandDialogOpen,
      chatState.showSignInPrompt,
      chatState.showUpgradeDialog,
      chatState.showAnnouncementDialog,
    ]);

    // Keyboard shortcut for command dialog
    useEffect(() => {
      const down = (e: KeyboardEvent) => {
        if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          dispatch({ type: 'SET_COMMAND_DIALOG_OPEN', payload: !chatState.commandDialogOpen });
        }
      };

      document.addEventListener('keydown', down);
      return () => document.removeEventListener('keydown', down);
    }, [chatState.commandDialogOpen]);

    // Define the model change handler
    const handleModelChange = useCallback(
      (model: string) => {
        setSelectedModel(model);
      },
      [setSelectedModel],
    );

    const resetSuggestedQuestions = useCallback(() => {
      dispatch({ type: 'RESET_SUGGESTED_QUESTIONS' });
    }, []);

    // Handle visibility change
    const handleVisibilityChange = useCallback(
      async (visibility: VisibilityType) => {
        if (!chatId) return;

        try {
          await updateChatVisibility(chatId, visibility);
          dispatch({ type: 'SET_VISIBILITY_TYPE', payload: visibility });
          toast.success(`Chat is now ${visibility}`);
          // Invalidate cache to refresh the list with updated visibility
          invalidateChatsCache();
        } catch (error) {
          console.error('Error updating chat visibility:', error);
          toast.error('Failed to update chat visibility');
        }
      },
      [chatId],
    );

    const isMobile = useIsMobile();
    const [sourcesOpen, setSourcesOpen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false); // Start closed to avoid hydration issues
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    
    // Use the chat threads hook
    const { 
      threads, 
      loading: threadsLoading, 
      error: threadsError,
      pinThread, 
      archiveThread, 
      deleteThread,
      refreshThreads,
      addLocalThread,
      updateLocalThread,
      loadLocalMessages,
      saveLocalMessages
    } = useChatThreads();

    // Debug logging for threads
    console.log('ChatInterface threads:', threads);
    console.log('ChatInterface threadsLoading:', threadsLoading);
    console.log('ChatInterface threadsError:', threadsError);
    console.log('ChatInterface currentThreadId:', initialChatId || (messages.length > 0 ? chatId : undefined));

    // Reset chat state when navigating to a new chat session
    useEffect(() => {
      if (initialChatId && initialChatId !== previousChatId) {
        console.log('Navigating to new chat session:', initialChatId, 'from:', previousChatId);
        
        // For unauthenticated users, try to load messages from local storage
        if (!user && initialChatId) {
          const localMessages = loadLocalMessages(initialChatId);
          if (localMessages.length > 0) {
            console.log('Loading messages from local storage for thread:', initialChatId);
            setMessages(localMessages);
          } else {
            // No local messages found, start fresh
            setMessages([]);
          }
        } else {
          // For authenticated users or new sessions, start fresh
          setMessages([]);
        }
        
        dispatch({ type: 'RESET_SUGGESTED_QUESTIONS' });
        dispatch({ type: 'RESET_UI_STATE' });
        // Update the previous chat ID
        setPreviousChatId(initialChatId);
      }
    }, [initialChatId, previousChatId, user, loadLocalMessages]);

    const [researchOpen, setResearchOpen] = useState(false);
    const [sources, setSources] = useState<Array<{ url: string; title: string; text?: string; favicon?: string }>>([]);
    const [userClosedSources, setUserClosedSources] = useState(false);
    const [lastAutoOpenedMessageId, setLastAutoOpenedMessageId] = useState<string | null>(null);

    // Auto-open sources panel when research starts (only for extreme search mode)
    useEffect(() => {
      if (status === 'streaming' || status === 'submitted') {
        // Auto-open only for extreme search mode
        const shouldAutoOpen = selectedGroup === 'extreme';
        
        if (!userClosedSources && shouldAutoOpen) {
          setSourcesOpen(true);
        }
        // Reset the user closed flag for new searches (when a new message starts streaming)
        if (status === 'submitted') {
          setUserClosedSources(false);
        }
      }
    }, [status, userClosedSources, selectedGroup]);

    // Set sidebar state based on mobile detection
    useEffect(() => {
      if (isMobile !== undefined) {
        setSidebarOpen(!isMobile); // Closed on mobile, open on desktop
      }
    }, [isMobile]);

    // Handle initialChatId changes (when navigating to a specific thread)
    useEffect(() => {
      if (initialChatId && initialChatId !== chatId) {
        // If we have an initialChatId that's different from the current chatId,
        // we should navigate to that chat
        router.push(`/search/${initialChatId}`);
      }
    }, [initialChatId, chatId, router]);

    // Save chat to database when messages change
    useEffect(() => {
      const saveChatToDatabase = async () => {
        if (!messages.length || !chatId) {
          console.log('Skipping chat save - no messages or no chatId');
          return;
        }

        try {
          console.log('Chat interface - No need to save chat metadata (handled by search API)');
          
          // For unauthenticated users, still save to local storage
          if (!user) {
            // Get the first user message as the chat title
            const firstUserMessage = messages.find(m => m.role === 'user');
            const chatTitle = firstUserMessage?.content?.slice(0, 50) || 'New Chat';
            
            const threadData = {
              id: chatId,
              title: chatTitle,
              lastMessage: messages[messages.length - 1]?.content || 'New conversation',
              timestamp: new Date().toISOString(),
              isPinned: false,
              isArchived: false,
              messageCount: messages.length,
            };

            // Check if thread already exists
            const existingThread = threads.find(t => t.id === chatId);
            if (existingThread) {
              // Update existing thread
              await updateLocalThread(chatId, {
                title: chatTitle,
                lastMessage: messages[messages.length - 1]?.content || 'New conversation',
                timestamp: new Date().toISOString(),
                messageCount: messages.length,
              });
            } else {
              // Add new thread
              await addLocalThread(threadData);
            }

            // Save messages to local storage
            saveLocalMessages(chatId, messages);
            console.log('Chat saved to local storage successfully');
          }
          // For authenticated users, the search API handles chat creation and updates
          // We'll refresh threads after the search API call completes
        } catch (error) {
          console.error('Error in chat interface:', error);
        }
      };

      // Debounce the save operation to avoid too many API calls
      const timeoutId = setTimeout(saveChatToDatabase, 1000);
      return () => clearTimeout(timeoutId);
    }, [messages, user, chatId, chatState.selectedVisibilityType, addLocalThread, updateLocalThread, threads, saveLocalMessages]);

    // Track if we've refreshed threads for this chat session
    const hasRefreshedForSession = useRef(false);

    // Refresh threads when search API call completes for authenticated users
    useEffect(() => {
      if (user && status === 'ready' && messages.length > 0 && !hasRefreshedForSession.current) {
        console.log('Search API call finished, refreshing threads for authenticated user');
        hasRefreshedForSession.current = true;
        refreshThreads();
      }
    }, [status, user, refreshThreads, messages.length]);

    // Reset the refresh flag when chat ID changes
    useEffect(() => {
      hasRefreshedForSession.current = false;
    }, [chatId]);

    return (
      <div className="flex flex-col font-sans! items-center min-h-screen bg-background text-foreground transition-all duration-500 w-full overflow-x-hidden !scrollbar-thin !scrollbar-thumb-muted-foreground dark:!scrollbar-thumb-muted-foreground !scrollbar-track-transparent hover:!scrollbar-thumb-foreground dark:!hover:scrollbar-thumb-foreground">
        {/* Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          threads={threads}
          currentThreadId={initialChatId || (messages.length > 0 ? chatId : undefined)}
          onThreadSelect={(threadId) => {
            console.log('Selected thread:', threadId);
            
            // For unauthenticated users, check if it's a local storage thread
            if (!user) {
              const localMessages = loadLocalMessages(threadId);
              if (localMessages.length > 0) {
                console.log('Loading local storage messages for thread:', threadId);
                // Navigate to the thread URL to load the messages
                router.push(`/search/${threadId}`);
                return;
              }
            }
            
            // Navigate to the selected chat (could be database thread or new session)
            router.push(`/search/${threadId}`);
          }}
          onNewThread={() => {
            console.log('New thread');
            // Generate a new UUID for the chat session
            const newChatId = uuidv4();
            console.log('Generated new chat ID:', newChatId);
            // Navigate to the new chat session with the UUID
            router.push(`/search/${newChatId}`);
          }}
          onDeleteThread={(threadId) => deleteThread(threadId)}
          onPinThread={(threadId) => {
            const thread = threads.find(t => t.id === threadId);
            if (thread) {
              pinThread(threadId, !thread.isPinned);
            }
          }}
          onArchiveThread={(threadId) => {
            const thread = threads.find(t => t.id === threadId);
            if (thread) {
              archiveThread(threadId, !thread.isArchived);
            }
          }}
          onCollapsedChange={setSidebarCollapsed}
          loading={threadsLoading}
          error={threadsError}
        />
        
        <div className={cn('w-full transition-all duration-300 ease-in-out', sourcesOpen ? 'sm:mr-[200px] lg:mr-[225px]' : '', sidebarOpen ? (sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64') : '', researchOpen ? 'sm:mr-[800px]' : '')}>
          {/* Sidebar Toggle Button */}
          <div className="fixed top-4 left-4 z-30 lg:hidden">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="h-10 w-10 bg-background/80 backdrop-blur-sm border-border"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {/* Chat Titles Component */}
          <ChatTitles
            messages={messages}
            onTitleClick={(messageIndex) => {
              // Find the message element and scroll to it
              const messageElements = document.querySelectorAll('[data-message-index]');
              const targetElement = messageElements[messageIndex];
              if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
            sidebarOpen={sidebarOpen}
            sidebarCollapsed={sidebarCollapsed}
          />
        </div>

        {/* Chat Dialogs Component */}
        <ChatDialogs
          commandDialogOpen={chatState.commandDialogOpen}
          setCommandDialogOpen={(open) => dispatch({ type: 'SET_COMMAND_DIALOG_OPEN', payload: open })}
          showSignInPrompt={chatState.showSignInPrompt}
          setShowSignInPrompt={(open) => dispatch({ type: 'SET_SHOW_SIGNIN_PROMPT', payload: open })}
          hasShownSignInPrompt={chatState.hasShownSignInPrompt}
          setHasShownSignInPrompt={(value) => {
            dispatch({ type: 'SET_HAS_SHOWN_SIGNIN_PROMPT', payload: value });
            setPersitedHasShownSignInPrompt(value);
          }}
          showUpgradeDialog={chatState.showUpgradeDialog}
          setShowUpgradeDialog={(open) => dispatch({ type: 'SET_SHOW_UPGRADE_DIALOG', payload: open })}
          hasShownUpgradeDialog={chatState.hasShownUpgradeDialog}
          setHasShownUpgradeDialog={(value) => {
            dispatch({ type: 'SET_HAS_SHOWN_UPGRADE_DIALOG', payload: value });
            setPersitedHasShownUpgradeDialog(value);
          }}
          showAnnouncementDialog={chatState.showAnnouncementDialog}
          setShowAnnouncementDialog={(open) => dispatch({ type: 'SET_SHOW_ANNOUNCEMENT_DIALOG', payload: open })}
          hasShownAnnouncementDialog={chatState.hasShownAnnouncementDialog}
          setHasShownAnnouncementDialog={(value) => {
            dispatch({ type: 'SET_HAS_SHOWN_ANNOUNCEMENT_DIALOG', payload: value });
            setPersitedHasShownAnnouncementDialog(value);
          }}
          user={user}
          setAnyDialogOpen={(open) => dispatch({ type: 'SET_ANY_DIALOG_OPEN', payload: open })}
        />

        <div
          className={cn(
            'w-full p-2 sm:p-4 transition-all duration-300 ease-in-out',
            status === 'ready' && messages.length === 0
              ? 'min-h-screen! flex! flex-col! items-center! justify-center!' // Center everything when no messages
              : 'mt-20! sm:mt-16! flex flex-col!', // Add top margin when showing messages
            sourcesOpen ? 'sm:mr-[200px] lg:mr-[225px]' : '' // Smaller margin to keep content centered when sources panel is open
          )}
        >
          <div className={`w-full max-w-[95%] sm:max-w-2xl space-y-6 p-0 mx-auto transition-all duration-300`}>
            {status === 'ready' && messages.length === 0 && (
              <div className="text-center m-0 mb-2">
                <div className="flex items-center justify-center mb-5">
                  <Image
                    src="/ola.chat-logo-invert.png"
                    alt="Ola"
                    className="w-32 h-7 sm:w-40 sm:h-9 object-contain"
                    width={160}
                    height={36}
                    unoptimized
                    quality={100}
                    priority
                  />
                </div>
              </div>
            )}

            {/* Show initial limit exceeded message */}
            {status === 'ready' && messages.length === 0 && isLimitBlocked && (
              <div className="mt-8 p-6 bg-muted/30 dark:bg-muted/20 border border-border/60 dark:border-border/60 rounded-xl max-w-lg mx-auto">
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground dark:text-muted-foreground">
                    <Crown className="h-4 w-4" />
                    <span className="text-sm font-medium">Daily limit reached</span>
                  </div>
                  <div>
                    <p className="text-foreground dark:text-foreground mb-2">
                      You&apos;ve used all {SEARCH_LIMITS.DAILY_SEARCH_LIMIT} searches for today.
                    </p>
                    <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                      Upgrade to continue with unlimited searches and premium features.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        refetchUsage();
                      }}
                      size="sm"
                      className="flex-1"
                    >
                      Refresh
                    </Button>
                    <Button
                      onClick={() => {
                        window.location.href = '/pricing';
                      }}
                      size="sm"
                      className="flex-1 bg-primary hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/90 text-primary-foreground dark:text-primary-foreground"
                    >
                      <Crown className="h-3 w-3 mr-1.5" />
                      Upgrade
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Use the Messages component */}
            {messages.length > 0 && (
              <Messages
                messages={messages}
                lastUserMessageIndex={lastUserMessageIndex}
                input={input}
                setInput={setInput}
                setMessages={setMessages}
                append={append}
                reload={reload}
                suggestedQuestions={chatState.suggestedQuestions}
                setSuggestedQuestions={(questions) => dispatch({ type: 'SET_SUGGESTED_QUESTIONS', payload: questions })}
                status={status}
                error={error ?? null}
                user={user}
                selectedVisibilityType={chatState.selectedVisibilityType}
                chatId={initialChatId || (messages.length > 0 ? chatId : undefined)}
                onVisibilityChange={handleVisibilityChange}
                initialMessages={initialMessages}
                isOwner={isOwner}
                onSourcesClick={(sources, forceOpen = false, messageId = null) => {
                  setSources(sources);
                  
                  if (forceOpen) {
                    // Manual click - always open and reset user closed flag
                    setSourcesOpen(true);
                    setUserClosedSources(false);
                  } else if (messageId && messageId !== lastAutoOpenedMessageId && !userClosedSources) {
                    // Auto-open only for extreme search mode
                    const shouldAutoOpen = selectedGroup === 'extreme';
                    
                    if (shouldAutoOpen) {
                      setSourcesOpen(true);
                      setLastAutoOpenedMessageId(messageId);
                    }
                  }
                }}
              />
            )}

            <div ref={bottomRef} />
          </div>

          {/* Research Sources Display in Main Content */}
         

          {/* Sources Panel */}
          <SourcesPanel 
            sources={sources} 
            open={sourcesOpen} 
            onOpenChange={(open) => {
              setSourcesOpen(open);
              // Track when user manually closes the panel
              if (!open) {
                setUserClosedSources(true);
              }
            }}
            isSearching={status === 'streaming' || status === 'submitted'}
            searchQuery={(() => {
              // Get the last user message as the search query
              const lastUserMessage = messages.filter(m => m.role === 'user').pop();
              return lastUserMessage?.content || input || '';
            })()}
            currentStage={(() => {
              if (status === 'streaming' || status === 'submitted') {
                // Check if we have tool invocations running
                const lastMessage = messages[messages.length - 1];
                const hasActiveTools = lastMessage?.parts?.some((part: any) => 
                  part.type === 'tool-invocation' && part.toolInvocation?.state !== 'result'
                );
                
                // Searching: Initial phase, tools starting, no sources yet
                if (hasActiveTools && sources.length === 0) return 'searching';
                
                // Reading: Tools are actively running and finding/processing sources
                if (hasActiveTools && sources.length > 0) return 'reading';
                
                // Wrapping up: Research tools are complete, but AI is still writing the final response
                if (!hasActiveTools && status === 'streaming' && sources.length > 0) return 'wrapping';
                
                // Default to searching if we're still in submitted state
                return 'searching';
              }
              
              // Completed: Everything is done including suggested questions
              if (sources.length > 0 && chatState.suggestedQuestions.length > 0) {
                return 'Completed';
              }
              // If we have sources but no suggested questions yet, still wrapping up
              return sources.length > 0 ? 'wrapping' : 'searching';
            })()}
          />


          {/* Single Form Component with dynamic positioning */}
          {((user && isOwner) || !initialChatId || (!user && chatState.selectedVisibilityType === 'private')) &&
            !isLimitBlocked && (
              <div
                className={cn(
                  'transition-all duration-300 w-full max-w-[95%] sm:max-w-2xl mx-auto',
                  messages.length === 0 && !chatState.hasSubmitted
                    ? 'relative' // Centered position when no messages
                    : cn(
                        'fixed bottom-6 sm:bottom-4 left-0 z-20',
                        sourcesOpen ? 'right-[200px] sm:right-[225px]' : 'right-0'
                      ), // Fixed bottom when messages exist, adjusted for sources panel
                )}
              >
                <FormComponent
                  chatId={chatId}
                  user={user!}
                  subscriptionData={subscriptionData}
                  input={input}
                  setInput={setInput}
                  attachments={chatState.attachments}
                  setAttachments={(attachments) => {
                    const newAttachments =
                      typeof attachments === 'function' ? attachments(chatState.attachments) : attachments;
                    dispatch({ type: 'SET_ATTACHMENTS', payload: newAttachments });
                  }}
                  handleSubmit={handleSubmit}
                  fileInputRef={fileInputRef}
                  inputRef={inputRef}
                  stop={stop}
                  messages={messages as any}
                  append={append}
                  selectedModel={selectedModel}
                  setSelectedModel={handleModelChange}
                  resetSuggestedQuestions={resetSuggestedQuestions}
                  lastSubmittedQueryRef={lastSubmittedQueryRef}
                  selectedGroup={selectedGroup}
                  setSelectedGroup={setSelectedGroup}
                  showExperimentalModels={messages.length === 0}
                  status={status}
                  setHasSubmitted={(hasSubmitted) => {
                    const newValue =
                      typeof hasSubmitted === 'function' ? hasSubmitted(chatState.hasSubmitted) : hasSubmitted;
                    dispatch({ type: 'SET_HAS_SUBMITTED', payload: newValue });
                  }}
                  isLimitBlocked={isLimitBlocked}
                  onExportResearch={async (format) => {
                    // Find the last message with research content
                    const lastMessage = messages[messages.length - 1];
                    if (lastMessage && lastMessage.role === 'assistant') {
                      try {
                        const researchData = extractResearchData(lastMessage, lastSubmittedQueryRef.current);
                        if (researchData) {
                          if (format === 'pdf') {
                            await exportToPDF(researchData);
                          } else if (format === 'word') {
                            await exportToWord(researchData);
                          }
                        }
                      } catch (error) {
                        console.error('Export error:', error);
                      }
                    }
                  }}
                />
              </div>
            )}



          {/* Show limit exceeded message */}
          {isLimitBlocked && messages.length > 0 && (
            <div className="fixed bottom-8 sm:bottom-4 left-0 right-0 w-full max-w-[95%] sm:max-w-2xl mx-auto z-20">
              <div className="p-3 bg-muted/30 dark:bg-muted/20 border border-border/60 dark:border-border/60 rounded-lg shadow-sm backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="h-3.5 w-3.5 text-muted-foreground dark:text-muted-foreground" />
                    <span className="text-sm text-foreground dark:text-foreground">
                      Daily limit reached ({SEARCH_LIMITS.DAILY_SEARCH_LIMIT} searches used)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        refetchUsage();
                      }}
                      className="h-7 px-2 text-xs"
                    >
                      Refresh
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        window.location.href = '/pricing';
                      }}
                      className="h-7 px-3 text-xs bg-primary hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/90 text-primary-foreground dark:text-primary-foreground"
                    >
                      Upgrade
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}


        </div>
      </div>
    );
  },
);

// Add a display name for the memoized component for better debugging
ChatInterface.displayName = 'ChatInterface';

export { ChatInterface };
