// 集成测试环境：加载 .env，然后把数据库与媒体目录切换到独立的测试库 / 临时目录，避免污染开发数据。
import 'dotenv/config'

import os from 'node:os'
import path from 'node:path'

const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  process.env.DATABASE_URL?.replace(/\/([^/?]+)(\?|$)/, '/$1_test$2')

if (!testDatabaseUrl) {
  throw new Error('集成测试需要 TEST_DATABASE_URL 或 DATABASE_URL 环境变量')
}

process.env.DATABASE_URL = testDatabaseUrl
process.env.PAYLOAD_SECRET ??= 'test-secret-for-integration-tests-only'

// 种子测试会清空并重建 seed- 开头的媒体文件，必须与开发环境的 media/ 目录隔离
process.env.MEDIA_DIR = process.env.TEST_MEDIA_DIR ?? path.join(os.tmpdir(), 'eduverse-media-test')
