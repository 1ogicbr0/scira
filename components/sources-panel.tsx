'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';

interface Source {
  url: string;
  title: string;
  text?: string;
  favicon?: string;
}

interface SourcesPanelProps {
  sources: Source[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSearching?: boolean;
  searchQuery?: string;
  currentStage?: ResearchStage;
}

type ResearchStage = 'searching' | 'reading' | 'wrapping' | 'Completed' | 'complete';

const SourceItem: React.FC<{ source: Source; isVisible: boolean; index: number }> = ({ source, isVisible, index }: { source: Source; isVisible: boolean; index: number }) => {
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);
  
  const hostname = new URL(source.url).hostname.replace('www.', '');
  const displayName = hostname.split('.')[0];
  
  return (
    <motion.div 
      className={cn(
        'flex items-center gap-2 px-3 py-2 h-10 bg-white dark:bg-neutral-900 rounded-lg transition-all duration-300 ease-out border border-neutral-200 dark:border-neutral-700 hover:shadow-lg hover:scale-105 hover:border-neutral-300 dark:hover:border-neutral-600 backdrop-blur-sm group',
        isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
      )}
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={isVisible ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.8, y: 20 }}
      transition={{ 
        duration: 0.4, 
        delay: index * 0.1,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      whileHover={{ 
        scale: 1.05,
        transition: { duration: 0.2 }
      }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="relative w-6 h-6 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center overflow-hidden shrink-0">
        {!imageError ? (
          <img
            src={source.favicon || `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(hostname)}`}
            alt=""
            className={cn('w-4 h-4 object-contain drop-shadow-sm', !imageLoaded && 'opacity-0')}
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setImageLoaded(true);
              setImageError(true);
            }}
          />
        ) : (
          <div className="w-4 h-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-sm flex items-center justify-center">
            <span className="text-[8px] font-bold text-white">
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        {imageLoaded && !imageError && (
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-md opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
        )}
      </div>
      <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100 tracking-wide">
        {displayName}
      </span>
    </motion.div>
  );
};

const StageIndicator: React.FC<{ 
  stage: string; 
  isActive: boolean; 
  isComplete: boolean; 
  children?: React.ReactNode 
}> = ({ stage, isActive, isComplete, children }: { stage: string; isActive: boolean; isComplete: boolean; children?: React.ReactNode }) => {
  return (
    <div className="mb-6 relative">
      <div className="flex items-center gap-4 mb-4">
        <div className="relative">
          <div className={cn(
            'w-3 h-3 rounded-full transition-all duration-500 ease-out transform',
            (isActive && stage === 'Completed') 
              ? 'bg-gradient-to-r from-green-400 to-green-600 shadow-lg shadow-green-500/30 scale-110' 
              : isActive 
                ? 'bg-gradient-to-r from-orange-400 to-orange-600 shadow-lg shadow-orange-500/30 scale-110 animate-pulse' 
                : isComplete 
                  ? 'bg-gradient-to-r from-green-400 to-green-600 shadow-md shadow-green-500/20' 
                  : 'bg-neutral-300 dark:bg-neutral-600'
          )} />
          {isActive && (
            <div className={cn(
              'absolute inset-0 rounded-full animate-ping',
              stage === 'Completed' ? 'bg-green-400' : 'bg-orange-400'
            )} style={{ animationDuration: '2s' }} />
          )}
        </div>
        <h3 className={cn(
          'font-semibold text-sm transition-all duration-300 tracking-wide',
          isActive 
            ? 'text-neutral-900 dark:text-neutral-100 scale-105' 
            : 'text-neutral-600 dark:text-neutral-400'
        )}>
          {stage}
        </h3>
      </div>
      <div className={cn(
        'transition-all duration-500 ease-out transform',
        isActive ? 'translate-x-0 opacity-100' : 'translate-x-2 opacity-75'
      )}>
        {children}
      </div>
    </div>
  );
};

const PanelContent = ({ 
  sources, 
  onOpenChange, 
  isSearching = false,
  searchQuery = '',
  currentStage = 'searching',
  showCloseButton = true
}: Omit<SourcesPanelProps, 'open'> & { showCloseButton?: boolean }) => {
  // Use the stage passed from parent (which is now accurately calculated)
  const stage = React.useMemo(() => {
    return currentStage;
  }, [currentStage]);

  // Show all sources when not actively searching, or show them progressively during search
  const visibleSources = React.useMemo(() => {
    if (!isSearching) return sources.length;
    return sources.length; // Show all available sources as they come in
  }, [isSearching, sources.length]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-neutral-200/60 dark:border-neutral-700/40 flex items-center justify-between bg-oklch(0.98 0.01 240)/80 dark:bg-oklch(0.15 0.05 240)/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse"></div>
          <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 tracking-wide">
            Research Progress
          </span>
        </div>
        {showCloseButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors duration-200"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-transparent to-oklch(0.95 0.02 250)/30 dark:to-oklch(0.12 0.08 250)/30">
        {/* Searching Stage */}
        <StageIndicator 
          stage="Searching" 
          isActive={stage === 'searching'} 
          isComplete={stage !== 'searching'}
        >
          {stage === 'searching' && (
            <div className="flex items-center gap-4 px-5 py-4 bg-gradient-to-r from-oklch(0.95 0.02 250) to-oklch(0.92 0.015 260) dark:from-oklch(0.12 0.08 250) dark:to-oklch(0.08 0.06 260) rounded-xl border border-blue-200/50 dark:border-blue-800/30 backdrop-blur-sm">
              <div className="relative">
                <Search className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-pulse" />
                <div className="absolute -inset-1 bg-blue-400 rounded-full opacity-20 animate-ping"></div>
              </div>
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200 tracking-wide">
                {searchQuery}
              </span>
            </div>
          )}
        </StageIndicator>

        {/* Reading Stage */}
        <StageIndicator 
          stage="Reading" 
          isActive={stage === 'reading'} 
          isComplete={['wrapping', 'Completed', 'complete'].includes(stage)}
        >
          <TooltipProvider>
            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-4 bg-gradient-to-br from-oklch(0.95 0.02 250)/50 to-oklch(0.92 0.015 260)/30 dark:from-oklch(0.12 0.08 250)/30 dark:to-oklch(0.08 0.06 260)/50 rounded-2xl border border-neutral-200/40 dark:border-neutral-700/30 backdrop-blur-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {sources.slice(0, visibleSources).map((source, index) => (
                <Tooltip key={index}>
                  <TooltipTrigger asChild>
                    <a 
                      href={source.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <SourceItem 
                        source={source} 
                        isVisible={index < visibleSources}
                        index={index}
                      />
                    </a>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="w-80 p-0 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow-xl rounded-lg overflow-hidden">
                    <div className="p-4">
                      {/* Header */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-5 h-5 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center overflow-hidden shrink-0">
                          <img
                            src={source.favicon || `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(new URL(source.url).hostname)}`}
                            alt=""
                            className="w-3 h-3 object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                          <div className="w-3 h-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-sm flex items-center justify-center hidden">
                            <span className="text-[6px] font-bold text-white">
                              {new URL(source.url).hostname.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                          {source.url}
                        </span>
                        <div className="ml-auto">
                          <svg className="w-3 h-3 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </div>
                      </div>
                      
                      {/* Title */}
                      <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-2 line-clamp-2">
                        {source.title || new URL(source.url).hostname}
                      </h3>
                      
                      {/* Description */}
                      {source.text && (
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-3">
                          {source.text}
                        </p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </motion.div>
          </TooltipProvider>
        </StageIndicator>

        {/* Wrapping up Stage */}
        <StageIndicator 
          stage="Wrapping up" 
          isActive={stage === 'wrapping'} 
          isComplete={['Completed', 'complete'].includes(stage)}
        />

        {/* Completed Stage */}
        <StageIndicator 
          stage="Completed" 
          isActive={stage === 'Completed'} 
          isComplete={stage === 'Completed'}
        />
      </div>
    </div>
  );
};

export const SourcesPanel = ({ 
  sources, 
  open, 
  onOpenChange, 
  isSearching = false,
  searchQuery = '',
  currentStage = 'searching'
}: SourcesPanelProps): React.ReactElement => {
  const isMobile = useIsMobile();

  // For mobile: Use Sheet component for modal behavior
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent 
          side="right" 
          className="w-full sm:w-[350px] bg-gradient-to-b from-oklch(0.98 0.01 240) via-oklch(0.95 0.02 250) to-oklch(0.92 0.015 260) dark:from-oklch(0.15 0.05 240) dark:via-oklch(0.12 0.08 250) dark:to-oklch(0.08 0.06 260) border-l border-neutral-200/80 dark:border-neutral-700/50 p-0"
        >
          <PanelContent
            sources={sources}
            onOpenChange={onOpenChange}
            isSearching={isSearching}
            searchQuery={searchQuery}
            currentStage={currentStage}
            showCloseButton={false}
          />
        </SheetContent>
      </Sheet>
    );
  }

  // For desktop: Use fixed positioning that slides in from right
  return (
    <div
      className={cn(
        'fixed top-0 right-0 h-full z-40 transition-all duration-500 ease-out shadow-2xl shadow-neutral-900/10 dark:shadow-black/30 backdrop-blur-xl',
        'border-l border-neutral-200/80 dark:border-neutral-700/50',
        'w-[400px] lg:w-[450px]',
        'bg-gradient-to-b from-oklch(0.98 0.01 240) via-oklch(0.95 0.02 250) to-oklch(0.92 0.015 260) dark:from-oklch(0.15 0.05 240) dark:via-oklch(0.12 0.08 250) dark:to-oklch(0.08 0.06 260)',
        open 
          ? 'translate-x-0 opacity-100' 
          : 'translate-x-full opacity-0'
      )}
    >
      <PanelContent
        sources={sources}
        onOpenChange={onOpenChange}
        isSearching={isSearching}
        searchQuery={searchQuery}
        currentStage={currentStage}
      />
    </div>
  );
}; 