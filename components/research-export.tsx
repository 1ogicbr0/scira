'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Download, FileText, File } from 'lucide-react';
import { toast } from 'sonner';

// Dynamic imports to handle client-side only libraries
const exportToPDF = async (data: any) => {
  const { exportToPDF: exportFunc } = await import('@/lib/export-utils');
  return exportFunc(data);
};

const exportToWord = async (data: any) => {
  const { exportToWord: exportFunc } = await import('@/lib/export-utils');
  return exportFunc(data);
};

const extractResearchData = async (message: any, userQuery?: string) => {
  const { extractResearchData: extractFunc } = await import('@/lib/export-utils');
  return extractFunc(message, userQuery);
};

interface ResearchExportProps {
  message: any;
  userQuery?: string;
  isProUser?: boolean;
}

export const ResearchExport: React.FC<ResearchExportProps> = ({ message, userQuery, isProUser = false }) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: 'pdf' | 'word') => {
    try {
      setIsExporting(true);
      
      // Extract research data from the message
      const researchData = await extractResearchData(message, userQuery);
      
      if (!researchData) {
        toast.error('No research content found to export');
        return;
      }

      // Export based on format
      if (format === 'pdf') {
        await exportToPDF(researchData);
        toast.success('Research report exported as PDF');
      } else if (format === 'word') {
        await exportToWord(researchData);
        toast.success('Research report exported as Word document');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Failed to export research report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Check if the message has research content
  const hasResearchContent = React.useMemo(() => {
    if (!message.parts) return false;
    
    const toolInvocationParts = message.parts.filter((part: any) => part.type === 'tool-invocation');
    return toolInvocationParts.some((part: any) => {
      const toolInvocation = part.toolInvocation;
      if (toolInvocation?.state === 'result' && toolInvocation.result) {
        return (
          (toolInvocation.toolName === 'extreme_search' && toolInvocation.result.research?.sources) ||
          (toolInvocation.toolName === 'multi_search' && toolInvocation.result.searches) ||
          (toolInvocation.toolName === 'web_search' && toolInvocation.result.results)
        );
      }
      return false;
    });
  }, [message.parts]);

  if (!hasResearchContent || !isProUser) {
    return null;
  }

  return (
    <div className="fixed right-4 top-1/2 transform -translate-y-1/2 translate-y-16 z-30">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            disabled={isExporting}
            className="h-10 w-10 rounded-full bg-background/95 dark:bg-background/95 border border-border dark:border-border shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
            title="Export research report"
          >
            {isExporting ? (
              <div className="h-5 w-5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="h-5 w-5 text-muted-foreground dark:text-muted-foreground" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem 
            onClick={() => handleExport('pdf')}
            disabled={isExporting}
            className="cursor-pointer"
          >
            <FileText className="mr-2 h-4 w-4" />
            Export as PDF
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleExport('word')}
            disabled={isExporting}
            className="cursor-pointer"
          >
            <File className="mr-2 h-4 w-4" />
            Export as Word
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default ResearchExport; 