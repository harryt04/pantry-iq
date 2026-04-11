import { NextRequest, NextResponse } from 'next/server'
import { getHistoricalWeather, getForecast } from '@/lib/weather/client'
import { db } from '@/db'
import { locations } from '@/db/schema/locations'
import { eq } from 'drizzle-orm'
import { ApiError, logErrorSafely } from '@/lib/api-error'

/**
 * GET /api/weather/[location]
 *
 * Query parameters:
 * - date: ISO string for historical weather (YYYY-MM-DD)
 * - forecast: "true" to get 7-day forecast instead of historical
 *
 * Returns: WeatherData with cache metadata
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ location: string }> },
) {
  try {
    const { location: locationId } = await params

    if (!locationId) {
      return ApiError.badRequest(
        'Location ID is required',
        'MISSING_LOCATION_ID',
      )
    }

    // Get location from database to extract coordinates
    const locationRecord = await db
      .select()
      .from(locations)
      .where(eq(locations.id, locationId))
      .limit(1)

    if (locationRecord.length === 0) {
      return ApiError.notFound('Location not found', 'LOCATION_NOT_FOUND')
    }

    const { searchParams } = new URL(req.url)
    const isForecast = searchParams.get('forecast') === 'true'
    const dateParam = searchParams.get('date')

    // Note: In production, you'd geocode the zipCode to get coordinates
    // For now, we'll use placeholder logic - in real implementation,
    // coordinates should be stored in the locations table or fetched from an external service
    const coordinates = {
      lat: 40.7128, // Placeholder: NYC
      lon: -74.006,
    }

    if (isForecast) {
      // Get 7-day forecast
      const forecastData = await getForecast(locationId, coordinates)

      return NextResponse.json(
        {
          success: true,
          data: forecastData,
          type: 'forecast',
        },
        { status: 200 },
      )
    } else {
      // Get historical weather for specific date
      if (!dateParam) {
        return ApiError.badRequest(
          'Date parameter is required for historical weather',
          'MISSING_DATE_PARAM',
        )
      }

      try {
        const date = new Date(dateParam)
        if (isNaN(date.getTime())) {
          return ApiError.badRequest(
            'Invalid date format. Use YYYY-MM-DD',
            'INVALID_DATE_FORMAT',
          )
        }

        const weatherData = await getHistoricalWeather(
          locationId,
          date,
          coordinates,
        )

        return NextResponse.json(
          {
            success: true,
            data: weatherData,
            type: 'historical',
          },
          { status: 200 },
        )
      } catch (error) {
        const message = logErrorSafely(error, 'GET /api/weather/[location]')
        return ApiError.badRequest(message, 'INVALID_DATE_FORMAT')
      }
    }
  } catch (error) {
    const message = logErrorSafely(error, 'GET /api/weather/[location]')
    return ApiError.internalServerError(message, 'WEATHER_ERROR')
  }
}
