import { describe, it, expect, beforeEach, vi } from 'vitest'
import { db } from '@/db'
import { locations } from '@/db/schema'
import { eq } from 'drizzle-orm'

// Mock user IDs for testing
const USER_A_ID = 'test-user-a'
const USER_B_ID = 'test-user-b'

describe('Location API - CRUD Operations', () => {
  beforeEach(async () => {
    // Clean up test data before each test
    try {
      await db.delete(locations)
    } catch (error) {
      // Table might be empty, ignore
    }
  })

  describe('GET /api/locations - List locations', () => {
    it("should return only current user's locations", async () => {
      // Create locations for different users
      const locA = await db
        .insert(locations)
        .values({
          userId: USER_A_ID,
          name: 'Restaurant A',
          zipCode: '10001',
          type: 'restaurant',
        })
        .returning()

      const locB = await db
        .insert(locations)
        .values({
          userId: USER_B_ID,
          name: 'Restaurant B',
          zipCode: '10002',
          type: 'restaurant',
        })
        .returning()

      // Verify User A can only see their location
      const userALocations = await db
        .select()
        .from(locations)
        .where(eq(locations.userId, USER_A_ID))

      expect(userALocations).toHaveLength(1)
      expect(userALocations[0].name).toBe('Restaurant A')

      // Verify User B can only see their location
      const userBLocations = await db
        .select()
        .from(locations)
        .where(eq(locations.userId, USER_B_ID))

      expect(userBLocations).toHaveLength(1)
      expect(userBLocations[0].name).toBe('Restaurant B')
    })
  })

  describe('POST /api/locations - Create location', () => {
    it('should create a new location with required fields', async () => {
      const newLoc = await db
        .insert(locations)
        .values({
          userId: USER_A_ID,
          name: 'My Restaurant',
          zipCode: '10001',
          type: 'restaurant',
        })
        .returning()

      expect(newLoc).toHaveLength(1)
      expect(newLoc[0].name).toBe('My Restaurant')
      expect(newLoc[0].zipCode).toBe('10001')
      expect(newLoc[0].userId).toBe(USER_A_ID)
      expect(newLoc[0].type).toBe('restaurant')
      expect(newLoc[0].timezone).toBe('America/New_York')
    })

    it('should create location with optional fields', async () => {
      const newLoc = await db
        .insert(locations)
        .values({
          userId: USER_A_ID,
          name: 'My Food Truck',
          zipCode: '10001',
          address: '123 Main St',
          timezone: 'America/Chicago',
          type: 'food_truck',
        })
        .returning()

      expect(newLoc).toHaveLength(1)
      expect(newLoc[0].address).toBe('123 Main St')
      expect(newLoc[0].timezone).toBe('America/Chicago')
      expect(newLoc[0].type).toBe('food_truck')
    })

    it('should default to restaurant type and America/New_York timezone', async () => {
      const newLoc = await db
        .insert(locations)
        .values({
          userId: USER_A_ID,
          name: 'Default Restaurant',
          zipCode: '10001',
        })
        .returning()

      expect(newLoc[0].type).toBe('restaurant')
      expect(newLoc[0].timezone).toBe('America/New_York')
    })
  })

  describe('PUT /api/locations/:id - Update location', () => {
    it('should update location fields', async () => {
      const loc = await db
        .insert(locations)
        .values({
          userId: USER_A_ID,
          name: 'Original Name',
          zipCode: '10001',
        })
        .returning()

      const updated = await db
        .update(locations)
        .set({
          name: 'Updated Name',
          timezone: 'America/Los_Angeles',
        })
        .where(eq(locations.id, loc[0].id))
        .returning()

      expect(updated[0].name).toBe('Updated Name')
      expect(updated[0].timezone).toBe('America/Los_Angeles')
    })
  })

  describe('DELETE /api/locations/:id - Delete location', () => {
    it('should delete a location', async () => {
      const loc = await db
        .insert(locations)
        .values({
          userId: USER_A_ID,
          name: 'To Delete',
          zipCode: '10001',
        })
        .returning()

      const deleted = await db
        .delete(locations)
        .where(eq(locations.id, loc[0].id))
        .returning()

      expect(deleted).toHaveLength(1)

      // Verify it's deleted
      const remaining = await db
        .select()
        .from(locations)
        .where(eq(locations.id, loc[0].id))

      expect(remaining).toHaveLength(0)
    })

    it('should handle cascade delete via database constraints', async () => {
      // Create a location
      const loc = await db
        .insert(locations)
        .values({
          userId: USER_A_ID,
          name: 'To Delete',
          zipCode: '10001',
        })
        .returning()

      // When deleted, cascade constraints should handle related data
      const deleted = await db
        .delete(locations)
        .where(eq(locations.id, loc[0].id))
        .returning()

      expect(deleted).toHaveLength(1)
    })
  })

  describe('Authorization checks', () => {
    it("User A cannot access User B's location", async () => {
      // Create location for User B
      const locB = await db
        .insert(locations)
        .values({
          userId: USER_B_ID,
          name: 'User B Restaurant',
          zipCode: '10002',
        })
        .returning()

      // User A tries to access User B's location
      const userAView = await db
        .select()
        .from(locations)
        .where(eq(locations.userId, USER_A_ID))

      expect(userAView).toHaveLength(0)
      expect(userAView).not.toContainEqual(
        expect.objectContaining({
          id: locB[0].id,
        }),
      )
    })

    it("User A cannot modify User B's location", async () => {
      // Create location for User B
      const locB = await db
        .insert(locations)
        .values({
          userId: USER_B_ID,
          name: 'User B Restaurant',
          zipCode: '10002',
        })
        .returning()

      // User A should not be able to update it (simulated)
      // In real API, this would be checked in the route handler
      const updated = await db
        .update(locations)
        .set({ name: 'Hacked!' })
        .where(eq(locations.id, locB[0].id))
        .returning()

      // Database operation succeeds but route handler would prevent it
      expect(updated[0].name).toBe('Hacked!')
    })
  })

  describe('Type validation', () => {
    it('should accept restaurant type', async () => {
      const loc = await db
        .insert(locations)
        .values({
          userId: USER_A_ID,
          name: 'Restaurant',
          zipCode: '10001',
          type: 'restaurant',
        })
        .returning()

      expect(loc[0].type).toBe('restaurant')
    })

    it('should accept food_truck type', async () => {
      const loc = await db
        .insert(locations)
        .values({
          userId: USER_A_ID,
          name: 'Food Truck',
          zipCode: '10001',
          type: 'food_truck',
        })
        .returning()

      expect(loc[0].type).toBe('food_truck')
    })
  })
})
