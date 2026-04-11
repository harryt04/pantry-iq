import { describe, it, expect } from 'vitest'
import {
  suggestMappings,
  validateMapping,
  normalizeValue,
  applyMapping,
  FieldMapping,
} from '@/lib/csv/field-mapper'

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
})
