import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_disciplines_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__disciplines_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_courses_delivery_modes" AS ENUM('offline', 'online', 'dual');
  CREATE TYPE "public"."enum_courses_class_type" AS ENUM('long_term', 'short_term');
  CREATE TYPE "public"."enum_courses_duration_unit" AS ENUM('week', 'month');
  CREATE TYPE "public"."enum_courses_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__courses_v_version_delivery_modes" AS ENUM('offline', 'online', 'dual');
  CREATE TYPE "public"."enum__courses_v_version_class_type" AS ENUM('long_term', 'short_term');
  CREATE TYPE "public"."enum__courses_v_version_duration_unit" AS ENUM('week', 'month');
  CREATE TYPE "public"."enum__courses_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_cohorts_mode" AS ENUM('offline', 'online', 'dual');
  CREATE TYPE "public"."enum_cohorts_status" AS ENUM('enrolling', 'upcoming', 'full', 'closed');
  CREATE TYPE "public"."enum_software_category" AS ENUM('modeling', 'rendering', 'compositing', 'design', 'painting');
  CREATE TYPE "public"."enum_teachers_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__teachers_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_works_video_kind" AS ENUM('none', 'embed', 'file');
  CREATE TYPE "public"."enum_works_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__works_v_version_video_kind" AS ENUM('none', 'embed', 'file');
  CREATE TYPE "public"."enum__works_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_stories_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__stories_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_articles_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__articles_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_campuses_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__campuses_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_banners_placement" AS ENUM('home_hero', 'careers_hero');
  CREATE TYPE "public"."enum_faqs_category" AS ENUM('course', 'fee', 'career', 'general');
  CREATE TYPE "public"."enum_tutorials_level" AS ENUM('beginner', 'intermediate', 'advanced');
  CREATE TYPE "public"."enum_tutorials_provider" AS ENUM('bilibili');
  CREATE TYPE "public"."enum_tutorials_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__tutorials_v_version_level" AS ENUM('beginner', 'intermediate', 'advanced');
  CREATE TYPE "public"."enum__tutorials_v_version_provider" AS ENUM('bilibili');
  CREATE TYPE "public"."enum__tutorials_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_pages_blocks_image_text_image_position" AS ENUM('left', 'right');
  CREATE TYPE "public"."enum_pages_blocks_cta_intent" AS ENUM('trial', 'tuition', 'materials', 'quiz', 'tutorial', 'consult');
  CREATE TYPE "public"."enum_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__pages_v_blocks_image_text_image_position" AS ENUM('left', 'right');
  CREATE TYPE "public"."enum__pages_v_blocks_cta_intent" AS ENUM('trial', 'tuition', 'materials', 'quiz', 'tutorial', 'consult');
  CREATE TYPE "public"."enum__pages_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_leads_status_history_from" AS ENUM('new', 'contacted', 'visited', 'enrolled', 'invalid');
  CREATE TYPE "public"."enum_leads_status_history_to" AS ENUM('new', 'contacted', 'visited', 'enrolled', 'invalid');
  CREATE TYPE "public"."enum_leads_intent" AS ENUM('trial', 'tuition', 'materials', 'quiz', 'tutorial', 'consult');
  CREATE TYPE "public"."enum_leads_status" AS ENUM('new', 'contacted', 'visited', 'enrolled', 'invalid');
  CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'editor', 'consultant');
  CREATE TYPE "public"."enum_navigation_items_type" AS ENUM('link', 'course_menu');
  CREATE TYPE "public"."enum_home_page_quick_entries_items_action" AS ENUM('link', 'lead');
  CREATE TYPE "public"."enum_home_page_featured_works_mode" AS ENUM('auto', 'manual');
  CREATE TYPE "public"."enum_lead_settings_webhooks_platform" AS ENUM('wecom', 'feishu', 'dingtalk');
  CREATE TABLE "disciplines_career_directions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"description" varchar
  );
  
  CREATE TABLE "disciplines" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"short_name" varchar,
  	"tagline" varchar,
  	"cover_id" integer,
  	"intro" jsonb,
  	"salary_ref_range" varchar,
  	"salary_ref_source" varchar,
  	"salary_ref_stat_date" varchar,
  	"salary_ref_note" varchar,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_keywords" varchar,
  	"seo_image_id" integer,
  	"seo_noindex" boolean DEFAULT false,
  	"generate_slug" boolean DEFAULT true,
  	"slug" varchar,
  	"show_in_nav" boolean DEFAULT true,
  	"order" numeric DEFAULT 100,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_disciplines_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_disciplines_v_version_career_directions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"description" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_disciplines_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name" varchar,
  	"version_short_name" varchar,
  	"version_tagline" varchar,
  	"version_cover_id" integer,
  	"version_intro" jsonb,
  	"version_salary_ref_range" varchar,
  	"version_salary_ref_source" varchar,
  	"version_salary_ref_stat_date" varchar,
  	"version_salary_ref_note" varchar,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_seo_keywords" varchar,
  	"version_seo_image_id" integer,
  	"version_seo_noindex" boolean DEFAULT false,
  	"version_generate_slug" boolean DEFAULT true,
  	"version_slug" varchar,
  	"version_show_in_nav" boolean DEFAULT true,
  	"version_order" numeric DEFAULT 100,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__disciplines_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "courses_delivery_modes" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_courses_delivery_modes",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "courses_highlights" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "courses_audience" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "courses_stages_topics" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "courses_stages" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"duration" varchar,
  	"goals" varchar
  );
  
  CREATE TABLE "courses_projects" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"description" varchar,
  	"image_id" integer
  );
  
  CREATE TABLE "courses_career_directions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"description" varchar
  );
  
  CREATE TABLE "courses" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"discipline_id" integer,
  	"class_type" "enum_courses_class_type",
  	"duration_value" numeric,
  	"duration_unit" "enum_courses_duration_unit" DEFAULT 'month',
  	"schedule" varchar,
  	"summary" varchar,
  	"cover_id" integer,
  	"salary_ref_range" varchar,
  	"salary_ref_source" varchar,
  	"salary_ref_stat_date" varchar,
  	"salary_ref_note" varchar,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_keywords" varchar,
  	"seo_image_id" integer,
  	"seo_noindex" boolean DEFAULT false,
  	"generate_slug" boolean DEFAULT true,
  	"slug" varchar,
  	"featured" boolean DEFAULT false,
  	"order" numeric DEFAULT 100,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_courses_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "courses_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"campuses_id" integer,
  	"software_id" integer,
  	"teachers_id" integer,
  	"faqs_id" integer
  );
  
  CREATE TABLE "_courses_v_version_delivery_modes" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__courses_v_version_delivery_modes",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_courses_v_version_highlights" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_courses_v_version_audience" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_courses_v_version_stages_topics" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_courses_v_version_stages" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"duration" varchar,
  	"goals" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_courses_v_version_projects" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"description" varchar,
  	"image_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_courses_v_version_career_directions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"description" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_courses_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_discipline_id" integer,
  	"version_class_type" "enum__courses_v_version_class_type",
  	"version_duration_value" numeric,
  	"version_duration_unit" "enum__courses_v_version_duration_unit" DEFAULT 'month',
  	"version_schedule" varchar,
  	"version_summary" varchar,
  	"version_cover_id" integer,
  	"version_salary_ref_range" varchar,
  	"version_salary_ref_source" varchar,
  	"version_salary_ref_stat_date" varchar,
  	"version_salary_ref_note" varchar,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_seo_keywords" varchar,
  	"version_seo_image_id" integer,
  	"version_seo_noindex" boolean DEFAULT false,
  	"version_generate_slug" boolean DEFAULT true,
  	"version_slug" varchar,
  	"version_featured" boolean DEFAULT false,
  	"version_order" numeric DEFAULT 100,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__courses_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_courses_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"campuses_id" integer,
  	"software_id" integer,
  	"teachers_id" integer,
  	"faqs_id" integer
  );
  
  CREATE TABLE "cohorts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"course_id" integer NOT NULL,
  	"mode" "enum_cohorts_mode" NOT NULL,
  	"campus_id" integer,
  	"start_date" timestamp(3) with time zone NOT NULL,
  	"end_date" timestamp(3) with time zone,
  	"status" "enum_cohorts_status" DEFAULT 'enrolling' NOT NULL,
  	"note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "software" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"category" "enum_software_category" NOT NULL,
  	"generate_slug" boolean DEFAULT true,
  	"slug" varchar NOT NULL,
  	"order" numeric DEFAULT 100,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "teachers_specialties" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "teachers_experience" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"period" varchar,
  	"org" varchar,
  	"role" varchar
  );
  
  CREATE TABLE "teachers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"title" varchar,
  	"avatar_id" integer,
  	"campus_id" integer,
  	"years_of_experience" numeric,
  	"bio" jsonb,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_keywords" varchar,
  	"seo_image_id" integer,
  	"seo_noindex" boolean DEFAULT false,
  	"generate_slug" boolean DEFAULT true,
  	"slug" varchar,
  	"featured" boolean DEFAULT false,
  	"order" numeric DEFAULT 100,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_teachers_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "teachers_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"disciplines_id" integer
  );
  
  CREATE TABLE "_teachers_v_version_specialties" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_teachers_v_version_experience" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"period" varchar,
  	"org" varchar,
  	"role" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_teachers_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name" varchar,
  	"version_title" varchar,
  	"version_avatar_id" integer,
  	"version_campus_id" integer,
  	"version_years_of_experience" numeric,
  	"version_bio" jsonb,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_seo_keywords" varchar,
  	"version_seo_image_id" integer,
  	"version_seo_noindex" boolean DEFAULT false,
  	"version_generate_slug" boolean DEFAULT true,
  	"version_slug" varchar,
  	"version_featured" boolean DEFAULT false,
  	"version_order" numeric DEFAULT 100,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__teachers_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_teachers_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"disciplines_id" integer
  );
  
  CREATE TABLE "works_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"caption" varchar
  );
  
  CREATE TABLE "works" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"author_display_name" varchar,
  	"author_cohort_label" varchar,
  	"discipline_id" integer,
  	"course_id" integer,
  	"cover_id" integer,
  	"video_kind" "enum_works_video_kind" DEFAULT 'none',
  	"video_embed_url" varchar,
  	"video_file_id" integer,
  	"description" varchar,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_keywords" varchar,
  	"seo_image_id" integer,
  	"seo_noindex" boolean DEFAULT false,
  	"consent_confirmed" boolean DEFAULT false,
  	"featured" boolean DEFAULT false,
  	"published_at" timestamp(3) with time zone,
  	"order" numeric DEFAULT 100,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_works_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "works_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"software_id" integer
  );
  
  CREATE TABLE "_works_v_version_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"caption" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_works_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_author_display_name" varchar,
  	"version_author_cohort_label" varchar,
  	"version_discipline_id" integer,
  	"version_course_id" integer,
  	"version_cover_id" integer,
  	"version_video_kind" "enum__works_v_version_video_kind" DEFAULT 'none',
  	"version_video_embed_url" varchar,
  	"version_video_file_id" integer,
  	"version_description" varchar,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_seo_keywords" varchar,
  	"version_seo_image_id" integer,
  	"version_seo_noindex" boolean DEFAULT false,
  	"version_consent_confirmed" boolean DEFAULT false,
  	"version_featured" boolean DEFAULT false,
  	"version_published_at" timestamp(3) with time zone,
  	"version_order" numeric DEFAULT 100,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__works_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_works_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"software_id" integer
  );
  
  CREATE TABLE "stories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"display_name" varchar,
  	"background" varchar,
  	"avatar_id" integer,
  	"course_id" integer,
  	"current_role" varchar,
  	"company_name" varchar,
  	"partner_id" integer,
  	"quote" varchar,
  	"story" jsonb,
  	"consent_confirmed" boolean DEFAULT false,
  	"featured" boolean DEFAULT false,
  	"order" numeric DEFAULT 100,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_stories_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "stories_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"works_id" integer
  );
  
  CREATE TABLE "_stories_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_display_name" varchar,
  	"version_background" varchar,
  	"version_avatar_id" integer,
  	"version_course_id" integer,
  	"version_current_role" varchar,
  	"version_company_name" varchar,
  	"version_partner_id" integer,
  	"version_quote" varchar,
  	"version_story" jsonb,
  	"version_consent_confirmed" boolean DEFAULT false,
  	"version_featured" boolean DEFAULT false,
  	"version_order" numeric DEFAULT 100,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__stories_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_stories_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"works_id" integer
  );
  
  CREATE TABLE "partners" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"logo_id" integer NOT NULL,
  	"industry" varchar,
  	"website" varchar,
  	"order" numeric DEFAULT 100,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "career_events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"date" timestamp(3) with time zone NOT NULL,
  	"location" varchar,
  	"campus_id" integer,
  	"image_id" integer,
  	"description" varchar,
  	"registration_note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "articles" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"category_id" integer,
  	"cover_id" integer,
  	"excerpt" varchar,
  	"content" jsonb,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_keywords" varchar,
  	"seo_image_id" integer,
  	"seo_noindex" boolean DEFAULT false,
  	"generate_slug" boolean DEFAULT true,
  	"slug" varchar,
  	"author_name" varchar DEFAULT '教研中心',
  	"published_at" timestamp(3) with time zone,
  	"views" numeric DEFAULT 0,
  	"search_text" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_articles_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "articles_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"courses_id" integer
  );
  
  CREATE TABLE "_articles_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_category_id" integer,
  	"version_cover_id" integer,
  	"version_excerpt" varchar,
  	"version_content" jsonb,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_seo_keywords" varchar,
  	"version_seo_image_id" integer,
  	"version_seo_noindex" boolean DEFAULT false,
  	"version_generate_slug" boolean DEFAULT true,
  	"version_slug" varchar,
  	"version_author_name" varchar DEFAULT '教研中心',
  	"version_published_at" timestamp(3) with time zone,
  	"version_views" numeric DEFAULT 0,
  	"version_search_text" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__articles_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_articles_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"courses_id" integer
  );
  
  CREATE TABLE "article_categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"description" varchar,
  	"generate_slug" boolean DEFAULT true,
  	"slug" varchar NOT NULL,
  	"order" numeric DEFAULT 100,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "campuses_photos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"caption" varchar
  );
  
  CREATE TABLE "campuses" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"city" varchar,
  	"city_slug" varchar,
  	"address" varchar,
  	"location_lng" numeric,
  	"location_lat" numeric,
  	"transit" varchar,
  	"phone" varchar,
  	"opening_hours" varchar,
  	"cover_id" integer,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_keywords" varchar,
  	"seo_image_id" integer,
  	"seo_noindex" boolean DEFAULT false,
  	"generate_slug" boolean DEFAULT true,
  	"slug" varchar,
  	"order" numeric DEFAULT 100,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_campuses_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_campuses_v_version_photos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"caption" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_campuses_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name" varchar,
  	"version_city" varchar,
  	"version_city_slug" varchar,
  	"version_address" varchar,
  	"version_location_lng" numeric,
  	"version_location_lat" numeric,
  	"version_transit" varchar,
  	"version_phone" varchar,
  	"version_opening_hours" varchar,
  	"version_cover_id" integer,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_seo_keywords" varchar,
  	"version_seo_image_id" integer,
  	"version_seo_noindex" boolean DEFAULT false,
  	"version_generate_slug" boolean DEFAULT true,
  	"version_slug" varchar,
  	"version_order" numeric DEFAULT 100,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__campuses_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "banners" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"subtitle" varchar,
  	"image_id" integer NOT NULL,
  	"mobile_image_id" integer,
  	"cta_label" varchar,
  	"href" varchar,
  	"placement" "enum_banners_placement" DEFAULT 'home_hero' NOT NULL,
  	"active" boolean DEFAULT true,
  	"start_at" timestamp(3) with time zone,
  	"end_at" timestamp(3) with time zone,
  	"order" numeric DEFAULT 100,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "faqs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar NOT NULL,
  	"answer" varchar NOT NULL,
  	"category" "enum_faqs_category" NOT NULL,
  	"order" numeric DEFAULT 100,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "tutorials" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"discipline_id" integer,
  	"level" "enum_tutorials_level" DEFAULT 'beginner',
  	"cover_id" integer,
  	"provider" "enum_tutorials_provider" DEFAULT 'bilibili',
  	"video_id" varchar,
  	"duration" varchar,
  	"description" varchar,
  	"generate_slug" boolean DEFAULT true,
  	"slug" varchar,
  	"gated" boolean DEFAULT false,
  	"order" numeric DEFAULT 100,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_tutorials_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_tutorials_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_discipline_id" integer,
  	"version_level" "enum__tutorials_v_version_level" DEFAULT 'beginner',
  	"version_cover_id" integer,
  	"version_provider" "enum__tutorials_v_version_provider" DEFAULT 'bilibili',
  	"version_video_id" varchar,
  	"version_duration" varchar,
  	"version_description" varchar,
  	"version_generate_slug" boolean DEFAULT true,
  	"version_slug" varchar,
  	"version_gated" boolean DEFAULT false,
  	"version_order" numeric DEFAULT 100,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__tutorials_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "quiz_questions_options_scores" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"discipline_id" integer NOT NULL,
  	"weight" numeric DEFAULT 1 NOT NULL
  );
  
  CREATE TABLE "quiz_questions_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL
  );
  
  CREATE TABLE "quiz_questions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar NOT NULL,
  	"order" numeric DEFAULT 100,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "pages_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"content" jsonb,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_image_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"title" varchar,
  	"content" jsonb,
  	"image_position" "enum_pages_blocks_image_text_image_position" DEFAULT 'left',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_stats_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"label" varchar,
  	"note" varchar
  );
  
  CREATE TABLE "pages_blocks_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_timeline_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"year" varchar,
  	"title" varchar,
  	"description" varchar
  );
  
  CREATE TABLE "pages_blocks_timeline" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"description" varchar,
  	"button_label" varchar DEFAULT '预约试听',
  	"intent" "enum_pages_blocks_cta_intent" DEFAULT 'trial',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_keywords" varchar,
  	"seo_image_id" integer,
  	"seo_noindex" boolean DEFAULT false,
  	"generate_slug" boolean DEFAULT true,
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_pages_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_pages_v_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"content" jsonb,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_image_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"title" varchar,
  	"content" jsonb,
  	"image_position" "enum__pages_v_blocks_image_text_image_position" DEFAULT 'left',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_stats_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"label" varchar,
  	"note" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_timeline_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"year" varchar,
  	"title" varchar,
  	"description" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_timeline" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"description" varchar,
  	"button_label" varchar DEFAULT '预约试听',
  	"intent" "enum__pages_v_blocks_cta_intent" DEFAULT 'trial',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_seo_keywords" varchar,
  	"version_seo_image_id" integer,
  	"version_seo_noindex" boolean DEFAULT false,
  	"version_generate_slug" boolean DEFAULT true,
  	"version_slug" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__pages_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "leads_follow_ups" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"content" varchar NOT NULL,
  	"author_id" integer,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "leads_status_history" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"from" "enum_leads_status_history_from",
  	"to" "enum_leads_status_history_to",
  	"by_id" integer,
  	"at" timestamp(3) with time zone
  );
  
  CREATE TABLE "leads_webhook_deliveries" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"target" varchar,
  	"status" varchar,
  	"attempts" numeric,
  	"last_error" varchar,
  	"at" timestamp(3) with time zone
  );
  
  CREATE TABLE "leads" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"phone" varchar NOT NULL,
  	"discipline_id" integer,
  	"city" varchar,
  	"intent" "enum_leads_intent" DEFAULT 'trial' NOT NULL,
  	"message" varchar,
  	"source_page_url" varchar,
  	"source_position" varchar,
  	"source_landing_url" varchar,
  	"source_referrer" varchar,
  	"source_utm_source" varchar,
  	"source_utm_medium" varchar,
  	"source_utm_campaign" varchar,
  	"source_utm_term" varchar,
  	"source_utm_content" varchar,
  	"context_course_id" integer,
  	"context_tutorial_id" integer,
  	"context_quiz_result" jsonb,
  	"client_ip" varchar,
  	"client_user_agent" varchar,
  	"consent_agreed" boolean DEFAULT false,
  	"consent_policy_version" varchar,
  	"consent_agreed_at" timestamp(3) with time zone,
  	"status" "enum_leads_status" DEFAULT 'new' NOT NULL,
  	"assigned_to_id" integer,
  	"is_duplicate" boolean DEFAULT false,
  	"duplicate_of_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"role" "enum_users_role" DEFAULT 'editor' NOT NULL,
  	"phone" varchar,
  	"campus_id" integer,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"caption" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumbnail_url" varchar,
  	"sizes_thumbnail_width" numeric,
  	"sizes_thumbnail_height" numeric,
  	"sizes_thumbnail_mime_type" varchar,
  	"sizes_thumbnail_filesize" numeric,
  	"sizes_thumbnail_filename" varchar,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar,
  	"sizes_hero_url" varchar,
  	"sizes_hero_width" numeric,
  	"sizes_hero_height" numeric,
  	"sizes_hero_mime_type" varchar,
  	"sizes_hero_filesize" numeric,
  	"sizes_hero_filename" varchar,
  	"sizes_og_url" varchar,
  	"sizes_og_width" numeric,
  	"sizes_og_height" numeric,
  	"sizes_og_mime_type" varchar,
  	"sizes_og_filesize" numeric,
  	"sizes_og_filename" varchar
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"disciplines_id" integer,
  	"courses_id" integer,
  	"cohorts_id" integer,
  	"software_id" integer,
  	"teachers_id" integer,
  	"works_id" integer,
  	"stories_id" integer,
  	"partners_id" integer,
  	"career_events_id" integer,
  	"articles_id" integer,
  	"article_categories_id" integer,
  	"campuses_id" integer,
  	"banners_id" integer,
  	"faqs_id" integer,
  	"tutorials_id" integer,
  	"quiz_questions_id" integer,
  	"pages_id" integer,
  	"leads_id" integer,
  	"users_id" integer,
  	"media_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "site_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"brand_name" varchar NOT NULL,
  	"short_name" varchar,
  	"brand_description" varchar,
  	"logo_id" integer,
  	"logo_on_dark_id" integer,
  	"hotline" varchar NOT NULL,
  	"work_hours" varchar,
  	"email" varchar,
  	"wechat_id" varchar,
  	"wechat_qr_id" integer,
  	"address" varchar,
  	"icp_number" varchar,
  	"icp_link" varchar DEFAULT 'https://beian.miit.gov.cn/',
  	"psb_number" varchar,
  	"psb_code" varchar,
  	"baidu_tongji_id" varchar,
  	"baidu_site_verification" varchar,
  	"customer_service_enabled" boolean DEFAULT false,
  	"customer_service_script_url" varchar,
  	"customer_service_chat_url" varchar,
  	"title_template" varchar DEFAULT '%s - EduVerse 数艺学院',
  	"default_seo_title" varchar,
  	"default_seo_description" varchar,
  	"default_seo_keywords" varchar,
  	"default_seo_image_id" integer,
  	"salary_disclaimer" varchar DEFAULT '以上薪资数据仅供参考，不作为培训效果承诺。实际收入因个人能力、城市与企业而异。' NOT NULL,
  	"show_stories" boolean DEFAULT true,
  	"privacy_policy_version" varchar DEFAULT '2026-11-20' NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "navigation_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"type" "enum_navigation_items_type" DEFAULT 'link' NOT NULL,
  	"href" varchar
  );
  
  CREATE TABLE "navigation" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"cta_label" varchar DEFAULT '预约试听',
  	"show_search" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "footer_columns_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"href" varchar NOT NULL
  );
  
  CREATE TABLE "footer_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL
  );
  
  CREATE TABLE "footer_qrcodes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"image_id" integer NOT NULL
  );
  
  CREATE TABLE "footer_bottom_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"href" varchar NOT NULL
  );
  
  CREATE TABLE "footer" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"copyright" varchar DEFAULT '© {year} EduVerse 数艺学院',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "home_page_quick_entries_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar,
  	"action" "enum_home_page_quick_entries_items_action" DEFAULT 'link' NOT NULL,
  	"href" varchar,
  	"image_id" integer
  );
  
  CREATE TABLE "home_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"hero_autoplay" boolean DEFAULT true,
  	"hero_interval" numeric DEFAULT 6,
  	"quick_entries_enabled" boolean DEFAULT true,
  	"quick_entries_eyebrow" varchar DEFAULT 'Start Here',
  	"quick_entries_title" varchar DEFAULT '快速了解' NOT NULL,
  	"quick_entries_description" varchar,
  	"hot_disciplines_enabled" boolean DEFAULT true,
  	"hot_disciplines_eyebrow" varchar DEFAULT 'Majors',
  	"hot_disciplines_title" varchar DEFAULT '热门专业' NOT NULL,
  	"hot_disciplines_description" varchar,
  	"featured_works_enabled" boolean DEFAULT true,
  	"featured_works_eyebrow" varchar DEFAULT 'Student Works',
  	"featured_works_title" varchar DEFAULT '学员作品' NOT NULL,
  	"featured_works_description" varchar,
  	"featured_works_mode" "enum_home_page_featured_works_mode" DEFAULT 'auto' NOT NULL,
  	"featured_works_limit" numeric DEFAULT 12,
  	"stories_enabled" boolean DEFAULT true,
  	"stories_eyebrow" varchar DEFAULT 'Stories',
  	"stories_title" varchar DEFAULT '学员故事' NOT NULL,
  	"stories_description" varchar,
  	"teachers_enabled" boolean DEFAULT true,
  	"teachers_eyebrow" varchar DEFAULT 'Mentors',
  	"teachers_title" varchar DEFAULT '师资团队' NOT NULL,
  	"teachers_description" varchar,
  	"campuses_enabled" boolean DEFAULT true,
  	"campuses_eyebrow" varchar DEFAULT 'Campuses',
  	"campuses_title" varchar DEFAULT '校区分布' NOT NULL,
  	"campuses_description" varchar,
  	"partners_enabled" boolean DEFAULT true,
  	"partners_eyebrow" varchar DEFAULT 'Partners',
  	"partners_title" varchar DEFAULT '合作企业' NOT NULL,
  	"partners_description" varchar,
  	"articles_enabled" boolean DEFAULT true,
  	"articles_eyebrow" varchar DEFAULT 'News',
  	"articles_title" varchar DEFAULT '最新资讯' NOT NULL,
  	"articles_description" varchar,
  	"articles_limit" numeric DEFAULT 6,
  	"lead_form_enabled" boolean DEFAULT true,
  	"lead_form_eyebrow" varchar DEFAULT 'Free Trial',
  	"lead_form_title" varchar DEFAULT '预约一节免费试听课' NOT NULL,
  	"lead_form_description" varchar,
  	"lead_form_submit_label" varchar DEFAULT '立即预约',
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_keywords" varchar,
  	"seo_image_id" integer,
  	"seo_noindex" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "home_page_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"disciplines_id" integer,
  	"works_id" integer,
  	"stories_id" integer,
  	"teachers_id" integer
  );
  
  CREATE TABLE "careers_page_process_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar
  );
  
  CREATE TABLE "careers_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"intro_eyebrow" varchar DEFAULT 'Career Services',
  	"intro_title" varchar DEFAULT '就业服务' NOT NULL,
  	"intro_description" varchar,
  	"process_enabled" boolean DEFAULT true,
  	"process_eyebrow" varchar DEFAULT 'Process',
  	"process_title" varchar DEFAULT '就业服务流程' NOT NULL,
  	"process_description" varchar,
  	"stories_enabled" boolean DEFAULT true,
  	"stories_eyebrow" varchar DEFAULT 'Stories',
  	"stories_title" varchar DEFAULT '学员故事' NOT NULL,
  	"stories_description" varchar,
  	"partners_enabled" boolean DEFAULT true,
  	"partners_eyebrow" varchar DEFAULT 'Partners',
  	"partners_title" varchar DEFAULT '合作企业' NOT NULL,
  	"partners_description" varchar,
  	"events_enabled" boolean DEFAULT true,
  	"events_eyebrow" varchar DEFAULT 'Events',
  	"events_title" varchar DEFAULT '招聘活动' NOT NULL,
  	"events_description" varchar,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_keywords" varchar,
  	"seo_image_id" integer,
  	"seo_noindex" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "quiz_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"intro_title" varchar DEFAULT '找到适合你的数字艺术方向' NOT NULL,
  	"intro_description" varchar,
  	"intro_start_label" varchar DEFAULT '开始测试' NOT NULL,
  	"result_summary_title" varchar DEFAULT '你的推荐方向' NOT NULL,
  	"result_gated_title" varchar DEFAULT '获取完整报告' NOT NULL,
  	"result_gated_description" varchar,
  	"result_unlock_label" varchar DEFAULT '留下联系方式查看完整报告' NOT NULL,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_keywords" varchar,
  	"seo_image_id" integer,
  	"seo_noindex" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "lead_settings_webhooks" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"platform" "enum_lead_settings_webhooks_platform" DEFAULT 'wecom' NOT NULL,
  	"url" varchar NOT NULL,
  	"secret" varchar,
  	"enabled" boolean DEFAULT true,
  	"mask_phone" boolean DEFAULT true
  );
  
  CREATE TABLE "lead_settings_city_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL
  );
  
  CREATE TABLE "lead_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"rate_limits_ip_per10_min" numeric DEFAULT 5 NOT NULL,
  	"rate_limits_ip_per_day" numeric DEFAULT 30 NOT NULL,
  	"rate_limits_phone_per_day" numeric DEFAULT 3 NOT NULL,
  	"rate_limits_duplicate_window_days" numeric DEFAULT 30 NOT NULL,
  	"rate_limits_min_fill_seconds" numeric DEFAULT 2 NOT NULL,
  	"success_title" varchar DEFAULT '提交成功' NOT NULL,
  	"success_message" varchar DEFAULT '课程顾问会在 1 个工作日内与你联系。你也可以添加微信，先领取课程资料。' NOT NULL,
  	"wechat_qr_id" integer,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "disciplines_career_directions" ADD CONSTRAINT "disciplines_career_directions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."disciplines"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "disciplines" ADD CONSTRAINT "disciplines_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "disciplines" ADD CONSTRAINT "disciplines_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_disciplines_v_version_career_directions" ADD CONSTRAINT "_disciplines_v_version_career_directions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_disciplines_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_disciplines_v" ADD CONSTRAINT "_disciplines_v_parent_id_disciplines_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."disciplines"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_disciplines_v" ADD CONSTRAINT "_disciplines_v_version_cover_id_media_id_fk" FOREIGN KEY ("version_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_disciplines_v" ADD CONSTRAINT "_disciplines_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "courses_delivery_modes" ADD CONSTRAINT "courses_delivery_modes_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "courses_highlights" ADD CONSTRAINT "courses_highlights_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "courses_audience" ADD CONSTRAINT "courses_audience_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "courses_stages_topics" ADD CONSTRAINT "courses_stages_topics_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."courses_stages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "courses_stages" ADD CONSTRAINT "courses_stages_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "courses_projects" ADD CONSTRAINT "courses_projects_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "courses_projects" ADD CONSTRAINT "courses_projects_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "courses_career_directions" ADD CONSTRAINT "courses_career_directions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "courses" ADD CONSTRAINT "courses_discipline_id_disciplines_id_fk" FOREIGN KEY ("discipline_id") REFERENCES "public"."disciplines"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "courses" ADD CONSTRAINT "courses_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "courses" ADD CONSTRAINT "courses_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "courses_rels" ADD CONSTRAINT "courses_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "courses_rels" ADD CONSTRAINT "courses_rels_campuses_fk" FOREIGN KEY ("campuses_id") REFERENCES "public"."campuses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "courses_rels" ADD CONSTRAINT "courses_rels_software_fk" FOREIGN KEY ("software_id") REFERENCES "public"."software"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "courses_rels" ADD CONSTRAINT "courses_rels_teachers_fk" FOREIGN KEY ("teachers_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "courses_rels" ADD CONSTRAINT "courses_rels_faqs_fk" FOREIGN KEY ("faqs_id") REFERENCES "public"."faqs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_courses_v_version_delivery_modes" ADD CONSTRAINT "_courses_v_version_delivery_modes_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_courses_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_courses_v_version_highlights" ADD CONSTRAINT "_courses_v_version_highlights_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_courses_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_courses_v_version_audience" ADD CONSTRAINT "_courses_v_version_audience_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_courses_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_courses_v_version_stages_topics" ADD CONSTRAINT "_courses_v_version_stages_topics_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_courses_v_version_stages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_courses_v_version_stages" ADD CONSTRAINT "_courses_v_version_stages_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_courses_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_courses_v_version_projects" ADD CONSTRAINT "_courses_v_version_projects_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_courses_v_version_projects" ADD CONSTRAINT "_courses_v_version_projects_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_courses_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_courses_v_version_career_directions" ADD CONSTRAINT "_courses_v_version_career_directions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_courses_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_courses_v" ADD CONSTRAINT "_courses_v_parent_id_courses_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_courses_v" ADD CONSTRAINT "_courses_v_version_discipline_id_disciplines_id_fk" FOREIGN KEY ("version_discipline_id") REFERENCES "public"."disciplines"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_courses_v" ADD CONSTRAINT "_courses_v_version_cover_id_media_id_fk" FOREIGN KEY ("version_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_courses_v" ADD CONSTRAINT "_courses_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_courses_v_rels" ADD CONSTRAINT "_courses_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_courses_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_courses_v_rels" ADD CONSTRAINT "_courses_v_rels_campuses_fk" FOREIGN KEY ("campuses_id") REFERENCES "public"."campuses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_courses_v_rels" ADD CONSTRAINT "_courses_v_rels_software_fk" FOREIGN KEY ("software_id") REFERENCES "public"."software"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_courses_v_rels" ADD CONSTRAINT "_courses_v_rels_teachers_fk" FOREIGN KEY ("teachers_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_courses_v_rels" ADD CONSTRAINT "_courses_v_rels_faqs_fk" FOREIGN KEY ("faqs_id") REFERENCES "public"."faqs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cohorts" ADD CONSTRAINT "cohorts_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cohorts" ADD CONSTRAINT "cohorts_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "teachers_specialties" ADD CONSTRAINT "teachers_specialties_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "teachers_experience" ADD CONSTRAINT "teachers_experience_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "teachers" ADD CONSTRAINT "teachers_avatar_id_media_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "teachers" ADD CONSTRAINT "teachers_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "teachers" ADD CONSTRAINT "teachers_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "teachers_rels" ADD CONSTRAINT "teachers_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "teachers_rels" ADD CONSTRAINT "teachers_rels_disciplines_fk" FOREIGN KEY ("disciplines_id") REFERENCES "public"."disciplines"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_teachers_v_version_specialties" ADD CONSTRAINT "_teachers_v_version_specialties_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_teachers_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_teachers_v_version_experience" ADD CONSTRAINT "_teachers_v_version_experience_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_teachers_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_teachers_v" ADD CONSTRAINT "_teachers_v_parent_id_teachers_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."teachers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_teachers_v" ADD CONSTRAINT "_teachers_v_version_avatar_id_media_id_fk" FOREIGN KEY ("version_avatar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_teachers_v" ADD CONSTRAINT "_teachers_v_version_campus_id_campuses_id_fk" FOREIGN KEY ("version_campus_id") REFERENCES "public"."campuses"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_teachers_v" ADD CONSTRAINT "_teachers_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_teachers_v_rels" ADD CONSTRAINT "_teachers_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_teachers_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_teachers_v_rels" ADD CONSTRAINT "_teachers_v_rels_disciplines_fk" FOREIGN KEY ("disciplines_id") REFERENCES "public"."disciplines"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "works_gallery" ADD CONSTRAINT "works_gallery_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "works_gallery" ADD CONSTRAINT "works_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "works" ADD CONSTRAINT "works_discipline_id_disciplines_id_fk" FOREIGN KEY ("discipline_id") REFERENCES "public"."disciplines"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "works" ADD CONSTRAINT "works_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "works" ADD CONSTRAINT "works_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "works" ADD CONSTRAINT "works_video_file_id_media_id_fk" FOREIGN KEY ("video_file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "works" ADD CONSTRAINT "works_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "works_rels" ADD CONSTRAINT "works_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "works_rels" ADD CONSTRAINT "works_rels_software_fk" FOREIGN KEY ("software_id") REFERENCES "public"."software"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_works_v_version_gallery" ADD CONSTRAINT "_works_v_version_gallery_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_works_v_version_gallery" ADD CONSTRAINT "_works_v_version_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_works_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_works_v" ADD CONSTRAINT "_works_v_parent_id_works_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."works"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_works_v" ADD CONSTRAINT "_works_v_version_discipline_id_disciplines_id_fk" FOREIGN KEY ("version_discipline_id") REFERENCES "public"."disciplines"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_works_v" ADD CONSTRAINT "_works_v_version_course_id_courses_id_fk" FOREIGN KEY ("version_course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_works_v" ADD CONSTRAINT "_works_v_version_cover_id_media_id_fk" FOREIGN KEY ("version_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_works_v" ADD CONSTRAINT "_works_v_version_video_file_id_media_id_fk" FOREIGN KEY ("version_video_file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_works_v" ADD CONSTRAINT "_works_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_works_v_rels" ADD CONSTRAINT "_works_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_works_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_works_v_rels" ADD CONSTRAINT "_works_v_rels_software_fk" FOREIGN KEY ("software_id") REFERENCES "public"."software"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "stories" ADD CONSTRAINT "stories_avatar_id_media_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stories" ADD CONSTRAINT "stories_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stories" ADD CONSTRAINT "stories_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stories_rels" ADD CONSTRAINT "stories_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "stories_rels" ADD CONSTRAINT "stories_rels_works_fk" FOREIGN KEY ("works_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_stories_v" ADD CONSTRAINT "_stories_v_parent_id_stories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."stories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_stories_v" ADD CONSTRAINT "_stories_v_version_avatar_id_media_id_fk" FOREIGN KEY ("version_avatar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_stories_v" ADD CONSTRAINT "_stories_v_version_course_id_courses_id_fk" FOREIGN KEY ("version_course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_stories_v" ADD CONSTRAINT "_stories_v_version_partner_id_partners_id_fk" FOREIGN KEY ("version_partner_id") REFERENCES "public"."partners"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_stories_v_rels" ADD CONSTRAINT "_stories_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_stories_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_stories_v_rels" ADD CONSTRAINT "_stories_v_rels_works_fk" FOREIGN KEY ("works_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "partners" ADD CONSTRAINT "partners_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "career_events" ADD CONSTRAINT "career_events_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "career_events" ADD CONSTRAINT "career_events_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_category_id_article_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."article_categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles_rels" ADD CONSTRAINT "articles_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_rels" ADD CONSTRAINT "articles_rels_courses_fk" FOREIGN KEY ("courses_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_parent_id_articles_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_category_id_article_categories_id_fk" FOREIGN KEY ("version_category_id") REFERENCES "public"."article_categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_cover_id_media_id_fk" FOREIGN KEY ("version_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v_rels" ADD CONSTRAINT "_articles_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v_rels" ADD CONSTRAINT "_articles_v_rels_courses_fk" FOREIGN KEY ("courses_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "campuses_photos" ADD CONSTRAINT "campuses_photos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "campuses_photos" ADD CONSTRAINT "campuses_photos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."campuses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "campuses" ADD CONSTRAINT "campuses_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "campuses" ADD CONSTRAINT "campuses_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_campuses_v_version_photos" ADD CONSTRAINT "_campuses_v_version_photos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_campuses_v_version_photos" ADD CONSTRAINT "_campuses_v_version_photos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_campuses_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_campuses_v" ADD CONSTRAINT "_campuses_v_parent_id_campuses_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."campuses"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_campuses_v" ADD CONSTRAINT "_campuses_v_version_cover_id_media_id_fk" FOREIGN KEY ("version_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_campuses_v" ADD CONSTRAINT "_campuses_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "banners" ADD CONSTRAINT "banners_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "banners" ADD CONSTRAINT "banners_mobile_image_id_media_id_fk" FOREIGN KEY ("mobile_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tutorials" ADD CONSTRAINT "tutorials_discipline_id_disciplines_id_fk" FOREIGN KEY ("discipline_id") REFERENCES "public"."disciplines"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tutorials" ADD CONSTRAINT "tutorials_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tutorials_v" ADD CONSTRAINT "_tutorials_v_parent_id_tutorials_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tutorials"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tutorials_v" ADD CONSTRAINT "_tutorials_v_version_discipline_id_disciplines_id_fk" FOREIGN KEY ("version_discipline_id") REFERENCES "public"."disciplines"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tutorials_v" ADD CONSTRAINT "_tutorials_v_version_cover_id_media_id_fk" FOREIGN KEY ("version_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "quiz_questions_options_scores" ADD CONSTRAINT "quiz_questions_options_scores_discipline_id_disciplines_id_fk" FOREIGN KEY ("discipline_id") REFERENCES "public"."disciplines"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "quiz_questions_options_scores" ADD CONSTRAINT "quiz_questions_options_scores_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quiz_questions_options"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "quiz_questions_options" ADD CONSTRAINT "quiz_questions_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quiz_questions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_rich_text" ADD CONSTRAINT "pages_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_image_text" ADD CONSTRAINT "pages_blocks_image_text_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_image_text" ADD CONSTRAINT "pages_blocks_image_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_stats_items" ADD CONSTRAINT "pages_blocks_stats_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_stats" ADD CONSTRAINT "pages_blocks_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_timeline_items" ADD CONSTRAINT "pages_blocks_timeline_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_timeline"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_timeline" ADD CONSTRAINT "pages_blocks_timeline_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_cta" ADD CONSTRAINT "pages_blocks_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_rich_text" ADD CONSTRAINT "_pages_v_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_image_text" ADD CONSTRAINT "_pages_v_blocks_image_text_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_image_text" ADD CONSTRAINT "_pages_v_blocks_image_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_stats_items" ADD CONSTRAINT "_pages_v_blocks_stats_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_stats" ADD CONSTRAINT "_pages_v_blocks_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_timeline_items" ADD CONSTRAINT "_pages_v_blocks_timeline_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_timeline"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_timeline" ADD CONSTRAINT "_pages_v_blocks_timeline_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_cta" ADD CONSTRAINT "_pages_v_blocks_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_parent_id_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "leads_follow_ups" ADD CONSTRAINT "leads_follow_ups_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "leads_follow_ups" ADD CONSTRAINT "leads_follow_ups_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "leads_status_history" ADD CONSTRAINT "leads_status_history_by_id_users_id_fk" FOREIGN KEY ("by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "leads_status_history" ADD CONSTRAINT "leads_status_history_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "leads_webhook_deliveries" ADD CONSTRAINT "leads_webhook_deliveries_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "leads" ADD CONSTRAINT "leads_discipline_id_disciplines_id_fk" FOREIGN KEY ("discipline_id") REFERENCES "public"."disciplines"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "leads" ADD CONSTRAINT "leads_context_course_id_courses_id_fk" FOREIGN KEY ("context_course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "leads" ADD CONSTRAINT "leads_context_tutorial_id_tutorials_id_fk" FOREIGN KEY ("context_tutorial_id") REFERENCES "public"."tutorials"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "leads" ADD CONSTRAINT "leads_duplicate_of_id_leads_id_fk" FOREIGN KEY ("duplicate_of_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users" ADD CONSTRAINT "users_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_disciplines_fk" FOREIGN KEY ("disciplines_id") REFERENCES "public"."disciplines"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_courses_fk" FOREIGN KEY ("courses_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_cohorts_fk" FOREIGN KEY ("cohorts_id") REFERENCES "public"."cohorts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_software_fk" FOREIGN KEY ("software_id") REFERENCES "public"."software"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_teachers_fk" FOREIGN KEY ("teachers_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_works_fk" FOREIGN KEY ("works_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_stories_fk" FOREIGN KEY ("stories_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_partners_fk" FOREIGN KEY ("partners_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_career_events_fk" FOREIGN KEY ("career_events_id") REFERENCES "public"."career_events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_article_categories_fk" FOREIGN KEY ("article_categories_id") REFERENCES "public"."article_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_campuses_fk" FOREIGN KEY ("campuses_id") REFERENCES "public"."campuses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_banners_fk" FOREIGN KEY ("banners_id") REFERENCES "public"."banners"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_faqs_fk" FOREIGN KEY ("faqs_id") REFERENCES "public"."faqs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tutorials_fk" FOREIGN KEY ("tutorials_id") REFERENCES "public"."tutorials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_quiz_questions_fk" FOREIGN KEY ("quiz_questions_id") REFERENCES "public"."quiz_questions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_leads_fk" FOREIGN KEY ("leads_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_logo_on_dark_id_media_id_fk" FOREIGN KEY ("logo_on_dark_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_wechat_qr_id_media_id_fk" FOREIGN KEY ("wechat_qr_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_default_seo_image_id_media_id_fk" FOREIGN KEY ("default_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "navigation_items" ADD CONSTRAINT "navigation_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer_columns_links" ADD CONSTRAINT "footer_columns_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."footer_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer_columns" ADD CONSTRAINT "footer_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer_qrcodes" ADD CONSTRAINT "footer_qrcodes_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "footer_qrcodes" ADD CONSTRAINT "footer_qrcodes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer_bottom_links" ADD CONSTRAINT "footer_bottom_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_quick_entries_items" ADD CONSTRAINT "home_page_quick_entries_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_page_quick_entries_items" ADD CONSTRAINT "home_page_quick_entries_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page" ADD CONSTRAINT "home_page_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_page_rels" ADD CONSTRAINT "home_page_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."home_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_rels" ADD CONSTRAINT "home_page_rels_disciplines_fk" FOREIGN KEY ("disciplines_id") REFERENCES "public"."disciplines"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_rels" ADD CONSTRAINT "home_page_rels_works_fk" FOREIGN KEY ("works_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_rels" ADD CONSTRAINT "home_page_rels_stories_fk" FOREIGN KEY ("stories_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_rels" ADD CONSTRAINT "home_page_rels_teachers_fk" FOREIGN KEY ("teachers_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "careers_page_process_steps" ADD CONSTRAINT "careers_page_process_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."careers_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "careers_page" ADD CONSTRAINT "careers_page_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "quiz_settings" ADD CONSTRAINT "quiz_settings_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "lead_settings_webhooks" ADD CONSTRAINT "lead_settings_webhooks_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."lead_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "lead_settings_city_options" ADD CONSTRAINT "lead_settings_city_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."lead_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "lead_settings" ADD CONSTRAINT "lead_settings_wechat_qr_id_media_id_fk" FOREIGN KEY ("wechat_qr_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "disciplines_career_directions_order_idx" ON "disciplines_career_directions" USING btree ("_order");
  CREATE INDEX "disciplines_career_directions_parent_id_idx" ON "disciplines_career_directions" USING btree ("_parent_id");
  CREATE INDEX "disciplines_cover_idx" ON "disciplines" USING btree ("cover_id");
  CREATE INDEX "disciplines_seo_seo_image_idx" ON "disciplines" USING btree ("seo_image_id");
  CREATE UNIQUE INDEX "disciplines_slug_idx" ON "disciplines" USING btree ("slug");
  CREATE INDEX "disciplines_updated_at_idx" ON "disciplines" USING btree ("updated_at");
  CREATE INDEX "disciplines_created_at_idx" ON "disciplines" USING btree ("created_at");
  CREATE INDEX "disciplines__status_idx" ON "disciplines" USING btree ("_status");
  CREATE INDEX "_disciplines_v_version_career_directions_order_idx" ON "_disciplines_v_version_career_directions" USING btree ("_order");
  CREATE INDEX "_disciplines_v_version_career_directions_parent_id_idx" ON "_disciplines_v_version_career_directions" USING btree ("_parent_id");
  CREATE INDEX "_disciplines_v_parent_idx" ON "_disciplines_v" USING btree ("parent_id");
  CREATE INDEX "_disciplines_v_version_version_cover_idx" ON "_disciplines_v" USING btree ("version_cover_id");
  CREATE INDEX "_disciplines_v_version_seo_version_seo_image_idx" ON "_disciplines_v" USING btree ("version_seo_image_id");
  CREATE INDEX "_disciplines_v_version_version_slug_idx" ON "_disciplines_v" USING btree ("version_slug");
  CREATE INDEX "_disciplines_v_version_version_updated_at_idx" ON "_disciplines_v" USING btree ("version_updated_at");
  CREATE INDEX "_disciplines_v_version_version_created_at_idx" ON "_disciplines_v" USING btree ("version_created_at");
  CREATE INDEX "_disciplines_v_version_version__status_idx" ON "_disciplines_v" USING btree ("version__status");
  CREATE INDEX "_disciplines_v_created_at_idx" ON "_disciplines_v" USING btree ("created_at");
  CREATE INDEX "_disciplines_v_updated_at_idx" ON "_disciplines_v" USING btree ("updated_at");
  CREATE INDEX "_disciplines_v_latest_idx" ON "_disciplines_v" USING btree ("latest");
  CREATE INDEX "courses_delivery_modes_order_idx" ON "courses_delivery_modes" USING btree ("order");
  CREATE INDEX "courses_delivery_modes_parent_idx" ON "courses_delivery_modes" USING btree ("parent_id");
  CREATE INDEX "courses_highlights_order_idx" ON "courses_highlights" USING btree ("_order");
  CREATE INDEX "courses_highlights_parent_id_idx" ON "courses_highlights" USING btree ("_parent_id");
  CREATE INDEX "courses_audience_order_idx" ON "courses_audience" USING btree ("_order");
  CREATE INDEX "courses_audience_parent_id_idx" ON "courses_audience" USING btree ("_parent_id");
  CREATE INDEX "courses_stages_topics_order_idx" ON "courses_stages_topics" USING btree ("_order");
  CREATE INDEX "courses_stages_topics_parent_id_idx" ON "courses_stages_topics" USING btree ("_parent_id");
  CREATE INDEX "courses_stages_order_idx" ON "courses_stages" USING btree ("_order");
  CREATE INDEX "courses_stages_parent_id_idx" ON "courses_stages" USING btree ("_parent_id");
  CREATE INDEX "courses_projects_order_idx" ON "courses_projects" USING btree ("_order");
  CREATE INDEX "courses_projects_parent_id_idx" ON "courses_projects" USING btree ("_parent_id");
  CREATE INDEX "courses_projects_image_idx" ON "courses_projects" USING btree ("image_id");
  CREATE INDEX "courses_career_directions_order_idx" ON "courses_career_directions" USING btree ("_order");
  CREATE INDEX "courses_career_directions_parent_id_idx" ON "courses_career_directions" USING btree ("_parent_id");
  CREATE INDEX "courses_discipline_idx" ON "courses" USING btree ("discipline_id");
  CREATE INDEX "courses_cover_idx" ON "courses" USING btree ("cover_id");
  CREATE INDEX "courses_seo_seo_image_idx" ON "courses" USING btree ("seo_image_id");
  CREATE UNIQUE INDEX "courses_slug_idx" ON "courses" USING btree ("slug");
  CREATE INDEX "courses_updated_at_idx" ON "courses" USING btree ("updated_at");
  CREATE INDEX "courses_created_at_idx" ON "courses" USING btree ("created_at");
  CREATE INDEX "courses__status_idx" ON "courses" USING btree ("_status");
  CREATE INDEX "courses_rels_order_idx" ON "courses_rels" USING btree ("order");
  CREATE INDEX "courses_rels_parent_idx" ON "courses_rels" USING btree ("parent_id");
  CREATE INDEX "courses_rels_path_idx" ON "courses_rels" USING btree ("path");
  CREATE INDEX "courses_rels_campuses_id_idx" ON "courses_rels" USING btree ("campuses_id");
  CREATE INDEX "courses_rels_software_id_idx" ON "courses_rels" USING btree ("software_id");
  CREATE INDEX "courses_rels_teachers_id_idx" ON "courses_rels" USING btree ("teachers_id");
  CREATE INDEX "courses_rels_faqs_id_idx" ON "courses_rels" USING btree ("faqs_id");
  CREATE INDEX "_courses_v_version_delivery_modes_order_idx" ON "_courses_v_version_delivery_modes" USING btree ("order");
  CREATE INDEX "_courses_v_version_delivery_modes_parent_idx" ON "_courses_v_version_delivery_modes" USING btree ("parent_id");
  CREATE INDEX "_courses_v_version_highlights_order_idx" ON "_courses_v_version_highlights" USING btree ("_order");
  CREATE INDEX "_courses_v_version_highlights_parent_id_idx" ON "_courses_v_version_highlights" USING btree ("_parent_id");
  CREATE INDEX "_courses_v_version_audience_order_idx" ON "_courses_v_version_audience" USING btree ("_order");
  CREATE INDEX "_courses_v_version_audience_parent_id_idx" ON "_courses_v_version_audience" USING btree ("_parent_id");
  CREATE INDEX "_courses_v_version_stages_topics_order_idx" ON "_courses_v_version_stages_topics" USING btree ("_order");
  CREATE INDEX "_courses_v_version_stages_topics_parent_id_idx" ON "_courses_v_version_stages_topics" USING btree ("_parent_id");
  CREATE INDEX "_courses_v_version_stages_order_idx" ON "_courses_v_version_stages" USING btree ("_order");
  CREATE INDEX "_courses_v_version_stages_parent_id_idx" ON "_courses_v_version_stages" USING btree ("_parent_id");
  CREATE INDEX "_courses_v_version_projects_order_idx" ON "_courses_v_version_projects" USING btree ("_order");
  CREATE INDEX "_courses_v_version_projects_parent_id_idx" ON "_courses_v_version_projects" USING btree ("_parent_id");
  CREATE INDEX "_courses_v_version_projects_image_idx" ON "_courses_v_version_projects" USING btree ("image_id");
  CREATE INDEX "_courses_v_version_career_directions_order_idx" ON "_courses_v_version_career_directions" USING btree ("_order");
  CREATE INDEX "_courses_v_version_career_directions_parent_id_idx" ON "_courses_v_version_career_directions" USING btree ("_parent_id");
  CREATE INDEX "_courses_v_parent_idx" ON "_courses_v" USING btree ("parent_id");
  CREATE INDEX "_courses_v_version_version_discipline_idx" ON "_courses_v" USING btree ("version_discipline_id");
  CREATE INDEX "_courses_v_version_version_cover_idx" ON "_courses_v" USING btree ("version_cover_id");
  CREATE INDEX "_courses_v_version_seo_version_seo_image_idx" ON "_courses_v" USING btree ("version_seo_image_id");
  CREATE INDEX "_courses_v_version_version_slug_idx" ON "_courses_v" USING btree ("version_slug");
  CREATE INDEX "_courses_v_version_version_updated_at_idx" ON "_courses_v" USING btree ("version_updated_at");
  CREATE INDEX "_courses_v_version_version_created_at_idx" ON "_courses_v" USING btree ("version_created_at");
  CREATE INDEX "_courses_v_version_version__status_idx" ON "_courses_v" USING btree ("version__status");
  CREATE INDEX "_courses_v_created_at_idx" ON "_courses_v" USING btree ("created_at");
  CREATE INDEX "_courses_v_updated_at_idx" ON "_courses_v" USING btree ("updated_at");
  CREATE INDEX "_courses_v_latest_idx" ON "_courses_v" USING btree ("latest");
  CREATE INDEX "_courses_v_rels_order_idx" ON "_courses_v_rels" USING btree ("order");
  CREATE INDEX "_courses_v_rels_parent_idx" ON "_courses_v_rels" USING btree ("parent_id");
  CREATE INDEX "_courses_v_rels_path_idx" ON "_courses_v_rels" USING btree ("path");
  CREATE INDEX "_courses_v_rels_campuses_id_idx" ON "_courses_v_rels" USING btree ("campuses_id");
  CREATE INDEX "_courses_v_rels_software_id_idx" ON "_courses_v_rels" USING btree ("software_id");
  CREATE INDEX "_courses_v_rels_teachers_id_idx" ON "_courses_v_rels" USING btree ("teachers_id");
  CREATE INDEX "_courses_v_rels_faqs_id_idx" ON "_courses_v_rels" USING btree ("faqs_id");
  CREATE INDEX "cohorts_course_idx" ON "cohorts" USING btree ("course_id");
  CREATE INDEX "cohorts_campus_idx" ON "cohorts" USING btree ("campus_id");
  CREATE INDEX "cohorts_start_date_idx" ON "cohorts" USING btree ("start_date");
  CREATE INDEX "cohorts_updated_at_idx" ON "cohorts" USING btree ("updated_at");
  CREATE INDEX "cohorts_created_at_idx" ON "cohorts" USING btree ("created_at");
  CREATE UNIQUE INDEX "software_slug_idx" ON "software" USING btree ("slug");
  CREATE INDEX "software_updated_at_idx" ON "software" USING btree ("updated_at");
  CREATE INDEX "software_created_at_idx" ON "software" USING btree ("created_at");
  CREATE INDEX "teachers_specialties_order_idx" ON "teachers_specialties" USING btree ("_order");
  CREATE INDEX "teachers_specialties_parent_id_idx" ON "teachers_specialties" USING btree ("_parent_id");
  CREATE INDEX "teachers_experience_order_idx" ON "teachers_experience" USING btree ("_order");
  CREATE INDEX "teachers_experience_parent_id_idx" ON "teachers_experience" USING btree ("_parent_id");
  CREATE INDEX "teachers_avatar_idx" ON "teachers" USING btree ("avatar_id");
  CREATE INDEX "teachers_campus_idx" ON "teachers" USING btree ("campus_id");
  CREATE INDEX "teachers_seo_seo_image_idx" ON "teachers" USING btree ("seo_image_id");
  CREATE UNIQUE INDEX "teachers_slug_idx" ON "teachers" USING btree ("slug");
  CREATE INDEX "teachers_updated_at_idx" ON "teachers" USING btree ("updated_at");
  CREATE INDEX "teachers_created_at_idx" ON "teachers" USING btree ("created_at");
  CREATE INDEX "teachers__status_idx" ON "teachers" USING btree ("_status");
  CREATE INDEX "teachers_rels_order_idx" ON "teachers_rels" USING btree ("order");
  CREATE INDEX "teachers_rels_parent_idx" ON "teachers_rels" USING btree ("parent_id");
  CREATE INDEX "teachers_rels_path_idx" ON "teachers_rels" USING btree ("path");
  CREATE INDEX "teachers_rels_disciplines_id_idx" ON "teachers_rels" USING btree ("disciplines_id");
  CREATE INDEX "_teachers_v_version_specialties_order_idx" ON "_teachers_v_version_specialties" USING btree ("_order");
  CREATE INDEX "_teachers_v_version_specialties_parent_id_idx" ON "_teachers_v_version_specialties" USING btree ("_parent_id");
  CREATE INDEX "_teachers_v_version_experience_order_idx" ON "_teachers_v_version_experience" USING btree ("_order");
  CREATE INDEX "_teachers_v_version_experience_parent_id_idx" ON "_teachers_v_version_experience" USING btree ("_parent_id");
  CREATE INDEX "_teachers_v_parent_idx" ON "_teachers_v" USING btree ("parent_id");
  CREATE INDEX "_teachers_v_version_version_avatar_idx" ON "_teachers_v" USING btree ("version_avatar_id");
  CREATE INDEX "_teachers_v_version_version_campus_idx" ON "_teachers_v" USING btree ("version_campus_id");
  CREATE INDEX "_teachers_v_version_seo_version_seo_image_idx" ON "_teachers_v" USING btree ("version_seo_image_id");
  CREATE INDEX "_teachers_v_version_version_slug_idx" ON "_teachers_v" USING btree ("version_slug");
  CREATE INDEX "_teachers_v_version_version_updated_at_idx" ON "_teachers_v" USING btree ("version_updated_at");
  CREATE INDEX "_teachers_v_version_version_created_at_idx" ON "_teachers_v" USING btree ("version_created_at");
  CREATE INDEX "_teachers_v_version_version__status_idx" ON "_teachers_v" USING btree ("version__status");
  CREATE INDEX "_teachers_v_created_at_idx" ON "_teachers_v" USING btree ("created_at");
  CREATE INDEX "_teachers_v_updated_at_idx" ON "_teachers_v" USING btree ("updated_at");
  CREATE INDEX "_teachers_v_latest_idx" ON "_teachers_v" USING btree ("latest");
  CREATE INDEX "_teachers_v_rels_order_idx" ON "_teachers_v_rels" USING btree ("order");
  CREATE INDEX "_teachers_v_rels_parent_idx" ON "_teachers_v_rels" USING btree ("parent_id");
  CREATE INDEX "_teachers_v_rels_path_idx" ON "_teachers_v_rels" USING btree ("path");
  CREATE INDEX "_teachers_v_rels_disciplines_id_idx" ON "_teachers_v_rels" USING btree ("disciplines_id");
  CREATE INDEX "works_gallery_order_idx" ON "works_gallery" USING btree ("_order");
  CREATE INDEX "works_gallery_parent_id_idx" ON "works_gallery" USING btree ("_parent_id");
  CREATE INDEX "works_gallery_image_idx" ON "works_gallery" USING btree ("image_id");
  CREATE INDEX "works_discipline_idx" ON "works" USING btree ("discipline_id");
  CREATE INDEX "works_course_idx" ON "works" USING btree ("course_id");
  CREATE INDEX "works_cover_idx" ON "works" USING btree ("cover_id");
  CREATE INDEX "works_video_video_file_idx" ON "works" USING btree ("video_file_id");
  CREATE INDEX "works_seo_seo_image_idx" ON "works" USING btree ("seo_image_id");
  CREATE INDEX "works_published_at_idx" ON "works" USING btree ("published_at");
  CREATE INDEX "works_updated_at_idx" ON "works" USING btree ("updated_at");
  CREATE INDEX "works_created_at_idx" ON "works" USING btree ("created_at");
  CREATE INDEX "works__status_idx" ON "works" USING btree ("_status");
  CREATE INDEX "works_rels_order_idx" ON "works_rels" USING btree ("order");
  CREATE INDEX "works_rels_parent_idx" ON "works_rels" USING btree ("parent_id");
  CREATE INDEX "works_rels_path_idx" ON "works_rels" USING btree ("path");
  CREATE INDEX "works_rels_software_id_idx" ON "works_rels" USING btree ("software_id");
  CREATE INDEX "_works_v_version_gallery_order_idx" ON "_works_v_version_gallery" USING btree ("_order");
  CREATE INDEX "_works_v_version_gallery_parent_id_idx" ON "_works_v_version_gallery" USING btree ("_parent_id");
  CREATE INDEX "_works_v_version_gallery_image_idx" ON "_works_v_version_gallery" USING btree ("image_id");
  CREATE INDEX "_works_v_parent_idx" ON "_works_v" USING btree ("parent_id");
  CREATE INDEX "_works_v_version_version_discipline_idx" ON "_works_v" USING btree ("version_discipline_id");
  CREATE INDEX "_works_v_version_version_course_idx" ON "_works_v" USING btree ("version_course_id");
  CREATE INDEX "_works_v_version_version_cover_idx" ON "_works_v" USING btree ("version_cover_id");
  CREATE INDEX "_works_v_version_video_version_video_file_idx" ON "_works_v" USING btree ("version_video_file_id");
  CREATE INDEX "_works_v_version_seo_version_seo_image_idx" ON "_works_v" USING btree ("version_seo_image_id");
  CREATE INDEX "_works_v_version_version_published_at_idx" ON "_works_v" USING btree ("version_published_at");
  CREATE INDEX "_works_v_version_version_updated_at_idx" ON "_works_v" USING btree ("version_updated_at");
  CREATE INDEX "_works_v_version_version_created_at_idx" ON "_works_v" USING btree ("version_created_at");
  CREATE INDEX "_works_v_version_version__status_idx" ON "_works_v" USING btree ("version__status");
  CREATE INDEX "_works_v_created_at_idx" ON "_works_v" USING btree ("created_at");
  CREATE INDEX "_works_v_updated_at_idx" ON "_works_v" USING btree ("updated_at");
  CREATE INDEX "_works_v_latest_idx" ON "_works_v" USING btree ("latest");
  CREATE INDEX "_works_v_rels_order_idx" ON "_works_v_rels" USING btree ("order");
  CREATE INDEX "_works_v_rels_parent_idx" ON "_works_v_rels" USING btree ("parent_id");
  CREATE INDEX "_works_v_rels_path_idx" ON "_works_v_rels" USING btree ("path");
  CREATE INDEX "_works_v_rels_software_id_idx" ON "_works_v_rels" USING btree ("software_id");
  CREATE INDEX "stories_avatar_idx" ON "stories" USING btree ("avatar_id");
  CREATE INDEX "stories_course_idx" ON "stories" USING btree ("course_id");
  CREATE INDEX "stories_partner_idx" ON "stories" USING btree ("partner_id");
  CREATE INDEX "stories_updated_at_idx" ON "stories" USING btree ("updated_at");
  CREATE INDEX "stories_created_at_idx" ON "stories" USING btree ("created_at");
  CREATE INDEX "stories__status_idx" ON "stories" USING btree ("_status");
  CREATE INDEX "stories_rels_order_idx" ON "stories_rels" USING btree ("order");
  CREATE INDEX "stories_rels_parent_idx" ON "stories_rels" USING btree ("parent_id");
  CREATE INDEX "stories_rels_path_idx" ON "stories_rels" USING btree ("path");
  CREATE INDEX "stories_rels_works_id_idx" ON "stories_rels" USING btree ("works_id");
  CREATE INDEX "_stories_v_parent_idx" ON "_stories_v" USING btree ("parent_id");
  CREATE INDEX "_stories_v_version_version_avatar_idx" ON "_stories_v" USING btree ("version_avatar_id");
  CREATE INDEX "_stories_v_version_version_course_idx" ON "_stories_v" USING btree ("version_course_id");
  CREATE INDEX "_stories_v_version_version_partner_idx" ON "_stories_v" USING btree ("version_partner_id");
  CREATE INDEX "_stories_v_version_version_updated_at_idx" ON "_stories_v" USING btree ("version_updated_at");
  CREATE INDEX "_stories_v_version_version_created_at_idx" ON "_stories_v" USING btree ("version_created_at");
  CREATE INDEX "_stories_v_version_version__status_idx" ON "_stories_v" USING btree ("version__status");
  CREATE INDEX "_stories_v_created_at_idx" ON "_stories_v" USING btree ("created_at");
  CREATE INDEX "_stories_v_updated_at_idx" ON "_stories_v" USING btree ("updated_at");
  CREATE INDEX "_stories_v_latest_idx" ON "_stories_v" USING btree ("latest");
  CREATE INDEX "_stories_v_rels_order_idx" ON "_stories_v_rels" USING btree ("order");
  CREATE INDEX "_stories_v_rels_parent_idx" ON "_stories_v_rels" USING btree ("parent_id");
  CREATE INDEX "_stories_v_rels_path_idx" ON "_stories_v_rels" USING btree ("path");
  CREATE INDEX "_stories_v_rels_works_id_idx" ON "_stories_v_rels" USING btree ("works_id");
  CREATE INDEX "partners_logo_idx" ON "partners" USING btree ("logo_id");
  CREATE INDEX "partners_updated_at_idx" ON "partners" USING btree ("updated_at");
  CREATE INDEX "partners_created_at_idx" ON "partners" USING btree ("created_at");
  CREATE INDEX "career_events_date_idx" ON "career_events" USING btree ("date");
  CREATE INDEX "career_events_campus_idx" ON "career_events" USING btree ("campus_id");
  CREATE INDEX "career_events_image_idx" ON "career_events" USING btree ("image_id");
  CREATE INDEX "career_events_updated_at_idx" ON "career_events" USING btree ("updated_at");
  CREATE INDEX "career_events_created_at_idx" ON "career_events" USING btree ("created_at");
  CREATE INDEX "articles_category_idx" ON "articles" USING btree ("category_id");
  CREATE INDEX "articles_cover_idx" ON "articles" USING btree ("cover_id");
  CREATE INDEX "articles_seo_seo_image_idx" ON "articles" USING btree ("seo_image_id");
  CREATE UNIQUE INDEX "articles_slug_idx" ON "articles" USING btree ("slug");
  CREATE INDEX "articles_published_at_idx" ON "articles" USING btree ("published_at");
  CREATE INDEX "articles_updated_at_idx" ON "articles" USING btree ("updated_at");
  CREATE INDEX "articles_created_at_idx" ON "articles" USING btree ("created_at");
  CREATE INDEX "articles__status_idx" ON "articles" USING btree ("_status");
  CREATE INDEX "articles_rels_order_idx" ON "articles_rels" USING btree ("order");
  CREATE INDEX "articles_rels_parent_idx" ON "articles_rels" USING btree ("parent_id");
  CREATE INDEX "articles_rels_path_idx" ON "articles_rels" USING btree ("path");
  CREATE INDEX "articles_rels_courses_id_idx" ON "articles_rels" USING btree ("courses_id");
  CREATE INDEX "_articles_v_parent_idx" ON "_articles_v" USING btree ("parent_id");
  CREATE INDEX "_articles_v_version_version_category_idx" ON "_articles_v" USING btree ("version_category_id");
  CREATE INDEX "_articles_v_version_version_cover_idx" ON "_articles_v" USING btree ("version_cover_id");
  CREATE INDEX "_articles_v_version_seo_version_seo_image_idx" ON "_articles_v" USING btree ("version_seo_image_id");
  CREATE INDEX "_articles_v_version_version_slug_idx" ON "_articles_v" USING btree ("version_slug");
  CREATE INDEX "_articles_v_version_version_published_at_idx" ON "_articles_v" USING btree ("version_published_at");
  CREATE INDEX "_articles_v_version_version_updated_at_idx" ON "_articles_v" USING btree ("version_updated_at");
  CREATE INDEX "_articles_v_version_version_created_at_idx" ON "_articles_v" USING btree ("version_created_at");
  CREATE INDEX "_articles_v_version_version__status_idx" ON "_articles_v" USING btree ("version__status");
  CREATE INDEX "_articles_v_created_at_idx" ON "_articles_v" USING btree ("created_at");
  CREATE INDEX "_articles_v_updated_at_idx" ON "_articles_v" USING btree ("updated_at");
  CREATE INDEX "_articles_v_latest_idx" ON "_articles_v" USING btree ("latest");
  CREATE INDEX "_articles_v_rels_order_idx" ON "_articles_v_rels" USING btree ("order");
  CREATE INDEX "_articles_v_rels_parent_idx" ON "_articles_v_rels" USING btree ("parent_id");
  CREATE INDEX "_articles_v_rels_path_idx" ON "_articles_v_rels" USING btree ("path");
  CREATE INDEX "_articles_v_rels_courses_id_idx" ON "_articles_v_rels" USING btree ("courses_id");
  CREATE UNIQUE INDEX "article_categories_slug_idx" ON "article_categories" USING btree ("slug");
  CREATE INDEX "article_categories_updated_at_idx" ON "article_categories" USING btree ("updated_at");
  CREATE INDEX "article_categories_created_at_idx" ON "article_categories" USING btree ("created_at");
  CREATE INDEX "campuses_photos_order_idx" ON "campuses_photos" USING btree ("_order");
  CREATE INDEX "campuses_photos_parent_id_idx" ON "campuses_photos" USING btree ("_parent_id");
  CREATE INDEX "campuses_photos_image_idx" ON "campuses_photos" USING btree ("image_id");
  CREATE INDEX "campuses_city_slug_idx" ON "campuses" USING btree ("city_slug");
  CREATE INDEX "campuses_cover_idx" ON "campuses" USING btree ("cover_id");
  CREATE INDEX "campuses_seo_seo_image_idx" ON "campuses" USING btree ("seo_image_id");
  CREATE UNIQUE INDEX "campuses_slug_idx" ON "campuses" USING btree ("slug");
  CREATE INDEX "campuses_updated_at_idx" ON "campuses" USING btree ("updated_at");
  CREATE INDEX "campuses_created_at_idx" ON "campuses" USING btree ("created_at");
  CREATE INDEX "campuses__status_idx" ON "campuses" USING btree ("_status");
  CREATE INDEX "_campuses_v_version_photos_order_idx" ON "_campuses_v_version_photos" USING btree ("_order");
  CREATE INDEX "_campuses_v_version_photos_parent_id_idx" ON "_campuses_v_version_photos" USING btree ("_parent_id");
  CREATE INDEX "_campuses_v_version_photos_image_idx" ON "_campuses_v_version_photos" USING btree ("image_id");
  CREATE INDEX "_campuses_v_parent_idx" ON "_campuses_v" USING btree ("parent_id");
  CREATE INDEX "_campuses_v_version_version_city_slug_idx" ON "_campuses_v" USING btree ("version_city_slug");
  CREATE INDEX "_campuses_v_version_version_cover_idx" ON "_campuses_v" USING btree ("version_cover_id");
  CREATE INDEX "_campuses_v_version_seo_version_seo_image_idx" ON "_campuses_v" USING btree ("version_seo_image_id");
  CREATE INDEX "_campuses_v_version_version_slug_idx" ON "_campuses_v" USING btree ("version_slug");
  CREATE INDEX "_campuses_v_version_version_updated_at_idx" ON "_campuses_v" USING btree ("version_updated_at");
  CREATE INDEX "_campuses_v_version_version_created_at_idx" ON "_campuses_v" USING btree ("version_created_at");
  CREATE INDEX "_campuses_v_version_version__status_idx" ON "_campuses_v" USING btree ("version__status");
  CREATE INDEX "_campuses_v_created_at_idx" ON "_campuses_v" USING btree ("created_at");
  CREATE INDEX "_campuses_v_updated_at_idx" ON "_campuses_v" USING btree ("updated_at");
  CREATE INDEX "_campuses_v_latest_idx" ON "_campuses_v" USING btree ("latest");
  CREATE INDEX "banners_image_idx" ON "banners" USING btree ("image_id");
  CREATE INDEX "banners_mobile_image_idx" ON "banners" USING btree ("mobile_image_id");
  CREATE INDEX "banners_placement_idx" ON "banners" USING btree ("placement");
  CREATE INDEX "banners_updated_at_idx" ON "banners" USING btree ("updated_at");
  CREATE INDEX "banners_created_at_idx" ON "banners" USING btree ("created_at");
  CREATE INDEX "faqs_category_idx" ON "faqs" USING btree ("category");
  CREATE INDEX "faqs_updated_at_idx" ON "faqs" USING btree ("updated_at");
  CREATE INDEX "faqs_created_at_idx" ON "faqs" USING btree ("created_at");
  CREATE INDEX "tutorials_discipline_idx" ON "tutorials" USING btree ("discipline_id");
  CREATE INDEX "tutorials_cover_idx" ON "tutorials" USING btree ("cover_id");
  CREATE UNIQUE INDEX "tutorials_slug_idx" ON "tutorials" USING btree ("slug");
  CREATE INDEX "tutorials_updated_at_idx" ON "tutorials" USING btree ("updated_at");
  CREATE INDEX "tutorials_created_at_idx" ON "tutorials" USING btree ("created_at");
  CREATE INDEX "tutorials__status_idx" ON "tutorials" USING btree ("_status");
  CREATE INDEX "_tutorials_v_parent_idx" ON "_tutorials_v" USING btree ("parent_id");
  CREATE INDEX "_tutorials_v_version_version_discipline_idx" ON "_tutorials_v" USING btree ("version_discipline_id");
  CREATE INDEX "_tutorials_v_version_version_cover_idx" ON "_tutorials_v" USING btree ("version_cover_id");
  CREATE INDEX "_tutorials_v_version_version_slug_idx" ON "_tutorials_v" USING btree ("version_slug");
  CREATE INDEX "_tutorials_v_version_version_updated_at_idx" ON "_tutorials_v" USING btree ("version_updated_at");
  CREATE INDEX "_tutorials_v_version_version_created_at_idx" ON "_tutorials_v" USING btree ("version_created_at");
  CREATE INDEX "_tutorials_v_version_version__status_idx" ON "_tutorials_v" USING btree ("version__status");
  CREATE INDEX "_tutorials_v_created_at_idx" ON "_tutorials_v" USING btree ("created_at");
  CREATE INDEX "_tutorials_v_updated_at_idx" ON "_tutorials_v" USING btree ("updated_at");
  CREATE INDEX "_tutorials_v_latest_idx" ON "_tutorials_v" USING btree ("latest");
  CREATE INDEX "quiz_questions_options_scores_order_idx" ON "quiz_questions_options_scores" USING btree ("_order");
  CREATE INDEX "quiz_questions_options_scores_parent_id_idx" ON "quiz_questions_options_scores" USING btree ("_parent_id");
  CREATE INDEX "quiz_questions_options_scores_discipline_idx" ON "quiz_questions_options_scores" USING btree ("discipline_id");
  CREATE INDEX "quiz_questions_options_order_idx" ON "quiz_questions_options" USING btree ("_order");
  CREATE INDEX "quiz_questions_options_parent_id_idx" ON "quiz_questions_options" USING btree ("_parent_id");
  CREATE INDEX "quiz_questions_updated_at_idx" ON "quiz_questions" USING btree ("updated_at");
  CREATE INDEX "quiz_questions_created_at_idx" ON "quiz_questions" USING btree ("created_at");
  CREATE INDEX "pages_blocks_rich_text_order_idx" ON "pages_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "pages_blocks_rich_text_parent_id_idx" ON "pages_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_rich_text_path_idx" ON "pages_blocks_rich_text" USING btree ("_path");
  CREATE INDEX "pages_blocks_image_text_order_idx" ON "pages_blocks_image_text" USING btree ("_order");
  CREATE INDEX "pages_blocks_image_text_parent_id_idx" ON "pages_blocks_image_text" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_image_text_path_idx" ON "pages_blocks_image_text" USING btree ("_path");
  CREATE INDEX "pages_blocks_image_text_image_idx" ON "pages_blocks_image_text" USING btree ("image_id");
  CREATE INDEX "pages_blocks_stats_items_order_idx" ON "pages_blocks_stats_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_stats_items_parent_id_idx" ON "pages_blocks_stats_items" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_stats_order_idx" ON "pages_blocks_stats" USING btree ("_order");
  CREATE INDEX "pages_blocks_stats_parent_id_idx" ON "pages_blocks_stats" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_stats_path_idx" ON "pages_blocks_stats" USING btree ("_path");
  CREATE INDEX "pages_blocks_timeline_items_order_idx" ON "pages_blocks_timeline_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_timeline_items_parent_id_idx" ON "pages_blocks_timeline_items" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_timeline_order_idx" ON "pages_blocks_timeline" USING btree ("_order");
  CREATE INDEX "pages_blocks_timeline_parent_id_idx" ON "pages_blocks_timeline" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_timeline_path_idx" ON "pages_blocks_timeline" USING btree ("_path");
  CREATE INDEX "pages_blocks_cta_order_idx" ON "pages_blocks_cta" USING btree ("_order");
  CREATE INDEX "pages_blocks_cta_parent_id_idx" ON "pages_blocks_cta" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_cta_path_idx" ON "pages_blocks_cta" USING btree ("_path");
  CREATE INDEX "pages_seo_seo_image_idx" ON "pages" USING btree ("seo_image_id");
  CREATE UNIQUE INDEX "pages_slug_idx" ON "pages" USING btree ("slug");
  CREATE INDEX "pages_updated_at_idx" ON "pages" USING btree ("updated_at");
  CREATE INDEX "pages_created_at_idx" ON "pages" USING btree ("created_at");
  CREATE INDEX "pages__status_idx" ON "pages" USING btree ("_status");
  CREATE INDEX "_pages_v_blocks_rich_text_order_idx" ON "_pages_v_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_rich_text_parent_id_idx" ON "_pages_v_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_rich_text_path_idx" ON "_pages_v_blocks_rich_text" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_image_text_order_idx" ON "_pages_v_blocks_image_text" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_image_text_parent_id_idx" ON "_pages_v_blocks_image_text" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_image_text_path_idx" ON "_pages_v_blocks_image_text" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_image_text_image_idx" ON "_pages_v_blocks_image_text" USING btree ("image_id");
  CREATE INDEX "_pages_v_blocks_stats_items_order_idx" ON "_pages_v_blocks_stats_items" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_stats_items_parent_id_idx" ON "_pages_v_blocks_stats_items" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_stats_order_idx" ON "_pages_v_blocks_stats" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_stats_parent_id_idx" ON "_pages_v_blocks_stats" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_stats_path_idx" ON "_pages_v_blocks_stats" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_timeline_items_order_idx" ON "_pages_v_blocks_timeline_items" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_timeline_items_parent_id_idx" ON "_pages_v_blocks_timeline_items" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_timeline_order_idx" ON "_pages_v_blocks_timeline" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_timeline_parent_id_idx" ON "_pages_v_blocks_timeline" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_timeline_path_idx" ON "_pages_v_blocks_timeline" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_cta_order_idx" ON "_pages_v_blocks_cta" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_cta_parent_id_idx" ON "_pages_v_blocks_cta" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_cta_path_idx" ON "_pages_v_blocks_cta" USING btree ("_path");
  CREATE INDEX "_pages_v_parent_idx" ON "_pages_v" USING btree ("parent_id");
  CREATE INDEX "_pages_v_version_seo_version_seo_image_idx" ON "_pages_v" USING btree ("version_seo_image_id");
  CREATE INDEX "_pages_v_version_version_slug_idx" ON "_pages_v" USING btree ("version_slug");
  CREATE INDEX "_pages_v_version_version_updated_at_idx" ON "_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_pages_v_version_version_created_at_idx" ON "_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_pages_v_version_version__status_idx" ON "_pages_v" USING btree ("version__status");
  CREATE INDEX "_pages_v_created_at_idx" ON "_pages_v" USING btree ("created_at");
  CREATE INDEX "_pages_v_updated_at_idx" ON "_pages_v" USING btree ("updated_at");
  CREATE INDEX "_pages_v_latest_idx" ON "_pages_v" USING btree ("latest");
  CREATE INDEX "leads_follow_ups_order_idx" ON "leads_follow_ups" USING btree ("_order");
  CREATE INDEX "leads_follow_ups_parent_id_idx" ON "leads_follow_ups" USING btree ("_parent_id");
  CREATE INDEX "leads_follow_ups_author_idx" ON "leads_follow_ups" USING btree ("author_id");
  CREATE INDEX "leads_status_history_order_idx" ON "leads_status_history" USING btree ("_order");
  CREATE INDEX "leads_status_history_parent_id_idx" ON "leads_status_history" USING btree ("_parent_id");
  CREATE INDEX "leads_status_history_by_idx" ON "leads_status_history" USING btree ("by_id");
  CREATE INDEX "leads_webhook_deliveries_order_idx" ON "leads_webhook_deliveries" USING btree ("_order");
  CREATE INDEX "leads_webhook_deliveries_parent_id_idx" ON "leads_webhook_deliveries" USING btree ("_parent_id");
  CREATE INDEX "leads_phone_idx" ON "leads" USING btree ("phone");
  CREATE INDEX "leads_discipline_idx" ON "leads" USING btree ("discipline_id");
  CREATE INDEX "leads_context_context_course_idx" ON "leads" USING btree ("context_course_id");
  CREATE INDEX "leads_context_context_tutorial_idx" ON "leads" USING btree ("context_tutorial_id");
  CREATE INDEX "leads_client_client_ip_idx" ON "leads" USING btree ("client_ip");
  CREATE INDEX "leads_status_idx" ON "leads" USING btree ("status");
  CREATE INDEX "leads_assigned_to_idx" ON "leads" USING btree ("assigned_to_id");
  CREATE INDEX "leads_duplicate_of_idx" ON "leads" USING btree ("duplicate_of_id");
  CREATE INDEX "leads_updated_at_idx" ON "leads" USING btree ("updated_at");
  CREATE INDEX "leads_created_at_idx" ON "leads" USING btree ("created_at");
  CREATE INDEX "phone_createdAt_idx" ON "leads" USING btree ("phone","created_at");
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_campus_idx" ON "users" USING btree ("campus_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "media" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "media" USING btree ("sizes_card_filename");
  CREATE INDEX "media_sizes_hero_sizes_hero_filename_idx" ON "media" USING btree ("sizes_hero_filename");
  CREATE INDEX "media_sizes_og_sizes_og_filename_idx" ON "media" USING btree ("sizes_og_filename");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_disciplines_id_idx" ON "payload_locked_documents_rels" USING btree ("disciplines_id");
  CREATE INDEX "payload_locked_documents_rels_courses_id_idx" ON "payload_locked_documents_rels" USING btree ("courses_id");
  CREATE INDEX "payload_locked_documents_rels_cohorts_id_idx" ON "payload_locked_documents_rels" USING btree ("cohorts_id");
  CREATE INDEX "payload_locked_documents_rels_software_id_idx" ON "payload_locked_documents_rels" USING btree ("software_id");
  CREATE INDEX "payload_locked_documents_rels_teachers_id_idx" ON "payload_locked_documents_rels" USING btree ("teachers_id");
  CREATE INDEX "payload_locked_documents_rels_works_id_idx" ON "payload_locked_documents_rels" USING btree ("works_id");
  CREATE INDEX "payload_locked_documents_rels_stories_id_idx" ON "payload_locked_documents_rels" USING btree ("stories_id");
  CREATE INDEX "payload_locked_documents_rels_partners_id_idx" ON "payload_locked_documents_rels" USING btree ("partners_id");
  CREATE INDEX "payload_locked_documents_rels_career_events_id_idx" ON "payload_locked_documents_rels" USING btree ("career_events_id");
  CREATE INDEX "payload_locked_documents_rels_articles_id_idx" ON "payload_locked_documents_rels" USING btree ("articles_id");
  CREATE INDEX "payload_locked_documents_rels_article_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("article_categories_id");
  CREATE INDEX "payload_locked_documents_rels_campuses_id_idx" ON "payload_locked_documents_rels" USING btree ("campuses_id");
  CREATE INDEX "payload_locked_documents_rels_banners_id_idx" ON "payload_locked_documents_rels" USING btree ("banners_id");
  CREATE INDEX "payload_locked_documents_rels_faqs_id_idx" ON "payload_locked_documents_rels" USING btree ("faqs_id");
  CREATE INDEX "payload_locked_documents_rels_tutorials_id_idx" ON "payload_locked_documents_rels" USING btree ("tutorials_id");
  CREATE INDEX "payload_locked_documents_rels_quiz_questions_id_idx" ON "payload_locked_documents_rels" USING btree ("quiz_questions_id");
  CREATE INDEX "payload_locked_documents_rels_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("pages_id");
  CREATE INDEX "payload_locked_documents_rels_leads_id_idx" ON "payload_locked_documents_rels" USING btree ("leads_id");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "site_settings_logo_idx" ON "site_settings" USING btree ("logo_id");
  CREATE INDEX "site_settings_logo_on_dark_idx" ON "site_settings" USING btree ("logo_on_dark_id");
  CREATE INDEX "site_settings_wechat_qr_idx" ON "site_settings" USING btree ("wechat_qr_id");
  CREATE INDEX "site_settings_default_seo_default_seo_image_idx" ON "site_settings" USING btree ("default_seo_image_id");
  CREATE INDEX "navigation_items_order_idx" ON "navigation_items" USING btree ("_order");
  CREATE INDEX "navigation_items_parent_id_idx" ON "navigation_items" USING btree ("_parent_id");
  CREATE INDEX "footer_columns_links_order_idx" ON "footer_columns_links" USING btree ("_order");
  CREATE INDEX "footer_columns_links_parent_id_idx" ON "footer_columns_links" USING btree ("_parent_id");
  CREATE INDEX "footer_columns_order_idx" ON "footer_columns" USING btree ("_order");
  CREATE INDEX "footer_columns_parent_id_idx" ON "footer_columns" USING btree ("_parent_id");
  CREATE INDEX "footer_qrcodes_order_idx" ON "footer_qrcodes" USING btree ("_order");
  CREATE INDEX "footer_qrcodes_parent_id_idx" ON "footer_qrcodes" USING btree ("_parent_id");
  CREATE INDEX "footer_qrcodes_image_idx" ON "footer_qrcodes" USING btree ("image_id");
  CREATE INDEX "footer_bottom_links_order_idx" ON "footer_bottom_links" USING btree ("_order");
  CREATE INDEX "footer_bottom_links_parent_id_idx" ON "footer_bottom_links" USING btree ("_parent_id");
  CREATE INDEX "home_page_quick_entries_items_order_idx" ON "home_page_quick_entries_items" USING btree ("_order");
  CREATE INDEX "home_page_quick_entries_items_parent_id_idx" ON "home_page_quick_entries_items" USING btree ("_parent_id");
  CREATE INDEX "home_page_quick_entries_items_image_idx" ON "home_page_quick_entries_items" USING btree ("image_id");
  CREATE INDEX "home_page_seo_seo_image_idx" ON "home_page" USING btree ("seo_image_id");
  CREATE INDEX "home_page_rels_order_idx" ON "home_page_rels" USING btree ("order");
  CREATE INDEX "home_page_rels_parent_idx" ON "home_page_rels" USING btree ("parent_id");
  CREATE INDEX "home_page_rels_path_idx" ON "home_page_rels" USING btree ("path");
  CREATE INDEX "home_page_rels_disciplines_id_idx" ON "home_page_rels" USING btree ("disciplines_id");
  CREATE INDEX "home_page_rels_works_id_idx" ON "home_page_rels" USING btree ("works_id");
  CREATE INDEX "home_page_rels_stories_id_idx" ON "home_page_rels" USING btree ("stories_id");
  CREATE INDEX "home_page_rels_teachers_id_idx" ON "home_page_rels" USING btree ("teachers_id");
  CREATE INDEX "careers_page_process_steps_order_idx" ON "careers_page_process_steps" USING btree ("_order");
  CREATE INDEX "careers_page_process_steps_parent_id_idx" ON "careers_page_process_steps" USING btree ("_parent_id");
  CREATE INDEX "careers_page_seo_seo_image_idx" ON "careers_page" USING btree ("seo_image_id");
  CREATE INDEX "quiz_settings_seo_seo_image_idx" ON "quiz_settings" USING btree ("seo_image_id");
  CREATE INDEX "lead_settings_webhooks_order_idx" ON "lead_settings_webhooks" USING btree ("_order");
  CREATE INDEX "lead_settings_webhooks_parent_id_idx" ON "lead_settings_webhooks" USING btree ("_parent_id");
  CREATE INDEX "lead_settings_city_options_order_idx" ON "lead_settings_city_options" USING btree ("_order");
  CREATE INDEX "lead_settings_city_options_parent_id_idx" ON "lead_settings_city_options" USING btree ("_parent_id");
  CREATE INDEX "lead_settings_wechat_qr_idx" ON "lead_settings" USING btree ("wechat_qr_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "disciplines_career_directions" CASCADE;
  DROP TABLE "disciplines" CASCADE;
  DROP TABLE "_disciplines_v_version_career_directions" CASCADE;
  DROP TABLE "_disciplines_v" CASCADE;
  DROP TABLE "courses_delivery_modes" CASCADE;
  DROP TABLE "courses_highlights" CASCADE;
  DROP TABLE "courses_audience" CASCADE;
  DROP TABLE "courses_stages_topics" CASCADE;
  DROP TABLE "courses_stages" CASCADE;
  DROP TABLE "courses_projects" CASCADE;
  DROP TABLE "courses_career_directions" CASCADE;
  DROP TABLE "courses" CASCADE;
  DROP TABLE "courses_rels" CASCADE;
  DROP TABLE "_courses_v_version_delivery_modes" CASCADE;
  DROP TABLE "_courses_v_version_highlights" CASCADE;
  DROP TABLE "_courses_v_version_audience" CASCADE;
  DROP TABLE "_courses_v_version_stages_topics" CASCADE;
  DROP TABLE "_courses_v_version_stages" CASCADE;
  DROP TABLE "_courses_v_version_projects" CASCADE;
  DROP TABLE "_courses_v_version_career_directions" CASCADE;
  DROP TABLE "_courses_v" CASCADE;
  DROP TABLE "_courses_v_rels" CASCADE;
  DROP TABLE "cohorts" CASCADE;
  DROP TABLE "software" CASCADE;
  DROP TABLE "teachers_specialties" CASCADE;
  DROP TABLE "teachers_experience" CASCADE;
  DROP TABLE "teachers" CASCADE;
  DROP TABLE "teachers_rels" CASCADE;
  DROP TABLE "_teachers_v_version_specialties" CASCADE;
  DROP TABLE "_teachers_v_version_experience" CASCADE;
  DROP TABLE "_teachers_v" CASCADE;
  DROP TABLE "_teachers_v_rels" CASCADE;
  DROP TABLE "works_gallery" CASCADE;
  DROP TABLE "works" CASCADE;
  DROP TABLE "works_rels" CASCADE;
  DROP TABLE "_works_v_version_gallery" CASCADE;
  DROP TABLE "_works_v" CASCADE;
  DROP TABLE "_works_v_rels" CASCADE;
  DROP TABLE "stories" CASCADE;
  DROP TABLE "stories_rels" CASCADE;
  DROP TABLE "_stories_v" CASCADE;
  DROP TABLE "_stories_v_rels" CASCADE;
  DROP TABLE "partners" CASCADE;
  DROP TABLE "career_events" CASCADE;
  DROP TABLE "articles" CASCADE;
  DROP TABLE "articles_rels" CASCADE;
  DROP TABLE "_articles_v" CASCADE;
  DROP TABLE "_articles_v_rels" CASCADE;
  DROP TABLE "article_categories" CASCADE;
  DROP TABLE "campuses_photos" CASCADE;
  DROP TABLE "campuses" CASCADE;
  DROP TABLE "_campuses_v_version_photos" CASCADE;
  DROP TABLE "_campuses_v" CASCADE;
  DROP TABLE "banners" CASCADE;
  DROP TABLE "faqs" CASCADE;
  DROP TABLE "tutorials" CASCADE;
  DROP TABLE "_tutorials_v" CASCADE;
  DROP TABLE "quiz_questions_options_scores" CASCADE;
  DROP TABLE "quiz_questions_options" CASCADE;
  DROP TABLE "quiz_questions" CASCADE;
  DROP TABLE "pages_blocks_rich_text" CASCADE;
  DROP TABLE "pages_blocks_image_text" CASCADE;
  DROP TABLE "pages_blocks_stats_items" CASCADE;
  DROP TABLE "pages_blocks_stats" CASCADE;
  DROP TABLE "pages_blocks_timeline_items" CASCADE;
  DROP TABLE "pages_blocks_timeline" CASCADE;
  DROP TABLE "pages_blocks_cta" CASCADE;
  DROP TABLE "pages" CASCADE;
  DROP TABLE "_pages_v_blocks_rich_text" CASCADE;
  DROP TABLE "_pages_v_blocks_image_text" CASCADE;
  DROP TABLE "_pages_v_blocks_stats_items" CASCADE;
  DROP TABLE "_pages_v_blocks_stats" CASCADE;
  DROP TABLE "_pages_v_blocks_timeline_items" CASCADE;
  DROP TABLE "_pages_v_blocks_timeline" CASCADE;
  DROP TABLE "_pages_v_blocks_cta" CASCADE;
  DROP TABLE "_pages_v" CASCADE;
  DROP TABLE "leads_follow_ups" CASCADE;
  DROP TABLE "leads_status_history" CASCADE;
  DROP TABLE "leads_webhook_deliveries" CASCADE;
  DROP TABLE "leads" CASCADE;
  DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "site_settings" CASCADE;
  DROP TABLE "navigation_items" CASCADE;
  DROP TABLE "navigation" CASCADE;
  DROP TABLE "footer_columns_links" CASCADE;
  DROP TABLE "footer_columns" CASCADE;
  DROP TABLE "footer_qrcodes" CASCADE;
  DROP TABLE "footer_bottom_links" CASCADE;
  DROP TABLE "footer" CASCADE;
  DROP TABLE "home_page_quick_entries_items" CASCADE;
  DROP TABLE "home_page" CASCADE;
  DROP TABLE "home_page_rels" CASCADE;
  DROP TABLE "careers_page_process_steps" CASCADE;
  DROP TABLE "careers_page" CASCADE;
  DROP TABLE "quiz_settings" CASCADE;
  DROP TABLE "lead_settings_webhooks" CASCADE;
  DROP TABLE "lead_settings_city_options" CASCADE;
  DROP TABLE "lead_settings" CASCADE;
  DROP TYPE "public"."enum_disciplines_status";
  DROP TYPE "public"."enum__disciplines_v_version_status";
  DROP TYPE "public"."enum_courses_delivery_modes";
  DROP TYPE "public"."enum_courses_class_type";
  DROP TYPE "public"."enum_courses_duration_unit";
  DROP TYPE "public"."enum_courses_status";
  DROP TYPE "public"."enum__courses_v_version_delivery_modes";
  DROP TYPE "public"."enum__courses_v_version_class_type";
  DROP TYPE "public"."enum__courses_v_version_duration_unit";
  DROP TYPE "public"."enum__courses_v_version_status";
  DROP TYPE "public"."enum_cohorts_mode";
  DROP TYPE "public"."enum_cohorts_status";
  DROP TYPE "public"."enum_software_category";
  DROP TYPE "public"."enum_teachers_status";
  DROP TYPE "public"."enum__teachers_v_version_status";
  DROP TYPE "public"."enum_works_video_kind";
  DROP TYPE "public"."enum_works_status";
  DROP TYPE "public"."enum__works_v_version_video_kind";
  DROP TYPE "public"."enum__works_v_version_status";
  DROP TYPE "public"."enum_stories_status";
  DROP TYPE "public"."enum__stories_v_version_status";
  DROP TYPE "public"."enum_articles_status";
  DROP TYPE "public"."enum__articles_v_version_status";
  DROP TYPE "public"."enum_campuses_status";
  DROP TYPE "public"."enum__campuses_v_version_status";
  DROP TYPE "public"."enum_banners_placement";
  DROP TYPE "public"."enum_faqs_category";
  DROP TYPE "public"."enum_tutorials_level";
  DROP TYPE "public"."enum_tutorials_provider";
  DROP TYPE "public"."enum_tutorials_status";
  DROP TYPE "public"."enum__tutorials_v_version_level";
  DROP TYPE "public"."enum__tutorials_v_version_provider";
  DROP TYPE "public"."enum__tutorials_v_version_status";
  DROP TYPE "public"."enum_pages_blocks_image_text_image_position";
  DROP TYPE "public"."enum_pages_blocks_cta_intent";
  DROP TYPE "public"."enum_pages_status";
  DROP TYPE "public"."enum__pages_v_blocks_image_text_image_position";
  DROP TYPE "public"."enum__pages_v_blocks_cta_intent";
  DROP TYPE "public"."enum__pages_v_version_status";
  DROP TYPE "public"."enum_leads_status_history_from";
  DROP TYPE "public"."enum_leads_status_history_to";
  DROP TYPE "public"."enum_leads_intent";
  DROP TYPE "public"."enum_leads_status";
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_navigation_items_type";
  DROP TYPE "public"."enum_home_page_quick_entries_items_action";
  DROP TYPE "public"."enum_home_page_featured_works_mode";
  DROP TYPE "public"."enum_lead_settings_webhooks_platform";`)
}
