/* ════════════════════════════════════════════════════════════
   MERIDIAN — configuration
   ════════════════════════════════════════════════════════════ */
window.MERIDIAN = {
  name: 'MERIDIAN',
  version: '1.0',

  /* Supabase — same project as Polymath. Fill both in for
     cross-device sync + Board access. Leave blank for local-only. */
  supabase: {
    url: 'https://ddpajaezvreahlzyviku.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcGFqYWV6dnJlYWhsenl2aWt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNTcwNDUsImV4cCI6MjEwMjczMzA0NX0.UAj_IiEax24dZlgC9sEl1_ie5wDsgx7vP6R_UFRgGdg'
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
