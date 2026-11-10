import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const init = vi.fn()
const capture = vi.fn()

vi.mock('next/navigation', () => ({ usePathname: () => '/sign-in' }))
vi.mock('posthog-js', () => ({ default: { init, capture } }))
vi.mock('posthog-js/react', () => ({
  PostHogProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="posthog">{children}</div>
  ),
}))

async function loadProvider() {
  vi.resetModules()
  return (await import('./posthogProvider')).PostHogProvider
}

describe('PostHogProvider in a production build', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    init.mockClear()
    capture.mockClear()
  })

  it('renders the app without analytics when no key is configured', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', '')

    const PostHogProvider = await loadProvider()
    render(
      <PostHogProvider>
        <p>page content</p>
      </PostHogProvider>,
    )

    expect(screen.getByText('page content')).toBeInTheDocument()
    expect(init).not.toHaveBeenCalled()
    expect(capture).not.toHaveBeenCalled()
  })

  it('initialises analytics and records the pageview when a key is set', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test_key')

    const PostHogProvider = await loadProvider()
    render(
      <PostHogProvider>
        <p>page content</p>
      </PostHogProvider>,
    )

    expect(screen.getByTestId('posthog')).toBeInTheDocument()
    expect(init).toHaveBeenCalledWith(
      'phc_test_key',
      expect.objectContaining({ api_host: '/ingest' }),
    )
    expect(capture).toHaveBeenCalledWith('$pageview', {
      pathName: '/sign-in',
    })
  })
})
