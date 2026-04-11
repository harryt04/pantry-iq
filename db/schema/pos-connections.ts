import { pgTable, uuid, text, timestamp, foreignKey } from 'drizzle-orm/pg-core'
import { locations } from './locations'

export const posConnections = pgTable(
  'pos_connections',
  {
    id: uuid().primaryKey().defaultRandom(),
    locationId: uuid('locationId').notNull(),
    provider: text().notNull().default('square'),
    oauthToken: text('oauthToken').notNull(),
    refreshToken: text('refreshToken'),
    syncState: text('syncState').notNull().default('pending'),
    lastSync: timestamp('lastSync'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.locationId],
      foreignColumns: [locations.id],
      name: 'pos_connections_location_id_fk',
    }).onDelete('cascade'),
  ],
)
