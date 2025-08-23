import { tool } from 'ai';
import { z } from 'zod';
import Exa from 'exa-js';
import { serverEnv } from '@/env/server';
import { DataStreamWriter } from 'ai';

const exa = new Exa(serverEnv.EXA_API_KEY);

export const devCommunitySearchTool = (dataStream: DataStreamWriter) =>
  tool({
    description: 'Search developer communities like Dev.to, Reddit programming subreddits, and other developer forums for discussions, tutorials, and insights.',
    parameters: z.object({
      query: z.string().describe('The programming topic, technology, or development question to search across developer communities'),
    }),
    execute: async ({ query }: { query: string }) => {
      try {
        dataStream.writeData({
          type: 'action',
          content: `👥 Searching developer communities for: "${query}"`,
        });

        // Search multiple developer community sites
        const communityDomains = ['dev.to', 'reddit.com', 'hashnode.com', 'medium.com'];
        const searchQuery = `(${communityDomains.map(domain => `site:${domain}`).join(' OR ')}) ${query}`;

        const searchResults = await exa.searchAndContents(searchQuery, {
          numResults: 20,
          includeDomains: communityDomains,
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
            content: 'No developer community results found for the given query.',
          });
          return {
            results: [],
            query,
            totalResults: 0,
          };
        }

        // Process and format community results
        const formattedResults = searchResults.results.map((result: any, index: number) => {
          const url = result.url;
          
          // Determine platform
          let platform = 'Other';
          if (url.includes('dev.to')) platform = 'Dev.to';
          else if (url.includes('reddit.com')) platform = 'Reddit';
          else if (url.includes('hashnode.com')) platform = 'Hashnode';
          else if (url.includes('medium.com')) platform = 'Medium';

          // Extract subreddit for Reddit posts
          let subreddit = null;
          if (platform === 'Reddit') {
            const subredditMatch = url.match(/reddit\.com\/r\/([^/]+)/);
            subreddit = subredditMatch ? subredditMatch[1] : null;
          }

          const content = result.text || '';
          
          // Determine content type
          let contentType = 'article';
          if (platform === 'Reddit') {
            if (url.includes('/comments/')) contentType = 'discussion';
            else contentType = 'post';
          } else if (content.includes('tutorial') || result.title.toLowerCase().includes('tutorial')) {
            contentType = 'tutorial';
          } else if (content.includes('guide') || result.title.toLowerCase().includes('guide')) {
            contentType = 'guide';
          } else if (content.includes('tips') || result.title.toLowerCase().includes('tips')) {
            contentType = 'tips';
          }

          // Extract programming languages and technologies
          const technologies = [];
          const techKeywords = ['JavaScript', 'TypeScript', 'Python', 'React', 'Vue', 'Angular', 'Node.js', 'Express', 'Next.js', 'Svelte', 'Go', 'Rust', 'Java', 'C++', 'PHP', 'Ruby', 'Swift', 'Kotlin', 'Flutter', 'Django', 'Flask', 'Rails', 'AWS', 'Docker', 'Kubernetes'];
          
          techKeywords.forEach(tech => {
            if (content.toLowerCase().includes(tech.toLowerCase()) || result.title.toLowerCase().includes(tech.toLowerCase())) {
              technologies.push(tech);
            }
          });

          // Extract engagement metrics from content
          const upvotesMatch = content.match(/(\d+)\s*(?:upvote|like|👍)/i);
          const upvotes = upvotesMatch ? upvotesMatch[1] : null;

          const commentsMatch = content.match(/(\d+)\s*comment/i);
          const commentsCount = commentsMatch ? commentsMatch[1] : null;

          // Extract author info
          let author = result.author;
          if (platform === 'Reddit') {
            const authorMatch = content.match(/u\/([^\s]+)/);
            author = authorMatch ? authorMatch[1] : author;
          }

          return {
            rank: index + 1,
            title: result.title,
            url: result.url,
            platform,
            subreddit,
            contentType,
            technologies: [...new Set(technologies)],
            author,
            upvotes,
            commentsCount,
            preview: content.substring(0, 400) + (content.length > 400 ? '...' : ''),
            content,
            publishedDate: result.publishedDate || null,
          };
        });

        // Group by platform
        const platforms = [...new Set(formattedResults.map(r => r.platform))];
        const groupedByPlatform = platforms.reduce((acc: any, platform) => {
          acc[platform] = formattedResults.filter(r => r.platform === platform);
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
          content: `Found ${formattedResults.length} developer community posts`,
        });

        // Stream results for immediate display
        dataStream.writeData({
          type: 'dev-community-results',
          content: JSON.stringify({
            results: formattedResults,
            groupedByPlatform,
            groupedByType,
            platforms,
            contentTypes,
            searchQuery: query,
            totalResults: formattedResults.length,
          }),
        });

        return {
          results: formattedResults,
          groupedByPlatform,
          groupedByType,
          platforms,
          contentTypes,
          query,
          totalResults: formattedResults.length,
          summary: `Found ${formattedResults.length} developer community discussions for "${query}" across ${platforms.length} platforms. Results include ${groupedByType.tutorial?.length || 0} tutorials, ${groupedByType.discussion?.length || 0} discussions, and ${groupedByType.article?.length || 0} articles.`,
        };

      } catch (error) {
        console.error('Developer community search error:', error);
        
        dataStream.writeData({
          type: 'error',
          content: `Error searching developer communities: ${error instanceof Error ? error.message : 'Unknown error'}`,
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