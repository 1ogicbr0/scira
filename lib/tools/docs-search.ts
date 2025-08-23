import { tool } from 'ai';
import { z } from 'zod';
import Exa from 'exa-js';
import { serverEnv } from '@/env/server';
import { DataStreamWriter } from 'ai';

const exa = new Exa(serverEnv.EXA_API_KEY);

export const docsSearchTool = (dataStream: DataStreamWriter) =>
  tool({
    description: 'Search official documentation sites like MDN, React docs, Node.js docs, and other authoritative technical references.',
    parameters: z.object({
      query: z.string().describe('The technical topic, API, method, or concept to search for in official documentation'),
    }),
    execute: async ({ query }: { query: string }) => {
      try {
        dataStream.writeData({
          type: 'action',
          content: `📚 Searching official documentation for: "${query}"`,
        });

        // Search official documentation sites
        const docDomains = [
          'developer.mozilla.org',
          'reactjs.org',
          'react.dev',
          'nodejs.org',
          'docs.python.org',
          'docs.microsoft.com',
          'developers.google.com',
          'docs.aws.amazon.com',
          'kubernetes.io',
          'docker.com',
          'vuejs.org',
          'angular.io',
          'nextjs.org',
          'svelte.dev',
          'tailwindcss.com',
          'typescriptlang.org',
          'expressjs.com',
          'fastapi.tiangolo.com',
          'flask.palletsprojects.com',
          'django-project.com',
          'rubyonrails.org',
          'laravel.com',
          'spring.io',
          'docs.oracle.com',
          'go.dev',
          'rust-lang.org',
          'kotlinlang.org',
          'swift.org',
          'flutter.dev'
        ];

        const searchQuery = `(${docDomains.map(domain => `site:${domain}`).join(' OR ')}) ${query}`;

        const searchResults = await exa.searchAndContents(searchQuery, {
          numResults: 25,
          includeDomains: docDomains,
          useAutoprompt: true,
          type: 'auto',
          text: {
            maxCharacters: 3500,
            includeHtmlTags: false,
          },
        });

        if (!searchResults.results || searchResults.results.length === 0) {
          dataStream.writeData({
            type: 'result',
            content: 'No official documentation found for the given query.',
          });
          return {
            results: [],
            query,
            totalResults: 0,
          };
        }

        // Process and format documentation results
        const formattedResults = searchResults.results.map((result: any, index: number) => {
          const url = result.url;
          
          // Determine documentation source
          let docSource = 'Other';
          let framework = '';
          
          if (url.includes('developer.mozilla.org')) { docSource = 'MDN'; framework = 'Web APIs'; }
          else if (url.includes('reactjs.org') || url.includes('react.dev')) { docSource = 'React Docs'; framework = 'React'; }
          else if (url.includes('nodejs.org')) { docSource = 'Node.js Docs'; framework = 'Node.js'; }
          else if (url.includes('docs.python.org')) { docSource = 'Python Docs'; framework = 'Python'; }
          else if (url.includes('docs.microsoft.com')) { docSource = 'Microsoft Docs'; framework = 'Microsoft'; }
          else if (url.includes('developers.google.com')) { docSource = 'Google Developers'; framework = 'Google'; }
          else if (url.includes('docs.aws.amazon.com')) { docSource = 'AWS Docs'; framework = 'AWS'; }
          else if (url.includes('kubernetes.io')) { docSource = 'Kubernetes Docs'; framework = 'Kubernetes'; }
          else if (url.includes('docker.com')) { docSource = 'Docker Docs'; framework = 'Docker'; }
          else if (url.includes('vuejs.org')) { docSource = 'Vue.js Docs'; framework = 'Vue.js'; }
          else if (url.includes('angular.io')) { docSource = 'Angular Docs'; framework = 'Angular'; }
          else if (url.includes('nextjs.org')) { docSource = 'Next.js Docs'; framework = 'Next.js'; }
          else if (url.includes('svelte.dev')) { docSource = 'Svelte Docs'; framework = 'Svelte'; }
          else if (url.includes('tailwindcss.com')) { docSource = 'Tailwind CSS Docs'; framework = 'Tailwind CSS'; }
          else if (url.includes('typescriptlang.org')) { docSource = 'TypeScript Docs'; framework = 'TypeScript'; }
          else if (url.includes('expressjs.com')) { docSource = 'Express.js Docs'; framework = 'Express.js'; }

          const content = result.text || '';
          
          // Determine content type
          let contentType = 'reference';
          if (content.includes('tutorial') || result.title.toLowerCase().includes('tutorial')) contentType = 'tutorial';
          else if (content.includes('guide') || result.title.toLowerCase().includes('guide')) contentType = 'guide';
          else if (content.includes('example') || result.title.toLowerCase().includes('example')) contentType = 'example';
          else if (content.includes('api') || result.title.toLowerCase().includes('api')) contentType = 'api';
          else if (content.includes('getting started') || result.title.toLowerCase().includes('getting started')) contentType = 'getting_started';

          // Extract code examples
          const codeBlocks = content.match(/```[\s\S]*?```|`[^`]+`/g) || [];
          
          // Extract version information
          const versionMatch = content.match(/(?:version|v)[\s:]*([\d.]+)/i);
          const version = versionMatch ? versionMatch[1] : null;

          // Extract method/function signatures
          const functionMatches = content.match(/(?:function|method|class)\s+(\w+)/gi) || [];
          const functions = functionMatches.slice(0, 3); // Limit to first 3

          return {
            rank: index + 1,
            title: result.title,
            url: result.url,
            docSource,
            framework,
            contentType,
            version,
            functions,
            codeBlocksCount: codeBlocks.length,
            preview: content.substring(0, 450) + (content.length > 450 ? '...' : ''),
            content,
            publishedDate: result.publishedDate || null,
            author: result.author || docSource,
          };
        });

        // Group by documentation source
        const sources = [...new Set(formattedResults.map(r => r.docSource))];
        const groupedBySource = sources.reduce((acc: any, source) => {
          acc[source] = formattedResults.filter(r => r.docSource === source);
          return acc;
        }, {});

        // Group by content type
        const contentTypes = [...new Set(formattedResults.map(r => r.contentType))];
        const groupedByType = contentTypes.reduce((acc: any, type) => {
          acc[type] = formattedResults.filter(r => r.contentType === type);
          return acc;
        }, {});

        dataStream.writeData({
          type: 'result',
          content: `Found ${formattedResults.length} official documentation results`,
        });

        // Stream results for immediate display
        dataStream.writeData({
          type: 'docs-results',
          content: JSON.stringify({
            results: formattedResults,
            groupedBySource,
            groupedByType,
            sources,
            contentTypes,
            searchQuery: query,
            totalResults: formattedResults.length,
          }),
        });

        return {
          results: formattedResults,
          groupedBySource,
          groupedByType,
          sources,
          contentTypes,
          query,
          totalResults: formattedResults.length,
          summary: `Found ${formattedResults.length} official documentation results for "${query}" across ${sources.length} authoritative sources. Results include ${groupedByType.api?.length || 0} API references, ${groupedByType.tutorial?.length || 0} tutorials, and ${groupedByType.guide?.length || 0} guides.`,
        };

      } catch (error) {
        console.error('Documentation search error:', error);
        
        dataStream.writeData({
          type: 'error',
          content: `Error searching documentation: ${error instanceof Error ? error.message : 'Unknown error'}`,
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