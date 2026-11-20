import {
  validations,
  type CollectionBeforeChangeHook,
  type CollectionConfig,
  type DateFieldValidation,
  type RelationshipFieldSingleValidation,
} from 'payload'

import { hasRole, hiddenFromConsultant, isStaffEditor } from '@/access/roles'
import { revalidateCollection } from '@/hooks/revalidate'

import { DELIVERY_MODE_OPTIONS } from './Courses'
import { ADMIN_GROUPS } from './groups'

export const COHORT_STATUS_OPTIONS = [
  { label: '报名中', value: 'enrolling' },
  { label: '即将开班', value: 'upcoming' },
  { label: '已满班', value: 'full' },
  { label: '已结束', value: 'closed' },
]

/** 开班日期按北京时间取年月日，避免服务器时区不同导致日期差一天 */
const dayFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function formatDay(value: unknown): string | undefined {
  if (typeof value !== 'string' && !(value instanceof Date)) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  const parts = Object.fromEntries(dayFormatter.formatToParts(date).map((p) => [p.type, p.value]))
  return `${parts.year}-${parts.month}-${parts.day}`
}

/** 关联字段的值可能是 ID，也可能是已填充的文档 */
function relationId(value: unknown): number | string | undefined {
  if (typeof value === 'number' || (typeof value === 'string' && value !== '')) return value
  if (value && typeof value === 'object' && 'id' in value) {
    const { id } = value as { id: unknown }
    if (typeof id === 'number' || typeof id === 'string') return id
  }
  return undefined
}

/** 标题自动生成：「课程名称 · 校区名称（或“线上”） · 开班日期」，便于后台列表与关联选择时辨认 */
const generateTitle: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  // 局部更新（如只改状态）时，未提交的字段以数据库中的原值为准
  const pick = (key: string): unknown => (key in data ? data[key] : originalDoc?.[key])

  const courseId = relationId(pick('course'))
  const startDate = formatDay(pick('startDate'))
  if (courseId === undefined || !startDate) return data

  const course = await req.payload.findByID({
    collection: 'courses',
    id: courseId,
    depth: 0,
    select: { title: true },
    disableErrors: true,
    req,
  })
  if (!course) return data

  const campusId = relationId(pick('campus'))
  const campus =
    campusId === undefined
      ? null
      : await req.payload.findByID({
          collection: 'campuses',
          id: campusId,
          depth: 0,
          select: { name: true },
          disableErrors: true,
          req,
        })

  data.title = [course.title, campus?.name ?? '线上', startDate].join(' · ')
  return data
}

/** 线下面授 / 双师课堂必须选择校区；线上直播可不填 */
const validateCampus: RelationshipFieldSingleValidation = (value, options) => {
  const mode = (options.siblingData as { mode?: string } | undefined)?.mode
  if (!value && mode && mode !== 'online') return '线下面授 / 双师课堂须选择开班校区'
  return validations.relationship(value, options)
}

const validateEndDate: DateFieldValidation = (value, options) => {
  const start = (options.siblingData as { startDate?: Date | string | null } | undefined)?.startDate
  if (value && start && new Date(value).getTime() < new Date(start).getTime()) {
    return '结课日期不能早于开班日期'
  }
  return validations.date(value, options)
}

export const Cohorts: CollectionConfig = {
  slug: 'cohorts',
  labels: { singular: '开班计划', plural: '开班计划' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'course', 'mode', 'startDate', 'status'],
    group: ADMIN_GROUPS.curriculum,
    hidden: hiddenFromConsultant,
    description: '只展示开班时间与状态，不设置“剩余名额”“倒计时”等紧迫感信息。',
  },
  defaultSort: 'startDate',
  access: {
    // 访客只能看到所属课程已发布的开班计划，避免自动生成的标题泄露草稿课程名称
    read: ({ req }) =>
      hasRole(req.user, 'admin', 'editor') ? true : { 'course._status': { equals: 'published' } },
    create: isStaffEditor,
    update: isStaffEditor,
    delete: isStaffEditor,
  },
  hooks: {
    ...revalidateCollection('cohorts'),
    beforeChange: [generateTitle],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: '标题',
      admin: {
        readOnly: true,
        description: '保存时根据课程、校区与开班日期自动生成',
      },
    },
    {
      name: 'course',
      type: 'relationship',
      relationTo: 'courses',
      label: '课程',
      required: true,
      index: true,
    },
    {
      type: 'row',
      fields: [
        {
          name: 'mode',
          type: 'select',
          label: '授课方式',
          required: true,
          options: DELIVERY_MODE_OPTIONS,
        },
        {
          name: 'campus',
          type: 'relationship',
          relationTo: 'campuses',
          label: '校区',
          admin: { description: '线上直播课程可不填' },
          validate: validateCampus,
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'startDate',
          type: 'date',
          label: '开班日期',
          required: true,
          index: true,
          admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'yyyy-MM-dd' } },
        },
        {
          name: 'endDate',
          type: 'date',
          label: '结课日期',
          admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'yyyy-MM-dd' } },
          validate: validateEndDate,
        },
      ],
    },
    {
      name: 'status',
      type: 'select',
      label: '状态',
      required: true,
      defaultValue: 'enrolling',
      options: COHORT_STATUS_OPTIONS,
    },
    {
      name: 'note',
      type: 'text',
      label: '备注',
      admin: { description: '如：周末班、需自备电脑。不写“仅剩 X 席”等紧迫性表述。' },
    },
  ],
}
