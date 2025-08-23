import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

interface ChatTitle {
  id: string;
  title: string;
  messageIndex: number;
}

interface ChatTitlesProps {
  messages: any[];
  onTitleClick: (messageIndex: number) => void;
  sidebarOpen?: boolean;
  sidebarCollapsed?: boolean;
}

export function ChatTitles({ messages, onTitleClick, sidebarOpen = false, sidebarCollapsed = false }: ChatTitlesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [activeTitleIndex, setActiveTitleIndex] = useState(0);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const prevMessagesLengthRef = useRef(0);

  // Extract user message titles
  const chatTitles: ChatTitle[] = messages
    .map((message, index) => {
      if (message.role === 'user') {
        // Get the title from the message content
        const content = message.content || '';
        const title = content.length > 50 ? content.substring(0, 50) + '...' : content;
        return {
          id: message.id || `message-${index}`,
          title: title || 'Untitled message',
          messageIndex: index,
        };
      }
      return null;
    })
    .filter((title): title is ChatTitle => title !== null);

  // Auto-shift to latest title when new messages are added
  useEffect(() => {
    if (chatTitles.length > 0) {
      const currentMessagesLength = chatTitles.length;
      const prevMessagesLength = prevMessagesLengthRef.current;
      
      // Check if new messages were added (not just initial load)
      if (prevMessagesLength > 0 && currentMessagesLength > prevMessagesLength) {
        // Auto-shift to the latest title
        const newActiveIndex = currentMessagesLength - 1;
        setActiveTitleIndex(newActiveIndex);
        setIsAutoScrolling(true);
        
        // Reset auto-scrolling flag after a short delay
        setTimeout(() => {
          setIsAutoScrolling(false);
        }, 1000);
      } else if (prevMessagesLength === 0 && currentMessagesLength > 0) {
        // Initial load - set to latest title
        setActiveTitleIndex(currentMessagesLength - 1);
      }
      
      // Update the ref for next comparison
      prevMessagesLengthRef.current = currentMessagesLength;
    }
  }, [chatTitles.length]);

  // Fallback effect for edge cases
  useEffect(() => {
    if (chatTitles.length > 0 && activeTitleIndex >= chatTitles.length) {
      setActiveTitleIndex(chatTitles.length - 1);
    }
  }, [chatTitles.length, activeTitleIndex]);

  if (chatTitles.length === 0) {
    return null;
  }

  // Don't show anything if there's only 1 title
  if (chatTitles.length === 1) {
    return null;
  }

  // Create dynamic lines based on number of titles (max 5 lines)
  const numberOfLines = Math.min(chatTitles.length, 5);
  
  const DynamicLines = () => (
    <div className="flex flex-col gap-1">
      {Array.from({ length: numberOfLines }, (_, i) => {
        const isActive = i === activeTitleIndex;
        return (
          <div
            key={i}
            className={cn(
              "h-0.5 rounded-full transition-all duration-300",
              isActive 
                ? isAutoScrolling
                  ? "w-8 bg-green-500" // Wider and green when auto-scrolling
                  : "w-6 bg-red-500" // Active line: wider and red
                : "w-4 bg-foreground" // Inactive line: normal width and color
            )}
          />
        );
      })}
    </div>
  );

  // Calculate button position based on sidebar state
  const buttonLeft = sidebarOpen 
    ? (sidebarCollapsed ? '4rem' : '16rem') // lg:left-16 (4rem) or lg:left-64 (16rem)
    : '1rem'; // left-4 (1rem)

  // Calculate panel position (button position + button width + small gap)
  const panelLeft = `calc(${buttonLeft} + 2.5rem + 0.5rem)`;

  return (
    <>
      {/* Toggle Button */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <Button
          variant="ghost"
          size="icon"
          className="fixed z-30 h-10 w-10 bg-background/80 backdrop-blur-sm border border-border shadow-sm top-1/2 -translate-y-1/2"
          style={{ left: buttonLeft }}
        >
          <DynamicLines />
        </Button>
      </motion.div>

      {/* Chat Titles Panel */}
      <AnimatePresence>
        {isHovering && (
          <>
            {/* Panel - Centered on the hamburger button */}
            <motion.div
              initial={{ 
                opacity: 0, 
                scale: 0.8, 
                y: 0,
                x: 0
              }}
              animate={{ 
                opacity: 1, 
                scale: 1, 
                y: 0,
                x: 0
              }}
              exit={{ 
                opacity: 0, 
                scale: 0.8, 
                y: 0,
                x: 0
              }}
              transition={{ 
                duration: 0.3,
                ease: "easeOut"
              }}
              className="fixed z-50 w-48 max-h-96 bg-background border border-border rounded-lg shadow-lg"
              style={{
                left: `calc(${buttonLeft} - 0.75rem + 1.25rem)`, // Center the 12rem wide panel on the button (button is 2.5rem wide)
                top: '45%',
                transform: 'translateY(-50%)'
              }}
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
            >

              {/* Titles List */}
              <ScrollArea className="max-h-96">
                <div className="p-2">
                  {chatTitles.map((title, index) => (
                    <React.Fragment key={title.id}>
                      <button
                        onClick={() => {
                          onTitleClick(title.messageIndex);
                          setActiveTitleIndex(index);
                          setIsAutoScrolling(false); // Reset auto-scrolling when manually clicked
                        }}
                        className={cn(
                          "w-full text-left p-2 rounded-md hover:bg-muted transition-colors text-sm",
                          index === activeTitleIndex && isAutoScrolling && "bg-green-100 dark:bg-green-900/20"
                        )}
                      >
                        {title.title}
                      </button>
                      {index < chatTitles.length - 1 && (
                        <Separator className="my-1" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </ScrollArea>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
} 