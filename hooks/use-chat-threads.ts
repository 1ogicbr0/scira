import { useState, useEffect, useCallback } from 'react';
import { useAppSession } from '@/lib/session-context';

interface Thread {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
  isPinned?: boolean;
  isArchived?: boolean;
  messageCount: number;
}

const LOCAL_STORAGE_KEY = 'ola-chat-threads';
const LOCAL_MESSAGES_KEY = 'ola-chat-messages';

export function useChatThreads() {
  const { user } = useAppSession();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load threads from local storage for unauthenticated users
  const loadLocalThreads = useCallback(() => {
    try {
      console.log('🔍 loadLocalThreads - Checking localStorage for key:', LOCAL_STORAGE_KEY);
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      console.log('🔍 loadLocalThreads - Raw stored data:', stored);
      
      if (stored) {
        const localThreads = JSON.parse(stored);
        console.log('🔍 loadLocalThreads - Parsed threads:', localThreads);
        return localThreads;
      } else {
        console.log('🔍 loadLocalThreads - No data found in localStorage');
      }
    } catch (err) {
      console.error('🔍 loadLocalThreads - Error loading threads from local storage:', err);
    }
    console.log('🔍 loadLocalThreads - Returning empty array');
    return [];
  }, []);

  // Save threads to local storage for unauthenticated users
  const saveLocalThreads = useCallback((threads: Thread[]) => {
    try {
      console.log('🔍 saveLocalThreads - Saving threads to localStorage:', threads);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(threads));
      console.log('🔍 saveLocalThreads - Successfully saved threads to localStorage');
    } catch (err) {
      console.error('🔍 saveLocalThreads - Error saving threads to local storage:', err);
    }
  }, []);

  // Load messages from local storage for a specific thread
  const loadLocalMessages = useCallback((threadId: string) => {
    try {
      const stored = localStorage.getItem(`${LOCAL_MESSAGES_KEY}-${threadId}`);
      if (stored) {
        const messages = JSON.parse(stored);
        console.log('Loaded messages from local storage for thread:', threadId, messages);
        return messages;
      }
    } catch (err) {
      console.error('Error loading messages from local storage:', err);
    }
    return [];
  }, []);

  // Save messages to local storage for a specific thread
  const saveLocalMessages = useCallback((threadId: string, messages: any[]) => {
    try {
      localStorage.setItem(`${LOCAL_MESSAGES_KEY}-${threadId}`, JSON.stringify(messages));
      console.log('Saved messages to local storage for thread:', threadId, messages);
    } catch (err) {
      console.error('Error saving messages to local storage:', err);
    }
  }, []);

  const fetchThreads = useCallback(async () => {
    console.log('🔍 Fetching threads for user:', user?.id);
    
    if (!user?.id) {
      console.log('🔍 No user session, loading from local storage');
      const localThreads = loadLocalThreads();
      console.log('🔍 Loaded threads from local storage:', localThreads);
      setThreads(localThreads);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      console.log('🔍 Fetching threads from database for authenticated user');
      const response = await fetch('/api/chat-management', {
        credentials: 'include',
      });

      console.log('🔍 Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Fetched threads from database:', data.threads);
        setThreads(data.threads || []);
        setError(null);
      } else {
        console.error('🔍 Failed to fetch threads from database');
        const errorData = await response.text();
        console.error('🔍 Error response:', errorData);
        setError('Failed to fetch threads');
        // Fallback to empty threads instead of crashing
        setThreads([]);
      }
    } catch (error) {
      console.error('🔍 Error fetching threads:', error);
      setError('Failed to fetch threads');
      // Fallback to empty threads instead of crashing
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, loadLocalThreads]);

  const pinThread = useCallback(async (threadId: string, isPinned: boolean) => {
    try {
      if (user?.id) {
        // For authenticated users, update in database
        const response = await fetch('/api/chat-management', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            chatId: threadId,
            action: 'pin',
            value: isPinned,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Thread pinned/unpinned in database:', data);
          // Refresh threads from database
          await fetchThreads();
        } else {
          console.error('Failed to pin thread in database');
          throw new Error('Failed to pin thread');
        }
      } else {
        // For unauthenticated users, update in local storage
        const updated = threads.map(thread =>
          thread.id === threadId ? { ...thread, isPinned } : thread
        );
        setThreads(updated);
        saveLocalThreads(updated);
      }
    } catch (err) {
      console.error('Error pinning thread:', err);
      setError(err instanceof Error ? err.message : 'Failed to pin thread');
    }
  }, [user?.id, threads, saveLocalThreads, fetchThreads]);

  const archiveThread = useCallback(async (threadId: string, isArchived: boolean) => {
    try {
      if (user?.id) {
        // For authenticated users, update in database
        const response = await fetch('/api/chat-management', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            chatId: threadId,
            action: 'archive',
            value: isArchived,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Thread archived/unarchived in database:', data);
          // Refresh threads from database
          await fetchThreads();
        } else {
          console.error('Failed to archive thread in database');
          throw new Error('Failed to archive thread');
        }
      } else {
        // For unauthenticated users, update in local storage
        const updated = threads.map(thread =>
          thread.id === threadId ? { ...thread, isArchived } : thread
        );
        setThreads(updated);
        saveLocalThreads(updated);
      }
    } catch (err) {
      console.error('Error archiving thread:', err);
      setError(err instanceof Error ? err.message : 'Failed to archive thread');
    }
  }, [user?.id, threads, saveLocalThreads, fetchThreads]);

  const deleteThread = useCallback(async (threadId: string) => {
    try {
      if (user?.id) {
        // For authenticated users, delete from database
        const response = await fetch(`/api/chat-management?chatId=${threadId}`, {
          method: 'DELETE',
          credentials: 'include',
        });

        if (response.ok) {
          console.log('Thread deleted from database');
          // Refresh threads from database
          await fetchThreads();
        } else {
          console.error('Failed to delete thread from database');
          throw new Error('Failed to delete thread');
        }
      } else {
        // For unauthenticated users, delete from local storage
        const updated = threads.filter(thread => thread.id !== threadId);
        setThreads(updated);
        saveLocalThreads(updated);
      }
    } catch (err) {
      console.error('Error deleting thread:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete thread');
    }
  }, [user?.id, threads, saveLocalThreads, fetchThreads]);

  // Add a new thread to local storage
  const addLocalThread = useCallback(async (thread: Thread) => {
    if (!user?.id) {
      setThreads(prev => {
        const updated = [...prev, thread];
        saveLocalThreads(updated);
        return updated;
      });
    } else {
      // For authenticated users, save to database
      try {
        const response = await fetch('/api/chat-management', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            chatId: thread.id,
            title: thread.title,
            visibility: 'private',
          }),
        });

        if (response.ok) {
          console.log('Thread saved to database successfully');
          // Refresh threads to show the new thread immediately
          await fetchThreads();
        } else {
          console.error('Failed to save thread to database');
        }
      } catch (error) {
        console.error('Error saving thread to database:', error);
      }
    }
  }, [user?.id, saveLocalThreads, fetchThreads]);

  // Update an existing thread in local storage
  const updateLocalThread = useCallback(async (threadId: string, updates: Partial<Thread>) => {
    if (!user?.id) {
      setThreads(prev => {
        const updated = prev.map(thread => 
          thread.id === threadId ? { ...thread, ...updates } : thread
        );
        saveLocalThreads(updated);
        return updated;
      });
    } else {
      // For authenticated users, update in database
      try {
        const response = await fetch('/api/chat-management', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            chatId: threadId,
            title: updates.title || 'Updated Chat',
            visibility: 'private',
          }),
        });

        if (response.ok) {
          console.log('Thread updated in database successfully');
          // Refresh threads to show the updated thread immediately
          await fetchThreads();
        } else {
          console.error('Failed to update thread in database');
        }
      } catch (error) {
        console.error('Error updating thread in database:', error);
      }
    }
  }, [user?.id, saveLocalThreads, fetchThreads]);

  // Fetch threads on mount and when user changes
  useEffect(() => {
    console.log('🔍 useEffect - Fetching threads, user:', user?.id);
    fetchThreads();
  }, [user?.id]); // Removed fetchThreads from dependencies to prevent loops

  return {
    threads,
    loading,
    error,
    pinThread,
    archiveThread,
    deleteThread,
    refreshThreads: fetchThreads,
    addLocalThread,
    updateLocalThread,
    loadLocalMessages,
    saveLocalMessages,
  };
} 