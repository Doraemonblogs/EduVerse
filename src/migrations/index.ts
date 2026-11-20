import * as migration_20261120_133326_initial from './20261120_133326_initial';

export const migrations = [
  {
    up: migration_20261120_133326_initial.up,
    down: migration_20261120_133326_initial.down,
    name: '20261120_133326_initial'
  },
];
