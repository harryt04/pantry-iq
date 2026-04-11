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
    conversationId: uuid('conversation_id').notNull(),
    role: text().notNull(),
    content: text().notNull(),
    modelUsed: text('model_used'),
    tokensIn: integer('tokens_in'),
    tokensOut: integer('tokens_out'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.conversationId],
      foreignColumns: [conversations.id],
      name: 'messages_conversation_id_fk',
    }).onDelete('cascade'),
  ],
)
