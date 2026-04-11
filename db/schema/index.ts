import { pgTable, serial, varchar, timestamp } from 'drizzle-orm/pg-core'

// Placeholder schema - will be populated in WU-0.2
// This file ensures drizzle-kit commands work properly
export const placeholder = pgTable('placeholder', {
  id: serial().primaryKey(),
  name: varchar().notNull(),
  createdAt: timestamp().defaultNow(),
})
