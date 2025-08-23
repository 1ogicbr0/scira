import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

// Security: Only allow safe commands
const ALLOWED_COMMANDS = [
  // File operations
  'ls', 'dir', 'pwd', 'cd', 'cat', 'head', 'tail', 'find', 'grep',
  // Text processing
  'echo', 'wc', 'sort', 'uniq', 'cut', 'awk', 'sed',
  // System info
  'whoami', 'date', 'uname', 'df', 'du', 'ps', 'top', 'free',
  // Network
  'ping', 'curl', 'wget', 'dig', 'nslookup',
  // Development tools
  'git', 'npm', 'node', 'python', 'python3', 'pip', 'pip3',
  'yarn', 'pnpm', 'docker', 'kubectl', 'cargo', 'go', 'java', 'javac',
  // Package managers
  'brew', 'apt', 'yum', 'dnf', 'pacman',
  // Editors (safe modes)
  'nano', 'vim', 'emacs',
  // File permissions
  'chmod', 'chown', 'chgrp',
  // Archives
  'tar', 'zip', 'unzip', 'gzip', 'gunzip',
  // Process management
  'kill', 'killall', 'jobs', 'bg', 'fg',
];

// Dangerous commands to block
const BLOCKED_COMMANDS = [
  'rm', 'rmdir', 'mv', 'cp', 'dd', 'mkfs', 'fdisk',
  'sudo', 'su', 'passwd', 'chpasswd', 'usermod', 'userdel',
  'systemctl', 'service', 'init', 'shutdown', 'reboot', 'halt',
  'mount', 'umount', 'format', 'parted', 'gdisk',
  'crontab', 'at', 'batch',
];

function sanitizeCommand(command: string): { allowed: boolean; reason?: string } {
  const trimmedCommand = command.trim();
  if (!trimmedCommand) {
    return { allowed: false, reason: 'Empty command' };
  }

  // Get the first word (base command)
  const baseCommand = trimmedCommand.split(/\s+/)[0];
  
  // Check if command is explicitly blocked
  if (BLOCKED_COMMANDS.includes(baseCommand)) {
    return { allowed: false, reason: `Command '${baseCommand}' is blocked for security reasons` };
  }

  // Check for dangerous patterns
  if (trimmedCommand.includes('&&') || trimmedCommand.includes('||') || trimmedCommand.includes(';')) {
    return { allowed: false, reason: 'Command chaining is not allowed' };
  }

  if (trimmedCommand.includes('>`') || trimmedCommand.includes('>>')) {
    return { allowed: false, reason: 'File redirection is not allowed' };
  }

  if (trimmedCommand.includes('$(') || trimmedCommand.includes('`')) {
    return { allowed: false, reason: 'Command substitution is not allowed' };
  }

  // Allow if command is in allowed list or starts with allowed commands
  const isAllowed = ALLOWED_COMMANDS.some(allowedCmd => 
    baseCommand === allowedCmd || baseCommand.startsWith(allowedCmd + '.')
  );

  if (!isAllowed) {
    return { allowed: false, reason: `Command '${baseCommand}' is not in the allowed list` };
  }

  return { allowed: true };
}

function normalizePath(cwd: string): string {
  // Convert tilde to home directory
  if (cwd === '~' || cwd.startsWith('~/')) {
    return cwd.replace(/^~/, os.homedir());
  }
  
  // Ensure absolute path
  if (!path.isAbsolute(cwd)) {
    return path.resolve(process.cwd(), cwd);
  }
  
  return cwd;
}

export async function POST(request: NextRequest) {
  try {
    const { command, cwd = process.cwd() } = await request.json();

    if (!command || typeof command !== 'string') {
      return NextResponse.json(
        { error: 'Command is required' },
        { status: 400 }
      );
    }

    // Sanitize command
    const sanitizeResult = sanitizeCommand(command);
    if (!sanitizeResult.allowed) {
      return NextResponse.json(
        { error: sanitizeResult.reason },
        { status: 403 }
      );
    }

    // Normalize and validate working directory
    const normalizedCwd = normalizePath(cwd);
    
    // Ensure we don't go outside safe boundaries
    const workspaceRoot = process.cwd();
    if (!normalizedCwd.startsWith(workspaceRoot) && !normalizedCwd.startsWith(os.homedir())) {
      return NextResponse.json(
        { error: 'Access denied: Cannot execute commands outside workspace or home directory' },
        { status: 403 }
      );
    }

    // Handle special commands
    if (command.startsWith('cd ')) {
      const targetPath = command.substring(3).trim();
      let newCwd: string;

      if (targetPath === '~') {
        newCwd = os.homedir();
      } else if (targetPath.startsWith('~/')) {
        newCwd = path.join(os.homedir(), targetPath.substring(2));
      } else if (path.isAbsolute(targetPath)) {
        newCwd = targetPath;
      } else {
        newCwd = path.resolve(normalizedCwd, targetPath);
      }

      // Validate that the target directory exists and is accessible
      try {
        const fs = require('fs');
        const stats = fs.statSync(newCwd);
        if (stats.isDirectory()) {
          // Return simplified path for display
          const displayPath = newCwd.replace(os.homedir(), '~');
          return NextResponse.json({
            output: '',
            cwd: displayPath,
          });
        } else {
          return NextResponse.json(
            { error: `cd: ${targetPath}: Not a directory` },
            { status: 400 }
          );
        }
      } catch (error) {
        return NextResponse.json(
          { error: `cd: ${targetPath}: No such file or directory` },
          { status: 400 }
        );
      }
    }

    // Execute command
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: normalizedCwd,
        timeout: 30000, // 30 second timeout
        maxBuffer: 1024 * 1024, // 1MB buffer
        env: {
          ...process.env,
          PATH: process.env.PATH,
          HOME: os.homedir(),
        },
      });

      const output = stdout || stderr || '';
      
      return NextResponse.json({
        output: output.trim(),
        cwd: normalizedCwd.replace(os.homedir(), '~'),
      });
    } catch (error: any) {
      // Handle execution errors
      const errorMessage = error.stderr || error.message || 'Command execution failed';
      
      return NextResponse.json({
        output: '',
        error: errorMessage.trim(),
        cwd: normalizedCwd.replace(os.homedir(), '~'),
      });
    }
  } catch (error) {
    console.error('Terminal API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 