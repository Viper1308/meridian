/* ════════════════════════════════════════════════════════════
   MERIDIAN_CONFIG — the only file you need to edit for optional
   features. Everything else in the app works with this left blank.
   ════════════════════════════════════════════════════════════ */
window.MERIDIAN_CONFIG = {

  /* Cross-device sync. Leave both blank and everything stays local
     to this browser — no login gate appears, nothing changes.
     Fill both in and a login gate appears automatically.         */
  supabase: {
    url: '',
    anonKey: ''
  },

  /* Live stock prices + market news on the dashboard. Free key,
     no card, from finnhub.io. Indian tickers use .NS (NSE) or
     .BO (BSE).                                                    */
  finance: {
    key: '',
    symbols: ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'SENSEX.BO']
  }
};
