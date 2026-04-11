import {
  pgTable,
  uuid,
  text,
  numeric,
  timestamp,
  uniqueIndex,
  foreignKey,
} from 'drizzle-orm/pg-core'
import { locations } from './locations'

export const weather = pgTable(
  'weather',
  {
    id: uuid().primaryKey().defaultRandom(),
    locationId: uuid('locationId').notNull(),
    date: text().notNull(),
    temperature: numeric(),
    conditions: text(),
    precipitation: numeric(),
    cachedAt: timestamp('cachedAt').notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.locationId],
      foreignColumns: [locations.id],
      name: 'weather_location_id_fk',
    }).onDelete('cascade'),
    uniqueIndex('weather_location_id_date_unique').on(
      table.locationId,
      table.date,
    ),
  ],
)
