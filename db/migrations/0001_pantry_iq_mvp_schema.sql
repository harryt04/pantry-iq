-- Create locations table
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"timezone" text NOT NULL DEFAULT 'America/New_York',
	"address" text,
	"zip_code" text NOT NULL,
	"type" text NOT NULL DEFAULT 'restaurant',
	"created_at" timestamp NOT NULL DEFAULT now()
);

-- Create pos_connections table
CREATE TABLE "pos_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"provider" text NOT NULL DEFAULT 'square',
	"oauth_token" text NOT NULL,
	"refresh_token" text,
	"sync_state" text NOT NULL DEFAULT 'pending',
	"last_sync" timestamp,
	"created_at" timestamp NOT NULL DEFAULT now(),
	CONSTRAINT "pos_connections_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE
);

-- Create csv_uploads table
CREATE TABLE "csv_uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"filename" text NOT NULL,
	"row_count" integer,
	"status" text NOT NULL DEFAULT 'pending',
	"error_details" text,
	"field_mapping" jsonb,
	"uploaded_at" timestamp NOT NULL DEFAULT now(),
	CONSTRAINT "csv_uploads_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE
);

-- Create transactions table
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"date" date NOT NULL,
	"item" text NOT NULL,
	"qty" numeric NOT NULL,
	"revenue" numeric,
	"cost" numeric,
	"source" text NOT NULL,
	"source_id" text,
	"created_at" timestamp NOT NULL DEFAULT now(),
	CONSTRAINT "transactions_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE
);

-- Create index on transactions(location_id, date)
CREATE INDEX "transactions_location_id_date_idx" ON "transactions"("location_id", "date");

-- Create weather table
CREATE TABLE "weather" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"date" date NOT NULL,
	"temperature" numeric,
	"conditions" text,
	"precipitation" numeric,
	"cached_at" timestamp NOT NULL DEFAULT now(),
	CONSTRAINT "weather_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE
);

-- Create unique index on weather(location_id, date)
CREATE UNIQUE INDEX "weather_location_id_date_unique" ON "weather"("location_id", "date");

-- Create places_cache table
CREATE TABLE "places_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"org_name" text NOT NULL,
	"address" text,
	"phone" text,
	"hours" text,
	"types" text[],
	"cached_at" timestamp NOT NULL DEFAULT now(),
	CONSTRAINT "places_cache_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE
);

-- Create conversations table
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"default_model" text NOT NULL DEFAULT 'gemini-2.0-flash-lite',
	"created_at" timestamp NOT NULL DEFAULT now(),
	CONSTRAINT "conversations_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE
);

-- Create messages table
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"model_used" text,
	"tokens_in" integer,
	"tokens_out" integer,
	"created_at" timestamp NOT NULL DEFAULT now(),
	CONSTRAINT "messages_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE
);

-- Create waitlist_signups table
CREATE TABLE "waitlist_signups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp NOT NULL DEFAULT now()
);

-- Create unique constraint on waitlist_signups(email)
CREATE UNIQUE INDEX "waitlist_signups_email_unique" ON "waitlist_signups"("email");
