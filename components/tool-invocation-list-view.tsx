/* eslint-disable @next/next/no-img-element */
'use client';

import React, { memo, useCallback, useEffect, useRef, useState, lazy, Suspense } from 'react';
import { ToolInvocation } from 'ai';
import { motion } from 'framer-motion';
import { Wave } from '@foobar404/wave';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ArrowUpRight, LucideIcon, User2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import { generateSpeech } from '@/app/actions';
import Image from 'next/image';
import MemoryManager from '@/components/memory-manager';

// UI Components
import { BorderTrail } from '@/components/core/border-trail';
import { TextShimmer } from '@/components/core/text-shimmer';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { YouTubeSearchResults } from './youtube-search-results';

// Icons
import {
  Book,
  Building,
  ChevronDown,
  Cloud,
  Copy,
  DollarSign,
  ExternalLink,
  Film,
  Globe,
  Loader2,
  MapPin,
  Pause,
  Plane,
  Play as PlayIcon,
  Server,
  TextIcon,
  TrendingUpIcon,
  Tv,
  XCircle,
  YoutubeIcon,
} from 'lucide-react';
import { Memory, Clock as PhosphorClock, RedditLogo, RoadHorizon, XLogo } from '@phosphor-icons/react';
import { ScrollArea } from '@radix-ui/react-scroll-area';

// Lazy load heavy components
const FlightTracker = lazy(() =>
  import('@/components/flight-tracker').then((module) => ({ default: module.FlightTracker })),
);
const InteractiveChart = lazy(() => import('@/components/interactive-charts'));
const MapComponent = lazy(() =>
  import('@/components/map-components').then((module) => ({ default: module.MapComponent })),
);
const MapContainer = lazy(() =>
  import('@/components/map-components').then((module) => ({ default: module.MapContainer })),
);
const TMDBResult = lazy(() => import('@/components/movie-info'));
const MultiSearch = lazy(() => import('@/components/multi-search'));
const NearbySearchMapView = lazy(() => import('@/components/nearby-search-map-view'));
const NearbyDiscoveryView = lazy(() => import('@/components/nearby-discovery-view'));
const TrendingResults = lazy(() => import('@/components/trending-tv-movies-results'));
const AcademicPapersCard = lazy(() => import('@/components/academic-papers'));
const WeatherChart = lazy(() => import('@/components/weather-chart'));
const MCPServerList = lazy(() => import('@/components/mcp-server-list'));
const RedditSearch = lazy(() => import('@/components/reddit-search'));
const XSearch = lazy(() => import('@/components/x-search'));
const ExtremeSearch = lazy(() =>
  import('@/components/extreme-search').then((module) => ({ default: module.ExtremeSearch })),
);
const CryptoCoinsData = lazy(() =>
  import('@/components/crypto-coin-data').then((module) => ({ default: module.CoinData })),
);
const CurrencyConverter = lazy(() =>
  import('@/components/currency_conv').then((module) => ({ default: module.CurrencyConverter })),
);
const InteractiveStockChart = lazy(() => import('@/components/interactive-stock-chart'));
const CryptoChart = lazy(() =>
  import('@/components/crypto-charts').then((module) => ({ default: module.CryptoChart })),
);
const OnChainCryptoComponents = lazy(() =>
  import('@/components/onchain-crypto-components').then((module) => ({ default: module.OnChainTokenPrice })),
);
const CryptoTickers = lazy(() =>
  import('@/components/crypto-charts').then((module) => ({ default: module.CryptoTickers })),
);

// Loading component for lazy-loaded components
const ComponentLoader = () => (
  <div className="flex items-center justify-center py-8">
    <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
  </div>
);

// SearchLoadingState component
export const SearchLoadingState = ({
  icon: Icon,
  text,
  color,
}: {
  icon: LucideIcon;
  text: string;
  color: 'red' | 'green' | 'orange' | 'violet' | 'gray' | 'blue';
}) => {
  const colorVariants = {
    red: {
      background: 'bg-red-50 dark:bg-red-950',
      border: 'from-red-200 via-red-500 to-red-200 dark:from-red-400 dark:via-red-500 dark:to-red-700',
      text: 'text-red-500',
      icon: 'text-red-500',
    },
    green: {
      background: 'bg-green-50 dark:bg-green-950',
      border: 'from-green-200 via-green-500 to-green-200 dark:from-green-400 dark:via-green-500 dark:to-green-700',
      text: 'text-green-500',
      icon: 'text-green-500',
    },
    orange: {
      background: 'bg-orange-50 dark:bg-orange-950',
      border:
        'from-orange-200 via-orange-500 to-orange-200 dark:from-orange-400 dark:via-orange-500 dark:to-orange-700',
      text: 'text-orange-500',
      icon: 'text-orange-500',
    },
    violet: {
      background: 'bg-violet-50 dark:bg-violet-950',
      border:
        'from-violet-200 via-violet-500 to-violet-200 dark:from-violet-400 dark:via-violet-500 dark:to-violet-700',
      text: 'text-violet-500',
      icon: 'text-violet-500',
    },
    gray: {
      background: 'bg-neutral-50 dark:bg-neutral-950',
      border:
        'from-neutral-200 via-neutral-500 to-neutral-200 dark:from-neutral-400 dark:via-neutral-500 dark:to-neutral-700',
      text: 'text-neutral-500',
      icon: 'text-neutral-500',
    },
    blue: {
      background: 'bg-blue-50 dark:bg-blue-950',
      border: 'from-blue-200 via-blue-500 to-blue-200 dark:from-blue-400 dark:via-blue-500 dark:to-blue-700',
      text: 'text-blue-500',
      icon: 'text-blue-500',
    },
  };

  const variant = colorVariants[color];

  return (
    <Card className="relative w-full h-[100px] my-4 overflow-hidden shadow-none">
      <BorderTrail className={cn('bg-linear-to-l', variant.border)} size={80} />
      <CardContent className="px-6!">
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('relative h-10 w-10 rounded-full flex items-center justify-center', variant.background)}>
              <BorderTrail className={cn('bg-linear-to-l', variant.border)} size={40} />
              <Icon className={cn('h-5 w-5', variant.icon)} />
            </div>
            <div className="space-y-2">
              <TextShimmer className="text-base font-medium" duration={2}>
                {text}
              </TextShimmer>
              <div className="flex gap-2">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700 animate-pulse"
                    style={{
                      width: `${Math.random() * 40 + 20}px`,
                      animationDelay: `${i * 0.2}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Dedicated nearby search skeleton loading state
const NearbySearchSkeleton = ({ type }: { type: string }) => {
  return (
    <div className="relative w-full h-[70vh] bg-white dark:bg-neutral-900 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-800 my-4">
      {/* Header skeleton */}
      <div className="absolute top-4 left-4 z-20 flex gap-2">
        <div className="h-6 w-12 bg-neutral-200 dark:bg-neutral-700 rounded-full animate-pulse" />
        <div className="h-6 w-24 bg-neutral-200 dark:bg-neutral-700 rounded-full animate-pulse" />
      </div>

      {/* View toggle skeleton */}
      <div className="absolute top-4 right-4 z-20 flex rounded-full bg-white dark:bg-black border border-neutral-200 dark:border-neutral-700 p-0.5 shadow-lg">
        <div className="px-4 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 animate-pulse">
          <div className="h-4 w-8 bg-neutral-200 dark:bg-neutral-700 rounded" />
        </div>
        <div className="px-4 py-1 rounded-full">
          <div className="h-4 w-8 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
        </div>
      </div>

      {/* Map skeleton */}
      <div className="w-full h-full bg-neutral-100 dark:bg-neutral-800 relative animate-pulse">
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-200 dark:from-neutral-700 to-transparent opacity-50" />

        {/* Mock markers */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-6 h-6 bg-blue-400 rounded-full opacity-60 animate-pulse"></div>
        </div>
        <div className="absolute top-1/3 right-1/3 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-6 h-6 bg-blue-400 rounded-full opacity-40 animate-pulse"></div>
        </div>
        <div className="absolute bottom-1/3 left-1/4 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-6 h-6 bg-blue-400 rounded-full opacity-50 animate-pulse"></div>
        </div>

        {/* Loading text overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white/90 dark:bg-black/90 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-500 animate-pulse" />
            <TextShimmer className="text-sm font-medium" duration={2}>
              {`Finding nearby ${type}...`}
            </TextShimmer>
          </div>
        </div>

        {/* Map controls skeleton */}
        <div className="absolute bottom-4 right-4 space-y-2">
          <div className="w-8 h-8 bg-neutral-300 dark:bg-neutral-700 rounded shadow-sm animate-pulse" />
          <div className="w-8 h-8 bg-neutral-300 dark:bg-neutral-700 rounded shadow-sm animate-pulse" />
        </div>
      </div>
    </div>
  );
};

// Dedicated nearby discovery skeleton loading state
const NearbyDiscoverySkeleton = () => {
  return (
    <div className="space-y-6 my-4">
      {/* Header skeleton */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="h-6 w-48 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-2" />
              <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
              <div className="h-8 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
              <div className="h-8 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Insights skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white dark:bg-neutral-800 shadow-sm">
                  <div className="h-5 w-5 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
                </div>
                <div>
                  <div className="h-3 w-16 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-1" />
                  <div className="h-6 w-12 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-1" />
                  <div className="h-2 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Categories skeleton */}
      <div className="grid md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-6 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="flex items-center justify-between">
                    <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
                    <div className="h-5 w-8 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Loading text overlay */}
      <div className="text-center py-4">
        <div className="flex items-center justify-center gap-2">
          <MapPin className="h-5 w-5 text-blue-500 animate-pulse" />
          <TextShimmer className="text-sm font-medium" duration={2}>
            Discovering nearby places...
          </TextShimmer>
        </div>
      </div>
    </div>
  );
};

// YouTube card interface and component
interface YouTubeCardProps {
  video: any;
  index: number;
}

const YouTubeCard: React.FC<YouTubeCardProps> = ({ video, index }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!video) return null;

  // Format timestamp for accessibility
  const formatTimestamp = (timestamp: string) => {
    const match = timestamp.match(/(\d+:\d+(?::\d+)?) - (.+)/);
    if (match) {
      const [_, time, description] = match;
      return { time, description };
    }
    return { time: '', description: timestamp };
  };

  // Prevent event propagation to allow scrolling during streaming
  const handleScrollableAreaEvents = (e: React.UIEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className="w-[280px] shrink-0 rounded-lg border dark:border-neutral-800 border-neutral-200 overflow-hidden bg-white dark:bg-neutral-900 shadow-xs hover:shadow-md transition-shadow duration-200"
      onTouchStart={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <Link
        href={video.url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative aspect-video block bg-neutral-100 dark:bg-neutral-800 overflow-hidden"
        aria-label={`Watch ${video.details?.title || 'YouTube video'}`}
      >
        {video.details?.thumbnail_url ? (
          <img
            src={video.details.thumbnail_url}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <YoutubeIcon className="h-8 w-8 text-red-500" />
          </div>
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="absolute bottom-2 left-2 right-2 text-white text-xs font-medium line-clamp-2">
            {video.details?.title || 'YouTube Video'}
          </div>
          <div className="rounded-full bg-white/90 p-2">
            <PlayIcon className="h-6 w-6 text-red-600" />
          </div>
        </div>
      </Link>

      <div className="p-3 flex flex-col gap-2">
        <div>
          <Link
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium line-clamp-2 hover:text-red-500 transition-colors dark:text-neutral-100"
          >
            {video.details?.title || 'YouTube Video'}
          </Link>

          {video.details?.author_name && (
            <Link
              href={video.details.author_url || video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 group mt-1.5 w-fit"
              aria-label={`Channel: ${video.details.author_name}`}
            >
              <div className="h-5 w-5 rounded-full bg-red-50 dark:bg-red-950 flex items-center justify-center shrink-0">
                <User2 className="h-3 w-3 text-red-500" />
              </div>
              <span className="text-xs text-neutral-600 dark:text-neutral-400 group-hover:text-red-500 transition-colors truncate">
                {video.details.author_name}
              </span>
            </Link>
          )}
        </div>

        {((video.timestamps && video.timestamps?.length > 0) || video.captions) && (
          <div className="mt-1">
            <Accordion type="single" collapsible>
              <AccordionItem value="details" className="border-none">
                <AccordionTrigger className="py-1 hover:no-underline">
                  <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-red-500 dark:hover:text-red-400">
                    {isExpanded ? 'Hide details' : 'Show details'}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  {video.timestamps && video.timestamps.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      <h4 className="text-xs font-semibold dark:text-neutral-300 text-neutral-700">Key Moments</h4>
                      <ScrollArea className="h-[120px]">
                        <div className="pr-4">
                          {video.timestamps.map((timestamp: string, i: number) => {
                            const { time, description } = formatTimestamp(timestamp);
                            return (
                              <Link
                                key={i}
                                href={`${video.url}&t=${time.split(':').reduce((acc, time, i, arr) => {
                                  if (arr.length === 2) {
                                    // MM:SS format
                                    return i === 0 ? acc + parseInt(time) * 60 : acc + parseInt(time);
                                  } else {
                                    // HH:MM:SS format
                                    return i === 0
                                      ? acc + parseInt(time) * 3600
                                      : i === 1
                                        ? acc + parseInt(time) * 60
                                        : acc + parseInt(time);
                                  }
                                }, 0)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-start gap-2 py-1 px-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                              >
                                <span className="text-xs font-medium text-red-500 whitespace-nowrap">{time}</span>
                                <span className="text-xs text-neutral-700 dark:text-neutral-300 line-clamp-1">
                                  {description}
                                </span>
                              </Link>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </div>
                  )}

                  {video.captions && (
                    <div className="mt-3 space-y-1.5">
                      <h4 className="text-xs font-semibold dark:text-neutral-300 text-neutral-700">Transcript</h4>
                      <ScrollArea className="h-[120px]">
                        <div className="text-xs dark:text-neutral-400 text-neutral-600 rounded bg-neutral-50 dark:bg-neutral-800 p-2">
                          <p className="whitespace-pre-wrap">{video.captions}</p>
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}
      </div>
    </div>
  );
};

// Memoize the YouTubeCard component
const MemoizedYouTubeCard = React.memo(YouTubeCard, (prevProps, nextProps) => {
  return (
    prevProps.video.videoId === nextProps.video.videoId &&
    prevProps.index === nextProps.index &&
    prevProps.video.url === nextProps.video.url &&
    JSON.stringify(prevProps.video.details) === JSON.stringify(nextProps.video.details)
  );
});

// Modern code interpreter components
const LineNumbers = memo(({ count }: { count: number }) => (
  <div className="hidden sm:block select-none w-8 sm:w-10 flex-shrink-0 border-r border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800/30 py-0">
    {Array.from({ length: count }, (_, i) => (
      <div
        key={i}
        className="text-[10px] h-[20px] flex items-center justify-end text-neutral-500 dark:text-neutral-400 pr-2 font-mono"
      >
        {i + 1}
      </div>
    ))}
  </div>
));
LineNumbers.displayName = 'LineNumbers';

const StatusBadge = memo(({ status }: { status: 'running' | 'completed' | 'error' }) => {
  if (status === 'completed') return null;

  if (status === 'error') {
    return (
      <div className="flex items-center gap-1 text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded-md text-[9px] font-medium">
        <XCircle className="h-2.5 w-2.5" />
        <span className="hidden sm:inline">Error</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-500/20">
      <Loader2 className="h-2.5 w-2.5 animate-spin text-blue-500" />
      <span className="hidden sm:inline text-[9px] font-medium text-blue-600 dark:text-blue-400">Running</span>
    </div>
  );
});
StatusBadge.displayName = 'StatusBadge';

const CodeBlock = memo(({ code, language }: { code: string; language: string }) => {
  const lines = code.split('\n');
  return (
    <div className="flex bg-neutral-50 dark:bg-neutral-900/70">
      <LineNumbers count={lines.length} />
      <div className="overflow-x-auto w-full">
        <pre className="py-0 px-2 sm:px-3 m-0 font-mono text-[11px] sm:text-xs leading-[20px] text-neutral-800 dark:text-neutral-300">
          {code}
        </pre>
      </div>
    </div>
  );
});
CodeBlock.displayName = 'CodeBlock';

const OutputBlock = memo(({ output, error }: { output?: string; error?: string }) => {
  if (!output && !error) return null;

  return (
    <div
      className={cn(
        'font-mono text-[11px] sm:text-xs leading-[20px] py-0 px-2 sm:px-3',
        error
          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
          : 'bg-neutral-100 dark:bg-neutral-800/50 text-neutral-700 dark:text-neutral-300',
      )}
    >
      <pre className="whitespace-pre-wrap overflow-x-auto">{error || output}</pre>
    </div>
  );
});
OutputBlock.displayName = 'OutputBlock';

function CodeInterpreterView({
  code,
  output,
  language = 'python',
  title,
  status,
  error,
}: {
  code: string;
  output?: string;
  language?: string;
  title?: string;
  status?: 'running' | 'completed' | 'error';
  error?: string;
}) {
  // Set initial state based on status - expanded while running, collapsed when complete
  const [isExpanded, setIsExpanded] = useState(status !== 'completed');

  // Update expanded state when status changes
  useEffect(() => {
    // If status changes to completed, collapse the code section
    if (status === 'completed' && (output || error)) {
      setIsExpanded(false);
    }
    // Keep expanded during running or error states
    else if (status === 'running' || status === 'error') {
      setIsExpanded(true);
    }
  }, [status, output, error]);

  return (
    <div className="group overflow-hidden bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-sm transition-all duration-200 hover:shadow">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between px-2.5 sm:px-3 py-2 bg-neutral-50 dark:bg-neutral-800/30 border-b border-neutral-200 dark:border-neutral-800 gap-2">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1 sm:gap-1.5 px-1.5 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-700/50">
            <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            <div className="text-[9px] font-medium font-mono text-neutral-500 dark:text-neutral-400 uppercase">
              {language}
            </div>
          </div>
          <h3 className="text-xs font-medium text-neutral-700 dark:text-neutral-200 truncate max-w-[160px] sm:max-w-xs">
            {title || 'Code Execution'}
          </h3>
          <StatusBadge status={status || 'completed'} />
        </div>
        <div className="flex items-center gap-1 sm:gap-1.5 ml-auto">
          <CopyButton text={code} />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 w-6 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
          >
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform duration-200', isExpanded ? 'rotate-180' : '')}
            />
          </Button>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div>
          <div className="max-w-full overflow-x-auto max-h-60 scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700 scrollbar-track-transparent">
            <CodeBlock code={code} language={language} />
          </div>
          {(output || error) && (
            <>
              <div className="border-t border-neutral-200 dark:border-neutral-800 px-2.5 sm:px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800/30">
                <div className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                  {error ? 'Error Output' : 'Execution Result'}
                </div>
              </div>
              <div className="max-w-full overflow-x-auto max-h-60 scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700 scrollbar-track-transparent">
                <OutputBlock output={output} error={error} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Icon components (single definitions)
const CodeIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polyline points="16 18 22 12 16 6"></polyline>
    <polyline points="8 6 2 12 8 18"></polyline>
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const CopyButton = memo(({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleCopy}
      className={cn(
        'h-7 w-7 transition-colors duration-150',
        copied
          ? 'text-green-500'
          : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100',
      )}
    >
      {copied ? <CheckIcon className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
});
CopyButton.displayName = 'CopyButton';

// Translation Tool Component
const TranslationTool: React.FC<{ toolInvocation: ToolInvocation; result: any }> = ({ toolInvocation, result }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const waveRef = useRef<Wave | null>(null);

  useEffect(() => {
    const _audioRef = audioRef.current;
    return () => {
      if (_audioRef) {
        _audioRef.pause();
        _audioRef.src = '';
      }
    };
  }, []);

  useEffect(() => {
    if (audioUrl && audioRef.current && canvasRef.current) {
      waveRef.current = new Wave(audioRef.current, canvasRef.current);
      waveRef.current.addAnimation(
        new waveRef.current.animations.Lines({
          lineWidth: 3,
          lineColor: 'rgb(82, 82, 91)',
          count: 80,
          mirroredY: true,
        }),
      );
    }
  }, [audioUrl]);

  const handlePlayPause = async () => {
    if (!audioUrl && !isGeneratingAudio) {
      setIsGeneratingAudio(true);
      try {
        const { audio } = await generateSpeech(result.translatedText);
        setAudioUrl(audio);
        setIsGeneratingAudio(false);
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.play();
            setIsPlaying(true);
          }
        }, 100);
      } catch (error) {
        console.error('Error generating speech:', error);
        setIsGeneratingAudio(false);
      }
    } else if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  if (!result) {
    return (
      <div className="group my-2 p-3 rounded-md border border-neutral-200/60 dark:border-neutral-700/60 bg-neutral-50/30 dark:bg-neutral-900/30">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-md bg-neutral-600 flex items-center justify-center opacity-80">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          </div>
          <div className="flex-1">
            <div className="h-2.5 w-20 bg-neutral-300 dark:bg-neutral-600 rounded-sm animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group my-2 rounded-md border border-neutral-200/60 dark:border-neutral-700/60 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm hover:border-neutral-300 dark:hover:border-neutral-600 transition-all duration-200">
      <div className="p-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 w-5 h-5 rounded-md bg-neutral-600 flex items-center justify-center">
            <TextIcon className="w-2.5 h-2.5 text-white" />
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium text-neutral-900 dark:text-neutral-100">Translation</span>
              <span className="text-neutral-400">•</span>
              <span className="text-neutral-500 dark:text-neutral-400">
                {result.detectedLanguage} → {toolInvocation.args.to}
              </span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="group/text">
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 opacity-70">
                  {result.detectedLanguage}
                </div>
                <div className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed break-words">
                  {toolInvocation.args.text}
                </div>
              </div>

              <div className="group/text">
                <div className="text-xs text-neutral-600 dark:text-neutral-400 mb-1 opacity-70">
                  {toolInvocation.args.to}
                </div>
                <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100 leading-relaxed break-words">
                  {result.translatedText}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handlePlayPause}
                disabled={isGeneratingAudio}
                className={cn(
                  'w-5 h-5 rounded-sm flex items-center justify-center transition-all duration-150',
                  isPlaying
                    ? 'bg-neutral-700 text-white shadow-sm'
                    : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200',
                )}
              >
                {isGeneratingAudio ? (
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-2.5 h-2.5" />
                ) : (
                  <PlayIcon className="w-2.5 h-2.5" />
                )}
              </button>

              <div className="flex-1 h-5 bg-neutral-100/80 dark:bg-neutral-800/80 rounded-sm overflow-hidden">
                {!audioUrl && !isGeneratingAudio && (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-full h-0.5 bg-neutral-200 dark:bg-neutral-700 rounded-full" />
                  </div>
                )}
                <canvas
                  ref={canvasRef}
                  width="800"
                  height="40"
                  className="w-full h-full"
                  style={{ imageRendering: 'crisp-edges' }}
                />
              </div>

              <span className="text-xs text-neutral-400 dark:text-neutral-500 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                {isGeneratingAudio ? '...' : audioUrl ? '●' : '○'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
        />
      )}
    </div>
  );
};

// Main ToolInvocationListView component
const ToolInvocationListView = memo(
  ({ toolInvocations, annotations, onSourcesClick }: { 
    toolInvocations: ToolInvocation[]; 
    annotations: any; 
    onSourcesClick?: (sources: Array<{ url: string; title: string; text?: string }>, forceOpen?: boolean, messageId?: string | null) => void 
  }) => {
    const renderToolInvocation = useCallback(
      (toolInvocation: ToolInvocation, _index: number) => {
        const args = JSON.parse(JSON.stringify(toolInvocation.args));
        const result = 'result' in toolInvocation ? JSON.parse(JSON.stringify(toolInvocation.result)) : null;

        // Handle all tool invocation types
        switch (toolInvocation.toolName) {
          case 'find_place_on_map': {
            if (!result) {
              return <SearchLoadingState icon={MapPin} text="Finding locations..." color="blue" />;
            }

            if (!result.success) {
              return (
                <div className="w-full my-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950">
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900 flex items-center justify-center">
                        <MapPin className="h-4 w-4 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-red-900 dark:text-red-100">Location search failed</h3>
                        <p className="text-xs text-red-700 dark:text-red-300 mt-1">{result.error}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            const { places } = result;
            if (!places || places.length === 0) {
              return (
                <div className="w-full my-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950">
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                        <MapPin className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-amber-900 dark:text-amber-100">No locations found</h3>
                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                          Try searching with different keywords or check the spelling.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div className="w-full my-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
                <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <div>
                      <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {places.length} Location{places.length !== 1 ? 's' : ''} Found
                      </h3>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {result.search_type === 'forward' ? 'Address Search' : 'Coordinate Search'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="relative h-[400px] min-h-[300px] bg-neutral-50 dark:bg-neutral-900">
                  <Suspense fallback={<ComponentLoader />}>
                    <MapComponent
                      center={{
                        lat: places[0].location.lat,
                        lng: places[0].location.lng,
                      }}
                      places={places.map((place: any) => ({
                        name: place.name,
                        location: place.location,
                        vicinity: place.formatted_address,
                      }))}
                      zoom={places.length > 1 ? 12 : 15}
                      height="h-full"
                      className="rounded-none"
                    />
                  </Suspense>
                </div>

                <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {places.map((place: any, index: number) => (
                    <div key={place.place_id || index} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
                          {place.types?.[0] === 'street_address' || place.types?.[0] === 'route' ? (
                            <RoadHorizon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          ) : place.types?.[0] === 'locality' ? (
                            <Building className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                                {place.name}
                              </h4>

                              {place.formatted_address && (
                                <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">
                                  {place.formatted_address}
                                </p>
                              )}

                              <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
                                <span className="font-mono">
                                  {place.location.lat.toFixed(4)}, {place.location.lng.toFixed(4)}
                                </span>
                                {place.types?.[0] && (
                                  <span className="capitalize">{place.types[0].replace(/_/g, ' ')}</span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 ml-3">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const coords = `${place.location.lat},${place.location.lng}`;
                                  navigator.clipboard.writeText(coords);
                                  toast.success('Coordinates copied!');
                                }}
                                className="h-7 px-2 text-xs"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>

                              <Button
                                size="sm"
                                onClick={() => {
                                  const url = place.place_id
                                    ? `https://www.google.com/maps/place/?q=place_id:${place.place_id}`
                                    : `https://www.google.com/maps/search/?api=1&query=${place.location.lat},${place.location.lng}`;
                                  window.open(url, '_blank');
                                }}
                                className="h-7 px-2 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          case 'movie_or_tv_search': {
            if (!result) {
              return <SearchLoadingState icon={Film} text="Discovering entertainment content..." color="violet" />;
            }
            return (
              <Suspense fallback={<ComponentLoader />}>
                <TMDBResult result={result} />
              </Suspense>
            );
          }

          case 'trending_movies': {
            if (!result) {
              return <SearchLoadingState icon={Film} text="Loading trending movies..." color="blue" />;
            }
            return (
              <Suspense fallback={<ComponentLoader />}>
                <TrendingResults result={result} type="movie" />
              </Suspense>
            );
          }

          case 'trending_tv': {
            if (!result) {
              return <SearchLoadingState icon={Tv} text="Loading trending TV shows..." color="blue" />;
            }
            return (
              <Suspense fallback={<ComponentLoader />}>
                <TrendingResults result={result} type="tv" />
              </Suspense>
            );
          }

          case 'youtube_search': {
            return <YouTubeSearchResults results={result} isLoading={!result} />;
          }

          case 'academic_search': {
            if (!result) {
              return <SearchLoadingState icon={Book} text="Searching academic papers..." color="violet" />;
            }
            return (
              <Suspense fallback={<ComponentLoader />}>
                <AcademicPapersCard results={result.results} />
              </Suspense>
            );
          }

          case 'nearby_places_search': {
            if (!result) {
              return <NearbySearchSkeleton type={args.type} />;
            }

            if (!result.success) {
              return (
                <Card className="w-full my-4 p-4 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <MapPin className="h-5 w-5" />
                    <span className="font-medium">Nearby search failed</span>
                  </div>
                  <p className="text-sm text-red-500 dark:text-red-300 mt-1">{result.error}</p>
                </Card>
              );
            }

            const { places, center } = result;
            if (!places || places.length === 0) {
              return (
                <Card className="w-full my-4 p-4 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950">
                  <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                    <MapPin className="h-5 w-5" />
                    <span className="font-medium">No nearby {args.type} found</span>
                  </div>
                  <p className="text-sm text-yellow-500 dark:text-yellow-300 mt-1">
                    Try expanding the search radius or searching in a different area.
                  </p>
                </Card>
              );
            }

            const transformedPlaces = places.map((place: any) => ({
              name: place.name,
              location: place.location,
              place_id: place.place_id,
              vicinity: place.formatted_address,
              rating: place.rating,
              reviews_count: place.reviews_count,
              price_level: place.price_level,
              photos: place.photos,
              is_closed: !place.is_open,
              type: place.types?.[0]?.replace(/_/g, ' '),
              source: place.source,
              phone: place.phone,
              website: place.website,
              hours: place.opening_hours,
              distance: place.distance,
            }));

            return (
              <div className="my-4">
                <Suspense fallback={<ComponentLoader />}>
                  <NearbySearchMapView
                    center={center}
                    places={transformedPlaces}
                    type={result.type}
                    query={result.query}
                    searchRadius={result.radius}
                  />
                </Suspense>
              </div>
            );
          }

          case 'nearby_discovery': {
            if (!result) {
              return <NearbyDiscoverySkeleton />;
            }

            if (!result.success) {
              return (
                <Card className="w-full my-4 p-4 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <MapPin className="h-5 w-5" />
                    <span className="font-medium">Nearby discovery failed</span>
                  </div>
                  <p className="text-sm text-red-500 dark:text-red-300 mt-1">{result.error}</p>
                </Card>
              );
            }

            return (
              <div className="my-4">
                <Suspense fallback={<ComponentLoader />}>
                  <NearbyDiscoveryView {...result} />
                </Suspense>
              </div>
            );
          }

          case 'get_weather_data': {
            if (!result) {
              return (
                <Card className="my-2 py-0 shadow-none bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 gap-0">
                  <CardHeader className="py-2 px-3 sm:px-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="h-5 w-32 bg-neutral-200 dark:bg-neutral-800 rounded-md animate-pulse" />
                        <div className="flex items-center mt-1 gap-2">
                          <div className="h-4 w-20 bg-neutral-200 dark:bg-neutral-800 rounded-full animate-pulse" />
                          <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-800 rounded-full animate-pulse" />
                        </div>
                      </div>
                      <div className="flex items-center ml-4">
                        <div className="text-right">
                          <div className="h-8 w-16 bg-neutral-200 dark:bg-neutral-800 rounded-md animate-pulse" />
                          <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-800 rounded-md mt-1 animate-pulse" />
                        </div>
                        <div className="h-12 w-12 flex items-center justify-center ml-2">
                          <Cloud className="h-8 w-8 text-neutral-300 dark:text-neutral-700 animate-pulse" />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-7 w-28 bg-neutral-200 dark:bg-neutral-800 rounded-full animate-pulse" />
                      ))}
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="px-3 sm:px-4">
                      <div className="h-8 w-full bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse mb-4" />
                      <div className="h-[180px] w-full bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse" />
                      <div className="flex justify-between mt-4 pb-4 overflow-x-auto no-scrollbar">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className="flex flex-col items-center min-w-[60px] sm:min-w-[70px] p-1.5 sm:p-2 mx-0.5"
                          >
                            <div className="h-4 w-12 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse mb-2" />
                            <div className="h-8 w-8 rounded-full bg-neutral-200 dark:bg-neutral-800 animate-pulse mb-2" />
                            <div className="h-3 w-8 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t border-neutral-200 dark:border-neutral-800 py-0! px-4 m-0!">
                    <div className="w-full flex justify-end items-center py-1">
                      <div className="h-3 w-32 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                    </div>
                  </CardFooter>
                </Card>
              );
            }
            return (
              <Suspense fallback={<ComponentLoader />}>
                <WeatherChart result={result} />
              </Suspense>
            );
          }

          case 'currency_converter': {
            return (
              <Suspense fallback={<ComponentLoader />}>
                <CurrencyConverter toolInvocation={toolInvocation} result={result} />
              </Suspense>
            );
          }

          case 'stock_chart': {
            return (
              <div className="flex flex-col gap-3 w-full mt-4">
                {!result && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      'w-fit flex items-center gap-3 px-4 py-2 rounded-full transition-colors duration-200',
                      'bg-blue-200 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
                    )}
                  >
                    <TrendingUpIcon className="h-4 w-4" />
                    <span className="font-medium">{args.title}</span>
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </Badge>
                )}

                {result?.chart && (
                  <div className="w-full">
                    <Suspense fallback={<ComponentLoader />}>
                      <InteractiveStockChart
                        title={args.title}
                        chart={{
                          ...result.chart,
                          x_scale: 'datetime',
                        }}
                        data={result.chart.elements}
                        stock_symbols={args.stock_symbols}
                        currency_symbols={args.currency_symbols || args.stock_symbols.map(() => 'USD')}
                        interval={args.interval}
                        news_results={result.news_results}
                      />
                    </Suspense>
                  </div>
                )}
              </div>
            );
          }

          case 'code_interpreter': {
            return (
              <div className="space-y-3 w-full overflow-hidden">
                <CodeInterpreterView
                  code={args.code}
                  output={result?.message}
                  error={result?.error}
                  language="python"
                  title={args.title || 'Code Execution'}
                  status={result?.error ? 'error' : result ? 'completed' : 'running'}
                />

                {result?.chart && (
                  <div className="pt-1 overflow-x-auto">
                    <Suspense fallback={<ComponentLoader />}>
                      <InteractiveChart chart={result.chart} />
                    </Suspense>
                  </div>
                )}
              </div>
            );
          }

          case 'extreme_search': {
            return (
              <Suspense fallback={<ComponentLoader />}>
                <ExtremeSearch toolInvocation={toolInvocation} annotations={annotations} onSourcesClick={onSourcesClick} />
              </Suspense>
            );
          }

          case 'web_search': {
            return (
              <div className="mt-2 relative isolate overflow-hidden">
                <Suspense fallback={<ComponentLoader />}>
                  <MultiSearch
                    result={result}
                    args={args}
                    annotations={annotations?.filter((a: any) => a.type === 'query_completion') || []}
                  />
                </Suspense>
              </div>
            );
          }

          case 'text_translate': {
            return <TranslationTool toolInvocation={toolInvocation} result={result} />;
          }

          case 'memory_manager': {
            return <MemoryManager result={result} />;
          }

          case 'greeting': {
            if (!result) {
              return <SearchLoadingState icon={User2} text="Preparing greeting..." color="gray" />;
            }

            return (
              <div className="group my-2 rounded-md border border-neutral-200/60 dark:border-neutral-700/60 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm hover:border-neutral-300 dark:hover:border-neutral-600 transition-all duration-200">
                <div className="p-3">
                  <div className="flex items-start gap-3">
                    {result.timeEmoji && (
                      <div className="mt-0.5 w-5 h-5 rounded-md bg-neutral-600 flex items-center justify-center">
                        <span className="text-xs">{result.timeEmoji}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-medium text-neutral-900 dark:text-neutral-100">{result.greeting}</span>
                        <span className="text-neutral-400">•</span>
                        <span className="text-neutral-500 dark:text-neutral-400">{result.dayOfWeek}</span>
                      </div>
                      <div className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                        {result.professionalMessage}
                      </div>
                      {result.helpfulTip && (
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">{result.helpfulTip}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // Add more cases for other tool types as needed
          default:
            return null;
        }
      },
      [annotations],
    );

    return (
      <>
        {toolInvocations.map((toolInvocation: ToolInvocation, toolIndex: number) => (
          <div key={`tool-${toolIndex}`}>{renderToolInvocation(toolInvocation, toolIndex)}</div>
        ))}
      </>
    );
  },
  (prevProps, nextProps) => {
    return prevProps.toolInvocations === nextProps.toolInvocations && prevProps.annotations === nextProps.annotations;
  },
);

ToolInvocationListView.displayName = 'ToolInvocationListView';

export default ToolInvocationListView; 