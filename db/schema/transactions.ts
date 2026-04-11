import {
  pgTable,
  uuid,
  text,
  numeric,
  date,
  timestamp,
  index,
  foreignKey,
} from 'drizzle-orm/pg-core'
import { locations } from './locations'

export const transactions = pgTable(
  'transactions',
  {
    id: uuid().primaryKey().defaultRandom(),
    locationId: uuid('location_id').notNull(),
    date: date().notNull(),
    item: text().notNull(),
    qty: numeric().notNull(),
    revenue: numeric(),
    cost: numeric(),
    source: text().notNull(),
    sourceId: text('source_id'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
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
