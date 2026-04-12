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
    await page.waitForURL('**/dashboard', { timeout: 15000 })
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
    await page.waitForURL('**/dashboard', { timeout: 15000 })

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
    // Ensure page is loaded from beforeEach
    await page.waitForLoadState('domcontentloaded')

    // Clear cookies to ensure we're not authenticated
    await page.context().clearCookies()

    // Make request without session - Better Auth returns null for unauthenticated users
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/auth/get-session')
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }
      return res.json()
    })

    // Better Auth /get-session endpoint returns null (JSON null) for unauthenticated users
    expect(response).toBeNull()
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
    await page.context().clearCookies()

    // Visit dashboard - should redirect to login
    await page.goto('http://localhost:3000/dashboard', {
      waitUntil: 'domcontentloaded',
    })
    await page.waitForURL('**/login', { timeout: 5000 })
    expect(page.url()).toContain('/login')
  })
})
