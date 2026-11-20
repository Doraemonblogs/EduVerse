import type { SeedCareerEvent } from '../types'

/**
 * 就业服务活动（企业与活动均为虚构，仅用于演示）。
 * daysFromNow 相对种子执行当天计算，负数表示已举办。
 */
export const careerEvents: SeedCareerEvent[] = [
  {
    title: '校园双选会',
    daysFromNow: -30,
    location: '广州天河校区 1 层多功能厅',
    campus: 'guangzhou-tianhe',
    description:
      '邀请游戏、动画、品牌设计等方向的合作企业到校设展，学员可携带作品集与企业代表面对面交流，了解岗位要求与招聘流程。',
    registrationNote: '面向在读学员与近两届毕业学员，凭学员证入场，无需另行登记。',
  },
  {
    title: '线上招聘宣讲：游戏与互联网专场',
    daysFromNow: 7,
    location: '线上直播',
    description:
      '多家游戏与互联网合作企业的招聘负责人在线介绍团队与在招岗位，并解读美术、设计类岗位的作品集要求，直播后设有问答环节。',
    registrationNote: '在课程顾问处登记后，活动前一天会收到直播入口与观看说明。',
  },
  {
    title: '作品集评审日',
    daysFromNow: 21,
    location: '上海徐汇校区 5 层评图室',
    campus: 'shanghai-xuhui',
    description:
      '由讲师与受邀的企业美术负责人组成评审小组，对学员作品集逐份点评，从作品取舍、排版顺序到项目说明给出具体的修改建议。',
    registrationNote: '提前在校区前台或课程顾问处登记，并在活动前三天提交作品集 PDF。',
  },
  {
    title: '企业开放日：走进后期与动态设计团队',
    daysFromNow: 45,
    location: '深圳南山校区集合，统一前往合作企业',
    campus: 'shenzhen-nanshan',
    description:
      '组织学员走进合作的影视后期与动态设计团队，参观制作现场，了解一个项目从需求沟通、制作排期到交付验收的协作过程。',
    registrationNote: '提前在校区前台或课程顾问处登记，名额有限，按登记先后安排。',
  },
]
