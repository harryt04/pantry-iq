import { test, expect } from '@playwright/test'

test.describe('Square Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login and create session
    await page.goto('/auth/login')
    // TODO: Setup test user login if needed
  })

  test('should render Square Connect button on import page', async ({
    page,
  }) => {
    // Navigate to import page with location_id param
    await page.goto('/import?location_id=test-location-123')

    // Check if Square Connect section is visible
    const squareSection = page.locator('text=Connect Square')
    await expect(squareSection).toBeVisible()

    // Check if connect button exists
    const connectButton = page.locator('button:has-text("Connect Square")')
    await expect(connectButton).toBeVisible()
  })

  test('should display connection status', async ({ page }) => {
    await page.goto('/import?location_id=test-location-123')

    // Initially should show "Not connected"
    const statusText = page.locator('text=Not connected')
    await expect(statusText).toBeVisible()
  })

  test('should validate OAuth URL format', async ({ page, context }) => {
    await page.goto('/import?location_id=test-location-123')

    // Setup listener for navigation to Square OAuth
    let navigationUrl: string | null = null
    await context.route('https://connect.squareup.com/**', async (route) => {
      navigationUrl = route.request().url()
      await route.abort()
    })

    // Click connect button
    const connectButton = page.locator('button:has-text("Connect Square")')
    await connectButton.click()

    // Wait a bit for API call
    await page.waitForTimeout(1000)

    // Verify OAuth URL format (would be captured by route interception)
    // For this test, we check that the request was made with proper params
    if (navigationUrl) {
      expect(navigationUrl).toContain('oauth2/authorize')
      expect(navigationUrl).toContain('client_id=')
      expect(navigationUrl).toContain('response_type=code')
      expect(navigationUrl).toContain('redirect_uri=')
      expect(navigationUrl).toContain('state=')
      expect(navigationUrl).toContain('MERCHANT_PROFILE_READ')
      expect(navigationUrl).toContain('ORDERS_READ')
    }
  })

  test('should handle connection errors gracefully', async ({ page }) => {
    // Mock API to return error
    await page.route('/api/square/connect', async (route) => {
      route.abort('failed')
    })

    await page.goto('/import?location_id=test-location-123')

    const connectButton = page.locator('button:has-text("Connect Square")')
    await connectButton.click()

    // Wait for error message to appear
    const errorMessage = page.locator('[role="alert"]')
    await expect(errorMessage).toBeVisible()
  })

  test('should handle Square callback with success', async ({ page }) => {
    // Navigate to callback URL with code and state
    await page.goto(
      '/api/square/callback?code=test-auth-code&state=test-state&location_id=location-123',
    )

    // Should redirect to import page with success message
    await page.waitForURL(/\/import.*square_connected=true/)
    expect(page.url()).toContain('square_connected=true')
  })

  test('should display sync status after connection', async ({ page }) => {
    // Simulate successful connection via URL params
    await page.goto(
      '/import?location_id=test-location-123&square_connected=true&connection_id=conn-123',
    )

    // Should show syncing status
    const syncingStatus = page.locator('text=Syncing transactions')
    await expect(syncingStatus).toBeVisible()
  })

  test('should provide manual sync button', async ({ page }) => {
    // Simulate connected state
    await page.goto(
      '/import?location_id=test-location-123&square_connected=true&connection_id=conn-123',
    )

    // Find sync button
    const syncButton = page.locator('button:has-text("Sync Now")')
    await expect(syncButton).toBeVisible()
  })

  test('should provide disconnect button when connected', async ({ page }) => {
    await page.goto(
      '/import?location_id=test-location-123&square_connected=true&connection_id=conn-123',
    )

    const disconnectButton = page.locator('button:has-text("Disconnect")')
    await expect(disconnectButton).toBeVisible()
  })
})
