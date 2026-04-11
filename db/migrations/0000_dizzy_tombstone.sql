CREATE TABLE "placeholder" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"createdAt" timestamp DEFAULT now()
);
