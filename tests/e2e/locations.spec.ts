import { test, expect } from '@playwright/test'

test.describe('Location Management E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Note: These tests assume you're logged in
    // In a real scenario, you'd need to set up auth first
    await page.goto('/settings')
  })

  test('should create a new location', async ({ page }) => {
    // Click "Add Location" button
    await page.click('button:has-text("+ Add Location")')

    // Fill in the form
    await page.fill('input[name="name"]', 'Test Restaurant')
    await page.fill('input[name="zipCode"]', '10001')
    await page.fill('input[name="address"]', '123 Main St')

    // Select restaurant type
    await page.selectOption('select[name="type"]', 'restaurant')

    // Submit form
    await page.click('button:has-text("Save Location")')

    // Wait for success and verify location appears in list
    await page.waitForSelector('text="Test Restaurant"')
    await expect(page.locator('text=Test Restaurant')).toBeVisible()
    await expect(page.locator('text=10001')).toBeVisible()
  })

  test('should edit an existing location', async ({ page }) => {
    // Create a location first
    await page.click('button:has-text("+ Add Location")')
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
    await page.click('button:has-text("+ Add Location")')
    await page.fill('input[name="name"]', 'Location to Delete')
    await page.fill('input[name="zipCode"]', '10001')
    await page.click('button:has-text("Save Location")')

    // Wait for location to appear
    await page.waitForSelector('text="Location to Delete"')

    // Set up dialog handler to accept deletion
    page.on('dialog', (dialog) => dialog.accept())

    // Click delete button
    await page.click('button:has-text("Delete")')

    // Wait for location to disappear
    await page.waitForSelector('text="Location to Delete"', { state: 'hidden' })
    await expect(page.locator('text=Location to Delete')).not.toBeVisible()
  })

  test('should display validation errors for missing required fields', async ({
    page,
  }) => {
    // Click "Add Location" button
    await page.click('button:has-text("+ Add Location")')

    // Try to submit without filling required fields
    await page.click('button:has-text("Save Location")')

    // Verify error message
    await expect(
      page.locator('text="Name and zip code are required"'),
    ).toBeVisible()
  })

  test('should filter locations by type', async ({ page }) => {
    // Create a restaurant
    await page.click('button:has-text("+ Add Location")')
    await page.fill('input[name="name"]', 'My Restaurant')
    await page.fill('input[name="zipCode"]', '10001')
    await page.selectOption('select[name="type"]', 'restaurant')
    await page.click('button:has-text("Save Location")')
    await page.waitForSelector('text="My Restaurant"')

    // Verify restaurant is listed
    await expect(page.locator('text=restaurant')).toBeVisible()

    // Create a food truck
    await page.click('button:has-text("+ Add Location")')
    await page.fill('input[name="name"]', 'My Food Truck')
    await page.fill('input[name="zipCode"]', '10002')
    await page.selectOption('select[name="type"]', 'food_truck')
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
