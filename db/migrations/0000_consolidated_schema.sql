-- Consolidated migration: full PantryIQ schema
-- Replaces 0001_pantry_iq_mvp_schema, 0002_jittery_shocker, 0002_better_auth_schema, 0003_fix_zero_schema_types
-- Safe to run on a fresh schema; existing databases already have these applied individually.

-- Better Auth tables
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" text,
	"password" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- App tables
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"name" text NOT NULL,
	"timezone" text NOT NULL DEFAULT 'America/New_York',
	"address" text,
	"zipCode" text NOT NULL,
	"type" text NOT NULL DEFAULT 'restaurant',
	"createdAt" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pos_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"locationId" uuid NOT NULL,
	"provider" text NOT NULL DEFAULT 'square',
	"oauthToken" text NOT NULL,
	"refreshToken" text,
	"syncState" text NOT NULL DEFAULT 'pending',
	"lastSync" timestamp,
	"createdAt" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "csv_uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"locationId" uuid NOT NULL,
	"filename" text NOT NULL,
	"rowCount" integer,
	"status" text NOT NULL DEFAULT 'pending',
	"errorDetails" text,
	"fieldMapping" text,
	"uploadedAt" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"locationId" uuid NOT NULL,
	"date" text NOT NULL,
	"item" text NOT NULL,
	"qty" numeric NOT NULL,
	"revenue" numeric,
	"cost" numeric,
	"source" text NOT NULL,
	"sourceId" text,
	"createdAt" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "weather" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"locationId" uuid NOT NULL,
	"date" text NOT NULL,
	"temperature" numeric,
	"conditions" text,
	"precipitation" numeric,
	"cachedAt" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "places_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"locationId" uuid NOT NULL,
	"orgName" text NOT NULL,
	"address" text,
	"phone" text,
	"hours" text,
	"types" text,
	"cachedAt" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"locationId" uuid NOT NULL,
	"defaultModel" text NOT NULL DEFAULT 'gemini-2.0-flash-lite',
	"createdAt" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversationId" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"modelUsed" text,
	"tokensIn" integer,
	"tokensOut" integer,
	"createdAt" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "waitlist_signups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"createdAt" timestamp NOT NULL DEFAULT now(),
	CONSTRAINT "waitlist_signups_email_unique" UNIQUE("email")
);
--> statement-breakpoint

-- Foreign key constraints
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pos_connections" ADD CONSTRAINT "pos_connections_location_id_fk" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "csv_uploads" ADD CONSTRAINT "csv_uploads_location_id_fk" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_location_id_fk" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "weather" ADD CONSTRAINT "weather_location_id_fk" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "places_cache" ADD CONSTRAINT "places_cache_location_id_fk" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_location_id_fk" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fk" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- Indexes
CREATE INDEX "session_userId_idx" ON "session" ("userId");
--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" ("userId");
--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" ("identifier");
--> statement-breakpoint
CREATE INDEX "transactions_location_id_date_idx" ON "transactions" ("locationId", "date");
--> statement-breakpoint
CREATE UNIQUE INDEX "weather_location_id_date_unique" ON "weather" ("locationId", "date");
