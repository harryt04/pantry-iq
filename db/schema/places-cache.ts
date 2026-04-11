import { pgTable, uuid, text, timestamp, foreignKey } from 'drizzle-orm/pg-core'
import { locations } from './locations'

export const placesCache = pgTable(
  'places_cache',
  {
    id: uuid().primaryKey().defaultRandom(),
    locationId: uuid('locationId').notNull(),
    orgName: text('orgName').notNull(),
    address: text(),
    phone: text(),
    hours: text(),
    types: text('types'),
    cachedAt: timestamp('cachedAt').notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.locationId],
      foreignColumns: [locations.id],
      name: 'places_cache_location_id_fk',
    }).onDelete('cascade'),
  ],
)
