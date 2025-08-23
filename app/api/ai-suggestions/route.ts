import { NextRequest, NextResponse } from 'next/server';

interface CommandSuggestion {
  command: string;
  description: string;
  type: 'ai' | 'history' | 'smart';
}

// Smart command suggestions based on common development tasks
const SMART_SUGGESTIONS: Record<string, CommandSuggestion[]> = {
  // Build and development
  'build': [
    { command: 'npm run build', description: 'Build project', type: 'smart' },
    { command: 'npm run dev', description: 'Start development server', type: 'smart' },
    { command: 'yarn build', description: 'Build with Yarn', type: 'smart' },
  ],
  'create': [
    { command: 'mkdir new-project && cd new-project', description: 'Create new directory', type: 'smart' },
    { command: 'npm create next-app@latest', description: 'Create Next.js app', type: 'smart' },
    { command: 'touch README.md', description: 'Create README file', type: 'smart' },
  ],
  'deploy': [
    { command: 'vercel --prod', description: 'Deploy to Vercel', type: 'smart' },
    { command: 'npm run build && npm run start', description: 'Build and start', type: 'smart' },
    { command: 'docker build -t myapp .', description: 'Build Docker image', type: 'smart' },
  ],
  'debug': [
    { command: 'npm run lint', description: 'Run linter', type: 'smart' },
    { command: 'npm test', description: 'Run tests', type: 'smart' },
    { command: 'npm run type-check', description: 'Check types', type: 'smart' },
  ],
  'fix': [
    { command: 'npm audit fix', description: 'Fix security issues', type: 'smart' },
    { command: 'npm run lint --fix', description: 'Auto-fix lint issues', type: 'smart' },
    { command: 'git reset --hard HEAD', description: 'Reset to last commit', type: 'smart' },
  ],
  'install': [
    { command: 'npm install', description: 'Install dependencies', type: 'smart' },
    { command: 'npm install -g', description: 'Install globally', type: 'smart' },
    { command: 'npm install --save-dev', description: 'Install as dev dependency', type: 'smart' },
  ],
  'git': [
    { command: 'git add . && git commit -m "Update"', description: 'Stage and commit changes', type: 'smart' },
    { command: 'git push origin main', description: 'Push to main branch', type: 'smart' },
    { command: 'git status', description: 'Check git status', type: 'smart' },
  ],
  'list': [
    { command: 'ls -la', description: 'List all files with details', type: 'smart' },
    { command: 'ps aux', description: 'List running processes', type: 'smart' },
    { command: 'npm list', description: 'List installed packages', type: 'smart' },
  ],
  'start': [
    { command: 'npm start', description: 'Start application', type: 'smart' },
    { command: 'npm run dev', description: 'Start in development mode', type: 'smart' },
    { command: 'systemctl start', description: 'Start system service', type: 'smart' },
  ],
  'stop': [
    { command: 'npm run stop', description: 'Stop application', type: 'smart' },
    { command: 'pkill -f node', description: 'Kill Node.js processes', type: 'smart' },
    { command: 'systemctl stop', description: 'Stop system service', type: 'smart' },
  ],
  'update': [
    { command: 'npm update', description: 'Update packages', type: 'smart' },
    { command: 'git pull origin main', description: 'Pull latest changes', type: 'smart' },
    { command: 'npm run update-deps', description: 'Update dependencies', type: 'smart' },
  ],
  'check': [
    { command: 'node --version', description: 'Check Node.js version', type: 'smart' },
    { command: 'npm --version', description: 'Check npm version', type: 'smart' },
    { command: 'git --version', description: 'Check git version', type: 'smart' },
  ],
};

// AI-powered natural language to command translation
function generateAICommands(input: string): CommandSuggestion[] {
  const lowerInput = input.toLowerCase();
  const suggestions: CommandSuggestion[] = [];

  // Natural language patterns
  if (lowerInput.includes('create') && lowerInput.includes('react')) {
    suggestions.push({
      command: 'npx create-react-app my-app',
      description: 'Create React application',
      type: 'ai'
    });
  }

  if (lowerInput.includes('install') && lowerInput.includes('package')) {
    suggestions.push({
      command: 'npm install <package-name>',
      description: 'Install npm package',
      type: 'ai'
    });
  }

  if (lowerInput.includes('build') && lowerInput.includes('project')) {
    suggestions.push({
      command: 'npm run build',
      description: 'Build the project',
      type: 'ai'
    });
  }

  if (lowerInput.includes('run') && lowerInput.includes('server')) {
    suggestions.push({
      command: 'npm run dev',
      description: 'Start development server',
      type: 'ai'
    });
  }

  if (lowerInput.includes('commit') || lowerInput.includes('save changes')) {
    suggestions.push({
      command: 'git add . && git commit -m "Your commit message"',
      description: 'Commit all changes',
      type: 'ai'
    });
  }

  if (lowerInput.includes('deploy') || lowerInput.includes('publish')) {
    suggestions.push({
      command: 'npm run build && npm run deploy',
      description: 'Build and deploy',
      type: 'ai'
    });
  }

  if (lowerInput.includes('test') || lowerInput.includes('check')) {
    suggestions.push({
      command: 'npm test',
      description: 'Run tests',
      type: 'ai'
    });
  }

  if (lowerInput.includes('fix') && lowerInput.includes('error')) {
    suggestions.push({
      command: 'npm run lint --fix',
      description: 'Auto-fix lint errors',
      type: 'ai'
    });
  }

  if (lowerInput.includes('docker')) {
    suggestions.push({
      command: 'docker build -t myapp . && docker run -p 3000:3000 myapp',
      description: 'Build and run Docker container',
      type: 'ai'
    });
  }

  if (lowerInput.includes('database') || lowerInput.includes('db')) {
    suggestions.push({
      command: 'npx prisma db push',
      description: 'Push database schema',
      type: 'ai'
    });
  }

  // Warp-style multi-step workflows
  if (lowerInput.includes('new project') || lowerInput.includes('create project')) {
    suggestions.push({
      command: 'mkdir my-project && cd my-project && npm init -y',
      description: 'Create new project structure',
      type: 'ai'
    });
  }

  if (lowerInput.includes('setup') && lowerInput.includes('environment')) {
    suggestions.push({
      command: 'npm install && npm run dev',
      description: 'Setup development environment',
      type: 'ai'
    });
  }

  if (lowerInput.includes('clean') || lowerInput.includes('reset')) {
    suggestions.push({
      command: 'rm -rf node_modules package-lock.json && npm install',
      description: 'Clean install dependencies',
      type: 'ai'
    });
  }

  if (lowerInput.includes('check') && lowerInput.includes('status')) {
    suggestions.push({
      command: 'git status && npm run lint && npm test',
      description: 'Check project status',
      type: 'ai'
    });
  }

  if (lowerInput.includes('optimize') || lowerInput.includes('performance')) {
    suggestions.push({
      command: 'npm run build && npm run analyze',
      description: 'Optimize and analyze build',
      type: 'ai'
    });
  }

  return suggestions;
}

export async function POST(request: NextRequest) {
  try {
    const { input, context } = await request.json();

    if (!input || typeof input !== 'string') {
      return NextResponse.json(
        { error: 'Input is required' },
        { status: 400 }
      );
    }

    const suggestions: CommandSuggestion[] = [];

    // Check for exact keyword matches first
    const words = input.toLowerCase().split(' ');
    for (const word of words) {
      if (SMART_SUGGESTIONS[word]) {
        suggestions.push(...SMART_SUGGESTIONS[word]);
      }
    }

    // Generate AI-powered suggestions
    const aiSuggestions = generateAICommands(input);
    suggestions.push(...aiSuggestions);

    // Remove duplicates and limit results
    const uniqueSuggestions = suggestions.reduce((acc, current) => {
      const existing = acc.find(item => item.command === current.command);
      if (!existing) {
        acc.push(current);
      }
      return acc;
    }, [] as CommandSuggestion[]);

    // Prioritize AI suggestions, then smart suggestions
    const sortedSuggestions = uniqueSuggestions.sort((a, b) => {
      const typeOrder = { ai: 0, smart: 1, history: 2 };
      return typeOrder[a.type] - typeOrder[b.type];
    });

    return NextResponse.json({
      suggestions: sortedSuggestions.slice(0, 5), // Limit to 5 suggestions
      context,
    });
  } catch (error) {
    console.error('AI suggestions API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 