/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}','./components/**/*.{js,ts,jsx,tsx,mdx}','./lib/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // 2026-09 三轮调色定稿：净白 + 商品区微黄 + 暖深棕文字
        // 参考站实测：页面底 #FAFAF6（近乎纯白只带一丝暖调），正文 #4A3422（对比度 11.7:1）
        // 原理：对比是相对的 —— 底色越接近白，深色字越"跳"；底色一深，字反而显闷。
        'ink-deep': '#1F1811',
        'ink': '#2A2118',        // 正文：暖深棕（对齐参考站 #4A3422 的路子，再深一档）
        'ink-mid': '#4A3E2E',
        'ink-soft': '#5A4A36',   // 次要文字：暖棕，不再用灰
        'ink-faint': '#7A6B54',
        'paper': '#FDFCFA',      // 卡片面
        'paper-light': '#FFFFFF', // 纯白（参考站的"实际的纯白感"）
        'paper-warm': '#F8F2E2', // 商品图区/暖块：泛微黄
        'paper-dark': '#F2EBD8',
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
