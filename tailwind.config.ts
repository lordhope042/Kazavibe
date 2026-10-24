import type { Config } from 'tailwindcss';
const c = (n: string) => `rgb(var(--${n}) / <alpha-value>)`;
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: { extend: { colors: {
    bg: c('bg'), card: c('card'), surface: c('card'), raised: c('input'), input: c('input'), hover: c('hover'), line: c('line'),
    fg: c('fg'), soft: c('soft'), muted: c('muted'), danger: c('er'), good: c('ok'),
    brand: { DEFAULT: c('b5'), 500: c('b5'), 600: c('b6') }, brandhover: c('b6'),
  } } },
  plugins: [],
} satisfies Config;
