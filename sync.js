#!/usr/bin/env node
/**
 * sync.js — Reads live data from the StockTok app and updates the website.
 *
 * Usage:  node sync.js
 *
 * Run this after adding tickers, data providers, or other countable app data.
 * It reads the source files and updates index.html with real numbers.
 */

const fs = require('fs');
const path = require('path');

const APP_ROOT = path.resolve(__dirname, '../stocktok');
const WEBSITE_ROOT = __dirname;

// ─── Counters ───

function countTickers() {
  // tickers.ts uses { s: 'AAPL', ... } pattern
  const file = path.join(APP_ROOT, 'constants/tickers.ts');
  const src = fs.readFileSync(file, 'utf-8');
  const matches = src.match(/\{\s*s:\s*'/g);
  return matches ? matches.length : 0;
}

function countCryptoAssets() {
  // cryptoAssets.ts uses { ticker: 'BTC', ... } pattern
  const file = path.join(APP_ROOT, 'constants/cryptoAssets.ts');
  const src = fs.readFileSync(file, 'utf-8');
  const matches = src.match(/\{\s*ticker:\s*'/g);
  return matches ? matches.length : 0;
}

function countIsraelStocks() {
  const file = path.join(APP_ROOT, 'constants/israelStocks.ts');
  const src = fs.readFileSync(file, 'utf-8');
  // Try both patterns
  const m1 = src.match(/\{\s*s:\s*'/g);
  const m2 = src.match(/\{\s*ticker:\s*'/g);
  const m3 = src.match(/\{\s*symbol:\s*'/g);
  return Math.max(m1?.length || 0, m2?.length || 0, m3?.length || 0);
}

function countDataProviders() {
  // Scan all files in services/market/ for known provider names
  const dir = path.join(APP_ROOT, 'services/market');
  if (!fs.existsSync(dir)) return 0;
  const allSrc = fs.readdirSync(dir)
    .filter(f => f.endsWith('.ts'))
    .map(f => fs.readFileSync(path.join(dir, f), 'utf-8'))
    .join('\n');
  // Known external data providers
  const providers = ['yahoo', 'finnhub', 'alphavantage', 'twelvedata', 'coingecko', 'binance', 'tase'];
  return providers.filter(p => allSrc.toLowerCase().includes(p)).length;
}

function countNewsSources() {
  const file = path.join(APP_ROOT, 'services/news/aggregator.ts');
  if (!fs.existsSync(file)) return 0;
  const src = fs.readFileSync(file, 'utf-8');
  // Count RSS feed URLs
  const matches = src.match(/https?:\/\/[^'"]*rss[^'"]*/gi) ||
                  src.match(/https?:\/\/[^'"]*feed[^'"]*/gi);
  return matches ? matches.length : 0;
}

function countEdgeFunctions() {
  const dir = path.join(APP_ROOT, 'supabase/functions');
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir)
    .filter(f => {
      const full = path.join(dir, f);
      return fs.statSync(full).isDirectory() && !f.startsWith('_') && !f.startsWith('.');
    }).length;
}

function countStores() {
  const dir = path.join(APP_ROOT, 'store');
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir)
    .filter(f => f.startsWith('use') && f.endsWith('Store.ts')).length;
}

// ─── Update HTML ───

function updateIndexHtml(stats) {
  const indexPath = path.join(WEBSITE_ROOT, 'index.html');
  let html = fs.readFileSync(indexPath, 'utf-8');

  // Round ticker count down to nearest 100 for display (e.g. 2003 → "2,000+")
  const assetDisplay = Math.floor(stats.tickers / 100) * 100;
  const formatted = assetDisplay.toLocaleString('en-US');

  // Update numbers section: <h3>X+</h3>\n        <p>Assets tracked</p>
  html = html.replace(
    /(<h3>)[\d,]+\+(<\/h3>\s*<p>Assets tracked<\/p>)/,
    `$1${formatted}+$2`
  );

  // Update data provider count
  html = html.replace(
    /(<h3>)\d+(<\/h3>\s*<p>Data providers<\/p>)/,
    `$1${stats.dataProviders}$2`
  );

  // Update feature text: "X+ stocks, crypto, indices"
  html = html.replace(
    /[\d,]+\+ stocks, crypto, indices/,
    `${formatted}+ stocks, crypto, indices`
  );

  fs.writeFileSync(indexPath, html, 'utf-8');
  return { indexPath, assetDisplay: formatted, providers: stats.dataProviders };
}

// ─── Main ───

function main() {
  console.log('\n  StockTok Website Sync');
  console.log('  ─────────────────────\n');

  const stats = {
    tickers: countTickers(),
    crypto: countCryptoAssets(),
    israelStocks: countIsraelStocks(),
    dataProviders: countDataProviders(),
    newsSources: countNewsSources(),
    edgeFunctions: countEdgeFunctions(),
    stores: countStores(),
  };

  console.log('  App data:');
  console.log(`    Tickers:          ${stats.tickers}`);
  console.log(`    Crypto:           ${stats.crypto}`);
  console.log(`    Israel stocks:    ${stats.israelStocks}`);
  console.log(`    Data providers:   ${stats.dataProviders}`);
  console.log(`    News sources:     ${stats.newsSources}`);
  console.log(`    Edge Functions:   ${stats.edgeFunctions}`);
  console.log(`    Stores:           ${stats.stores}`);

  const result = updateIndexHtml(stats);

  console.log('\n  Website updated:');
  console.log(`    Assets tracked → ${result.assetDisplay}+`);
  console.log(`    Data providers → ${result.providers}`);
  console.log('\n  Done.\n');
}

main();
