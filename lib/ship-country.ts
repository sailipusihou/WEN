/**
 * 配送目的国推断 —— 纯函数，客户端可用。
 *
 * 背景：详情页与购物车页此前都把国家写死成 United States 去调 /api/shipping，
 * 于是所有客户（包括欧洲、亚太、其它地区）看到的都是美加的时效与免邮门槛。
 * 而各分区差距很大：
 *   美加      7–14 天   满 $416.67 免邮
 *   欧洲      10–18 天  满 $555.56
 *   亚太      8–15 天   满 $486.11
 *   其它地区  12–21 天  满 $694.44
 * 写死美国等于对非美客户承诺了并不存在的免邮 —— 客户据此下单、结算时门槛变高，
 * 是要付客服成本的信任问题。
 *
 * 这里按浏览器语言推断目的国，作为初始值；客户可在详情页「Shipping & Returns」
 * 里改。推断不出来一律返回兜底分区（"Other"），保守显示好过错误显示。
 *
 * 注意：真正决定收费的是结算页 —— 它用客户填写的地址国家调同一套分区逻辑，
 * 所以这里只是「估算」，推断偏差不会导致算错钱。
 */

/** 兜底分区在后台 shippingZones 里的通配名，不是真实国家 */
export const OTHER_COUNTRY = 'Other'

/** 浏览器语言区域码 → 后台分区里配置的国家名 */
const REGION_TO_COUNTRY: Record<string, string> = {
  US: 'United States',
  CA: 'Canada',
  GB: 'United Kingdom',
  DE: 'Germany',
  FR: 'France',
  IT: 'Italy',
  ES: 'Spain',
  NL: 'Netherlands',
  AU: 'Australia',
  JP: 'Japan',
  KR: 'South Korea',
  SG: 'Singapore',
}

export function detectShipCountry(): string {
  try {
    const lang =
      (typeof navigator !== 'undefined' &&
        (navigator.language || (navigator.languages && navigator.languages[0]))) ||
      ''
    const region = String(lang).split('-')[1]?.toUpperCase()
    return REGION_TO_COUNTRY[region || ''] || OTHER_COUNTRY
  } catch {
    return OTHER_COUNTRY
  }
}

/** 下拉框里显示用的名称（兜底分区要说明它不是具体国家） */
export function shipCountryLabel(country: string): string {
  return country === OTHER_COUNTRY ? 'Other / Rest of world' : country
}
