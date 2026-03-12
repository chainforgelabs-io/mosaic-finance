import puppeteerCore from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

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
      defaultViewport: { width: 1280, height: 720 },
      args: minimalArgs,
      timeout: 60_000,
      protocolTimeout: 60_000,
    });
  }
  return puppeteerCore.launch({
    args: [...chromium.args, ...minimalArgs],
    defaultViewport: { width: 1280, height: 720 },
    executablePath: await chromium.executablePath(),
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
  .draft-banner { background: #fef2f2; border: 2px solid #fca5a5; padding: 12px 20px; margin: 20px 0; border-radius: 8px; text-align: center; font-size: 13px; color: #991b1b; font-weight: 600; }
</style>`);
    html = html.replace('<body>', '<body><div class="draft-watermark">DRAFT</div>');
    html = html.replace(
      '<!-- COVER PAGE -->',
      '<div class="draft-banner">DRAFT — This plan has not yet been reviewed by a CIM-designated professional. Content is AI-generated and unverified.</div>\n<!-- COVER PAGE -->',
    );
    html = html.replace(
      'Reviewed by a CIM-Designated Professional',
      'DRAFT — Pending CIM Professional Review',
    );
  }

  const browser = await launchBrowser();

  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(60_000);
  await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 60_000 });

  const headerText = options?.draft
    ? 'FINOVA AI — DRAFT PLAN (UNVERIFIED)'
    : 'FINOVA AI — CONFIDENTIAL FINANCIAL PLAN';
  const footerText = options?.draft
    ? 'DRAFT — This plan has NOT been reviewed by a CIM-designated professional. For educational purposes only.'
    : 'This plan was reviewed by a CIM-designated professional. It does not constitute registered investment advice.';

  const pdf = await page.pdf({
    format: 'Letter',
    printBackground: true,
    margin: { top: '1in', right: '0.75in', bottom: '1in', left: '0.75in' },
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
  const p = plan as Record<string, Record<string, unknown>>;
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
  @page { margin: 0; size: A4; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a202c; line-height: 1.65; font-size: 13px; }

  .cover { page-break-after: always; height: 100vh; background: #0f1923; color: white; display: flex; flex-direction: column; justify-content: center; align-items: center; position: relative; overflow: hidden; }
  .cover::before { content: ''; position: absolute; top: -40%; right: -20%; width: 600px; height: 600px; border-radius: 50%; background: radial-gradient(circle, rgba(201,170,113,0.08) 0%, transparent 70%); }
  .cover::after { content: ''; position: absolute; bottom: -30%; left: -10%; width: 500px; height: 500px; border-radius: 50%; background: radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%); }
  .cover-inner { position: relative; z-index: 1; text-align: center; }
  .cover .brand { font-size: 13px; letter-spacing: 6px; color: #c9aa71; font-weight: 600; margin-bottom: 16px; }
  .cover h1 { font-size: 42px; font-weight: 800; letter-spacing: 1px; line-height: 1.1; }
  .cover .subtitle { font-size: 18px; color: #c9aa71; margin-top: 16px; font-weight: 400; }
  .cover .gold-line { width: 80px; height: 2px; background: #c9aa71; margin: 32px auto; }
  .cover .meta { font-size: 11px; color: #6b7280; margin-top: 8px; }

  .page { page-break-before: always; padding: 48px 56px; min-height: 100vh; position: relative; }
  .page::after { content: ''; position: absolute; bottom: 0; left: 56px; right: 56px; height: 1px; background: #e5e7eb; }

  .sh { margin-bottom: 28px; padding-bottom: 16px; border-bottom: 2px solid #f3f4f6; }
  .sh-accent { width: 48px; height: 3px; border-radius: 2px; margin-bottom: 12px; }
  .sh h2 { font-size: 22px; font-weight: 800; color: #0f1923; letter-spacing: -0.3px; }
  .sh p { font-size: 12px; color: #9ca3af; margin-top: 4px; letter-spacing: 0.2px; }

  .kpi-row { display: flex; gap: 14px; margin: 20px 0; }
  .kpi { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 18px; position: relative; overflow: hidden; }
  .kpi::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; border-radius: 0 2px 2px 0; }
  .kpi-green::before { background: #10b981; }
  .kpi-gold::before { background: #c9aa71; }
  .kpi-blue::before { background: #3b82f6; }
  .kpi-red::before { background: #ef4444; }
  .kpi-purple::before { background: #8b5cf6; }
  .kpi .kl { font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1.2px; font-weight: 600; }
  .kpi .kv { font-size: 24px; font-weight: 800; color: #0f1923; margin-top: 4px; }
  .kpi .ku { font-size: 11px; color: #9ca3af; font-weight: 400; }

  .score-ring { width: 120px; height: 120px; border-radius: 50%; background: conic-gradient(#10b981 0deg, #10b981 calc(var(--pct) * 3.6deg), #e5e7eb calc(var(--pct) * 3.6deg)); display: flex; align-items: center; justify-content: center; margin: 0 auto 8px; }
  .score-ring-inner { width: 96px; height: 96px; border-radius: 50%; background: white; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 800; color: #0f1923; }

  .prose-block { background: #f8fafc; border-left: 3px solid #c9aa71; border-radius: 0 8px 8px 0; padding: 16px 20px; margin: 16px 0; }
  .prose-block strong { color: #0f1923; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px; }
  .prose-block p { font-size: 12.5px; color: #374151; line-height: 1.7; }

  .bar-chart { margin: 16px 0; }
  .bar-row { display: flex; align-items: center; margin-bottom: 10px; }
  .bar-label { width: 140px; font-size: 11px; font-weight: 600; color: #4b5563; text-transform: uppercase; letter-spacing: 0.5px; flex-shrink: 0; }
  .bar-track { flex: 1; height: 24px; background: #f3f4f6; border-radius: 6px; overflow: hidden; position: relative; }
  .bar-fill { height: 100%; border-radius: 6px; display: flex; align-items: center; justify-content: flex-end; padding-right: 8px; font-size: 11px; font-weight: 700; color: white; min-width: 36px; }
  .bar-val { width: 60px; text-align: right; font-size: 12px; font-weight: 700; color: #0f1923; margin-left: 10px; flex-shrink: 0; }

  .progress-bar { height: 10px; background: #f3f4f6; border-radius: 5px; overflow: hidden; margin: 8px 0; }
  .progress-fill { height: 100%; border-radius: 5px; }

  .tbl { width: 100%; border-collapse: separate; border-spacing: 0; margin: 16px 0; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0; }
  .tbl th { background: #0f1923; color: white; padding: 12px 16px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; }
  .tbl td { padding: 11px 16px; border-bottom: 1px solid #f3f4f6; font-size: 12px; color: #374151; }
  .tbl tr:last-child td { border-bottom: none; }
  .tbl tr:nth-child(even) td { background: #f8fafc; }
  .tbl .ticker { font-weight: 700; color: #10b981; font-size: 13px; }

  .action-list { margin: 16px 0; }
  .ai { display: flex; align-items: flex-start; gap: 10px; padding: 10px 14px; border-radius: 8px; margin-bottom: 6px; background: #f8fafc; }
  .ai-icon { width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; color: white; font-weight: 700; flex-shrink: 0; margin-top: 1px; }
  .ai-text { font-size: 12px; color: #374151; line-height: 1.6; flex: 1; }

  .insight-card { background: linear-gradient(135deg, #0f1923 0%, #1a2b3c 100%); border-radius: 12px; padding: 20px 24px; color: white; margin: 16px 0; }
  .insight-card h4 { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #c9aa71; margin-bottom: 8px; }
  .insight-card p { font-size: 12.5px; line-height: 1.7; color: #d1d5db; }

  .cov-card { display: flex; gap: 12px; padding: 14px 16px; border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 8px; align-items: flex-start; }
  .cov-badge { padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; flex-shrink: 0; }

  .timeline { position: relative; padding-left: 28px; margin: 16px 0; }
  .timeline::before { content: ''; position: absolute; left: 8px; top: 4px; bottom: 4px; width: 2px; background: #e5e7eb; }
  .tl-item { position: relative; margin-bottom: 20px; }
  .tl-dot { position: absolute; left: -24px; top: 4px; width: 12px; height: 12px; border-radius: 50%; background: #c9aa71; border: 2px solid white; box-shadow: 0 0 0 2px #c9aa71; }
  .tl-age { font-size: 11px; font-weight: 700; color: #c9aa71; text-transform: uppercase; letter-spacing: 0.5px; }
  .tl-val { font-size: 16px; font-weight: 800; color: #0f1923; }
  .tl-desc { font-size: 11px; color: #6b7280; margin-top: 2px; }

  .disclaimer { margin-top: 32px; padding: 16px 20px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; font-size: 10px; color: #92400e; line-height: 1.6; }

  .exec-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 20px 0; }
  .exec-metric { text-align: center; padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; }
  .exec-metric .em-val { font-size: 28px; font-weight: 800; color: #0f1923; }
  .exec-metric .em-label { font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }

  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 16px 0; }
</style>
</head>
<body>

<!-- COVER PAGE -->
<div class="cover">
  <div class="cover-inner">
    <div class="brand">FINOVA AI</div>
    <h1>PERSONAL<br>FINANCIAL PLAN</h1>
    <div class="subtitle">Comprehensive Planning Report</div>
    <div class="gold-line"></div>
    <div class="meta">${dateStr}</div>
    <div class="meta" style="margin-top:4px;">Reviewed by a CIM-Designated Professional</div>
  </div>
</div>

<!-- EXECUTIVE SUMMARY -->
<div class="page">
  <div class="sh">
    <div class="sh-accent" style="background:#c9aa71;"></div>
    <h2>Executive Summary</h2>
    <p>Your financial health at a glance</p>
  </div>

  <div style="display:flex;align-items:center;gap:32px;margin-bottom:24px;">
    <div style="text-align:center;">
      <div class="score-ring" style="--pct:${fhd.financial_health_score ?? 0}">
        <div class="score-ring-inner">${fhd.financial_health_score ?? '—'}</div>
      </div>
      <div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Health Score</div>
    </div>
    <div style="flex:1;">
      <div class="exec-grid">
        <div class="exec-metric"><div class="em-val">$${fmt(fhd.net_worth)}</div><div class="em-label">Net Worth</div></div>
        <div class="exec-metric"><div class="em-val">$${fmt(fhd.cash_flow_monthly)}</div><div class="em-label">Monthly Cash Flow</div></div>
        <div class="exec-metric"><div class="em-val">${retPct}%</div><div class="em-label">Retirement Ready</div></div>
        <div class="exec-metric"><div class="em-val">$${fmt(dep.total_debt)}</div><div class="em-label">Total Debt</div></div>
      </div>
    </div>
  </div>

  ${topActions.length > 0 ? `
  <div class="insight-card">
    <h4>Priority Actions</h4>
    ${topActions.map((a, i) => `<p style="margin-bottom:6px;">
      <span style="color:#c9aa71;font-weight:700;">${i + 1}.</span> ${a}
    </p>`).join('')}
  </div>` : ''}

  <div style="margin-top:20px;">
    <div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:8px;">Retirement Progress</div>
    <div class="progress-bar" style="height:14px;">
      <div class="progress-fill" style="width:${Math.min(retPct, 100)}%;background:${retPct >= 80 ? '#10b981' : retPct >= 50 ? '#f59e0b' : '#ef4444'};"></div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:10px;color:#9ca3af;margin-top:4px;">
      <span>Current: $${fmt(rr.current_trajectory)}</span>
      <span>Target: $${fmt(rr.retirement_number)}</span>
    </div>
  </div>
</div>

<!-- SECTION 1: FINANCIAL HEALTH -->
<div class="page">
  <div class="sh">
    <div class="sh-accent" style="background:#10b981;"></div>
    <h2>Financial Health Diagnostic</h2>
    <p>A comprehensive snapshot of your current financial position</p>
  </div>

  <div class="kpi-row">
    <div class="kpi kpi-green"><div class="kl">Net Worth</div><div class="kv">$${fmt(fhd.net_worth)}</div></div>
    <div class="kpi kpi-blue"><div class="kl">Monthly Cash Flow</div><div class="kv">$${fmt(fhd.cash_flow_monthly)}</div></div>
    <div class="kpi kpi-gold"><div class="kl">Savings Rate</div><div class="kv">${fhd.savings_rate_percent ?? '—'}%</div></div>
    <div class="kpi kpi-purple"><div class="kl">Emergency Fund</div><div class="kv">${fhd.emergency_fund_months ?? '—'} <span class="ku">months</span></div></div>
  </div>

  ${(fhd.emergency_fund_months as number) != null ? `
  <div style="margin:12px 0 20px;">
    <div style="font-size:10px;color:#9ca3af;margin-bottom:4px;">Emergency Fund Progress (Target: 6 months)</div>
    <div class="progress-bar">
      <div class="progress-fill" style="width:${Math.min((Number(fhd.emergency_fund_months) / 6) * 100, 100)}%;background:${Number(fhd.emergency_fund_months) >= 6 ? '#10b981' : Number(fhd.emergency_fund_months) >= 3 ? '#f59e0b' : '#ef4444'};"></div>
    </div>
  </div>` : ''}

  ${(fhd.key_findings as string[])?.length > 0 ? `
  <h3 style="font-size:13px;margin-top:20px;">Key Findings</h3>
  <div class="action-list">
    ${(fhd.key_findings as string[]).map((f) => `<div class="ai"><div class="ai-icon" style="background:#10b981;">✓</div><div class="ai-text">${f}</div></div>`).join('')}
  </div>` : ''}

  ${(fhd.action_items as string[])?.length > 0 ? `
  <h3 style="font-size:13px;">Action Items</h3>
  <div class="action-list">
    ${(fhd.action_items as string[]).map((a, i) => `<div class="ai"><div class="ai-icon" style="background:${i === 0 ? '#ef4444' : i < 3 ? '#f59e0b' : '#6b7280'};">→</div><div class="ai-text">${a}</div></div>`).join('')}
  </div>` : ''}
</div>

<!-- SECTION 2: RETIREMENT READINESS -->
<div class="page">
  <div class="sh">
    <div class="sh-accent" style="background:#3b82f6;"></div>
    <h2>Retirement Readiness Analysis</h2>
    <p>Your path to financial independence and retirement security</p>
  </div>

  <div style="display:flex;gap:24px;align-items:center;margin-bottom:20px;">
    <div style="text-align:center;flex-shrink:0;">
      <div class="score-ring" style="--pct:${retPct};width:100px;height:100px;">
        <div class="score-ring-inner" style="width:80px;height:80px;font-size:22px;">${retPct}%</div>
      </div>
      <div style="font-size:9px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin-top:4px;">Readiness</div>
    </div>
    <div style="flex:1;">
      <div class="kpi-row" style="margin:0;">
        <div class="kpi kpi-blue"><div class="kl">Retirement Number</div><div class="kv">$${fmt(rr.retirement_number)}</div></div>
        <div class="kpi kpi-green"><div class="kl">Current Trajectory</div><div class="kv">$${fmt(rr.current_trajectory)}</div></div>
      </div>
    </div>
  </div>

  <div class="kpi-row">
    <div class="kpi kpi-gold"><div class="kl">Monthly Savings Required</div><div class="kv">$${fmt(rr.monthly_savings_required)}</div></div>
    <div class="kpi kpi-purple"><div class="kl">Estimated CPP (Monthly)</div><div class="kv">$${fmt(rr.cpp_estimated_monthly)}</div></div>
  </div>

  ${rr.rrsp_strategy ? `<div class="prose-block"><strong>RRSP Strategy</strong><p>${rr.rrsp_strategy}</p></div>` : ''}
  ${rr.tfsa_strategy ? `<div class="prose-block"><strong>TFSA Strategy</strong><p>${rr.tfsa_strategy}</p></div>` : ''}
  ${rr.fhsa_eligible && rr.fhsa_strategy ? `<div class="prose-block"><strong>FHSA Strategy</strong><p>${rr.fhsa_strategy}</p></div>` : ''}
  ${rr.gap_analysis ? `<div class="insight-card"><h4>Gap Analysis</h4><p>${rr.gap_analysis}</p></div>` : ''}

  ${(rr.action_items as string[])?.length > 0 ? `
  <h3 style="font-size:13px;">Action Items</h3>
  <div class="action-list">
    ${(rr.action_items as string[]).map((a, i) => `<div class="ai"><div class="ai-icon" style="background:${i === 0 ? '#ef4444' : i < 3 ? '#f59e0b' : '#6b7280'};">→</div><div class="ai-text">${a}</div></div>`).join('')}
  </div>` : ''}
</div>

<!-- SECTION 3: INVESTMENT PORTFOLIO -->
<div class="page">
  <div class="sh">
    <div class="sh-accent" style="background:#8b5cf6;"></div>
    <h2>Investment Portfolio Blueprint</h2>
    <p>Personalized asset allocation and ETF considerations</p>
  </div>

  ${ipb.current_portfolio_assessment ? `<div class="prose-block"><strong>Current Assessment</strong><p>${ipb.current_portfolio_assessment}</p></div>` : ''}

  <h3 style="font-size:13px;">Suggested Allocation</h3>
  <div class="bar-chart">
    ${Object.entries(alloc).map(([key, val]) => {
      const color = allocColors[key] ?? '#c9aa71';
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
      return `<div class="bar-row">
        <div class="bar-label">${label}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${val}%;background:${color};">${val}%</div></div>
      </div>`;
    }).join('')}
  </div>

  ${coreETFs.length > 0 ? `
  <h3 style="font-size:13px;">Core ETF Considerations</h3>
  <table class="tbl">
    <tr><th>Ticker</th><th>Name</th><th>MER</th><th>Allocation</th><th>Rationale</th></tr>
    ${coreETFs.map((etf) =>
      `<tr><td class="ticker">${etf.ticker}</td><td>${etf.name}</td><td>${etf.mer}%</td><td style="font-weight:700;">${etf.allocation_percent}%</td><td style="font-size:11px;color:#6b7280;">${etf.rationale}</td></tr>`).join('')}
  </table>` : ''}

  <div class="two-col">
    ${ipb.account_location_strategy ? `<div class="prose-block" style="margin:0;"><strong>Account Location</strong><p>${ipb.account_location_strategy}</p></div>` : ''}
    ${ipb.rebalancing_schedule ? `<div class="prose-block" style="margin:0;"><strong>Rebalancing</strong><p>${ipb.rebalancing_schedule}</p></div>` : ''}
  </div>

  ${(ipb.action_items as string[])?.length > 0 ? `
  <h3 style="font-size:13px;">Action Items</h3>
  <div class="action-list">
    ${(ipb.action_items as string[]).map((a, i) => `<div class="ai"><div class="ai-icon" style="background:${i === 0 ? '#ef4444' : i < 3 ? '#f59e0b' : '#6b7280'};">→</div><div class="ai-text">${a}</div></div>`).join('')}
  </div>` : ''}
</div>

<!-- SECTION 4: TAX EFFICIENCY -->
<div class="page">
  <div class="sh">
    <div class="sh-accent" style="background:#f59e0b;"></div>
    <h2>Tax Efficiency Review</h2>
    <p>Maximizing your after-tax returns through smart account strategy</p>
  </div>

  <div class="kpi-row">
    <div class="kpi kpi-green"><div class="kl">Estimated Annual Tax Savings</div><div class="kv">$${fmt(ter.estimated_annual_tax_savings)}</div></div>
    <div class="kpi kpi-gold"><div class="kl">RRSP Contribution</div><div class="kv">$${fmt(ter.rrsp_contribution_recommendation)}</div></div>
  </div>

  ${ter.rrsp_room_analysis ? `<div class="prose-block"><strong>RRSP Room Analysis</strong><p>${ter.rrsp_room_analysis}</p></div>` : ''}
  ${ter.tfsa_strategy ? `<div class="prose-block"><strong>TFSA Strategy</strong><p>${ter.tfsa_strategy}</p></div>` : ''}
  ${ter.fhsa_analysis ? `<div class="prose-block"><strong>FHSA Analysis</strong><p>${ter.fhsa_analysis}</p></div>` : ''}
  ${ter.provincial_tax_considerations ? `<div class="prose-block"><strong>Provincial Considerations</strong><p>${ter.provincial_tax_considerations}</p></div>` : ''}
  ${ter.tax_loss_harvesting_opportunities ? `<div class="prose-block"><strong>Tax-Loss Harvesting</strong><p>${ter.tax_loss_harvesting_opportunities}</p></div>` : ''}
  ${ter.income_splitting_opportunities ? `<div class="prose-block"><strong>Income Splitting</strong><p>${ter.income_splitting_opportunities}</p></div>` : ''}

  ${(ter.action_items as string[])?.length > 0 ? `
  <h3 style="font-size:13px;">Action Items</h3>
  <div class="action-list">
    ${(ter.action_items as string[]).map((a, i) => `<div class="ai"><div class="ai-icon" style="background:${i === 0 ? '#ef4444' : i < 3 ? '#f59e0b' : '#6b7280'};">→</div><div class="ai-text">${a}</div></div>`).join('')}
  </div>` : ''}
</div>

<!-- SECTION 5: DEBT ELIMINATION -->
<div class="page">
  <div class="sh">
    <div class="sh-accent" style="background:#ef4444;"></div>
    <h2>Debt Elimination Plan</h2>
    <p>Your optimized path to becoming debt-free</p>
  </div>

  <div class="kpi-row">
    <div class="kpi kpi-red"><div class="kl">Total Debt</div><div class="kv">$${fmt(dep.total_debt)}</div></div>
    <div class="kpi kpi-gold"><div class="kl">Suggested Method</div><div class="kv">${dep.recommended_method ?? '—'}</div></div>
    <div class="kpi kpi-green"><div class="kl">Payoff Timeline</div><div class="kv">${avalanche.payoff_months ?? snowball.payoff_months ?? '—'} <span class="ku">months</span></div></div>
  </div>

  ${dep.recommendation_rationale ? `<div class="insight-card"><h4>Why This Method</h4><p>${dep.recommendation_rationale}</p></div>` : ''}

  <h3 style="font-size:13px;">Method Comparison</h3>
  <table class="tbl">
    <tr><th>Method</th><th>Total Interest</th><th>Timeline</th><th>Strategy</th></tr>
    <tr><td style="font-weight:700;">Avalanche</td><td>$${fmt(avalanche.total_interest_paid)}</td><td>${avalanche.payoff_months ?? '—'} months</td><td style="font-size:11px;color:#6b7280;">Highest interest first — minimizes cost</td></tr>
    <tr><td style="font-weight:700;">Snowball</td><td>$${fmt(snowball.total_interest_paid)}</td><td>${snowball.payoff_months ?? '—'} months</td><td style="font-size:11px;color:#6b7280;">Smallest balance first — builds momentum</td></tr>
  </table>

  ${Number(avalanche.total_interest_paid) > 0 && Number(snowball.total_interest_paid) > 0 ? (() => {
    const avInt = Number(avalanche.total_interest_paid);
    const snInt = Number(snowball.total_interest_paid);
    const maxInt = Math.max(avInt, snInt);
    return `<div style="margin:16px 0;">
      <div style="font-size:10px;color:#9ca3af;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">Total Interest Comparison</div>
      <div class="bar-row"><div class="bar-label">Avalanche</div><div class="bar-track"><div class="bar-fill" style="width:${(avInt/maxInt)*100}%;background:#10b981;">$${fmt(avInt)}</div></div></div>
      <div class="bar-row"><div class="bar-label">Snowball</div><div class="bar-track"><div class="bar-fill" style="width:${(snInt/maxInt)*100}%;background:#f59e0b;">$${fmt(snInt)}</div></div></div>
    </div>`;
  })() : ''}

  ${dep.refinancing_analysis ? `<div class="prose-block"><strong>Refinancing Analysis</strong><p>${dep.refinancing_analysis}</p></div>` : ''}

  ${(dep.action_items as string[])?.length > 0 ? `
  <h3 style="font-size:13px;">Action Items</h3>
  <div class="action-list">
    ${(dep.action_items as string[]).map((a, i) => `<div class="ai"><div class="ai-icon" style="background:${i === 0 ? '#ef4444' : i < 3 ? '#f59e0b' : '#6b7280'};">→</div><div class="ai-text">${a}</div></div>`).join('')}
  </div>` : ''}
</div>

<!-- SECTION 6: INSURANCE COVERAGE -->
<div class="page">
  <div class="sh">
    <div class="sh-accent" style="background:#ec4899;"></div>
    <h2>Insurance Coverage Audit</h2>
    <p>Identifying gaps in your financial protection</p>
  </div>

  <div class="kpi-row">
    <div class="kpi kpi-blue"><div class="kl">Life Insurance Need</div><div class="kv">$${fmt(ica.life_insurance_need)}</div></div>
    <div class="kpi kpi-green"><div class="kl">Current Coverage</div><div class="kv">$${fmt(ica.current_coverage)}</div></div>
    <div class="kpi kpi-red"><div class="kl">Coverage Gap</div><div class="kv">$${fmt(ica.life_insurance_gap)}</div></div>
  </div>

  ${insNeed > 0 ? `
  <div style="margin:12px 0 20px;">
    <div style="font-size:10px;color:#9ca3af;margin-bottom:4px;">Coverage Level (${insPct}% of recommended)</div>
    <div class="progress-bar" style="height:14px;">
      <div class="progress-fill" style="width:${Math.min(insPct, 100)}%;background:${insPct >= 80 ? '#10b981' : insPct >= 50 ? '#f59e0b' : '#ef4444'};"></div>
    </div>
  </div>` : ''}

  ${ica.disability_insurance_analysis ? `<div class="prose-block"><strong>Disability Insurance</strong><p>${ica.disability_insurance_analysis}</p></div>` : ''}
  ${ica.critical_illness_analysis ? `<div class="prose-block"><strong>Critical Illness</strong><p>${ica.critical_illness_analysis}</p></div>` : ''}

  ${coverageRecs.length > 0 ? `
  <h3 style="font-size:13px;">Coverage Considerations</h3>
  ${coverageRecs.map((rec) => `<div class="cov-card">
    <div class="cov-badge" style="background:${priorityColor(rec.priority)}20;color:${priorityColor(rec.priority)};">${rec.priority}</div>
    <div><strong style="font-size:12px;color:#0f1923;">${rec.type}</strong><p style="font-size:11px;color:#6b7280;margin-top:2px;">${rec.rationale}</p></div>
  </div>`).join('')}` : ''}

  ${(ica.action_items as string[])?.length > 0 ? `
  <h3 style="font-size:13px;">Action Items</h3>
  <div class="action-list">
    ${(ica.action_items as string[]).map((a, i) => `<div class="ai"><div class="ai-icon" style="background:${i === 0 ? '#ef4444' : i < 3 ? '#f59e0b' : '#6b7280'};">→</div><div class="ai-text">${a}</div></div>`).join('')}
  </div>` : ''}
</div>

<!-- SECTION 7: MARKET CONTEXT -->
<div class="page">
  <div class="sh">
    <div class="sh-accent" style="background:#6b7280;"></div>
    <h2>Market Context Report</h2>
    <p>Current market environment relevant to your portfolio</p>
  </div>

  ${mcr.macro_environment ? `<div class="insight-card"><h4>Macro Environment</h4><p>${mcr.macro_environment}</p></div>` : ''}

  <div class="two-col">
    ${mcr.canadian_market_context ? `<div class="prose-block" style="margin:0;"><strong>Canadian Market</strong><p>${mcr.canadian_market_context}</p></div>` : ''}
    ${mcr.rate_environment_impact ? `<div class="prose-block" style="margin:0;"><strong>Rate Environment</strong><p>${mcr.rate_environment_impact}</p></div>` : ''}
  </div>
  <div class="two-col">
    ${mcr.portfolio_specific_risks ? `<div class="prose-block" style="margin:0;border-left-color:#ef4444;"><strong>Portfolio Risks</strong><p>${mcr.portfolio_specific_risks}</p></div>` : ''}
    ${mcr.portfolio_specific_opportunities ? `<div class="prose-block" style="margin:0;border-left-color:#10b981;"><strong>Opportunities</strong><p>${mcr.portfolio_specific_opportunities}</p></div>` : ''}
  </div>

  <div class="disclaimer">${mcr.disclaimer ?? 'This market commentary is educational context only and does not constitute investment advice.'}</div>
</div>

<!-- SECTION 8: LIFETIME ROADMAP -->
<div class="page">
  <div class="sh">
    <div class="sh-accent" style="background:#c9aa71;"></div>
    <h2>Lifetime Financial Roadmap</h2>
    <p>Your decade-by-decade path to financial independence</p>
  </div>

  <div class="kpi-row">
    <div class="kpi kpi-gold"><div class="kl">Financial Independence Number</div><div class="kv">$${fmt(lfr.financial_independence_number)}</div></div>
    <div class="kpi kpi-blue"><div class="kl">Target Age</div><div class="kv">${lfr.financial_independence_target_age ?? '—'}</div></div>
  </div>

  ${(lfr.current_decade_priorities as string[])?.length > 0 ? `
  <h3 style="font-size:13px;">This Decade's Priorities</h3>
  <div class="action-list">
    ${(lfr.current_decade_priorities as string[]).map((p) => `<div class="ai"><div class="ai-icon" style="background:#c9aa71;">★</div><div class="ai-text">${p}</div></div>`).join('')}
  </div>` : ''}

  ${(lfr.next_decade_priorities as string[])?.length > 0 ? `
  <h3 style="font-size:13px;">Next Decade's Priorities</h3>
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

  ${lfr.decade_by_decade_summary ? `<div class="insight-card"><h4>Long-Term Outlook</h4><p>${lfr.decade_by_decade_summary}</p></div>` : ''}

  ${(lfr.action_items as string[])?.length > 0 ? `
  <h3 style="font-size:13px;">Action Items</h3>
  <div class="action-list">
    ${(lfr.action_items as string[]).map((a, i) => `<div class="ai"><div class="ai-icon" style="background:${i === 0 ? '#ef4444' : i < 3 ? '#f59e0b' : '#6b7280'};">→</div><div class="ai-text">${a}</div></div>`).join('')}
  </div>` : ''}
</div>

<!-- FINAL DISCLAIMER -->
<div style="padding:48px 56px;">
  <div class="disclaimer">
    <strong>IMPORTANT DISCLAIMER:</strong> This report was generated by Finova AI, an artificial intelligence financial planning tool, and reviewed by a CIM-designated professional. It does not constitute registered investment advice under applicable Canadian securities legislation. The information contained herein is for educational and planning purposes only. Past performance of any investment referenced is not indicative of future results. Users should consult a registered investment advisor, tax professional, and insurance specialist before acting on any information contained in this report. Finova AI is a product of ChainForge Labs. Generated: ${new Date().toISOString()}
  </div>
</div>

</body>
</html>`;
}
