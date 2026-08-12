// 文化人物头像元数据 - 用于员工头像选择弹窗
// 头像通过 text-to-image API 生成, 风格与用户提供的插画一致 (Q版古风)

export interface CulturalAvatar {
  url: string
  name: string
  era: string
  role: string
  intro: string
}

export const CULTURAL_AVATARS: CulturalAvatar[] = [
  {
    url: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Q%20version%20cartoon%20portrait%20of%20Wang%20Xizhi%20Eastern%20Jin%20calligrapher%20ancient%20Chinese%20scholar%20in%20traditional%20Hanfu%20holding%20writing%20brush%20elegant%20ink%20painting%20style%20soft%20colors%20oval%20frame&image_size=square_hd",
    name: "王羲之",
    era: "东晋",
    role: "书圣",
    intro: "东晋大书法家，作《兰亭集序》被誉为天下第一行书",
  },
  {
    url: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Q%20version%20cartoon%20portrait%20of%20Gu%20Kaizhi%20Eastern%20Jin%20painter%20ancient%20Chinese%20artist%20in%20traditional%20Hanfu%20holding%20painting%20brush%20ink%20painting%20style%20soft%20colors%20oval%20frame&image_size=square_hd",
    name: "顾恺之",
    era: "东晋",
    role: "画家",
    intro: "东晋画家，才绝画绝痴绝，代表作《洛神赋图》《女史箴图》",
  },
  {
    url: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Q%20version%20cartoon%20portrait%20of%20Lu%20Yu%20Tang%20Dynasty%20tea%20master%20ancient%20Chinese%20scholar%20in%20traditional%20Hanfu%20holding%20tea%20cup%20zen%20style%20soft%20colors%20oval%20frame&image_size=square_hd",
    name: "陆羽",
    era: "唐代",
    role: "茶圣",
    intro: "唐代茶学家，著《茶经》三卷，奠定中华茶文化基础",
  },
  {
    url: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Q%20version%20cartoon%20portrait%20of%20Wu%20Zetian%20Tang%20Dynasty%20empress%20ancient%20Chinese%20female%20emperor%20in%20royal%20golden%20robes%20elegant%20regal%20style%20soft%20colors%20oval%20frame&image_size=square_hd",
    name: "武则天",
    era: "唐代",
    role: "女皇",
    intro: "中国唯一正统女皇帝，开创武周，政启开元治宏贞观",
  },
  {
    url: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Q%20version%20cartoon%20portrait%20of%20Li%20Qingzhao%20Song%20Dynasty%20poetess%20ancient%20Chinese%20female%20poet%20in%20elegant%20Song%20dynasty%20dress%20holding%20plucked%20string%20instrument%20graceful%20soft%20colors%20oval%20frame&image_size=square_hd",
    name: "李清照",
    era: "宋代",
    role: "词人",
    intro: "宋代婉约派词宗，千古第一才女，作《如梦令》《声声慢》",
  },
  {
    url: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Q%20version%20cartoon%20portrait%20of%20Cai%20Wenji%20Han%20Dynasty%20female%20scholar%20ancient%20Chinese%20woman%20in%20traditional%20Hanfu%20holding%20writing%20brush%20poetic%20elegant%20soft%20colors%20oval%20frame&image_size=square_hd",
    name: "蔡文姬",
    era: "东汉",
    role: "才女",
    intro: "东汉末年才女，精通音律，作《胡笳十八拍》传世",
  },
  {
    url: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Q%20version%20cartoon%20portrait%20of%20Tang%20Ying%20Qing%20Dynasty%20porcelain%20master%20ancient%20Chinese%20ceramic%20artist%20in%20traditional%20Qing%20clothes%20holding%20porcelain%20vase%20craftsman%20style%20soft%20colors%20oval%20frame&image_size=square_hd",
    name: "唐英",
    era: "清代",
    role: "陶艺家",
    intro: "清代督陶官，主持景德镇御窑，创唐窑制瓷巅峰",
  },
  {
    url: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Q%20version%20cartoon%20portrait%20of%20Wen%20Zhengming%20Ming%20Dynasty%20painter%20ancient%20Chinese%20scholar%20in%20traditional%20Ming%20Hanfu%20holding%20painting%20scroll%20elegant%20scholar%20style%20soft%20colors%20oval%20frame&image_size=square_hd",
    name: "文徵明",
    era: "明代",
    role: "画家",
    intro: "明代吴门四家之一，诗书画三绝，画山水工细秀雅",
  },
  {
    url: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Q%20version%20cartoon%20portrait%20of%20Qiu%20Ying%20Ming%20Dynasty%20painter%20ancient%20Chinese%20artist%20in%20traditional%20Ming%20clothes%20holding%20painting%20brush%20fine%20painting%20style%20soft%20colors%20oval%20frame&image_size=square_hd",
    name: "仇英",
    era: "明代",
    role: "画家",
    intro: "明代吴门四家之一，工人物仕女，代表作《汉宫春晓图》",
  },
  {
    url: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Q%20version%20cartoon%20portrait%20of%20Guan%20Daosheng%20Yuan%20Dynasty%20female%20calligrapher%20ancient%20Chinese%20woman%20in%20traditional%20Yuan%20dress%20holding%20writing%20brush%20elegant%20female%20scholar%20soft%20colors%20oval%20frame&image_size=square_hd",
    name: "管道昇",
    era: "元代",
    role: "书画家",
    intro: "元代才女，赵孟頫之妻，工书法墨竹，作《我侬词》",
  },
  {
    url: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Q%20version%20cartoon%20portrait%20of%20Shen%20Shou%20late%20Qing%20embroidery%20master%20modern%20Chinese%20woman%20in%20traditional%20dress%20holding%20embroidery%20needle%20craftswoman%20style%20soft%20colors%20oval%20frame&image_size=square_hd",
    name: "沈寿",
    era: "清末民初",
    role: "刺绣家",
    intro: "近代刺绣艺术家，创仿真绣，代表作《耶稣像》获巴拿马金奖",
  },
  {
    url: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Q%20version%20cartoon%20portrait%20of%20Zhang%20Tonglu%20modern%20cloisonne%20master%20Chinese%20craftsman%20in%20traditional%20work%20clothes%20holding%20cloisonne%20vase%20artisan%20style%20soft%20colors%20oval%20frame&image_size=square_hd",
    name: "张同禄",
    era: "当代",
    role: "景泰蓝大师",
    intro: "当代景泰蓝国家级非遗传承人，中国工艺美术大师",
  },
  {
    url: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Q%20version%20cartoon%20portrait%20of%20Chang%20Yu%20modern%20painter%20Chinese%20artist%20in%20western%20style%20clothes%20holding%20painting%20brush%20artistic%20style%20soft%20colors%20oval%20frame&image_size=square_hd",
    name: "常玉",
    era: "近现代",
    role: "画家",
    intro: "旅法华裔画家，东方马蒂斯，以简练线条绘裸女盆花闻名",
  },
  {
    url: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Q%20version%20cartoon%20portrait%20of%20Lin%20Huiyin%20Republic%20of%20China%20architect%20modern%20Chinese%20woman%20in%20elegant%201930s%20dress%20holding%20book%20intellectual%20style%20soft%20colors%20oval%20frame&image_size=square_hd",
    name: "林徽因",
    era: "民国",
    role: "建筑学家",
    intro: "民国才女，建筑师诗人，参与国徽与人民英雄纪念碑设计",
  },
  {
    url: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Q%20version%20cartoon%20portrait%20of%20Zhang%20Daqian%20modern%20Chinese%20painter%20master%20in%20traditional%20scholar%20robe%20holding%20painting%20scroll%20grand%20master%20style%20soft%20colors%20oval%20frame&image_size=square_hd",
    name: "张大千",
    era: "近现代",
    role: "国画大师",
    intro: "二十世纪国画大师，泼彩山水独创一格，临摹敦煌壁画",
  },
]

// 旧版员工头像（仅作兼容,新选择器中默认不展示)
export const LEGACY_STAFF_AVATARS: CulturalAvatar[] = [
  { url: "/avatars/staff-1.svg", name: "员工 1", era: "", role: "通用", intro: "通用员工头像" },
  { url: "/avatars/staff-2.svg", name: "员工 2", era: "", role: "通用", intro: "通用员工头像" },
  { url: "/avatars/staff-3.svg", name: "员工 3", era: "", role: "通用", intro: "通用员工头像" },
  { url: "/avatars/staff-4.svg", name: "员工 4", era: "", role: "通用", intro: "通用员工头像" },
  { url: "/avatars/staff-5.svg", name: "员工 5", era: "", role: "通用", intro: "通用员工头像" },
  { url: "/avatars/staff-6.svg", name: "员工 6", era: "", role: "通用", intro: "通用员工头像" },
  { url: "/avatars/staff-7.svg", name: "员工 7", era: "", role: "通用", intro: "通用员工头像" },
  { url: "/avatars/staff-8.svg", name: "员工 8", era: "", role: "通用", intro: "通用员工头像" },
]

// 通过 URL 查找人物元数据
export function findAvatarMeta(url: string): CulturalAvatar | undefined {
  return [...CULTURAL_AVATARS, ...LEGACY_STAFF_AVATARS].find(a => a.url === url)
}