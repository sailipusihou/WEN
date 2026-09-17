/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}','./components/**/*.{js,ts,jsx,tsx,mdx}','./lib/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // 2026-09-16 对照竞品实测后重定层次
        //
        // 之前的问题：页面底是纯白 #FFFFFF，而大多数区块也是纯白 —— 全站一个色，
        // 没有层次，观感像后台管理界面而不是纸质画册。实测竞品（teatsy.com）的
        // 底色面积分布是：
        //   #fcf9ef(7096k) / #4c5546(1564k) / #f5f4f0(1358k) / #0f0f0f(1168k) / #ffffff(1088k)
        // 即**用 4~5 层明度不同的暖中性色堆出层次，纯白只占很小一块**。
        //
        // 现在的分工：
        //   paper-base  页面底（暖白）—— 与内容面拉开一档
        //   paper       区块交替用的暖调底 —— 用来制造上下节奏
        //   paper-light 主要内容面（暖近白）—— **不再用纯白**：屏幕纯白偏冷偏硬
        //   paper-warm  商品图区 / 暖块
        'ink-deep': '#1F1811',
        'ink': '#2A2118',        // 正文：暖深棕
        'ink-mid': '#4A3E2E',
        'ink-soft': '#5A4A36',   // 次要文字：暖棕，不再用灰
        'ink-faint': '#7A6B54',
        'paper-base': '#FAF8F2', // 页面底：暖白
        'paper': '#F7F3EA',      // 区块交替底：再暖一档
        'paper-light': '#FFFDF9', // 内容面：暖近白（取代纯白）
        'paper-warm': '#F6F0E0', // 商品图区/暖块
        'paper-dark': '#EFE8D8',
        'jade': '#5F7D72',
        'jade-light': '#7D9B8F',
        'jade-dark': '#4A665D',
        'jade-pale': '#B9CFC6',
        'bronze': '#A07C34',
        'bronze-light': '#BFA06A',
        'bronze-dark': '#6B5424',
        'bronze-pale': '#D6C49E',
        'indigo': '#3B4252',
        'indigo-light': '#4F5A6E',
        'indigo-dark': '#2A3040',
        'indigo-pale': '#D5DAE4',
        'amber': '#A87C2E',
        'amber-light': '#C79A4A',
        'amber-dark': '#8A6522',
        'coral': '#A8472E',
        'coral-light': '#C4694F',
        'coral-dark': '#8E3C28',
        'otb-terracotta': '#A8472E',
        'otb-ink': '#2A2118',
        'otb-sand': '#F2EBD8',

        // 状态色（新增 2026-09-17）—— 暖调版本。
        // 以前直接用 Tailwind 默认的 #22c55e / #ef4444 / #f59e0b / #3b82f6
        // （冷调高饱和，实测 83 / 56 / 30 / 21 处），和全站暖色调打架。
        // ⚠️ 本步只**定义**，不改任何调用 —— 换用会让徽标/提示变色，属于后续步骤。
        // 名字不冲突（Tailwind 默认只有 green/red/amber/blue，没有这几个）。
        'success': '#5A7A55',
        'warning': '#A87C2E',
        'danger': '#A8472E',
        'info': '#4F5A6E',
      },
      fontSize: {
        // 语义化字号阶梯（2026-09-17）
        //
        // 为什么建这个：实测首页**37.1% 的文字小于 12px**，最常用的字号是 11px。
        // 而代码里散着约 1200 处任意值（text-[10px] 586 / text-[11px] 300 /
        // text-[9px] 81 / text-[8px] 17 / text-[7px] 2）—— 既是"没有尺度"，
        // 也是"普遍过小"。10px 以下在现代屏幕上基本不可读，移动端更甚。
        //
        // 这套阶梯定了可读下限：micro=12px 是**最小可用**，不再有 7~11px。
        // 注意：这里用**新名字**（micro/small/body…），不动 Tailwind 的
        // xs/sm/base/lg —— 那两个有 2367 处在用，改值会全站位移，
        // 属于更大的动作，需要单独评估。
        'micro': ['12px', { lineHeight: '1.45' }], // 角标 / 大写小标签 / 最小可读
        'small': ['13px', { lineHeight: '1.5' }],  // 次要说明文字
        'body': ['15px', { lineHeight: '1.6' }],   // 正文基准
        'lead': ['17px', { lineHeight: '1.6' }],   // 导语 / 卡片标题
        'h3': ['20px', { lineHeight: '1.35' }],    // 小标题
        'h2': ['clamp(22px, 2.6vw, 28px)', { lineHeight: '1.25' }],
        'h1': ['clamp(30px, 4vw, 40px)', { lineHeight: '1.15' }],
        'hero': ['clamp(38px, 6vw, 64px)', { lineHeight: '1.05' }],
      },
      borderRadius: {
        // 新增的语义档位。**刻意避开 sm/md/lg 这些名字** —— 用它们会覆盖
        // Tailwind 默认值，让全站已有的 rounded-lg 等突然改变尺寸（8px → 18px）。
        // 以前圆角是 0/2/4/6/10/12/18px 混用、还有 !important 硬压，这里收成三档。
        'card': '10px',
        'block': '18px',
        'pill': '999px',
      },
      lineHeight: {
        // Tailwind 默认 relaxed = 1.625，在 16px 正文下偏松 —— 全站 50 处都在用它。
        // 实测竞品是 14px / 1.3，明显更紧、更"编辑式"。
        // 收到 1.55：保留 relaxed 的可读性，同时把整页密度提上来。
        // 在这里改一处，胜过逐个文件去改 50 处调用。
        relaxed: '1.55',
      },
      fontFamily: {
        'sans': ['Inter', 'Noto Sans SC', 'system-ui', 'sans-serif'],
        'serif': ['Noto Serif SC', 'Georgia', 'serif'],
        'display': ['Playfair Display', 'Georgia', 'serif'],
        'en': ['Playfair Display', 'Georgia', 'serif'],
      },
      boxShadow: {
        'soft': '0 2px 20px rgba(26,28,30,0.04)',
        'soft-lg': '0 8px 40px rgba(26,28,30,0.05)',
        'elevated': '0 12px 48px rgba(26,28,30,0.07)',
        'inner-soft': 'inset 0 1px 0 rgba(255,255,255,0.4)',
        'card': '0 1px 3px rgba(26,28,30,0.04), 0 1px 2px rgba(26,28,30,0.02)',
        // 商品图块的"纸上一张照片"感：贴着边缘有一道极细的接触阴影，
        // 外面一层大范围浅投影。颜色用暖棕而不是纯黑 —— 现有的 soft/soft-lg
        // 都是冷调灰（rgba(26,28,30)），压在新换的暖纸底上会发脏。
        'card-lift': '0 1px 2px rgba(31,24,17,0.05), 0 12px 28px -16px rgba(31,24,17,0.22)',
        'card-lift-hover': '0 1px 2px rgba(31,24,17,0.06), 0 18px 38px -18px rgba(31,24,17,0.28)',
      },
      backgroundImage: {
        'paper-texture': "url('/images/paper-texture.png')",
        'gradient-soft': 'linear-gradient(180deg, rgba(242,239,234,0) 0%, rgba(242,239,234,1) 100%)',
        'gradient-deep': 'linear-gradient(180deg, rgba(26,28,30,0) 0%, rgba(26,28,30,1) 100%)',
        'gradient-overlay': 'linear-gradient(to right, rgba(242,239,234,0.92) 0%, rgba(242,239,234,0) 50%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.8s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        'scale-in': 'scaleIn 0.4s ease-out forwards',
        'float': 'float 6s ease-in-out infinite',
        'drift': 'drift 20s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        drift: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '33%': { transform: 'translate(8px, -4px)' },
          '66%': { transform: 'translate(-4px, 6px)' },
        },
      },
    },
  },
  plugins: [],
}
