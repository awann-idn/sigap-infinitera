/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base: 'var(--bg-base)',
          elevated: 'var(--bg-elevated)',
          sunken: 'var(--bg-sunken)',
          dark: 'var(--bg-dark-panel)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          warm: 'var(--accent-warm)',
        },
        border: {
          default: 'var(--border-default)',
          strong: 'var(--border-strong)',
        },
        status: {
          verified: 'var(--status-verified)',
          pending: 'var(--status-pending)',
          spam: 'var(--status-spam)',
        },
      },
      fontFamily: {
        display: ['var(--font-space-grotesk)', 'sans-serif'],
        body: ['var(--font-dm-sans)', 'sans-serif'],
        mono: ['var(--font-space-mono)', 'monospace'],
      },
      boxShadow: {
        none: 'none',
      },
      borderRadius: {
        DEFAULT: '0px',
        none: '0px',
        sm: '0px',
        md: '0px',
        lg: '0px',
        xl: '0px',
        '2xl': '0px',
        full: '0px',
      },
    },
  },
  plugins: [],
};
