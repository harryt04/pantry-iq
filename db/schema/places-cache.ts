import {
  pgTable,
  uuid,
  text,
  text as textArray,
  timestamp,
  foreignKey,
} from 'drizzle-orm/pg-core'
import { locations } from './locations'

export const placesCache = pgTable(
  'places_cache',
  {
    id: uuid().primaryKey().defaultRandom(),
    locationId: uuid('location_id').notNull(),
    orgName: text('org_name').notNull(),
    address: text(),
    phone: text(),
    hours: text(),
    types: textArray('types').array(),
    cachedAt: timestamp('cached_at').notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.locationId],
      foreignColumns: [locations.id],
      name: 'places_cache_location_id_fk',
    }).onDelete('cascade'),
  ],
)
