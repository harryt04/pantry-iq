import { pgTable, uuid, text, timestamp, unique } from 'drizzle-orm/pg-core'

export const waitlistSignups = pgTable(
  'waitlist_signups',
  {
    id: uuid().primaryKey().defaultRandom(),
    email: text().notNull(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => [unique('waitlist_signups_email_unique').on(table.email)],
)
