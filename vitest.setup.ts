// 集成测试环境：加载 .env，然后把数据库切换到独立的测试库，避免污染开发数据。
import 'dotenv/config'

const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  process.env.DATABASE_URL?.replace(/\/([^/?]+)(\?|$)/, '/$1_test$2')

if (!testDatabaseUrl) {
  throw new Error('集成测试需要 TEST_DATABASE_URL 或 DATABASE_URL 环境变量')
}

process.env.DATABASE_URL = testDatabaseUrl
process.env.PAYLOAD_SECRET ??= 'test-secret-for-integration-tests-only'
