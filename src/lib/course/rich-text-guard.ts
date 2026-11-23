/**
 * 富文本里课程链接的可访问性守卫（纯函数；查询与调用见 src/lib/data/courses.ts 的 guardCourseLinks）。
 *
 * 课程详情页只对“课程已发布、且所属专业方向已发布”的课程开放，其余返回 404。
 * 富文本按 depth 填充进来的课程文档只带课程自己的发布状态（专业方向只是 ID），
 * 渲染层的 docHref 判断不了专业方向。数据层因此先收集富文本引用的课程，一次查出其中可访问的，
 * 再把不可访问的课程标记为草稿：站内链接只渲染文字，关联节点不渲染
 * （docHref 对草稿返回 null，见 src/components/common/rich-text.tsx）。
 *
 * 遍历规则：富文本（Lexical 编辑器状态 `{ root: { type: 'root', children } }`）内只沿 children 向下，
 * 不进入已填充的关联文档；富文本之外的结构（如页面区块数组）逐层查找其中的富文本。
 */

type JsonObject = Record<string, unknown>

const COURSES = 'courses'

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null
}

function isLexicalRoot(value: unknown): value is JsonObject & { children: unknown } {
  return isObject(value) && value.type === 'root' && Array.isArray(value.children)
}

/**
 * 节点里指向课程的引用所在的对象（其 value 字段是课程 ID 或已填充的课程文档）：
 * 站内链接是 fields.doc，关联节点是节点本身。
 */
function courseRefHolder(node: JsonObject): JsonObject | null {
  if (node.type === 'relationship') return node.relationTo === COURSES ? node : null
  const fields = node.fields
  if (isObject(fields) && fields.linkType === 'internal' && isObject(fields.doc)) {
    return fields.doc.relationTo === COURSES ? fields.doc : null
  }
  return null
}

function walkNodes(nodes: unknown, visit: (holder: JsonObject) => void): void {
  if (!Array.isArray(nodes)) return
  for (const node of nodes) {
    if (!isObject(node)) continue
    const holder = courseRefHolder(node)
    if (holder) visit(holder)
    walkNodes(node.children, visit)
  }
}

/** 对 value 中全部富文本里指向课程的每个引用调用 visit */
function forEachCourseRef(value: unknown, visit: (holder: JsonObject) => void): void {
  if (Array.isArray(value)) {
    for (const item of value) forEachCourseRef(item, visit)
    return
  }
  if (!isObject(value)) return
  if (isLexicalRoot(value.root)) {
    walkNodes(value.root.children, visit)
    return
  }
  for (const child of Object.values(value)) forEachCourseRef(child, visit)
}

/** 已填充的课程文档的 ID；未填充（只有 ID，本来就不会输出链接）时返回 null */
function populatedCourseId(value: unknown): number | null {
  if (!isObject(value)) return null
  const { id } = value
  if (typeof id === 'number' && Number.isInteger(id)) return id
  if (typeof id === 'string' && /^\d+$/.test(id)) return Number(id)
  return null
}

/**
 * 收集 value 中全部富文本里已填充的课程引用的 ID（站内链接与关联节点，去重）。
 * value 可以是单个富文本，也可以是含富文本的结构（如页面区块数组）。
 */
export function collectLinkedCourseIds(value: unknown): number[] {
  const ids = new Set<number>()
  forEachCourseRef(value, (holder) => {
    const id = populatedCourseId(holder.value)
    if (id !== null) ids.add(id)
  })
  return [...ids]
}

/**
 * 把 reachable 之外的已填充课程标记为草稿（只渲染文字，不输出会 404 的链接）。
 * 不修改传入的值：没有需要标记的课程时原样返回，否则返回标记后的副本。
 */
export function hideUnreachableCourses<T>(value: T, reachable: ReadonlySet<number>): T {
  const isUnreachable = (holder: JsonObject) => {
    const id = populatedCourseId(holder.value)
    return id !== null && !reachable.has(id)
  }

  let found = false
  forEachCourseRef(value, (holder) => {
    if (isUnreachable(holder)) found = true
  })
  if (!found) return value

  const copy = structuredClone(value)
  forEachCourseRef(copy, (holder) => {
    if (isUnreachable(holder) && isObject(holder.value)) {
      holder.value = { ...holder.value, _status: 'draft' }
    }
  })
  return copy
}
