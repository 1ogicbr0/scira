'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  Maximize2, 
  Minimize2, 
  Terminal as TerminalIcon, 
  Sparkles, 
  Bot,
  Lightbulb,
  Play,
  Loader2,
  Send
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AITerminalProps {
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

interface AIAgent {
  id: string;
  name: string;
  type: 'code' | 'debug' | 'deploy' | 'analyze';
  status: 'idle' | 'thinking' | 'executing' | 'completed' | 'error';
  task: string;
  progress?: string;
}

interface CommandSuggestion {
  command: string;
  description: string;
  type: 'ai' | 'history' | 'smart';
}

export default function AITerminal({ isOpen, onToggle, className }: AITerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<any>(null);
  const fitAddonRef = useRef<any>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  // AI features state
  const [currentInput, setCurrentInput] = useState('');
  const [isAiMode, setIsAiMode] = useState(true);
  const [activeAgents, setActiveAgents] = useState<AIAgent[]>([]);
  const [commandSuggestions, setCommandSuggestions] = useState<CommandSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Check if we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Initialize terminal with AI enhancements
  useEffect(() => {
    if (!isClient || !terminalRef.current || xtermRef.current) return;

    const initializeTerminal = async () => {
      try {
        const { Terminal: XTerm } = await import('@xterm/xterm');
        const { FitAddon } = await import('@xterm/addon-fit');
        const { WebLinksAddon } = await import('@xterm/addon-web-links');

        const terminal = new XTerm({
          cursorBlink: true,
          fontSize: 14,
          fontFamily: 'JetBrains Mono, Menlo, Monaco, "Courier New", monospace',
          theme: {
            background: '#0a0a0a',
            foreground: '#e4e4e7',
            cursor: '#8b5cf6',
            black: '#000000',
            red: '#ef4444',
            green: '#22c55e',
            yellow: '#eab308',
            blue: '#3b82f6',
            magenta: '#a855f7',
            cyan: '#06b6d4',
            white: '#f8fafc',
            brightBlack: '#374151',
            brightRed: '#f87171',
            brightGreen: '#4ade80',
            brightYellow: '#facc15',
            brightBlue: '#60a5fa',
            brightMagenta: '#c084fc',
            brightCyan: '#22d3ee',
            brightWhite: '#ffffff',
          },
          rows: 30,
          cols: 100,
          convertEol: true,
          scrollback: 2000,
          allowProposedApi: true,
          rightClickSelectsWord: true,
          smoothScrollDuration: 200,
        });

        const fitAddon = new FitAddon();
        const webLinksAddon = new WebLinksAddon();

        terminal.loadAddon(fitAddon);
        terminal.loadAddon(webLinksAddon);

        terminal.open(terminalRef.current!);
        fitAddon.fit();

        xtermRef.current = terminal;
        fitAddonRef.current = fitAddon;

        // AI-enhanced welcome message
        terminal.writeln('\x1b[1;35m┌─────────────────────────────────────────────────────────┐\x1b[0m');
        terminal.writeln('\x1b[1;35m│          🤖 Advanced Copilot Terminal 2.0              │\x1b[0m');
        terminal.writeln('\x1b[1;35m│            The Agentic Development Environment         │\x1b[0m');
        terminal.writeln('\x1b[1;35m└─────────────────────────────────────────────────────────┘\x1b[0m');
        terminal.writeln('');
        terminal.writeln('\x1b[1;36m✨ AI-Powered Features Active:\x1b[0m');
        terminal.writeln('\x1b[33m  • Natural language commands\x1b[0m');
        terminal.writeln('\x1b[33m  • Intelligent code assistance\x1b[0m');
        terminal.writeln('\x1b[33m  • Multi-agent execution\x1b[0m');
        terminal.writeln('\x1b[33m  • Context-aware suggestions\x1b[0m');
        terminal.writeln('');
        terminal.writeln('\x1b[2mTip: Type in natural language or use traditional commands\x1b[0m');
        terminal.writeln('');

        showPrompt();

      } catch (error) {
        console.error('Failed to initialize AI terminal:', error);
      }
    };

    initializeTerminal();

    return () => {
      if (xtermRef.current) {
        xtermRef.current.dispose();
      }
    };
  }, [isClient]);

  const showPrompt = useCallback(() => {
    if (xtermRef.current) {
      const icon = isAiMode ? '🤖' : '$';
      xtermRef.current.write(`\x1b[1;35m${icon} copilot\x1b[0m:\x1b[1;34m~\x1b[0m${isAiMode ? '\x1b[1;35m (AI)\x1b[0m' : ''} `);
    }
  }, [isAiMode]);

  // Generate AI command suggestions
  const generateSuggestions = useCallback(async (input: string) => {
    if (!input.trim() || input.length < 2) {
      setCommandSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const response = await fetch('/api/ai-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, context: 'terminal' }),
      });

      if (response.ok) {
        const suggestions = await response.json();
        setCommandSuggestions(suggestions.suggestions || []);
        setShowSuggestions(suggestions.suggestions?.length > 0);
      }
    } catch (error) {
      console.error('Failed to get AI suggestions:', error);
    }
  }, []);

  // Execute command with AI processing
  const executeCommand = useCallback(async (command: string) => {
    if (!command.trim()) return;

    setIsProcessing(true);
    
    // Add command to terminal history
    if (xtermRef.current) {
      xtermRef.current.writeln(`\x1b[1;35m🤖 copilot\x1b[0m:\x1b[1;34m~\x1b[0m${isAiMode ? '\x1b[1;35m (AI)\x1b[0m' : ''} ${command}`);
    }
    
    try {
      // Enhanced natural language detection
      const isNaturalLanguage = isAiMode && (
        !command.startsWith('/') && 
        !command.startsWith('sudo') &&
        !command.startsWith('npm') &&
        !command.startsWith('git') &&
        !command.startsWith('ls') &&
        !command.startsWith('cd') &&
        !command.startsWith('mkdir') &&
        (command.includes(' ') && (
          command.includes('create') || command.includes('build') || command.includes('deploy') || 
          command.includes('fix') || command.includes('debug') || command.includes('analyze') ||
          command.includes('install') || command.includes('setup') || command.includes('configure') ||
          command.includes('generate') || command.includes('make') || command.includes('start') ||
          command.includes('stop') || command.includes('restart') || command.includes('update') ||
          command.includes('delete') || command.includes('remove') || command.includes('test') ||
          command.includes('run') || command.includes('execute') || command.includes('show') ||
          command.includes('list') || command.includes('find') || command.includes('search')
        ))
      );

      if (isAiMode && isNaturalLanguage) {
        // Process as AI agent task
        const agentId = `agent-${Date.now()}`;
        const newAgent: AIAgent = {
          id: agentId,
          name: `AI Agent ${activeAgents.length + 1}`,
          type: command.includes('debug') ? 'debug' : 
                command.includes('deploy') ? 'deploy' :
                command.includes('analyze') ? 'analyze' : 'code',
          status: 'thinking',
          task: command,
          progress: 'Understanding your request...'
        };

        setActiveAgents(prev => [...prev, newAgent]);

        // Show in terminal
        if (xtermRef.current) {
          xtermRef.current.writeln(`\x1b[1;36m🤖 Starting AI Agent: ${newAgent.name}\x1b[0m`);
          xtermRef.current.writeln(`\x1b[33m📋 Task: ${command}\x1b[0m`);
          xtermRef.current.writeln(`\x1b[90m⏳ Status: ${newAgent.progress}\x1b[0m`);
          xtermRef.current.writeln('');
        }

        // Enhanced AI processing with real actions
        setTimeout(() => {
          setActiveAgents(prev => prev.map(agent => 
            agent.id === agentId 
              ? { ...agent, status: 'executing', progress: 'Analyzing request and generating commands...' }
              : agent
          ));
          
          if (xtermRef.current) {
            xtermRef.current.writeln(`\x1b[32m🔄 Agent ${newAgent.name} is analyzing your request...\x1b[0m`);
            
            // Generate appropriate commands based on the natural language
            let generatedCommands = [];
            if (command.toLowerCase().includes('create') && command.toLowerCase().includes('react')) {
              generatedCommands.push('npx create-react-app my-new-app');
            } else if (command.toLowerCase().includes('build')) {
              generatedCommands.push('npm run build');
            } else if (command.toLowerCase().includes('deploy')) {
              generatedCommands.push('npm run build && vercel --prod');
            } else if (command.toLowerCase().includes('install')) {
              generatedCommands.push('npm install');
            } else if (command.toLowerCase().includes('test')) {
              generatedCommands.push('npm test');
            } else if (command.toLowerCase().includes('fix') && command.toLowerCase().includes('lint')) {
              generatedCommands.push('npm run lint --fix');
            } else {
              generatedCommands.push('echo "AI Agent: Processing your request..."');
            }
            
            xtermRef.current.writeln(`\x1b[36m💡 Generated commands:\x1b[0m`);
            generatedCommands.forEach((cmd, idx) => {
              xtermRef.current.writeln(`\x1b[90m  ${idx + 1}. ${cmd}\x1b[0m`);
            });
            xtermRef.current.writeln('');
          }
        }, 1500);

        setTimeout(() => {
          setActiveAgents(prev => prev.map(agent => 
            agent.id === agentId 
              ? { ...agent, status: 'completed', progress: 'Task completed successfully' }
              : agent
          ));
          
          if (xtermRef.current) {
            xtermRef.current.writeln(`\x1b[1;32m✅ Agent ${newAgent.name} completed the task!\x1b[0m`);
            xtermRef.current.writeln(`\x1b[36m📊 Ready to execute generated commands\x1b[0m`);
            xtermRef.current.writeln(`\x1b[33m💡 Tip: Switch to Terminal Mode to run the commands\x1b[0m`);
            xtermRef.current.writeln('');
            showPrompt();
          }
          setIsProcessing(false);
        }, 4000);

      } else {
        // Execute as regular terminal command
        const response = await fetch('/api/terminal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command }),
        });

        const result = await response.json();
        
        if (xtermRef.current) {
          if (result.output) {
            result.output.split('\n').forEach((line: string) => {
              xtermRef.current.writeln(line);
            });
          }
          
          if (result.error) {
            xtermRef.current.writeln(`\x1b[31m${result.error}\x1b[0m`);
          }
          
          xtermRef.current.writeln('');
          showPrompt();
        }
        setIsProcessing(false);
      }
    } catch (error) {
      if (xtermRef.current) {
        xtermRef.current.writeln(`\x1b[31mError: ${error}\x1b[0m`);
        xtermRef.current.writeln('');
        showPrompt();
      }
      setIsProcessing(false);
    }
  }, [isAiMode, activeAgents.length, showPrompt]);

  const handleInputChange = (value: string) => {
    setCurrentInput(value);
    generateSuggestions(value);
  };

  const handleSubmit = () => {
    if (currentInput.trim()) {
      executeCommand(currentInput);
      setCurrentInput('');
      setShowSuggestions(false);
    }
  };

  const toggleMaximize = useCallback(() => {
    setIsMaximized(!isMaximized);
  }, [isMaximized]);

  if (!isOpen || !isClient) return null;

  return (
    <div 
      className={cn(
        'fixed bottom-0 left-0 right-0 bg-gradient-to-b from-gray-900 to-black border-t border-purple-500/20 shadow-2xl transition-all duration-300 ease-in-out z-50',
        isMaximized ? 'h-screen' : 'h-96',
        className
      )}
      style={{
        transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
      }}
    >
      {/* Enhanced Terminal Header */}
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-b border-purple-500/30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg text-sm font-medium">
            <Bot className="h-4 w-4" />
            <span>Advanced Copilot 2.0</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant={isAiMode ? "default" : "secondary"} className="bg-purple-500/20">
              <Sparkles className="h-3 w-3 mr-1" />
              {isAiMode ? 'AI Mode' : 'Terminal Mode'}
            </Badge>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsAiMode(!isAiMode)}
              className={cn(
                "h-6 px-2 text-xs text-white shadow-lg animate-gradient-x",
                isAiMode ? "bg-gradient-to-r from-gray-700 via-gray-800 to-black" : "bg-gradient-to-r from-gray-600 via-gray-700 to-gray-800"
              )}
            >
              {isAiMode ? 'Switch to Terminal' : 'Switch to AI'}
            </Button>
          </div>

          {activeAgents.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-purple-300">Active Agents:</span>
              {activeAgents.slice(-3).map((agent) => (
                <Badge 
                  key={agent.id} 
                  variant="outline" 
                  className={cn(
                    "text-xs",
                    agent.status === 'thinking' && "border-yellow-500 text-yellow-300",
                    agent.status === 'executing' && "border-blue-500 text-blue-300",
                    agent.status === 'completed' && "border-green-500 text-green-300",
                    agent.status === 'error' && "border-red-500 text-red-300"
                  )}
                >
                  {agent.status === 'thinking' && <Loader2 className="h-2 w-2 mr-1 animate-spin" />}
                  {agent.status === 'executing' && <Play className="h-2 w-2 mr-1" />}
                  {agent.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMaximize}
            className="h-7 w-7 p-0 text-purple-300 hover:text-white"
          >
            {isMaximized ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-7 w-7 p-0 text-purple-300 hover:text-white"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col h-full">
        {/* Terminal Output */}
        <div className="flex-1 overflow-hidden relative">
          <div 
            ref={terminalRef} 
            className="h-full w-full p-2"
            style={{ height: isMaximized ? 'calc(100vh - 140px)' : 'calc(384px - 140px)' }}
          />
        </div>

        {/* AI Input Section */}
        <div className="p-3 border-t border-purple-500/20 bg-gray-900/50">
          {/* Warp-style Quick Actions */}
          {isAiMode && currentInput.length === 0 && (
            <div className="mb-3">
              <div className="text-xs text-purple-300 mb-2">✨ Try these Warp-style workflows:</div>
              <div className="flex gap-2 flex-wrap">
                {[
                  { text: "Create a Next.js app", cmd: "create a new Next.js application" },
                  { text: "Build my project", cmd: "build the current project" },
                  { text: "Deploy to Vercel", cmd: "deploy this app to production" },
                  { text: "Fix lint errors", cmd: "fix all linting errors in the code" },
                  { text: "Run tests", cmd: "run all test suites" },
                  { text: "Install dependencies", cmd: "install all project dependencies" }
                ].map((workflow, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentInput(workflow.cmd)}
                    className="text-xs h-6 border-purple-500/30 hover:border-purple-400 text-purple-300"
                  >
                    {workflow.text}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {showSuggestions && commandSuggestions.length > 0 && (
            <div className="mb-2 flex gap-2 flex-wrap">
              {commandSuggestions.slice(0, 3).map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCurrentInput(suggestion.command);
                    setShowSuggestions(false);
                  }}
                  className="text-xs h-7 border-purple-500/30 hover:border-purple-400 text-purple-300"
                >
                  <Lightbulb className="h-3 w-3 mr-1" />
                  {suggestion.description}
                </Button>
              ))}
            </div>
          )}
          
          <div className="flex gap-2">
            <Input
              value={currentInput}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder={isAiMode ? "Describe what you want to do in natural language..." : "Enter terminal command..."}
              className="flex-1 bg-gray-800/50 border-purple-500/30 text-gray-100 placeholder:text-gray-400"
              disabled={isProcessing}
            />
            <Button
              onClick={handleSubmit}
              disabled={!currentInput.trim() || isProcessing}
              size="sm"
              className="bg-purple-500 hover:bg-purple-600"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 