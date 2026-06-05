/** @type {import('tailwindcss').Config} */
// Semantic tokens map to CSS variables (defined in src/index.css) so a dark theme
// can be added later by overriding the same variables under [data-theme='dark'].
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        page: 'var(--bg-page)',
        surface: 'var(--bg-surface)',
        elevated: 'var(--bg-elevated)',
        subtle: 'var(--bg-subtle)',

        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        muted: 'var(--text-muted)',
        'on-accent': 'var(--text-on-accent)',

        border: 'var(--border)',
        'border-strong': 'var(--border-strong)',

        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          soft: 'var(--color-accent-soft)',
          'on-soft': 'var(--color-accent-on-soft)',
          deep: 'var(--color-accent-deep)',
        },

        success: 'var(--color-success)',
        'success-soft': 'var(--color-success-soft)',
        warning: 'var(--color-warning)',
        'warning-soft': 'var(--color-warning-soft)',
        danger: 'var(--color-danger)',
        'danger-soft': 'var(--color-danger-soft)',
        info: 'var(--color-info)',
        'info-soft': 'var(--color-info-soft)',
        'neutral-soft': 'var(--color-neutral-soft-bg)',
        'neutral-soft-ink': 'var(--color-neutral-soft-ink)',
        highlight: 'var(--color-highlight)',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['ui-monospace', '"JetBrains Mono"', 'Consolas', 'monospace'],
      },
      fontSize: {
        meta: ['11px', { lineHeight: '1.3', letterSpacing: '0.06em' }],
        caption: ['12px', { lineHeight: '1.4' }],
        body: ['13px', { lineHeight: '1.45' }],
      },
      borderRadius: {
        pill: '4px',
        control: '6px',
        card: '10px',
      },
      boxShadow: {
        hover: '0 6px 18px -10px rgba(13,23,49,.25)',
        ring: '0 0 0 3px var(--color-accent-halo)',
        modal: '0 20px 40px -20px rgba(13,23,49,.35)',
        drawer: '-12px 0 40px -24px rgba(13,23,49,.35)',
      },
      ringColor: {
        accent: 'var(--color-accent)',
      },
      transitionDuration: {
        fast: '120ms',
        view: '180ms',
      },
    },
  },
  plugins: [],
}
