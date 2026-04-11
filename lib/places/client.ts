import { db } from '@/db'
import { placesCache } from '@/db/schema'
import { eq } from 'drizzle-orm'

export interface Place {
  orgName: string
  address?: string
  phone?: string
  hours?: string
  types?: string[]
}

// Cache TTL: 30 days in milliseconds
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000

/**
 * Check if cached data is still fresh (less than 30 days old)
 */
function isCacheFresh(cachedAt: Date): boolean {
  const now = new Date()
  const ageMs = now.getTime() - cachedAt.getTime()
  return ageMs < CACHE_TTL_MS
}

/**
 * Call Google Places API nearby search for food-related organizations
 * This searches for "food bank", "soup kitchen", and "food pantry" near the given ZIP code
 */
async function callGooglePlacesAPI(zipCode: string): Promise<Place[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    console.error('GOOGLE_PLACES_API_KEY not configured')
    return []
  }

  const searchQueries = ['food bank', 'soup kitchen', 'food pantry']
  const allPlaces: Place[] = []

  try {
    for (const query of searchQueries) {
      // Use Text Search API with ZIP code
      const url = new URL(
        'https://maps.googleapis.com/maps/api/place/textsearch/json',
      )
      url.searchParams.append('query', `${query} ${zipCode}`)
      url.searchParams.append('key', apiKey)

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        console.error(
          `Google Places API error for query "${query}":`,
          response.statusText,
        )
        continue
      }

      const data = (await response.json()) as {
        results?: Array<{
          name: string
          formatted_address: string
          formatted_phone_number: string
          opening_hours?: { weekday_text: string[] }
          types: string[]
        }>
        status: string
      }

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        console.error(`Google Places API error status: ${data.status}`)
        continue
      }

      if (data.results) {
        for (const result of data.results) {
          const place: Place = {
            orgName: result.name,
            address: result.formatted_address,
            phone: result.formatted_phone_number,
            hours: result.opening_hours?.weekday_text?.join('; '),
            types: result.types,
          }
          allPlaces.push(place)
        }
      }
    }

    return allPlaces
  } catch (error) {
    console.error('Error calling Google Places API:', error)
    return []
  }
}

/**
 * Get donation opportunities (food banks, soup kitchens, food pantries) near a location
 * Uses 30-day cache to minimize API calls (typically 2-3 calls per month per location)
 */
export async function getDonationOpportunities(
  locationId: string,
  zipCode: string,
): Promise<Place[]> {
  try {
    // Check if we have cached data for this location
    const cached = await db
      .select()
      .from(placesCache)
      .where(eq(placesCache.locationId, locationId))

    if (cached.length > 0 && cached[0].cachedAt) {
      // If cache is fresh, return it
      if (isCacheFresh(new Date(cached[0].cachedAt))) {
        return cached.map((record) => ({
          orgName: record.orgName,
          address: record.address || undefined,
          phone: record.phone || undefined,
          hours: record.hours || undefined,
          types: record.types ? JSON.parse(record.types) : undefined,
        }))
      }

      // Cache is stale, delete old entries
      await db.delete(placesCache).where(eq(placesCache.locationId, locationId))
    }

    // Fetch fresh data from Google Places API
    const freshPlaces = await callGooglePlacesAPI(zipCode)

    // Store in cache
    if (freshPlaces.length > 0) {
      const now = new Date()
      for (const place of freshPlaces) {
        await db.insert(placesCache).values({
          locationId,
          orgName: place.orgName,
          address: place.address || null,
          phone: place.phone || null,
          hours: place.hours || null,
          types: place.types ? JSON.stringify(place.types) : null,
          cachedAt: now,
        })
      }
    }

    return freshPlaces
  } catch (error) {
    console.error('Error in getDonationOpportunities:', error)
    // Return empty array on error - graceful degradation
    return []
  }
}
