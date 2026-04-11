-- Fix csv_uploads.fieldMapping: jsonb -> text
ALTER TABLE "csv_uploads" ALTER COLUMN "fieldMapping" TYPE text;
--> statement-breakpoint
-- Fix places_cache.types: text[] -> text
ALTER TABLE "places_cache" ALTER COLUMN "types" TYPE text;
--> statement-breakpoint
-- Fix transactions.date: date -> text
ALTER TABLE "transactions" ALTER COLUMN "date" TYPE text;
--> statement-breakpoint
-- Fix weather.date: date -> text
ALTER TABLE "weather" ALTER COLUMN "date" TYPE text;
