import { tool } from 'ai';
import { z } from 'zod';
import Exa from 'exa-js';
import { serverEnv } from '@/env/server';
import { DataStreamWriter } from 'ai';

const exa = new Exa(serverEnv.EXA_API_KEY);

export const stackOverflowSearchTool = (dataStream: DataStreamWriter) =>
  tool({
    description: 'Search Stack Overflow for programming solutions, code examples, and developer Q&A with detailed answers and code snippets.',
    parameters: z.object({
      query: z.string().describe('The programming question, error message, or technical topic to search for on Stack Overflow'),
    }),
    execute: async ({ query }: { query: string }) => {
      // Set default values for optional parameters
      const language: string | undefined = undefined;
      const tags: string[] = [];
      const maxResults = 10;
      const includeAnswers = true;
      try {
        dataStream.writeData({
          type: 'action',
          content: `🔍 Searching Stack Overflow for: "${query}"${language ? ` (${language})` : ''}`,
        });

        // Build Stack Overflow specific search query
        let searchQuery = query;
        
        // Add site restriction to Stack Overflow
        const siteQuery = `site:stackoverflow.com ${searchQuery}`;
        
        // Add language-specific terms if provided
        if (language) {
          searchQuery = `${searchQuery} ${language}`;
        }
        
        // Add tags if provided
        if (tags && tags.length > 0) {
          const tagString = tags.map(tag => `[${tag}]`).join(' ');
          searchQuery = `${searchQuery} ${tagString}`;
        }

        // Search Stack Overflow using Exa
        const searchResults = await exa.searchAndContents(siteQuery, {
          numResults: Math.min(maxResults, 20),
          includeDomains: ['stackoverflow.com'],
          useAutoprompt: true,
          type: 'auto',
          text: {
            maxCharacters: includeAnswers ? 4000 : 2000,
            includeHtmlTags: false,
          },
        });

        if (!searchResults.results || searchResults.results.length === 0) {
          dataStream.writeData({
            type: 'result',
            content: 'No Stack Overflow results found for the given query.',
          });
          return {
            results: [],
            query: searchQuery,
            totalResults: 0,
          };
        }

        // Process and format Stack Overflow results
        const formattedResults = searchResults.results.map((result, index) => {
          // Extract question ID from URL for additional metadata
          const questionIdMatch = result.url.match(/\/questions\/(\d+)\//);
          const questionId = questionIdMatch ? questionIdMatch[1] : null;

          // Clean and format the title
          const title = result.title.replace(/^\[.*?\]\s*/, ''); // Remove leading tags
          
          // Extract key information from content
          const content = result.text || '';
          
          // Try to identify if this is a question or answer
          const isQuestion = result.url.includes('/questions/') && !result.url.includes('#');
          
          // Extract code blocks (rough heuristic)
          const codeBlocks = content.match(/```[\s\S]*?```|`[^`]+`/g) || [];
          
          // Extract tags from title or content
          const extractedTags = [...(result.title.match(/\[([^\]]+)\]/g) || [])].map(tag => 
            tag.replace(/[\[\]]/g, '')
          );

          return {
            rank: index + 1,
            title: title.trim(),
            url: result.url,
            questionId,
            type: isQuestion ? 'question' : 'answer',
            tags: extractedTags,
            preview: content.substring(0, 300) + (content.length > 300 ? '...' : ''),
            content: includeAnswers ? content : content.substring(0, 500),
            codeBlocksCount: codeBlocks.length,
            publishedDate: result.publishedDate || null,
            author: result.author || 'Unknown',
          };
        });

        // Group by question ID to organize Q&A pairs
        const questionGroups = formattedResults.reduce((acc, result) => {
          const questionId = result.questionId || result.url;
          if (!acc[questionId]) {
            acc[questionId] = {
              question: null,
              answers: [],
            };
          }
          
          if (result.type === 'question') {
            acc[questionId].question = result;
          } else {
            acc[questionId].answers.push(result);
          }
          
          return acc;
        }, {} as Record<string, { question: any; answers: any[] }>);

        dataStream.writeData({
          type: 'result',
          content: `Found ${formattedResults.length} Stack Overflow results`,
        });

        // Stream results for immediate display
        dataStream.writeData({
          type: 'stackoverflow-results',
          content: JSON.stringify({
            results: formattedResults,
            questionGroups,
            searchQuery: searchQuery,
            totalResults: formattedResults.length,
            language,
            tags,
          }),
        });

        return {
          results: formattedResults,
          questionGroups,
          query: searchQuery,
          totalResults: formattedResults.length,
          language,
          tags,
          summary: `Found ${formattedResults.length} Stack Overflow posts related to "${query}"${language ? ` in ${language}` : ''}. Results include ${Object.keys(questionGroups).length} unique questions with answers and code examples.`,
        };

      } catch (error) {
        console.error('Stack Overflow search error:', error);
        
        dataStream.writeData({
          type: 'error',
          content: `Error searching Stack Overflow: ${error instanceof Error ? error.message : 'Unknown error'}`,
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