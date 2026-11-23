/**
 * 富文本（Lexical 编辑器状态）是否有内容（纯函数，服务端与客户端组件都能用）。
 *
 * 后台清空正文后，编辑器保存的不是 null，而是只含一个空段落的状态；渲染它会留下一块空白区域。
 * 判断规则：顶层有任一非段落节点（标题、列表、图片、引用…）或任一有子节点的段落，即视为有内容；
 * 未填写（null / undefined）、没有顶层节点、只有空段落都视为没有。
 *
 * 用于专业介绍、讲师简介、学员故事正文等“没有内容就整块不渲染”的场景。
 */

/** 只依赖顶层节点的类型与子节点：Payload 生成的各集合富文本类型都满足 */
type RichTextState = {
  root: { children: readonly { type: unknown; children?: unknown }[] }
}

export function isRichTextFilled<T extends RichTextState>(data: T | null | undefined): data is T {
  if (!data) return false
  return data.root.children.some(
    (node) =>
      node.type !== 'paragraph' || (Array.isArray(node.children) && node.children.length > 0),
  )
}
