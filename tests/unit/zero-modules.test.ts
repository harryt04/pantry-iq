import { describe, it, expect } from 'vitest'
import {
  schema,
  type Location,
  type Conversation,
  type Message,
  type CsvUpload,
  type Transaction,
  type PosConnection,
  type PlacesCache,
  type Weather,
  type WaitlistSignup,
} from '@/lib/zero/schema'
import {
  type PermissionContext,
  getCsvUploadPermissionFilter,
  getTransactionPermissionFilter,
  getPosConnectionPermissionFilter,
  getConversationPermissionFilter,
  getMessagePermissionFilter,
} from '@/lib/zero/permissions'

describe('Zero Schema Definition', () => {
  describe('Table Structure', () => {
    it('should define locations table with correct columns', () => {
      const locationTable = schema.tables['locations']
      expect(locationTable).toBeDefined()

      // Verify all expected columns exist
      const columns = locationTable?.columns
      expect(columns).toHaveProperty('id')
      expect(columns).toHaveProperty('userId')
      expect(columns).toHaveProperty('name')
      expect(columns).toHaveProperty('timezone')
      expect(columns).toHaveProperty('address')
      expect(columns).toHaveProperty('zipCode')
      expect(columns).toHaveProperty('type')
      expect(columns).toHaveProperty('createdAt')
    })

    it('should define conversations table with correct columns', () => {
      const conversationTable = schema.tables['conversations']
      expect(conversationTable).toBeDefined()

      const columns = conversationTable?.columns
      expect(columns).toHaveProperty('id')
      expect(columns).toHaveProperty('locationId')
      expect(columns).toHaveProperty('defaultModel')
      expect(columns).toHaveProperty('createdAt')
    })

    it('should define messages table with correct columns', () => {
      const messageTable = schema.tables['messages']
      expect(messageTable).toBeDefined()

      const columns = messageTable?.columns
      expect(columns).toHaveProperty('id')
      expect(columns).toHaveProperty('conversationId')
      expect(columns).toHaveProperty('role')
      expect(columns).toHaveProperty('content')
      expect(columns).toHaveProperty('modelUsed')
      expect(columns).toHaveProperty('tokensIn')
      expect(columns).toHaveProperty('tokensOut')
      expect(columns).toHaveProperty('createdAt')
    })

    it('should define csv_uploads table with correct columns', () => {
      const csvTable = schema.tables['csv_uploads']
      expect(csvTable).toBeDefined()

      const columns = csvTable?.columns
      expect(columns).toHaveProperty('id')
      expect(columns).toHaveProperty('locationId')
      expect(columns).toHaveProperty('filename')
      expect(columns).toHaveProperty('rowCount')
      expect(columns).toHaveProperty('status')
      expect(columns).toHaveProperty('errorDetails')
      expect(columns).toHaveProperty('fieldMapping')
      expect(columns).toHaveProperty('uploadedAt')
    })

    it('should define transactions table with correct columns', () => {
      const transactionTable = schema.tables['transactions']
      expect(transactionTable).toBeDefined()

      const columns = transactionTable?.columns
      expect(columns).toHaveProperty('id')
      expect(columns).toHaveProperty('locationId')
      expect(columns).toHaveProperty('date')
      expect(columns).toHaveProperty('item')
      expect(columns).toHaveProperty('qty')
      expect(columns).toHaveProperty('revenue')
      expect(columns).toHaveProperty('cost')
      expect(columns).toHaveProperty('source')
      expect(columns).toHaveProperty('sourceId')
      expect(columns).toHaveProperty('createdAt')
    })

    it('should define pos_connections table with correct columns', () => {
      const posTable = schema.tables['pos_connections']
      expect(posTable).toBeDefined()

      const columns = posTable?.columns
      expect(columns).toHaveProperty('id')
      expect(columns).toHaveProperty('locationId')
      expect(columns).toHaveProperty('provider')
      expect(columns).toHaveProperty('oauthToken')
      expect(columns).toHaveProperty('refreshToken')
      expect(columns).toHaveProperty('syncState')
      expect(columns).toHaveProperty('lastSync')
      expect(columns).toHaveProperty('createdAt')
    })

    it('should define places_cache table with correct columns', () => {
      const placesTable = schema.tables['places_cache']
      expect(placesTable).toBeDefined()

      const columns = placesTable?.columns
      expect(columns).toHaveProperty('id')
      expect(columns).toHaveProperty('locationId')
      expect(columns).toHaveProperty('orgName')
      expect(columns).toHaveProperty('address')
      expect(columns).toHaveProperty('phone')
      expect(columns).toHaveProperty('hours')
      expect(columns).toHaveProperty('types')
      expect(columns).toHaveProperty('cachedAt')
    })

    it('should define weather table with correct columns', () => {
      const weatherTable = schema.tables['weather']
      expect(weatherTable).toBeDefined()

      const columns = weatherTable?.columns
      expect(columns).toHaveProperty('id')
      expect(columns).toHaveProperty('locationId')
      expect(columns).toHaveProperty('date')
      expect(columns).toHaveProperty('temperature')
      expect(columns).toHaveProperty('conditions')
      expect(columns).toHaveProperty('precipitation')
      expect(columns).toHaveProperty('cachedAt')
    })

    it('should define waitlist_signups table with correct columns', () => {
      const waitlistTable = schema.tables['waitlist_signups']
      expect(waitlistTable).toBeDefined()

      const columns = waitlistTable?.columns
      expect(columns).toHaveProperty('id')
      expect(columns).toHaveProperty('email')
      expect(columns).toHaveProperty('createdAt')
    })
  })

  describe('Schema Integrity', () => {
    it('should have 9 tables defined', () => {
      expect(Object.keys(schema.tables)).toHaveLength(9)
    })

    it('should have correct table names', () => {
      const tableNames = Object.keys(schema.tables).sort()
      const expected = [
        'conversations',
        'csv_uploads',
        'locations',
        'messages',
        'places_cache',
        'pos_connections',
        'transactions',
        'waitlist_signups',
        'weather',
      ].sort()
      expect(tableNames).toEqual(expected)
    })

    it('should have primary keys defined for all tables', () => {
      Object.values(schema.tables).forEach((table) => {
        expect(table.primaryKey).toBeDefined()
        expect(Array.isArray(table.primaryKey)).toBe(true)
        expect(table.primaryKey).toContain('id')
      })
    })
  })

  describe('Type Exports', () => {
    it('should export Location type with all properties', () => {
      const location: Location = {
        id: 'loc-1',
        userId: 'user-1',
        name: 'Main Store',
        timezone: 'UTC',
        address: '123 Main St',
        zipCode: '12345',
        type: 'retail',
        createdAt: 1000000,
      }
      expect(location.id).toBe('loc-1')
      expect(location.userId).toBe('user-1')
    })

    it('should export Conversation type with all properties', () => {
      const conversation: Conversation = {
        id: 'conv-1',
        locationId: 'loc-1',
        defaultModel: 'gpt-4',
        createdAt: 1000000,
      }
      expect(conversation.id).toBe('conv-1')
      expect(conversation.locationId).toBe('loc-1')
    })

    it('should export Message type with all properties', () => {
      const message: Message = {
        id: 'msg-1',
        conversationId: 'conv-1',
        role: 'user',
        content: 'Hello',
        modelUsed: 'gpt-4',
        tokensIn: 10,
        tokensOut: 20,
        createdAt: 1000000,
      }
      expect(message.id).toBe('msg-1')
      expect(message.conversationId).toBe('conv-1')
    })

    it('should export CsvUpload type with all properties', () => {
      const csvUpload: CsvUpload = {
        id: 'csv-1',
        locationId: 'loc-1',
        filename: 'data.csv',
        rowCount: 100,
        status: 'completed',
        errorDetails: '',
        fieldMapping: '{}',
        uploadedAt: 1000000,
      }
      expect(csvUpload.id).toBe('csv-1')
      expect(csvUpload.locationId).toBe('loc-1')
    })

    it('should export Transaction type with all properties', () => {
      const transaction: Transaction = {
        id: 'txn-1',
        locationId: 'loc-1',
        date: '2026-01-01',
        item: 'Widget',
        qty: 5,
        revenue: 100,
        cost: 50,
        source: 'square',
        sourceId: 'src-123',
        createdAt: 1000000,
      }
      expect(transaction.id).toBe('txn-1')
      expect(transaction.locationId).toBe('loc-1')
    })

    it('should export PosConnection type with all properties', () => {
      const posConnection: PosConnection = {
        id: 'pos-1',
        locationId: 'loc-1',
        provider: 'square',
        oauthToken: 'token-123',
        refreshToken: 'refresh-123',
        syncState: 'synced',
        lastSync: 1000000,
        createdAt: 1000000,
      }
      expect(posConnection.id).toBe('pos-1')
      expect(posConnection.locationId).toBe('loc-1')
    })

    it('should export PlacesCache type with all properties', () => {
      const placesCache: PlacesCache = {
        id: 'place-1',
        locationId: 'loc-1',
        orgName: 'Store Name',
        address: '123 Main St',
        phone: '555-1234',
        hours: '9am-5pm',
        types: 'retail',
        cachedAt: 1000000,
      }
      expect(placesCache.id).toBe('place-1')
      expect(placesCache.locationId).toBe('loc-1')
    })

    it('should export Weather type with all properties', () => {
      const weather: Weather = {
        id: 'weather-1',
        locationId: 'loc-1',
        date: '2026-01-01',
        temperature: 72,
        conditions: 'sunny',
        precipitation: 0,
        cachedAt: 1000000,
      }
      expect(weather.id).toBe('weather-1')
      expect(weather.locationId).toBe('loc-1')
    })

    it('should export WaitlistSignup type with all properties', () => {
      const waitlistSignup: WaitlistSignup = {
        id: 'waitlist-1',
        email: 'test@example.com',
        createdAt: 1000000,
      }
      expect(waitlistSignup.id).toBe('waitlist-1')
      expect(waitlistSignup.email).toBe('test@example.com')
    })
  })
})

describe('Zero Permissions - Extended Filters', () => {
  describe('CSV Upload Permission Filter', () => {
    it('should create a filter for CSV uploads in user locations', () => {
      const context: PermissionContext = { userId: 'user-123' }
      const userLocationIds = ['location-1', 'location-2']

      const filter = getCsvUploadPermissionFilter(context, userLocationIds)

      expect(filter).toEqual({
        locationId: { in: ['location-1', 'location-2'] },
      })
    })

    it('should return null when user has no locations', () => {
      const context: PermissionContext = { userId: 'user-123' }
      const userLocationIds: string[] = []

      const filter = getCsvUploadPermissionFilter(context, userLocationIds)

      expect(filter).toBeNull()
    })

    it('should handle single location', () => {
      const context: PermissionContext = { userId: 'user-123' }
      const userLocationIds = ['location-1']

      const filter = getCsvUploadPermissionFilter(context, userLocationIds)

      expect(filter).toEqual({
        locationId: { in: ['location-1'] },
      })
    })
  })

  describe('Transaction Permission Filter', () => {
    it('should create a filter for transactions in user locations', () => {
      const context: PermissionContext = { userId: 'user-123' }
      const userLocationIds = ['location-1', 'location-2']

      const filter = getTransactionPermissionFilter(context, userLocationIds)

      expect(filter).toEqual({
        locationId: { in: ['location-1', 'location-2'] },
      })
    })

    it('should return null when user has no locations', () => {
      const context: PermissionContext = { userId: 'user-123' }
      const userLocationIds: string[] = []

      const filter = getTransactionPermissionFilter(context, userLocationIds)

      expect(filter).toBeNull()
    })

    it('should handle multiple locations', () => {
      const context: PermissionContext = { userId: 'user-123' }
      const userLocationIds = ['loc-a', 'loc-b', 'loc-c']

      const filter = getTransactionPermissionFilter(context, userLocationIds)

      expect(filter).toEqual({
        locationId: { in: ['loc-a', 'loc-b', 'loc-c'] },
      })
    })
  })

  describe('POS Connection Permission Filter', () => {
    it('should create a filter for POS connections in user locations', () => {
      const context: PermissionContext = { userId: 'user-123' }
      const userLocationIds = ['location-1', 'location-2']

      const filter = getPosConnectionPermissionFilter(context, userLocationIds)

      expect(filter).toEqual({
        locationId: { in: ['location-1', 'location-2'] },
      })
    })

    it('should return null when user has no locations', () => {
      const context: PermissionContext = { userId: 'user-123' }
      const userLocationIds: string[] = []

      const filter = getPosConnectionPermissionFilter(context, userLocationIds)

      expect(filter).toBeNull()
    })
  })

  describe('Permission Filter Edge Cases', () => {
    it('should handle empty location array for all filters', () => {
      const context: PermissionContext = { userId: 'user-123' }
      const emptyArray: string[] = []

      expect(getCsvUploadPermissionFilter(context, emptyArray)).toBeNull()
      expect(getTransactionPermissionFilter(context, emptyArray)).toBeNull()
      expect(getPosConnectionPermissionFilter(context, emptyArray)).toBeNull()
      expect(getConversationPermissionFilter(context, emptyArray)).toBeNull()
      expect(getMessagePermissionFilter(context, emptyArray)).toBeNull()
    })

    it('should preserve location ID order in filters', () => {
      const context: PermissionContext = { userId: 'user-123' }
      const userLocationIds = ['loc-z', 'loc-a', 'loc-m']

      const filter = getCsvUploadPermissionFilter(context, userLocationIds)

      expect(filter?.locationId.in).toEqual(['loc-z', 'loc-a', 'loc-m'])
    })

    it('should handle duplicate location IDs', () => {
      const context: PermissionContext = { userId: 'user-123' }
      const userLocationIds = ['loc-1', 'loc-1', 'loc-2']

      const filter = getCsvUploadPermissionFilter(context, userLocationIds)

      expect(filter?.locationId.in).toEqual(['loc-1', 'loc-1', 'loc-2'])
    })
  })

  describe('Permission Filter Consistency', () => {
    it('should return consistent structure for all location-based filters', () => {
      const context: PermissionContext = { userId: 'user-123' }
      const userLocationIds = ['location-1']

      const csvFilter = getCsvUploadPermissionFilter(context, userLocationIds)
      const transactionFilter = getTransactionPermissionFilter(
        context,
        userLocationIds,
      )
      const posFilter = getPosConnectionPermissionFilter(
        context,
        userLocationIds,
      )
      const conversationFilter = getConversationPermissionFilter(
        context,
        userLocationIds,
      )

      // All should have the same structure
      expect(csvFilter).toHaveProperty('locationId')
      expect(transactionFilter).toHaveProperty('locationId')
      expect(posFilter).toHaveProperty('locationId')
      expect(conversationFilter).toHaveProperty('locationId')

      // All should have the same values
      expect(csvFilter).toEqual(transactionFilter)
      expect(transactionFilter).toEqual(posFilter)
      expect(posFilter).toEqual(conversationFilter)
    })

    it('should all return null when location array is empty', () => {
      const context: PermissionContext = { userId: 'user-123' }
      const emptyArray: string[] = []

      const filters = [
        getCsvUploadPermissionFilter(context, emptyArray),
        getTransactionPermissionFilter(context, emptyArray),
        getPosConnectionPermissionFilter(context, emptyArray),
        getConversationPermissionFilter(context, emptyArray),
        getMessagePermissionFilter(context, emptyArray),
      ]

      filters.forEach((filter) => {
        expect(filter).toBeNull()
      })
    })
  })

  describe('Location-Based Scoping', () => {
    it('should restrict user to only their locations via conversation filter', () => {
      const context: PermissionContext = { userId: 'user-123' }
      const userLocationIds = ['location-1', 'location-2']

      const filter = getConversationPermissionFilter(context, userLocationIds)

      // User should only see conversations from their locations
      expect(filter?.locationId.in).toContain('location-1')
      expect(filter?.locationId.in).toContain('location-2')
      expect(filter?.locationId.in).not.toContain('location-3')
    })

    it('should enforce empty result when user has no locations', () => {
      const context: PermissionContext = { userId: 'user-123' }
      const userLocationIds: string[] = []

      const conversationFilter = getConversationPermissionFilter(
        context,
        userLocationIds,
      )
      const csvFilter = getCsvUploadPermissionFilter(context, userLocationIds)
      const transactionFilter = getTransactionPermissionFilter(
        context,
        userLocationIds,
      )

      // All should return null, which acts as a deny-all filter
      expect(conversationFilter).toBeNull()
      expect(csvFilter).toBeNull()
      expect(transactionFilter).toBeNull()
    })
  })

  describe('Permission Context Isolation', () => {
    it('should isolate permissions between different users', () => {
      const userAContext: PermissionContext = { userId: 'user-a' }
      const userBContext: PermissionContext = { userId: 'user-b' }

      const userALocations = ['loc-a1', 'loc-a2']
      const userBLocations = ['loc-b1']

      const filterA = getCsvUploadPermissionFilter(userAContext, userALocations)
      const filterB = getCsvUploadPermissionFilter(userBContext, userBLocations)

      // Filters should be different
      expect(filterA).not.toEqual(filterB)

      // User A should not have User B's locations
      expect(filterA?.locationId.in).not.toContain('loc-b1')
      expect(filterB?.locationId.in).not.toContain('loc-a1')
    })
  })
})
