import { validations, type Field, type GroupField, type TextFieldSingleValidation } from 'payload'

/** 排序字段：数字越小越靠前 */
export const orderField: Field = {
  name: 'order',
  type: 'number',
  label: '排序',
  defaultValue: 100,
  admin: { position: 'sidebar', description: '数字越小越靠前' },
}

/** 精选标记：出现在首页等推荐位 */
export const featuredField: Field = {
  name: 'featured',
  type: 'checkbox',
  label: '精选 / 推荐',
  defaultValue: false,
  admin: { position: 'sidebar' },
}

/** 链接地址：站内路径（/ 开头）或 http(s) 外链 */
export const validateHref: TextFieldSingleValidation = (value, options) => {
  // 先执行内置校验（required 等），再校验格式
  const base = validations.text(value, options)
  if (base !== true) return base
  if (!value) return true
  if (/^\/(?!\/)/.test(value) || /^https?:\/\//.test(value) || /^(tel|mailto):/.test(value)) {
    return true
  }
  return '请填写站内路径（以 / 开头，如 /courses）或完整网址（https:// 开头）'
}

export function linkGroup(name = 'link', label = '链接'): GroupField {
  return {
    name,
    type: 'group',
    label,
    fields: [
      { name: 'label', type: 'text', label: '文字', required: true },
      {
        name: 'href',
        type: 'text',
        label: '地址',
        required: true,
        validate: validateHref,
        admin: { description: '站内路径如 /courses，外链如 https://example.com' },
      },
      { name: 'newTab', type: 'checkbox', label: '新窗口打开', defaultValue: false },
    ],
  }
}

/**
 * 薪资参考：广告法第十一条要求引证内容真实准确并标明出处，
 * 因此填写区间时必须同时填写来源与统计时间；前台固定附带“不作为培训效果承诺”的声明。
 */
export const salaryRefGroup: GroupField = {
  name: 'salaryRef',
  type: 'group',
  label: '薪资参考',
  admin: { description: '填写区间时必须同时填写数据来源与统计时间（广告法要求标明出处）。' },
  fields: [
    {
      name: 'range',
      type: 'text',
      label: '薪资区间',
      admin: { description: '如：8,000–15,000 元/月' },
    },
    {
      name: 'source',
      type: 'text',
      label: '数据来源',
      validate: (value: string | null | undefined, { siblingData }: { siblingData: unknown }) => {
        const range = (siblingData as { range?: string } | undefined)?.range
        return range && !value ? '填写薪资区间时必须注明数据来源' : true
      },
    },
    {
      name: 'statDate',
      type: 'text',
      label: '统计时间',
      admin: { description: '如：2026 年 9 月' },
      validate: (value: string | null | undefined, { siblingData }: { siblingData: unknown }) => {
        const range = (siblingData as { range?: string } | undefined)?.range
        return range && !value ? '填写薪资区间时必须注明统计时间' : true
      },
    },
    { name: 'note', type: 'textarea', label: '补充说明' },
  ],
}

/**
 * 授权确认：学员作品、学员故事发布前必须取得书面授权（个人信息保护与广告法合规）。
 * 草稿保存不校验，发布时校验。
 */
export const consentField: Field = {
  name: 'consentConfirmed',
  type: 'checkbox',
  label: '已取得学员书面授权',
  defaultValue: false,
  admin: {
    position: 'sidebar',
    description: '发布前必须确认已取得学员书面授权（展示作品 / 经历、使用化名或头像）。',
  },
  validate: (value: boolean | null | undefined, { data }: { data: unknown }) => {
    const status = (data as { _status?: string } | undefined)?._status
    return status === 'published' && !value ? '发布前必须确认已取得学员书面授权' : true
  },
}

/** 区块通用字段：是否显示、眉标、标题、描述（首页等页面配置用） */
export function sectionFields(defaults: { title: string; eyebrow?: string }): Field[] {
  return [
    { name: 'enabled', type: 'checkbox', label: '显示该区块', defaultValue: true },
    { name: 'eyebrow', type: 'text', label: '英文眉标', defaultValue: defaults.eyebrow },
    { name: 'title', type: 'text', label: '标题', required: true, defaultValue: defaults.title },
    { name: 'description', type: 'textarea', label: '描述' },
  ]
}
