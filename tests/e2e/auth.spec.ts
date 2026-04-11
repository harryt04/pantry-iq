import { test, expect } from '@playwright/test'

test.describe('Authentication E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Go to signup page before each test
    await page.goto('http://localhost:3000/signup')
  })

  test('should sign up with valid email/password and redirect to dashboard', async ({
    page,
  }) => {
    const email = `test-${Date.now()}@example.com`
    const password = 'TestPassword123!'

    // Fill signup form
    await page.fill('input[name="name"]', 'Test User')
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', password)
    await page.fill('input[name="confirmPassword"]', password)

    // Submit form
    await page.click('button[type="submit"]')

    // Wait for redirect and verify we're on dashboard
    await page.waitForURL('**/dashboard')
    expect(page.url()).toContain('/dashboard')
  })

  test('should sign in with valid credentials and set session cookie', async ({
    page,
  }) => {
    const email = `test-${Date.now()}@example.com`
    const password = 'TestPassword123!'

    // First, sign up
    await page.fill('input[name="name"]', 'Test User')
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', password)
    await page.fill('input[name="confirmPassword"]', password)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard')

    // Log out by going to login page
    await page.goto('http://localhost:3000/login')

    // Sign in with the same credentials
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', password)
    await page.click('button[type="submit"]')

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard')

    // Check for session cookie
    const cookies = await page.context().cookies()
    const sessionCookie = cookies.find((c) => c.name.includes('session'))
    expect(sessionCookie).toBeDefined()
    expect(sessionCookie?.httpOnly).toBe(true)
    expect(sessionCookie?.secure).toBe(false) // localhost is not secure
  })

  test('should redirect to login when accessing protected route while logged out', async ({
    page,
  }) => {
    // Try to access dashboard while not logged in
    await page.goto('http://localhost:3000/dashboard')

    // Should redirect to login
    await page.waitForURL('**/login')
    expect(page.url()).toContain('/login')
  })

  test('should redirect to dashboard when accessing login while logged in', async ({
    page,
  }) => {
    // First sign up to create a session
    const email = `test-${Date.now()}@example.com`
    const password = 'TestPassword123!'

    await page.fill('input[name="name"]', 'Test User')
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', password)
    await page.fill('input[name="confirmPassword"]', password)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard')

    // Try to visit login while logged in
    await page.goto('http://localhost:3000/login')

    // Should redirect to dashboard
    await page.waitForURL('**/dashboard')
    expect(page.url()).toContain('/dashboard')
  })

  test('should show error on sign up with invalid email', async ({ page }) => {
    await page.fill('input[name="name"]', 'Test User')
    await page.fill('input[name="email"]', 'not-an-email')
    await page.fill('input[name="password"]', 'TestPassword123!')
    await page.fill('input[name="confirmPassword"]', 'TestPassword123!')

    // Try to submit - browser validation should prevent submission
    const submitButton = page.locator('button[type="submit"]')
    const isDisabled = await submitButton.isDisabled()

    // Either disabled or we can check validity
    if (!isDisabled) {
      await page.click('button[type="submit"]')
      // Check for error message
      const errorElement = page.locator('div:has-text("error")')
      await expect(errorElement).toBeVisible()
    }
  })

  test('should show error on sign in with wrong password', async ({ page }) => {
    // First, create an account
    const email = `test-${Date.now()}@example.com`
    const password = 'TestPassword123!'

    await page.fill('input[name="name"]', 'Test User')
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', password)
    await page.fill('input[name="confirmPassword"]', password)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard')

    // Go to login
    await page.goto('http://localhost:3000/login')

    // Try to sign in with wrong password
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', 'WrongPassword123!')
    await page.click('button[type="submit"]')

    // Should show error message
    const errorElement = page.locator('div[class*="text-red"]')
    await expect(errorElement).toBeVisible()
  })

  test('GET /api/auth/get-session returns current user when authenticated', async ({
    page,
  }) => {
    // Sign up first
    const email = `test-${Date.now()}@example.com`
    const password = 'TestPassword123!'

    await page.fill('input[name="name"]', 'Test User')
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', password)
    await page.fill('input[name="confirmPassword"]', password)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard')

    // Call get-session endpoint
    const response = await page.evaluate(() =>
      fetch('/api/auth/get-session').then((res) => res.json()),
    )

    expect(response.user).toBeDefined()
    expect(response.user.email).toBe(email)
  })

  test('GET /api/auth/get-session returns null when not authenticated', async ({
    page,
  }) => {
    // Make request without session
    const response = await page.evaluate(() =>
      fetch('/api/auth/get-session').then((res) => res.json()),
    )

    expect(response.user).toBeNull()
  })

  test('should sign out and redirect to login', async ({ page }) => {
    // Sign up first
    const email = `test-${Date.now()}@example.com`
    const password = 'TestPassword123!'

    await page.fill('input[name="name"]', 'Test User')
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', password)
    await page.fill('input[name="confirmPassword"]', password)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard')

    // Sign out
    await page.evaluate(() => fetch('/api/auth/sign-out', { method: 'POST' }))

    // Visit dashboard - should redirect to login
    await page.goto('http://localhost:3000/dashboard')
    await page.waitForURL('**/login')
    expect(page.url()).toContain('/login')
  })
})
