/**
 * Unit tests for model registry and cost calculations
 */

import { describe, it, expect } from 'vitest'
import {
  MODEL_REGISTRY,
  getModel,
  getModelsByTier,
  getModelsByProvider,
  calculateCost,
  formatCost,
  getModelStats,
} from '@/lib/ai/models'

describe('Model Registry', () => {
  it('should have all required models enumerated', () => {
    const budgetModels = getModelsByTier('budget')
    const midTierModels = getModelsByTier('mid')

    expect(budgetModels.length).toBe(4)
    expect(midTierModels.length).toBe(3)
    expect(MODEL_REGISTRY.length).toBe(7)
  })

  it('should have all budget tier models with correct IDs', () => {
    const budgetIds = [
      'gemini-2.0-flash-lite',
      'gemini-2.0-flash',
      'claude-3-haiku-20240307',
      'gpt-4o-mini',
    ]
    const budgetModels = getModelsByTier('budget').map((m) => m.id)

    budgetIds.forEach((id) => {
      expect(budgetModels).toContain(id)
    })
  })

  it('should have all mid-tier models with correct IDs', () => {
    const midIds = ['gpt-4o', 'claude-3-5-haiku-20241022', 'gemini-2.5-flash']
    const midModels = getModelsByTier('mid').map((m) => m.id)

    midIds.forEach((id) => {
      expect(midModels).toContain(id)
    })
  })

  it('should return correct model by ID lookup', () => {
    const model = getModel('gpt-4o-mini')
    expect(model.id).toBe('gpt-4o-mini')
    expect(model.displayName).toBe('GPT-4o Mini (Budget)')
    expect(model.tier).toBe('budget')
    expect(model.provider).toBe('openai')
  })

  it('should throw error for invalid model ID', () => {
    expect(() => getModel('invalid-model-id')).toThrow(
      /Model not found: invalid-model-id/,
    )
  })

  it('should filter models by tier correctly', () => {
    const budgetModels = getModelsByTier('budget')
    const midModels = getModelsByTier('mid')

    budgetModels.forEach((model) => {
      expect(model.tier).toBe('budget')
    })

    midModels.forEach((model) => {
      expect(model.tier).toBe('mid')
    })
  })

  it('should filter models by provider correctly', () => {
    const openaiModels = getModelsByProvider('openai')
    const anthropicModels = getModelsByProvider('anthropic')
    const googleModels = getModelsByProvider('google')

    openaiModels.forEach((model) => {
      expect(model.provider).toBe('openai')
    })

    anthropicModels.forEach((model) => {
      expect(model.provider).toBe('anthropic')
    })

    googleModels.forEach((model) => {
      expect(model.provider).toBe('google')
    })
  })

  it('should have correct provider distribution', () => {
    const stats = getModelStats()
    expect(stats.byProvider.openai).toBe(2)
    expect(stats.byProvider.anthropic).toBe(2)
    expect(stats.byProvider.google).toBe(3)
  })
})

describe('Model Configuration Fields', () => {
  it('should have all required fields for each model', () => {
    MODEL_REGISTRY.forEach((model) => {
      expect(model).toHaveProperty('id')
      expect(model).toHaveProperty('displayName')
      expect(model).toHaveProperty('tier')
      expect(model).toHaveProperty('provider')
      expect(model).toHaveProperty('costPerInputToken')
      expect(model).toHaveProperty('costPerOutputToken')
      expect(model).toHaveProperty('contextWindowTokens')
    })
  })

  it('should have valid values for all model fields', () => {
    MODEL_REGISTRY.forEach((model) => {
      expect(typeof model.id).toBe('string')
      expect(typeof model.displayName).toBe('string')
      expect(['budget', 'mid']).toContain(model.tier)
      expect(['openai', 'anthropic', 'google']).toContain(model.provider)
      expect(typeof model.costPerInputToken).toBe('number')
      expect(typeof model.costPerOutputToken).toBe('number')
      expect(typeof model.contextWindowTokens).toBe('number')

      expect(model.costPerInputToken).toBeGreaterThanOrEqual(0)
      expect(model.costPerOutputToken).toBeGreaterThanOrEqual(0)
      expect(model.contextWindowTokens).toBeGreaterThan(0)
    })
  })

  it('should have unique model IDs', () => {
    const ids = MODEL_REGISTRY.map((m) => m.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('should have non-empty display names', () => {
    MODEL_REGISTRY.forEach((model) => {
      expect(model.displayName.length).toBeGreaterThan(0)
    })
  })
})

describe('Cost Calculation', () => {
  it('should calculate cost for input and output tokens', () => {
    const cost = calculateCost('gpt-4o-mini', 1000, 500)
    const expectedInputCost = 1000 * 0.15e-6 // $0.15 per 1M tokens
    const expectedOutputCost = 500 * 0.6e-6 // $0.6 per 1M tokens
    const expectedTotal = expectedInputCost + expectedOutputCost

    expect(cost).toBeCloseTo(expectedTotal, 10)
  })

  it('should handle zero tokens', () => {
    const cost = calculateCost('gpt-4o', 0, 0)
    expect(cost).toBe(0)
  })

  it('should calculate higher cost for mid-tier models', () => {
    const budgetCost = calculateCost('gpt-4o-mini', 1000000, 1000000)
    const midCost = calculateCost('gpt-4o', 1000000, 1000000)

    // GPT-4o should be significantly more expensive
    expect(midCost).toBeGreaterThan(budgetCost)
  })

  it('should calculate different costs for input vs output heavy usage', () => {
    const inputHeavy = calculateCost('gpt-4o-mini', 100000, 1000)
    const outputHeavy = calculateCost('gpt-4o-mini', 1000, 100000)

    // Output tokens are 4x more expensive than input for gpt-4o-mini
    // So output heavy should cost significantly more
    expect(outputHeavy).toBeGreaterThan(inputHeavy)
  })

  it('should format cost as USD currency', () => {
    const cost = 0.00456
    const formatted = formatCost(cost)

    expect(formatted).toMatch(/\$\d+\.\d+/)
    expect(formatted).toContain('$')
  })

  it('should handle very small costs in formatting', () => {
    const cost = 0.0000001
    const formatted = formatCost(cost)

    expect(formatted).toMatch(/\$[0-9.]+/)
  })
})

describe('Model Statistics', () => {
  it('should provide accurate model statistics', () => {
    const stats = getModelStats()

    expect(stats.total).toBe(7)
    expect(stats.byTier.budget).toBe(4)
    expect(stats.byTier.mid).toBe(3)
    expect(stats.byProvider.openai).toBe(2)
    expect(stats.byProvider.anthropic).toBe(2)
    expect(stats.byProvider.google).toBe(3)
  })
})

describe('Real-world Cost Scenarios', () => {
  it('should calculate realistic conversation cost (budget model)', () => {
    // Typical conversation: 5000 input tokens, 2000 output tokens
    const cost = calculateCost('gpt-4o-mini', 5000, 2000)

    // Roughly $0.00075 + $0.0012 = $0.00195
    expect(cost).toBeGreaterThan(0.001)
    expect(cost).toBeLessThan(0.01)
  })

  it('should calculate realistic conversation cost (mid-tier model)', () => {
    // Same conversation with GPT-4o
    const cost = calculateCost('gpt-4o', 5000, 2000)

    // Roughly $0.025 + $0.03 = $0.055
    expect(cost).toBeGreaterThan(0.04)
    expect(cost).toBeLessThan(0.07)
  })

  it('should calculate cost for large context usage', () => {
    // Large analysis with context: 50000 input, 10000 output
    const budgetCost = calculateCost('gemini-2.0-flash-lite', 50000, 10000)
    const midCost = calculateCost('gemini-2.5-flash', 50000, 10000)

    expect(budgetCost).toBeGreaterThan(0)
    expect(midCost).toBeGreaterThan(0)
  })
})
