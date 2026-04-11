import { NextRequest, NextResponse } from 'next/server'
import { parseCSV } from '@/lib/csv/parser'
import { db } from '@/db'
import { csvUploads } from '@/db/schema/csv-uploads'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

/**
 * Get the CSV upload directory - only evaluated at runtime
 * Uses indirect approach to prevent Turbopack static analysis
 */
async function getUploadDir(): Promise<string> {
  // Use string concatenation to hide from Turbopack
  const fsModule = 'fs' + '/promises'
  const { mkdir } = await import(fsModule)
  const uploadDir = process.env.CSV_UPLOAD_PATH || '/tmp/csv-uploads'
  try {
    await mkdir(uploadDir, { recursive: true })
  } catch (error) {
    console.warn('Failed to create upload directory:', error)
  }
  return uploadDir
}

/**
 * Write CSV file - only evaluated at runtime
 * Uses indirect approach to prevent Turbopack static analysis
 */
async function writeCSVFile(uploadId: string, buffer: Buffer): Promise<void> {
  // Use string concatenation to hide from Turbopack
  const fsModule = 'fs' + '/promises'
  const pathModule = 'path'
  const { writeFile } = await import(fsModule)
  const { join: joinPaths } = await import(pathModule)
  const uploadDir = process.env.CSV_UPLOAD_PATH || '/tmp/csv-uploads'
  // Use a helper function to obscure the join call
  const filePath = [uploadDir, uploadId].reduce((prev, curr) =>
    joinPaths(/*turbopackIgnore: true*/ prev, curr),
  )
  await writeFile(filePath, buffer)
}

/**
 * POST /api/csv/upload
 *
 * Accepts multipart/form-data with:
 * - file: CSV or TSV file
 * - location_id: UUID of the location
 *
 * Returns:
 * - 200: { uploadId, filename, rowCount, headers, preview, status }
 * - 400: Bad request (missing file or location_id, invalid file type)
 * - 413: Payload too large (file exceeds 50MB)
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const locationId = formData.get('location_id') as string | null

    // Validate inputs
    if (!file) {
      return NextResponse.json(
        { error: 'Missing file in request' },
        { status: 400 },
      )
    }

    if (!locationId) {
      return NextResponse.json(
        { error: 'Missing location_id in request' },
        { status: 400 },
      )
    }

    // Validate file type
    const filename = file.name.toLowerCase()
    if (!filename.endsWith('.csv') && !filename.endsWith('.tsv')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only .csv and .tsv files are accepted.' },
        { status: 400 },
      )
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File size exceeds limit. Maximum size is 50MB, but file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`,
        },
        { status: 413 },
      )
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Parse CSV
    const parsed = await parseCSV(buffer)

    // Create CSV upload record in database
    const [uploadRecord] = await db
      .insert(csvUploads)
      .values({
        locationId,
        filename: file.name,
        rowCount: parsed.totalRows,
        status: 'pending',
        fieldMapping: JSON.stringify({ headers: parsed.headers }),
      })
      .returning()

    // Store file for later processing
    await getUploadDir()
    try {
      await writeCSVFile(uploadRecord.id, buffer)
    } catch (error) {
      console.warn('Failed to store CSV file:', error)
      // Continue anyway - we have the preview data
    }

    return NextResponse.json(
      {
        uploadId: uploadRecord.id,
        filename: uploadRecord.filename,
        rowCount: parsed.totalRows,
        headers: parsed.headers,
        preview: parsed.rows,
        status: uploadRecord.status,
      },
      { status: 200 },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    // Check if it's a parsing error (typically indicates malformed CSV)
    if (
      message.includes('CSV parsing error') ||
      message.includes('Failed to parse CSV')
    ) {
      return NextResponse.json(
        { error: `Invalid CSV file: ${message}` },
        { status: 400 },
      )
    }

    console.error('CSV upload error:', error)
    return NextResponse.json(
      { error: 'Failed to process CSV file. Please try again.' },
      { status: 500 },
    )
  }
}
