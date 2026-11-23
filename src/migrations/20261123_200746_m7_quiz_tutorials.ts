import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "tutorial_pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"list_title" varchar DEFAULT '免费教程' NOT NULL,
  	"list_description" varchar DEFAULT '各专业讲师录制的软件入门与技法讲解，按专业方向与难度筛选，点开就能看。部分教程留下联系方式后即可观看。',
  	"list_seo_title" varchar,
  	"list_seo_description" varchar,
  	"list_seo_keywords" varchar,
  	"list_seo_image_id" integer,
  	"list_seo_noindex" boolean DEFAULT false,
  	"gate_title" varchar DEFAULT '留下联系方式，解锁这节教程' NOT NULL,
  	"gate_description" varchar DEFAULT '提交后即可观看本节教程，课程顾问会结合你的基础提供这个方向的学习建议。不想留联系方式，也可以先看其它免费教程。',
  	"gate_submit_label" varchar DEFAULT '解锁观看' NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "quiz_settings_result_next_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar
  );
  
  ALTER TABLE "quiz_settings" ALTER COLUMN "intro_description" SET DEFAULT '10 道选择题，约 2 分钟。根据你的兴趣与习惯，看看哪个数字艺术方向和你更合拍。';
  ALTER TABLE "quiz_settings" ALTER COLUMN "result_gated_description" SET DEFAULT '完整报告包含各方向的匹配度排序、推荐方向的课程与下一步建议。';
  ALTER TABLE "quiz_settings" ADD COLUMN "result_report_title" varchar DEFAULT '你的完整报告' NOT NULL;
  ALTER TABLE "quiz_settings" ADD COLUMN "result_disclaimer" varchar DEFAULT '测试结果根据你的选择计算，仅供了解方向时参考。是否适合，还需要结合试听体验与自身情况判断。';
  ALTER TABLE "quiz_settings" ADD COLUMN "result_next_steps_title" varchar DEFAULT '下一步建议' NOT NULL;
  ALTER TABLE "tutorial_pages" ADD CONSTRAINT "tutorial_pages_list_seo_image_id_media_id_fk" FOREIGN KEY ("list_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "quiz_settings_result_next_steps" ADD CONSTRAINT "quiz_settings_result_next_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quiz_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "tutorial_pages_list_seo_list_seo_image_idx" ON "tutorial_pages" USING btree ("list_seo_image_id");
  CREATE INDEX "quiz_settings_result_next_steps_order_idx" ON "quiz_settings_result_next_steps" USING btree ("_order");
  CREATE INDEX "quiz_settings_result_next_steps_parent_id_idx" ON "quiz_settings_result_next_steps" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "tutorial_pages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "quiz_settings_result_next_steps" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "tutorial_pages" CASCADE;
  DROP TABLE "quiz_settings_result_next_steps" CASCADE;
  ALTER TABLE "quiz_settings" ALTER COLUMN "intro_description" DROP DEFAULT;
  ALTER TABLE "quiz_settings" ALTER COLUMN "result_gated_description" DROP DEFAULT;
  ALTER TABLE "quiz_settings" DROP COLUMN "result_report_title";
  ALTER TABLE "quiz_settings" DROP COLUMN "result_disclaimer";
  ALTER TABLE "quiz_settings" DROP COLUMN "result_next_steps_title";`)
}
