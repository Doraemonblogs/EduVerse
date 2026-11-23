import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "course_pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"list_title" varchar DEFAULT '专业课程' NOT NULL,
  	"list_description" varchar DEFAULT '按专业方向、班型、授课方式与城市筛选课程，每门课程都列出了学习路线、开设校区与近期开班，方便对比后再预约试听。',
  	"list_seo_title" varchar,
  	"list_seo_description" varchar,
  	"list_seo_keywords" varchar,
  	"list_seo_image_id" integer,
  	"list_seo_noindex" boolean DEFAULT false,
  	"detail_sidebar_title" varchar DEFAULT '预约免费试听' NOT NULL,
  	"detail_sidebar_description" varchar DEFAULT '留下联系方式，课程顾问会结合你的基础与时间，安排就近校区或线上试听。',
  	"major_cta_title" varchar DEFAULT '不确定这个方向适不适合你？' NOT NULL,
  	"major_cta_description" varchar DEFAULT '先听一节课，或请课程顾问根据你的基础和目标，梳理一条可执行的学习路径，再决定要不要报名。',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "course_pages" ADD CONSTRAINT "course_pages_list_seo_image_id_media_id_fk" FOREIGN KEY ("list_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "course_pages_list_seo_list_seo_image_idx" ON "course_pages" USING btree ("list_seo_image_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "course_pages" CASCADE;`)
}
