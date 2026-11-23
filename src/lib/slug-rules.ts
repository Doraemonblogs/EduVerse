/**
 * slug 的格式规则：后台 slug 字段校验与自动生成（src/lib/slugify.ts）、详情页路由参数与筛选参数校验
 * （src/lib/search-params.ts 的 isValidSlug）共用这一份。纯常量，不依赖拼音库，任何地方都可以引入。
 */

/**
 * slug 最长字符数。路由参数超过它直接判定不存在（404），不查库、不进数据缓存——
 * 否则超长的随机路径也会各自占一个缓存条目（M7 评审，见 docs/ARCHITECTURE.md §2.1）。
 */
export const MAX_SLUG_LENGTH = 80

/** 小写字母、数字，用连字符分隔，不以连字符开头或结尾 */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
