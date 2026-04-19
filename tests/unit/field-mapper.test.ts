import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock the 'ai' package so tests can intercept generateText without real HTTP calls.
// The factory is hoisted by Vitest; individual tests can override via mockResolvedValueOnce.
vi.mock('ai', () => ({
  generateText: vi.fn(),
}))

import {
  suggestMappings,
  validateMapping,
  normalizeValue,
  applyMapping,
  FieldMapping,
} from '@/lib/csv/field-mapper'
import { generateText } from 'ai'

describe('field-mapper', () => {
  describe('validateMapping', () => {
    it('should accept mapping with required fields', () => {
      const mapping: FieldMapping = {
        Name: 'item',
        Quantity: 'qty',
        Date: 'date',
      }
      const error = validateMapping(mapping)
      expect(error).toBeNull()
    })

    it('should reject mapping without item field', () => {
      const mapping: FieldMapping = {
        Quantity: 'qty',
        Date: 'date',
      }
      const error = validateMapping(mapping)
      expect(error).toBe('Missing required field: item')
    })

    it('should accept mapping with custom required fields', () => {
      const mapping: FieldMapping = {
        Name: 'item',
        Date: 'date',
      }
      const error = validateMapping(mapping, ['item', 'date'])
      expect(error).toBeNull()
    })

    it('should reject mapping with missing custom required fields', () => {
      const mapping: FieldMapping = {
        Name: 'item',
      }
      const error = validateMapping(mapping, ['item', 'date'])
      expect(error).toBe('Missing required field: date')
    })
  })

  describe('normalizeValue', () => {
    it('should parse date in ISO format', () => {
      const result = normalizeValue('2024-01-15', 'date')
      expect(result).toBe('2024-01-15')
    })

    it('should parse date in MM/DD/YYYY format', () => {
      const result = normalizeValue('01/15/2024', 'date')
      expect(result).toBe('2024-01-15')
    })

    it('should parse date in YYYY-MM-DD format', () => {
      const result = normalizeValue('2024-01-15', 'date')
      expect(result).toBe('2024-01-15')
    })

    it('should return null for invalid date', () => {
      const result = normalizeValue('invalid-date', 'date')
      expect(result).toBeNull()
    })

    it('should parse quantity as number', () => {
      const result = normalizeValue('42', 'qty')
      expect(result).toBe(42)
    })

    it('should parse decimal quantity', () => {
      const result = normalizeValue('42.5', 'qty')
      expect(result).toBe(42.5)
    })

    it('should return null for non-numeric quantity', () => {
      const result = normalizeValue('abc', 'qty')
      expect(result).toBeNull()
    })

    it('should parse revenue as number', () => {
      const result = normalizeValue('99.99', 'revenue')
      expect(result).toBe(99.99)
    })

    it('should parse cost as number', () => {
      const result = normalizeValue('45.50', 'cost')
      expect(result).toBe(45.5)
    })

    it('should trim item strings', () => {
      const result = normalizeValue('  Product Name  ', 'item')
      expect(result).toBe('Product Name')
    })

    it('should return null for empty string', () => {
      const result = normalizeValue('', 'item')
      expect(result).toBeNull()
    })

    it('should return null for whitespace-only string', () => {
      const result = normalizeValue('   ', 'item')
      expect(result).toBeNull()
    })
  })

  describe('applyMapping', () => {
    it('should apply mapping to a row', () => {
      const row = {
        'Product Name': 'Widget',
        'Quantity Sold': '10',
        'Sale Date': '2024-01-15',
        'Sale Price': '99.99',
      }
      const mapping: FieldMapping = {
        'Product Name': 'item',
        'Quantity Sold': 'qty',
        'Sale Date': 'date',
        'Sale Price': 'revenue',
      }
      const result = applyMapping(row, mapping)

      expect(result.item).toBe('Widget')
      expect(result.qty).toBe(10)
      expect(result.date).toBe('2024-01-15')
      expect(result.revenue).toBe(99.99)
    })

    it('should skip unmapped columns', () => {
      const row = {
        'Product Name': 'Widget',
        'Quantity Sold': '10',
        'Unused Column': 'value',
      }
      const mapping: FieldMapping = {
        'Product Name': 'item',
        'Quantity Sold': 'qty',
        'Unused Column': null,
      }
      const result = applyMapping(row, mapping)

      expect(result.item).toBe('Widget')
      expect(result.qty).toBe(10)
      expect(
        Object.keys(result).filter(
          (k) => result[k as keyof typeof result] !== undefined,
        ),
      ).toHaveLength(2)
    })

    it('should handle missing fields gracefully', () => {
      const row = {
        'Product Name': 'Widget',
      }
      const mapping: FieldMapping = {
        'Product Name': 'item',
        'Quantity Sold': 'qty',
      }
      const result = applyMapping(row, mapping)

      expect(result.item).toBe('Widget')
      expect(result.qty).toBeUndefined()
    })
  })

  describe('suggestMappings', () => {
    it('should return mapping object with headers as keys', async () => {
      const headers = ['Date', 'Item', 'Quantity', 'Price']
      const sample = [
        { Date: '2024-01-15', Item: 'Widget', Quantity: '10', Price: '99.99' },
      ]

      // This will use fallback pattern matching if no LLM is configured
      const mapping = await suggestMappings(headers, sample)

      expect(mapping).toBeDefined()
      expect(typeof mapping).toBe('object')
      expect(Object.keys(mapping)).toContain('Date')
      expect(Object.keys(mapping)).toContain('Item')
    })

    it('should handle ambiguous columns gracefully', async () => {
      const headers = ['Date', 'Product', 'Qty', 'Cost', 'Sale Price']
      const sample = [
        {
          Date: '2024-01-15',
          Product: 'Widget',
          Qty: '10',
          Cost: '50',
          'Sale Price': '99.99',
        },
      ]

      const mapping = await suggestMappings(headers, sample)

      expect(mapping).toBeDefined()
      // All columns should have a mapping or null
      Object.values(mapping).forEach((v) => {
        expect(v === null || typeof v === 'string').toBe(true)
      })
    })

    it('should map common column names correctly', async () => {
      const headers = [
        'transaction_date',
        'product_name',
        'quantity',
        'unit_price',
        'cost_price',
      ]
      const sample = [
        {
          transaction_date: '2024-01-15',
          product_name: 'Widget',
          quantity: '10',
          unit_price: '99.99',
          cost_price: '50.00',
        },
      ]

      const mapping = await suggestMappings(headers, sample)

      // Verify mapping was generated
      expect(mapping).toBeDefined()
      expect(typeof mapping).toBe('object')
    })
  })

  describe('word-boundary matching', () => {
    it('should NOT map "Server Name" to "item" (name is too generic)', async () => {
      // 'name' was removed from FALLBACK_PATTERNS to avoid false positives.
      // Word-boundary matching also ensures that partial word hits don't fire.
      const mapping = await suggestMappings(['Server Name'], [])
      // Should be null — 'Server Name' should not match 'item'
      expect(mapping['Server Name']).toBeNull()
    })

    it('should NOT map "Username" to "item"', async () => {
      const mapping = await suggestMappings(['Username'], [])
      expect(mapping['Username']).toBeNull()
    })

    it('should still map "item name" to "item"', async () => {
      const mapping = await suggestMappings(['item name'], [])
      expect(mapping['item name']).toBe('item')
    })

    it('should still map "product name" to "item"', async () => {
      const mapping = await suggestMappings(['product name'], [])
      expect(mapping['product name']).toBe('item')
    })
  })

  describe('duplicate target deduplication (first-match-wins)', () => {
    it('should assign "date" to "Sale Date" and null to "Transaction Time"', async () => {
      // Both 'Sale Date' and 'Transaction Time' would match 'date'.
      // First-match-wins: 'Sale Date' appears first and takes 'date'.
      // 'Transaction Time' must be null (target already assigned).
      const headers = ['Sale Date', 'Transaction Time']
      const mapping = await suggestMappings(headers, [])

      expect(mapping['Sale Date']).toBe('date')
      expect(mapping['Transaction Time']).toBeNull()
    })

    it('should assign "date" to the first matching header and null to subsequent ones', async () => {
      const headers = ['date', 'timestamp', 'time']
      const mapping = await suggestMappings(headers, [])

      // 'date' matches first
      expect(mapping['date']).toBe('date')
      // 'timestamp' and 'time' also match 'date' but target is taken
      expect(mapping['timestamp']).toBeNull()
      expect(mapping['time']).toBeNull()
    })

    it('should allow different headers to map to different target fields', async () => {
      const headers = ['Sale Date', 'product name', 'qty']
      const mapping = await suggestMappings(headers, [])

      expect(mapping['Sale Date']).toBe('date')
      expect(mapping['product name']).toBe('item')
      expect(mapping['qty']).toBe('qty')
    })
  })

  describe('stub API key gating', () => {
    const originalEnv = process.env

    beforeEach(() => {
      process.env = { ...originalEnv }
    })

    afterEach(() => {
      process.env = originalEnv
      vi.restoreAllMocks()
    })

    it('should use fallback pattern matching when OPENAI_API_KEY is "stub"', async () => {
      process.env.OPENAI_API_KEY = 'stub'
      process.env.ANTHROPIC_API_KEY = undefined
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = undefined

      const headers = ['Sale Date', 'product name', 'qty']
      const mapping = await suggestMappings(headers, [])

      // Fallback pattern matching should still produce correct results
      expect(mapping['Sale Date']).toBe('date')
      expect(mapping['product name']).toBe('item')
      expect(mapping['qty']).toBe('qty')
    })

    it('should use fallback pattern matching when OPENAI_API_KEY is "test"', async () => {
      process.env.OPENAI_API_KEY = 'test'
      process.env.ANTHROPIC_API_KEY = undefined
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = undefined

      const mapping = await suggestMappings(['date', 'item'], [])

      expect(mapping['date']).toBe('date')
      expect(mapping['item']).toBe('item')
    })

    it('should use fallback when key is shorter than 20 characters', async () => {
      process.env.OPENAI_API_KEY = 'short-key'
      process.env.ANTHROPIC_API_KEY = undefined
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = undefined

      const mapping = await suggestMappings(['date', 'item'], [])

      expect(mapping['date']).toBe('date')
      expect(mapping['item']).toBe('item')
    })

    it('should attempt AI path when key is >= 20 chars and not a stub', async () => {
      // Provide a realistic-length key and mock generateText so the test
      // does not make a real network call.
      vi.mocked(generateText).mockResolvedValueOnce({
        text: '{"mapping": {"date": "date", "item": "item"}}',
      } as Awaited<ReturnType<typeof generateText>>)

      process.env.OPENAI_API_KEY = 'sk-realkey1234567890abcdefghij'
      process.env.ANTHROPIC_API_KEY = undefined
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = undefined

      const mapping = await suggestMappings(['date', 'item'], [])

      // generateText was called (AI path attempted) — mock returned a valid mapping
      expect(vi.mocked(generateText)).toHaveBeenCalled()
      expect(mapping['date']).toBe('date')
      expect(mapping['item']).toBe('item')
    })
  })

  describe('regex escaping — meta-characters in headers', () => {
    it('should handle "Item (Count)" without throwing', async () => {
      const mapping = await suggestMappings(['Item (Count)'], [])
      expect(mapping['Item (Count)']).toBeDefined()
      // null or a valid StandardField — not an exception
    })

    it('should handle "Price [USD]" without throwing', async () => {
      const mapping = await suggestMappings(['Price [USD]'], [])
      expect(mapping['Price [USD]']).toBeDefined()
    })

    it('should handle "Date+Time" without throwing', async () => {
      const mapping = await suggestMappings(['Date+Time'], [])
      expect(mapping['Date+Time']).toBeDefined()
    })

    it('should handle "Cost^2" without throwing', async () => {
      const mapping = await suggestMappings(['Cost^2'], [])
      expect(mapping['Cost^2']).toBeDefined()
    })

    it('should handle a header with multiple meta-characters without throwing', async () => {
      const mapping = await suggestMappings(
        ['Revenue (USD) [2024]'],
        [],
      )
      expect(mapping['Revenue (USD) [2024]']).toBeDefined()
    })
  })
})
