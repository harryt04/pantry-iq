import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import {
  locations,
  transactions,
  csvUploads,
  posConnections,
  conversations,
} from '@/db/schema'
import { eq, and, count, desc } from 'drizzle-orm'

interface DashboardData {
  locations: Array<{
    id: string
    name: string
    type: string
    transactionCount: number
    csvUploadCount: number
    posConnectionStatus: string | null
    conversationId: string | null
  }>
  recentCsvUploads: Array<{
    id: string
    filename: string
    status: string
    uploadedAt: Date
    locationName: string
    locationId: string
    errorDetails: string | null
  }>
  totalLocations: number
  totalTransactions: number
}

// GET /api/dashboard - Get dashboard data for current user
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    })

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all locations for the user
    const userLocations = await db
      .select()
      .from(locations)
      .where(eq(locations.userId, session.user.id))

    // For each location, get transaction count, CSV upload count, and POS connection status
    const locationsData = await Promise.all(
      userLocations.map(async (location) => {
        // Count transactions for this location
        const [txResult] = await db
          .select({ count: count() })
          .from(transactions)
          .where(eq(transactions.locationId, location.id))

        // Count CSV uploads for this location
        const [csvResult] = await db
          .select({ count: count() })
          .from(csvUploads)
          .where(eq(csvUploads.locationId, location.id))

        // Get most recent POS connection
        const [posConn] = await db
          .select()
          .from(posConnections)
          .where(eq(posConnections.locationId, location.id))
          .limit(1)

        // Get first conversation for this location
        const [conv] = await db
          .select()
          .from(conversations)
          .where(eq(conversations.locationId, location.id))
          .limit(1)

        return {
          id: location.id,
          name: location.name,
          type: location.type,
          transactionCount: txResult?.count || 0,
          csvUploadCount: csvResult?.count || 0,
          posConnectionStatus: posConn?.syncState || null,
          conversationId: conv?.id || null,
        }
      }),
    )

    // Get recent CSV uploads (last 5) across all locations
    const recentUploads = await db
      .select({
        id: csvUploads.id,
        filename: csvUploads.filename,
        status: csvUploads.status,
        uploadedAt: csvUploads.uploadedAt,
        locationId: csvUploads.locationId,
        errorDetails: csvUploads.errorDetails,
      })
      .from(csvUploads)
      .innerJoin(
        locations,
        and(
          eq(csvUploads.locationId, locations.id),
          eq(locations.userId, session.user.id),
        ),
      )
      .orderBy(desc(csvUploads.uploadedAt))
      .limit(5)

    // Map location names to uploads
    const recentCsvUploads = recentUploads.map((upload) => {
      const locationName =
        locationsData.find((l) => l.id === upload.locationId)?.name || 'Unknown'
      return {
        id: upload.id,
        filename: upload.filename,
        status: upload.status,
        uploadedAt: upload.uploadedAt,
        locationName,
        locationId: upload.locationId,
        errorDetails: upload.errorDetails,
      }
    })

    // Calculate totals
    const totalTransactions = locationsData.reduce(
      (sum, l) => sum + l.transactionCount,
      0,
    )

    const dashboardData: DashboardData = {
      locations: locationsData,
      recentCsvUploads,
      totalLocations: locationsData.length,
      totalTransactions,
    }

    return NextResponse.json(dashboardData, { status: 200 })
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 },
    )
  }
}
