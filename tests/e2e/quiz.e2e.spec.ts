import type { Locator, Page } from '@playwright/test'
import { getPayload, type Where } from 'payload'

import { parseQuizResult } from '../../src/lib/quiz/result'
import config from '../../src/payload.config.js'
import {
  deleteLeadsByPhone,
  findLeadByPhone,
  leadNamespace,
  testIp,
  testPhone,
} from '../helpers/leads'
import { expect, test } from './fixtures'

/**
 * 职业测试 /quiz：开始页（标题区、SEO、BreadcrumbList）→ 每屏一题（fieldset + legend 单选、进度、
 * 未选择不能进入下一题、上一题保留答案、键盘操作）→ 结果摘要（推荐方向、了解该专业）→ 留资后展开完整报告
 * （线索 intent=quiz、position=quiz_result、quizResult 可解析、专业方向为推荐方向）→ 本会话再次进入直接显示 → 重新测试。
 * 题目、专业方向与文案从数据库读取（与页面同一个开发库），推荐结果在测试里独立计分得出，不写死种子内容。
 * 提交线索的用例用 leadNamespace('quiz', …) 取本文件专属的手机号与模拟 IP，结束后清理。
 */

// 开发服务器首次访问某个路由时要现编译，留足时间
test.describe.configure({ timeout: 120_000 })

const PATH = '/quiz'

/** 广告法：页面上不得出现的绝对化用语与效果承诺 */
const BANNED = /最好|第一|顶级|唯一|包就业|保证|高薪|就业率|承诺/

const published = { _status: { equals: 'published' } } as const satisfies Where

type QuizFacts = {
  intro: { title: string; description: string; startLabel: string }
  result: {
    summaryTitle: string
    gatedTitle: string
    unlockLabel: string
    reportTitle: string
    nextStepsTitle: string
    nextSteps: string[]
  }
  seo: { title: string; description: string }
  /** 已发布的专业方向（后台排序：同分时靠前的优先） */
  disciplines: { id: number; name: string; shortName: string; slug: string; tagline: string }[]
  /** 题目（后台排序），选项加分只保留已发布的专业方向 */
  questions: {
    id: number
    question: string
    options: { label: string; scores: { disciplineId: number; weight: number }[] }[]
  }[]
}

function relationId(value: unknown): number | null {
  if (typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value && typeof value.id === 'number') {
    return value.id
  }
  return null
}

/** 从数据库读取职业测试的设置、题目与已发布的专业方向（过滤条件与数据层 src/lib/data/quiz.ts 一致） */
async function readQuiz(): Promise<QuizFacts> {
  const payload = await getPayload({ config })
  const [settings, disciplines, questions] = await Promise.all([
    payload.findGlobal({ slug: 'quiz-settings', depth: 0 }),
    payload.find({
      collection: 'disciplines',
      where: published,
      sort: ['order', 'id'],
      pagination: false,
      depth: 0,
      select: { name: true, shortName: true, slug: true, tagline: true },
    }),
    payload.find({
      collection: 'quiz-questions',
      sort: ['order', 'id'],
      pagination: false,
      depth: 0,
      select: { question: true, options: true },
    }),
  ])
  const ids = new Set(disciplines.docs.map((d) => d.id))
  expect(settings.intro?.title?.trim(), '种子数据应填写开始页标题').toBeTruthy()
  expect(settings.seo?.title?.trim(), '种子数据应填写 SEO 标题').toBeTruthy()
  return {
    intro: {
      title: settings.intro!.title!.trim(),
      description: settings.intro?.description?.trim() ?? '',
      startLabel: settings.intro?.startLabel?.trim() ?? '',
    },
    result: {
      summaryTitle: settings.result?.summaryTitle?.trim() ?? '',
      gatedTitle: settings.result?.gatedTitle?.trim() ?? '',
      unlockLabel: settings.result?.unlockLabel?.trim() ?? '',
      reportTitle: settings.result?.reportTitle?.trim() ?? '',
      nextStepsTitle: settings.result?.nextStepsTitle?.trim() ?? '',
      nextSteps: (settings.result?.nextSteps ?? []).map((s) => s.title?.trim() ?? ''),
    },
    seo: {
      title: settings.seo!.title!.trim(),
      description: settings.seo?.description?.trim() ?? '',
    },
    disciplines: disciplines.docs.map((d) => ({
      id: d.id,
      name: d.name,
      shortName: d.shortName?.trim() || d.name,
      slug: d.slug,
      tagline: d.tagline?.trim() ?? '',
    })),
    questions: questions.docs
      .map((q) => ({
        id: q.id,
        question: q.question.trim(),
        options: (q.options ?? []).map((option) => ({
          label: option.label.trim(),
          scores: (option.scores ?? []).flatMap((score) => {
            const disciplineId = relationId(score.discipline)
            const weight = Number(score.weight)
            return disciplineId !== null && ids.has(disciplineId) && weight > 0
              ? [{ disciplineId, weight }]
              : []
          }),
        })),
      }))
      .filter((q) => q.options.length > 0),
  }
}

/**
 * 答题方案：每道题选给 target 方向加分最多的选项（都不加分时选第一个），
 * 再独立计分得出页面应给出的推荐方向与各方向得分（同分按后台排序）。
 */
function planAnswers(facts: QuizFacts, targetIndex = 1) {
  const target = facts.disciplines[Math.min(targetIndex, facts.disciplines.length - 1)]!
  const answers = facts.questions.map((q) => {
    let best = 0
    let bestWeight = -1
    q.options.forEach((option, index) => {
      const weight = option.scores.find((s) => s.disciplineId === target.id)?.weight ?? 0
      if (weight > bestWeight) {
        best = index
        bestWeight = weight
      }
    })
    return best
  })
  const order = new Map(facts.disciplines.map((d, index) => [d.id, index]))
  const totals = new Map(facts.disciplines.map((d) => [d.id, 0]))
  answers.forEach((option, index) => {
    for (const { disciplineId, weight } of facts.questions[index]!.options[option]!.scores) {
      totals.set(disciplineId, totals.get(disciplineId)! + weight)
    }
  })
  const ranking = [...totals.entries()]
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score || order.get(a.id)! - order.get(b.id)!)
  const sum = ranking.reduce((acc, item) => acc + item.score, 0)
  const top = ranking[0]!
  expect(top.score, '答题方案应能给出推荐方向').toBeGreaterThan(0)
  const recommended = facts.disciplines.find((d) => d.id === top.id)!
  return { answers, ranking, recommended, topPercent: Math.round((top.score / sum) * 100) }
}

/** 推荐方向的已发布课程标题 */
async function readCourseTitles(disciplineId: number): Promise<string[]> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'courses',
    where: { and: [published, { discipline: { equals: disciplineId } }] },
    pagination: false,
    depth: 0,
    select: { title: true },
  })
  return docs.map((doc) => doc.title)
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow, '页面不应出现横向滚动').toBe(0)
}

/** 打开测试页，等开始按钮可用（水合完成） */
async function openQuiz(page: Page, facts: QuizFacts) {
  await page.goto(PATH)
  await expect(page.getByRole('button', { name: facts.intro.startLabel })).toBeEnabled()
}

const legend = (page: Page) => page.locator('fieldset legend')
const progress = (page: Page) => page.getByRole('progressbar', { name: '答题进度' })

/**
 * 等元素停稳（连续 10 帧位置不变）。`force` 点击会跳过 Playwright 的“位置稳定”检查，
 * 换屏后的平滑滚动还没结束时会点在旧坐标上。
 */
async function waitUntilStill(locator: Locator) {
  await locator.evaluate(
    (element) =>
      new Promise<void>((resolve) => {
        let last = ''
        let stillFrames = 0
        const tick = () => {
          const rect = element.getBoundingClientRect()
          const position = `${rect.left},${rect.top}`
          stillFrames = position === last ? stillFrames + 1 : 0
          last = position
          if (stillFrames >= 10) resolve()
          else requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }),
  )
}

/** 从开始页答完全部题目，到达结果页 */
async function completeQuiz(page: Page, facts: QuizFacts, answers: readonly number[]) {
  const total = facts.questions.length
  for (const [index, option] of answers.entries()) {
    await expect(legend(page)).toHaveText(facts.questions[index]!.question)
    await page.getByRole('radio').nth(option).check()
    const last = index === total - 1
    await page.getByRole('button', { name: last ? '查看结果' : '下一题' }).click()
  }
}

/** 结果摘要标题（h2，名称为“摘要标题 推荐方向名称”） */
const summaryHeading = (page: Page, facts: QuizFacts, name: string) =>
  page.getByRole('heading', { level: 2, name: `${facts.result.summaryTitle} ${name}`, exact: true })

test.describe('职业测试', () => {
  test('开始页：面包屑、标题（h1）与说明来自后台，题量与涵盖的方向；水合后开始按钮可用', async ({
    page,
  }) => {
    const facts = await readQuiz()
    await openQuiz(page, facts)

    const breadcrumb = page.getByRole('navigation', { name: '面包屑' })
    await expect(breadcrumb.getByRole('link', { name: '首页' })).toBeVisible()
    await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText('职业测试')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(facts.intro.title)
    if (facts.intro.description) {
      await expect(page.getByText(facts.intro.description, { exact: true })).toBeVisible()
    }
    await expect(page.getByText(`${facts.questions.length} 道单选题`)).toBeAttached()
    const coverage = page.getByRole('heading', { name: '测试涵盖的方向' }).locator('..')
    await expect(coverage.getByRole('listitem')).toHaveText(
      facts.disciplines.map((d) => d.shortName),
    )
    // 开始前没有题目
    await expect(page.locator('fieldset')).toHaveCount(0)
    await expectNoHorizontalOverflow(page)
  })

  test('SEO：标题与描述来自后台 SEO 字段，规范地址 /quiz 可收录；BreadcrumbList 两级', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, '与视口无关，桌面端验证一次')
    const facts = await readQuiz()
    await page.goto(PATH)
    await expect(page).toHaveTitle(facts.seo.title)
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      facts.seo.description,
    )
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(new URL(canonical!).pathname).toMatch(/\/quiz$/)
    expect(await page.locator('meta[name="robots"]').count()).toBe(0)

    const nodes = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((scripts) => scripts.map((s) => JSON.parse(s.textContent ?? '{}')))
    const breadcrumb = nodes.find((node) => node['@type'] === 'BreadcrumbList')
    expect(breadcrumb?.itemListElement).toHaveLength(2)
    expect(breadcrumb?.itemListElement[1]).toMatchObject({ position: 2, name: '职业测试' })
    expect(new URL(breadcrumb?.itemListElement[1].item).pathname).toMatch(/\/quiz$/)

    const main = await page.getByRole('main').evaluate((node) => node.textContent ?? '')
    expect(main).not.toMatch(BANNED)
  })

  test('答题：每屏一题（fieldset + legend 单选组）与进度；未选择不能进入下一题；上一题保留已选答案', async ({
    page,
    isMobile,
  }) => {
    const facts = await readQuiz()
    const total = facts.questions.length
    const [first, second] = facts.questions
    await openQuiz(page, facts)
    await page.getByRole('button', { name: facts.intro.startLabel }).click()

    await expect(page.locator('fieldset')).toHaveCount(1)
    await expect(legend(page)).toHaveText(first!.question)
    await expect(page.getByRole('group', { name: first!.question })).toBeVisible()
    await expect(page.getByRole('radio')).toHaveCount(first!.options.length)
    for (const option of first!.options) {
      await expect(page.getByRole('radio', { name: option.label, exact: true })).not.toBeChecked()
    }
    await expect(page.getByText(`第 1 / ${total} 题`)).toBeVisible()
    await expect(progress(page)).toHaveAttribute('aria-valuetext', `第 1 / ${total} 题`)
    // 第 1 题没有“上一题”；焦点已移到第一个选项
    await expect(page.getByRole('button', { name: '上一题' })).toHaveCount(0)
    await expect(page.getByRole('radio').first()).toBeFocused()

    // 未选择：“下一题”不可用（aria-disabled，仍可聚焦）；用键盘触发只给出提示，停留在本题
    const next = page.getByRole('button', { name: '下一题' })
    await expect(next).toHaveAttribute('aria-disabled', 'true')
    await next.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('status').filter({ hasText: '请选择一个选项后继续' })).toBeVisible()
    await expect(legend(page)).toHaveText(first!.question)
    await expect(progress(page)).toHaveAttribute('aria-valuetext', `第 1 / ${total} 题`)

    // 选择后可以进入下一题，提示消失
    const chosen = Math.min(2, first!.options.length - 1)
    await page.getByRole('radio', { name: first!.options[chosen]!.label, exact: true }).check()
    await expect(next).not.toHaveAttribute('aria-disabled', 'true')
    await expect(page.getByText('请选择一个选项后继续')).toHaveCount(0)
    await next.click()
    await expect(legend(page)).toHaveText(second!.question)
    await expect(progress(page)).toHaveAttribute('aria-valuetext', `第 2 / ${total} 题`)
    await expect(page.getByRole('radio', { checked: true })).toHaveCount(0)

    // 未选择时用鼠标点 / 手指轻触“下一题”（aria-disabled 仍响应指针）：同样只给出提示，停留在本题
    expect(total, '种子题目应多于 2 道（第 2 题的按钮是“下一题”）').toBeGreaterThan(2)
    await expect(next).toHaveAttribute('aria-disabled', 'true')
    await expect(page.getByText('请选择一个选项后继续')).toHaveCount(0)
    expect(await next.evaluate((el) => getComputedStyle(el).pointerEvents)).not.toBe('none')
    // Playwright 把 aria-disabled 视为不可操作而一直等待，用 force 跳过检查；
    // 仍在按钮位置派发真实的指针事件——按钮屏蔽指针事件时会落到外层容器上，提示不会出现。
    // force 同时跳过了“位置稳定”检查：换题后答题区会平滑滚入视口，先等按钮停稳，否则会点在滚动中的旧位置上
    await waitUntilStill(next)
    if (isMobile) await next.tap({ force: true })
    else await next.click({ force: true })
    await expect(page.getByRole('status').filter({ hasText: '请选择一个选项后继续' })).toBeVisible()
    await expect(legend(page)).toHaveText(second!.question)
    await expect(progress(page)).toHaveAttribute('aria-valuetext', `第 2 / ${total} 题`)

    // 上一题：回到第 1 题，之前的选择仍在
    await page.getByRole('button', { name: '上一题' }).click()
    await expect(legend(page)).toHaveText(first!.question)
    await expect(
      page.getByRole('radio', { name: first!.options[chosen]!.label, exact: true }),
    ).toBeChecked()
    await expect(page.getByRole('radio', { name: first!.options[chosen]!.label })).toBeFocused()
    await expectNoHorizontalOverflow(page)
  })

  test('键盘：回车开始、方向键选择、在选项上回车进入下一题，焦点随换屏移到选项', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, '键盘操作在桌面端验证')
    const facts = await readQuiz()
    const [first, second] = facts.questions
    await openQuiz(page, facts)

    await page.getByRole('button', { name: facts.intro.startLabel }).focus()
    await page.keyboard.press('Enter')
    await expect(legend(page)).toHaveText(first!.question)
    const radios = page.getByRole('radio')
    await expect(radios.first()).toBeFocused()

    // 方向键在单选组内移动并选中
    await page.keyboard.press('ArrowDown')
    await expect(radios.nth(1)).toBeChecked()
    await expect(radios.nth(1)).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(legend(page)).toHaveText(second!.question)
    await expect(radios.first()).toBeFocused()

    // 空格选中当前选项，回车进入下一题
    await page.keyboard.press('Space')
    await expect(radios.first()).toBeChecked()
    await page.keyboard.press('Enter')
    await expect(legend(page)).toHaveText(facts.questions[2]!.question)
  })

  test('结果摘要：推荐方向（名称、tagline）与“了解该专业”链接可访问；完整报告在留资前不显示', async ({
    page,
  }) => {
    const facts = await readQuiz()
    const plan = planAnswers(facts)
    await openQuiz(page, facts)
    await page.getByRole('button', { name: facts.intro.startLabel }).click()
    await completeQuiz(page, facts, plan.answers)

    const heading = summaryHeading(page, facts, plan.recommended.name)
    await expect(heading).toBeVisible()
    await expect(heading).toBeFocused()
    const summary = page.getByRole('region', {
      name: `${facts.result.summaryTitle} ${plan.recommended.name}`,
      exact: true,
    })
    if (plan.recommended.tagline) await expect(summary).toContainText(plan.recommended.tagline)

    // 完整报告未展开：只有留资区（页面以表单收尾，页脚的行动号召横幅隐藏）
    await expect(page.getByRole('heading', { name: facts.result.reportTitle })).toHaveCount(0)
    const gate = page.getByRole('region', { name: facts.result.gatedTitle })
    await expect(gate).toBeVisible()
    await expect(gate.locator('input[name="intent"]')).toHaveValue('quiz')
    await expect(gate.locator('input[name="position"]')).toHaveValue('quiz_result')
    await expect(gate.getByLabel('意向专业')).toHaveValue(String(plan.recommended.id))
    const hidden = await gate.locator('input[name="quizResult"]').inputValue()
    expect(parseQuizResult(hidden)?.recommended?.id).toBe(plan.recommended.id)
    await expect(page.locator('[data-footer-cta]')).toBeHidden()
    await expectNoHorizontalOverflow(page)

    const link = summary.getByRole('link', { name: `了解${plan.recommended.shortName}` })
    const href = await link.getAttribute('href')
    expect(href).toMatch(new RegExp(`/majors/${plan.recommended.slug}$`))
    const response = await page.request.get(href!)
    expect(response.status()).toBe(200)
    await link.click()
    await expect(page).toHaveURL(new RegExp(`/majors/${plan.recommended.slug}$`))
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(plan.recommended.name)
  })

  test('留资后展开完整报告：线索记录 intent=quiz、position=quiz_result、可解析的 quizResult 与推荐方向；本会话再次进入直接显示', async ({
    page,
  }, testInfo) => {
    const ns = leadNamespace('quiz', testInfo)
    const ip = testIp(ns, 1)
    const phone = testPhone(ns, 1)
    const facts = await readQuiz()
    const plan = planAnswers(facts)
    const courseTitles = await readCourseTitles(plan.recommended.id)
    await page.setExtraHTTPHeaders({ 'x-forwarded-for': ip })
    await openQuiz(page, facts)
    try {
      await page.getByRole('button', { name: facts.intro.startLabel }).click()
      await completeQuiz(page, facts, plan.answers)

      const gate = page.getByRole('region', { name: facts.result.gatedTitle })
      await expect(gate.getByRole('button', { name: facts.result.unlockLabel })).toBeEnabled()
      await gate.getByLabel('姓名').fill('测试同学')
      await gate.getByLabel('手机号').fill(phone)
      await gate.getByLabel('所在城市').selectOption('上海')
      await gate.getByRole('checkbox').check()
      // 满足“最短填写时间”防刷规则
      await page.waitForTimeout(2200)
      await gate.getByRole('button', { name: facts.result.unlockLabel }).click()

      // 同一页展开完整报告，焦点移到报告标题；表单位置保留提交成功提示
      const reportHeading = page.getByRole('heading', { level: 2, name: facts.result.reportTitle })
      await expect(reportHeading).toBeVisible()
      await expect(reportHeading).toBeFocused()
      await expect(page.getByRole('heading', { name: '提交成功' })).toBeVisible()
      await expect(page.getByRole('region', { name: facts.result.gatedTitle })).toHaveCount(0)

      const report = page.getByRole('region', { name: facts.result.reportTitle })
      const scores = report.getByRole('region', { name: '各方向得分占比' }).getByRole('listitem')
      await expect(scores).toHaveCount(facts.disciplines.length)
      await expect(scores.first()).toContainText(
        `${plan.recommended.shortName}：得分占比 ${plan.topPercent}%，推荐方向`,
      )
      await expect(scores.first()).toContainText('推荐')
      for (const title of facts.result.nextSteps) {
        await expect(report.getByText(title, { exact: true })).toBeVisible()
      }
      const courses = report.getByRole('region', { name: '推荐课程' })
      const cards = courses.getByRole('article')
      await expect(cards).toHaveCount(Math.min(3, courseTitles.length))
      for (const title of await cards.getByRole('heading', { level: 4 }).allTextContents()) {
        expect(courseTitles).toContain(title)
      }
      await expect(
        courses.getByRole('link', { name: `查看${plan.recommended.shortName}全部课程` }),
      ).toHaveAttribute('href', new RegExp(`/majors/${plan.recommended.slug}$`))
      const main = await page.getByRole('main').evaluate((node) => node.textContent ?? '')
      expect(main).not.toMatch(BANNED)
      await expectNoHorizontalOverflow(page)

      const lead = await findLeadByPhone(phone)
      expect(lead).toMatchObject({
        name: '测试同学',
        intent: 'quiz',
        city: '上海',
        discipline: plan.recommended.id,
        source: { position: 'quiz_result' },
        client: { ip },
      })
      expect(lead?.source?.pageUrl).toContain(PATH)
      const record = parseQuizResult(lead?.context?.quizResult)
      expect(record, '线索里的测试结果应能按约定结构解析').not.toBeNull()
      expect(record?.recommended?.id).toBe(plan.recommended.id)
      expect(record?.answers?.map((a) => a.option)).toEqual(plan.answers)
      expect(record?.answers?.map((a) => a.question)).toEqual(facts.questions.map((q) => q.id))
      expect(record?.scores?.map((s) => s.id)).toEqual(plan.ranking.map((r) => r.id))
      expect(record?.scores?.map((s) => s.score)).toEqual(plan.ranking.map((r) => r.score))

      // 本会话再次进入：直接显示上次结果与完整报告，不再要求留资
      await page.reload()
      await expect(summaryHeading(page, facts, plan.recommended.name)).toBeVisible()
      await expect(reportHeading).toBeVisible()
      await expect(page.getByRole('region', { name: facts.result.gatedTitle })).toHaveCount(0)
      await expect(page.getByRole('heading', { name: '提交成功' })).toHaveCount(0)
      await expect(page.locator('[data-footer-cta]')).toBeVisible()

      // 重新测试后再完成：完整报告直接展开
      await page.getByRole('button', { name: '重新测试' }).click()
      await expect(legend(page)).toHaveText(facts.questions[0]!.question)
      await completeQuiz(page, facts, plan.answers)
      await expect(reportHeading).toBeVisible()
      await expect(page.getByRole('region', { name: facts.result.gatedTitle })).toHaveCount(0)
    } finally {
      await deleteLeadsByPhone(phone)
    }
  })

  test('会话记录：完成后刷新直接显示上次结果（未留资仍显示留资区）；重新测试清空答案回到第 1 题', async ({
    page,
  }) => {
    const facts = await readQuiz()
    const plan = planAnswers(facts, 2)
    const total = facts.questions.length
    await openQuiz(page, facts)
    await page.getByRole('button', { name: facts.intro.startLabel }).click()
    await completeQuiz(page, facts, plan.answers)
    await expect(summaryHeading(page, facts, plan.recommended.name)).toBeVisible()

    await page.reload()
    await expect(summaryHeading(page, facts, plan.recommended.name)).toBeVisible()
    await expect(page.getByRole('region', { name: facts.result.gatedTitle })).toBeVisible()
    await expect(page.getByRole('heading', { name: facts.result.reportTitle })).toHaveCount(0)

    await page.getByRole('button', { name: '重新测试' }).click()
    await expect(legend(page)).toHaveText(facts.questions[0]!.question)
    await expect(progress(page)).toHaveAttribute('aria-valuetext', `第 1 / ${total} 题`)
    await expect(page.getByRole('radio', { checked: true })).toHaveCount(0)
    await expect(page.getByRole('radio').first()).toBeFocused()

    // 重新测试清除了会话记录：刷新回到开始页
    await page.reload()
    await expect(page.getByRole('button', { name: facts.intro.startLabel })).toBeEnabled()
    await expect(page.locator('fieldset')).toHaveCount(0)
  })

  test('从页脚“职业测试”链接进入', async ({ page }) => {
    const facts = await readQuiz()
    await page.goto('/')
    await page.getByRole('contentinfo').getByRole('link', { name: '职业测试', exact: true }).click()
    await expect(page).toHaveURL(/\/quiz$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(facts.intro.title)
  })
})
