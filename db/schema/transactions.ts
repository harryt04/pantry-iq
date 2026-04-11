import {
  pgTable,
  uuid,
  text,
  numeric,
  timestamp,
  index,
  foreignKey,
} from 'drizzle-orm/pg-core'
import { locations } from './locations'

export const transactions = pgTable(
  'transactions',
  {
    id: uuid().primaryKey().defaultRandom(),
    locationId: uuid('locationId').notNull(),
    date: text().notNull(),
    item: text().notNull(),
    qty: numeric().notNull(),
    revenue: numeric(),
    cost: numeric(),
    source: text().notNull(),
    sourceId: text('sourceId'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.locationId],
      foreignColumns: [locations.id],
      name: 'transactions_location_id_fk',
    }).onDelete('cascade'),
    index('transactions_location_id_date_idx').on(table.locationId, table.date),
  ],
)
