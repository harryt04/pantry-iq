import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'

export const locations = pgTable('locations', {
  id: uuid().primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  name: text().notNull(),
  timezone: text().notNull().default('America/New_York'),
  address: text(),
  zipCode: text('zip_code').notNull(),
  type: text().notNull().default('restaurant'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
