import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export async function generatePDF(
  planData: Record<string, unknown>,
  _userId: string,
): Promise<Buffer> {
  const html = buildReportHTML(planData);

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: 1280, height: 720 },
    executablePath: await chromium.executablePath(),
    headless: true,
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdf = await page.pdf({
    format: 'Letter',
    printBackground: true,
    margin: { top: '1in', right: '0.75in', bottom: '1in', left: '0.75in' },
    displayHeaderFooter: true,
    headerTemplate: `<div style="font-size:9px;font-family:Arial;width:100%;text-align:center;color:#666;">FINOVA AI — CONFIDENTIAL FINANCIAL PLAN</div>`,
    footerTemplate: `<div style="font-size:8px;font-family:Arial;width:100%;padding:0 60px;display:flex;justify-content:space-between;color:#999;">
      <span>This plan was reviewed by a CIM-designated professional. It does not constitute registered investment advice.</span>
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

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Arial', sans-serif; color: #1a1a1a; line-height: 1.6; }
  .cover { page-break-after: always; display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; background: #0f1923; color: white; }
  .cover h1 { font-size: 48px; font-weight: 700; letter-spacing: 2px; }
  .cover h2 { font-size: 20px; color: #c9aa71; margin-top: 12px; }
  .cover .generated { margin-top: 60px; font-size: 12px; color: #888; }
  .section { page-break-before: always; padding: 40px 0; }
  .section-header { border-left: 4px solid #c9aa71; padding-left: 16px; margin-bottom: 24px; }
  .section-header h2 { font-size: 24px; font-weight: 700; color: #0f1923; }
  .section-header p { color: #666; font-size: 13px; margin-top: 4px; }
  .score-badge { display: inline-block; background: #0f1923; color: white; font-size: 48px; font-weight: 700; padding: 16px 32px; border-radius: 8px; margin: 20px 0; }
  .data-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 20px 0; }
  .data-card { background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 16px; }
  .data-card .label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
  .data-card .value { font-size: 22px; font-weight: 700; color: #0f1923; margin-top: 4px; }
  .action-item { display: flex; align-items: flex-start; gap: 12px; padding: 12px 0; border-bottom: 1px solid #f0f0f0; }
  .action-item::before { content: "→"; color: #c9aa71; font-weight: 700; flex-shrink: 0; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  th { background: #0f1923; color: white; padding: 10px 12px; text-align: left; font-size: 12px; }
  td { padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 13px; }
  tr:nth-child(even) td { background: #f8f9fa; }
  .disclaimer { margin-top: 40px; padding: 16px; background: #fff8e1; border: 1px solid #ffe082; border-radius: 6px; font-size: 11px; color: #666; }
  .highlight { background: #c9aa71; color: white; padding: 2px 8px; border-radius: 4px; font-weight: 700; }
  h3 { font-size: 16px; font-weight: 700; margin-top: 24px; margin-bottom: 12px; }
  p { margin: 8px 0; }
  strong { color: #0f1923; }
</style>
</head>
<body>

<!-- COVER PAGE -->
<div class="cover">
  <div style="text-align:center">
    <div style="font-size:14px;letter-spacing:4px;color:#c9aa71;margin-bottom:8px">FINOVA AI</div>
    <h1>PERSONAL FINANCIAL PLAN</h1>
    <h2>Comprehensive Planning Report</h2>
    <div class="generated">Generated ${new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })} | Reviewed by a CIM-Designated Professional</div>
  </div>
</div>

<!-- SECTION 1: FINANCIAL HEALTH DIAGNOSTIC -->
<div class="section">
  <div class="section-header">
    <h2>Financial Health Diagnostic</h2>
    <p>A comprehensive snapshot of your current financial position</p>
  </div>
  <div class="score-badge">${fhd.financial_health_score ?? '—'}/100</div>
  <div class="data-grid">
    <div class="data-card"><div class="label">Net Worth</div><div class="value">$${fmt(fhd.net_worth)}</div></div>
    <div class="data-card"><div class="label">Monthly Cash Flow</div><div class="value">$${fmt(fhd.cash_flow_monthly)}</div></div>
    <div class="data-card"><div class="label">Savings Rate</div><div class="value">${fhd.savings_rate_percent ?? '—'}%</div></div>
    <div class="data-card"><div class="label">Emergency Fund</div><div class="value">${fhd.emergency_fund_months ?? '—'} months</div></div>
  </div>
  ${actionItems(fhd.key_findings as string[])}
  <h3>Action Items</h3>
  ${actionItems(fhd.action_items as string[])}
</div>

<!-- SECTION 2: RETIREMENT READINESS -->
<div class="section">
  <div class="section-header">
    <h2>Retirement Readiness Analysis</h2>
    <p>Your path to financial independence and retirement security</p>
  </div>
  <div class="data-grid">
    <div class="data-card"><div class="label">Retirement Number</div><div class="value">$${fmt(rr.retirement_number)}</div></div>
    <div class="data-card"><div class="label">Current Trajectory</div><div class="value">$${fmt(rr.current_trajectory)}</div></div>
    <div class="data-card"><div class="label">Monthly Savings Required</div><div class="value">$${fmt(rr.monthly_savings_required)}</div></div>
    <div class="data-card"><div class="label">Estimated CPP (Monthly)</div><div class="value">$${fmt(rr.cpp_estimated_monthly)}</div></div>
  </div>
  <p><strong>RRSP Strategy:</strong> ${rr.rrsp_strategy ?? '—'}</p>
  <p><strong>TFSA Strategy:</strong> ${rr.tfsa_strategy ?? '—'}</p>
  ${rr.fhsa_eligible ? `<p><strong>FHSA Strategy:</strong> ${rr.fhsa_strategy ?? '—'}</p>` : ''}
  <p style="margin-top:16px;"><strong>Gap Analysis:</strong> ${rr.gap_analysis ?? '—'}</p>
  <h3>Action Items</h3>
  ${actionItems(rr.action_items as string[])}
</div>

<!-- SECTION 3: INVESTMENT PORTFOLIO BLUEPRINT -->
<div class="section">
  <div class="section-header">
    <h2>Investment Portfolio Blueprint</h2>
    <p>Personalized asset allocation and ETF recommendations</p>
  </div>
  <p style="margin-bottom:16px;"><strong>Current Portfolio Assessment:</strong> ${ipb.current_portfolio_assessment ?? '—'}</p>
  <h3 style="font-size:14px;">Recommended Allocation</h3>
  <div class="data-grid">
    ${Object.entries(alloc).map(([key, val]) =>
      `<div class="data-card"><div class="label">${key.replace(/_/g, ' ')}</div><div class="value">${val}%</div></div>`).join('')}
  </div>
  <h3 style="font-size:14px;">Core ETF Recommendations</h3>
  <table>
    <tr><th>Ticker</th><th>Name</th><th>MER</th><th>Allocation</th><th>Rationale</th></tr>
    ${coreETFs.map((etf) =>
      `<tr><td><strong>${etf.ticker}</strong></td><td>${etf.name}</td><td>${etf.mer}%</td><td>${etf.allocation_percent}%</td><td>${etf.rationale}</td></tr>`).join('')}
  </table>
  <p style="margin-top:16px;"><strong>Account Location Strategy:</strong> ${ipb.account_location_strategy ?? '—'}</p>
  <p><strong>Rebalancing Schedule:</strong> ${ipb.rebalancing_schedule ?? '—'}</p>
  <h3>Action Items</h3>
  ${actionItems(ipb.action_items as string[])}
</div>

<!-- SECTION 4: TAX EFFICIENCY REVIEW -->
<div class="section">
  <div class="section-header">
    <h2>Tax Efficiency Review</h2>
    <p>Maximizing your after-tax returns through smart account and contribution strategy</p>
  </div>
  <div class="data-grid">
    <div class="data-card"><div class="label">Estimated Annual Tax Savings</div><div class="value">$${fmt(ter.estimated_annual_tax_savings)}</div></div>
    <div class="data-card"><div class="label">RRSP Contribution Recommendation</div><div class="value">$${fmt(ter.rrsp_contribution_recommendation)}</div></div>
  </div>
  <p><strong>RRSP Room Analysis:</strong> ${ter.rrsp_room_analysis ?? '—'}</p>
  <p><strong>TFSA Strategy:</strong> ${ter.tfsa_strategy ?? '—'}</p>
  <p><strong>FHSA Analysis:</strong> ${ter.fhsa_analysis ?? '—'}</p>
  <p><strong>Provincial Considerations:</strong> ${ter.provincial_tax_considerations ?? '—'}</p>
  ${ter.tax_loss_harvesting_opportunities ? `<p><strong>Tax-Loss Harvesting:</strong> ${ter.tax_loss_harvesting_opportunities}</p>` : ''}
  ${ter.income_splitting_opportunities ? `<p><strong>Income Splitting:</strong> ${ter.income_splitting_opportunities}</p>` : ''}
  <h3>Action Items</h3>
  ${actionItems(ter.action_items as string[])}
</div>

<!-- SECTION 5: DEBT ELIMINATION PLAN -->
<div class="section">
  <div class="section-header">
    <h2>Debt Elimination Plan</h2>
    <p>Your optimized path to becoming debt-free</p>
  </div>
  <div class="data-grid">
    <div class="data-card"><div class="label">Total Debt</div><div class="value">$${fmt(dep.total_debt)}</div></div>
    <div class="data-card"><div class="label">Recommended Method</div><div class="value">${dep.recommended_method ?? '—'}</div></div>
  </div>
  <p style="margin-top:16px;"><strong>Why This Method:</strong> ${dep.recommendation_rationale ?? '—'}</p>
  <table>
    <tr><th>Method</th><th>Total Interest Paid</th><th>Payoff Timeline</th></tr>
    <tr><td>Avalanche</td><td>$${fmt(avalanche.total_interest_paid)}</td><td>${avalanche.payoff_months ?? '—'} months</td></tr>
    <tr><td>Snowball</td><td>$${fmt(snowball.total_interest_paid)}</td><td>${snowball.payoff_months ?? '—'} months</td></tr>
  </table>
  ${dep.refinancing_analysis ? `<p><strong>Refinancing Analysis:</strong> ${dep.refinancing_analysis}</p>` : ''}
  <h3>Action Items</h3>
  ${actionItems(dep.action_items as string[])}
</div>

<!-- SECTION 6: INSURANCE COVERAGE AUDIT -->
<div class="section">
  <div class="section-header">
    <h2>Insurance Coverage Audit</h2>
    <p>Identifying gaps in your financial protection</p>
  </div>
  <div class="data-grid">
    <div class="data-card"><div class="label">Life Insurance Need</div><div class="value">$${fmt(ica.life_insurance_need)}</div></div>
    <div class="data-card"><div class="label">Current Coverage</div><div class="value">$${fmt(ica.current_coverage)}</div></div>
    <div class="data-card"><div class="label">Coverage Gap</div><div class="value highlight">$${fmt(ica.life_insurance_gap)}</div></div>
  </div>
  <p><strong>Disability Insurance:</strong> ${ica.disability_insurance_analysis ?? '—'}</p>
  <p><strong>Critical Illness:</strong> ${ica.critical_illness_analysis ?? '—'}</p>
  <h3 style="font-size:14px;">Recommendations</h3>
  ${coverageRecs.map((rec) =>
    `<div class="action-item"><strong>[${rec.priority}]</strong> ${rec.type}: ${rec.rationale}</div>`).join('')}
  <h3>Action Items</h3>
  ${actionItems(ica.action_items as string[])}
</div>

<!-- SECTION 7: MARKET CONTEXT REPORT -->
<div class="section">
  <div class="section-header">
    <h2>Market Context Report</h2>
    <p>Current market environment relevant to your portfolio</p>
  </div>
  <p style="margin:16px 0;">${mcr.macro_environment ?? '—'}</p>
  <p><strong>Canadian Market:</strong> ${mcr.canadian_market_context ?? '—'}</p>
  <p><strong>Rate Environment Impact:</strong> ${mcr.rate_environment_impact ?? '—'}</p>
  <p><strong>Portfolio-Specific Risks:</strong> ${mcr.portfolio_specific_risks ?? '—'}</p>
  <p><strong>Portfolio-Specific Opportunities:</strong> ${mcr.portfolio_specific_opportunities ?? '—'}</p>
  <div class="disclaimer">${mcr.disclaimer ?? 'This market commentary is educational context only.'}</div>
</div>

<!-- SECTION 8: LIFETIME FINANCIAL ROADMAP -->
<div class="section">
  <div class="section-header">
    <h2>Lifetime Financial Roadmap</h2>
    <p>Your decade-by-decade path to financial independence</p>
  </div>
  <div class="data-grid">
    <div class="data-card"><div class="label">Financial Independence Number</div><div class="value">$${fmt(lfr.financial_independence_number)}</div></div>
    <div class="data-card"><div class="label">Target Age</div><div class="value">${lfr.financial_independence_target_age ?? '—'}</div></div>
  </div>
  <h3 style="font-size:14px;">This Decade's Priorities</h3>
  ${actionItems(lfr.current_decade_priorities as string[])}
  <h3 style="font-size:14px;">Next Decade's Priorities</h3>
  ${actionItems(lfr.next_decade_priorities as string[])}
  <h3 style="font-size:14px;">Net Worth Milestones</h3>
  <table>
    <tr><th>Age</th><th>Target Net Worth</th><th>Key Actions</th></tr>
    ${milestones.map((m) =>
      `<tr><td>${m.age}</td><td>$${fmt(m.target_net_worth)}</td><td>${m.key_actions}</td></tr>`).join('')}
  </table>
  <p style="margin-top:16px;">${lfr.decade_by_decade_summary ?? ''}</p>
  <h3>Action Items</h3>
  ${actionItems(lfr.action_items as string[])}
</div>

<!-- FINAL DISCLAIMER -->
<div class="disclaimer">
  <strong>IMPORTANT DISCLAIMER:</strong> This report was generated by Finova AI, an artificial intelligence financial planning tool, and reviewed by a CIM-designated professional. It does not constitute registered investment advice under applicable Canadian securities legislation. The information contained herein is for educational and planning purposes only. Past performance of any investment referenced is not indicative of future results. Users should consult a registered investment advisor, tax professional, and insurance specialist before acting on any recommendations contained in this report. Finova AI is a product of ChainForge Labs. Generated: ${new Date().toISOString()}
</div>

</body>
</html>`;
}
