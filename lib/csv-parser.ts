/**
 * Simple CSV Parser Utility
 * Used for parsing and validating generated CSV data (test data generator)
 *
 * NOTE: This is for GENERATED CSV data only (test fixtures).
 * For parsing UPLOADED CSV files, use `parseCSV` from `lib/csv/parser.ts` instead.
 */

export interface ParsedGeneratedCSV {
  headers: string[]
  rows: Record<string, string>[]
  rawRows: string[][]
}

/**
 * Parse a CSV string into headers and rows
 * Used for validating generated test CSV data
 */
export function parseGeneratedCSV(csvContent: string): ParsedGeneratedCSV {
  const lines = csvContent.trim().split('\n')

  if (lines.length === 0) {
    throw new Error('CSV content is empty')
  }

  const headers = parseCSVLine(lines[0])
  const rawRows: string[][] = []
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const rowValues = parseCSVLine(lines[i])
    rawRows.push(rowValues)

    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header] = rowValues[index] || ''
    })
    rows.push(row)
  }

  return { headers, rows, rawRows }
}

/**
 * Legacy alias for backward compatibility. Use parseGeneratedCSV instead.
 * @deprecated Use parseGeneratedCSV instead
 */
export function parseCSV(csvContent: string): ParsedGeneratedCSV {
  return parseGeneratedCSV(csvContent)
}

/**
 * Parse a single CSV line, handling quoted values
 */
export function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"'
        i++
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }

  result.push(current)
  return result
}

/**
 * Validate CSV structure
 */
export function validateCSVStructure(
  parsed: ParsedGeneratedCSV,
  expectedHeaders: string[],
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check headers
  if (parsed.headers.length !== expectedHeaders.length) {
    errors.push(
      `Header count mismatch: expected ${expectedHeaders.length}, got ${parsed.headers.length}`,
    )
  }

  expectedHeaders.forEach((expected, index) => {
    if (parsed.headers[index] !== expected) {
      errors.push(
        `Header mismatch at column ${index}: expected "${expected}", got "${parsed.headers[index]}"`,
      )
    }
  })

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validate that a string is a valid date in YYYY-MM-DD format
 */
export function isValidDate(dateString: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(dateString)) {
    return false
  }

  const date = new Date(dateString)
  return date instanceof Date && !isNaN(date.getTime())
}

/**
 * Validate that a string is a valid time in HH:MM:SS format
 */
export function isValidTime(timeString: string): boolean {
  const timeRegex = /^\d{2}:\d{2}:\d{2}$/
  if (!timeRegex.test(timeString)) {
    return false
  }

  const [hours, minutes, seconds] = timeString.split(':').map(Number)
  return (
    hours >= 0 &&
    hours < 24 &&
    minutes >= 0 &&
    minutes < 60 &&
    seconds >= 0 &&
    seconds < 60
  )
}

/**
 * Validate that a string is a valid currency (decimal number)
 */
export function isValidCurrency(value: string): boolean {
  const currencyRegex = /^\d+(\.\d{2})?$/
  return currencyRegex.test(value)
}

/**
 * Validate that a string is a valid positive integer
 */
export function isValidInteger(value: string): boolean {
  const intRegex = /^\d+$/
  return intRegex.test(value)
}

/**
 * Parse a date string in YYYY-MM-DD format
 */
export function parseDate(dateString: string): Date {
  return new Date(dateString)
}

/**
 * Check if a date is within a range
 */
export function isDateInRange(date: Date, start: Date, end: Date): boolean {
  return date >= start && date <= end
}
