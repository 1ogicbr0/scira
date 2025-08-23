import { wrapLanguageModel, customProvider, extractReasoningMiddleware } from 'ai';

import { openai, createOpenAI } from '@ai-sdk/openai';
import { groq } from '@ai-sdk/groq';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { mistral } from '@ai-sdk/mistral';

const middleware = extractReasoningMiddleware({
  tagName: 'think',
});

const huggingface = createOpenAI({
  baseURL: 'https://router.huggingface.co/v1',
  apiKey: process.env.HF_TOKEN,
});

const fireworks = createOpenAI({
  baseURL: 'https://api.fireworks.ai/inference/v1',
  apiKey: process.env.FIREWORKS_API_KEY,
});

export const ola = customProvider({
  languageModels: {
    'ola-default': groq('llama-3.3-70b-versatile', {
      parallelToolCalls: false,
    }),
    'ola-x-fast-mini': groq('llama-3.2-11b-text-preview', {
      parallelToolCalls: false,
    }),
    'ola-x-fast': groq('llama-3.3-70b-versatile', {
      parallelToolCalls: false,
    }),
    'ola-nano': openai.responses('gpt-4o-mini'),
    'ola-4.1-mini': openai.responses('gpt-4o-mini'),
    'ola-grok-3': groq('llama-3.3-70b-versatile', {
      parallelToolCalls: false,
    }),
    'ola-grok-4': groq('llama-3.3-70b-versatile', {
      parallelToolCalls: false,
    }),
    'ola-vision': groq('llama-3.2-90b-vision-preview', {
      parallelToolCalls: false,
    }),
    'ola-g2': groq('llama-3.3-70b-versatile', {
      parallelToolCalls: false,
    }),
    'ola-4o-mini': openai.responses('gpt-4o-mini'),
    'ola-o4-mini': openai.responses('o4-mini-2025-04-16'),
    'ola-o3': openai.responses('o3'),
    'ola-qwen-32b': wrapLanguageModel({
      model: groq('qwen/qwen3-32b', {
        parallelToolCalls: false,
      }),
      middleware,
    }),
    'ola-qwen-30b': wrapLanguageModel({
      model: fireworks('accounts/fireworks/models/qwen3-30b-a3b'),
      middleware,
    }),
    'ola-deepseek-v3': wrapLanguageModel({
      model: fireworks('accounts/fireworks/models/deepseek-v3-0324'),
      middleware,
    }),
    'ola-kimi-k2': groq('moonshotai/kimi-k2-instruct', {
      parallelToolCalls: false,
    }),
    'ola-haiku': anthropic('claude-3-5-haiku-20241022'),
    'ola-mistral': mistral('mistral-small-latest'),
    'ola-google-lite': google('gemini-2.5-flash-lite'),
    'ola-google': google('gemini-2.5-flash'),
    'ola-google-pro': google('gemini-2.5-pro'),
    'ola-anthropic': anthropic('claude-sonnet-4-20250514'),
    'ola-llama-4': groq('meta-llama/llama-4-maverick-17b-128e-instruct', {
      parallelToolCalls: false,
    }),
  },
});

export const models = [
  // Free Unlimited Models (Groq)
  {
    value: 'ola-default',
    label: 'Ola Simple',
    description: "Meta's versatile reasoning LLM.",
    vision: false,
    reasoning: true,
    experimental: false,
    category: 'Mini',
    pdf: false,
    pro: false,
    requiresAuth: false,
    freeUnlimited: false,
    maxOutputTokens: 16000,
  },
  {
    value: 'ola-vision',
    label: 'Llama 3.2 Vision',
    description: "Meta's advanced vision LLM",
    vision: true,
    reasoning: false,
    experimental: false,
    category: 'Mini',
    pdf: false,
    pro: false,
    requiresAuth: false,
    freeUnlimited: false,
    maxOutputTokens: 8000,
  },
  {
    value: 'ola-grok-3',
    label: 'Llama 3.3 70B Pro',
    description: "Meta's advanced reasoning LLM",
    vision: false,
    reasoning: false,
    experimental: false,
    category: 'Pro',
    pdf: false,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 16000,
  },
  {
    value: 'ola-grok-4',
    label: 'Llama 3.3 70B Max',
    description: "Meta's most capable multimodal LLM",
    vision: true,
    reasoning: true,
    experimental: false,
    category: 'Pro',
    pdf: false,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 16000,
  },

  // Mini Models (Free/Paid)
  {
    value: 'ola-mistral',
    label: 'Mistral Small',
    description: "Mistral's small LLM",
    vision: true,
    reasoning: false,
    experimental: false,
    category: 'Mini',
    pdf: true,
    pro: false,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 128000,
  },
  {
    value: 'ola-qwen-30b',
    label: 'Qwen 3 30B A3B',
    description: "Alibaba's advanced MoE reasoning LLM",
    vision: false,
    reasoning: true,
    experimental: false,
    category: 'Mini',
    pdf: false,
    pro: false,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 16000,
  },
  {
    value: 'ola-qwen-32b',
    label: 'Qwen 3 32B',
    description: "Alibaba's advanced reasoning LLM",
    vision: false,
    reasoning: true,
    experimental: false,
    category: 'Mini',
    pdf: false,
    pro: false,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 40960,
  },
  {
    value: 'ola-deepseek-v3',
    label: 'DeepSeek V3 0324',
    description: "DeepSeek's advanced base LLM",
    vision: false,
    reasoning: false,
    experimental: false,
    category: 'Mini',
    pdf: false,
    pro: false,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 16000,
  },
  {
    value: 'ola-4o-mini',
    label: 'GPT 4o Mini',
    description: "OpenAI's previous flagship mini LLM",
    vision: true,
    reasoning: true,
    experimental: false,
    category: 'Mini',
    pdf: true,
    pro: false,
    requiresAuth: false,
    freeUnlimited: false,
    maxOutputTokens: 16000,
  },
  {
    value: 'ola-4.1-mini',
    label: 'GPT 4.1 Mini',
    description: "OpenAI's latest flagship mini LLM",
    vision: true,
    reasoning: true,
    experimental: false,
    category: 'Mini',
    pdf: true,
    pro: false,
    requiresAuth: false,
    freeUnlimited: false,
    maxOutputTokens: 16000,
  },
  {
    value: 'ola-google-lite',
    label: 'Gemini 2.5 Flash Lite',
    description: "Google's advanced smallest LLM",
    vision: true,
    reasoning: false,
    experimental: false,
    category: 'Mini',
    pdf: true,
    pro: false,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 64000,
  },

  // Pro Models (Paid)
  {
    value: 'ola-anthropic',
    label: 'Claude 4 Sonnet',
    description: "Anthropic's most advanced LLM",
    vision: true,
    reasoning: false,
    experimental: false,
    category: 'Pro',
    pdf: true,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 64000,
  },
  {
    value: 'ola-google',
    label: 'Gemini 2.5 Flash',
    description: "Google's advanced small LLM",
    vision: true,
    reasoning: false,
    experimental: false,
    category: 'Pro',
    pdf: true,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 65000,
  },
  {
    value: 'ola-kimi-k2',
    label: 'Kimi K2',
    description: "MoonShot AI's advanced base LLM",
    vision: false,
    reasoning: false,
    experimental: false,
    category: 'Pro',
    pdf: false,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 10000,
  },
  {
    value: 'ola-google-pro',
    label: 'Gemini 2.5 Pro',
    description: "Google's most advanced LLM",
    vision: true,
    reasoning: false,
    experimental: false,
    category: 'Pro',
    pdf: true,
    pro: true,
    requiresAuth: false,
    freeUnlimited: false,
    maxOutputTokens: 65000,
  },
  {
    value: 'ola-o4-mini',
    label: 'o4 mini',
    description: "OpenAI's faster mini reasoning LLM",
    vision: true,
    reasoning: true,
    experimental: false,
    category: 'Pro',
    pdf: true,
    pro: false,
    requiresAuth: false,
    freeUnlimited: false,
    maxOutputTokens: 100000,
  },
  {
    value: 'ola-o3',
    label: 'o3',
    description: "OpenAI's big reasoning LLM",
    vision: true,
    reasoning: true,
    experimental: false,
    category: 'Pro',
    pdf: true,
    pro: false,
    requiresAuth: false,
    freeUnlimited: false,
    maxOutputTokens: 100000,
  },

  // Experimental (Pro)
  {
    value: 'ola-llama-4',
    label: 'Llama 4 Maverick',
    description: "Meta's latest LLM",
    vision: true,
    reasoning: false,
    experimental: true,
    category: 'Experimental',
    pdf: false,
    pro: false,
    requiresAuth: false,
    freeUnlimited: false,
    maxOutputTokens: 8000,
  },
];

// Helper functions for model access checks
export function getModelConfig(modelValue: string) {
  return models.find((model) => model.value === modelValue);
}

export function requiresAuthentication(modelValue: string): boolean {
  const model = getModelConfig(modelValue);
  return model?.requiresAuth || false;
}

export function requiresProSubscription(modelValue: string): boolean {
  const model = getModelConfig(modelValue);
  return model?.pro || false;
}

export function isFreeUnlimited(modelValue: string): boolean {
  const model = getModelConfig(modelValue);
  return model?.freeUnlimited || false;
}

export function hasVisionSupport(modelValue: string): boolean {
  const model = getModelConfig(modelValue);
  return model?.vision || false;
}

export function hasPdfSupport(modelValue: string): boolean {
  const model = getModelConfig(modelValue);
  return model?.pdf || false;
}

export function hasReasoningSupport(modelValue: string): boolean {
  const model = getModelConfig(modelValue);
  return model?.reasoning || false;
}

export function isExperimentalModel(modelValue: string): boolean {
  const model = getModelConfig(modelValue);
  return model?.experimental || false;
}

export function getMaxOutputTokens(modelValue: string): number {
  const model = getModelConfig(modelValue);
  return model?.maxOutputTokens || 8000;
}

// Access control helper
export function canUseModel(modelValue: string, user: any, isProUser: boolean): { canUse: boolean; reason?: string } {
  const model = getModelConfig(modelValue);

  if (!model) {
    return { canUse: false, reason: 'Model not found' };
  }

  // Check if model requires authentication
  if (model.requiresAuth && !user) {
    return { canUse: false, reason: 'authentication_required' };
  }

  // Check if model requires Pro subscription
  if (model.pro && !isProUser) {
    return { canUse: false, reason: 'pro_subscription_required' };
  }

  return { canUse: true };
}

// Helper to check if user should bypass rate limits
export function shouldBypassRateLimits(modelValue: string, user: any): boolean {
  const model = getModelConfig(modelValue);
  return Boolean(user && model?.freeUnlimited);
}

// Get acceptable file types for a model
export function getAcceptedFileTypes(modelValue: string, isProUser: boolean): string {
  const model = getModelConfig(modelValue);
  if (model?.pdf && isProUser) {
    return 'image/*,.pdf';
  }
  return 'image/*';
}

// Legacy arrays for backward compatibility (deprecated - use helper functions instead)
export const authRequiredModels = models.filter((m) => m.requiresAuth).map((m) => m.value);
export const proRequiredModels = models.filter((m) => m.pro).map((m) => m.value);
export const freeUnlimitedModels = models.filter((m) => m.freeUnlimited).map((m) => m.value);
