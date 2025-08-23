import { tool } from 'ai';
import { z } from 'zod';
import { serverEnv } from '@/env/server';

export const codeInterpreterTool = tool({
  description: 'Write and execute Python code.',
  parameters: z.object({
    title: z.string().describe('The title of the code snippet.'),
    code: z
      .string()
      .describe(
        'The Python code to execute. put the variables in the end of the code to print them. do not use the print function.',
      ),
    icon: z.enum(['stock', 'date', 'calculation', 'default']).describe('The icon to display for the code snippet.'),
  }),
  execute: async ({ code, title, icon }: { code: string; title: string; icon: string }) => {
    console.log('Code:', code);
    console.log('Title:', title);
    console.log('Icon:', icon);

    try {
      // Use Groq to analyze and explain the code
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serverEnv.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.1-70b-versatile',
          messages: [
            {
              role: 'system',
              content: 'You are a Python code interpreter. Analyze the given Python code and provide:\n1. A clear explanation of what the code does\n2. Expected output or results\n3. Any potential issues or improvements\n4. If the code creates charts/visualizations, describe what they would show\n\nFormat your response in a clear, structured way. If the code has syntax errors, point them out. If it would produce specific output, show what that output would be.'
            },
            {
              role: 'user',
              content: `Analyze this Python code:\n\n\`\`\`python\n${code}\n\`\`\``
            }
          ],
          temperature: 0.1,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const analysis = result.choices?.[0]?.message?.content || 'Code analysis completed.';

      // Simulate execution result based on code type
      let simulatedResult = '';
      const lowerCode = code.toLowerCase();
      
      if (lowerCode.includes('print(') || lowerCode.includes('print ')) {
        simulatedResult = '\n🔍 **Simulated Output:**\n*(This code would print results when executed)*';
      } else if (lowerCode.includes('matplotlib') || lowerCode.includes('plt.')) {
        simulatedResult = '\n📊 **Chart Output:**\n*(This code would generate a visualization)*';
      } else if (lowerCode.includes('pandas') || lowerCode.includes('df')) {
        simulatedResult = '\n📋 **Data Output:**\n*(This code would process/display data)*';
      } else if (lowerCode.includes('=') && !lowerCode.includes('==')) {
        simulatedResult = '\n💾 **Variable Assignment:**\n*(This code would store values in variables)*';
      }

      const message = `🤖 **Code Analysis:**\n\n${analysis}${simulatedResult}\n\n\`\`\`python\n${code}\n\`\`\``;

      return {
        title,
        code,
        icon,
        message: message.trim(),
        analysis: analysis,
        simulatedExecution: true,
        charts: [],
      };

    } catch (error) {
      console.error('Groq code analysis error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        title,
        code,
        icon,
        message: `🤖 **Code Analysis:**\n\nHere's the Python code that was provided:\n\n\`\`\`python\n${code}\n\`\`\`\n\n⚠️ *Analysis service temporarily unavailable: ${errorMessage}*\n\n💡 **Quick Review:**\n- This appears to be Python code\n- Code syntax should be verified before execution\n- Consider testing in a local Python environment`,
        error: errorMessage,
        charts: [],
      };
    }
  },
});
