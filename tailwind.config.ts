import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#080808',
        surface: 'rgba(255,255,255,0.04)',
        'border-glass': 'rgba(255,255,255,0.08)',
        cyan: '#00E5FF',
        purple: '#A855F7',
        amber: '#F59E0B',
        danger: '#EF4444',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        heading: ['"Space Grotesk"', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'spin-slow': 'spin 2s linear infinite',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0,229,255,0.2)' },
          '50%': { boxShadow: '0 0 40px rgba(0,229,255,0.4)' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      backdropBlur: {
        xl: '24px',
      },
    },
  },
  plugins: [],
};

export default config;
