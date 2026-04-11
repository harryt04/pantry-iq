#!/usr/bin/env node

/**
 * Advanced CSV Test Data Generator for PantryIQ
 *
 * Uses @faker-js/faker to produce realistic, varied CSV files that simulate
 * what real customers would upload from different POS systems, spreadsheets,
 * and accounting tools.
 *
 * Usage:
 *   npx ts-node scripts/generate-test-csv-faker.ts --scenario <name> [options]
 *   npx ts-node scripts/generate-test-csv-faker.ts --all --output-dir tests/fixtures/generated
 *
 * Scenarios:
 *   square-pos        Square POS transaction export
 *   toast-pos         Toast POS export (restaurant-specific)
 *   clover-pos        Clover POS export
 *   quickbooks        QuickBooks transaction export
 *   excel-manual      Hand-typed spreadsheet (messy data)
 *   vendor-invoice    Sysco/US Foods vendor invoices
 *   inventory-count   Physical inventory count sheet
 *   european-format   European number/date formatting
 *   unicode-menu      International restaurant (Unicode item names)
 *   minimal-valid     Bare minimum valid import (item + qty)
 *   missing-columns   CSV missing critical columns
 *   duplicate-headers CSV with duplicate column headers
 *   empty-rows        CSV with scattered empty rows
 *   huge-columns      CSV with many extra columns
 *   currency-symbols  Numeric fields with $, EUR, etc.
 *   mixed-dates       Various date formats in one file
 *   negative-values   Returns, refunds, negative quantities
 *   semicolon-delim   Semicolon-delimited (European Excel)
 *   tab-delim         Tab-delimited export
 *   headers-only      File with headers but no data rows
 *   single-row        File with exactly one data row
 */

import { faker } from '@faker-js/faker'
import * as fs from 'fs'
import * as path from 'path'

// ============================================================================
// Types
// ============================================================================

type Scenario =
  | 'square-pos'
  | 'toast-pos'
  | 'clover-pos'
  | 'quickbooks'
  | 'excel-manual'
  | 'vendor-invoice'
  | 'inventory-count'
  | 'european-format'
  | 'unicode-menu'
  | 'minimal-valid'
  | 'missing-columns'
  | 'duplicate-headers'
  | 'empty-rows'
  | 'huge-columns'
  | 'currency-symbols'
  | 'mixed-dates'
  | 'negative-values'
  | 'semicolon-delim'
  | 'tab-delim'
  | 'headers-only'
  | 'single-row'

interface GeneratorOptions {
  scenario: Scenario
  records: number
  startDate: Date
  endDate: Date
  output?: string
  seed?: number
}

interface GeneratedCSV {
  headers: string[]
  rows: string[][]
  delimiter: string
  description: string
}

// ============================================================================
// Restaurant-specific fake data pools
// ============================================================================

const RESTAURANT_ITEMS = [
  'Classic Burger',
  'Cheeseburger Deluxe',
  'Grilled Chicken Sandwich',
  'Caesar Salad',
  'Garden Salad',
  'French Fries',
  'Sweet Potato Fries',
  'Onion Rings',
  'Chicken Wings (6pc)',
  'Chicken Wings (12pc)',
  'Fish & Chips',
  'Fish Tacos',
  'Margherita Pizza',
  'Pepperoni Pizza',
  'BBQ Chicken Pizza',
  'Pasta Carbonara',
  'Spaghetti Bolognese',
  'Mac & Cheese',
  'Tomato Soup',
  'Clam Chowder',
  'Grilled Salmon',
  'Steak Frites',
  'Pulled Pork Sandwich',
  'BLT Sandwich',
  'Club Sandwich',
  'Veggie Wrap',
  'Breakfast Burrito',
  'Pancake Stack',
  'Eggs Benedict',
  'Avocado Toast',
]

const MODIFIERS = [
  'Add Bacon',
  'Extra Cheese',
  'Gluten Free Bun',
  'Side Ranch',
  'No Onions',
  'Sub Sweet Potato',
  'Add Avocado',
  'Extra Sauce',
]

const CATEGORIES = [
  'Entree',
  'Appetizer',
  'Side',
  'Beverage',
  'Dessert',
  'Breakfast',
  'Salad',
  'Soup',
  'Pizza',
  'Pasta',
]

const VENDORS = [
  'Sysco Corporation',
  'US Foods Inc.',
  'Performance Food Group',
  'Gordon Food Service',
  'Reinhart FoodService',
  'Ben E. Keith Foods',
  'Shamrock Foods Co.',
  'Cisco Foods International',
]

const PAYMENT_METHODS = [
  'Visa',
  'Mastercard',
  'Amex',
  'Cash',
  'Apple Pay',
  'Google Pay',
  'Gift Card',
  'Debit',
]

const LOCATIONS = [
  'Main St - Downtown',
  'Airport Terminal B',
  'Westfield Mall',
  'North Shore Plaza',
  'University District',
]

// Unicode menu items for international restaurant scenario
const UNICODE_ITEMS = [
  'Pad Thai (ผัดไทย)',
  'Pho Bo (Phở Bò)',
  'Bibimbap (비빔밥)',
  'Gyoza (餃子)',
  'Ramen (ラーメン)',
  'Tacos al Pastor',
  'Crème Brûlée',
  'Schnitzel mit Spätzle',
  'Moussaka (Μουσακάς)',
  'Falafel (فلافل)',
  'Pierogi (Pierogi)',
  'Borscht (Борщ)',
  'Croissant aux Amandes',
  'Currywurst & Pommes',
  'Khao Soi (ข้าวซอย)',
  'Börek (Börek)',
  'Dumplings (饺子)',
  'Empanadas de Carne',
  'Açaí Bowl',
  'Crêpe Suzette',
]

// ============================================================================
// Utility functions
// ============================================================================

function escapeCSV(value: string, delimiter: string = ','): string {
  if (
    value.includes(delimiter) ||
    value.includes('"') ||
    value.includes('\n') ||
    value.includes('\r')
  ) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function formatDate(
  date: Date,
  format: 'iso' | 'us' | 'eu' | 'long' = 'iso',
): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  switch (format) {
    case 'iso':
      return `${y}-${m}-${d}`
    case 'us':
      return `${m}/${d}/${y}`
    case 'eu':
      return `${d}.${m}.${y}`
    case 'long':
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
  }
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
}

function randomPrice(min: number, max: number): number {
  return parseFloat(faker.commerce.price({ min, max }))
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ============================================================================
// Scenario generators
// ============================================================================

function generateSquarePOS(opts: GeneratorOptions): GeneratedCSV {
  const headers = [
    'Date',
    'Time',
    'Transaction ID',
    'Item',
    'Category',
    'Qty',
    'Gross Sales',
    'Discounts',
    'Net Sales',
    'Tax',
    'Tip',
    'Total',
    'Payment Method',
    'Card Brand',
    'Device',
  ]
  const rows: string[][] = []
  for (let i = 0; i < opts.records; i++) {
    const date = faker.date.between({ from: opts.startDate, to: opts.endDate })
    const item = pick(RESTAURANT_ITEMS)
    const qty = faker.number.int({ min: 1, max: 20 })
    const unitPrice = randomPrice(3, 30)
    const gross = parseFloat((unitPrice * qty).toFixed(2))
    const discount =
      Math.random() > 0.8
        ? parseFloat(
            (gross * faker.number.float({ min: 0.05, max: 0.2 })).toFixed(2),
          )
        : 0
    const net = parseFloat((gross - discount).toFixed(2))
    const tax = parseFloat((net * 0.0875).toFixed(2))
    const tip =
      Math.random() > 0.4
        ? parseFloat(
            (net * faker.number.float({ min: 0.1, max: 0.25 })).toFixed(2),
          )
        : 0
    const total = parseFloat((net + tax + tip).toFixed(2))

    rows.push([
      formatDate(date, 'us'),
      formatTime(date),
      faker.string.alphanumeric(12).toUpperCase(),
      item,
      pick(CATEGORIES),
      String(qty),
      gross.toFixed(2),
      discount.toFixed(2),
      net.toFixed(2),
      tax.toFixed(2),
      tip.toFixed(2),
      total.toFixed(2),
      pick(PAYMENT_METHODS),
      pick(['Visa', 'Mastercard', 'Amex', 'Discover', '']),
      pick(['Register 1', 'Register 2', 'Mobile POS', 'Kiosk']),
    ])
  }
  return {
    headers,
    rows,
    delimiter: ',',
    description: 'Square POS transaction export',
  }
}

function generateToastPOS(opts: GeneratorOptions): GeneratedCSV {
  const headers = [
    'Order Date',
    'Order Time',
    'Order #',
    'Server',
    'Table',
    'Item',
    'Modifier',
    'Qty',
    'Price',
    'Tax',
    'Tip',
    'Total',
    'Payment Type',
    'Order Type',
  ]
  const rows: string[][] = []
  const servers = Array.from({ length: 8 }, () => faker.person.firstName())

  for (let i = 0; i < opts.records; i++) {
    const date = faker.date.between({ from: opts.startDate, to: opts.endDate })
    const item = pick(RESTAURANT_ITEMS)
    const modifier = Math.random() > 0.6 ? pick(MODIFIERS) : ''
    const qty = faker.number.int({ min: 1, max: 8 })
    const price = randomPrice(5, 35)
    const tax = parseFloat((price * qty * 0.08).toFixed(2))
    const tip =
      Math.random() > 0.3
        ? parseFloat(
            (
              price *
              qty *
              faker.number.float({ min: 0.15, max: 0.25 })
            ).toFixed(2),
          )
        : 0
    const total = parseFloat((price * qty + tax + tip).toFixed(2))

    rows.push([
      formatDate(date, 'us'),
      formatTime(date),
      String(faker.number.int({ min: 100000, max: 999999 })),
      pick(servers),
      Math.random() > 0.3
        ? `Table ${faker.number.int({ min: 1, max: 30 })}`
        : 'Bar',
      item,
      modifier,
      String(qty),
      price.toFixed(2),
      tax.toFixed(2),
      tip.toFixed(2),
      total.toFixed(2),
      pick(['Credit Card', 'Cash', 'Gift Card', 'Mobile Pay']),
      pick(['Dine In', 'Takeout', 'Delivery', 'Online']),
    ])
  }
  return {
    headers,
    rows,
    delimiter: ',',
    description: 'Toast POS restaurant export',
  }
}

function generateCloverPOS(opts: GeneratorOptions): GeneratedCSV {
  const headers = [
    'Date',
    'Time',
    'Order ID',
    'Employee',
    'Item Name',
    'SKU',
    'Quantity',
    'Amount',
    'Tax Amount',
    'Discount Amount',
    'Payment Type',
    'Tender',
    'Note',
  ]
  const rows: string[][] = []

  for (let i = 0; i < opts.records; i++) {
    const date = faker.date.between({ from: opts.startDate, to: opts.endDate })
    const item = pick(RESTAURANT_ITEMS)
    const qty = faker.number.int({ min: 1, max: 12 })
    const amount = randomPrice(4, 40) * qty
    const tax = parseFloat((amount * 0.07).toFixed(2))
    const discount =
      Math.random() > 0.85 ? parseFloat((amount * 0.1).toFixed(2)) : 0

    rows.push([
      formatDate(date, 'iso'),
      date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
      `CLV-${faker.string.alphanumeric(8)}`,
      faker.person.firstName(),
      item,
      `SKU-${faker.string.numeric(6)}`,
      String(qty),
      amount.toFixed(2),
      tax.toFixed(2),
      discount.toFixed(2),
      pick(PAYMENT_METHODS),
      pick(['Swipe', 'Chip', 'Tap', 'Manual', 'Cash']),
      Math.random() > 0.9 ? faker.lorem.sentence(3) : '',
    ])
  }
  return { headers, rows, delimiter: ',', description: 'Clover POS export' }
}

function generateQuickBooks(opts: GeneratorOptions): GeneratedCSV {
  const headers = [
    'Trans #',
    'Type',
    'Date',
    'Name',
    'Memo/Description',
    'Account',
    'Debit',
    'Credit',
    'Balance',
  ]
  const rows: string[][] = []
  let balance = faker.number.float({ min: 5000, max: 50000 })
  const accounts = [
    'Sales Revenue',
    'Cost of Goods Sold',
    'Food Supplies',
    'Operating Expenses',
    'Accounts Payable',
  ]

  for (let i = 0; i < opts.records; i++) {
    const date = faker.date.between({ from: opts.startDate, to: opts.endDate })
    const isSale = Math.random() > 0.4
    const amount = randomPrice(10, 500)

    if (isSale) {
      balance += amount
      rows.push([
        String(faker.number.int({ min: 1000, max: 99999 })),
        'Sales Receipt',
        formatDate(date, 'us'),
        `Customer - ${faker.person.lastName()}`,
        pick(RESTAURANT_ITEMS),
        pick(accounts),
        '',
        amount.toFixed(2),
        balance.toFixed(2),
      ])
    } else {
      balance -= amount
      rows.push([
        String(faker.number.int({ min: 1000, max: 99999 })),
        pick(['Bill', 'Check', 'Expense']),
        formatDate(date, 'us'),
        pick(VENDORS),
        faker.commerce.productName(),
        pick(accounts),
        amount.toFixed(2),
        '',
        balance.toFixed(2),
      ])
    }
  }
  return {
    headers,
    rows,
    delimiter: ',',
    description: 'QuickBooks transaction export',
  }
}

function generateExcelManual(opts: GeneratorOptions): GeneratedCSV {
  // Simulates a hand-typed spreadsheet with inconsistencies
  const headers = ['date', 'item', 'qty', 'price', 'notes']
  const rows: string[][] = []
  const dateFormats: Array<'iso' | 'us' | 'long'> = ['iso', 'us', 'long']

  for (let i = 0; i < opts.records; i++) {
    const date = faker.date.between({ from: opts.startDate, to: opts.endDate })
    const item = pick(RESTAURANT_ITEMS)
    const qty = faker.number.int({ min: 1, max: 50 })
    const price = randomPrice(3, 30)

    // Intentional messiness
    let dateStr = formatDate(date, pick(dateFormats))
    if (Math.random() > 0.9) dateStr = '' // Occasionally blank
    let qtyStr = String(qty)
    if (Math.random() > 0.95) qtyStr = '' // Occasionally blank
    let priceStr = price.toFixed(2)
    if (Math.random() > 0.85) priceStr = `$${priceStr}` // Sometimes has dollar sign
    if (Math.random() > 0.95) priceStr = `${priceStr} each` // Sometimes has text

    // Extra whitespace, inconsistent capitalization
    let itemStr = item
    if (Math.random() > 0.8) itemStr = `  ${item}  `
    if (Math.random() > 0.7) itemStr = itemStr.toLowerCase()
    if (Math.random() > 0.9) itemStr = itemStr.toUpperCase()

    rows.push([
      dateStr,
      itemStr,
      qtyStr,
      priceStr,
      Math.random() > 0.7 ? faker.lorem.sentence(2) : '',
    ])
  }
  return {
    headers,
    rows,
    delimiter: ',',
    description: 'Hand-typed Excel/Sheets export (messy data)',
  }
}

function generateVendorInvoice(opts: GeneratorOptions): GeneratedCSV {
  const headers = [
    'Invoice #',
    'PO Number',
    'Invoice Date',
    'Due Date',
    'Vendor',
    'Item Code',
    'Description',
    'Qty',
    'Unit',
    'Unit Price',
    'Extended Price',
    'Tax',
    'Freight',
    'Total',
  ]
  const rows: string[][] = []
  const units = ['CS', 'EA', 'LB', 'GAL', 'BG', 'BX', 'PK']
  const foodItems = [
    'Lettuce, Iceberg',
    'Tomatoes, Roma',
    'Ground Beef 80/20',
    'Chicken Breast, Boneless',
    'Cheddar Cheese, Shredded',
    'Hamburger Buns, Sesame',
    'French Fries, Frozen',
    'Cooking Oil, Canola',
    'Flour, All Purpose',
    'Sugar, Granulated',
    'Ketchup, Squeeze Bottle',
    'Mayonnaise, Heavy Duty',
    'Salt, Iodized',
    'Black Pepper, Ground',
    'Napkins, Dinner',
    'To-Go Containers, 9x9',
    'Plastic Wrap, 18"',
    'Sanitizer, Quat',
  ]

  for (let i = 0; i < opts.records; i++) {
    const invoiceDate = faker.date.between({
      from: opts.startDate,
      to: opts.endDate,
    })
    const dueDate = new Date(
      invoiceDate.getTime() + faker.number.int({ min: 7, max: 45 }) * 86400000,
    )
    const qty = faker.number.int({ min: 1, max: 100 })
    const unitPrice = randomPrice(1, 80)
    const extended = parseFloat((qty * unitPrice).toFixed(2))
    const tax = parseFloat((extended * 0.07).toFixed(2))
    const freight = Math.random() > 0.7 ? randomPrice(5, 50) : 0
    const total = parseFloat((extended + tax + freight).toFixed(2))

    rows.push([
      `INV-${faker.string.numeric(7)}`,
      `PO-${faker.string.numeric(5)}`,
      formatDate(invoiceDate, 'us'),
      formatDate(dueDate, 'us'),
      pick(VENDORS),
      `${faker.string.numeric(6)}-${faker.string.alpha(2).toUpperCase()}`,
      pick(foodItems),
      String(qty),
      pick(units),
      unitPrice.toFixed(2),
      extended.toFixed(2),
      tax.toFixed(2),
      freight.toFixed(2),
      total.toFixed(2),
    ])
  }
  return {
    headers,
    rows,
    delimiter: ',',
    description: 'Sysco/US Foods vendor invoice export',
  }
}

function generateInventoryCount(opts: GeneratorOptions): GeneratedCSV {
  const headers = [
    'Item',
    'SKU',
    'Category',
    'Location',
    'Shelf',
    'Count Date',
    'Quantity On Hand',
    'Unit',
    'Unit Cost',
    'Total Value',
    'Reorder Point',
    'Par Level',
    'Supplier',
  ]
  const rows: string[][] = []
  const shelves = [
    'Walk-in Cooler',
    'Dry Storage A',
    'Dry Storage B',
    'Freezer',
    'Bar',
    'Prep Station',
  ]
  const units = ['ea', 'cs', 'lb', 'oz', 'gal', 'bag', 'box']
  const inventoryItems = [
    ...RESTAURANT_ITEMS.map((i) => i),
    'Hamburger Patties',
    'Hot Dog Buns',
    'Lettuce',
    'Tomato',
    'Onion',
    'Pickles',
    'Ketchup',
    'Mustard',
    'Mayo',
    'Cooking Oil',
    'Flour',
    'Sugar',
    'Salt',
    'Pepper',
    'Paper Towels',
    'Napkins',
    'To-Go Boxes',
    'Plastic Cups',
  ]

  for (let i = 0; i < opts.records; i++) {
    const countDate = faker.date.between({
      from: opts.startDate,
      to: opts.endDate,
    })
    const qty = faker.number.int({ min: 0, max: 500 })
    const unitCost = randomPrice(0.5, 50)

    rows.push([
      pick(inventoryItems),
      `SKU-${faker.string.numeric(8)}`,
      pick(CATEGORIES),
      pick(LOCATIONS),
      pick(shelves),
      formatDate(countDate, 'iso'),
      String(qty),
      pick(units),
      unitCost.toFixed(2),
      (qty * unitCost).toFixed(2),
      String(faker.number.int({ min: 5, max: 50 })),
      String(faker.number.int({ min: 10, max: 100 })),
      pick(VENDORS),
    ])
  }
  return {
    headers,
    rows,
    delimiter: ',',
    description: 'Physical inventory count sheet',
  }
}

function generateEuropeanFormat(opts: GeneratorOptions): GeneratedCSV {
  // European: semicolon delimiter, comma decimals, DD.MM.YYYY dates
  const headers = ['Datum', 'Artikel', 'Menge', 'Preis', 'Umsatz', 'Standort']
  const rows: string[][] = []
  const items = [
    'Schnitzel',
    'Bratwurst',
    'Kartoffelsalat',
    'Apfelstrudel',
    'Weißbier',
    'Bretzel',
    'Schweinshaxe',
    'Gulasch',
    'Spätzle',
    'Sauerbraten',
  ]

  for (let i = 0; i < opts.records; i++) {
    const date = faker.date.between({ from: opts.startDate, to: opts.endDate })
    const qty = faker.number.int({ min: 1, max: 50 })
    const price = randomPrice(5, 30)
    const revenue = qty * price

    rows.push([
      formatDate(date, 'eu'),
      pick(items),
      String(qty),
      price.toFixed(2).replace('.', ','), // European decimal
      revenue.toFixed(2).replace('.', ','), // European decimal
      pick(['München', 'Berlin', 'Hamburg', 'Frankfurt', 'Köln']),
    ])
  }
  return {
    headers,
    rows,
    delimiter: ';',
    description: 'European format (semicolons, comma decimals, DD.MM.YYYY)',
  }
}

function generateUnicodeMenu(opts: GeneratorOptions): GeneratedCSV {
  const headers = [
    'Date',
    'Item Name',
    'Quantity',
    'Revenue',
    'Cost',
    'Location',
  ]
  const rows: string[][] = []

  for (let i = 0; i < opts.records; i++) {
    const date = faker.date.between({ from: opts.startDate, to: opts.endDate })
    const qty = faker.number.int({ min: 1, max: 30 })
    const revenue = randomPrice(8, 35)
    const cost = parseFloat(
      (revenue * faker.number.float({ min: 0.25, max: 0.45 })).toFixed(2),
    )

    rows.push([
      formatDate(date, 'iso'),
      pick(UNICODE_ITEMS),
      String(qty),
      revenue.toFixed(2),
      cost.toFixed(2),
      pick(LOCATIONS),
    ])
  }
  return {
    headers,
    rows,
    delimiter: ',',
    description: 'International restaurant with Unicode item names',
  }
}

function generateMinimalValid(opts: GeneratorOptions): GeneratedCSV {
  // Bare minimum: just item and qty (the only hard requirement is "item")
  const headers = ['Product', 'Amount']
  const rows: string[][] = []

  for (let i = 0; i < opts.records; i++) {
    rows.push([
      pick(RESTAURANT_ITEMS),
      String(faker.number.int({ min: 1, max: 100 })),
    ])
  }
  return {
    headers,
    rows,
    delimiter: ',',
    description: 'Minimal valid CSV (item + qty only)',
  }
}

function generateMissingColumns(_opts: GeneratorOptions): GeneratedCSV {
  // Missing the "item" column entirely -- should fail validation
  const headers = ['Date', 'Quantity', 'Revenue', 'Cost']
  const rows: string[][] = []

  for (let i = 0; i < _opts.records; i++) {
    const date = faker.date.between({
      from: _opts.startDate,
      to: _opts.endDate,
    })
    rows.push([
      formatDate(date, 'iso'),
      String(faker.number.int({ min: 1, max: 50 })),
      randomPrice(5, 30).toFixed(2),
      randomPrice(2, 15).toFixed(2),
    ])
  }
  return {
    headers,
    rows,
    delimiter: ',',
    description: 'CSV missing critical "item" column (should fail mapping)',
  }
}

function generateDuplicateHeaders(opts: GeneratorOptions): GeneratedCSV {
  // Two columns named "Amount" -- tests csv-parse behavior
  const headers = ['Date', 'Item', 'Amount', 'Amount', 'Tax']
  const rows: string[][] = []

  for (let i = 0; i < opts.records; i++) {
    const date = faker.date.between({ from: opts.startDate, to: opts.endDate })
    const qty = faker.number.int({ min: 1, max: 20 })
    const price = randomPrice(5, 25)

    rows.push([
      formatDate(date, 'iso'),
      pick(RESTAURANT_ITEMS),
      String(qty),
      price.toFixed(2),
      (price * 0.08).toFixed(2),
    ])
  }
  return {
    headers,
    rows,
    delimiter: ',',
    description: 'CSV with duplicate column headers',
  }
}

function generateEmptyRows(opts: GeneratorOptions): GeneratedCSV {
  const headers = ['Date', 'Item Name', 'Qty', 'Revenue']
  const rows: string[][] = []

  for (let i = 0; i < opts.records; i++) {
    // Insert empty rows periodically
    if (i > 0 && i % 5 === 0) {
      rows.push(['', '', '', ''])
    }
    if (i > 0 && i % 12 === 0) {
      rows.push([]) // Completely empty row
    }

    const date = faker.date.between({ from: opts.startDate, to: opts.endDate })
    rows.push([
      formatDate(date, 'iso'),
      pick(RESTAURANT_ITEMS),
      String(faker.number.int({ min: 1, max: 30 })),
      randomPrice(5, 25).toFixed(2),
    ])
  }
  return {
    headers,
    rows,
    delimiter: ',',
    description: 'CSV with scattered empty rows',
  }
}

function generateHugeColumns(opts: GeneratorOptions): GeneratedCSV {
  // 30 columns, most are irrelevant to our schema
  const headers = [
    'Transaction ID',
    'Date',
    'Time',
    'Order Number',
    'Server Name',
    'Table Number',
    'Guest Count',
    'Item Name',
    'Item Category',
    'Item Subcategory',
    'SKU',
    'UPC',
    'Modifier 1',
    'Modifier 2',
    'Modifier 3',
    'Quantity',
    'Unit Price',
    'Discount Type',
    'Discount Amount',
    'Gross Sales',
    'Net Sales',
    'Tax Rate',
    'Tax Amount',
    'Tip',
    'Service Charge',
    'Total',
    'Payment Method',
    'Card Last 4',
    'Location',
    'Notes',
  ]
  const rows: string[][] = []

  for (let i = 0; i < opts.records; i++) {
    const date = faker.date.between({ from: opts.startDate, to: opts.endDate })
    const qty = faker.number.int({ min: 1, max: 15 })
    const unitPrice = randomPrice(5, 40)
    const gross = parseFloat((unitPrice * qty).toFixed(2))
    const discountAmt =
      Math.random() > 0.85 ? parseFloat((gross * 0.1).toFixed(2)) : 0
    const net = parseFloat((gross - discountAmt).toFixed(2))
    const tax = parseFloat((net * 0.0825).toFixed(2))
    const tip = Math.random() > 0.5 ? parseFloat((net * 0.18).toFixed(2)) : 0
    const total = parseFloat((net + tax + tip).toFixed(2))

    rows.push([
      faker.string.uuid(),
      formatDate(date, 'us'),
      formatTime(date),
      `ORD-${faker.string.numeric(6)}`,
      faker.person.firstName(),
      String(faker.number.int({ min: 1, max: 30 })),
      String(faker.number.int({ min: 1, max: 8 })),
      pick(RESTAURANT_ITEMS),
      pick(CATEGORIES),
      faker.commerce.department(),
      `SKU-${faker.string.numeric(8)}`,
      faker.string.numeric(12),
      Math.random() > 0.7 ? pick(MODIFIERS) : '',
      Math.random() > 0.9 ? pick(MODIFIERS) : '',
      '',
      String(qty),
      unitPrice.toFixed(2),
      Math.random() > 0.85
        ? pick(['Coupon', 'Employee', 'Loyalty', 'Manager'])
        : '',
      discountAmt.toFixed(2),
      gross.toFixed(2),
      net.toFixed(2),
      '8.25%',
      tax.toFixed(2),
      tip.toFixed(2),
      '0.00',
      total.toFixed(2),
      pick(PAYMENT_METHODS),
      faker.string.numeric(4),
      pick(LOCATIONS),
      Math.random() > 0.9 ? faker.lorem.sentence(3) : '',
    ])
  }
  return {
    headers,
    rows,
    delimiter: ',',
    description: 'CSV with 30 columns (most irrelevant)',
  }
}

function generateCurrencySymbols(opts: GeneratorOptions): GeneratedCSV {
  const headers = ['Date', 'Item', 'Qty', 'Revenue', 'Cost']
  const rows: string[][] = []
  const formats = [
    (n: number) => `$${n.toFixed(2)}`,
    (n: number) => `${n.toFixed(2)} USD`,
    (n: number) =>
      `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
    (n: number) => n.toFixed(2), // plain number (should work)
    (n: number) => `(${n.toFixed(2)})`, // accounting negative notation
    (n: number) => `$ ${n.toFixed(2)}`, // space after dollar
  ]

  for (let i = 0; i < opts.records; i++) {
    const date = faker.date.between({ from: opts.startDate, to: opts.endDate })
    const qty = faker.number.int({ min: 1, max: 30 })
    const revenue = randomPrice(5, 50)
    const cost = parseFloat((revenue * 0.35).toFixed(2))
    const fmt = pick(formats)

    rows.push([
      formatDate(date, 'iso'),
      pick(RESTAURANT_ITEMS),
      String(qty),
      fmt(revenue),
      fmt(cost),
    ])
  }
  return {
    headers,
    rows,
    delimiter: ',',
    description: 'Numeric fields with currency symbols ($, USD)',
  }
}

function generateMixedDates(opts: GeneratorOptions): GeneratedCSV {
  const headers = ['Transaction Date', 'Item Name', 'Quantity', 'Unit Price']
  const rows: string[][] = []

  for (let i = 0; i < opts.records; i++) {
    const date = faker.date.between({ from: opts.startDate, to: opts.endDate })
    // Different date format per row
    const formats: Array<'iso' | 'us' | 'eu' | 'long'> = [
      'iso',
      'us',
      'eu',
      'long',
    ]
    const fmt = formats[i % formats.length]

    rows.push([
      formatDate(date, fmt),
      pick(RESTAURANT_ITEMS),
      String(faker.number.int({ min: 1, max: 25 })),
      randomPrice(5, 35).toFixed(2),
    ])
  }
  return {
    headers,
    rows,
    delimiter: ',',
    description: 'CSV with mixed date formats in the same column',
  }
}

function generateNegativeValues(opts: GeneratorOptions): GeneratedCSV {
  const headers = ['Date', 'Item', 'Qty', 'Revenue', 'Cost', 'Type']
  const rows: string[][] = []

  for (let i = 0; i < opts.records; i++) {
    const date = faker.date.between({ from: opts.startDate, to: opts.endDate })
    const isReturn = Math.random() > 0.75
    const qty = faker.number.int({ min: 1, max: 20 })
    const revenue = randomPrice(5, 40)
    const cost = parseFloat((revenue * 0.35).toFixed(2))

    rows.push([
      formatDate(date, 'iso'),
      pick(RESTAURANT_ITEMS),
      isReturn ? `-${qty}` : String(qty),
      isReturn ? `-${revenue.toFixed(2)}` : revenue.toFixed(2),
      isReturn ? `-${cost.toFixed(2)}` : cost.toFixed(2),
      isReturn ? 'Return' : 'Sale',
    ])
  }
  return {
    headers,
    rows,
    delimiter: ',',
    description: 'CSV with negative quantities and revenues (returns/refunds)',
  }
}

function generateSemicolonDelim(opts: GeneratorOptions): GeneratedCSV {
  const result = generateSquarePOS(opts)
  result.delimiter = ';'
  result.description =
    'Square POS data with semicolon delimiter (European Excel)'
  return result
}

function generateTabDelim(opts: GeneratorOptions): GeneratedCSV {
  const result = generateSquarePOS(opts)
  result.delimiter = '\t'
  result.description = 'Square POS data with tab delimiter'
  return result
}

function generateHeadersOnly(_opts: GeneratorOptions): GeneratedCSV {
  return {
    headers: ['Date', 'Item', 'Qty', 'Revenue', 'Cost'],
    rows: [],
    delimiter: ',',
    description: 'Headers only, no data rows',
  }
}

function generateSingleRow(opts: GeneratorOptions): GeneratedCSV {
  const date = faker.date.between({ from: opts.startDate, to: opts.endDate })
  return {
    headers: ['Date', 'Item', 'Qty', 'Revenue', 'Cost'],
    rows: [
      [
        formatDate(date, 'iso'),
        pick(RESTAURANT_ITEMS),
        String(faker.number.int({ min: 1, max: 10 })),
        randomPrice(5, 25).toFixed(2),
        randomPrice(2, 10).toFixed(2),
      ],
    ],
    delimiter: ',',
    description: 'Single data row',
  }
}

// ============================================================================
// Scenario registry
// ============================================================================

const GENERATORS: Record<Scenario, (opts: GeneratorOptions) => GeneratedCSV> = {
  'square-pos': generateSquarePOS,
  'toast-pos': generateToastPOS,
  'clover-pos': generateCloverPOS,
  quickbooks: generateQuickBooks,
  'excel-manual': generateExcelManual,
  'vendor-invoice': generateVendorInvoice,
  'inventory-count': generateInventoryCount,
  'european-format': generateEuropeanFormat,
  'unicode-menu': generateUnicodeMenu,
  'minimal-valid': generateMinimalValid,
  'missing-columns': generateMissingColumns,
  'duplicate-headers': generateDuplicateHeaders,
  'empty-rows': generateEmptyRows,
  'huge-columns': generateHugeColumns,
  'currency-symbols': generateCurrencySymbols,
  'mixed-dates': generateMixedDates,
  'negative-values': generateNegativeValues,
  'semicolon-delim': generateSemicolonDelim,
  'tab-delim': generateTabDelim,
  'headers-only': generateHeadersOnly,
  'single-row': generateSingleRow,
}

const ALL_SCENARIOS: Scenario[] = Object.keys(GENERATORS) as Scenario[]

// ============================================================================
// CSV serialization
// ============================================================================

function serializeCSV(data: GeneratedCSV): string {
  const { headers, rows, delimiter } = data
  const headerLine = headers.map((h) => escapeCSV(h, delimiter)).join(delimiter)
  const dataLines = rows.map((row) =>
    row.map((cell) => escapeCSV(cell, delimiter)).join(delimiter),
  )
  return [headerLine, ...dataLines].join('\n') + '\n'
}

// ============================================================================
// CLI
// ============================================================================

function parseArguments(): {
  scenario?: Scenario
  all: boolean
  records: number
  startDate: Date
  endDate: Date
  output?: string
  outputDir?: string
  seed?: number
  list: boolean
  help: boolean
} {
  const args = process.argv.slice(2)
  const opts = {
    scenario: undefined as Scenario | undefined,
    all: false,
    records: 50,
    startDate: new Date('2025-01-01'),
    endDate: new Date('2026-03-31'),
    output: undefined as string | undefined,
    outputDir: undefined as string | undefined,
    seed: undefined as number | undefined,
    list: false,
    help: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--help' || arg === '-h') opts.help = true
    else if (arg === '--list' || arg === '-l') opts.list = true
    else if (arg === '--all') opts.all = true
    else if (arg === '--scenario' && args[i + 1]) {
      opts.scenario = args[++i] as Scenario
    } else if (arg === '--records' && args[i + 1]) {
      opts.records = parseInt(args[++i], 10)
    } else if (arg === '--start-date' && args[i + 1]) {
      opts.startDate = new Date(args[++i])
    } else if (arg === '--end-date' && args[i + 1]) {
      opts.endDate = new Date(args[++i])
    } else if (arg === '--output' && args[i + 1]) {
      opts.output = args[++i]
    } else if (arg === '--output-dir' && args[i + 1]) {
      opts.outputDir = args[++i]
    } else if (arg === '--seed' && args[i + 1]) {
      opts.seed = parseInt(args[++i], 10)
    }
  }

  return opts
}

function printHelp(): void {
  console.log(`
PantryIQ Advanced CSV Test Data Generator (faker-based)
Produces realistic CSV files simulating real customer uploads.

Usage:
  npx ts-node scripts/generate-test-csv-faker.ts --scenario <name> [options]
  npx ts-node scripts/generate-test-csv-faker.ts --all --output-dir tests/fixtures/generated

Options:
  --scenario NAME     Scenario to generate (see --list)
  --all               Generate ALL scenarios at once
  --records NUMBER    Records per file (default: 50)
  --start-date DATE   Start date YYYY-MM-DD (default: 2025-01-01)
  --end-date DATE     End date YYYY-MM-DD (default: 2026-03-31)
  --output FILE       Output file (single scenario)
  --output-dir DIR    Output directory (--all mode)
  --seed NUMBER       Faker seed for reproducible output
  --list, -l          List all available scenarios
  --help, -h          Show this help

Examples:
  # Generate Square POS export to stdout
  npx ts-node scripts/generate-test-csv-faker.ts --scenario square-pos --records 100

  # Generate all scenarios to fixtures directory
  npx ts-node scripts/generate-test-csv-faker.ts --all --output-dir tests/fixtures/generated --records 75

  # Reproducible output with seed
  npx ts-node scripts/generate-test-csv-faker.ts --scenario toast-pos --seed 42 --output tests/fixtures/toast.csv
  `)
}

function printScenarioList(): void {
  console.log('\nAvailable scenarios:\n')
  for (const scenario of ALL_SCENARIOS) {
    const gen = GENERATORS[scenario]
    // Generate 1 record to get description
    const sample = gen({
      scenario,
      records: 1,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
    })
    console.log(`  ${scenario.padEnd(22)} ${sample.description}`)
  }
  console.log('')
}

async function main(): Promise<void> {
  const args = parseArguments()

  if (args.help) {
    printHelp()
    process.exit(0)
  }

  if (args.list) {
    printScenarioList()
    process.exit(0)
  }

  if (args.seed !== undefined) {
    faker.seed(args.seed)
  }

  if (args.all) {
    const outputDir = args.outputDir || 'tests/fixtures/generated'
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    let totalFiles = 0
    let totalRows = 0

    for (const scenario of ALL_SCENARIOS) {
      const data = GENERATORS[scenario]({
        scenario,
        records: args.records,
        startDate: args.startDate,
        endDate: args.endDate,
        seed: args.seed,
      })

      const ext = data.delimiter === '\t' ? '.tsv' : '.csv'
      const filename = `${scenario}${ext}`
      const filePath = path.join(outputDir, filename)
      const csv = serializeCSV(data)
      fs.writeFileSync(filePath, csv, 'utf-8')

      totalFiles++
      totalRows += data.rows.length
      console.error(
        `  [${String(totalFiles).padStart(2)}] ${filename.padEnd(30)} ${String(data.rows.length).padStart(5)} rows  ${data.description}`,
      )
    }

    console.error(
      `\nGenerated ${totalFiles} files (${totalRows} total rows) in ${outputDir}/`,
    )
    return
  }

  if (!args.scenario) {
    console.error(
      'Error: --scenario required (or use --all). Run with --list to see scenarios.',
    )
    process.exit(1)
  }

  if (!GENERATORS[args.scenario]) {
    console.error(
      `Error: Unknown scenario "${args.scenario}". Run with --list to see available scenarios.`,
    )
    process.exit(1)
  }

  const data = GENERATORS[args.scenario]({
    scenario: args.scenario,
    records: args.records,
    startDate: args.startDate,
    endDate: args.endDate,
    seed: args.seed,
  })

  const csv = serializeCSV(data)

  if (args.output) {
    const dir = path.dirname(args.output)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(args.output, csv, 'utf-8')
    console.error(
      `Generated ${data.rows.length} rows to ${args.output} (${data.description})`,
    )
  } else {
    process.stdout.write(csv)
  }
}

// ============================================================================
// Programmatic API (for use in tests)
// ============================================================================

export {
  GENERATORS,
  ALL_SCENARIOS,
  serializeCSV,
  generateSquarePOS,
  generateToastPOS,
  generateCloverPOS,
  generateQuickBooks,
  generateExcelManual,
  generateVendorInvoice,
  generateInventoryCount,
  generateEuropeanFormat,
  generateUnicodeMenu,
  generateMinimalValid,
  generateMissingColumns,
  generateDuplicateHeaders,
  generateEmptyRows,
  generateHugeColumns,
  generateCurrencySymbols,
  generateMixedDates,
  generateNegativeValues,
  generateSemicolonDelim,
  generateTabDelim,
  generateHeadersOnly,
  generateSingleRow,
}
export type { Scenario, GeneratorOptions, GeneratedCSV }

// Only run main() when executed directly (not imported as module)
const isDirectExecution =
  typeof require !== 'undefined' && require.main === module

if (isDirectExecution) {
  main().catch((error) => {
    console.error('Error:', error.message)
    process.exit(1)
  })
}
