#!/usr/bin/env node

/**
 * Test Data Generation Script for PantryIQ
 * Generates realistic CSV data for transactions, inventory, and invoices
 *
 * Usage:
 *   npx ts-node scripts/generate-test-csv.ts --records 100 --type transactions
 *   npx ts-node scripts/generate-test-csv.ts --records 500 --start-date 2024-01-01 --end-date 2024-03-31 --type transactions
 */

import * as fs from 'fs'
import * as path from 'path'

// ============================================================================
// Type Definitions
// ============================================================================

type CsvType = 'transactions' | 'inventory' | 'invoices'

interface GeneratorOptions {
  records: number
  startDate: Date
  endDate: Date
  type: CsvType
  output?: string
}

interface GeneratedData {
  headers: string[]
  rows: string[][]
}

// ============================================================================
// Menu Items and Mock Data
// ============================================================================

const MENU_ITEMS = [
  { name: 'Burger', minPrice: 8.99, maxPrice: 14.99, category: 'Entree' },
  { name: 'Fries', minPrice: 2.99, maxPrice: 4.99, category: 'Side' },
  { name: 'Salad', minPrice: 7.99, maxPrice: 12.99, category: 'Salad' },
  { name: 'Coffee', minPrice: 2.49, maxPrice: 4.99, category: 'Beverage' },
  { name: 'Sandwich', minPrice: 6.99, maxPrice: 11.99, category: 'Entree' },
  { name: 'Pizza Slice', minPrice: 3.49, maxPrice: 5.99, category: 'Entree' },
  { name: 'Pasta', minPrice: 9.99, maxPrice: 15.99, category: 'Entree' },
  { name: 'Soup', minPrice: 4.99, maxPrice: 7.99, category: 'Appetizer' },
  { name: 'Dessert', minPrice: 5.99, maxPrice: 8.99, category: 'Dessert' },
  { name: 'Beverage', minPrice: 1.99, maxPrice: 3.99, category: 'Beverage' },
  {
    name: 'Appetizer Platter',
    minPrice: 7.99,
    maxPrice: 13.99,
    category: 'Appetizer',
  },
  { name: 'Fish Tacos', minPrice: 9.99, maxPrice: 14.99, category: 'Entree' },
  {
    name: 'Chicken Wings',
    minPrice: 8.99,
    maxPrice: 13.99,
    category: 'Appetizer',
  },
  {
    name: 'Pasta Carbonara',
    minPrice: 10.99,
    maxPrice: 16.99,
    category: 'Entree',
  },
  {
    name: 'Grilled Cheese',
    minPrice: 6.99,
    maxPrice: 9.99,
    category: 'Entree',
  },
]

const VENDORS = [
  'Fresh Produce Co',
  'Quality Meats Inc',
  'Organic Dairy Farm',
  'Global Spice Traders',
  'Local Bakery Supply',
  'Premium Seafood Ltd',
  'Farm Fresh Vegetables',
  'Premium Beverages Co',
]

const PAYMENT_METHODS = ['Cash', 'Card', 'Online', 'Check']
const LOCATIONS = ['Downtown', 'Airport', 'Mall', 'North Shore', 'West Side']

// ============================================================================
// Utility Functions
// ============================================================================

function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

function getRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function getRandomDate(start: Date, end: Date): Date {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime()),
  )
}

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}

function formatCurrency(value: number): string {
  return value.toFixed(2)
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

// ============================================================================
// Transaction Data Generator
// ============================================================================

function generateTransactionRow(startDate: Date, endDate: Date): string[] {
  const transactionDate = getRandomDate(startDate, endDate)
  const menuItem = getRandomItem(MENU_ITEMS)
  const quantity = getRandomNumber(1, 50)
  const revenue =
    getRandomNumber(
      Math.ceil(menuItem.minPrice * 100),
      Math.floor(menuItem.maxPrice * 100),
    ) / 100
  const cost = parseFloat(
    ((revenue * getRandomNumber(30, 50)) / 100).toFixed(2),
  )

  return [
    formatDate(transactionDate),
    formatTime(transactionDate),
    escapeCSV(menuItem.name),
    String(quantity),
    formatCurrency(revenue),
    formatCurrency(cost),
    formatCurrency(revenue * quantity),
    formatCurrency(cost * quantity),
    getRandomItem(PAYMENT_METHODS),
    getRandomItem(LOCATIONS),
  ]
}

function generateTransactions(options: GeneratorOptions): GeneratedData {
  const headers = [
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

  const rows: string[][] = []
  for (let i = 0; i < options.records; i++) {
    rows.push(generateTransactionRow(options.startDate, options.endDate))
  }

  return { headers, rows }
}

// ============================================================================
// Inventory Data Generator
// ============================================================================

function generateInventoryRow(): string[] {
  const menuItem = getRandomItem(MENU_ITEMS)
  const quantity = getRandomNumber(10, 500)
  const unitCost = getRandomNumber(1, 10) + Math.random()
  const reorderPoint = getRandomNumber(20, 100)
  const supplier = getRandomItem(VENDORS)
  const lastRestockDate = new Date(
    Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
  )

  return [
    String(getRandomNumber(1000, 9999)),
    escapeCSV(menuItem.name),
    escapeCSV(menuItem.category),
    String(quantity),
    formatCurrency(unitCost),
    formatCurrency(unitCost * quantity),
    String(reorderPoint),
    escapeCSV(supplier),
    formatDate(lastRestockDate),
  ]
}

function generateInventory(options: GeneratorOptions): GeneratedData {
  const headers = [
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

  const rows: string[][] = []
  for (let i = 0; i < options.records; i++) {
    rows.push(generateInventoryRow())
  }

  return { headers, rows }
}

// ============================================================================
// Invoice Data Generator
// ============================================================================

function generateInvoiceRow(startDate: Date, endDate: Date): string[] {
  const invoiceDate = getRandomDate(startDate, endDate)
  const daysToPayment = getRandomNumber(7, 60)
  const dueDate = new Date(
    invoiceDate.getTime() + daysToPayment * 24 * 60 * 60 * 1000,
  )
  const invoiceAmount = getRandomNumber(50000, 500000) / 100
  const taxAmount = parseFloat((invoiceAmount * 0.1).toFixed(2))
  const totalAmount = parseFloat((invoiceAmount + taxAmount).toFixed(2))
  const paidAmount = Math.random() > 0.2 ? totalAmount : 0

  return [
    `INV-${getRandomNumber(10000, 99999)}`,
    escapeCSV(getRandomItem(VENDORS)),
    formatDate(invoiceDate),
    formatDate(dueDate),
    formatCurrency(invoiceAmount),
    formatCurrency(taxAmount),
    formatCurrency(totalAmount),
    formatCurrency(paidAmount),
    paidAmount > 0 ? 'Paid' : 'Pending',
  ]
}

function generateInvoices(options: GeneratorOptions): GeneratedData {
  const headers = [
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

  const rows: string[][] = []
  for (let i = 0; i < options.records; i++) {
    rows.push(generateInvoiceRow(options.startDate, options.endDate))
  }

  return { headers, rows }
}

// ============================================================================
// CSV Generation and Output
// ============================================================================

function generateCSV(data: GeneratedData): string {
  const header = data.headers.map(escapeCSV).join(',')
  const rows = data.rows.map((row) => row.join(','))
  return [header, ...rows].join('\n')
}

function parseArguments(): {
  records: number
  startDate: Date
  endDate: Date
  type: CsvType
  output?: string
  help: boolean
} {
  const args = process.argv.slice(2)
  const options = {
    records: 100,
    startDate: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
    endDate: new Date(),
    type: 'transactions' as CsvType,
    output: undefined as string | undefined,
    help: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === '--help' || arg === '-h') {
      options.help = true
    } else if (arg === '--records' && args[i + 1]) {
      options.records = parseInt(args[i + 1], 10)
      i++
    } else if (arg === '--start-date' && args[i + 1]) {
      options.startDate = new Date(args[i + 1])
      i++
    } else if (arg === '--end-date' && args[i + 1]) {
      // Parse end date and add one day to ensure we include the entire end date
      const endDate = new Date(args[i + 1])
      options.endDate = new Date(endDate.getTime() + 24 * 60 * 60 * 1000)
      i++
    } else if (arg === '--type' && args[i + 1]) {
      options.type = args[i + 1] as CsvType
      i++
    } else if (arg === '--output' && args[i + 1]) {
      options.output = args[i + 1]
      i++
    }
  }

  return options
}

function printHelp(): void {
  console.log(`
Test Data Generation Script for PantryIQ
Generates realistic CSV data for testing and QA

Usage:
  npm run generate:test-csv -- [options]

Options:
  --records NUMBER         Number of records to generate (default: 100)
  --start-date DATE        Start date in YYYY-MM-DD format (default: 1 year ago)
  --end-date DATE          End date in YYYY-MM-DD format (default: today)
  --type TYPE              Type of data to generate: transactions|inventory|invoices (default: transactions)
  --output FILE            Output file path (default: stdout)
  --help, -h              Display this help message

Examples:
  # Generate 100 transactions
  npm run generate:test-csv -- --records 100 --type transactions

  # Generate 500 transactions for a specific date range
  npm run generate:test-csv -- --records 500 --start-date 2024-01-01 --end-date 2024-03-31 --type transactions

  # Generate inventory data and save to file
  npm run generate:test-csv -- --records 200 --type inventory --output tests/fixtures/inventory.csv

  # Generate vendor invoices
  npm run generate:test-csv -- --records 50 --type invoices --output tests/fixtures/invoices.csv
  `)
}

async function main(): Promise<void> {
  const args = parseArguments()

  if (args.help) {
    printHelp()
    process.exit(0)
  }

  // Validate type
  if (!['transactions', 'inventory', 'invoices'].includes(args.type)) {
    console.error(
      `Error: Invalid type "${args.type}". Must be: transactions, inventory, or invoices`,
    )
    process.exit(1)
  }

  // Validate date range
  if (args.startDate > args.endDate) {
    console.error(
      `Error: start-date (${formatDate(args.startDate)}) must be before end-date (${formatDate(args.endDate)})`,
    )
    process.exit(1)
  }

  // Generate data
  let data: GeneratedData
  switch (args.type) {
    case 'transactions':
      data = generateTransactions(args)
      break
    case 'inventory':
      data = generateInventory(args)
      break
    case 'invoices':
      data = generateInvoices(args)
      break
    default:
      throw new Error(`Unknown type: ${args.type}`)
  }

  // Convert to CSV
  const csv = generateCSV(data)

  // Output
  if (args.output) {
    const outputDir = path.dirname(args.output)
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }
    fs.writeFileSync(args.output, csv)
    console.error(
      `Generated ${args.records} ${args.type} records to ${args.output}`,
    )
  } else {
    console.log(csv)
  }
}

main().catch((error) => {
  console.error('Error:', error.message)
  process.exit(1)
})
