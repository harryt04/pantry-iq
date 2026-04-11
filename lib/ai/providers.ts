/**
 * LLM Provider Initialization Module
 * Initializes Vercel AI SDK providers based on available API keys
 * Gracefully degrades if API keys are not configured
 */

import { createOpenAI, type OpenAIProvider } from '@ai-sdk/openai'
import { createAnthropic, type AnthropicProvider } from '@ai-sdk/anthropic'
import {
  createGoogleGenerativeAI,
  type GoogleGenerativeAIProvider,
} from '@ai-sdk/google'

export interface ProviderRegistry {
  openai?: OpenAIProvider
  anthropic?: AnthropicProvider
  google?: GoogleGenerativeAIProvider
}

/**
 * Initialize LLM providers based on available API keys
 * Only creates provider instances when corresponding API keys are present
 */
export function initializeProviders(): ProviderRegistry {
  const providers: ProviderRegistry = {}

  // Initialize OpenAI provider
  if (process.env.OPENAI_API_KEY) {
    try {
      providers.openai = createOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      })
    } catch (error) {
      console.warn('Failed to initialize OpenAI provider:', error)
    }
  }

  // Initialize Anthropic provider
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      providers.anthropic = createAnthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      })
    } catch (error) {
      console.warn('Failed to initialize Anthropic provider:', error)
    }
  }

  // Initialize Google provider
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    try {
      providers.google = createGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      })
    } catch (error) {
      console.warn('Failed to initialize Google provider:', error)
    }
  }

  return providers
}

/**
 * Lazy-loaded provider registry singleton
 * Initialized on first access
 */
let cachedProviders: ProviderRegistry | null = null

export function getProviders(): ProviderRegistry {
  if (!cachedProviders) {
    cachedProviders = initializeProviders()
  }
  return cachedProviders
}

/**
 * Check if any providers are available
 */
export function hasAvailableProviders(): boolean {
  const providers = getProviders()
  return Object.keys(providers).length > 0
}

/**
 * Get available provider names
 */
export function getAvailableProviderNames(): string[] {
  const providers = getProviders()
  return Object.keys(providers)
}
