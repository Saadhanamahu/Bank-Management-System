export const BANK_ID    = import.meta.env.VITE_BANK_ID;
export const BANK_NAME  = import.meta.env.VITE_BANK_NAME;
export const BANK_IFSC  = import.meta.env.VITE_IFSC_CODE;
export const BANK_COLOR = import.meta.env.VITE_BANK_COLOR || 'emerald';

export const HUB_BANK_EMAIL    = import.meta.env.VITE_HUB_BANK_EMAIL;
export const HUB_BANK_PASSWORD = import.meta.env.VITE_HUB_BANK_PASSWORD;

const THEMES = {
  emerald: {
    primary:          'bg-emerald-600',
    primaryHover:     'hover:bg-emerald-700',
    primaryText:      'text-emerald-600',
    primaryBorder:    'border-emerald-600',
    primaryRing:      'focus:ring-emerald-500',
    primaryLight:     'bg-emerald-50',
    primaryLightText: 'text-emerald-800',
    primaryLightBorder:'border-emerald-200',
    sidebar:          'bg-emerald-900',
    sidebarHover:     'hover:bg-emerald-800',
    sidebarActive:    'bg-emerald-700',
    sidebarText:      'text-emerald-100',
    badge:            'bg-emerald-100 text-emerald-800',
    hex:              '#059669',
  },
};

export const THEME = THEMES[BANK_COLOR] ?? THEMES.emerald;

export const TRANSFER_MODES = {
  INTERNAL: 'internal',
  IMPS:     'imps',
  NEFT:     'neft',
};

export const ACCOUNT_TYPES = ['savings', 'current', 'salary', 'fd'];

export const TXN_STATUS = {
  PENDING:   'pending',
  COMPLETED: 'completed',
  FAILED:    'failed',
};