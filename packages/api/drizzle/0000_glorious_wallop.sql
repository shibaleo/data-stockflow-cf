CREATE SCHEMA "data_stockflow";
--> statement-breakpoint
CREATE SEQUENCE "data_stockflow"."account_key_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 100000000000 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "data_stockflow"."book_key_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 100000000000 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "data_stockflow"."counterparty_key_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 100000000000 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "data_stockflow"."journal_key_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 100000000000 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "data_stockflow"."role_key_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 100000000000 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "data_stockflow"."tenant_key_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 100000000000 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "data_stockflow"."user_key_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 100000000000 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "data_stockflow"."voucher_key_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 100000000000 CACHE 1;--> statement-breakpoint
CREATE TABLE "data_stockflow"."account" (
	"key" bigint DEFAULT nextval('data_stockflow.account_key_seq') NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_from" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_to" timestamp with time zone,
	"lines_hash" text NOT NULL,
	"prev_revision_hash" text NOT NULL,
	"revision_hash" text NOT NULL,
	"created_by" bigint NOT NULL,
	"book_key" bigint NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"account_type" text NOT NULL,
	"classification" text,
	"parent_account_key" bigint,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"authority_role_key" bigint NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "account_key_revision_pk" PRIMARY KEY("key","revision")
);
--> statement-breakpoint
CREATE TABLE "data_stockflow"."api_key" (
	"uuid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_key" bigint NOT NULL,
	"tenant_key" bigint NOT NULL,
	"name" text NOT NULL,
	"key_prefix" text NOT NULL,
	"key_hash" text NOT NULL,
	"role" text NOT NULL,
	"expires_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_stockflow"."audit_log" (
	"uuid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_key" bigint,
	"user_key" bigint NOT NULL,
	"user_name" text NOT NULL,
	"user_role" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_key" bigint NOT NULL,
	"entity_name" text,
	"revision" integer,
	"summary" text,
	"changes" jsonb,
	"source_ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_stockflow"."book" (
	"key" bigint DEFAULT nextval('data_stockflow.book_key_seq') NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_from" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_to" timestamp with time zone,
	"lines_hash" text NOT NULL,
	"prev_revision_hash" text NOT NULL,
	"revision_hash" text NOT NULL,
	"created_by" bigint NOT NULL,
	"tenant_key" bigint NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"unit" text NOT NULL,
	"unit_symbol" text DEFAULT '' NOT NULL,
	"unit_position" text DEFAULT 'left' NOT NULL,
	"type" text,
	"type_labels" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"authority_role_key" bigint NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "book_key_revision_pk" PRIMARY KEY("key","revision")
);
--> statement-breakpoint
CREATE TABLE "data_stockflow"."counterparty" (
	"key" bigint DEFAULT nextval('data_stockflow.counterparty_key_seq') NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_from" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_to" timestamp with time zone,
	"lines_hash" text NOT NULL,
	"prev_revision_hash" text NOT NULL,
	"revision_hash" text NOT NULL,
	"created_by" bigint NOT NULL,
	"tenant_key" bigint NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" text,
	"parent_counterparty_key" bigint,
	"authority_role_key" bigint NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "counterparty_key_revision_pk" PRIMARY KEY("key","revision")
);
--> statement-breakpoint
CREATE TABLE "data_stockflow"."entity_color" (
	"entity_type" text NOT NULL,
	"entity_key" bigint NOT NULL,
	"color" text NOT NULL,
	CONSTRAINT "entity_color_entity_type_entity_key_pk" PRIMARY KEY("entity_type","entity_key")
);
--> statement-breakpoint
CREATE TABLE "data_stockflow"."journal" (
	"key" bigint DEFAULT nextval('data_stockflow.journal_key_seq') NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_from" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_to" timestamp with time zone,
	"lines_hash" text NOT NULL,
	"prev_revision_hash" text NOT NULL,
	"revision_hash" text NOT NULL,
	"created_by" bigint NOT NULL,
	"tenant_key" bigint NOT NULL,
	"voucher_key" bigint NOT NULL,
	"book_key" bigint NOT NULL,
	"posted_at" timestamp with time zone NOT NULL,
	"type" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"adjustment_flag" text DEFAULT 'none' NOT NULL,
	"description" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"authority_role_key" bigint NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "journal_key_revision_pk" PRIMARY KEY("key","revision")
);
--> statement-breakpoint
CREATE TABLE "data_stockflow"."journal_line" (
	"uuid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_key" bigint NOT NULL,
	"journal_revision" integer NOT NULL,
	"tenant_key" bigint NOT NULL,
	"sort_order" integer NOT NULL,
	"side" text NOT NULL,
	"account_key" bigint NOT NULL,
	"counterparty_key" bigint,
	"amount" numeric NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "data_stockflow"."role" (
	"key" bigint DEFAULT nextval('data_stockflow.role_key_seq') NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_from" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_to" timestamp with time zone,
	"lines_hash" text NOT NULL,
	"prev_revision_hash" text NOT NULL,
	"revision_hash" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "role_key_revision_pk" PRIMARY KEY("key","revision")
);
--> statement-breakpoint
CREATE TABLE "data_stockflow"."tenant" (
	"key" bigint DEFAULT nextval('data_stockflow.tenant_key_seq') NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_from" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_to" timestamp with time zone,
	"lines_hash" text NOT NULL,
	"prev_revision_hash" text NOT NULL,
	"revision_hash" text NOT NULL,
	"name" text NOT NULL,
	"locked_until" timestamp with time zone,
	CONSTRAINT "tenant_key_revision_pk" PRIMARY KEY("key","revision")
);
--> statement-breakpoint
CREATE TABLE "data_stockflow"."user" (
	"key" bigint DEFAULT nextval('data_stockflow.user_key_seq') NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_from" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_to" timestamp with time zone,
	"lines_hash" text NOT NULL,
	"prev_revision_hash" text NOT NULL,
	"revision_hash" text NOT NULL,
	"tenant_key" bigint NOT NULL,
	"role_key" bigint NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"external_id" text,
	"type" text,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "user_key_revision_pk" PRIMARY KEY("key","revision")
);
--> statement-breakpoint
CREATE TABLE "data_stockflow"."voucher" (
	"key" bigint DEFAULT nextval('data_stockflow.voucher_key_seq') NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_from" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_to" timestamp with time zone,
	"lines_hash" text NOT NULL,
	"prev_revision_hash" text NOT NULL,
	"revision_hash" text NOT NULL,
	"created_by" bigint NOT NULL,
	"tenant_key" bigint NOT NULL,
	"idempotency_key" text NOT NULL,
	"voucher_code" text,
	"description" text,
	"source_system" text,
	"type" text,
	"sequence_no" integer NOT NULL,
	"prev_header_hash" text NOT NULL,
	"header_hash" text NOT NULL,
	"authority_role_key" bigint NOT NULL,
	CONSTRAINT "voucher_key_revision_pk" PRIMARY KEY("key","revision")
);
--> statement-breakpoint
ALTER TABLE "data_stockflow"."journal_line" ADD CONSTRAINT "journal_line_journal_key_journal_revision_journal_key_revision_fk" FOREIGN KEY ("journal_key","journal_revision") REFERENCES "data_stockflow"."journal"("key","revision") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "account_book_key_code_revision_key" ON "data_stockflow"."account" USING btree ("book_key","code","revision");--> statement-breakpoint
CREATE INDEX "idx_api_key_user" ON "data_stockflow"."api_key" USING btree ("user_key");--> statement-breakpoint
CREATE INDEX "idx_api_key_prefix" ON "data_stockflow"."api_key" USING btree ("key_prefix");--> statement-breakpoint
CREATE INDEX "idx_audit_log_tenant_created" ON "data_stockflow"."audit_log" USING btree ("tenant_key","created_at");--> statement-breakpoint
CREATE INDEX "idx_audit_log_entity" ON "data_stockflow"."audit_log" USING btree ("entity_type","entity_key");--> statement-breakpoint
CREATE UNIQUE INDEX "book_tenant_key_code_revision_key" ON "data_stockflow"."book" USING btree ("tenant_key","code","revision");--> statement-breakpoint
CREATE UNIQUE INDEX "counterparty_tenant_key_code_revision_key" ON "data_stockflow"."counterparty" USING btree ("tenant_key","code","revision");--> statement-breakpoint
CREATE INDEX "idx_journal_line_journal" ON "data_stockflow"."journal_line" USING btree ("journal_key","journal_revision");--> statement-breakpoint
CREATE UNIQUE INDEX "role_code_revision_key" ON "data_stockflow"."role" USING btree ("code","revision");--> statement-breakpoint
CREATE UNIQUE INDEX "user_tenant_key_code_revision_key" ON "data_stockflow"."user" USING btree ("tenant_key","code","revision");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_voucher_idempotency" ON "data_stockflow"."voucher" USING btree ("tenant_key","idempotency_key") WHERE revision = 1;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_voucher_code" ON "data_stockflow"."voucher" USING btree ("tenant_key","voucher_code") WHERE voucher_code IS NOT NULL AND revision = 1;