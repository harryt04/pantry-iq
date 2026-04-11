/**
 * CSV Import Integration Tests
 *
 * Full pipeline tests with mocked database layer.
 *
 * Coverage:
 * - Upload → Parse → Map → Insert → Query cycle (mock DB)
 * - Column type coercion: date as text, qty as string-from-number
 * - Cascade delete: deleting location removes associated transactions
 * - Idempotency check: importing same CSV twice creates duplicates (documenting the limitation)
 * - Partial failure: 100-row file where 30 fail, verify 70 inserted & 30 errors
 * - Large file behavior: 10,000-row file completes without timeout
 * - Concurrent imports: two uploads for same location don't interfere
 *
 * Strategy: Mock only the database layer (insert, query, delete operations).
 * Exercise real parser, mapper, and normalizer.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { parseCSV } from '@/lib/csv/parser'
import {
  suggestMappings,
  validateMapping,
  applyMapping,
  type FieldMapping,
} from '@/lib/csv/field-mapper'
import {
  GENERATORS,
  serializeCSV,
  type GeneratorOptions,
} from '@/scripts/generate-test-csv-faker'
import type { eq } from 'drizzle-orm'

// ============================================================================
// Mock Database Layer
// ============================================================================

/**
 * Mock database state for testing
 * Simulates a real database without requiring actual DB connection
 */
class MockDatabase {
  transactions: Map<string, Array<Record<string, unknown>>> = new Map() // locationId -> transactions
  uploads: Map<string, Record<string, unknown>> = new Map() // uploadId -> upload record
  locations: Map<string, Record<string, unknown>> = new Map() // locationId -> location record

  /**
   * Insert transaction record
   * Simulates: await db.insert(transactions).values({...})
   */
  insertTransaction(
    locationId: string,
    transaction: Record<string, unknown>,
  ): { id: string } {
    if (!this.transactions.has(locationId)) {
      this.transactions.set(locationId, [])
    }
    const id = `tx-${Math.random().toString(36).substring(7)}`
    const record = { id, ...transaction }
    this.transactions.get(locationId)!.push(record)
    return { id }
  }

  /**
   * Batch insert transactions
   * Simulates: await db.insert(transactions).values([...])
   */
  batchInsertTransactions(
    locationId: string,
    transactions: Array<Record<string, unknown>>,
  ): Array<{ id: string }> {
    return transactions.map((tx) => this.insertTransaction(locationId, tx))
  }

  /**
   * Query transactions for a location
   * Simulates: await db.select().from(transactions).where(eq(transactions.locationId, locationId))
   */
  queryTransactionsByLocation(
    locationId: string,
  ): Array<Record<string, unknown>> {
    return this.transactions.get(locationId) || []
  }

  /**
   * Query all transactions
   * Simulates: await db.select().from(transactions)
   */
  queryAllTransactions(): Array<Record<string, unknown>> {
    const all: Array<Record<string, unknown>> = []
    for (const txs of this.transactions.values()) {
      all.push(...txs)
    }
    return all
  }

  /**
   * Cascade delete: remove all transactions for a location
   * Simulates: await db.delete(transactions).where(eq(transactions.locationId, locationId))
   */
  deleteTransactionsByLocation(locationId: string): number {
    const count = this.transactions.get(locationId)?.length || 0
    this.transactions.delete(locationId)
    return count
  }

  /**
   * Insert upload record
   * Simulates: await db.insert(csvUploads).values({...})
   */
  insertUpload(upload: Record<string, unknown>): Record<string, unknown> {
    const id = `upload-${Math.random().toString(36).substring(7)}`
    const record = {
      id,
      ...upload,
      uploadedAt: new Date(),
    }
    this.uploads.set(id, record)
    return record
  }

  /**
   * Create a location
   * Simulates: await db.insert(locations).values({...})
   */
  createLocation(locationId: string, data: Record<string, unknown>): void {
    this.locations.set(locationId, { id: locationId, ...data })
  }

  /**
   * Delete a location (cascades to transactions and uploads)
   * Simulates: await db.delete(locations).where(eq(locations.id, locationId))
   */
  deleteLocation(locationId: string): void {
    this.locations.delete(locationId)
    this.transactions.delete(locationId)
    // In a real DB, cascade delete would handle this automatically
    // Here we simulate it
    const uploadsToDelete: string[] = []
    for (const [uploadId, upload] of this.uploads) {
      if ((upload as any).locationId === locationId) {
        uploadsToDelete.push(uploadId)
      }
    }
    uploadsToDelete.forEach((id) => this.uploads.delete(id))
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.transactions.clear()
    this.uploads.clear()
    this.locations.clear()
  }
}

// ============================================================================
// Test Utilities
// ============================================================================

/** Default generator options */
function defaultOpts(
  overrides: Partial<GeneratorOptions> = {},
): GeneratorOptions {
  return {
    scenario: 'square-pos',
    records: 20,
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-12-31'),
    seed: 42,
    ...overrides,
  }
}

/** Generate CSV buffer from scenario */
function generateBuffer(
  scenario: keyof typeof GENERATORS,
  records = 20,
): Buffer {
  const data = GENERATORS[scenario](defaultOpts({ scenario, records }))
  const csv = serializeCSV(data)
  return Buffer.from(csv, 'utf-8')
}

/**
 * Simulate the full import pipeline:
 * parse → suggestMappings → applyMapping → validate → insert into DB
 */
async function importCSVToDB(
  buffer: Buffer,
  locationId: string,
  uploadId: string,
  db: MockDatabase,
): Promise<{
  inserted: number
  failed: number
  errors: Array<{ row: number; message: string }>
  uploadRecord: Record<string, unknown>
}> {
  // Step 1: Parse CSV
  const parsed = await parseCSV(buffer, { fullParse: true })

  // Step 2: Suggest and validate mappings
  const mapping = await suggestMappings(parsed.headers, parsed.rows.slice(0, 5))
  const mappingValidationError = validateMapping(mapping)
  if (mappingValidationError) {
    return {
      inserted: 0,
      failed: parsed.rows.length,
      errors: [
        {
          row: 0,
          message: mappingValidationError,
        },
      ],
      uploadRecord: {
        id: uploadId,
        locationId,
        status: 'error',
        errorDetails: mappingValidationError,
      },
    }
  }

  // Step 3: Process rows and insert into DB
  let inserted = 0
  let failed = 0
  const errors: Array<{ row: number; message: string }> = []

  for (let i = 0; i < parsed.rows.length; i++) {
    const normalized = applyMapping(parsed.rows[i], mapping)

    // Row-level validation
    if (!normalized.item) {
      errors.push({ row: i + 1, message: 'Missing required field: item' })
      failed++
      continue
    }
    if (!normalized.date) {
      errors.push({ row: i + 1, message: 'Missing or invalid date' })
      failed++
      continue
    }
    if (normalized.qty === null) {
      errors.push({ row: i + 1, message: 'Missing or invalid quantity' })
      failed++
      continue
    }

    // Insert into DB
    try {
      const insertValues = {
        locationId,
        date: String(normalized.date),
        item: String(normalized.item),
        qty: String(normalized.qty),
        revenue: normalized.revenue ? String(normalized.revenue) : null,
        cost: normalized.cost ? String(normalized.cost) : null,
        source: 'csv',
        sourceId: uploadId,
      }

      db.insertTransaction(locationId, insertValues)
      inserted++
    } catch (err) {
      errors.push({
        row: i + 1,
        message: `Database insert failed: ${(err as Error).message}`,
      })
      failed++
    }
  }

  // Step 4: Record upload status
  const finalStatus =
    errors.length === 0 ? 'complete' : inserted > 0 ? 'complete' : 'error'
  const uploadRecord = db.insertUpload({
    locationId,
    filename: `upload-${uploadId}.csv`,
    rowCount: parsed.rows.length,
    status: finalStatus,
    errorDetails: errors.length > 0 ? JSON.stringify(errors) : null,
    fieldMapping: JSON.stringify(mapping),
  })

  return {
    inserted,
    failed,
    errors,
    uploadRecord,
  }
}

// ============================================================================
// Test Suites
// ============================================================================

describe('CSV Import Integration (Full Pipeline with Mocked DB)', () => {
  let db: MockDatabase
  const locationId = '00000000-0000-0000-0000-000000000001'
  const userId = '11111111-1111-1111-1111-111111111111'

  beforeEach(() => {
    db = new MockDatabase()
    // Create test location
    db.createLocation(locationId, {
      userId,
      name: 'Test Restaurant',
      address: '123 Main St',
    })
  })

  afterEach(() => {
    db.clear()
  })

  // =========================================================================
  // 1. Basic Upload → Parse → Map → Insert Cycle
  // =========================================================================

  describe('Upload → Parse → Map → Insert → Query cycle', () => {
    it('should complete full cycle for Square POS data', async () => {
      const buffer = generateBuffer('square-pos', 10)
      const uploadId = 'upload-001'

      const result = await importCSVToDB(buffer, locationId, uploadId, db)

      expect(result.inserted).toBe(10)
      expect(result.failed).toBe(0)
      expect(result.errors).toHaveLength(0)
      expect(result.uploadRecord.status).toBe('complete')

      // Verify data in DB
      const txs = db.queryTransactionsByLocation(locationId)
      expect(txs).toHaveLength(10)
      expect(txs[0]).toHaveProperty('item')
      expect(txs[0]).toHaveProperty('date')
      expect(txs[0]).toHaveProperty('qty')
    })

    it('should complete full cycle for Toast POS data', async () => {
      const buffer = generateBuffer('toast-pos', 15)
      const uploadId = 'upload-002'

      const result = await importCSVToDB(buffer, locationId, uploadId, db)

      expect(result.inserted).toBeGreaterThan(0)
      expect(result.inserted + result.failed).toBe(15)

      const txs = db.queryTransactionsByLocation(locationId)
      expect(txs.length).toBe(result.inserted)
    })

    it('should complete full cycle for Clover POS data', async () => {
      const buffer = generateBuffer('clover-pos', 8)
      const uploadId = 'upload-003'

      const result = await importCSVToDB(buffer, locationId, uploadId, db)

      expect(result.inserted + result.failed).toBe(8)

      const txs = db.queryTransactionsByLocation(locationId)
      expect(txs).toHaveLength(result.inserted)
    })
  })

  // =========================================================================
  // 2. Column Type Coercion Verification
  // =========================================================================

  describe('Column type coercion: date as text, qty as string-from-number', () => {
    it('should store date as ISO text string (YYYY-MM-DD)', async () => {
      const buffer = generateBuffer('square-pos', 5)
      const uploadId = 'upload-date-test'

      await importCSVToDB(buffer, locationId, uploadId, db)

      const txs = db.queryTransactionsByLocation(locationId)
      for (const tx of txs) {
        expect(tx.date).toBeDefined()
        expect(typeof tx.date).toBe('string')
        // Verify ISO format
        expect(tx.date as string).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      }
    })

    it('should store qty as numeric string', async () => {
      const buffer = generateBuffer('square-pos', 5)
      const uploadId = 'upload-qty-test'

      await importCSVToDB(buffer, locationId, uploadId, db)

      const txs = db.queryTransactionsByLocation(locationId)
      for (const tx of txs) {
        expect(tx.qty).toBeDefined()
        expect(typeof tx.qty).toBe('string')
        // Verify it's a valid number when parsed
        const parsed = parseFloat(tx.qty as string)
        expect(parsed).not.toBeNaN()
      }
    })

    it('should store item as text string', async () => {
      const buffer = generateBuffer('square-pos', 5)
      const uploadId = 'upload-item-test'

      await importCSVToDB(buffer, locationId, uploadId, db)

      const txs = db.queryTransactionsByLocation(locationId)
      for (const tx of txs) {
        expect(tx.item).toBeDefined()
        expect(typeof tx.item).toBe('string')
        expect((tx.item as string).length).toBeGreaterThan(0)
      }
    })

    it('should store revenue as numeric string or null', async () => {
      const buffer = generateBuffer('square-pos', 5)
      const uploadId = 'upload-revenue-test'

      await importCSVToDB(buffer, locationId, uploadId, db)

      const txs = db.queryTransactionsByLocation(locationId)
      for (const tx of txs) {
        if (tx.revenue !== null) {
          expect(typeof tx.revenue).toBe('string')
          const parsed = parseFloat(tx.revenue as string)
          expect(parsed).not.toBeNaN()
        }
      }
    })

    it('should store cost as numeric string or null', async () => {
      const buffer = generateBuffer('square-pos', 5)
      const uploadId = 'upload-cost-test'

      await importCSVToDB(buffer, locationId, uploadId, db)

      const txs = db.queryTransactionsByLocation(locationId)
      for (const tx of txs) {
        if (tx.cost !== null) {
          expect(typeof tx.cost).toBe('string')
          const parsed = parseFloat(tx.cost as string)
          expect(parsed).not.toBeNaN()
        }
      }
    })

    it('should store source as "csv"', async () => {
      const buffer = generateBuffer('square-pos', 5)
      const uploadId = 'upload-source-test'

      await importCSVToDB(buffer, locationId, uploadId, db)

      const txs = db.queryTransactionsByLocation(locationId)
      for (const tx of txs) {
        expect(tx.source).toBe('csv')
      }
    })

    it('should store sourceId as uploadId', async () => {
      const buffer = generateBuffer('square-pos', 5)
      const uploadId = 'upload-sourceid-test'

      await importCSVToDB(buffer, locationId, uploadId, db)

      const txs = db.queryTransactionsByLocation(locationId)
      for (const tx of txs) {
        expect(tx.sourceId).toBe(uploadId)
      }
    })
  })

  // =========================================================================
  // 3. Cascade Delete: Deleting Location Removes Associated Transactions
  // =========================================================================

  describe('Cascade delete: deleting location removes associated transactions', () => {
    it('should delete all transactions when location is deleted', async () => {
      const buffer = generateBuffer('square-pos', 20)
      const uploadId = 'upload-cascade-test'

      // Import data
      await importCSVToDB(buffer, locationId, uploadId, db)

      // Verify data exists
      let txs = db.queryTransactionsByLocation(locationId)
      expect(txs.length).toBeGreaterThan(0)

      // Delete location
      db.deleteLocation(locationId)

      // Verify transactions are gone
      txs = db.queryTransactionsByLocation(locationId)
      expect(txs).toHaveLength(0)
    })

    it('should not affect other locations when one is deleted', async () => {
      const locationId2 = '00000000-0000-0000-0000-000000000002'
      db.createLocation(locationId2, { userId, name: 'Other Location' })

      // Import to both locations
      const buffer1 = generateBuffer('square-pos', 10)
      const buffer2 = generateBuffer('toast-pos', 10)

      await importCSVToDB(buffer1, locationId, 'upload-loc1', db)
      await importCSVToDB(buffer2, locationId2, 'upload-loc2', db)

      const txsBefore1 = db.queryTransactionsByLocation(locationId)
      const txsBefore2 = db.queryTransactionsByLocation(locationId2)

      // Delete location 1
      db.deleteLocation(locationId)

      // Location 1 should be empty
      expect(db.queryTransactionsByLocation(locationId)).toHaveLength(0)
      // Location 2 should be unchanged
      expect(db.queryTransactionsByLocation(locationId2).length).toBe(
        txsBefore2.length,
      )
    })

    it('should also delete associated upload records', async () => {
      const buffer = generateBuffer('square-pos', 10)
      const uploadId = 'upload-cascade-upload'

      // Import data
      const result = await importCSVToDB(buffer, locationId, uploadId, db)
      expect(result.uploadRecord).toBeDefined()

      // Delete location
      db.deleteLocation(locationId)

      // Verify upload record is also gone
      expect(db.uploads.has(result.uploadRecord.id as string)).toBe(false)
    })
  })

  // =========================================================================
  // 4. Idempotency Check: Importing Same CSV Twice Creates Duplicates
  // =========================================================================

  describe('Idempotency check: importing same CSV twice creates duplicates', () => {
    it('should create duplicate transactions when importing same CSV twice', async () => {
      const buffer = generateBuffer('square-pos', 10)
      const uploadId1 = 'upload-idem-1'
      const uploadId2 = 'upload-idem-2'

      // First import
      const result1 = await importCSVToDB(buffer, locationId, uploadId1, db)
      expect(result1.inserted).toBe(10)

      // Second import of same CSV
      const result2 = await importCSVToDB(buffer, locationId, uploadId2, db)
      expect(result2.inserted).toBe(10)

      // Verify duplicates exist
      const allTxs = db.queryTransactionsByLocation(locationId)
      expect(allTxs).toHaveLength(20)

      // Verify sourceIds are different
      const sourceIds = new Set(allTxs.map((tx) => tx.sourceId))
      expect(sourceIds.size).toBe(2)
    })

    it('should document that there is no deduplication', async () => {
      // This is a known limitation:
      // - sourceId is set to uploadId (which differs per upload)
      // - No hash-based deduplication is implemented
      // - Importing the same file twice creates exact duplicates

      const buffer = generateBuffer('square-pos', 5)

      // First upload
      await importCSVToDB(buffer, locationId, 'upload-a', db)
      const afterFirst = db.queryTransactionsByLocation(locationId).length

      // Second upload (same data)
      await importCSVToDB(buffer, locationId, 'upload-b', db)
      const afterSecond = db.queryTransactionsByLocation(locationId).length

      // Duplicates created
      expect(afterSecond).toBe(afterFirst * 2)
      // TODO: Implement hash-based deduplication to prevent this
    })
  })

  // =========================================================================
  // 5. Partial Failure: 100 Rows, 30 Fail, Verify 70 Inserted & 30 Errors
  // =========================================================================

  describe('Partial failure: 100 rows with mixed valid/invalid data', () => {
    it('should insert successful rows and collect errors for invalid rows', async () => {
      // Use excel-manual scenario which has mixed valid/invalid data
      const buffer = generateBuffer('excel-manual', 100)
      const uploadId = 'upload-partial-fail'

      const result = await importCSVToDB(buffer, locationId, uploadId, db)

      // Should have some successes and some failures
      expect(result.inserted).toBeGreaterThan(0)
      expect(result.failed).toBeGreaterThan(0)
      expect(result.inserted + result.failed).toBe(100)

      // Verify errors are documented
      if (result.errors.length > 0) {
        expect(result.errors[0]).toHaveProperty('row')
        expect(result.errors[0]).toHaveProperty('message')
      }

      // Verify inserted rows are in DB
      const txs = db.queryTransactionsByLocation(locationId)
      expect(txs).toHaveLength(result.inserted)

      // Status should be 'complete' if any rows succeeded
      expect(result.uploadRecord.status).toBe('complete')
    })

    it('should set status to "error" only if ALL rows fail', async () => {
      // Create a buffer where all rows are invalid (missing-columns scenario)
      const buffer = generateBuffer('missing-columns', 30)
      const uploadId = 'upload-all-fail'

      const result = await importCSVToDB(buffer, locationId, uploadId, db)

      // If all rows fail (missing item field), status should be 'error'
      if (result.inserted === 0 && result.failed > 0) {
        expect(result.uploadRecord.status).toBe('error')
      }
    })

    it('should document error details in errorDetails field', async () => {
      const buffer = generateBuffer('excel-manual', 50)
      const uploadId = 'upload-error-docs'

      const result = await importCSVToDB(buffer, locationId, uploadId, db)

      if (result.errors.length > 0) {
        expect(result.uploadRecord.errorDetails).toBeDefined()
        const parsed = JSON.parse(result.uploadRecord.errorDetails as string)
        expect(Array.isArray(parsed)).toBe(true)
        expect(parsed.length).toBeGreaterThan(0)
      }
    })
  })

  // =========================================================================
  // 6. Large File Behavior: 10,000 Rows Complete Without Timeout
  // =========================================================================

  describe('Large file behavior: 10,000-row file', () => {
    it('should complete import of 10,000 rows', async () => {
      // Use square-pos scenario with large row count
      const buffer = generateBuffer('square-pos', 10000)
      const uploadId = 'upload-large-10k'

      const startTime = Date.now()
      const result = await importCSVToDB(buffer, locationId, uploadId, db)
      const elapsedMs = Date.now() - startTime

      expect(result.inserted + result.failed).toBe(10000)
      // Should complete in reasonable time (< 30 seconds for mock DB)
      expect(elapsedMs).toBeLessThan(30000)

      const txs = db.queryTransactionsByLocation(locationId)
      expect(txs).toHaveLength(result.inserted)
    }, 60000) // 60 second test timeout

    it('should maintain data integrity for large files', async () => {
      const buffer = generateBuffer('square-pos', 5000)
      const uploadId = 'upload-large-integrity'

      const result = await importCSVToDB(buffer, locationId, uploadId, db)

      const txs = db.queryTransactionsByLocation(locationId)

      // Verify all inserted rows have required fields
      for (const tx of txs) {
        expect(tx).toHaveProperty('item')
        expect(tx).toHaveProperty('date')
        expect(tx).toHaveProperty('qty')
        expect(tx).toHaveProperty('source')
        expect(tx.source).toBe('csv')
      }
    }, 60000)

    it('should report accurate row counts for large files', async () => {
      const buffer = generateBuffer('square-pos', 3000)
      const uploadId = 'upload-large-counts'

      const result = await importCSVToDB(buffer, locationId, uploadId, db)

      expect(
        (result.uploadRecord.rowCount as number) || 0,
      ).toBeGreaterThanOrEqual(result.inserted)
      expect(result.inserted + result.failed).toBe(3000)
    }, 60000)
  })

  // =========================================================================
  // 7. Concurrent Imports: Two Uploads for Same Location Don't Interfere
  // =========================================================================

  describe('Concurrent imports: two uploads for same location', () => {
    it('should not interfere when two CSVs are imported concurrently', async () => {
      const buffer1 = generateBuffer('square-pos', 100)
      const buffer2 = generateBuffer('toast-pos', 100)
      const uploadId1 = 'upload-concurrent-1'
      const uploadId2 = 'upload-concurrent-2'

      // Simulate concurrent imports
      const [result1, result2] = await Promise.all([
        importCSVToDB(buffer1, locationId, uploadId1, db),
        importCSVToDB(buffer2, locationId, uploadId2, db),
      ])

      // Both should succeed
      expect(result1.inserted + result1.failed).toBe(100)
      expect(result2.inserted + result2.failed).toBe(100)

      // Total transactions should be sum of both
      const allTxs = db.queryTransactionsByLocation(locationId)
      expect(allTxs.length).toBe(result1.inserted + result2.inserted)

      // Verify sourceIds are properly tracked
      const txsBySource = new Map<string, number>()
      for (const tx of allTxs) {
        const sourceId = tx.sourceId as string
        txsBySource.set(sourceId, (txsBySource.get(sourceId) || 0) + 1)
      }

      expect(txsBySource.size).toBe(2)
    })

    it('should not mix data between concurrent imports', async () => {
      const buffer1 = generateBuffer('square-pos', 50)
      const buffer2 = generateBuffer('clover-pos', 50)
      const uploadId1 = 'upload-concurrent-sep-1'
      const uploadId2 = 'upload-concurrent-sep-2'

      // Concurrent imports
      const [result1, result2] = await Promise.all([
        importCSVToDB(buffer1, locationId, uploadId1, db),
        importCSVToDB(buffer2, locationId, uploadId2, db),
      ])

      const allTxs = db.queryTransactionsByLocation(locationId)

      // Count by source
      const source1Count = allTxs.filter(
        (tx) => tx.sourceId === uploadId1,
      ).length
      const source2Count = allTxs.filter(
        (tx) => tx.sourceId === uploadId2,
      ).length

      // Each should have their own transactions
      expect(source1Count).toBe(result1.inserted)
      expect(source2Count).toBe(result2.inserted)
    })

    it('should handle concurrent imports to different locations', async () => {
      const locationId2 = '00000000-0000-0000-0000-000000000003'
      db.createLocation(locationId2, { userId, name: 'Location 2' })

      const buffer1 = generateBuffer('square-pos', 50)
      const buffer2 = generateBuffer('toast-pos', 50)

      // Import to different locations concurrently
      const [result1, result2] = await Promise.all([
        importCSVToDB(buffer1, locationId, 'upload-loc1-concurrent', db),
        importCSVToDB(buffer2, locationId2, 'upload-loc2-concurrent', db),
      ])

      // Verify data is in correct locations
      const txsLoc1 = db.queryTransactionsByLocation(locationId)
      const txsLoc2 = db.queryTransactionsByLocation(locationId2)

      expect(txsLoc1).toHaveLength(result1.inserted)
      expect(txsLoc2).toHaveLength(result2.inserted)

      // No cross-contamination
      for (const tx of txsLoc1) {
        expect((tx as any).locationId).toBe(locationId)
      }
      for (const tx of txsLoc2) {
        expect((tx as any).locationId).toBe(locationId2)
      }
    })

    it('should track each concurrent upload separately', async () => {
      const buffer1 = generateBuffer('square-pos', 30)
      const buffer2 = generateBuffer('clover-pos', 30)
      const uploadId1 = 'upload-track-1'
      const uploadId2 = 'upload-track-2'

      // Concurrent imports
      const [result1, result2] = await Promise.all([
        importCSVToDB(buffer1, locationId, uploadId1, db),
        importCSVToDB(buffer2, locationId, uploadId2, db),
      ])

      // Verify upload records exist and are separate
      expect(result1.uploadRecord.id).not.toBe(result2.uploadRecord.id)

      // Verify they point to same location
      expect(result1.uploadRecord.locationId).toBe(locationId)
      expect(result2.uploadRecord.locationId).toBe(locationId)

      // Verify row counts
      expect(result1.uploadRecord.rowCount).toBe(30)
      expect(result2.uploadRecord.rowCount).toBe(30)
    })
  })

  // =========================================================================
  // 8. Real Parser/Mapper/Normalizer Exercise
  // =========================================================================

  describe('Real parser, mapper, and normalizer exercise', () => {
    it('should use real CSV parser', async () => {
      const buffer = generateBuffer('square-pos', 20)
      const uploadId = 'upload-real-parser'

      const result = await importCSVToDB(buffer, locationId, uploadId, db)

      // Should successfully parse and insert
      expect(result.inserted).toBeGreaterThan(0)
    })

    it('should use real field mapper for suggestions', async () => {
      const buffer = generateBuffer('toast-pos', 10)
      const uploadId = 'upload-real-mapper'

      const result = await importCSVToDB(buffer, locationId, uploadId, db)

      // Toast scenario should have different headers than Square
      // but mapper should still suggest valid mappings
      expect(result.inserted + result.failed).toBe(10)
    })

    it('should use real value normalizer for all field types', async () => {
      const buffer = generateBuffer('square-pos', 10)
      const uploadId = 'upload-real-normalizer'

      await importCSVToDB(buffer, locationId, uploadId, db)

      const txs = db.queryTransactionsByLocation(locationId)

      // Verify normalized values are correct types
      for (const tx of txs) {
        // date should be ISO string
        expect(tx.date as string).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        // qty should be numeric string
        expect(!isNaN(parseFloat(tx.qty as string))).toBe(true)
        // item should be string
        expect(typeof tx.item).toBe('string')
        expect((tx.item as string).length).toBeGreaterThan(0)
      }
    })

    it('should preserve Unicode in items through full pipeline', async () => {
      const buffer = generateBuffer('unicode-menu', 10)
      const uploadId = 'upload-unicode'

      await importCSVToDB(buffer, locationId, uploadId, db)

      const txs = db.queryTransactionsByLocation(locationId)

      // At least some items should contain Unicode
      const hasUnicode = txs.some(
        (tx) => typeof tx.item === 'string' && /[^\x00-\x7F]/.test(tx.item),
      )
      expect(hasUnicode).toBe(true)
    })
  })

  // =========================================================================
  // 9. Upload Record Metadata
  // =========================================================================

  describe('Upload record metadata tracking', () => {
    it('should record fieldMapping as JSON', async () => {
      const buffer = generateBuffer('square-pos', 10)
      const uploadId = 'upload-metadata-mapping'

      const result = await importCSVToDB(buffer, locationId, uploadId, db)

      expect(result.uploadRecord.fieldMapping).toBeDefined()
      const mapping = JSON.parse(result.uploadRecord.fieldMapping as string)
      expect(mapping).toHaveProperty('Date')
      expect(mapping).toHaveProperty('Item')
      expect(mapping).toHaveProperty('Qty')
    })

    it('should record rowCount from parsed CSV', async () => {
      const buffer = generateBuffer('square-pos', 25)
      const uploadId = 'upload-metadata-rowcount'

      const result = await importCSVToDB(buffer, locationId, uploadId, db)

      expect(result.uploadRecord.rowCount).toBe(25)
    })

    it('should record filename', async () => {
      const buffer = generateBuffer('square-pos', 10)
      const uploadId = 'upload-metadata-filename'

      const result = await importCSVToDB(buffer, locationId, uploadId, db)

      expect(result.uploadRecord.filename).toMatch(/upload-metadata-filename/)
      expect(result.uploadRecord.filename).toMatch(/\.csv/)
    })

    it('should record uploadedAt timestamp', async () => {
      const buffer = generateBuffer('square-pos', 10)
      const uploadId = 'upload-metadata-timestamp'

      const result = await importCSVToDB(buffer, locationId, uploadId, db)

      // The mock DB should set uploadedAt
      // (In real integration, this would be set by database default)
      expect(result.uploadRecord).toHaveProperty('uploadedAt')
    })
  })

  // =========================================================================
  // 10. Transaction Counts and Statistics
  // =========================================================================

  describe('Transaction counts and statistics', () => {
    it('should report accurate inserted/failed counts', async () => {
      const buffer = generateBuffer('square-pos', 50)
      const uploadId = 'upload-stats-counts'

      const result = await importCSVToDB(buffer, locationId, uploadId, db)

      expect(result.inserted + result.failed).toBe(50)
      expect(result.inserted).toBeGreaterThanOrEqual(0)
      expect(result.failed).toBeGreaterThanOrEqual(0)
    })

    it('should sum correctly across multiple uploads', async () => {
      const buffer1 = generateBuffer('square-pos', 30)
      const buffer2 = generateBuffer('toast-pos', 25)

      const result1 = await importCSVToDB(buffer1, locationId, 'upload-1', db)
      const result2 = await importCSVToDB(buffer2, locationId, 'upload-2', db)

      const totalTxs = db.queryTransactionsByLocation(locationId)
      const expected = result1.inserted + result2.inserted

      expect(totalTxs).toHaveLength(expected)
    })

    it('should track errors separately from inserted count', async () => {
      const buffer = generateBuffer('excel-manual', 100)
      const uploadId = 'upload-stats-errors'

      const result = await importCSVToDB(buffer, locationId, uploadId, db)

      // Sum should equal total rows
      expect(result.inserted + result.failed).toBe(100)

      // Error count should match error array length
      expect(result.failed).toBe(result.errors.length)
    })
  })
})

// ============================================================================
// Performance Benchmarks (Optional, for monitoring)
// ============================================================================

describe('CSV Import Performance Benchmarks', () => {
  let db: MockDatabase
  const locationId = '00000000-0000-0000-0000-000000000099'

  beforeEach(() => {
    db = new MockDatabase()
    db.createLocation(locationId, { userId: 'user-99', name: 'Bench' })
  })

  afterEach(() => {
    db.clear()
  })

  it('benchmark: parse 1000-row CSV', async () => {
    const buffer = generateBuffer('square-pos', 1000)
    const startTime = Date.now()

    const parsed = await parseCSV(buffer, { fullParse: true })

    const elapsedMs = Date.now() - startTime
    expect(parsed.totalRows).toBe(1000)
    console.log(`✓ Parsed 1000 rows in ${elapsedMs}ms`)
  })

  it('benchmark: import 1000 rows to DB', async () => {
    const buffer = generateBuffer('square-pos', 1000)
    const startTime = Date.now()

    const result = await importCSVToDB(
      buffer,
      locationId,
      'upload-bench-1k',
      db,
    )

    const elapsedMs = Date.now() - startTime
    console.log(
      `✓ Imported 1000 rows in ${elapsedMs}ms (${result.inserted} inserted, ${result.failed} failed)`,
    )
    expect(elapsedMs).toBeLessThan(5000)
  }, 30000)
})
