import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  foreignKey,
} from 'drizzle-orm/pg-core'
import { locations } from './locations'

export const csvUploads = pgTable(
  'csv_uploads',
  {
    id: uuid().primaryKey().defaultRandom(),
    locationId: uuid('location_id').notNull(),
    filename: text().notNull(),
    rowCount: integer('row_count'),
    status: text().notNull().default('pending'),
    errorDetails: text('error_details'),
    fieldMapping: jsonb('field_mapping'),
    uploadedAt: timestamp('uploaded_at').notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.locationId],
      foreignColumns: [locations.id],
      name: 'csv_uploads_location_id_fk',
    }).onDelete('cascade'),
  ],
)
