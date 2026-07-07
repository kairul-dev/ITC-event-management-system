# Crypto Backtesting & Strategy Optimization Report

> [!WARNING]
> **API Connection Offline**: Unreachable Bitget API. Displaying results based on synthetic market data.

**Run Date (UTC):** 2026-07-07 07:05:07 UTC  
**Symbol:** BTCUSDT (1h Candles)  
**Total Candles Analyzed:** 1000  
**Latest Market Price:** $74,998.93  

---

## 🏆 Best Strategy Found: **RSI**
* **Total Return:** 60.31%  
* **Optimized Parameters:** {'period': 14, 'oversold': 25.0, 'overbought': 75.0}

---

## 📊 Detailed Performance Comparison

| Metric | SMA Crossover (Optimized) | RSI Mean Reversion (Optimized) |
| :--- | :--- | :--- |
| **Parameters** | Fast: 5, Slow: 100 | Period: 14, OS: 25.0, OB: 75.0 |
| **Total Return** | **43.02%** | **60.31%** |
| **Sharpe Ratio** | 3.73 | 4.18 |
| **Max Drawdown** | 21.58% | 23.74% |
| **Number of Trades**| 14 | 4 |
| **Win Rate** | 28.57% | 50.00% |

---

## 🕒 Trade Log Summary (Best Strategy)
Showing the last 5 trades executed by the RSI strategy:

| # | Type | Price | Date |
| :--- | :--- | :--- | :--- |
| 1 | `BUY` | $63,064.78 | 2026-05-29 02:05:06 |
| 2 | `SELL` | $110,686.46 | 2026-06-18 13:05:06 |
| 3 | `BUY` | $79,708.55 | 2026-06-25 05:05:06 |
| 4 | `SELL` | $73,098.62 | 2026-07-02 10:05:06 |


*Report generated automatically by the Antigravity hourly backtesting worker.*