import { NextRequest, NextResponse } from 'next/server'
import { parseCSV } from '@/lib/csv/parser'
import {
  suggestMappings,
  validateMapping,
  applyMapping,
  FieldMapping,
} from '@/lib/csv/field-mapper'
import { db } from '@/db'
import { csvUploads } from '@/db/schema/csv-uploads'
import { transactions } from '@/db/schema/transactions'
import { eq } from 'drizzle-orm'

/**
 * Read CSV file - only evaluated at runtime
 * Uses indirect approach to prevent Turbopack static analysis
 */
async function readCSVFile(uploadId: string): Promise<Buffer> {
  // Use indirect path resolution to hide from Turbopack
  const fsModule = 'fs' + '/promises'
  const pathModule = 'path'
  const { readFile } = await import(fsModule)
  const { join: joinPaths } = await import(pathModule)
  const uploadDir = process.env.CSV_UPLOAD_PATH || '/tmp/csv-uploads'
  // Use a helper function to obscure the join call
  const filePath = [uploadDir, uploadId].reduce((prev, curr) =>
    joinPaths(/*turbopackIgnore: true*/ prev, curr),
  )
  return readFile(filePath)
}

/**
 * Delete CSV file - only evaluated at runtime
 * Uses indirect approach to prevent Turbopack static analysis
 */
async function deleteCSVFile(uploadId: string): Promise<void> {
  // Use indirect path resolution to hide from Turbopack
  const fsModule = 'fs' + '/promises'
  const pathModule = 'path'
  const { unlink } = await import(fsModule)
  const { join: joinPaths } = await import(pathModule)
  const uploadDir = process.env.CSV_UPLOAD_PATH || '/tmp/csv-uploads'
  // Use a helper function to obscure the join call
  const filePath = [uploadDir, uploadId].reduce((prev, curr) =>
    joinPaths(/*turbopackIgnore: true*/ prev, curr),
  )
  await unlink(filePath)
}

interface FieldMappingRequest {
  uploadId: string
  confirmedMapping?: FieldMapping
}

interface ImportError {
  row: number
  message: string
}

interface FieldMappingResponse {
  success: boolean
  rowsImported?: number
  errors?: ImportError[]
  mapping?: FieldMapping
  suggestedMapping?: FieldMapping
  message?: string
}

/**
 * POST /api/csv/field-mapping
 *
 * Handles field mapping confirmation and CSV data import
 *
 * Request body:
 * - uploadId: UUID of the CSV upload
 * - confirmedMapping: (optional) User-confirmed field mapping
 *
 * Returns:
 * - 200: { success, rowsImported, errors, mapping }
 * - 400: Bad request
 * - 404: Upload not found
 * - 500: Server error
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<FieldMappingResponse>> {
  try {
    const body: FieldMappingRequest = await request.json()
    const { uploadId, confirmedMapping } = body

    if (!uploadId) {
      return NextResponse.json(
        { success: false, message: 'Missing uploadId' },
        { status: 400 },
      )
    }

    // Get the upload record
    const uploadRecords = await db
      .select()
      .from(csvUploads)
      .where(eq(csvUploads.id, uploadId))

    if (uploadRecords.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Upload not found' },
        { status: 404 },
      )
    }

    const upload = uploadRecords[0]

    // If no confirmed mapping provided, generate suggestions
    if (!confirmedMapping) {
      // Update status to 'mapping'
      await db
        .update(csvUploads)
        .set({ status: 'mapping' })
        .where(eq(csvUploads.id, uploadId))

      // Read the uploaded CSV file from temp storage
      // In production, this would be retrieved from object storage
      // For now, we'll return suggested mappings based on headers
      let sampleData: Record<string, string>[] = []
      try {
        const fileBuffer = await readCSVFile(uploadId)
        const parsed = await parseCSV(fileBuffer, { maxPreviewRows: 5 })
        sampleData = parsed.rows
      } catch (error) {
        console.error('Failed to read CSV file for suggestions:', error)
        // Continue with empty sample
      }

      // Get suggested mappings
      interface FieldHeaders {
        headers?: string[]
      }
      const mappingData = (upload.fieldMapping as FieldHeaders) || {}
      const suggestedMapping = await suggestMappings(
        mappingData.headers || [],
        sampleData,
      )

      return NextResponse.json(
        {
          success: true,
          suggestedMapping,
          message: 'Field mapping suggestions generated',
        },
        { status: 200 },
      )
    }

    // Validate the confirmed mapping
    const validationError = validateMapping(confirmedMapping)
    if (validationError) {
      return NextResponse.json(
        { success: false, message: validationError },
        { status: 400 },
      )
    }

    // Update status to 'importing'
    await db
      .update(csvUploads)
      .set({
        status: 'importing',
        fieldMapping: JSON.stringify(confirmedMapping),
      })
      .where(eq(csvUploads.id, uploadId))

    // Read the CSV file
    let fileBuffer: Buffer
    try {
      fileBuffer = await readCSVFile(uploadId)
    } catch {
      await db
        .update(csvUploads)
        .set({
          status: 'error',
          errorDetails: 'CSV file not found',
        })
        .where(eq(csvUploads.id, uploadId))

      return NextResponse.json(
        { success: false, message: 'CSV file not found' },
        { status: 400 },
      )
    }

    // Parse the CSV with full data
    const parsed = await parseCSV(fileBuffer, { fullParse: true })

    // Apply mapping and import data
    const errors: ImportError[] = []
    let successCount = 0

    for (let rowIndex = 0; rowIndex < parsed.rows.length; rowIndex++) {
      try {
        const row = parsed.rows[rowIndex]
        const normalized = applyMapping(row, confirmedMapping)

        // Validate required fields
        if (!normalized.item) {
          errors.push({
            row: rowIndex + 1,
            message: 'Missing required field: item',
          })
          continue
        }

        if (!normalized.date) {
          errors.push({
            row: rowIndex + 1,
            message: 'Missing or invalid date',
          })
          continue
        }

        if (normalized.qty === null) {
          errors.push({
            row: rowIndex + 1,
            message: 'Missing or invalid quantity',
          })
          continue
        }

        // Insert transaction
        await db.insert(transactions).values({
          locationId: upload.locationId,
          date: String(normalized.date),
          item: String(normalized.item),
          qty: String(normalized.qty),
          revenue: normalized.revenue ? String(normalized.revenue) : null,
          cost: normalized.cost ? String(normalized.cost) : null,
          source: 'csv',
          sourceId: uploadId,
        })

        successCount++
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        errors.push({
          row: rowIndex + 1,
          message: `Import failed: ${message}`,
        })
      }
    }

    // Update status to complete or error
    const finalStatus =
      errors.length === 0
        ? 'complete'
        : successCount > 0
          ? 'complete' // Partial success — some rows imported
          : 'error' // Total failure — zero rows imported
    const errorDetails = errors.length > 0 ? JSON.stringify(errors) : null

    await db
      .update(csvUploads)
      .set({
        status: finalStatus,
        errorDetails,
      })
      .where(eq(csvUploads.id, uploadId))

    // Clean up temp file
    try {
      await deleteCSVFile(uploadId)
    } catch (error) {
      console.warn('Failed to delete temp CSV file:', error)
    }

    return NextResponse.json(
      {
        success: errors.length === 0,
        rowsImported: successCount,
        errors: errors.length > 0 ? errors : undefined,
        mapping: confirmedMapping,
      },
      { status: 200 },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Field mapping API error:', error)

    return NextResponse.json(
      { success: false, message: `Error: ${message}` },
      { status: 500 },
    )
  }
}

/**
 * GET /api/csv/field-mapping
 *
 * Get suggested field mappings for an upload
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const uploadId = searchParams.get('uploadId')

    if (!uploadId) {
      return NextResponse.json(
        { success: false, message: 'Missing uploadId parameter' },
        { status: 400 },
      )
    }

    const uploadRecords = await db
      .select()
      .from(csvUploads)
      .where(eq(csvUploads.id, uploadId))

    if (uploadRecords.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Upload not found' },
        { status: 404 },
      )
    }

    const upload = uploadRecords[0]

    // If mapping already confirmed, return it
    if (upload.fieldMapping) {
      return NextResponse.json({
        success: true,
        mapping: upload.fieldMapping,
        alreadyMapped: true,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Upload found, call POST to generate suggestions',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Field mapping GET error:', error)

    return NextResponse.json(
      { success: false, message: `Error: ${message}` },
      { status: 500 },
    )
  }
}
