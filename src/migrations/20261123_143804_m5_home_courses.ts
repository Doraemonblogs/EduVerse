import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "home_page" ADD COLUMN "courses_enabled" boolean DEFAULT true;
  ALTER TABLE "home_page" ADD COLUMN "courses_eyebrow" varchar DEFAULT 'Courses';
  ALTER TABLE "home_page" ADD COLUMN "courses_title" varchar DEFAULT '精选课程' NOT NULL;
  ALTER TABLE "home_page" ADD COLUMN "courses_description" varchar;
  ALTER TABLE "home_page_rels" ADD COLUMN "courses_id" integer;
  ALTER TABLE "home_page_rels" ADD CONSTRAINT "home_page_rels_courses_fk" FOREIGN KEY ("courses_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "home_page_rels_courses_id_idx" ON "home_page_rels" USING btree ("courses_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "home_page_rels" DROP CONSTRAINT "home_page_rels_courses_fk";
  
  DROP INDEX "home_page_rels_courses_id_idx";
  ALTER TABLE "home_page" DROP COLUMN "courses_enabled";
  ALTER TABLE "home_page" DROP COLUMN "courses_eyebrow";
  ALTER TABLE "home_page" DROP COLUMN "courses_title";
  ALTER TABLE "home_page" DROP COLUMN "courses_description";
  ALTER TABLE "home_page_rels" DROP COLUMN "courses_id";`)
}
