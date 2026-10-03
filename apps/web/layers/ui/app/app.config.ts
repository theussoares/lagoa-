export default defineAppConfig({
  ui: {
    colors: {
      primary: 'tinta',
      secondary: 'carimbo',
      success: 'folha',
      info: 'tinta',
      warning: 'amber',
      error: 'red',
      neutral: 'mesa',
    },
    icons: {
      arrowLeft: 'i-ph-arrow-left',
      arrowRight: 'i-ph-arrow-right',
      check: 'i-ph-check',
      chevronDown: 'i-ph-caret-down',
      chevronLeft: 'i-ph-caret-left',
      chevronRight: 'i-ph-caret-right',
      close: 'i-ph-x',
      error: 'i-ph-warning-circle',
      info: 'i-ph-info',
      loading: 'i-ph-circle-notch',
      success: 'i-ph-check-circle',
      warning: 'i-ph-warning',
    },
    button: {
      slots: {
        base: 'font-semibold transition-transform duration-[var(--lagoa-dur-fast)] active:scale-[0.98]',
      },
      variants: {
        size: {
          lg: { base: 'min-h-12 px-5 text-base' },
          xl: { base: 'min-h-14 px-6 text-lg' },
        },
      },
      defaultVariants: {
        size: 'lg',
      },
    },
    input: {
      variants: {
        size: {
          lg: { base: 'min-h-12 text-base' },
        },
      },
      defaultVariants: {
        size: 'lg',
      },
    },
    pinInput: {
      slots: {
        root: 'gap-2',
      },
      variants: {
        size: {
          xl: { base: 'h-14 w-12 text-2xl font-bold tabular-nums' },
        },
      },
    },
    card: {
      slots: {
        root: 'rounded-[var(--radius-card)] shadow-[var(--lagoa-shadow-card)] ring-0',
      },
    },
  },
})
