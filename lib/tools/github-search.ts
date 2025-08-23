import { tool } from 'ai';
import { z } from 'zod';
import Exa from 'exa-js';
import { serverEnv } from '@/env/server';
import { DataStreamWriter } from 'ai';

const exa = new Exa(serverEnv.EXA_API_KEY);

export const githubSearchTool = (dataStream: DataStreamWriter) =>
  tool({
    description: 'Search GitHub for repositories, code examples, issues, and open source projects related to development topics.',
    parameters: z.object({
      query: z.string().describe('The technology, library, framework, or coding problem to search for on GitHub'),
    }),
    execute: async ({ query }: { query: string }) => {
      try {
        dataStream.writeData({
          type: 'action',
          content: `🐙 Searching GitHub for: "${query}"`,
        });

        // Search GitHub specifically
        const searchResults = await exa.searchAndContents(`site:github.com ${query}`, {
          numResults: 20,
          includeDomains: ['github.com'],
          useAutoprompt: true,
          type: 'auto',
          text: {
            maxCharacters: 2500,
            includeHtmlTags: false,
          },
        });

        if (!searchResults.results || searchResults.results.length === 0) {
          dataStream.writeData({
            type: 'result',
            content: 'No GitHub results found for the given query.',
          });
          return {
            results: [],
            query,
            totalResults: 0,
          };
        }

        // Process and format GitHub results
        const formattedResults = searchResults.results.map((result: any, index: number) => {
          const url = result.url;
          
          // Extract repository information
          const repoMatch = url.match(/github\.com\/([^/]+)\/([^/]+)/);
          const owner = repoMatch ? repoMatch[1] : null;
          const repoName = repoMatch ? repoMatch[2] : null;
          
          // Determine content type
          let contentType = 'repository';
          if (url.includes('/issues/')) contentType = 'issue';
          else if (url.includes('/pull/')) contentType = 'pull_request';
          else if (url.includes('/blob/')) contentType = 'code_file';
          else if (url.includes('/tree/')) contentType = 'directory';
          else if (url.includes('/wiki/')) contentType = 'wiki';
          else if (url.includes('/releases/')) contentType = 'release';

          const content = result.text || '';
          
          // Extract programming languages and technologies
          const languages = [];
          const techKeywords = ['JavaScript', 'TypeScript', 'Python', 'React', 'Vue', 'Angular', 'Node.js', 'Express', 'Next.js', 'Svelte', 'Go', 'Rust', 'Java', 'C++', 'PHP', 'Ruby', 'Swift', 'Kotlin', 'Flutter', 'Django', 'Flask', 'Rails'];
          
          techKeywords.forEach(tech => {
            if (content.toLowerCase().includes(tech.toLowerCase()) || result.title.toLowerCase().includes(tech.toLowerCase())) {
              languages.push(tech);
            }
          });

          // Extract stars/popularity indicators from content
          const starsMatch = content.match(/(\d+(?:,\d+)*)\s*star/i);
          const stars = starsMatch ? starsMatch[1] : null;

          // Extract license information
          const licenseMatch = content.match(/(MIT|Apache|GPL|BSD|ISC|MPL)[\s-]*(?:License)?/i);
          const license = licenseMatch ? licenseMatch[1] : null;

          return {
            rank: index + 1,
            title: result.title,
            url: result.url,
            owner,
            repoName,
            contentType,
            languages: [...new Set(languages)], // Remove duplicates
            stars,
            license,
            preview: content.substring(0, 350) + (content.length > 350 ? '...' : ''),
            content,
            publishedDate: result.publishedDate || null,
            author: result.author || owner,
          };
        });

        // Group results by type
        const groupedResults = {
          repositories: formattedResults.filter(r => r.contentType === 'repository'),
          codeFiles: formattedResults.filter(r => r.contentType === 'code_file'),
          issues: formattedResults.filter(r => r.contentType === 'issue'),
          pullRequests: formattedResults.filter(r => r.contentType === 'pull_request'),
          other: formattedResults.filter(r => !['repository', 'code_file', 'issue', 'pull_request'].includes(r.contentType)),
        };

        dataStream.writeData({
          type: 'result',
          content: `Found ${formattedResults.length} GitHub results`,
        });

        // Stream results for immediate display
        dataStream.writeData({
          type: 'github-results',
          content: JSON.stringify({
            results: formattedResults,
            groupedResults,
            searchQuery: query,
            totalResults: formattedResults.length,
          }),
        });

        return {
          results: formattedResults,
          groupedResults,
          query,
          totalResults: formattedResults.length,
          summary: `Found ${formattedResults.length} GitHub results for "${query}". Results include ${groupedResults.repositories.length} repositories, ${groupedResults.codeFiles.length} code files, ${groupedResults.issues.length} issues, and ${groupedResults.pullRequests.length} pull requests.`,
        };

      } catch (error) {
        console.error('GitHub search error:', error);
        
        dataStream.writeData({
          type: 'error',
          content: `Error searching GitHub: ${error instanceof Error ? error.message : 'Unknown error'}`,
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