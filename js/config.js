/* ════════════════════════════════════════════════════════════
   MERIDIAN — configuration
   ════════════════════════════════════════════════════════════ */
window.MERIDIAN = {
  name: 'MERIDIAN',
  version: '1.0',

  /* Supabase — same project as Polymath. Fill both in for
     cross-device sync + Board access. Leave blank for local-only. */
  supabase: {
    url: '',
    anonKey: ''
  },

  /* Oracle — flip to true once you have an AI key.
     Free key at aistudio.google.com, no card needed. */
  oracle: false,

  /* Theme — 'meridian' | 'academy' | 'command' */
  defaultTheme: 'meridian',

  /* Finance widget — set your API key from finnhub.io (free) */
  finance: {
    key: '',
    symbols: ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'SENSEX.BO']
  }
};

/* Subject data registers itself here */
window.SUBJECTS = [];
