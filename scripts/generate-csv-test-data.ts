/**
 * CSV Test Data Generator
 *
 * Generates realistic restaurant/food distribution transaction data for testing.
 * Creates various CSV formats (transactions, inventory, sales) that match the
 * PantryIQ transaction schema.
 *
 * Usage:
 * - Node.js: node scripts/generate-csv-test-data.js --type transactions --rows 1000
 * - CLI: npm run generate:test-csv -- --type transactions --rows 5000
 *
 * Output formats:
 * - transactions: Simulates daily sales transactions (date, item, qty, revenue, cost)
 * - inventory: Stock tracking format (date, item, qty_on_hand, reorder_point)
 * - mixed: Realistic warehouse/restaurant mixed data
 * - edge-cases: Handles special characters, encoding, large numbers
 * - small: Quick tests (100 rows)
 * - medium: Normal tests (1000 rows)
 * - large: Stress tests (10000 rows)
 * - huge: Performance tests (50000 rows - testing 50MB+ limits)
 */

import { faker } from '@faker-js/faker'
import fs from 'fs/promises'
import path from 'path'

// Restaurant/food service item names and categories
const MENU_ITEMS = [
  // Proteins
  'Grilled Chicken Breast',
  'Salmon Fillet',
  'Ground Beef',
  'Pork Tenderloin',
  'Turkey Breast',
  'Shrimp (16-20 ct)',
  'Beef Ribeye',
  'Lamb Chops',

  // Vegetables
  'Broccoli Florets',
  'Spinach (Fresh)',
  'Bell Peppers (Red)',
  'Bell Peppers (Yellow)',
  'Bell Peppers (Green)',
  'Carrots (Sliced)',
  'Onions (Yellow)',
  'Tomatoes (Roma)',
  'Lettuce (Romaine)',
  'Kale (Curly)',
  'Brussels Sprouts',
  'Mushrooms (White)',
  'Mushrooms (Portobello)',

  // Grains & Carbs
  'Basmati Rice',
  'Pasta (Penne)',
  'Pasta (Fettuccine)',
  'Bread (Sourdough)',
  'Bread (Whole Wheat)',
  'Quinoa',
  'Couscous',
  'Polenta',

  // Dairy
  'Mozzarella Cheese',
  'Cheddar Cheese',
  'Feta Cheese',
  'Parmesan Cheese',
  'Cream Cheese',
  'Butter (Unsalted)',
  'Milk (Whole)',
  'Yogurt (Plain)',

  // Pantry Items
  'Olive Oil (Extra Virgin)',
  'Soy Sauce',
  'Balsamic Vinegar',
  'Salt (Sea)',
  'Black Pepper',
  'Garlic (Cloves)',
  'Ginger (Fresh)',
  'Cinnamon',
  'Paprika',
  'Cayenne Pepper',

  // Beverages
  'Coffee (Arabica Beans)',
  'Tea (Black)',
  'Tea (Green)',
  'Orange Juice (Fresh)',
  'Bottled Water',
  'Red Wine',
  'White Wine',

  // Prepared Items
  'Soup (Tomato Bisque)',
  'Soup (Chicken & Rice)',
  'Salad (Garden)',
  'Salad (Caesar)',
  'Sandwich (Turkey Club)',
  'Burger (Beef Patty)',
  'Pizza (Margherita)',
  'Pasta Bowl (Carbonara)',
]

const SUPPLIERS = [
  'Local Produce Co',
  'Fresh Farms Supply',
  'Quality Meats Inc',
  'Global Ingredients Ltd',
  'Restaurant Depot',
  'Sysco Corporation',
  'US Foods',
  'Shamrock Foods',
  'Performance Food Group',
]

interface GeneratorOptions {
  type: 'transactions' | 'inventory' | 'mixed' | 'edge-cases'
  rows: number
  encoding?: 'utf8' | 'utf16le' | 'utf16be' | 'latin1'
  delimiter?: string
  includeQuotes?: boolean
}

interface CSVData {
  headers: string[]
  rows: Record<string, string | number>[]
}

/**
 * Generate transaction data (matches TRANSACTIONS table schema)
 */
function generateTransactions(rowCount: number): CSVData {
  const startDate = new Date('2024-01-01')
  const endDate = new Date()
  const headers = [
    'date',
    'item',
    'qty',
    'revenue',
    'cost',
    'supplier',
    'notes',
  ]

  const rows = Array.from({ length: rowCount }, () => {
    const randomDate = faker.date.between({
      from: startDate,
      to: endDate,
    })

    const item = faker.helpers.arrayElement(MENU_ITEMS)
    const quantity = faker.number.int({ min: 1, max: 500 })

    // Cost per unit (realistic for restaurant supply)
    const costPerUnit = parseFloat(faker.commerce.price({ min: 1, max: 50 }))
    const cost = (quantity * costPerUnit).toFixed(2)

    // Revenue (markup typically 2-3x cost)
    const revenuePerUnit =
      costPerUnit * faker.number.float({ min: 2.0, max: 3.5 })
    const revenue = (quantity * revenuePerUnit).toFixed(2)

    return {
      date: randomDate.toISOString().split('T')[0],
      item,
      qty: quantity,
      revenue: parseFloat(revenue),
      cost: parseFloat(cost),
      supplier: faker.helpers.arrayElement(SUPPLIERS),
      notes:
        faker.helpers.maybe(() => faker.lorem.sentence({ min: 5, max: 10 }), {
          probability: 0.3,
        }) || '',
    }
  })

  return { headers, rows }
}

/**
 * Generate inventory data format
 */
function generateInventory(rowCount: number): CSVData {
  const startDate = new Date('2024-01-01')
  const endDate = new Date()
  const headers = [
    'inventory_date',
    'product_name',
    'quantity_on_hand',
    'unit_of_measure',
    'reorder_point',
    'last_order_qty',
    'warehouse_location',
  ]

  const rows = Array.from({ length: rowCount }, () => {
    const quantity = faker.number.int({ min: 0, max: 1000 })
    const reorderPoint = faker.number.int({ min: 10, max: 100 })

    return {
      inventory_date: faker.date
        .between({ from: startDate, to: endDate })
        .toISOString()
        .split('T')[0],
      product_name: faker.helpers.arrayElement(MENU_ITEMS),
      quantity_on_hand: quantity,
      unit_of_measure: faker.helpers.arrayElement([
        'lbs',
        'oz',
        'units',
        'cases',
        'gallons',
      ]),
      reorder_point: reorderPoint,
      last_order_qty: faker.number.int({ min: 10, max: 500 }),
      warehouse_location: `${faker.string.alpha(1).toUpperCase()}-${faker.number.int({ min: 1, max: 10 })}-${faker.number.int({ min: 1, max: 20 })}`,
    }
  })

  return { headers, rows }
}

/**
 * Generate mixed realistic data (combines multiple scenarios)
 */
function generateMixed(rowCount: number): CSVData {
  const transactionCount = Math.floor(rowCount * 0.6)
  const inventoryCount = rowCount - transactionCount

  const transactions = generateTransactions(transactionCount)
  const inventory = generateInventory(inventoryCount)

  // Mix them together
  const headers = ['date', 'item', 'qty', 'revenue', 'cost', 'type', 'location']

  const rows = [
    ...transactions.rows.map((row) => ({
      date: row.date,
      item: row.item,
      qty: row.qty,
      revenue: row.revenue,
      cost: row.cost,
      type: 'transaction',
      location: faker.string.alpha(2).toUpperCase(),
    })),
    ...inventory.rows.map((row) => ({
      date: row.inventory_date,
      item: row.product_name,
      qty: row.quantity_on_hand,
      revenue: '',
      cost: '',
      type: 'inventory',
      location: row.warehouse_location,
    })),
  ]

  return { headers, rows }
}

/**
 * Generate edge case data for validation testing
 */
function generateEdgeCases(rowCount: number): CSVData {
  const headers = [
    'date',
    'item_name',
    'quantity',
    'price',
    'special_chars',
    'empty_field',
    'large_number',
  ]

  const specialChars = [
    'Item with "quotes"',
    "Item with 'apostrophe'",
    'Item, with, commas',
    'Item with\nnewline',
    'Item with\ttab',
    'Item with émojis 🍔',
    'Item with ñ and ü',
    'Item with special: @#$%^&*()',
    '日本語テキスト', // Japanese
    'Текст на русском', // Russian
    'Texto en español',
    'Texte français',
    'مرحبا بالعالم', // Arabic
  ]

  const rows = Array.from({ length: rowCount }, (_, i) => {
    const scenario = i % 13

    return {
      date: faker.date.recent({ days: 30 }).toISOString().split('T')[0],
      item_name: faker.helpers.arrayElement(MENU_ITEMS),
      quantity: faker.number.int({ min: 1, max: 999 }),
      price: faker.commerce.price({ min: 0.01, max: 999.99 }),
      special_chars: specialChars[scenario] || '',
      empty_field: scenario % 5 === 0 ? '' : faker.lorem.word(),
      large_number:
        scenario % 3 === 0
          ? faker.number.bigInt({ min: 1n, max: 9999999999999n }).toString()
          : faker.number.int({ min: 1, max: 999999 }),
    }
  })

  return { headers, rows }
}

/**
 * Format data as CSV string
 */
function formatAsCSV(
  data: CSVData,
  options: {
    delimiter?: string
    includeQuotes?: boolean
  } = {},
): string {
  const { delimiter = ',', includeQuotes = true } = options

  const escapedHeaders = data.headers.map((h) =>
    includeQuotes &&
    (h.includes(delimiter) || h.includes('"') || h.includes('\n'))
      ? `"${h.replace(/"/g, '""')}"`
      : h,
  )

  const headerLine = escapedHeaders.join(delimiter)

  const rows = data.rows.map((row) => {
    return data.headers
      .map((header) => {
        const value = row[header]
        const strValue =
          value === null || value === undefined ? '' : String(value)

        if (
          includeQuotes &&
          (strValue.includes(delimiter) ||
            strValue.includes('"') ||
            strValue.includes('\n'))
        ) {
          return `"${strValue.replace(/"/g, '""')}"`
        }
        return strValue
      })
      .join(delimiter)
  })

  return [headerLine, ...rows].join('\n')
}

/**
 * Generate test file with specified options
 */
async function generateTestFile(options: GeneratorOptions): Promise<void> {
  let data: CSVData

  switch (options.type) {
    case 'transactions':
      data = generateTransactions(options.rows)
      break
    case 'inventory':
      data = generateInventory(options.rows)
      break
    case 'mixed':
      data = generateMixed(options.rows)
      break
    case 'edge-cases':
      data = generateEdgeCases(options.rows)
      break
    default:
      throw new Error(`Unknown type: ${options.type}`)
  }

  const csv = formatAsCSV(data, {
    delimiter: options.delimiter || ',',
    includeQuotes: options.includeQuotes !== false,
  })

  const fixtureDir = path.join(
    process.cwd(),
    'tests',
    'fixtures',
    'csv-samples',
  )
  await fs.mkdir(fixtureDir, { recursive: true })

  const filename = `${options.type}-${options.rows}-rows.csv`
  const filepath = path.join(fixtureDir, filename)

  let buffer = Buffer.from(csv, 'utf-8')

  // Handle encoding
  if (options.encoding && options.encoding !== 'utf8') {
    const iconv = await import('iconv-lite')
    buffer = Buffer.from(iconv.encode(csv, options.encoding))
  }

  await fs.writeFile(filepath, buffer)
  console.log(`✓ Generated: ${filepath}`)
  console.log(
    `  Type: ${options.type}, Rows: ${options.rows}, Size: ${(buffer.length / 1024).toFixed(2)}KB`,
  )
}

/**
 * Generate all standard test files
 */
async function generateAllTestFiles(): Promise<void> {
  console.log('🚀 Generating CSV test fixtures...\n')

  const configs: GeneratorOptions[] = [
    // Basic tests
    { type: 'transactions', rows: 10 },
    { type: 'transactions', rows: 100 },
    { type: 'transactions', rows: 1000 },

    // Different formats
    { type: 'inventory', rows: 500 },
    { type: 'mixed', rows: 1000 },
    { type: 'edge-cases', rows: 100 },

    // Encoding variations
    { type: 'transactions', rows: 500, encoding: 'utf8' },
    { type: 'transactions', rows: 500, encoding: 'latin1' },

    // Delimiter variations
    { type: 'transactions', rows: 500, delimiter: '\t' },
    { type: 'transactions', rows: 500, delimiter: ';' },

    // Large files (stress testing)
    { type: 'transactions', rows: 5000 },
    { type: 'transactions', rows: 10000 },
    { type: 'transactions', rows: 50000 },
  ]

  for (const config of configs) {
    try {
      await generateTestFile(config)
    } catch (error) {
      console.error(`✗ Failed to generate ${config.type}:`, error)
    }
  }

  console.log('\n✅ Test fixture generation complete!')
}

// CLI support
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)
  const options: GeneratorOptions = {
    type: 'transactions',
    rows: 100,
    encoding: 'utf8',
    delimiter: ',',
    includeQuotes: true,
  }

  // Parse CLI arguments
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i]
    const value = args[i + 1]

    switch (flag) {
      case '--type':
        options.type = value as any
        break
      case '--rows':
        options.rows = parseInt(value, 10)
        break
      case '--encoding':
        options.encoding = value as any
        break
      case '--delimiter':
        options.delimiter = value
        break
      case '--all':
        generateAllTestFiles().catch(console.error)
        process.exit(0)
    }
  }

  generateTestFile(options).catch(console.error)
}

export {
  generateTransactions,
  generateInventory,
  generateMixed,
  generateEdgeCases,
  formatAsCSV,
  generateTestFile,
  generateAllTestFiles,
  type GeneratorOptions,
  type CSVData,
}
