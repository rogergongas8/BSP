import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

// Everything behind a session redirects crawlers to /login, which Search Console reports as
// "Page with redirect" noise. Keep crawlers on the public pages (/, /login, /signup).
// Route groups such as "(admin)" never appear in URLs, so the admin area is plain /admin.
const PRIVATE_PATHS = [
  '/api/',
  '/admin',
  '/play',
  '/room',
  '/join',
  '/learn',
  '/practice',
  '/escribiendo',
  '/profile',
  '/leaderboard',
  '/welcome',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: PRIVATE_PATHS },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
