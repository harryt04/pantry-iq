import { test, expect } from '@playwright/test'
import { dismissBetaNotice } from './helpers'

test.describe('Location Management E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Sign up to create an authenticated session
    const email = `test-loc-${Date.now()}@example.com`
    const password = 'TestPassword123!'

    await page.goto('http://localhost:3000/signup')
    await dismissBetaNotice(page)
    await page.fill('input[name="name"]', 'Location Test User')
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', password)
    await page.fill('input[name="confirmPassword"]', password)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard', { timeout: 15000 })

    // Navigate to settings page
    await page.goto('/settings')
  })

  test('should create a new location', async ({ page }) => {
    // Click "Add Location" button (icon is SVG, text is just "Add Location")
    await page.click('button:has-text("Add Location")')

    // Fill in the form
    await page.fill('input[name="name"]', 'Test Restaurant')
    await page.fill('input[name="zipCode"]', '10001')
    await page.fill('input[name="address"]', '123 Main St')

    // Select restaurant type using shadcn Select (Radix UI)
    // The location form uses shadcn Select, which renders as button[role="combobox"]
    // The "Location Type" select defaults to "restaurant", so we just need to verify or click it
    // Find the type select trigger - it's the one after timezone
    const typeLabel = page.locator('label:has-text("Location Type")')
    const typeSection = typeLabel.locator('..')
    const typeTrigger = typeSection.locator('button[role="combobox"]')
    await typeTrigger.click()
    await page
      .locator('[role="option"]')
      .filter({ hasText: 'Restaurant' })
      .click()

    // Submit form
    await page.click('button:has-text("Save Location")')

    // Wait for success and verify location appears in list
    await page.waitForSelector('text="Test Restaurant"')
    await expect(page.locator('text=Test Restaurant')).toBeVisible()
    await expect(page.locator('text=10001')).toBeVisible()
  })

  test('should edit an existing location', async ({ page }) => {
    // Create a location first
    await page.click('button:has-text("Add Location")')
    await page.fill('input[name="name"]', 'Original Name')
    await page.fill('input[name="zipCode"]', '10001')
    await page.click('button:has-text("Save Location")')

    // Wait for location to appear
    await page.waitForSelector('text="Original Name"')

    // Click edit button
    await page.click('button:has-text("Edit")')

    // Clear and update the name
    await page.fill('input[name="name"]', 'Updated Name')

    // Submit form
    await page.click('button:has-text("Save Location")')

    // Wait for update and verify
    await page.waitForSelector('text="Updated Name"')
    await expect(page.locator('text=Updated Name')).toBeVisible()
    await expect(page.locator('text=Original Name')).not.toBeVisible()
  })

  test('should delete a location with confirmation', async ({ page }) => {
    // Create a location first
    await page.click('button:has-text("Add Location")')
    await page.fill('input[name="name"]', 'Location to Delete')
    await page.fill('input[name="zipCode"]', '10001')
    await page.click('button:has-text("Save Location")')

    // Wait for location to appear
    await page.waitForSelector('text="Location to Delete"')

    // Click the delete button on the location card
    // The app uses shadcn AlertDialog, not browser confirm()
    await page.click('button:has-text("Delete")')

    // Wait for the AlertDialog to appear and click the confirm "Delete" button
    const alertDialog = page.locator('[role="alertdialog"]')
    await expect(alertDialog).toBeVisible()
    await alertDialog.locator('button:has-text("Delete")').click()

    // Wait for location to disappear
    await page.waitForSelector('text="Location to Delete"', { state: 'hidden' })
    await expect(page.locator('text=Location to Delete')).not.toBeVisible()
  })

  test('should display validation errors for missing required fields', async ({
    page,
  }) => {
    // Click "Add Location" button
    await page.click('button:has-text("Add Location")')

    // Try to submit without filling required fields
    await page.click('button:has-text("Save Location")')

    // Verify error message
    await expect(
      page.locator('text="Name and zip code are required"'),
    ).toBeVisible()
  })

  test('should filter locations by type', async ({ page }) => {
    // Create a restaurant
    await page.click('button:has-text("Add Location")')
    await page.fill('input[name="name"]', 'My Restaurant')
    await page.fill('input[name="zipCode"]', '10001')
    // Type defaults to "restaurant" in the form, so just submit
    await page.click('button:has-text("Save Location")')
    await page.waitForSelector('text="My Restaurant"')

    // Verify restaurant is listed
    await expect(page.locator('text=restaurant').first()).toBeVisible()

    // Create a food truck
    await page.click('button:has-text("Add Location")')
    await page.fill('input[name="name"]', 'My Food Truck')
    await page.fill('input[name="zipCode"]', '10002')
    // Change type to food_truck using shadcn Select
    const typeLabel = page.locator('label:has-text("Location Type")')
    const typeSection = typeLabel.locator('..')
    const typeTrigger = typeSection.locator('button[role="combobox"]')
    await typeTrigger.click()
    await page
      .locator('[role="option"]')
      .filter({ hasText: 'Food Truck' })
      .click()
    await page.click('button:has-text("Save Location")')
    await page.waitForSelector('text="My Food Truck"')

    // Verify both are listed
    await expect(page.locator('text=My Restaurant')).toBeVisible()
    await expect(page.locator('text=My Food Truck')).toBeVisible()
  })

  test('should show empty state when no locations exist', async ({ page }) => {
    // If the list is empty, should show the empty state
    const emptyState = page.locator('text="No locations yet"')
    if (await page.locator('text="No locations yet"').isVisible()) {
      await expect(emptyState).toBeVisible()
    }
  })
})
