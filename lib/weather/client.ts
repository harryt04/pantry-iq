import { db } from '@/db'
import { weather } from '@/db/schema/weather'
import { eq, and } from 'drizzle-orm'
import {
  WeatherDataWithMetadata,
  WeatherErrorCode,
  WeatherError,
  OpenWeatherMapResponse,
} from './types'

const API_KEY = process.env.OPENWEATHERMAP_API_KEY
const BASE_URL = 'https://api.openweathermap.org/data/3.0'
const RATE_LIMIT_DELAY_MS = 1000 / 60 // 60 calls per minute = ~16.67ms per call
const FORECAST_CACHE_DURATION_MS = 24 * 60 * 60 * 1000 // 24 hours
const API_TIMEOUT_MS = 10000 // 10 second timeout

let lastApiCallTime = 0

/**
 * Maps OpenWeatherMap condition codes to our condition types
 */
function mapConditions(
  weatherMain: string,
): 'rain' | 'snow' | 'clear' | 'cloudy' | 'unknown' {
  const main = weatherMain.toLowerCase()

  if (main.includes('rain') || main.includes('drizzle')) {
    return 'rain'
  }
  if (main.includes('snow')) {
    return 'snow'
  }
  if (main.includes('clear') || main.includes('sunny')) {
    return 'clear'
  }
  if (main.includes('cloud') || main.includes('overcast')) {
    return 'cloudy'
  }

  return 'unknown'
}

/**
 * Enforce rate limiting to stay within OpenWeatherMap limits (60 calls/min)
 */
async function enforceRateLimit(): Promise<void> {
  const now = Date.now()
  const timeSinceLastCall = now - lastApiCallTime

  if (timeSinceLastCall < RATE_LIMIT_DELAY_MS) {
    const delayNeeded = RATE_LIMIT_DELAY_MS - timeSinceLastCall
    await new Promise((resolve) => setTimeout(resolve, delayNeeded))
  }

  lastApiCallTime = Date.now()
}

/**
 * Fetch from OpenWeatherMap API with timeout and error handling
 */
async function fetchFromAPI(
  url: string,
  signal?: AbortSignal,
): Promise<OpenWeatherMapResponse> {
  if (!API_KEY) {
    throw new WeatherError(
      WeatherErrorCode.API_ERROR,
      'OPENWEATHERMAP_API_KEY is not configured',
    )
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(
    () => controller.abort(),
    signal ? 0 : API_TIMEOUT_MS,
  )

  try {
    await enforceRateLimit()

    const response = await fetch(url, {
      signal: signal || controller.signal,
      headers: {
        'User-Agent': 'PantryIQ-Weather-Client/1.0',
      },
    })

    if (!response.ok) {
      if (response.status === 429) {
        throw new WeatherError(
          WeatherErrorCode.RATE_LIMIT,
          'OpenWeatherMap rate limit exceeded',
        )
      }
      if (response.status === 401) {
        throw new WeatherError(
          WeatherErrorCode.API_ERROR,
          'Invalid API key for OpenWeatherMap',
        )
      }
      throw new WeatherError(
        WeatherErrorCode.API_ERROR,
        `OpenWeatherMap API error: ${response.status} ${response.statusText}`,
      )
    }

    const data = await response.json()
    return data as OpenWeatherMapResponse
  } catch (error) {
    if (error instanceof WeatherError) {
      throw error
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new WeatherError(
        WeatherErrorCode.TIMEOUT,
        'OpenWeatherMap API request timeout',
      )
    }

    throw new WeatherError(
      WeatherErrorCode.API_ERROR,
      `Failed to fetch from OpenWeatherMap: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Get historical weather data for a location and date
 * Checks cache first; if miss, fetches from API and stores result
 *
 * @param locationId - UUID of the location
 * @param date - Date to fetch weather for
 * @param coordinates - Optional {lat, lon} to fetch from API
 * @returns WeatherData with cache metadata
 */
export async function getHistoricalWeather(
  locationId: string,
  date: Date,
  coordinates?: { lat: number; lon: number },
): Promise<WeatherDataWithMetadata> {
  try {
    // Validate inputs
    if (!locationId || !date) {
      console.error('Invalid parameters for getHistoricalWeather', {
        locationId,
        date,
      })
      return {
        temperature: null,
        conditions: 'unknown',
        precipitation: null,
        cachedAt: new Date(),
        isCached: false,
        cacheAge: 0,
      }
    }

    // Normalize date to midnight UTC
    const targetDate = new Date(date)
    targetDate.setUTCHours(0, 0, 0, 0)

    // Check cache first
    const cachedResult = await db
      .select()
      .from(weather)
      .where(
        and(
          eq(weather.locationId, locationId),
          eq(weather.date, targetDate.toISOString().split('T')[0]),
        ),
      )
      .limit(1)

    if (cachedResult.length > 0) {
      const cached = cachedResult[0]
      const cacheAge = Date.now() - new Date(cached.cachedAt).getTime()

      return {
        temperature: cached.temperature ? Number(cached.temperature) : null,
        conditions:
          (cached.conditions as
            | 'rain'
            | 'snow'
            | 'clear'
            | 'cloudy'
            | 'unknown') || 'unknown',
        precipitation: cached.precipitation
          ? Number(cached.precipitation)
          : null,
        cachedAt: new Date(cached.cachedAt),
        isCached: true,
        cacheAge,
      }
    }

    // Cache miss - fetch from API if coordinates provided
    if (coordinates) {
      const apiData = await fetchFromAPI(
        `${BASE_URL}/onecall/timemachine?lat=${coordinates.lat}&lon=${coordinates.lon}&dt=${Math.floor(targetDate.getTime() / 1000)}&appid=${API_KEY}`,
      )

      if (apiData.current) {
        const conditions = mapConditions(apiData.current.weather[0]?.main || '')
        const precipitation =
          (apiData.current.rain?.['1h'] || 0) +
          (apiData.current.snow?.['1h'] || 0)

        try {
          await db.insert(weather).values({
            locationId: locationId as string,
            date: targetDate.toISOString().split('T')[0],
            temperature: apiData.current.temp?.toString() || null,
            conditions,
            precipitation: precipitation > 0 ? precipitation.toString() : null,
          })
        } catch (insertError) {
          // Silently handle unique constraint violations (race condition)
          console.warn(
            `Weather cache insert failed for ${locationId}/${targetDate}: likely duplicate`,
            insertError instanceof Error ? insertError.message : insertError,
          )
        }

        return {
          temperature: apiData.current.temp,
          conditions,
          precipitation: precipitation > 0 ? precipitation : null,
          cachedAt: new Date(),
          isCached: false,
          cacheAge: 0,
        }
      }
    }

    // No data available
    console.warn(
      `No weather data available for location ${locationId} on ${targetDate.toISOString()}`,
    )
    return {
      temperature: null,
      conditions: 'unknown',
      precipitation: null,
      cachedAt: new Date(),
      isCached: false,
      cacheAge: 0,
    }
  } catch (error) {
    console.error('Error in getHistoricalWeather:', error)
    // Return graceful error response
    return {
      temperature: null,
      conditions: 'unknown',
      precipitation: null,
      cachedAt: new Date(),
      isCached: false,
      cacheAge: 0,
    }
  }
}

/**
 * Get forecast data for the next 7 days for a location
 * Caches results and only refreshes once per day
 *
 * @param locationId - UUID of the location
 * @param coordinates - {lat, lon} to fetch from API
 * @returns Array of WeatherData for next 7 days
 */
export async function getForecast(
  locationId: string,
  coordinates?: { lat: number; lon: number },
): Promise<WeatherDataWithMetadata[]> {
  try {
    // Validate inputs
    if (!locationId) {
      console.error('Invalid locationId for getForecast', locationId)
      return []
    }

    // Check if we have fresh forecast cache (less than 24 hours old)
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - FORECAST_CACHE_DURATION_MS)

    const cachedRecords = await db
      .select()
      .from(weather)
      .where(
        and(
          eq(weather.locationId, locationId),
          // Get forecast data from today onwards
        ),
      )

    // If we have recent cache, return it
    const recentCache = cachedRecords.filter(
      (record) =>
        new Date(record.cachedAt).getTime() > oneDayAgo.getTime() &&
        new Date(record.date) >= now,
    )

    if (recentCache.length >= 7) {
      // Sort by date and return top 7
      return recentCache
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 7)
        .map((record) => ({
          temperature: record.temperature ? Number(record.temperature) : null,
          conditions:
            (record.conditions as
              | 'rain'
              | 'snow'
              | 'clear'
              | 'cloudy'
              | 'unknown') || 'unknown',
          precipitation: record.precipitation
            ? Number(record.precipitation)
            : null,
          cachedAt: new Date(record.cachedAt),
          isCached: true,
          cacheAge: now.getTime() - new Date(record.cachedAt).getTime(),
        }))
    }

    // Cache miss or stale - fetch from API if coordinates provided
    if (coordinates) {
      const apiData = await fetchFromAPI(
        `${BASE_URL}/onecall?lat=${coordinates.lat}&lon=${coordinates.lon}&exclude=minutely,hourly,alerts&appid=${API_KEY}`,
      )

      if (apiData.daily && apiData.daily.length > 0) {
        const forecasts: WeatherDataWithMetadata[] = []

        for (let i = 0; i < Math.min(7, apiData.daily.length); i++) {
          const day = apiData.daily[i]
          const forecastDate = new Date(day.dt * 1000)
          forecastDate.setUTCHours(0, 0, 0, 0)

          const conditions = mapConditions(day.weather[0]?.main || '')
          const precipitation = (day.rain || 0) + (day.snow || 0)

          try {
            await db.insert(weather).values({
              locationId,
              date: forecastDate.toISOString().split('T')[0],
              temperature: day.temp.day,
              conditions,
              precipitation: precipitation > 0 ? precipitation : null,
            })
          } catch (insertError) {
            // Silently handle unique constraint violations
            console.warn(
              `Forecast cache insert failed for ${locationId}/${forecastDate}`,
              insertError instanceof Error ? insertError.message : insertError,
            )
          }

          forecasts.push({
            temperature: day.temp.day,
            conditions,
            precipitation: precipitation > 0 ? precipitation : null,
            cachedAt: new Date(),
            isCached: false,
            cacheAge: 0,
          })
        }

        return forecasts
      }
    }

    console.warn(`No forecast data available for location ${locationId}`)
    return []
  } catch (error) {
    console.error('Error in getForecast:', error)
    // Return empty array on error (graceful degradation)
    return []
  }
}

/**
 * Clear weather cache for a location (useful for testing or forcing refresh)
 */
export async function clearWeatherCache(locationId: string): Promise<void> {
  try {
    await db.delete(weather).where(eq(weather.locationId, locationId))
  } catch (error) {
    console.error('Error clearing weather cache:', error)
    throw error
  }
}

/**
 * Get cache statistics for monitoring and debugging
 */
export async function getWeatherCacheStats(): Promise<{
  totalCached: number
  oldestCacheEntry: Date | null
  newestCacheEntry: Date | null
  locationCount: number
}> {
  try {
    const records = await db.select().from(weather)

    if (records.length === 0) {
      return {
        totalCached: 0,
        oldestCacheEntry: null,
        newestCacheEntry: null,
        locationCount: 0,
      }
    }

    const locations = new Set(records.map((r) => r.locationId))
    const dates = records.map((r) => new Date(r.cachedAt).getTime())

    return {
      totalCached: records.length,
      oldestCacheEntry: new Date(Math.min(...dates)),
      newestCacheEntry: new Date(Math.max(...dates)),
      locationCount: locations.size,
    }
  } catch (error) {
    console.error('Error getting weather cache stats:', error)
    return {
      totalCached: 0,
      oldestCacheEntry: null,
      newestCacheEntry: null,
      locationCount: 0,
    }
  }
}
