import path from 'node:path';
import puppeteerCore from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { sanitizeInvestmentSection } from '@/lib/plan/sanitize-investment-section';

/** Letter width minus the left and right print margins, at 96px per inch. */
const PDF_CONTENT_WIDTH_PX = 720;

async function launchBrowser() {
  const minimalArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--single-process',
    '--no-zygote',
  ];

  if (process.env.NODE_ENV === 'development') {
    const puppeteerFull = await import('puppeteer');
    return puppeteerFull.default.launch({
      headless: true,
      defaultViewport: { width: PDF_CONTENT_WIDTH_PX, height: 960 },
      args: minimalArgs,
      timeout: 60_000,
      protocolTimeout: 60_000,
    });
  }
  return puppeteerCore.launch({
    args: [...chromium.args, ...minimalArgs],
    defaultViewport: { width: PDF_CONTENT_WIDTH_PX, height: 960 },
    executablePath: await chromium.executablePath(
      path.join(process.cwd(), 'node_modules/@sparticuz/chromium/bin'),
    ),
    headless: true,
    timeout: 60_000,
    protocolTimeout: 60_000,
  });
}

export async function generatePDF(
  planData: Record<string, unknown>,
  _userId: string,
  options?: { draft?: boolean },
): Promise<Buffer> {
  let html = buildReportHTML(planData);

  if (options?.draft) {
    html = html.replace('</style>', `
  .draft-watermark { position: fixed; top: 35%; left: 50%; transform: translate(-50%, -50%) rotate(-35deg); font-size: 120px; font-weight: 900; color: rgba(200, 0, 0, 0.08); letter-spacing: 12px; pointer-events: none; z-index: 9999; white-space: nowrap; }
</style>`);
    html = html.replace('<body>', '<body><div class="draft-watermark">DRAFT</div>');
  }

  const browser = await launchBrowser();

  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(60_000);
  await page.emulateMediaType('print');
  await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 60_000 });

  const headerText = options?.draft
    ? 'MOSAIC FINANCE — DRAFT PROGRESS REPORT'
    : 'MOSAIC FINANCE — FINANCIAL PROGRESS REPORT';
  const footerText =
    'This is educational information, not financial advice. Speak with a licensed financial advisor before implementing any changes.';

  const pdf = await page.pdf({
    format: 'Letter',
    printBackground: true,
    margin: { top: '0.7in', bottom: '0.7in', left: '0.5in', right: '0.5in' },
    displayHeaderFooter: true,
    headerTemplate: `<div style="font-size:9px;font-family:Arial;width:100%;text-align:center;color:${options?.draft ? '#991b1b' : '#666'};">${headerText}</div>`,
    footerTemplate: `<div style="font-size:8px;font-family:Arial;width:100%;padding:0 60px;display:flex;justify-content:space-between;color:${options?.draft ? '#991b1b' : '#999'};">
      <span>${footerText}</span>
      <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
    </div>`,
  });

  await browser.close();
  return Buffer.from(pdf);
}

function fmt(n: unknown): string {
  const num = Number(n);
  if (Number.isNaN(num)) return String(n ?? '—');
  return num.toLocaleString('en-CA');
}

function actionItems(items: string[]): string {
  if (!items?.length) return '';
  return items.map((item) => `<div class="action-item">${item}</div>`).join('');
}

function buildReportHTML(plan: Record<string, unknown>): string {
  const p = sanitizeInvestmentSection(plan) as Record<string, Record<string, unknown>>;
  const fhd = p.financial_health_diagnostic ?? {};
  const rr = p.retirement_readiness ?? {};
  const ipb = p.investment_portfolio_blueprint ?? {};
  const ter = p.tax_efficiency_review ?? {};
  const dep = p.debt_elimination_plan ?? {};
  const ica = p.insurance_coverage_audit ?? {};
  const mcr = p.market_context_report ?? {};
  const lfr = p.lifetime_financial_roadmap ?? {};

  const alloc = (ipb.recommended_allocation ?? {}) as Record<string, number>;
  const coreETFs = (ipb.core_etf_recommendations ?? []) as Record<string, unknown>[];
  const avalanche = (dep.avalanche_method ?? {}) as Record<string, unknown>;
  const snowball = (dep.snowball_method ?? {}) as Record<string, unknown>;
  const coverageRecs = (ica.coverage_recommendations ?? []) as Record<string, unknown>[];
  const milestones = (lfr.net_worth_milestones ?? []) as Record<string, unknown>[];

  const retTarget = Number(rr.retirement_number) || 0;
  const retCurrent = Number(rr.current_trajectory) || 0;
  const retPct = retTarget > 0 ? Math.round((retCurrent / retTarget) * 100) : 0;

  const insNeed = Number(ica.life_insurance_need) || 0;
  const insCurrent = Number(ica.current_coverage) || 0;
  const insPct = insNeed > 0 ? Math.round((insCurrent / insNeed) * 100) : 0;

  const allocColors: Record<string, string> = {
    canadian_equity: '#10b981', us_equity: '#3b82f6', international_equity: '#8b5cf6',
    fixed_income: '#f59e0b', alternatives: '#ec4899', cash: '#6b7280',
    bonds: '#f59e0b', equities: '#10b981', real_estate: '#8b5cf6',
  };

  const priorityColor = (p: unknown) => p === 'high' ? '#ef4444' : p === 'medium' ? '#f59e0b' : '#6b7280';

  const topActions: string[] = [];
  [fhd, rr, ipb, ter, dep, ica, lfr].forEach((s) => {
    const items = (s.action_items ?? []) as string[];
    if (items.length > 0 && topActions.length < 5) topActions.push(items[0]);
  });

  const dateStr = new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @page { margin: 0; size: Letter; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${PDF_CONTENT_WIDTH_PX}px; max-width: 100%; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a202c; line-height: 1.55; font-size: 11px; orphans: 3; widows: 3; overflow-wrap: break-word; }

  .cover { height: 9in; background: #0f1923; color: white; display: flex; flex-direction: column; justify-content: center; align-items: center; position: relative; overflow: hidden; }
  .cover::before { content: ''; position: absolute; top: -40%; right: -20%; width: 600px; height: 600px; border-radius: 50%; background: radial-gradient(circle, rgba(201,170,113,0.08) 0%, transparent 70%); }
  .cover::after { content: ''; position: absolute; bottom: -30%; left: -10%; width: 500px; height: 500px; border-radius: 50%; background: radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%); }
  .cover-inner { position: relative; z-index: 1; text-align: center; }
  .cover .brand { font-size: 13px; letter-spacing: 6px; color: #c9aa71; font-weight: 600; margin-bottom: 16px; }
  .cover h1 { font-size: 42px; font-weight: 800; letter-spacing: 1px; line-height: 1.1; }
  .cover .subtitle { font-size: 18px; color: #c9aa71; margin-top: 16px; font-weight: 400; }
  .cover .gold-line { width: 80px; height: 2px; background: #c9aa71; margin: 32px auto; }
  .cover .meta { font-size: 11px; color: #6b7280; margin-top: 8px; }

  .page { page-break-before: always; page-break-inside: auto; position: relative; padding: 4px 0; }
  .page::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 1px; background: #e5e7eb; }

  .sh { margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #f3f4f6; page-break-inside: avoid; page-break-after: avoid; }
  .sh-accent { width: 40px; height: 3px; border-radius: 2px; margin-bottom: 10px; }
  .sh h2 { font-size: 20px; font-weight: 800; color: #0f1923; letter-spacing: -0.3px; }
  .sh p { font-size: 11px; color: #9ca3af; margin-top: 3px; letter-spacing: 0.2px; }

  h3 { page-break-after: avoid; }
  .kpi-row { display: flex; flex-wrap: wrap; gap: 10px; margin: 16px 0; width: 100%; page-break-inside: avoid; page-break-after: avoid; }
  .kpi { flex: 1 1 0; min-width: 0; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; position: relative; }
  .kpi::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; border-radius: 0 2px 2px 0; }
  .kpi-green::before { background: #10b981; }
  .kpi-gold::before { background: #c9aa71; }
  .kpi-blue::before { background: #3b82f6; }
  .kpi-red::before { background: #ef4444; }
  .kpi-purple::before { background: #8b5cf6; }
  .kpi .kl { font-size: 9px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600; line-height: 1.3; }
  .kpi .kv { font-size: 18px; font-weight: 800; color: #0f1923; margin-top: 3px; overflow-wrap: anywhere; }
  .kpi .ku { font-size: 10px; color: #9ca3af; font-weight: 400; }

  .score-ring { width: 100px; height: 100px; border-radius: 50%; background: conic-gradient(#10b981 0deg, #10b981 calc(var(--pct) * 3.6deg), #e5e7eb calc(var(--pct) * 3.6deg)); display: flex; align-items: center; justify-content: center; margin: 0 auto 6px; }
  .score-ring-inner { width: 80px; height: 80px; border-radius: 50%; background: white; display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 800; color: #0f1923; }

  .prose-block { background: #f8fafc; border-left: 3px solid #c9aa71; border-radius: 0 8px 8px 0; padding: 12px 16px; margin: 12px 0; page-break-inside: avoid; }
  .prose-block strong { color: #0f1923; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 3px; }
  .prose-block p { font-size: 11px; color: #374151; line-height: 1.6; }

  .mix-bar { display: flex; width: 100%; height: 22px; border-radius: 6px; overflow: hidden; background: #f3f4f6; }
  .mix-seg { height: 100%; }
  .mix-legend { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-top: 8px; }
  .mix-key { display: flex; align-items: center; gap: 6px; font-size: 10px; color: #374151; }
  .mix-swatch { width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; }
  .mix-pct { font-weight: 700; color: #0f1923; }
  .bar-chart { margin: 12px 0; page-break-inside: avoid; }
  .bar-row { display: flex; align-items: center; margin-bottom: 8px; }
  .bar-label { width: 130px; font-size: 10px; font-weight: 600; color: #4b5563; text-transform: uppercase; letter-spacing: 0.5px; flex-shrink: 0; }
  .bar-track { flex: 1; height: 20px; background: #f3f4f6; border-radius: 6px; overflow: hidden; position: relative; }
  .bar-fill { height: 100%; border-radius: 6px; display: flex; align-items: center; justify-content: flex-end; padding-right: 6px; font-size: 10px; font-weight: 700; color: white; min-width: 32px; }
  .bar-val { width: 56px; text-align: right; font-size: 11px; font-weight: 700; color: #0f1923; margin-left: 8px; flex-shrink: 0; }

  .progress-bar { height: 8px; background: #f3f4f6; border-radius: 4px; overflow: hidden; margin: 6px 0; }
  .progress-fill { height: 100%; border-radius: 4px; }

  .tbl { width: 100%; table-layout: fixed; border-collapse: separate; border-spacing: 0; margin: 12px 0; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; page-break-inside: avoid; }
  .tbl th { background: #0f1923; color: white; padding: 8px 12px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; }
  .tbl td { padding: 8px 12px; border-bottom: 1px solid #f3f4f6; font-size: 11px; color: #374151; }
  .tbl tr:last-child td { border-bottom: none; }
  .tbl tr:nth-child(even) td { background: #f8fafc; }
  .tbl .ticker { font-weight: 700; color: #10b981; font-size: 12px; }

  .action-section { page-break-inside: avoid; }
  .action-list { margin: 12px 0; page-break-before: avoid; }
  .ai { display: flex; align-items: flex-start; gap: 8px; padding: 8px 12px; border-radius: 6px; margin-bottom: 4px; background: #f8fafc; page-break-inside: avoid; }
  .ai-icon { width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9px; color: white; font-weight: 700; flex-shrink: 0; margin-top: 1px; }
  .ai-text { font-size: 11px; color: #374151; line-height: 1.55; flex: 1; }

  .insight-card { background: linear-gradient(135deg, #0f1923 0%, #1a2b3c 100%); border-radius: 10px; padding: 16px 20px; color: white; margin: 12px 0; page-break-inside: avoid; }
  .insight-card h4 { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #c9aa71; margin-bottom: 6px; }
  .insight-card p { font-size: 11px; line-height: 1.6; color: #d1d5db; }

  .cov-card { display: flex; gap: 10px; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 6px; align-items: flex-start; page-break-inside: avoid; }
  .cov-badge { padding: 2px 6px; border-radius: 4px; font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; flex-shrink: 0; }

  .timeline { position: relative; padding-left: 24px; margin: 12px 0; }
  .timeline::before { content: ''; position: absolute; left: 7px; top: 4px; bottom: 4px; width: 2px; background: #e5e7eb; }
  .tl-item { position: relative; margin-bottom: 16px; page-break-inside: avoid; }
  .tl-dot { position: absolute; left: -20px; top: 4px; width: 10px; height: 10px; border-radius: 50%; background: #c9aa71; border: 2px solid white; box-shadow: 0 0 0 2px #c9aa71; }
  .tl-age { font-size: 10px; font-weight: 700; color: #c9aa71; text-transform: uppercase; letter-spacing: 0.5px; }
  .tl-val { font-size: 14px; font-weight: 800; color: #0f1923; }
  .tl-desc { font-size: 10px; color: #6b7280; margin-top: 2px; }

  .disclaimer { margin-top: 24px; padding: 12px 16px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; font-size: 9px; color: #92400e; line-height: 1.5; }

  .exec-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 16px 0; page-break-inside: avoid; }
  .exec-metric { text-align: center; padding: 16px; background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; }
  .exec-metric .em-val { font-size: 24px; font-weight: 800; color: #0f1923; }
  .exec-metric .em-label { font-size: 9px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin-top: 3px; }

  .two-col { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin: 12px 0; page-break-inside: avoid; }
  .split { display: flex; align-items: center; gap: 20px; width: 100%; min-width: 0; }
  .split > * { min-width: 0; }
</style>
</head>
<body>

<!-- COVER PAGE -->
<div class="cover">
  <div class="cover-inner">
    <div class="brand">MOSAIC FINANCE</div>
    <h1>FINANCIAL<br>PROGRESS REPORT</h1>
    <div class="subtitle">Educational Trajectory Report</div>
    <div class="gold-line"></div>
    <div class="meta">${dateStr}</div>
    <div class="meta" style="margin-top:4px;">Educational information — not financial advice</div>
  </div>
</div>

<!-- EXECUTIVE SUMMARY -->
<div class="page">
  <div class="sh">
    <div class="sh-accent" style="background:#c9aa71;"></div>
    <h2>At a glance</h2>
    <p>The main figures in this report</p>
  </div>

  <div class="split" style="margin-bottom:24px;">
    <div style="text-align:center;flex-shrink:0;">
      <div class="score-ring" style="--pct:${fhd.financial_health_score ?? 0}">
        <div class="score-ring-inner">${fhd.financial_health_score ?? '—'}</div>
      </div>
      <div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Health Score</div>
    </div>
    <div style="flex:1;min-width:0;">
      <div class="exec-grid">
        <div class="exec-metric"><div class="em-val">$${fmt(fhd.net_worth)}</div><div class="em-label">Net Worth</div></div>
        <div class="exec-metric"><div class="em-val">$${fmt(fhd.cash_flow_monthly)}</div><div class="em-label">Monthly Cash Flow</div></div>
        <div class="exec-metric"><div class="em-val">${retPct}%</div><div class="em-label">Share of the retirement figure</div></div>
        <div class="exec-metric"><div class="em-val">$${fmt(dep.total_debt)}</div><div class="em-label">Total Debt</div></div>
      </div>
    </div>
  </div>

  ${topActions.length > 0 ? `
  <div class="insight-card">
    <h4>Notes from this report</h4>
    ${topActions.map((a, i) => `<p style="margin-bottom:6px;">
      <span style="color:#c9aa71;font-weight:700;">${i + 1}.</span> ${a}
    </p>`).join('')}
  </div>` : ''}

  <div style="margin-top:20px;">
    <div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.04em;font-weight:600;margin-bottom:8px;">Retirement figure, so far</div>
    <div class="progress-bar" style="height:14px;">
      <div class="progress-fill" style="width:${Math.min(retPct, 100)}%;background:${retPct >= 80 ? '#10b981' : retPct >= 50 ? '#f59e0b' : '#ef4444'};"></div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:10px;color:#9ca3af;margin-top:4px;">
      <span>Projection: $${fmt(rr.current_trajectory)}</span>
      <span>Figure: $${fmt(rr.retirement_number)}</span>
    </div>
  </div>
</div>

<!-- SECTION 1: FINANCIAL HEALTH -->
<div class="page">
  <div class="sh">
    <div class="sh-accent" style="background:#10b981;"></div>
    <h2>Where things stand</h2>
    <p>The balances and cash figures in this report</p>
  </div>

  <div class="kpi-row">
    <div class="kpi kpi-green"><div class="kl">Net Worth</div><div class="kv">$${fmt(fhd.net_worth)}</div></div>
    <div class="kpi kpi-blue"><div class="kl">Monthly Cash Flow</div><div class="kv">$${fmt(fhd.cash_flow_monthly)}</div></div>
    <div class="kpi kpi-gold"><div class="kl">Savings Rate</div><div class="kv">${fhd.savings_rate_percent ?? '—'}%</div></div>
    <div class="kpi kpi-purple"><div class="kl">Emergency Fund</div><div class="kv">${fhd.emergency_fund_months ?? '—'} <span class="ku">months</span></div></div>
  </div>

  ${(fhd.emergency_fund_months as number) != null ? `
  <div style="margin:12px 0 20px;">
    <div style="font-size:10px;color:#9ca3af;margin-bottom:4px;">Emergency fund, next to a common 6-month reference</div>
    <div class="progress-bar">
      <div class="progress-fill" style="width:${Math.min((Number(fhd.emergency_fund_months) / 6) * 100, 100)}%;background:${Number(fhd.emergency_fund_months) >= 6 ? '#10b981' : Number(fhd.emergency_fund_months) >= 3 ? '#f59e0b' : '#ef4444'};"></div>
    </div>
  </div>` : ''}

  ${(fhd.key_findings as string[])?.length > 0 ? `
  <h3 style="font-size:13px;margin-top:20px;">What stands out</h3>
  <div class="action-list">
    ${(fhd.key_findings as string[]).map((f) => `<div class="ai"><div class="ai-icon" style="background:#10b981;">✓</div><div class="ai-text">${f}</div></div>`).join('')}
  </div>` : ''}

  ${(fhd.action_items as string[])?.length > 0 ? `
  <div class="action-section">
  <h3 style="font-size:13px;">Notes</h3>
  <div class="action-list">
    ${(fhd.action_items as string[]).map((a) => `<div class="ai"><div class="ai-icon" style="background:#6b7280;">→</div><div class="ai-text">${a}</div></div>`).join('')}
  </div>
  </div>` : ''}
</div>

<!-- SECTION 2: RETIREMENT READINESS -->
<div class="page">
  <div class="sh">
    <div class="sh-accent" style="background:#3b82f6;"></div>
    <h2>Retirement figures</h2>
    <p>How the retirement numbers in this report were built</p>
  </div>

  <div class="split" style="margin-bottom:20px;">
    <div style="text-align:center;flex-shrink:0;">
      <div class="score-ring" style="--pct:${retPct};width:100px;height:100px;">
        <div class="score-ring-inner" style="width:80px;height:80px;font-size:22px;">${retPct}%</div>
      </div>
      <div style="font-size:9px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.04em;margin-top:4px;">Share of the figure</div>
    </div>
    <div style="flex:1;">
      <div class="kpi-row" style="margin:0;">
        <div class="kpi kpi-blue"><div class="kl">Retirement figure</div><div class="kv">$${fmt(rr.retirement_number)}</div></div>
        <div class="kpi kpi-green"><div class="kl">Projection today</div><div class="kv">$${fmt(rr.current_trajectory)}</div></div>
      </div>
    </div>
  </div>

  <div class="kpi-row">
    <div class="kpi kpi-gold"><div class="kl">Monthly amount in the projection</div><div class="kv">$${fmt(rr.monthly_savings_required)}</div></div>
    <div class="kpi kpi-purple"><div class="kl">CPP estimate, monthly</div><div class="kv">$${fmt(rr.cpp_estimated_monthly)}</div></div>
  </div>

  ${rr.rrsp_strategy ? `<div class="prose-block"><strong>RRSP</strong><p>${rr.rrsp_strategy}</p></div>` : ''}
  ${rr.tfsa_strategy ? `<div class="prose-block"><strong>TFSA</strong><p>${rr.tfsa_strategy}</p></div>` : ''}
  ${rr.fhsa_eligible && rr.fhsa_strategy ? `<div class="prose-block"><strong>FHSA</strong><p>${rr.fhsa_strategy}</p></div>` : ''}
  ${rr.gap_analysis ? `<div class="insight-card"><h4>The difference</h4><p>${rr.gap_analysis}</p></div>` : ''}

  ${(rr.action_items as string[])?.length > 0 ? `
  <div class="action-section">
  <h3 style="font-size:13px;">Notes</h3>
  <div class="action-list">
    ${(rr.action_items as string[]).map((a) => `<div class="ai"><div class="ai-icon" style="background:#6b7280;">→</div><div class="ai-text">${a}</div></div>`).join('')}
  </div>
  </div>` : ''}
</div>

<!-- SECTION 3: INVESTMENT PORTFOLIO -->
<div class="page">
  <div class="sh">
    <div class="sh-accent" style="background:#8b5cf6;"></div>
    <h2>Accounts and asset classes</h2>
    <p>An example of how asset classes can be mixed. Not a mix for these accounts.</p>
  </div>

  ${ipb.current_portfolio_assessment ? `<div class="prose-block"><strong>What is on file</strong><p>${ipb.current_portfolio_assessment}</p></div>` : ''}

  <h3 style="font-size:13px;">One example mix</h3>
  <p style="font-size:11px;color:#6b7280;margin:0 0 8px;">The slices add to 100. This is an example, not a mix for these accounts.</p>
  <div class="mix-bar">
    ${Object.entries(alloc).map(([key, val]) => {
      const color = allocColors[key] ?? '#c9aa71';
      return `<div class="mix-seg" style="width:${val}%;background:${color};"></div>`;
    }).join('')}
  </div>
  <div class="mix-legend">
    ${Object.entries(alloc).map(([key, val]) => {
      const color = allocColors[key] ?? '#c9aa71';
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
      return `<div class="mix-key"><span class="mix-swatch" style="background:${color};"></span><span>${label}</span><span class="mix-pct">${val}%</span></div>`;
    }).join('')}
  </div>

  ${coreETFs.length > 0 ? `
  <h3 style="font-size:13px;">Example funds in these categories</h3>
  <p style="font-size:12px;color:#6b7280;margin:0 0 8px;">Named funds are examples of a category. This is educational information, not financial advice.</p>
  <table class="tbl">
    <tr><th>Ticker</th><th>Name</th><th>MER</th><th>What it holds</th></tr>
    ${coreETFs.map((etf) =>
      `<tr><td class="ticker">${etf.ticker}</td><td>${etf.name}</td><td>${etf.mer}%</td><td style="font-size:11px;color:#6b7280;">${etf.rationale}</td></tr>`).join('')}
  </table>` : ''}

  <div class="two-col">
    ${ipb.account_location_strategy ? `<div class="prose-block" style="margin:0;"><strong>How registered accounts are taxed</strong><p>${ipb.account_location_strategy}</p><p style="font-size:11px;color:#6b7280;">This explains how account types are taxed. It does not say where money should move.</p></div>` : ''}
    ${ipb.rebalancing_schedule ? `<div class="prose-block" style="margin:0;"><strong>What rebalancing means</strong><p>${ipb.rebalancing_schedule}</p></div>` : ''}
  </div>

  ${(ipb.action_items as string[])?.length > 0 ? `
  <div class="action-section">
  <h3 style="font-size:13px;">Notes</h3>
  <div class="action-list">
    ${(ipb.action_items as string[]).map((a) => `<div class="ai"><div class="ai-icon" style="background:#6b7280;">→</div><div class="ai-text">${a}</div></div>`).join('')}
  </div>
  </div>` : ''}
</div>

<!-- SECTION 4: TAX EFFICIENCY -->
<div class="page">
  <div class="sh">
    <div class="sh-accent" style="background:#f59e0b;"></div>
    <h2>How the accounts are taxed</h2>
    <p>A plain look at RRSP, TFSA, and FHSA</p>
  </div>

  <div class="kpi-row">
    <div class="kpi kpi-green"><div class="kl">Tax difference in the example</div><div class="kv">$${fmt(ter.estimated_annual_tax_savings)}</div></div>
    <div class="kpi kpi-gold"><div class="kl">RRSP amount in the example</div><div class="kv">$${fmt(ter.rrsp_contribution_recommendation)}</div></div>
  </div>

  ${ter.rrsp_room_analysis ? `<div class="prose-block"><strong>RRSP room</strong><p>${ter.rrsp_room_analysis}</p></div>` : ''}
  ${ter.tfsa_strategy ? `<div class="prose-block"><strong>TFSA</strong><p>${ter.tfsa_strategy}</p></div>` : ''}
  ${ter.fhsa_analysis ? `<div class="prose-block"><strong>FHSA</strong><p>${ter.fhsa_analysis}</p></div>` : ''}
  ${ter.provincial_tax_considerations ? `<div class="prose-block"><strong>Your province</strong><p>${ter.provincial_tax_considerations}</p></div>` : ''}
  ${ter.tax_loss_harvesting_opportunities ? `<div class="prose-block"><strong>Selling at a loss, for tax</strong><p>${ter.tax_loss_harvesting_opportunities}</p></div>` : ''}
  ${ter.income_splitting_opportunities ? `<div class="prose-block"><strong>Splitting income</strong><p>${ter.income_splitting_opportunities}</p></div>` : ''}

  ${(ter.action_items as string[])?.length > 0 ? `
  <div class="action-section">
  <h3 style="font-size:13px;">Notes</h3>
  <div class="action-list">
    ${(ter.action_items as string[]).map((a) => `<div class="ai"><div class="ai-icon" style="background:#6b7280;">→</div><div class="ai-text">${a}</div></div>`).join('')}
  </div>
  </div>` : ''}
</div>

<!-- SECTION 5: DEBT ELIMINATION -->
<div class="page">
  <div class="sh">
    <div class="sh-accent" style="background:#ef4444;"></div>
    <h2>Balances and payoff timelines</h2>
    <p>A comparison of avalanche and snowball math on the balances in this report</p>
  </div>

  <div class="kpi-row">
    <div class="kpi kpi-red"><div class="kl">Total Debt</div><div class="kv">$${fmt(dep.total_debt)}</div></div>
    <div class="kpi kpi-green"><div class="kl">Payoff Timeline</div><div class="kv">${avalanche.payoff_months ?? snowball.payoff_months ?? '—'} <span class="ku">months</span></div></div>
  </div>

  ${dep.recommendation_rationale ? `<div class="insight-card"><h4>How the two methods differ</h4><p>${dep.recommendation_rationale}</p></div>` : ''}

  <h3 style="font-size:13px;">The two methods</h3>
  <table class="tbl">
    <tr><th>Method</th><th>Total Interest</th><th>Timeline</th><th>How it works</th></tr>
    <tr><td style="font-weight:700;">Avalanche</td><td>$${fmt(avalanche.total_interest_paid)}</td><td>${avalanche.payoff_months ?? '—'} months</td><td style="font-size:11px;color:#6b7280;">Pays the higher interest rate first. This lowers the interest in the math.</td></tr>
    <tr><td style="font-weight:700;">Snowball</td><td>$${fmt(snowball.total_interest_paid)}</td><td>${snowball.payoff_months ?? '—'} months</td><td style="font-size:11px;color:#6b7280;">Pays the smallest balance first. The interest in the math is often higher.</td></tr>
  </table>

  ${Number(avalanche.total_interest_paid) > 0 && Number(snowball.total_interest_paid) > 0 ? (() => {
    const avInt = Number(avalanche.total_interest_paid);
    const snInt = Number(snowball.total_interest_paid);
    const maxInt = Math.max(avInt, snInt);
    return `<div style="margin:16px 0;">
      <div style="font-size:10px;color:#9ca3af;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.04em;">Interest in the math</div>
      <div class="bar-row"><div class="bar-label">Avalanche</div><div class="bar-track"><div class="bar-fill" style="width:${(avInt/maxInt)*100}%;background:#10b981;"></div></div><div class="bar-val">$${fmt(avInt)}</div></div>
      <div class="bar-row"><div class="bar-label">Snowball</div><div class="bar-track"><div class="bar-fill" style="width:${(snInt/maxInt)*100}%;background:#f59e0b;"></div></div><div class="bar-val">$${fmt(snInt)}</div></div>
    </div>`;
  })() : ''}

  ${dep.refinancing_analysis ? `<div class="prose-block"><strong>Refinancing</strong><p>${dep.refinancing_analysis}</p></div>` : ''}

  ${(dep.action_items as string[])?.length > 0 ? `
  <div class="action-section">
  <h3 style="font-size:13px;">Notes</h3>
  <div class="action-list">
    ${(dep.action_items as string[]).map((a) => `<div class="ai"><div class="ai-icon" style="background:#6b7280;">→</div><div class="ai-text">${a}</div></div>`).join('')}
  </div>
  </div>` : ''}
</div>

<!-- SECTION 6: INSURANCE COVERAGE -->
<div class="page">
  <div class="sh">
    <div class="sh-accent" style="background:#ec4899;"></div>
    <h2>Insurance on file</h2>
    <p>Coverage on file, next to a calculated figure</p>
  </div>

  <div class="kpi-row">
    <div class="kpi kpi-blue"><div class="kl">Calculated life coverage</div><div class="kv">$${fmt(ica.life_insurance_need)}</div></div>
    <div class="kpi kpi-green"><div class="kl">Coverage on file</div><div class="kv">$${fmt(ica.current_coverage)}</div></div>
    <div class="kpi kpi-red"><div class="kl">Difference</div><div class="kv">$${fmt(ica.life_insurance_gap)}</div></div>
  </div>

  ${insNeed > 0 ? `
  <div style="margin:12px 0 20px;">
    <div style="font-size:10px;color:#9ca3af;margin-bottom:4px;">Coverage on file is ${insPct}% of the calculated figure</div>
    <div class="progress-bar" style="height:14px;">
      <div class="progress-fill" style="width:${Math.min(insPct, 100)}%;background:${insPct >= 80 ? '#10b981' : insPct >= 50 ? '#f59e0b' : '#ef4444'};"></div>
    </div>
  </div>` : ''}

  ${ica.disability_insurance_analysis ? `<div class="prose-block"><strong>Disability Insurance</strong><p>${ica.disability_insurance_analysis}</p></div>` : ''}
  ${ica.critical_illness_analysis ? `<div class="prose-block"><strong>Critical Illness</strong><p>${ica.critical_illness_analysis}</p></div>` : ''}

  ${coverageRecs.length > 0 ? `
  <h3 style="font-size:13px;">Coverage notes</h3>
  ${coverageRecs.map((rec) => `<div class="cov-card">
    <div class="cov-badge" style="background:${priorityColor(rec.priority)}20;color:${priorityColor(rec.priority)};">${rec.priority}</div>
    <div><strong style="font-size:12px;color:#0f1923;">${rec.type}</strong><p style="font-size:11px;color:#6b7280;margin-top:2px;">${rec.rationale}</p></div>
  </div>`).join('')}` : ''}

  ${(ica.action_items as string[])?.length > 0 ? `
  <div class="action-section">
  <h3 style="font-size:13px;">Notes</h3>
  <div class="action-list">
    ${(ica.action_items as string[]).map((a) => `<div class="ai"><div class="ai-icon" style="background:#6b7280;">→</div><div class="ai-text">${a}</div></div>`).join('')}
  </div>
  </div>` : ''}
</div>

<!-- SECTION 7: MARKET CONTEXT -->
<div class="page">
  <div class="sh">
    <div class="sh-accent" style="background:#6b7280;"></div>
    <h2>Markets around this report</h2>
    <p>What was going on in markets when this report was written</p>
  </div>

  ${mcr.macro_environment ? `<div class="insight-card"><h4>The big picture</h4><p>${mcr.macro_environment}</p></div>` : ''}

  <div class="two-col">
    ${mcr.canadian_market_context ? `<div class="prose-block" style="margin:0;"><strong>Canada</strong><p>${mcr.canadian_market_context}</p></div>` : ''}
    ${mcr.rate_environment_impact ? `<div class="prose-block" style="margin:0;"><strong>Interest rates</strong><p>${mcr.rate_environment_impact}</p></div>` : ''}
  </div>
  <div class="two-col">
    ${mcr.portfolio_specific_risks ? `<div class="prose-block" style="margin:0;border-left-color:#ef4444;"><strong>Risks named here</strong><p>${mcr.portfolio_specific_risks}</p></div>` : ''}
    ${mcr.portfolio_specific_opportunities ? `<div class="prose-block" style="margin:0;border-left-color:#10b981;"><strong>Openings named here</strong><p>${mcr.portfolio_specific_opportunities}</p></div>` : ''}
  </div>

  <div class="disclaimer">${mcr.disclaimer ?? 'This is educational information, not financial advice. Speak with a licensed financial advisor before implementing any changes.'}</div>
</div>

<!-- SECTION 8: LIFETIME ROADMAP -->
<div class="page">
  <div class="sh">
    <div class="sh-accent" style="background:#c9aa71;"></div>
    <h2>A look across the decades</h2>
    <p>The same report figures, shown by age</p>
  </div>

  <div class="kpi-row">
    <div class="kpi kpi-gold"><div class="kl">Independence figure</div><div class="kv">$${fmt(lfr.financial_independence_number)}</div></div>
    <div class="kpi kpi-blue"><div class="kl">Target Age</div><div class="kv">${lfr.financial_independence_target_age ?? '—'}</div></div>
  </div>

  ${(lfr.current_decade_priorities as string[])?.length > 0 ? `
  <h3 style="font-size:13px;">This decade</h3>
  <div class="action-list">
    ${(lfr.current_decade_priorities as string[]).map((p) => `<div class="ai"><div class="ai-icon" style="background:#c9aa71;">★</div><div class="ai-text">${p}</div></div>`).join('')}
  </div>` : ''}

  ${(lfr.next_decade_priorities as string[])?.length > 0 ? `
  <h3 style="font-size:13px;">Next decade</h3>
  <div class="action-list">
    ${(lfr.next_decade_priorities as string[]).map((p) => `<div class="ai"><div class="ai-icon" style="background:#6b7280;">→</div><div class="ai-text">${p}</div></div>`).join('')}
  </div>` : ''}

  ${milestones.length > 0 ? `
  <h3 style="font-size:13px;">Net Worth Milestones</h3>
  <div class="timeline">
    ${milestones.map((m) => `<div class="tl-item">
      <div class="tl-dot"></div>
      <div class="tl-age">Age ${m.age}</div>
      <div class="tl-val">$${fmt(m.target_net_worth)}</div>
      <div class="tl-desc">${m.key_actions ?? ''}</div>
    </div>`).join('')}
  </div>` : ''}

  ${lfr.decade_by_decade_summary ? `<div class="insight-card"><h4>Across the decades</h4><p>${lfr.decade_by_decade_summary}</p></div>` : ''}

  ${(lfr.action_items as string[])?.length > 0 ? `
  <div class="action-section">
  <h3 style="font-size:13px;">Notes</h3>
  <div class="action-list">
    ${(lfr.action_items as string[]).map((a) => `<div class="ai"><div class="ai-icon" style="background:#6b7280;">→</div><div class="ai-text">${a}</div></div>`).join('')}
  </div>
  </div>` : ''}

  <div class="disclaimer">
    This is educational information, not financial advice. It is not a substitute for a licensed advisor, a tax professional, or legal counsel. Past results are not a guide to what happens next. Mosaic Finance is a product of ChainForge Labs. Generated: ${new Date().toISOString()}
  </div>
</div>

</body>
</html>`;
}
