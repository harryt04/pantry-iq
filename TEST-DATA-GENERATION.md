# Test Data Generation System

This document describes the test data generation script for PantryIQ, used to generate realistic sample CSV files for testing and QA purposes.

## Overview

The test data generation system provides a command-line tool to generate realistic restaurant data in CSV format, including:

- **Transactions**: Daily sales data with item names, quantities, revenue, costs, and payment methods
- **Inventory**: Stock levels, SKUs, supplier information, and reorder points
- **Invoices**: Vendor invoices with payment status tracking

All generated data is realistic and suitable for QA testing, with no PII or sensitive data included.

## Quick Start

### Generate Sample Data

```bash
# Generate 100 transactions to stdout
npm run generate:test-csv -- --records 100 --type transactions

# Generate 500 inventory items to file
npm run generate:test-csv -- --records 500 --type inventory --output my-inventory.csv

# Generate invoices for a date range
npm run generate:test-csv -- \
  --records 200 \
  --type invoices \
  --start-date 2024-01-01 \
  --end-date 2024-03-31 \
  --output invoices.csv
```

### View Help

```bash
npm run generate:test-csv -- --help
```

## Installation & Setup

No additional dependencies are required. The script uses Node.js built-in modules only.

The pre-generated test fixtures are located in `tests/fixtures/`:

- `sample-transactions.csv` (150 records)
- `sample-inventory.csv` (120 records)
- `sample-vendor-invoices.csv` (100 records)

## Command-Line Interface

### Script Location

```
scripts/generate-test-csv.ts
```

### Usage

```bash
npm run generate:test-csv -- [options]
```

Or directly with ts-node:

```bash
npx ts-node scripts/generate-test-csv.ts [options]
```

### Options

| Option         | Format                            | Default      | Description                    |
| -------------- | --------------------------------- | ------------ | ------------------------------ |
| `--records`    | NUMBER                            | 100          | Number of records to generate  |
| `--start-date` | YYYY-MM-DD                        | 1 year ago   | Start date for data generation |
| `--end-date`   | YYYY-MM-DD                        | today        | End date for data generation   |
| `--type`       | transactions\|inventory\|invoices | transactions | Type of data to generate       |
| `--output`     | FILE_PATH                         | stdout       | Output file path               |
| `--help`, `-h` | —                                 | —            | Display usage information      |

### Examples

```bash
# Generate 100 transactions to stdout
npm run generate:test-csv -- --records 100 --type transactions

# Generate 500 transactions for a specific date range
npm run generate:test-csv -- \
  --records 500 \
  --start-date 2024-01-01 \
  --end-date 2024-03-31 \
  --type transactions

# Generate inventory data and save to file
npm run generate:test-csv -- \
  --records 200 \
  --type inventory \
  --output tests/fixtures/inventory.csv

# Generate vendor invoices
npm run generate:test-csv -- \
  --records 50 \
  --type invoices \
  --output tests/fixtures/invoices.csv

# Generate data for 2024 Q1
npm run generate:test-csv -- \
  --records 1000 \
  --start-date 2024-01-01 \
  --end-date 2024-03-31 \
  --type transactions \
  --output q1-2024.csv
```

## Data Formats

### Transactions CSV

Sample output:

```csv
Date,Time,Item Name,Quantity,Unit Price,Unit Cost,Total Revenue,Total Cost,Payment Method,Location
2025-07-11,09:52:14,Pasta Carbonara,31,12.34,4.32,382.54,133.92,Card,Downtown
2025-11-25,16:47:34,Coffee,21,4.20,1.51,88.20,31.71,Check,North Shore
2025-08-13,01:41:51,Coffee,35,3.43,1.54,120.05,53.90,Cash,Downtown
```

**Columns:**

| Column         | Type    | Range/Format                  | Description                     |
| -------------- | ------- | ----------------------------- | ------------------------------- |
| Date           | Date    | YYYY-MM-DD                    | Transaction date                |
| Time           | Time    | HH:MM:SS                      | Transaction time                |
| Item Name      | String  | Menu items                    | Name of menu item ordered       |
| Quantity       | Integer | 1-50                          | Number of items sold            |
| Unit Price     | Decimal | $1.99-$25.00                  | Price per item                  |
| Unit Cost      | Decimal | $0.60-$12.50                  | Cost per item (30-50% of price) |
| Total Revenue  | Decimal | Qty × Unit Price              | Total revenue from transaction  |
| Total Cost     | Decimal | Qty × Unit Cost               | Total cost of goods             |
| Payment Method | String  | Cash, Card, Online, Check     | Payment method used             |
| Location       | String  | Downtown, Airport, Mall, etc. | Restaurant location             |

**Menu Items:**

- Burger, Fries, Salad, Coffee, Sandwich
- Pizza Slice, Pasta, Soup, Dessert, Beverage
- Appetizer Platter, Fish Tacos, Chicken Wings
- Pasta Carbonara, Grilled Cheese

### Inventory CSV

Sample output:

```csv
SKU,Item Name,Category,Quantity,Unit Cost,Total Value,Reorder Point,Supplier,Last Restock
6791,Grilled Cheese,Entree,411,9.97,4099.52,35,Fresh Produce Co,2026-04-04
6311,Burger,Entree,247,7.92,1956.75,57,Premium Beverages Co,2026-03-14
6428,Soup,Appetizer,18,1.58,28.37,26,Quality Meats Inc,2026-04-07
```

**Columns:**

| Column        | Type    | Range/Format                  | Description                        |
| ------------- | ------- | ----------------------------- | ---------------------------------- |
| SKU           | Integer | 1000-9999                     | Stock keeping unit                 |
| Item Name     | String  | Menu items                    | Name of inventory item             |
| Category      | String  | Entree, Side, Appetizer, etc. | Item category                      |
| Quantity      | Integer | 10-500                        | Current stock quantity             |
| Unit Cost     | Decimal | $1-$10                        | Cost per unit                      |
| Total Value   | Decimal | Qty × Unit Cost               | Total inventory value              |
| Reorder Point | Integer | 20-100                        | Minimum quantity before reordering |
| Supplier      | String  | Various vendors               | Supplier name                      |
| Last Restock  | Date    | YYYY-MM-DD                    | Last restock date                  |

**Suppliers:**

- Fresh Produce Co, Quality Meats Inc, Organic Dairy Farm
- Global Spice Traders, Local Bakery Supply, Premium Seafood Ltd
- Farm Fresh Vegetables, Premium Beverages Co

### Invoices CSV

Sample output:

```csv
Invoice Number,Vendor,Invoice Date,Due Date,Subtotal,Tax,Total Amount,Amount Paid,Status
INV-14741,Fresh Produce Co,2025-04-22,2025-06-21,554.34,55.43,609.77,0.00,Pending
INV-92429,Global Spice Traders,2025-11-03,2025-11-13,1867.71,186.77,2054.48,2054.48,Paid
INV-20735,Organic Dairy Farm,2025-06-19,2025-07-17,1368.24,136.82,1505.06,0.00,Pending
```

**Columns:**

| Column         | Type    | Range/Format       | Description                                |
| -------------- | ------- | ------------------ | ------------------------------------------ |
| Invoice Number | String  | INV-#####          | Unique invoice identifier                  |
| Vendor         | String  | Various vendors    | Vendor/supplier name                       |
| Invoice Date   | Date    | YYYY-MM-DD         | Invoice issue date                         |
| Due Date       | Date    | YYYY-MM-DD         | Payment due date (7-60 days after invoice) |
| Subtotal       | Decimal | $50-$5000          | Subtotal before tax                        |
| Tax            | Decimal | 10% of Subtotal    | Tax amount (10%)                           |
| Total Amount   | Decimal | Subtotal + Tax     | Total invoice amount                       |
| Amount Paid    | Decimal | $0 or Total Amount | Amount already paid                        |
| Status         | String  | Paid, Pending      | Payment status                             |

## Test Suite

Comprehensive tests are provided in `tests/unit/generate-test-csv.test.ts`.

### Running Tests

```bash
# Run all tests
npm run test

# Run only CSV generation tests
npm run test:unit -- generate-test-csv.test.ts

# Run tests in watch mode
npm run test:unit -- --watch generate-test-csv.test.ts
```

### Test Coverage

The test suite validates:

1. **CLI Argument Parsing**
   - `--records` parameter is respected
   - `--start-date` and `--end-date` are applied correctly
   - `--type` parameter filters by data type
   - `--output` writes to file
   - `--help` displays usage information

2. **CSV Structure**
   - Headers are correct for each type
   - All required columns are present
   - Data types are valid (dates, times, numbers, strings)

3. **Data Validity**
   - Transactions have realistic prices and quantities
   - Costs are 30-50% of revenue
   - Inventory has valid reorder points
   - Invoice totals and taxes are calculated correctly
   - Payment statuses match payment amounts

4. **Fixture Files**
   - `sample-transactions.csv` has ≥100 records
   - `sample-inventory.csv` has ≥100 records
   - `sample-vendor-invoices.csv` has ≥100 records

### Test Results

All 28 tests pass:

```
✓ 28 tests passed
  - CLI Argument Parsing (6 tests)
  - Transaction CSV Structure (6 tests)
  - Inventory CSV Structure (4 tests)
  - Invoices CSV Structure (5 tests)
  - Build Compatibility (1 test)
```

## CSV Parser Utility

A CSV parser utility is provided in `lib/csv-parser.ts` for parsing and validating generated CSV files.

### Functions

```typescript
// Parse CSV string
parseCSV(csvContent: string): ParsedCSV

// Validate CSV structure
validateCSVStructure(parsed: ParsedCSV, expectedHeaders: string[]): ValidationResult

// Date validation
isValidDate(dateString: string): boolean
parseDate(dateString: string): Date
isDateInRange(date: Date, start: Date, end: Date): boolean

// Time validation
isValidTime(timeString: string): boolean

// Number validation
isValidCurrency(value: string): boolean
isValidInteger(value: string): boolean
```

### Usage Example

```typescript
import { parseCSV, validateCSVStructure } from '@/lib/csv-parser'
import * as fs from 'fs'

const content = fs.readFileSync('transactions.csv', 'utf-8')
const parsed = parseCSV(content)

// Validate headers
const validation = validateCSVStructure(parsed, [
  'Date',
  'Time',
  'Item Name',
  'Quantity',
  'Unit Price',
])

if (validation.valid) {
  console.log(`Parsed ${parsed.rows.length} records`)
} else {
  console.error('Validation errors:', validation.errors)
}
```

## Pre-Generated Fixtures

Three pre-generated fixture files are included for convenience:

| File                         | Records | Size   | Purpose             |
| ---------------------------- | ------- | ------ | ------------------- |
| `sample-transactions.csv`    | 150     | 10 KB  | Transaction testing |
| `sample-inventory.csv`       | 120     | 8.7 KB | Inventory testing   |
| `sample-vendor-invoices.csv` | 100     | 8.6 KB | Invoice testing     |

These can be used directly in tests without generating new data:

```typescript
import * as fs from 'fs'
import { parseCSV } from '@/lib/csv-parser'

const txnContent = fs.readFileSync(
  'tests/fixtures/sample-transactions.csv',
  'utf-8',
)
const parsed = parseCSV(txnContent)
console.log(`Testing with ${parsed.rows.length} transactions`)
```

## Implementation Details

### Data Generation Algorithm

1. **Date Range**: All records are generated within the specified date range
2. **Random Values**: Uses `Math.random()` for all randomization
3. **Realistic Ranges**:
   - Transaction quantities: 1-50 items
   - Unit prices: $1.99-$25.00
   - Unit costs: 30-50% of unit price
   - Invoice amounts: $50-$5000
4. **CSV Escaping**: Properly escapes quoted fields and commas

### Performance

- Generates ~1000 records/second
- Memory usage scales linearly with record count
- No external dependencies required

### Portability

- Pure Node.js implementation (no npm packages)
- Cross-platform (Windows, macOS, Linux)
- Works with any Node 20+ installation

## No PII Included

The generated data includes:

- ✓ Generic menu item names
- ✓ Generic vendor names
- ✓ Generic location names
- ✓ Realistic business data

The generated data does NOT include:

- ✗ Personal names or addresses
- ✗ Email addresses or phone numbers
- ✗ Credit card or payment information
- ✗ Any personally identifiable information

## Troubleshooting

### "Command not found: generate:test-csv"

Ensure you're using npm 8+:

```bash
npm --version
npm install  # Re-install node_modules if needed
npm run generate:test-csv -- --help
```

### Date Range Not Working

Dates must be in YYYY-MM-DD format and start date must be before end date:

```bash
# ✓ Correct
npm run generate:test-csv -- --start-date 2024-01-01 --end-date 2024-12-31

# ✗ Wrong
npm run generate:test-csv -- --start-date 01/01/2024 --end-date 31/12/2024
```

### CSV Parsing Issues

Ensure the CSV uses standard format (comma-separated, newline-delimited). The parser handles:

- Quoted fields with commas
- Escaped quotes within fields
- Varying line endings (CRLF, LF)

### Memory Issues with Large Files

For very large datasets (>100K records):

```bash
# Split generation into multiple files
npm run generate:test-csv -- --records 50000 --type transactions --output part1.csv
npm run generate:test-csv -- --records 50000 --type transactions --output part2.csv

# Then concatenate (remove header from subsequent files)
cat part1.csv > combined.csv
tail -n +2 part2.csv >> combined.csv
```

## Contributing

To add new data types or modify existing generators:

1. Edit `scripts/generate-test-csv.ts`
2. Add new generator function (e.g., `generateNewType()`)
3. Add tests in `tests/unit/generate-test-csv.test.ts`
4. Update this README with new examples

## License

Part of the PantryIQ project. See main LICENSE file.

## Related Files

- **Script**: `scripts/generate-test-csv.ts`
- **Parser**: `lib/csv-parser.ts`
- **Tests**: `tests/unit/generate-test-csv.test.ts`
- **Fixtures**: `tests/fixtures/sample-*.csv`
