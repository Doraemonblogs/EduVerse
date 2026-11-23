import * as migration_20261120_133326_initial from './20261120_133326_initial';
import * as migration_20261123_052402_m2_leads_frame from './20261123_052402_m2_leads_frame';

export const migrations = [
  {
    up: migration_20261120_133326_initial.up,
    down: migration_20261120_133326_initial.down,
    name: '20261120_133326_initial',
  },
  {
    up: migration_20261123_052402_m2_leads_frame.up,
    down: migration_20261123_052402_m2_leads_frame.down,
    name: '20261123_052402_m2_leads_frame'
  },
];
