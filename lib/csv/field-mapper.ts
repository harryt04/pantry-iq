/**
 * AI-powered CSV field mapping module
 * Uses LLM to suggest mappings from CSV headers to standard transaction fields
 */

import { generateText } from 'ai'
import { getProviders } from '@/lib/ai/providers'
import { getModel } from '@/lib/ai/models'

/**
 * Standard target fields for transaction data
 */
export const STANDARD_FIELDS = [
  'date',
  'item',
  'qty',
  'revenue',
  'cost',
  'location',
  'source',
] as const

export type StandardField = (typeof STANDARD_FIELDS)[number]

/**
 * Mapping type: source column name -> target standard field
 */
export type FieldMapping = Record<string, StandardField | null>

/**
 * Fallback mappings for common column name patterns
 */
const FALLBACK_PATTERNS: Record<string, StandardField> = {
  // Date patterns
  date: 'date',
  'transaction date': 'date',
  'sale date': 'date',
  'purchase date': 'date',
  timestamp: 'date',
  time: 'date',

  // Item patterns
  item: 'item',
  product: 'item',
  'product name': 'item',
  'item name': 'item',
  description: 'item',
  sku: 'item',
  name: 'item',

  // Quantity patterns
  qty: 'qty',
  quantity: 'qty',
  amount: 'qty',
  count: 'qty',
  units: 'qty',
  'qty sold': 'qty',

  // Revenue patterns
  revenue: 'revenue',
  sales: 'revenue',
  'sales amount': 'revenue',
  'sale price': 'revenue',
  price: 'revenue',
  'unit price': 'revenue',
  total: 'revenue',
  'total sales': 'revenue',

  // Cost patterns
  cost: 'cost',
  'unit cost': 'cost',
  'cost price': 'cost',
  'purchase price': 'cost',
  cogs: 'cost',
  expense: 'cost',

  // Location patterns
  location: 'location',
  store: 'location',
  'store name': 'location',
  branch: 'location',
  warehouse: 'location',
}

/**
 * Normalize header for pattern matching
 */
function normalizeHeader(header: string): string {
  return header.toLowerCase().trim()
}

/**
 * Find best fallback mapping for a header using pattern matching
 */
function findFallbackMapping(header: string): StandardField | null {
  const normalized = normalizeHeader(header)

  // Exact match
  if (FALLBACK_PATTERNS[normalized]) {
    return FALLBACK_PATTERNS[normalized]
  }

  // Substring match (for patterns like "Sale Date" matching "date")
  for (const [pattern, field] of Object.entries(FALLBACK_PATTERNS)) {
    if (normalized.includes(pattern) || pattern.includes(normalized)) {
      return field
    }
  }

  return null
}

/**
 * Suggest field mappings using LLM
 *
 * @param headers - CSV column headers
 * @param sample - Sample rows from CSV (first 5-10 rows)
 * @returns Mapping of source columns to target fields
 */
export async function suggestMappings(
  headers: string[],
  sample: Record<string, string>[],
): Promise<FieldMapping> {
  const providers = getProviders()

  // Fallback to pattern matching if no LLM available
  if (Object.keys(providers).length === 0) {
    console.warn('No LLM providers available, using pattern matching fallback')
    return fallbackMappings(headers)
  }

  try {
    // Use the first available provider
    const provider = providers.anthropic || providers.openai || providers.google
    if (!provider) {
      return fallbackMappings(headers)
    }

    // Get default model for the provider
    const modelId = providers.anthropic
      ? 'claude-3-5-haiku-20241022'
      : providers.openai
        ? 'gpt-4o-mini'
        : 'gemini-2.0-flash-lite'

    const model = getModel(modelId)

    // Prepare sample data summary for the prompt
    const sampleSummary = sample.slice(0, 3).map((row) =>
      Object.entries(row)
        .map(([k, v]) => `${k}: "${v.substring(0, 20)}"`)
        .join(', '),
    )

    const prompt = `You are a data expert. Analyze these CSV column headers and suggest how they map to standard transaction fields.

Standard fields available: date, item, qty, revenue, cost, location, source

Column headers: ${headers.join(', ')}

Sample data (first 3 rows):
${sampleSummary.map((s) => `- ${s}`).join('\n')}

Return a JSON object with a "mapping" key containing the field mapping. Each key is a column header, and the value is the target field or null if unmappable.
For example: {"mapping": {"Date": "date", "Product": "item", "Quantity": "qty", "Unit Price": "cost", "Seller": null}}

Always return valid JSON.`

    const text = await generateText({
      model: provider,
      prompt,
      temperature: 0.3,
    })

    // Parse JSON from response
    const jsonMatch = text.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('Could not extract JSON from LLM response:', text.text)
      return fallbackMappings(headers)
    }

    const parsed = JSON.parse(jsonMatch[0])
    if (!parsed.mapping || typeof parsed.mapping !== 'object') {
      console.error('Invalid mapping structure in LLM response')
      return fallbackMappings(headers)
    }

    // Validate and clean the mapping
    const mapping: FieldMapping = {}
    for (const [key, value] of Object.entries(parsed.mapping)) {
      if (value === null || value === undefined) {
        mapping[key] = null
      } else if (STANDARD_FIELDS.includes(value as StandardField)) {
        mapping[key] = value as StandardField
      } else {
        mapping[key] = null
      }
    }

    return mapping
  } catch (error) {
    console.error('LLM field mapping error:', error)
    // Fallback to pattern matching on error
    return fallbackMappings(headers)
  }
}

/**
 * Fallback mapping using pattern matching
 */
function fallbackMappings(headers: string[]): FieldMapping {
  const mapping: FieldMapping = {}

  for (const header of headers) {
    mapping[header] = findFallbackMapping(header)
  }

  return mapping
}

/**
 * Validate that all required fields are mapped
 *
 * @param mapping - Field mapping to validate
 * @param requiredFields - Fields that must be mapped (default: ['item'])
 * @returns Error message or null if valid
 */
export function validateMapping(
  mapping: FieldMapping,
  requiredFields: StandardField[] = ['item'],
): string | null {
  // Check if all required fields are mapped
  const mappedFields = new Set(Object.values(mapping).filter((v) => v !== null))

  for (const required of requiredFields) {
    if (!mappedFields.has(required)) {
      return `Missing required field: ${required}`
    }
  }

  return null
}

/**
 * Normalize a value based on the target field type
 *
 * @param value - Raw value to normalize
 * @param field - Target field type
 * @returns Normalized value
 */
export function normalizeValue(
  value: string,
  field: StandardField,
): string | number | null {
  if (!value || value.trim() === '') {
    return null
  }

  const trimmed = value.trim()

  switch (field) {
    case 'date': {
      // Try to parse and normalize to ISO format
      const date = parseDate(trimmed)
      return date ? date.toISOString().split('T')[0] : null
    }

    case 'qty':
    case 'revenue':
    case 'cost': {
      // Parse as number
      const num = parseFloat(trimmed)
      return !isNaN(num) ? num : null
    }

    case 'item':
    case 'location':
    case 'source':
    default: {
      // Keep as string
      return trimmed
    }
  }
}

/**
 * Parse various date formats to Date object
 */
function parseDate(dateString: string): Date | null {
  // Try ISO format first
  const iso = new Date(dateString)
  if (!isNaN(iso.getTime())) {
    return iso
  }

  // Try common US formats: MM/DD/YYYY, MM-DD-YYYY, M/D/YYYY
  const usFormats = [
    /(\d{1,2})[-/](\d{1,2})[-/](\d{4})/,
    /(\d{4})[-/](\d{1,2})[-/](\d{1,2})/, // YYYY-MM-DD
  ]

  for (const format of usFormats) {
    const match = dateString.match(format)
    if (match) {
      let month, day, year
      if (format === usFormats[0]) {
        ;[, month, day, year] = match
      } else {
        ;[, year, month, day] = match
      }

      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      if (!isNaN(date.getTime())) {
        return date
      }
    }
  }

  return null
}

/**
 * Apply field mapping to normalize a row
 *
 * @param row - Raw CSV row
 * @param mapping - Field mapping
 * @returns Normalized row with standard field names
 */
export function applyMapping(
  row: Record<string, string>,
  mapping: FieldMapping,
): Record<StandardField, string | number | null> {
  const normalized: Partial<Record<StandardField, string | number | null>> = {}

  for (const [sourceColumn, targetField] of Object.entries(mapping)) {
    if (targetField && row[sourceColumn] !== undefined) {
      normalized[targetField] = normalizeValue(row[sourceColumn], targetField)
    }
  }

  return normalized as Record<StandardField, string | number | null>
}
