import { NextRequest, NextResponse } from 'next/server'
import { getDonationOpportunities } from '@/lib/places/client'

/**
 * GET /api/places/[location] - Get donation opportunities for a location
 * Query params:
 *   - zipCode: string (required) - ZIP code to search nearby
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ location: string }> },
) {
  try {
    const { location: locationId } = await params
    const searchParams = req.nextUrl.searchParams
    const zipCode = searchParams.get('zipCode')

    // Validate required parameters
    if (!locationId) {
      return NextResponse.json(
        { error: 'Location ID is required' },
        { status: 400 },
      )
    }

    if (!zipCode) {
      return NextResponse.json(
        { error: 'zipCode query parameter is required' },
        { status: 400 },
      )
    }

    // Get donation opportunities
    const places = await getDonationOpportunities(locationId, zipCode)

    return NextResponse.json(
      {
        locationId,
        zipCode,
        places,
        count: places.length,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error('Error fetching places:', error)
    return NextResponse.json(
      { error: 'Failed to fetch donation opportunities' },
      { status: 500 },
    )
  }
}
