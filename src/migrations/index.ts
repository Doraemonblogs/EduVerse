import * as migration_20261120_124318_initial from './20261120_124318_initial';

export const migrations = [
  {
    up: migration_20261120_124318_initial.up,
    down: migration_20261120_124318_initial.down,
    name: '20261120_124318_initial'
  },
];
