import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

// Only public URLs that answer 200. No `lastModified`: stamping `new Date()` on every build told
// Google every page changed on every deploy, which makes the field meaningless to it.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: 'monthly', priority: 1 },
    { url: `${SITE_URL}/signup`, changeFrequency: 'yearly', priority: 0.6 },
    { url: `${SITE_URL}/login`, changeFrequency: 'yearly', priority: 0.4 },
  ]
}
