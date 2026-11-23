/** 手机号脱敏：13812345678 → 138****5678（推送到群聊时使用，个人信息最小化） */
export function maskPhone(phone: string): string {
  return /^\d{11}$/.test(phone) ? `${phone.slice(0, 3)}****${phone.slice(7)}` : phone
}
