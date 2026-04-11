import { parse } from 'csv-parse/sync'
import * as iconv from 'iconv-lite'

export interface ParsedCSV {
  headers: string[]
  rows: Record<string, string>[]
  totalRows: number
}

/**
 * Detect encoding of a buffer
 * Checks for UTF-16 BOM, otherwise assumes UTF-8 or ISO-8859-1
 */
function detectEncoding(buffer: Buffer): string {
  // Check for UTF-16 LE BOM
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return 'utf16le'
  }
  // Check for UTF-16 BE BOM
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    return 'utf16be'
  }
  // Check for UTF-8 BOM
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xef &&
    buffer[1] === 0xbb &&
    buffer[2] === 0xbf
  ) {
    return 'utf8'
  }

  // Default to UTF-8, which covers most cases
  return 'utf8'
}

/**
 * Detect delimiter from first line of CSV
 * Checks for comma, tab, or semicolon
 */
function detectDelimiter(firstLine: string): string {
  // Count occurrences of potential delimiters
  const commaCount = (firstLine.match(/,/g) || []).length
  const tabCount = (firstLine.match(/\t/g) || []).length
  const semicolonCount = (firstLine.match(/;/g) || []).length

  // Return the most common delimiter
  if (tabCount > commaCount && tabCount > semicolonCount) {
    return '\t'
  }
  if (semicolonCount > commaCount && semicolonCount > tabCount) {
    return ';'
  }
  return ','
}

/**
 * Parse CSV/TSV buffer and return headers, rows (limited to first 10 for preview), and total row count
 *
 * @param buffer - Buffer containing CSV/TSV data
 * @param options - Optional parsing options
 * @returns Promise containing parsed headers, preview rows, and total count
 * @throws Error if parsing fails
 */
export async function parseCSV(
  buffer: Buffer,
  options: { maxPreviewRows?: number; fullParse?: boolean } = {},
): Promise<ParsedCSV> {
  const { maxPreviewRows = 10, fullParse = false } = options

  try {
    // Detect encoding and convert buffer to string
    const encoding = detectEncoding(buffer)
    let csvString: string

    if (encoding === 'utf16le' || encoding === 'utf16be') {
      csvString = iconv.decode(buffer, encoding)
    } else {
      csvString = buffer.toString(encoding as BufferEncoding)
    }

    // Remove BOM if present
    if (csvString.charCodeAt(0) === 0xfeff) {
      csvString = csvString.slice(1)
    }

    // Get first line to detect delimiter
    const firstLineEnd = csvString.indexOf('\n')
    const firstLine =
      firstLineEnd === -1 ? csvString : csvString.substring(0, firstLineEnd)
    const delimiter = detectDelimiter(firstLine)

    // Parse the entire CSV to get accurate row count
    const records = parse(csvString, {
      delimiter,
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
    }) as Array<Record<string, unknown>>

    // Extract headers from records
    const headers = records.length > 0 ? Object.keys(records[0]) : []

    // Limit preview rows if not doing full parse
    const previewRows = fullParse ? records : records.slice(0, maxPreviewRows)

    // Ensure all values are strings
    const normalizedRows = previewRows.map((row: Record<string, unknown>) => {
      const normalized: Record<string, string> = {}
      for (const [key, value] of Object.entries(row)) {
        normalized[key] =
          value === null || value === undefined ? '' : String(value)
      }
      return normalized
    })

    return {
      headers,
      rows: normalizedRows,
      totalRows: records.length,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to parse CSV: ${message}`)
  }
}

/**
 * Validate CSV file by checking headers and basic structure
 * @param buffer - Buffer containing CSV data
 * @returns Promise<boolean> - true if valid CSV structure
 */
export async function validateCSVStructure(buffer: Buffer): Promise<boolean> {
  try {
    const parsed = await parseCSV(buffer)
    return parsed.headers.length > 0 && parsed.totalRows > 0
  } catch {
    return false
  }
}
