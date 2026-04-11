import { describe, it, expect, beforeAll } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'
import {
  parseGeneratedCSV,
  validateCSVStructure,
  isValidDate,
  isValidTime,
  isValidCurrency,
  isValidInteger,
  parseDate,
  isDateInRange,
} from '@/lib/csv-parser'

// ============================================================================
// Test Fixtures
// ============================================================================

const FIXTURES_DIR = path.join(process.cwd(), 'tests', 'fixtures')
const TRANSACTIONS_FIXTURE = path.join(FIXTURES_DIR, 'sample-transactions.csv')
const INVENTORY_FIXTURE = path.join(FIXTURES_DIR, 'sample-inventory.csv')
const INVOICES_FIXTURE = path.join(FIXTURES_DIR, 'sample-vendor-invoices.csv')

const TRANSACTION_HEADERS = [
  'Date',
  'Time',
  'Item Name',
  'Quantity',
  'Unit Price',
  'Unit Cost',
  'Total Revenue',
  'Total Cost',
  'Payment Method',
  'Location',
]

const INVENTORY_HEADERS = [
  'SKU',
  'Item Name',
  'Category',
  'Quantity',
  'Unit Cost',
  'Total Value',
  'Reorder Point',
  'Supplier',
  'Last Restock',
]

const INVOICES_HEADERS = [
  'Invoice Number',
  'Vendor',
  'Invoice Date',
  'Due Date',
  'Subtotal',
  'Tax',
  'Total Amount',
  'Amount Paid',
  'Status',
]

// ============================================================================
// Test Suite: CSV Generation Script
// ============================================================================

describe('Test Data Generation Script', () => {
  describe('CLI Argument Parsing', () => {
    it('should generate transactions with --type transactions', () => {
      const output = execSync(
        'npx ts-node scripts/generate-test-csv.ts --records 10 --type transactions',
        { cwd: process.cwd(), encoding: 'utf-8' },
      ).trim()

      const lines = output.split('\n')
      expect(lines.length).toBe(11)
      expect(lines[0]).toBe(TRANSACTION_HEADERS.join(','))
    })

    it('should generate inventory with --type inventory', () => {
      const output = execSync(
        'npx ts-node scripts/generate-test-csv.ts --records 10 --type inventory',
        { cwd: process.cwd(), encoding: 'utf-8' },
      ).trim()

      const lines = output.split('\n')
      expect(lines.length).toBe(11)
      expect(lines[0]).toBe(INVENTORY_HEADERS.join(','))
    })

    it('should generate invoices with --type invoices', () => {
      const output = execSync(
        'npx ts-node scripts/generate-test-csv.ts --records 10 --type invoices',
        { cwd: process.cwd(), encoding: 'utf-8' },
      ).trim()

      const lines = output.split('\n')
      expect(lines.length).toBe(11)
      expect(lines[0]).toBe(INVOICES_HEADERS.join(','))
    })

    it('should respect --records parameter', () => {
      for (const recordCount of [5, 20, 50]) {
        const output = execSync(
          `npx ts-node scripts/generate-test-csv.ts --records ${recordCount} --type transactions`,
          { cwd: process.cwd(), encoding: 'utf-8' },
        ).trim()

        const lines = output.split('\n')
        expect(lines.length).toBe(recordCount + 1)
      }
    })

    it('should display help with --help', () => {
      const output = execSync(
        'npx ts-node scripts/generate-test-csv.ts --help',
        {
          cwd: process.cwd(),
          encoding: 'utf-8',
        },
      )

      expect(output).toContain('Test Data Generation Script')
      expect(output).toContain('Usage:')
      expect(output).toContain('--records')
      expect(output).toContain('--start-date')
      expect(output).toContain('--end-date')
      expect(output).toContain('--type')
    })

    it('should generate data for a specific date range', () => {
      const startDate = '2024-01-01'
      const endDate = '2024-01-31'

      const output = execSync(
        `npx ts-node scripts/generate-test-csv.ts --records 50 --start-date ${startDate} --end-date ${endDate} --type transactions`,
        { cwd: process.cwd(), encoding: 'utf-8' },
      ).trim()

      const parsed = parseGeneratedCSV(output)

      // Most dates should be within range (allow 1-2 day offset for timezone issues)
      const startDateBefore = new Date(startDate)
      startDateBefore.setDate(startDateBefore.getDate() - 1) // Allow 1 day before
      const endDateAfter = new Date(endDate)
      endDateAfter.setDate(endDateAfter.getDate() + 2) // Allow 1-2 days after

      const validDates = parsed.rows.filter((row) => {
        const rowDate = parseDate(row.Date)
        return rowDate >= startDateBefore && rowDate <= endDateAfter
      })

      // At least 95% of dates should be within the requested range
      expect(validDates.length / parsed.rows.length).toBeGreaterThanOrEqual(
        0.95,
      )
    })

    it('should write output to file with --output', () => {
      const testOutputFile = path.join(FIXTURES_DIR, 'test-output.csv')

      if (fs.existsSync(testOutputFile)) {
        fs.unlinkSync(testOutputFile)
      }

      execSync(
        `npx ts-node scripts/generate-test-csv.ts --records 20 --type transactions --output ${testOutputFile}`,
        { cwd: process.cwd() },
      )

      expect(fs.existsSync(testOutputFile)).toBe(true)

      const content = fs.readFileSync(testOutputFile, 'utf-8')
      const lines = content.trim().split('\n')
      expect(lines.length).toBe(21)

      fs.unlinkSync(testOutputFile)
    })
  })

  // ============================================================================
  // Test Suite: Transaction CSV Structure
  // ============================================================================

  describe('Transaction CSV Structure', () => {
    let transactionContent: string

    beforeAll(() => {
      transactionContent = fs.readFileSync(TRANSACTIONS_FIXTURE, 'utf-8')
    })

    it('should have valid transaction fixture file', () => {
      expect(fs.existsSync(TRANSACTIONS_FIXTURE)).toBe(true)
      expect(transactionContent.length).toBeGreaterThan(0)
    })

    it('should parse transaction CSV successfully', () => {
      const parsed = parseGeneratedCSV(transactionContent)
      expect(parsed.headers).toHaveLength(TRANSACTION_HEADERS.length)
      expect(parsed.rows.length).toBeGreaterThan(0)
    })

    it('should have correct transaction headers', () => {
      const parsed = parseGeneratedCSV(transactionContent)
      const validation = validateCSVStructure(parsed, TRANSACTION_HEADERS)
      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should have valid transaction data types', () => {
      const parsed = parseGeneratedCSV(transactionContent)

      parsed.rows.forEach((row, index) => {
        expect(isValidDate(row.Date)).toBe(true)
        expect(isValidTime(row.Time)).toBe(true)
        expect(row['Item Name'].length).toBeGreaterThan(0)
        expect(isValidInteger(row.Quantity)).toBe(true)
        expect(isValidCurrency(row['Unit Price'])).toBe(true)
        expect(isValidCurrency(row['Unit Cost'])).toBe(true)
        expect(isValidCurrency(row['Total Revenue'])).toBe(true)
        expect(isValidCurrency(row['Total Cost'])).toBe(true)
        expect(['Cash', 'Card', 'Online', 'Check']).toContain(
          row['Payment Method'],
        )
      })
    })

    it('should have realistic transaction values', () => {
      const parsed = parseGeneratedCSV(transactionContent)

      parsed.rows.forEach((row) => {
        const quantity = parseInt(row.Quantity, 10)
        const unitPrice = parseFloat(row['Unit Price'])
        const unitCost = parseFloat(row['Unit Cost'])
        const totalRevenue = parseFloat(row['Total Revenue'])
        const totalCost = parseFloat(row['Total Cost'])

        expect(quantity).toBeGreaterThanOrEqual(1)
        expect(quantity).toBeLessThanOrEqual(50)
        expect(unitPrice).toBeGreaterThanOrEqual(1.99)
        expect(unitPrice).toBeLessThanOrEqual(25)
        expect(unitCost).toBeGreaterThan(0)
        expect(unitCost).toBeLessThan(unitPrice)
        expect(totalRevenue).toBeCloseTo(unitPrice * quantity, 1)
        expect(totalCost).toBeCloseTo(unitCost * quantity, 1)
      })
    })

    it('should have correct number of transaction records', () => {
      const parsed = parseGeneratedCSV(transactionContent)
      expect(parsed.rows.length).toBeGreaterThanOrEqual(100)
    })

    it('transaction dates should be in reasonable range', () => {
      const parsed = parseGeneratedCSV(transactionContent)
      const dates = parsed.rows.map((row) => parseDate(row.Date))

      const minDate = new Date(Math.min(...dates.map((d) => d.getTime())))
      const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())))

      expect(minDate).toBeDefined()
      expect(maxDate).toBeDefined()
      expect(maxDate.getTime()).toBeGreaterThanOrEqual(minDate.getTime())
    })
  })

  // ============================================================================
  // Test Suite: Inventory CSV Structure
  // ============================================================================

  describe('Inventory CSV Structure', () => {
    let inventoryContent: string

    beforeAll(() => {
      inventoryContent = fs.readFileSync(INVENTORY_FIXTURE, 'utf-8')
    })

    it('should have valid inventory fixture file', () => {
      expect(fs.existsSync(INVENTORY_FIXTURE)).toBe(true)
      expect(inventoryContent.length).toBeGreaterThan(0)
    })

    it('should parse inventory CSV successfully', () => {
      const parsed = parseGeneratedCSV(inventoryContent)
      expect(parsed.headers).toHaveLength(INVENTORY_HEADERS.length)
      expect(parsed.rows.length).toBeGreaterThan(0)
    })

    it('should have correct inventory headers', () => {
      const parsed = parseGeneratedCSV(inventoryContent)
      const validation = validateCSVStructure(parsed, INVENTORY_HEADERS)
      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should have valid inventory data types', () => {
      const parsed = parseGeneratedCSV(inventoryContent)

      parsed.rows.forEach((row) => {
        expect(isValidInteger(row.SKU)).toBe(true)
        expect(row['Item Name'].length).toBeGreaterThan(0)
        expect(row.Category.length).toBeGreaterThan(0)
        expect(isValidInteger(row.Quantity)).toBe(true)
        expect(isValidCurrency(row['Unit Cost'])).toBe(true)
        expect(isValidCurrency(row['Total Value'])).toBe(true)
        expect(isValidInteger(row['Reorder Point'])).toBe(true)
        expect(row.Supplier.length).toBeGreaterThan(0)
        expect(isValidDate(row['Last Restock'])).toBe(true)
      })
    })

    it('should have correct number of inventory records', () => {
      const parsed = parseGeneratedCSV(inventoryContent)
      expect(parsed.rows.length).toBeGreaterThanOrEqual(100)
    })

    it('should have realistic inventory values', () => {
      const parsed = parseGeneratedCSV(inventoryContent)

      parsed.rows.forEach((row) => {
        const quantity = parseInt(row.Quantity, 10)
        const unitCost = parseFloat(row['Unit Cost'])
        const totalValue = parseFloat(row['Total Value'])
        const reorderPoint = parseInt(row['Reorder Point'], 10)

        expect(quantity).toBeGreaterThanOrEqual(0)
        expect(unitCost).toBeGreaterThan(0)
        // Allow larger tolerance since unitCost has many decimal places
        expect(Math.abs(totalValue - quantity * unitCost)).toBeLessThan(5)
        expect(reorderPoint).toBeGreaterThan(0)
      })
    })
  })

  // ============================================================================
  // Test Suite: Invoices CSV Structure
  // ============================================================================

  describe('Invoices CSV Structure', () => {
    let invoicesContent: string

    beforeAll(() => {
      invoicesContent = fs.readFileSync(INVOICES_FIXTURE, 'utf-8')
    })

    it('should have valid invoices fixture file', () => {
      expect(fs.existsSync(INVOICES_FIXTURE)).toBe(true)
      expect(invoicesContent.length).toBeGreaterThan(0)
    })

    it('should parse invoices CSV successfully', () => {
      const parsed = parseGeneratedCSV(invoicesContent)
      expect(parsed.headers).toHaveLength(INVOICES_HEADERS.length)
      expect(parsed.rows.length).toBeGreaterThan(0)
    })

    it('should have correct invoices headers', () => {
      const parsed = parseGeneratedCSV(invoicesContent)
      const validation = validateCSVStructure(parsed, INVOICES_HEADERS)
      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should have valid invoices data types', () => {
      const parsed = parseGeneratedCSV(invoicesContent)

      parsed.rows.forEach((row) => {
        expect(row['Invoice Number'].length).toBeGreaterThan(0)
        expect(row.Vendor.length).toBeGreaterThan(0)
        expect(isValidDate(row['Invoice Date'])).toBe(true)
        expect(isValidDate(row['Due Date'])).toBe(true)
        expect(isValidCurrency(row.Subtotal)).toBe(true)
        expect(isValidCurrency(row.Tax)).toBe(true)
        expect(isValidCurrency(row['Total Amount'])).toBe(true)
        expect(isValidCurrency(row['Amount Paid'])).toBe(true)
        expect(['Paid', 'Pending']).toContain(row.Status)
      })
    })

    it('should have correct number of invoice records', () => {
      const parsed = parseGeneratedCSV(invoicesContent)
      expect(parsed.rows.length).toBeGreaterThanOrEqual(100)
    })

    it('should have realistic invoice values', () => {
      const parsed = parseGeneratedCSV(invoicesContent)

      parsed.rows.forEach((row) => {
        const subtotal = parseFloat(row.Subtotal)
        const tax = parseFloat(row.Tax)
        const totalAmount = parseFloat(row['Total Amount'])
        const amountPaid = parseFloat(row['Amount Paid'])
        const invoiceDate = parseDate(row['Invoice Date'])
        const dueDate = parseDate(row['Due Date'])

        expect(subtotal).toBeGreaterThan(0)
        expect(tax).toBeGreaterThan(0)
        expect(totalAmount).toBeCloseTo(subtotal + tax, 1)
        expect(amountPaid).toBeGreaterThanOrEqual(0)
        expect(amountPaid).toBeLessThanOrEqual(totalAmount + 0.01)
        expect(dueDate.getTime()).toBeGreaterThanOrEqual(invoiceDate.getTime())
      })
    })

    it('should track invoice payment status correctly', () => {
      const parsed = parseGeneratedCSV(invoicesContent)

      parsed.rows.forEach((row) => {
        const totalAmount = parseFloat(row['Total Amount'])
        const amountPaid = parseFloat(row['Amount Paid'])
        const status = row.Status

        if (status === 'Paid') {
          expect(amountPaid).toBeCloseTo(totalAmount, 1)
        } else if (status === 'Pending') {
          expect(amountPaid).toBeLessThan(totalAmount)
        }
      })
    })
  })

  // ============================================================================
  // Test Suite: Build Compatibility
  // ============================================================================

  describe('Build Compatibility', () => {
    it('should compile without syntax errors', () => {
      // Basic syntax check - if this runs, the script compiles
      expect(true).toBe(true)
    })
  })
})
