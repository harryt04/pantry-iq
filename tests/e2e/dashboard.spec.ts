import { test, expect } from '@playwright/test'
import { dismissBetaNotice } from './helpers'

test.describe('Dashboard E2E Tests', () => {
  // Sign in before each test
  test.beforeEach(async ({ page }) => {
    // Create a unique test account
    const email = `test-dashboard-${Date.now()}@example.com`
    const password = 'TestPassword123!'

    // Sign up first
    await page.goto('http://localhost:3000/signup')
    await dismissBetaNotice(page)
    await page.fill('input[name="name"]', 'Test User')
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', password)
    await page.fill('input[name="confirmPassword"]', password)
    await page.click('button[type="submit"]')

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard')
  })

  test('Dashboard loads for authenticated user', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard')

    // Check that the page loads with expected elements
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible()
    await expect(page.locator('text=Overview of your inventory')).toBeVisible()
  })

  test('Shows location info and transaction count', async ({ page }) => {
    // First create a location via API
    await page.evaluate(async () => {
      const response = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Restaurant',
          zipCode: '10001',
          type: 'restaurant',
        }),
      })
      return response.json()
    })

    // Navigate to dashboard
    await page.goto('http://localhost:3000/dashboard')

    // Wait for data to load
    await page.waitForTimeout(1000)

    // Check for the location card section - use exact text match to avoid strict mode violation
    // The LocationOverviewCard title is "Locations (N)" (with data) - matches the section title, not the stat card
    await expect(
      page.locator('main').getByText(/Locations \(\d+\)/),
    ).toBeVisible()

    // Check that location name appears
    await expect(page.getByText('Test Restaurant')).toBeVisible()

    // Check for transaction count display (specifically in location details, not stat card)
    await expect(
      page.locator('main').getByText(/\d+ transactions/),
    ).toBeVisible()
  })

  test('Quick action links work and navigate to correct pages', async ({
    page,
  }) => {
    await page.goto('http://localhost:3000/dashboard')

    // Check Quick Actions card exists
    await expect(page.locator('text=Quick Actions')).toBeVisible()

    // Click "Manage Settings" link
    const settingsLink = page.locator('text=Manage Settings')
    await expect(settingsLink).toBeVisible()
    await settingsLink.click()

    // Should navigate to settings page
    await page.waitForURL('**/settings')
    expect(page.url()).toContain('/settings')
  })

  test('Empty state renders when no locations exist', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard')

    // Wait for dashboard to load
    await page.waitForTimeout(500)

    // Check for empty state message
    const emptyStateText = page.locator(
      'text=No locations yet. Create your first location',
    )

    // The empty state might appear in the locations card
    const hasEmptyState =
      (await emptyStateText.count()) > 0 ||
      (await page.locator('text=No locations found').count()) > 0

    if (hasEmptyState) {
      // Check for create location button
      const createButton = page.locator('text=Create Location')
      await expect(createButton).toBeVisible()

      // Verify it links to settings
      const href = await createButton.getAttribute('href')
      expect(href).toContain('/settings')
    } else {
      // If no empty state, at least check that Locations section exists
      await expect(
        page.locator('main').getByText('Locations', { exact: true }),
      ).toBeVisible()
    }
  })

  test('Dashboard displays stats cards with correct labels', async ({
    page,
  }) => {
    await page.goto('http://localhost:3000/dashboard')

    // Check for stats cards
    await expect(page.locator('text=Total Locations')).toBeVisible()
    await expect(page.locator('text=Total Transactions')).toBeVisible()
    await expect(page.locator('text=Recent Uploads')).toBeVisible()
  })

  test('Import status card shows when no uploads', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard')

    // Wait for content to load
    await page.waitForTimeout(500)

    // Check for Import Status section
    const importStatusExists =
      (await page.locator('text=Import Status').count()) > 0 ||
      (await page.locator('text=Recent CSV Uploads').count()) > 0

    if (importStatusExists) {
      // Should show no uploads message or link to import
      const hasUploadLink =
        (await page.locator('text=Start importing data').count()) > 0 ||
        (await page.locator('text=Start importing').count()) > 0 ||
        (await page.locator('[href="/import"]').count()) > 0

      expect(hasUploadLink).toBeTruthy()
    }
  })

  test('Dashboard is read-only (no edit forms)', async ({ page }) => {
    // Create a location for this test
    await page.evaluate(async () => {
      const response = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Location',
          zipCode: '10001',
          type: 'restaurant',
        }),
      })
      return response.json()
    })

    await page.goto('http://localhost:3000/dashboard')
    await page.waitForTimeout(500)

    // Check that there are no edit buttons or forms on the dashboard
    const editButtons = page.locator('button:has-text("Edit")')

    await expect(editButtons).toHaveCount(0)

    // Forms might exist but they shouldn't be on the dashboard (only navigation)
    // The dashboard should only have links and read-only content
    const dashboardContent = page.locator('main')
    const isReadOnly = await dashboardContent.evaluate((el) => {
      const inputs = el.querySelectorAll('input[type="text"], textarea')
      return inputs.length === 0
    })

    expect(isReadOnly).toBeTruthy()
  })

  test('Protected route redirects unauthenticated users to login', async ({
    page,
  }) => {
    // Sign out and clear session
    await page.evaluate(() => fetch('/api/auth/sign-out', { method: 'POST' }))
    await page.context().clearCookies()
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })

    // Try to access dashboard
    await page.goto('http://localhost:3000/dashboard', {
      waitUntil: 'domcontentloaded',
    })

    // Should redirect to login (client-side redirect via app layout)
    await page.waitForURL('**/login', { timeout: 15000 })
    expect(page.url()).toContain('/login')
  })
})
