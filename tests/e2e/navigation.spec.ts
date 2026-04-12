import { test, expect } from '@playwright/test'

test.describe('Navigation and Routes', () => {
  test('GET / renders landing page with expected heading', async ({ page }) => {
    await page.goto('/')
    expect(page.url()).toContain('/')

    // Check for expected landing page content
    const heading = page.locator('h1')
    const headingText = await heading.first().textContent()
    expect(headingText).toContain('Stop Over-Ordering')
  })

  test('GET /pricing renders pricing page', async ({ page }) => {
    await page.goto('/pricing')
    expect(page.url()).toContain('/pricing')

    const heading = page.locator('h1')
    const headingText = await heading.first().textContent()
    expect(headingText).toContain('Simple, Transparent Pricing')
  })

  test('GET /login renders login form', async ({ page }) => {
    await page.goto('/login')
    expect(page.url()).toContain('/login')

    // Login form uses CardTitle which renders as h3 by default in shadcn
    await expect(page.getByText('Welcome Back')).toBeVisible()

    // Check for form inputs
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('GET /signup renders signup form', async ({ page }) => {
    await page.goto('/signup')
    expect(page.url()).toContain('/signup')

    await expect(page.getByText('Create Account')).toBeVisible()

    // Check for form inputs: name, email, password, confirmPassword
    const inputs = page.locator('input')
    await expect(inputs).toHaveCount(4)
  })

  test('GET /dashboard redirects unauthenticated to login or shows loading', async ({
    page,
  }) => {
    await page.goto('/dashboard')

    // Unauthenticated users are redirected to /login by the app layout
    // Wait for either the redirect or the loading state
    await page.waitForTimeout(3000)
    const url = page.url()

    // Should either redirect to login or show the dashboard login prompt
    const isOnLogin = url.includes('/login')
    const hasLoginPrompt =
      (await page.getByText('Please log in').count()) > 0 ||
      (await page.getByText('Loading').count()) > 0
    expect(isOnLogin || hasLoginPrompt).toBeTruthy()
  })

  test('GET /import renders import page or redirects', async ({ page }) => {
    await page.goto('/import')

    // Unauthenticated users will be redirected to login
    await page.waitForTimeout(3000)
    const url = page.url()

    const isOnLogin = url.includes('/login')
    const hasImportHeading =
      (await page.locator('h1:has-text("Import Data")').count()) > 0
    expect(isOnLogin || hasImportHeading).toBeTruthy()
  })

  test('GET /conversations renders conversations page or redirects', async ({
    page,
  }) => {
    await page.goto('/conversations')

    await page.waitForTimeout(3000)
    const url = page.url()

    const isOnLogin = url.includes('/login')
    const hasConversationsHeading =
      (await page.locator('h1:has-text("Conversations")').count()) > 0
    expect(isOnLogin || hasConversationsHeading).toBeTruthy()
  })

  test('GET /settings renders settings page or redirects', async ({ page }) => {
    await page.goto('/settings')

    await page.waitForTimeout(3000)
    const url = page.url()

    const isOnLogin = url.includes('/login')
    const hasSettingsHeading =
      (await page.locator('h1:has-text("Settings")').count()) > 0
    expect(isOnLogin || hasSettingsHeading).toBeTruthy()
  })

  test('CTA button visible on landing page', async ({ page }) => {
    await page.goto('/')

    // Check for "Get Early Access" submit button in the hero form
    await expect(
      page.locator('button[type="submit"]', {
        hasText: 'Get Early Access',
      }),
    ).toBeVisible()
  })

  test('Landing page has expected hero section text', async ({ page }) => {
    await page.goto('/')

    // The hero badge text "AI-Powered Restaurant Intelligence"
    await expect(
      page.getByText('AI-Powered Restaurant Intelligence'),
    ).toBeVisible()
  })
})
