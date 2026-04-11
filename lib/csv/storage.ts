/**
 * CSV file storage utilities
 * Runtime-only module for handling CSV file operations
 * This is deliberately separated to avoid Turbopack NFT tracing issues
 */

import /*turbopackIgnore: true*/ fs from 'fs/promises'
import /*turbopackIgnore: true*/ path from 'path'

/**
 * Get the CSV upload directory path
 * This is intentionally a runtime-only function to avoid build-time tracing
 */
function getUploadDir(): string {
  // Using a function to ensure this is evaluated at runtime, not build time
  return (
    process.env.CSV_UPLOAD_PATH || /*turbopackIgnore: true*/ '/tmp/csv-uploads'
  )
}

/**
 * Ensure upload directory exists
 */
export async function ensureUploadDir(): Promise<string> {
  const uploadDir = getUploadDir()
  try {
    await (fs.mkdir as any)(/*turbopackIgnore: true*/ uploadDir, {
      recursive: true,
    })
  } catch (error) {
    console.warn('Failed to create upload directory:', error)
  }
  return uploadDir
}

/**
 * Get the full file path for a CSV upload
 */
export async function getUploadFilePath(uploadId: string): Promise<string> {
  const uploadDir = getUploadDir()
  return path.join(/*turbopackIgnore: true*/ uploadDir, uploadId)
}

/**
 * Read CSV file buffer
 */
export async function readCSVFile(uploadId: string): Promise<Buffer> {
  const filePath = await getUploadFilePath(uploadId)
  return (fs.readFile as any)(/*turbopackIgnore: true*/ filePath)
}

/**
 * Write CSV file buffer
 */
export async function writeCSVFile(
  uploadId: string,
  buffer: Buffer,
): Promise<void> {
  const filePath = await getUploadFilePath(uploadId)
  await (fs.writeFile as any)(/*turbopackIgnore: true*/ filePath, buffer)
}

/**
 * Delete CSV file
 */
export async function deleteCSVFile(uploadId: string): Promise<void> {
  const filePath = await getUploadFilePath(uploadId)
  await (fs.unlink as any)(/*turbopackIgnore: true*/ filePath)
}
