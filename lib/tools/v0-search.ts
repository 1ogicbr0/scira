import { tool } from 'ai';
import { z } from 'zod';
import Exa from 'exa-js';
import { serverEnv } from '@/env/server';
import { DataStreamWriter } from 'ai';

const exa = new Exa(serverEnv.EXA_API_KEY);

export const v0SearchTool = (dataStream: DataStreamWriter) =>
  tool({
    description: 'Search v0.dev for AI-generated UI components, React code examples, and modern web development patterns.',
    parameters: z.object({
      query: z.string().describe('The UI component, design pattern, or React feature to search for on v0.dev'),
    }),
    execute: async ({ query }: { query: string }) => {
      try {
        dataStream.writeData({
          type: 'action',
          content: `🎨 Searching v0.dev for: "${query}"`,
        });

        // Search v0.dev specifically
        const searchResults = await exa.searchAndContents(`site:v0.dev ${query}`, {
          numResults: 15,
          includeDomains: ['v0.dev'],
          useAutoprompt: true,
          type: 'auto',
          text: {
            maxCharacters: 3000,
            includeHtmlTags: false,
          },
        });

        if (!searchResults.results || searchResults.results.length === 0) {
          dataStream.writeData({
            type: 'result',
            content: 'No v0.dev results found for the given query.',
          });
          return {
            results: [],
            query,
            totalResults: 0,
          };
        }

        // Process and format v0 results
        const formattedResults = searchResults.results.map((result: any, index: number) => {
          // Extract v0 chat/component ID from URL
          const componentIdMatch = result.url.match(/v0\.dev\/chat\/([^/?]+)/);
          const componentId = componentIdMatch ? componentIdMatch[1] : null;

          // Extract component type and framework info
          const content = result.text || '';
          
          // Detect framework/library mentions
          const frameworks = [];
          if (content.includes('React') || content.includes('react')) frameworks.push('React');
          if (content.includes('Next.js') || content.includes('nextjs')) frameworks.push('Next.js');
          if (content.includes('TypeScript') || content.includes('typescript')) frameworks.push('TypeScript');
          if (content.includes('Tailwind') || content.includes('tailwind')) frameworks.push('Tailwind CSS');
          if (content.includes('shadcn') || content.includes('ui')) frameworks.push('shadcn/ui');

          // Extract code blocks
          const codeBlocks = content.match(/```[\s\S]*?```/g) || [];
          
          // Determine component type
          let componentType = 'Component';
          if (content.includes('form') || content.includes('Form')) componentType = 'Form';
          else if (content.includes('button') || content.includes('Button')) componentType = 'Button';
          else if (content.includes('card') || content.includes('Card')) componentType = 'Card';
          else if (content.includes('modal') || content.includes('Modal')) componentType = 'Modal';
          else if (content.includes('table') || content.includes('Table')) componentType = 'Table';
          else if (content.includes('chart') || content.includes('Chart')) componentType = 'Chart';
          else if (content.includes('navigation') || content.includes('nav')) componentType = 'Navigation';

          return {
            rank: index + 1,
            title: result.title,
            url: result.url,
            componentId,
            componentType,
            frameworks,
            preview: content.substring(0, 400) + (content.length > 400 ? '...' : ''),
            content,
            codeBlocksCount: codeBlocks.length,
            publishedDate: result.publishedDate || null,
            author: result.author || 'v0.dev',
          };
        });

        dataStream.writeData({
          type: 'result',
          content: `Found ${formattedResults.length} v0.dev components and examples`,
        });

        // Stream results for immediate display
        dataStream.writeData({
          type: 'v0-results',
          content: JSON.stringify({
            results: formattedResults,
            searchQuery: query,
            totalResults: formattedResults.length,
          }),
        });

        return {
          results: formattedResults,
          query,
          totalResults: formattedResults.length,
          summary: `Found ${formattedResults.length} v0.dev components and examples for "${query}". Results include modern React components, UI patterns, and AI-generated code examples.`,
        };

      } catch (error) {
        console.error('v0.dev search error:', error);
        
        dataStream.writeData({
          type: 'error',
          content: `Error searching v0.dev: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });

        return {
          results: [],
          query,
          totalResults: 0,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    },
  }); 