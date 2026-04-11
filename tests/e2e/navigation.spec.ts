import { test, expect } from '@playwright/test'

test.describe('Navigation and Routes', () => {
  test('GET / renders landing page with expected heading', async ({ page }) => {
    await page.goto('/')
    expect(page.url()).toContain('/')

    // Check for expected landing page content
    const heading = await page.locator('h1')
    const headingText = await heading.first().textContent()
    expect(headingText).toContain('Stop Over-Ordering')
  })

  test('GET /pricing renders pricing page', async ({ page }) => {
    await page.goto('/pricing')
    expect(page.url()).toContain('/pricing')

    const heading = await page.locator('h1')
    const headingText = await heading.first().textContent()
    expect(headingText).toContain('Simple, Transparent Pricing')
  })

  test('GET /login renders login form', async ({ page }) => {
    await page.goto('/login')
    expect(page.url()).toContain('/login')

    const heading = await page.locator('h2')
    const headingText = await heading.first().textContent()
    expect(headingText).toContain('Welcome Back')

    // Check for form inputs
    const emailInput = await page.locator('input[type="email"]')
    const passwordInput = await page.locator('input[type="password"]')
    expect(emailInput).toBeVisible()
    expect(passwordInput).toBeVisible()
  })

  test('GET /signup renders signup form', async ({ page }) => {
    await page.goto('/signup')
    expect(page.url()).toContain('/signup')

    const heading = await page.locator('h2')
    const headingText = await heading.first().textContent()
    expect(headingText).toContain('Create Account')

    // Check for form inputs
    const inputs = await page.locator('input')
    expect(inputs).toHaveCount(4) // restaurantName, email, password, confirmPassword
  })

  test('GET /dashboard renders placeholder page', async ({ page }) => {
    await page.goto('/dashboard')
    expect(page.url()).toContain('/dashboard')

    const heading = await page.locator('h1')
    const headingText = await heading.first().textContent()
    expect(headingText).toContain('Dashboard')
  })

  test('GET /import renders placeholder page', async ({ page }) => {
    await page.goto('/import')
    expect(page.url()).toContain('/import')

    const heading = await page.locator('h1')
    const headingText = await heading.first().textContent()
    expect(headingText).toContain('Import Data')
  })

  test('GET /conversations renders placeholder page', async ({ page }) => {
    await page.goto('/conversations')
    expect(page.url()).toContain('/conversations')

    const heading = await page.locator('h1')
    const headingText = await heading.first().textContent()
    expect(headingText).toContain('Conversations')
  })

  test('GET /settings renders placeholder page', async ({ page }) => {
    await page.goto('/settings')
    expect(page.url()).toContain('/settings')

    const heading = await page.locator('h1')
    const headingText = await heading.first().textContent()
    expect(headingText).toContain('Settings')
  })

  test('App routes have app shell with sidebar and header', async ({
    page,
  }) => {
    await page.goto('/dashboard')

    // Check for sidebar (hidden on mobile, visible on md+)
    const sidebar = await page.locator('nav')
    expect(sidebar).toBeVisible()

    // Check for header
    const header = await page.locator('div', {
      has: page.locator('text=Location'),
    })
    expect(header).toBeVisible()
  })

  test('CTA button visible on landing page', async ({ page }) => {
    await page.goto('/')

    // Check for "Get Early Access" button
    const ctaButton = await page.locator('button', {
      has: page.locator('text=Get Early Access'),
    })
    expect(ctaButton).toBeVisible()
  })

  test('Landing page has expected hero section text', async ({ page }) => {
    await page.goto('/')

    const heroText = await page.locator(
      'text=AI-Powered Restaurant Intelligence',
    )
    expect(heroText).toBeVisible()
  })
})
