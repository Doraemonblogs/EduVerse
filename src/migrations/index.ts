import * as migration_20261120_133326_initial from './20261120_133326_initial';
import * as migration_20261123_052402_m2_leads_frame from './20261123_052402_m2_leads_frame';
import * as migration_20261123_090613_m3_course_pages from './20261123_090613_m3_course_pages';
import * as migration_20261123_121240_m4_works_teachers from './20261123_121240_m4_works_teachers';
import * as migration_20261123_143804_m5_home_courses from './20261123_143804_m5_home_courses';
import * as migration_20261123_171512_m6_articles_campuses_careers from './20261123_171512_m6_articles_campuses_careers';

export const migrations = [
  {
    up: migration_20261120_133326_initial.up,
    down: migration_20261120_133326_initial.down,
    name: '20261120_133326_initial',
  },
  {
    up: migration_20261123_052402_m2_leads_frame.up,
    down: migration_20261123_052402_m2_leads_frame.down,
    name: '20261123_052402_m2_leads_frame',
  },
  {
    up: migration_20261123_090613_m3_course_pages.up,
    down: migration_20261123_090613_m3_course_pages.down,
    name: '20261123_090613_m3_course_pages',
  },
  {
    up: migration_20261123_121240_m4_works_teachers.up,
    down: migration_20261123_121240_m4_works_teachers.down,
    name: '20261123_121240_m4_works_teachers',
  },
  {
    up: migration_20261123_143804_m5_home_courses.up,
    down: migration_20261123_143804_m5_home_courses.down,
    name: '20261123_143804_m5_home_courses',
  },
  {
    up: migration_20261123_171512_m6_articles_campuses_careers.up,
    down: migration_20261123_171512_m6_articles_campuses_careers.down,
    name: '20261123_171512_m6_articles_campuses_careers'
  },
];
