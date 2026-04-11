import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

/**
 * Create a test CSV file with sample data
 */
function createTestCSV(): string {
  const csvContent = `Date,Item,Quantity,Revenue,Cost
2024-01-15,Widget A,10,99.99,50.00
2024-01-16,Widget B,5,49.99,25.00
2024-01-17,Gadget C,3,199.99,100.00
2024-01-18,Widget A,8,79.99,40.00
2024-01-19,Gadget D,2,299.99,150.00`

  const tempDir = path.join('/tmp', 'csv-test-' + Date.now())
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }

  const filePath = path.join(tempDir, 'test-data.csv')
  fs.writeFileSync(filePath, csvContent)
  return filePath
}

test.describe('CSV Import E2E', () => {
  let testCSVPath: string

  test.beforeEach(async ({ page }) => {
    // Create test CSV file
    testCSVPath = createTestCSV()

    // Note: Assumes you have a location created in your test database
    // You may need to set this up in a real scenario or mock authentication
    // For now, we'll navigate to the import page with a mock location ID
    await page.goto('/import?location_id=test-location-id')
  })

  test.afterEach(async () => {
    // Clean up test CSV file
    if (fs.existsSync(testCSVPath)) {
      fs.unlinkSync(testCSVPath)
    }
  })

  test('should upload CSV and see preview', async ({ page }) => {
    // Wait for the upload zone to be visible
    await page.waitForSelector('text="Upload CSV File"')

    // Upload the CSV file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testCSVPath)

    // Wait for upload to complete and preview to appear
    await page.waitForSelector('text="Map Fields"')

    // Verify preview shows data
    await expect(page.locator('text="Date"')).toBeVisible()
    await expect(page.locator('text="Item"')).toBeVisible()
    await expect(page.locator('text="Widget A"')).toBeVisible()
  })

  test('should show AI-suggested field mappings', async ({ page }) => {
    // Upload CSV
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testCSVPath)

    // Wait for field mapping UI to appear
    await page.waitForSelector('text="Map Fields"')

    // Verify mapping UI is visible
    await expect(page.locator('text="Confirm & Import"')).toBeVisible()

    // Check that dropdown selects are present for each column
    const selects = page.locator('select')
    const selectCount = await selects.count()
    expect(selectCount).toBeGreaterThan(0)
  })

  test('should allow manual mapping adjustment', async ({ page }) => {
    // Upload CSV
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testCSVPath)

    // Wait for mapping UI
    await page.waitForSelector('text="Map Fields"')

    // Try to change a mapping
    const firstSelect = page.locator('select').first()
    await firstSelect.selectOption('item')

    // Verify it was changed
    const selectedValue = await firstSelect.inputValue()
    expect(selectedValue).toBe('item')
  })

  test('should validate required fields before import', async ({ page }) => {
    // Upload CSV
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testCSVPath)

    // Wait for mapping UI
    await page.waitForSelector('text="Map Fields"')

    // Try to map all fields to null (skip all)
    const selects = page.locator('select')
    const selectCount = await selects.count()
    for (let i = 0; i < selectCount; i++) {
      await selects.nth(i).selectOption('')
    }

    // Click confirm
    await page.click('text="Confirm & Import"')

    // Should show error about missing required field
    await expect(
      page.locator('text=/Missing required field|item must be mapped/i'),
    ).toBeVisible({ timeout: 5000 })
  })

  test('should complete import with valid mapping', async ({ page }) => {
    // Upload CSV
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testCSVPath)

    // Wait for mapping UI
    await page.waitForSelector('text="Map Fields"')

    // Leave suggested mappings as-is and confirm
    await page.click('text="Confirm & Import"')

    // Wait for import to complete
    await page.waitForSelector('text="Import Complete"', { timeout: 10000 })

    // Verify success message
    await expect(
      page.locator('text="rows imported successfully"'),
    ).toBeVisible()
  })

  test('should show import errors for invalid rows', async ({ page }) => {
    // Create CSV with some invalid data
    const csvWithErrors = `Date,Item,Quantity,Revenue
invalid-date,Widget A,10,99.99
,Widget B,5,49.99
2024-01-18,Widget C,invalid-qty,199.99`

    const tempFile = path.join('/tmp', 'test-errors-' + Date.now() + '.csv')
    fs.writeFileSync(tempFile, csvWithErrors)

    try {
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(tempFile)

      await page.waitForSelector('text="Map Fields"')

      // Ensure item is mapped to the Item column
      await page.click('text="Confirm & Import"')

      // Wait for import to complete
      await page.waitForSelector('text="Import Complete"', { timeout: 10000 })

      // Should show import results with some errors
      await expect(page.locator('text="failed to import"')).toBeVisible({
        timeout: 5000,
      })
    } finally {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile)
      }
    }
  })
})
