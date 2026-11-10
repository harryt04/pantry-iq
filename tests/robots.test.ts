import { describe, expect, it } from 'vitest'

import robots from '@/app/robots'
import sitemap from '@/app/sitemap'

describe('crawler metadata', () => {
  it('advertises the sitemap on the same origin the sitemap serves', () => {
    const { sitemap: sitemapUrl } = robots()
    expect(sitemapUrl).toBe('https://pantry-iq.com/sitemap.xml')
    const origin = new URL(sitemapUrl as string).origin
    for (const entry of sitemap()) {
      expect(new URL(entry.url).origin).toBe(origin)
    }
  })

  it('allows the public site but keeps crawlers out of the API', () => {
    const { rules } = robots()
    expect(rules).toEqual({
      userAgent: '*',
      allow: '/',
      disallow: '/api/',
    })
  })
})
