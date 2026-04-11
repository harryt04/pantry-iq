import { NextRequest, NextResponse } from 'next/server'
import { getHistoricalWeather, getForecast } from '@/lib/weather/client'
import { db } from '@/db'
import { locations } from '@/db/schema/locations'
import { eq } from 'drizzle-orm'

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
      return NextResponse.json(
        { error: 'Location ID is required' },
        { status: 400 },
      )
    }

    // Get location from database to extract coordinates
    const locationRecord = await db
      .select()
      .from(locations)
      .where(eq(locations.id, locationId))
      .limit(1)

    if (locationRecord.length === 0) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
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
        return NextResponse.json(
          { error: 'Date parameter is required for historical weather' },
          { status: 400 },
        )
      }

      try {
        const date = new Date(dateParam)
        if (isNaN(date.getTime())) {
          return NextResponse.json(
            { error: 'Invalid date format. Use YYYY-MM-DD' },
            { status: 400 },
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
        console.error('Error parsing date:', error)
        return NextResponse.json(
          { error: 'Invalid date format. Use YYYY-MM-DD' },
          { status: 400 },
        )
      }
    }
  } catch (error) {
    console.error('Error in weather API:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch weather data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
