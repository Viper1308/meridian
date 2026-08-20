/* ════════════════════════════════════════════════════════════
   MERIDIAN_CONFIG — the only file you need to edit for optional
   features. Everything else in the app works with this left blank.
   ════════════════════════════════════════════════════════════ */
window.MERIDIAN_CONFIG = {

  /* Cross-device sync. Leave both blank and everything stays local
     to this browser — no login gate appears, nothing changes.
     Fill both in and a login gate appears automatically.         */
  supabase: {
    url: 'https://ddpajaezvreahlzyviku.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcGFqYWV6dnJlYWhsenl2aWt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNTcwNDUsImV4cCI6MjEwMjczMzA0NX0.UAj_IiEax24dZlgC9sEl1_ie5wDsgx7vP6R_UFRgGdg'
  },

  /* Live stock prices + market news on the dashboard. Free key,
     no card, from finnhub.io. Indian tickers use .NS (NSE) or
     .BO (BSE).                                                    */
  finance: {
    key: 'da306f1r01qupvfb436gda306f1r01qupvfb4370',
    symbols: ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'SENSEX.BO']
  }
};
