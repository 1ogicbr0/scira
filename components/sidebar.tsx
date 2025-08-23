import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Plus,
  Settings,
  MessageSquare,
  Pin,
  MoreVertical,
  Trash2,
  Archive,
  Clock,
  LogOut,
  Moon,
  Sun,
  Monitor,
  HelpCircle,
  Info,
  ChevronLeft,
  ChevronRight,
  Search as MagnifyingGlass,
  User,
  AlertCircle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HoverBorderGradient } from '@/components/ui/hover-border-gradient';

import { toast } from 'sonner';
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

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  threads: Thread[];
  currentThreadId?: string;
  onThreadSelect: (threadId: string) => void;
  onNewThread: () => void;
  onDeleteThread: (threadId: string) => void;
  onPinThread: (threadId: string) => void;
  onArchiveThread: (threadId: string) => void;
  onCollapsedChange?: (collapsed: boolean) => void;
  loading?: boolean;
  error?: string | null;
}

interface ThreadItemProps {
  thread: Thread;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onPin: () => void;
  onArchive: () => void;
  formatTimestamp: (timestamp: string) => string;
}

function ThreadItem({
  thread,
  isActive,
  onSelect,
  onDelete,
  onPin,
  onArchive,
  formatTimestamp,
}: ThreadItemProps) {
  return (
    <div
      className={cn(
        'group relative flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-colors hover:bg-accent w-full max-w-full mr-2',
        isActive && 'bg-accent border border-border'
      )}
      onClick={onSelect}
    >
      <div className="flex-1 min-w-0 max-w-full overflow-hidden" style={{ maxWidth: 'calc(100% - 28px)' }}>
        <div className="flex items-start gap-1.5 min-w-0 max-w-full">
          <h3 className="font-medium text-xs flex-1 min-w-0 max-w-full break-words leading-tight line-clamp-2">
            {thread.title}
          </h3>
          {thread.isPinned && (
            <Pin className="w-2.5 h-2.5 text-muted-foreground flex-shrink-0 ml-1 mt-0.5" />
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 min-w-0 max-w-full break-words leading-tight line-clamp-2">
          {thread.lastMessage}
        </p>
        <div className="flex items-center gap-2 mt-1 min-w-0 max-w-full">
          <span className="text-xs text-muted-foreground flex-1 min-w-0 max-w-full break-words">
            {formatTimestamp(thread.timestamp)}
          </span>
          <Badge variant="secondary" className="text-xs px-1.5 py-0.5 flex-shrink-0">
            {thread.messageCount}
          </Badge>
        </div>
      </div>
      
      <div className="flex-shrink-0 w-6">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onPin} className="cursor-pointer">
              <Pin className="w-3 h-3 mr-2" />
              {thread.isPinned ? 'Unpin' : 'Pin'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onArchive} className="cursor-pointer">
              <Archive className="w-3 h-3 mr-2" />
              {thread.isArchived ? 'Unarchive' : 'Archive'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="cursor-pointer text-red-600">
              <Trash2 className="w-3 h-3 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function Sidebar({
  isOpen,
  onToggle,
  threads,
  currentThreadId,
  onThreadSelect,
  onNewThread,
  onDeleteThread,
  onPinThread,
  onArchiveThread,
  onCollapsedChange,
  loading = false,
  error = null,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAppSession();

  // Debug session state
  console.log('🔍 Sidebar user:', user);
  console.log('🔍 Sidebar isAuthenticated:', isAuthenticated);
  console.log('🔍 Sidebar isLoading:', isLoading);
  console.log('🔍 Sidebar user name:', user?.name);

  const filteredThreads = threads.filter(thread =>
    thread.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    thread.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedThreads = filteredThreads.filter(thread => thread.isPinned);
  const regularThreads = filteredThreads.filter(thread => !thread.isPinned);

  // Debug logging
  console.log('Sidebar threads:', threads);
  console.log('Sidebar isOpen:', isOpen);
  console.log('Sidebar isCollapsed:', isCollapsed);
  console.log('Sidebar currentThreadId:', currentThreadId);
  console.log('Sidebar filteredThreads:', filteredThreads);
  console.log('Sidebar pinnedThreads:', pinnedThreads);
  console.log('Sidebar regularThreads:', regularThreads);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed left-0 top-0 z-50 h-full bg-background border-r border-border transition-all duration-300 ease-in-out lg:translate-x-0',
          isCollapsed ? 'w-16' : 'w-64',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border">
          <div className={cn(
            "flex items-center",
            isCollapsed ? "justify-center w-full" : "gap-2 flex-1"
          )}>
            <img 
              src="/ola.chat-logo-invert.png" 
              alt="Logo" 
              className={cn(
                "object-contain",
                isCollapsed ? "w-8 h-8" : "w-32 h-7"
              )}
            />
          </div>
          <div className="flex items-center gap-3">
            {!isCollapsed && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  const newCollapsed = !isCollapsed;
                  setIsCollapsed(newCollapsed);
                  onCollapsedChange?.(newCollapsed);
                }}
                className="h-6 w-6"
              >
                <ChevronLeft className="w-3 h-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="lg:hidden h-6 w-6"
            >
              <ChevronLeft className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Search */}
        {!isCollapsed && (
          <div className="p-3 border-b border-border">
            <div className="relative">
              <MagnifyingGlass className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <Input
                placeholder="Search threads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-8"
              />
            </div>
          </div>
        )}

        {/* New Thread Button */}
        <div className="p-3 border-b border-border">
          {isCollapsed ? (
            <div className="space-y-2 gap-1 flex flex-col">
              <Link href="/new">
                <HoverBorderGradient
                  containerClassName="w-full !rounded-md"
                  className="w-full h-8 bg-background flex items-center justify-center !rounded-md"
                  as="button"
                  title="New Chat"
                >
                  <Plus className="w-3 h-3" />
                </HoverBorderGradient>
              </Link>
              <HoverBorderGradient
                containerClassName="w-full !rounded-md"
                className="w-full h-8 bg-background flex items-center justify-center !rounded-md"
                as="button"
                onClick={() => {
                  const newCollapsed = !isCollapsed;
                  setIsCollapsed(newCollapsed);
                  onCollapsedChange?.(newCollapsed);
                }}
                title="Expand Sidebar"
              >
                <ChevronRight className="w-3 h-3" />
              </HoverBorderGradient>
            </div>
          ) : (
            <Link href="/new">
              <HoverBorderGradient
                containerClassName="w-full !rounded-md"
                className="w-full h-8 bg-background flex items-center justify-center text-xs !rounded-md"
                as="button"
              >
                <div className="flex items-center gap-2 -ml-1">
                  <Plus className="w-3 h-3" />
                  New Chat
                </div>
              </HoverBorderGradient>
            </Link>
          )}
        </div>

        {/* Threads List */}
        {!isCollapsed && (
          <ScrollArea className="flex-1 h-[calc(100vh-240px)] overflow-hidden">
            <div className="p-3 space-y-1.5 w-full max-w-full">
              {/* Loading State */}
              {loading && (
                <div className="text-center py-8 w-full">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-xs text-muted-foreground">Loading threads...</p>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="text-center py-8 w-full">
                  <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
                  <p className="text-xs text-red-500">Error loading threads</p>
                  <p className="text-xs text-muted-foreground mt-1">{error}</p>
                </div>
              )}

              {/* Pinned Threads */}
              {!loading && !error && pinnedThreads.length > 0 && (
                <>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium w-full">
                    <Pin className="w-2.5 h-2.5 flex-shrink-0" />
                    <span className="truncate">Pinned</span>
                  </div>
                  <div className="space-y-1 w-full max-w-full">
                    {pinnedThreads.map((thread) => (
                      <ThreadItem
                        key={thread.id}
                        thread={thread}
                        isActive={currentThreadId === thread.id}
                        onSelect={() => onThreadSelect(thread.id)}
                        onDelete={() => onDeleteThread(thread.id)}
                        onPin={() => onPinThread(thread.id)}
                        onArchive={() => onArchiveThread(thread.id)}
                        formatTimestamp={formatTimestamp}
                      />
                    ))}
                  </div>
                  <Separator className="my-2" />
                </>
              )}

              {/* Regular Threads */}
              {regularThreads.length > 0 && (
                <>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium w-full">
                    <Clock className="w-2.5 h-2.5 flex-shrink-0" />
                    <span className="truncate">Recent</span>
                  </div>
                  <div className="space-y-1 w-full max-w-full">
                    {regularThreads.map((thread) => (
                      <ThreadItem
                        key={thread.id}
                        thread={thread}
                        isActive={currentThreadId === thread.id}
                        onSelect={() => onThreadSelect(thread.id)}
                        onDelete={() => onDeleteThread(thread.id)}
                        onPin={() => onPinThread(thread.id)}
                        onArchive={() => onArchiveThread(thread.id)}
                        formatTimestamp={formatTimestamp}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Empty State */}
              {!loading && !error && filteredThreads.length === 0 && (
                <div className="text-center py-8 w-full">
                  <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">
                    {searchQuery ? 'No threads found' : 'No conversations yet'}
                  </p>
                  {!searchQuery && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Start chatting to see your conversations here
                    </p>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {/* Footer */}
        <div className="border-t border-border p-3">
          {!isCollapsed &&  (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <User className="w-2.5 h-2.5 text-white" />
                </div>
                <span className="text-xs font-medium">
                  {user?.name || 'Guest'}
                </span>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Settings className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setShowSettings(true)}>
                    <Settings className="w-3 h-3 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <HelpCircle className="w-3 h-3 mr-2" />
                    Help & Support
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Info className="w-3 h-3 mr-2" />
                    About
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {isAuthenticated ? (
                    <DropdownMenuItem 
                      onClick={async () => {
                        if (isSigningOut) return;
                        setIsSigningOut(true);
                        
                        try {
                          // Clear all cookies immediately when sign out is clicked
                          document.cookie.split(";").forEach(function(c) { 
                            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
                          });
                          
                          toast.loading('Signing out...');
                          
                          // Call custom sign out endpoint
                          const response = await fetch('/api/auth/sign-out', {
                            method: 'POST',
                            credentials: 'include',
                          });
                          
                          if (!response.ok) {
                            throw new Error('Sign out failed');
                          }
                          
                          // Clear localStorage and redirect
                          localStorage.clear();
                          toast.success('Signed out successfully');
                          toast.dismiss();
                          window.location.href = '/new';
                        } catch (error) {
                          console.error('Sign out error:', error);
                          setIsSigningOut(false);
                          toast.error('Failed to sign out');
                          // Even if server sign out fails, we've cleared cookies locally
                          // so we can still redirect
                          setTimeout(() => {
                            window.location.href = '/new';
                          }, 1000);
                        }
                      }}
                      disabled={isSigningOut}
                    >
                      <LogOut className="w-3 h-3 mr-2" />
                      {isSigningOut ? 'Signing out...' : 'Sign Out'}
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => router.push('/sign-in')}>
                      <User className="w-3 h-3 mr-2" />
                      Sign In
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Settings Dialog */}
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base">Settings</DialogTitle>
              <DialogDescription className="text-xs">
                Customize your CodeBlaze experience
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium">Theme</label>
                <div className="flex gap-1.5 mt-1.5">
                  <Button
                    variant={theme === 'light' ? 'codeblaze' : 'codeblaze-outline'}
                    size="sm"
                    onClick={() => setTheme('light')}
                    className="text-xs"
                  >
                    <Sun className="w-3 h-3 mr-1" />
                    Light
                  </Button>
                  <Button
                    variant={theme === 'dark' ? 'codeblaze' : 'codeblaze-outline'}
                    size="sm"
                    onClick={() => setTheme('dark')}
                    className="text-xs"
                  >
                    <Moon className="w-3 h-3 mr-1" />
                    Dark
                  </Button>
                  <Button
                    variant={theme === 'system' ? 'codeblaze' : 'codeblaze-outline'}
                    size="sm"
                    onClick={() => setTheme('system')}
                    className="text-xs"
                  >
                    <Monitor className="w-3 h-3 mr-1" />
                    System
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
} 