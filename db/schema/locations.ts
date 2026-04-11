import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'

export const locations = pgTable('locations', {
  id: uuid().primaryKey().defaultRandom(),
  userId: text('userId').notNull(),
  name: text().notNull(),
  timezone: text().notNull().default('America/New_York'),
  address: text(),
  zipCode: text('zipCode').notNull(),
  type: text().notNull().default('restaurant'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})
