import { pgTable, uuid, text, timestamp, foreignKey } from 'drizzle-orm/pg-core'
import { locations } from './locations'

export const posConnections = pgTable(
  'pos_connections',
  {
    id: uuid().primaryKey().defaultRandom(),
    locationId: uuid('location_id').notNull(),
    provider: text().notNull().default('square'),
    oauthToken: text('oauth_token').notNull(),
    refreshToken: text('refresh_token'),
    syncState: text('sync_state').notNull().default('pending'),
    lastSync: timestamp('last_sync'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.locationId],
      foreignColumns: [locations.id],
      name: 'pos_connections_location_id_fk',
    }).onDelete('cascade'),
  ],
)
