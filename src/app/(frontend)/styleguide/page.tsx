import { ArrowRight, Phone } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Container } from '@/components/common/container'
import { Section, type SectionTone } from '@/components/common/section'
import { SectionHeading } from '@/components/common/section-heading'
import { ContrastTable } from '@/components/styleguide/contrast-table'
import { TokenSwatches } from '@/components/styleguide/token-swatches'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { zh } from '@/i18n/zh'

/**
 * 设计规范页（开发工具）：展示设计令牌与基础组件，供评审视觉方向。
 * 开发环境始终可见；生产环境需设置 ENABLE_STYLEGUIDE=true，且不被搜索引擎收录。
 */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '设计规范',
  robots: { index: false, follow: false },
}

function isEnabled() {
  return process.env.NODE_ENV !== 'production' || process.env.ENABLE_STYLEGUIDE === 'true'
}

const PALETTE = [
  {
    title: '石墨（深色区块、正文）',
    swatches: [
      { name: 'color-ink-950', label: '石墨 950 · 深色底' },
      { name: 'color-ink-900', label: '石墨 900' },
      { name: 'color-ink-800', label: '石墨 800 · 深色卡片' },
      { name: 'color-ink-700', label: '石墨 700 · 深色描边' },
      { name: 'color-ink-500', label: '石墨 500 · 次要文字' },
      { name: 'color-ink-400', label: '石墨 400 · 深底次要文字' },
    ],
  },
  {
    title: '纸张 · 品牌 · 状态',
    swatches: [
      { name: 'color-white', label: '白' },
      { name: 'color-paper', label: '纸张 · 浅底区块' },
      { name: 'color-line', label: '分隔线' },
      { name: 'color-brand-500', label: '电光橙 · CTA' },
      { name: 'color-brand-700', label: '橙 700 · 浅底强调字' },
      { name: 'color-danger-500', label: '错误' },
    ],
  },
]

const TYPE_SCALE = [
  { className: 'text-display', spec: 'Display · 40→80px / 1.08 / 700', sample: '让作品替你说话' },
  { className: 'text-h1', spec: 'H1 · 32→52px / 1.18 / 700', sample: '3D 动画设计长期就业班' },
  { className: 'text-h2', spec: 'H2 · 26→40px / 1.25 / 700', sample: '热门专业方向' },
  { className: 'text-h3', spec: 'H3 · 20→24px / 1.4 / 600', sample: '阶段二：角色建模与 UV' },
  { className: 'text-h4', spec: 'H4 · 18px / 1.5 / 600', sample: '适合人群' },
  {
    className: 'text-lg',
    spec: 'Large · 18px / 1.7',
    sample: '从零基础到能独立完成商业项目，系统掌握行业主流工作流程。',
  },
  {
    className: 'text-base',
    spec: 'Body · 16px / 1.7',
    sample:
      '课程以真实项目为主线，每个阶段都有作品产出。课后由讲师逐一点评，帮助你在毕业前建立一份能拿去面试的作品集。Blender、Maya 与 Unreal Engine 均有涉及。',
  },
  {
    className: 'text-sm',
    spec: 'Small · 14px / 1.6',
    sample: '开班时间以校区通知为准，名额有限请提前咨询。',
  },
  {
    className: 'text-xs',
    spec: 'Caption · 12px / 1.5',
    sample: '薪资数据来源：示例数据，仅供参考，不作为培训效果承诺。',
  },
]

const SPACING = [1, 2, 3, 4, 6, 8, 10, 12, 16, 20, 24]

const PLACEHOLDER_ART = [
  {
    aspect: 'aspect-[3/4]',
    from: 'oklch(0.62 0.13 200)',
    to: 'oklch(0.28 0.06 240)',
    title: '雨夜街角',
    meta: '场景概念 · Blender',
  },
  {
    aspect: 'aspect-square',
    from: 'oklch(0.78 0.12 85)',
    to: 'oklch(0.45 0.1 40)',
    title: '沙漠信使',
    meta: '角色设计 · Photoshop',
  },
  {
    aspect: 'aspect-[4/5]',
    from: 'oklch(0.55 0.09 150)',
    to: 'oklch(0.22 0.04 170)',
    title: '温室',
    meta: '室内渲染 · UE5',
  },
  {
    aspect: 'aspect-[4/3]',
    from: 'oklch(0.7 0.14 20)',
    to: 'oklch(0.3 0.08 10)',
    title: '霓虹面馆',
    meta: '游戏场景 · Maya',
  },
  {
    aspect: 'aspect-[3/4]',
    from: 'oklch(0.82 0.05 240)',
    to: 'oklch(0.4 0.05 260)',
    title: '天气应用',
    meta: 'UI 设计 · Figma',
  },
  {
    aspect: 'aspect-square',
    from: 'oklch(0.66 0.1 120)',
    to: 'oklch(0.3 0.05 100)',
    title: '机械臂',
    meta: '硬表面 · 3ds Max',
  },
]

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <h3 className="text-h4 text-foreground">{title}</h3>
      {children}
    </div>
  )
}

function ComponentShowcase({ tone }: { tone: SectionTone }) {
  const id = `sg-${tone}`
  return (
    <div className="grid gap-12 lg:grid-cols-2">
      <Block title="按钮">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button>预约试听</Button>
            <Button variant="secondary">了解课程</Button>
            <Button variant="outline">领取资料</Button>
            <Button variant="ghost">查看作品</Button>
            <Button variant="link" asChild>
              <Link href="#">
                查看全部 <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg">
              免费预约试听 <ArrowRight aria-hidden />
            </Button>
            <Button size="sm" variant="outline">
              <Phone aria-hidden /> 电话咨询
            </Button>
            <Button size="icon" variant="outline" aria-label="电话咨询">
              <Phone aria-hidden />
            </Button>
            <Button disabled>提交中…</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>长期就业班</Badge>
            <Badge variant="outline">线下 · 双师</Badge>
            <Badge variant="emphasis">近期开班</Badge>
            <Badge variant="inverse">精选作品</Badge>
          </div>
        </div>
      </Block>

      <Block title="表单（留资字段示例）">
        <form className="grid max-w-md gap-5" aria-label="表单样式示例" action="#">
          <div className="grid gap-2">
            <Label htmlFor={`${id}-name`}>姓名</Label>
            <Input id={`${id}-name`} placeholder="怎么称呼你" autoComplete="name" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${id}-phone`}>
              手机号
              <span aria-hidden className="text-destructive">
                *
              </span>
            </Label>
            <Input
              id={`${id}-phone`}
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              required
              defaultValue="1381234"
              aria-invalid
              aria-describedby={`${id}-phone-error`}
            />
            <p id={`${id}-phone-error`} className="text-sm text-destructive">
              请输入 11 位中国大陆手机号
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${id}-message`}>留言（选填）</Label>
            <Textarea id={`${id}-message`} rows={3} placeholder="想了解的专业、上课时间等" />
          </div>
          <div className="flex items-start gap-3">
            <Checkbox id={`${id}-consent`} className="mt-0.5" />
            <Label htmlFor={`${id}-consent`} className="font-normal text-muted-foreground">
              我已阅读并同意《隐私政策》
            </Label>
          </div>
          <Button type="button" block>
            立即预约
          </Button>
        </form>
      </Block>
    </div>
  )
}

export default function StyleguidePage() {
  if (!isEnabled()) notFound()

  return (
    <>
      <Section tone="dark" spacing="sm">
        <Container className="flex flex-col gap-8">
          <SectionHeading
            as="h1"
            eyebrow="Design System · v0.1"
            title="EduVerse 设计规范"
            description="设计令牌与基础组件。作品是主角：大面积石墨深色衬托作品，电光橙只留给转化动作，克制的小圆角，不使用装饰性图标与渐变背景。"
          />
          <ul className="grid gap-4 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
            <li className="border-t border-border pt-3">
              <span className="text-foreground">作品优先</span> · 深色区块与大图承载学员作品
            </li>
            <li className="border-t border-border pt-3">
              <span className="text-foreground">橙色 = 行动</span> · 品牌橙仅用于 CTA，配近黑文字
            </li>
            <li className="border-t border-border pt-3">
              <span className="text-foreground">节奏</span> · 白 / 米 / 深三种区块交替
            </li>
            <li className="border-t border-border pt-3">
              <span className="text-foreground">可读</span> · 正文 16px / 1.7，对比度全部 ≥ AA
            </li>
          </ul>
        </Container>
      </Section>

      <Section>
        <Container className="flex flex-col gap-12">
          <SectionHeading
            eyebrow="Color"
            title="色彩"
            description="原始色板。组件不直接使用这些值，而是通过语义令牌引用。"
          />
          {PALETTE.map((group) => (
            <Block key={group.title} title={group.title}>
              <TokenSwatches swatches={group.swatches} />
            </Block>
          ))}
        </Container>
      </Section>

      <Section tone="paper">
        <Container className="flex flex-col gap-10">
          <SectionHeading
            eyebrow="Contrast"
            title="语义令牌与对比度"
            description="三种区块下的实测对比度（与单元测试使用同一份组合清单）。"
          />
          <div className="grid gap-6 lg:grid-cols-3">
            {(['light', 'paper', 'dark'] as const).map((tone) => (
              <Section
                key={tone}
                as="div"
                tone={tone}
                spacing="none"
                className="rounded-md border border-border p-5"
              >
                <p className="eyebrow mb-3 text-muted-foreground">
                  {tone === 'light' ? '浅色区块' : tone === 'paper' ? '米色区块' : '深色区块'}
                </p>
                <ContrastTable />
              </Section>
            ))}
          </div>
        </Container>
      </Section>

      <Section>
        <Container className="flex flex-col gap-10">
          <SectionHeading
            eyebrow="Typography"
            title="字体与字号"
            description="中文使用系统字体（苹方 / 微软雅黑 / 思源黑体），不下载中文字体；标题中的西文与数字使用自托管的 Space Grotesk。"
          />
          <dl className="flex flex-col">
            {TYPE_SCALE.map((item) => (
              <div
                key={item.className}
                className="grid gap-2 border-t border-border py-6 md:grid-cols-[14rem_1fr] md:gap-8"
              >
                <dt className="font-mono text-xs text-muted-foreground">{item.spec}</dt>
                <dd
                  className={`${item.className} ${item.className.startsWith('text-h') || item.className === 'text-display' ? 'font-bold' : ''}`}
                >
                  {item.sample}
                </dd>
              </div>
            ))}
          </dl>
          <div className="grid gap-6 border-t border-border pt-8 sm:grid-cols-3">
            {[
              ['8', '个专业方向'],
              ['24', '门系统课程'],
              ['6', '个城市校区'],
            ].map(([num, label]) => (
              <div key={label} className="flex flex-col gap-1">
                <span className="numeric text-h1 font-semibold">{num}</span>
                <span className="text-sm text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <Section tone="paper">
        <Container className="grid gap-12 lg:grid-cols-2">
          <Block title="间距（4px 基础刻度）">
            <ul className="flex flex-col gap-2">
              {SPACING.map((step) => (
                <li key={step} className="flex items-center gap-4 text-xs">
                  <span className="w-16 shrink-0 font-mono text-muted-foreground">
                    {step} · {step * 4}px
                  </span>
                  <span className="h-3 bg-foreground" style={{ width: `${step * 4}px` }} />
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground">
              版式级：左右留白 <code className="font-mono">gutter</code> 16→40px；区块上下留白{' '}
              <code className="font-mono">section</code> 56→120px；版心 1280px，宽版 1440px，正文
              736px。
            </p>
          </Block>
          <div className="flex flex-col gap-12">
            <Block title="圆角（克制）">
              <div className="flex flex-wrap gap-4">
                {[
                  ['rounded-xs', '2px · 标签'],
                  ['rounded-sm', '4px · 按钮 / 输入框'],
                  ['rounded-md', '6px · 卡片 / 图片'],
                  ['rounded-lg', '10px · 弹窗'],
                ].map(([cls, label]) => (
                  <div key={cls} className="flex flex-col items-start gap-2">
                    <div className={`size-16 border-2 border-foreground bg-background ${cls}`} />
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </Block>
            <Block title="阴影（仅用于浮层）">
              <div className="flex flex-wrap gap-6">
                {[
                  ['shadow-xs', 'xs'],
                  ['shadow-sm', 'sm · 吸顶栏'],
                  ['shadow-md', 'md · 下拉菜单'],
                  ['shadow-lg', 'lg · 弹窗'],
                ].map(([cls, label]) => (
                  <div
                    key={cls}
                    className={`flex size-24 items-end rounded-md bg-white p-2 text-xs text-ink-500 ${cls}`}
                  >
                    {label}
                  </div>
                ))}
              </div>
            </Block>
          </div>
        </Container>
      </Section>

      {(['light', 'paper', 'dark'] as const).map((tone) => (
        <Section key={tone} tone={tone}>
          <Container className="flex flex-col gap-10">
            <SectionHeading
              eyebrow="Components"
              title={
                tone === 'light'
                  ? '组件 · 浅色区块'
                  : tone === 'paper'
                    ? '组件 · 米色区块'
                    : '组件 · 深色区块'
              }
            />
            <ComponentShowcase tone={tone} />
          </Container>
        </Section>
      ))}

      <Section tone="dark">
        <Container size="wide" className="flex flex-col gap-10">
          <SectionHeading
            eyebrow="Student Works"
            title="区块示例：学员作品"
            description="示意视觉方向。色块为占位，非真实作品；正式图片在 M1 由脚本本地生成。"
            actions={
              <Button variant="outline" asChild>
                <Link href="#">
                  全部作品 <ArrowRight aria-hidden />
                </Link>
              </Button>
            }
          />
          <ul className="columns-2 gap-3 md:columns-3 md:gap-4 lg:gap-5">
            {PLACEHOLDER_ART.map((art) => (
              <li key={art.title} className="mb-3 break-inside-avoid md:mb-4 lg:mb-5">
                <figure className="group relative overflow-hidden rounded-md">
                  <div
                    className={`${art.aspect} w-full transition-transform duration-500 ease-out-expo group-hover:scale-[1.03]`}
                    style={{ background: `linear-gradient(160deg, ${art.from}, ${art.to})` }}
                  />
                  <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-3 pt-10 text-white md:p-4">
                    <p className="text-sm font-semibold md:text-base">{art.title}</p>
                    <p className="text-xs text-white/80">{art.meta}</p>
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-4 border-t border-border pt-8">
            <p className="mr-auto text-lg">想做出这样的作品？先来听一节试听课。</p>
            <Button size="lg">
              免费预约试听 <ArrowRight aria-hidden />
            </Button>
          </div>
        </Container>
      </Section>

      <Section tone="paper" spacing="sm">
        <Container className="flex flex-col gap-6">
          <h2 className="text-h3">加载占位</h2>
          <div className="grid gap-4 sm:grid-cols-3" role="status" aria-busy="true">
            <span className="sr-only">{zh.a11y.loading}</span>
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-col gap-3">
                <Skeleton className="aspect-[4/3]" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
          <Separator />
          <p className="text-xs text-muted-foreground">
            本页仅用于开发评审，生产环境默认 404（ENABLE_STYLEGUIDE=true
            时开放），且禁止搜索引擎收录。
          </p>
        </Container>
      </Section>
    </>
  )
}
