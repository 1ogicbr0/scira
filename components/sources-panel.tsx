'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

const SourceItem: React.FC<{ source: Source; isVisible: boolean }> = ({ source, isVisible }: { source: Source; isVisible: boolean }) => {
  const hostname = new URL(source.url).hostname.replace('www.', '');
  const displayName = hostname.split('.')[0];
  
  return (
    <div 
      className={cn(
        'inline-flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-neutral-50 to-neutral-100 dark:from-neutral-800 dark:to-neutral-700 rounded-xl transition-all duration-500 ease-out border border-neutral-200/60 dark:border-neutral-600/40 hover:shadow-md hover:scale-105 hover:bg-gradient-to-r hover:from-neutral-100 hover:to-neutral-200 dark:hover:from-neutral-700 dark:hover:to-neutral-600 hover:border-neutral-300/80 dark:hover:border-neutral-500/60 backdrop-blur-sm',
        isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
      )}
    >
      <div className="relative">
        <img
          src={source.favicon || `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(hostname)}`}
          alt=""
          className="w-4 h-4 rounded-sm flex-shrink-0 drop-shadow-sm"
          onError={(e) => {
            e.currentTarget.src = 'https://www.google.com/s2/favicons?sz=128&domain=example.com';
          }}
        />
        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
      </div>
      <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 tracking-wide">
        {displayName}
      </span>
    </div>
  );
};

const StageIndicator: React.FC<{ 
  stage: string; 
  isActive: boolean; 
  isComplete: boolean; 
  children?: React.ReactNode 
}> = ({ stage, isActive, isComplete, children }: { stage: string; isActive: boolean; isComplete: boolean; children?: React.ReactNode }) => {
  return (
    <div className="mb-8 relative">
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
          'font-semibold text-base transition-all duration-300 tracking-wide',
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

export const SourcesPanel = ({ 
  sources, 
  open, 
  onOpenChange, 
  isSearching = false,
  searchQuery = '',
  currentStage = 'searching'
}: SourcesPanelProps): React.ReactElement => {
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
    <div
      className={cn(
        'fixed z-40 transition-all duration-500 ease-out shadow-2xl shadow-neutral-900/10 dark:shadow-black/30 backdrop-blur-xl',
        // Mobile: Full screen overlay
        'sm:top-0 sm:right-0 sm:h-full sm:border-l sm:border-neutral-200/80 sm:dark:border-neutral-700/50',
        'sm:w-[500px] md:w-[600px]',
        // Mobile: Bottom sheet style
        'bottom-0 left-0 right-0 max-h-[80vh] sm:max-h-full rounded-t-2xl sm:rounded-none border-t sm:border-t-0 border-neutral-200/80 dark:border-neutral-700/50',
        'bg-gradient-to-b from-white via-neutral-50/95 to-neutral-100/90 dark:from-neutral-900 dark:via-neutral-900/95 dark:to-neutral-950/90',
        open 
          ? 'translate-y-0 sm:translate-x-0 opacity-100' 
          : 'translate-y-full sm:translate-y-0 sm:translate-x-full opacity-0'
      )}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-5 border-b border-neutral-200/60 dark:border-neutral-700/40 flex items-center justify-between bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 tracking-wide">
              Research Progress
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors duration-200"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-transparent to-neutral-50/30 dark:to-neutral-950/30">
          {/* Searching Stage */}
          <StageIndicator 
            stage="Searching" 
            isActive={stage === 'searching'} 
            isComplete={stage !== 'searching'}
          >
            {stage === 'searching' && (
              <div className="flex items-center gap-4 px-5 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl border border-blue-200/50 dark:border-blue-800/30 backdrop-blur-sm">
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
              <div className="flex flex-wrap gap-3 p-4 bg-gradient-to-br from-neutral-50/50 to-neutral-100/30 dark:from-neutral-800/30 dark:to-neutral-900/50 rounded-2xl border border-neutral-200/40 dark:border-neutral-700/30 backdrop-blur-sm">
                {sources.slice(0, visibleSources).map((source, index) => (
                  <Tooltip key={index}>
                    <TooltipTrigger asChild>
                      <a 
                        href={source.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="group hover:scale-105 transition-all duration-300 cursor-pointer"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <SourceItem 
                          source={source} 
                          isVisible={index < visibleSources}
                        />
                      </a>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 border-0 shadow-lg">
                      <p className="text-xs font-medium">{source.url}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
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
    </div>
  );
}; 