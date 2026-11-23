import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "article_pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"list_title" varchar DEFAULT '资讯' NOT NULL,
  	"list_description" varchar DEFAULT '学院新闻、行业观察、学习方法与报名常见问题。按分类浏览，了解数字艺术各方向的学习与求职信息。',
  	"list_seo_title" varchar,
  	"list_seo_description" varchar,
  	"list_seo_keywords" varchar,
  	"list_seo_image_id" integer,
  	"list_seo_noindex" boolean DEFAULT false,
  	"detail_sidebar_title" varchar DEFAULT '预约免费试听' NOT NULL,
  	"detail_sidebar_description" varchar DEFAULT '读完还有疑问？留下联系方式，课程顾问会结合你的基础与时间，介绍合适的方向与课程安排。',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "campus_pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"list_title" varchar DEFAULT '校区分布' NOT NULL,
  	"list_description" varchar DEFAULT '各校区均设有教室、机房与作品评图区，开放时间内可预约到校参观、试听。查看校区地址、交通与开设课程。',
  	"list_seo_title" varchar,
  	"list_seo_description" varchar,
  	"list_seo_keywords" varchar,
  	"list_seo_image_id" integer,
  	"list_seo_noindex" boolean DEFAULT false,
  	"detail_cta_title" varchar DEFAULT '预约到校参观' NOT NULL,
  	"detail_cta_description" varchar DEFAULT '留下联系方式，课程顾问会与你确认到访时间，安排参观教室与机房，并旁听一节正在进行的课程。',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "careers_page" ADD COLUMN "cta_title" varchar DEFAULT '预约一次就业咨询' NOT NULL;
  ALTER TABLE "careers_page" ADD COLUMN "cta_description" varchar DEFAULT '留下联系方式，课程顾问会结合你的作品与目标岗位，介绍作品集指导、模拟面试等服务的安排。录用由企业自主决定。';
  ALTER TABLE "article_pages" ADD CONSTRAINT "article_pages_list_seo_image_id_media_id_fk" FOREIGN KEY ("list_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "campus_pages" ADD CONSTRAINT "campus_pages_list_seo_image_id_media_id_fk" FOREIGN KEY ("list_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "article_pages_list_seo_list_seo_image_idx" ON "article_pages" USING btree ("list_seo_image_id");
  CREATE INDEX "campus_pages_list_seo_list_seo_image_idx" ON "campus_pages" USING btree ("list_seo_image_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "article_pages" CASCADE;
  DROP TABLE "campus_pages" CASCADE;
  ALTER TABLE "careers_page" DROP COLUMN "cta_title";
  ALTER TABLE "careers_page" DROP COLUMN "cta_description";`)
}
