import { tool } from 'ai';
import { z } from 'zod';
import Exa from 'exa-js';
import { serverEnv } from '@/env/server';
import { DataStreamWriter } from 'ai';

const exa = new Exa(serverEnv.EXA_API_KEY);

export const npmSearchTool = (dataStream: DataStreamWriter) =>
  tool({
    description: 'Search npm packages, libraries, and dependencies for JavaScript/Node.js development with detailed package information.',
    parameters: z.object({
      query: z.string().describe('The npm package, library, or functionality to search for'),
    }),
    execute: async ({ query }: { query: string }) => {
      try {
        dataStream.writeData({
          type: 'action',
          content: `📦 Searching npm packages for: "${query}"`,
        });

        // Search npm specifically
        const searchResults = await exa.searchAndContents(`site:npmjs.com ${query}`, {
          numResults: 15,
          includeDomains: ['npmjs.com'],
          useAutoprompt: true,
          type: 'auto',
          text: {
            maxCharacters: 2000,
            includeHtmlTags: false,
          },
        });

        if (!searchResults.results || searchResults.results.length === 0) {
          dataStream.writeData({
            type: 'result',
            content: 'No npm packages found for the given query.',
          });
          return {
            results: [],
            query,
            totalResults: 0,
          };
        }

        // Process and format npm results
        const formattedResults = searchResults.results.map((result: any, index: number) => {
          const url = result.url;
          
          // Extract package name from URL
          const packageMatch = url.match(/npmjs\.com\/package\/([^/?]+)/);
          const packageName = packageMatch ? packageMatch[1] : null;
          
          const content = result.text || '';
          
          // Extract version information
          const versionMatch = content.match(/(\d+\.\d+\.\d+(?:-[\w.]+)?)/);
          const version = versionMatch ? versionMatch[1] : null;

          // Extract download stats
          const downloadsMatch = content.match(/([\d,]+)\s*(?:weekly|daily)\s*download/i);
          const downloads = downloadsMatch ? downloadsMatch[1] : null;

          // Extract size information
          const sizeMatch = content.match(/(\d+(?:\.\d+)?\s*(?:KB|MB|B))/i);
          const size = sizeMatch ? sizeMatch[1] : null;

          // Extract dependencies count
          const depsMatch = content.match(/(\d+)\s*dependenc/i);
          const dependenciesCount = depsMatch ? depsMatch[1] : null;

          // Extract license
          const licenseMatch = content.match(/(MIT|Apache|GPL|BSD|ISC|MPL)[\s-]*(?:License)?/i);
          const license = licenseMatch ? licenseMatch[1] : null;

          // Extract keywords/tags
          const keywords: string[] = [];
          const commonKeywords = ['react', 'vue', 'angular', 'node', 'express', 'typescript', 'babel', 'webpack', 'rollup', 'vite', 'jest', 'testing', 'ui', 'component', 'utility', 'framework', 'library'];
          
          commonKeywords.forEach(keyword => {
            if (content.toLowerCase().includes(keyword) || (result.title || '').toLowerCase().includes(keyword)) {
              keywords.push(keyword);
            }
          });

          // Determine package category
          let category = 'Library';
          if (keywords.includes('react') || content.includes('React')) category = 'React';
          else if (keywords.includes('vue')) category = 'Vue';
          else if (keywords.includes('angular')) category = 'Angular';
          else if (keywords.includes('node') || keywords.includes('express')) category = 'Node.js';
          else if (keywords.includes('testing') || keywords.includes('jest')) category = 'Testing';
          else if (keywords.includes('typescript') || keywords.includes('babel')) category = 'Build Tools';
          else if (keywords.includes('ui') || keywords.includes('component')) category = 'UI Components';

          return {
            rank: index + 1,
            title: result.title,
            url: result.url,
            packageName,
            version,
            downloads,
            size,
            dependenciesCount,
            license,
            category,
            keywords: [...new Set(keywords)],
            preview: content.substring(0, 300) + (content.length > 300 ? '...' : ''),
            content,
            publishedDate: result.publishedDate || null,
            author: result.author || 'npm',
          };
        });

        // Group by category
        const categories = [...new Set(formattedResults.map(r => r.category))];
        const groupedByCategory = categories.reduce((acc: any, category) => {
          acc[category] = formattedResults.filter(r => r.category === category);
          return acc;
        }, {});

        dataStream.writeData({
          type: 'result',
          content: `Found ${formattedResults.length} npm packages`,
        });

        // Stream results for immediate display
        dataStream.writeData({
          type: 'npm-results',
          content: JSON.stringify({
            results: formattedResults,
            groupedByCategory,
            categories,
            searchQuery: query,
            totalResults: formattedResults.length,
          }),
        });

        return {
          results: formattedResults,
          groupedByCategory,
          categories,
          query,
          totalResults: formattedResults.length,
          summary: `Found ${formattedResults.length} npm packages for "${query}". Results span ${categories.length} categories including popular libraries, frameworks, and development tools.`,
        };

      } catch (error) {
        console.error('npm search error:', error);
        
        dataStream.writeData({
          type: 'error',
          content: `Error searching npm: ${error instanceof Error ? error.message : 'Unknown error'}`,
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