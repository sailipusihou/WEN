/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}','./components/**/*.{js,ts,jsx,tsx,mdx}','./lib/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // 2026-09 色彩压实重制：底子下沉、文字去灰、品牌色加饱和
        // （原配色 79% 面积为明度≥90 近白、背景平均饱和度仅 19.6%，整体发浅发灰）
        'ink-deep': '#171310',
        'ink': '#221E1A',
        'ink-mid': '#403A31',
        'ink-soft': '#57503F',
        'ink-faint': '#8A8071',
        'paper': '#EAE0CE',
        'paper-light': '#EFE6D6',
        'paper-warm': '#E2D5C0',
        'paper-dark': '#D8C9AE',
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
        'otb-ink': '#221E1A',
        'otb-sand': '#D8C9AE',
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
