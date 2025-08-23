import { tool } from 'ai';
import { z } from 'zod';
import Exa from 'exa-js';
import { serverEnv } from '@/env/server';

export const academicSearchTool = tool({
  description: 'Search academic papers and research.',
  parameters: z.object({
    query: z.string().describe('The search query'),
  }),
  execute: async ({ query }: { query: string }) => {
    try {
      // Check if EXA_API_KEY is available and valid
      if (!serverEnv.EXA_API_KEY || serverEnv.EXA_API_KEY.length < 10) {
        console.error('EXA_API_KEY is not properly configured for academic search');
        return [];
      }

      const exa = new Exa(serverEnv.EXA_API_KEY as string);

      let result;
      try {
        result = await exa.searchAndContents(query, {
          type: 'auto',
          numResults: 20,
          category: 'research paper',
          summary: {
            query: 'Abstract of the Paper',
          },
        });
      } catch (exaError: any) {
        console.error('Exa academic search error for query "' + query + '":', exaError);
        return [];
      }

      const processedResults = result.results.reduce<typeof result.results>((acc, paper) => {
        if (acc.some((p) => p.url === paper.url) || !paper.summary) return acc;

        const cleanSummary = paper.summary.replace(/^Summary:\s*/i, '');
        const cleanTitle = paper.title?.replace(/\s\[.*?\]$/, '');

        acc.push({
          ...paper,
          title: cleanTitle || '',
          summary: cleanSummary,
        });

        return acc;
      }, []);

      return {
        results: processedResults,
      };
    } catch (error) {
      console.error('Academic search error:', error);
      throw error;
    }
  },
});
