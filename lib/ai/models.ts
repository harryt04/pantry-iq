/**
 * Model Registry with Cost Metadata
 * Maintains enumeration of all supported LLM models with pricing and capabilities
 * Pricing data current as of April 2026
 */

export type ModelTier = 'budget' | 'mid'

export interface ModelConfig {
  id: string
  displayName: string
  tier: ModelTier
  provider: 'openai' | 'anthropic' | 'google'
  costPerInputToken: number // in USD
  costPerOutputToken: number // in USD
  contextWindowTokens: number
}

/**
 * Complete model registry with all supported models
 * Organized by provider and tier
 */
export const MODEL_REGISTRY: ModelConfig[] = [
  // ============ BUDGET TIER MODELS ============

  // Google Gemini 2.0 Flash Lite - Most cost-effective option
  {
    id: 'gemini-2.0-flash-lite',
    displayName: 'Gemini 2.0 Flash Lite (Budget)',
    tier: 'budget',
    provider: 'google',
    costPerInputToken: 0.00005, // $0.05 per 1M input tokens
    costPerOutputToken: 0.00015, // $0.15 per 1M output tokens
    contextWindowTokens: 100000,
  },

  // Google Gemini 2.0 Flash - Fast and efficient
  {
    id: 'gemini-2.0-flash',
    displayName: 'Gemini 2.0 Flash (Budget)',
    tier: 'budget',
    provider: 'google',
    costPerInputToken: 0.075 / 1000000, // $0.075 per 1M input tokens
    costPerOutputToken: 0.3 / 1000000, // $0.3 per 1M output tokens
    contextWindowTokens: 100000,
  },

  // Anthropic Claude 3 Haiku - Legacy budget option
  {
    id: 'claude-3-haiku-20240307',
    displayName: 'Claude 3 Haiku (Budget - Legacy)',
    tier: 'budget',
    provider: 'anthropic',
    costPerInputToken: 0.25 / 1000000, // $0.25 per 1M input tokens
    costPerOutputToken: 1.25 / 1000000, // $1.25 per 1M output tokens
    contextWindowTokens: 200000,
  },

  // OpenAI GPT-4o mini - Reliable and affordable
  {
    id: 'gpt-4o-mini',
    displayName: 'GPT-4o Mini (Budget)',
    tier: 'budget',
    provider: 'openai',
    costPerInputToken: 0.15 / 1000000, // $0.15 per 1M input tokens
    costPerOutputToken: 0.6 / 1000000, // $0.6 per 1M output tokens
    contextWindowTokens: 128000,
  },

  // ============ MID TIER MODELS ============

  // OpenAI GPT-4o - Advanced reasoning and capabilities
  {
    id: 'gpt-4o',
    displayName: 'GPT-4o (Mid Tier)',
    tier: 'mid',
    provider: 'openai',
    costPerInputToken: 5.0 / 1000000, // $5 per 1M input tokens
    costPerOutputToken: 15.0 / 1000000, // $15 per 1M output tokens
    contextWindowTokens: 128000,
  },

  // Anthropic Claude 3.5 Haiku - Latest compact model
  {
    id: 'claude-3-5-haiku-20241022',
    displayName: 'Claude 3.5 Haiku (Mid Tier)',
    tier: 'mid',
    provider: 'anthropic',
    costPerInputToken: 0.8 / 1000000, // $0.80 per 1M input tokens
    costPerOutputToken: 4.0 / 1000000, // $4 per 1M output tokens
    contextWindowTokens: 200000,
  },

  // Google Gemini 2.5 Flash - Enhanced reasoning
  {
    id: 'gemini-2.5-flash',
    displayName: 'Gemini 2.5 Flash (Mid Tier)',
    tier: 'mid',
    provider: 'google',
    costPerInputToken: 0.075 / 1000000, // $0.075 per 1M input tokens
    costPerOutputToken: 0.3 / 1000000, // $0.3 per 1M output tokens
    contextWindowTokens: 1000000,
  },
]

/**
 * Get a model by ID
 * @throws Error if model not found
 */
export function getModel(id: string): ModelConfig {
  const model = MODEL_REGISTRY.find((m) => m.id === id)
  if (!model) {
    throw new Error(
      `Model not found: ${id}. Available models: ${MODEL_REGISTRY.map((m) => m.id).join(', ')}`,
    )
  }
  return model
}

/**
 * Get all models for a specific tier
 */
export function getModelsByTier(tier: ModelTier): ModelConfig[] {
  return MODEL_REGISTRY.filter((model) => model.tier === tier)
}

/**
 * Get all models for a specific provider
 */
export function getModelsByProvider(
  provider: 'openai' | 'anthropic' | 'google',
): ModelConfig[] {
  return MODEL_REGISTRY.filter((model) => model.provider === provider)
}

/**
 * Calculate the cost for a model usage
 * @param modelId - The model ID
 * @param tokensIn - Number of input tokens
 * @param tokensOut - Number of output tokens
 * @returns Cost in USD
 */
export function calculateCost(
  modelId: string,
  tokensIn: number,
  tokensOut: number,
): number {
  const model = getModel(modelId)
  const inputCost = tokensIn * model.costPerInputToken
  const outputCost = tokensOut * model.costPerOutputToken
  return inputCost + outputCost
}

/**
 * Format cost as USD currency string
 */
export function formatCost(costInUsd: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  }).format(costInUsd)
}

/**
 * Get model statistics
 */
export function getModelStats() {
  return {
    total: MODEL_REGISTRY.length,
    byTier: {
      budget: getModelsByTier('budget').length,
      mid: getModelsByTier('mid').length,
    },
    byProvider: {
      openai: getModelsByProvider('openai').length,
      anthropic: getModelsByProvider('anthropic').length,
      google: getModelsByProvider('google').length,
    },
  }
}
