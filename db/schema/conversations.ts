import { pgTable, uuid, text, timestamp, foreignKey } from 'drizzle-orm/pg-core'
import { locations } from './locations'

export const conversations = pgTable(
  'conversations',
  {
    id: uuid().primaryKey().defaultRandom(),
    locationId: uuid('locationId').notNull(),
    defaultModel: text('defaultModel')
      .notNull()
      .default('gemini-2.0-flash-lite'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.locationId],
      foreignColumns: [locations.id],
      name: 'conversations_location_id_fk',
    }).onDelete('cascade'),
  ],
)
