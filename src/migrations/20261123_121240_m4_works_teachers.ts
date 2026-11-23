import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "work_pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"list_title" varchar DEFAULT '学员作品' NOT NULL,
  	"list_description" varchar DEFAULT '这里的作品来自各专业的在读与毕业学员，均已取得学员授权展示。可以按专业方向与使用软件筛选，看看课程里做出来的东西。',
  	"list_seo_title" varchar,
  	"list_seo_description" varchar,
  	"list_seo_keywords" varchar,
  	"list_seo_image_id" integer,
  	"list_seo_noindex" boolean DEFAULT false,
  	"detail_cta_title" varchar DEFAULT '想做出这样的作品？' NOT NULL,
  	"detail_cta_description" varchar DEFAULT '预约一节试听课，了解这件作品所在课程的学习安排，再判断这个方向是否适合你。',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "teacher_pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"list_title" varchar DEFAULT '师资团队' NOT NULL,
  	"list_description" varchar DEFAULT '讲师来自动画、游戏、影视与设计行业一线，按专业方向分工授课。可以按方向查看讲师的从业经历与授课课程。',
  	"list_seo_title" varchar,
  	"list_seo_description" varchar,
  	"list_seo_keywords" varchar,
  	"list_seo_image_id" integer,
  	"list_seo_noindex" boolean DEFAULT false,
  	"detail_cta_title" varchar DEFAULT '想听这位讲师的课？' NOT NULL,
  	"detail_cta_description" varchar DEFAULT '留下联系方式，课程顾问会帮你查询这位讲师近期的授课安排，并预约一节试听课。',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "work_pages" ADD CONSTRAINT "work_pages_list_seo_image_id_media_id_fk" FOREIGN KEY ("list_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "teacher_pages" ADD CONSTRAINT "teacher_pages_list_seo_image_id_media_id_fk" FOREIGN KEY ("list_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "work_pages_list_seo_list_seo_image_idx" ON "work_pages" USING btree ("list_seo_image_id");
  CREATE INDEX "teacher_pages_list_seo_list_seo_image_idx" ON "teacher_pages" USING btree ("list_seo_image_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "work_pages" CASCADE;
  DROP TABLE "teacher_pages" CASCADE;`)
}
