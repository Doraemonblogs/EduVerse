import type { SeedCampusDetail } from '../types'

/**
 * 校区详情。楼宇名称、门牌号与电话均为虚构，仅用于演示；
 * 交通指引只给出大致方向，正式上线前需按真实地址核对。
 */
export const campusDetails: SeedCampusDetail[] = [
  {
    slug: 'beijing-haidian',
    address: '北京市海淀区中关村南大街 88 号云帆大厦 6 层',
    transit:
      '地铁 4 号线魏公村站 A 口出，沿中关村南大街向北步行约 8 分钟；附近公交站有多条线路停靠。',
    phone: '010-0000-0001',
    openingHours: '周一至周日 9:00–21:00',
    photoCaptions: ['前台接待区', '三维动画机房', '作品展厅'],
  },
  {
    slug: 'shanghai-xuhui',
    address: '上海市徐汇区宜山路 600 号汇岚创意园 3 号楼 5 层',
    transit: '地铁 3、4、9 号线宜山路站出站后步行约 10 分钟；园区门口设有共享单车停放点。',
    phone: '021-0000-0002',
    openingHours: '周一至周日 9:00–21:00',
    photoCaptions: ['作品评图室', '游戏美术机房', '学员休息区'],
  },
  {
    slug: 'guangzhou-tianhe',
    address: '广州市天河区天河北路 233 号木棉创意园 B 栋 1–3 层',
    transit:
      '地铁 3 号线林和西站或 1 号线体育中心站出站后步行约 12 分钟；天河北路沿线公交站均可到达。',
    phone: '020-0000-0003',
    openingHours: '周一至周六 9:00–21:00，周日 10:00–18:00',
    photoCaptions: ['一层多功能厅', '平面设计教室', '剪辑与调色机房'],
  },
  {
    slug: 'shenzhen-nanshan',
    address: '深圳市南山区科技南十二路 18 号海岚科创大厦 9 层',
    transit: '地铁 1 号线高新园站出站后步行约 12 分钟；科技园片区公交站步行约 5 分钟。',
    phone: '0755-0000-0004',
    openingHours: '周一至周日 9:00–21:00',
    photoCaptions: ['前台接待区', '特效合成机房', '动态设计工作坊'],
  },
  {
    slug: 'chengdu-gaoxin',
    address: '成都市高新区天府大道中段 666 号锦屿中心 B 座 12 层',
    transit: '地铁 1 号线孵化园站出站后步行约 8 分钟；天府大道沿线多条公交线路可到达。',
    phone: '028-0000-0005',
    openingHours: '周一至周日 9:30–21:00',
    photoCaptions: ['原画绘画教室', '数位屏练习区', '作品展示墙'],
  },
  {
    slug: 'hangzhou-binjiang',
    address: '杭州市滨江区江南大道 3888 号星澜大厦 7 层',
    transit: '地铁 1 号线滨和路站出站后步行约 10 分钟；江南大道沿线公交站步行约 3 分钟。',
    phone: '0571-0000-0006',
    openingHours: '周一至周日 9:00–21:30',
    photoCaptions: ['动作捕捉体验室', '小班评图室', 'UI 设计教室'],
  },
]
