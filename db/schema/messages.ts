import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  foreignKey,
} from 'drizzle-orm/pg-core'
import { conversations } from './conversations'

export const messages = pgTable(
  'messages',
  {
    id: uuid().primaryKey().defaultRandom(),
    conversationId: uuid('conversationId').notNull(),
    role: text().notNull(),
    content: text().notNull(),
    modelUsed: text('modelUsed'),
    tokensIn: integer('tokensIn'),
    tokensOut: integer('tokensOut'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.conversationId],
      foreignColumns: [conversations.id],
      name: 'messages_conversation_id_fk',
    }).onDelete('cascade'),
  ],
)
