/**
 * Known valid Canadian-listed ETF tickers.
 * Used by prompt quality tests to validate that Claude recommends real ETFs.
 * This is not exhaustive — it covers the most common ETFs referenced
 * in Canadian financial planning.
 */
export const VALID_CANADIAN_ETFS = new Set([
  // iShares (BlackRock)
  'XIC', 'XIU', 'XBB', 'XSB', 'XRE', 'XEG', 'XFN', 'XMA', 'XIT',
  'XSP', 'XIN', 'XEM', 'XEF', 'XEQT', 'XGRO', 'XBAL', 'XINC',
  'XHY', 'XIG', 'XMD', 'XCS', 'XCV', 'XDV', 'XEI', 'XMV', 'XUS',
  'XUU', 'XAW', 'XST', 'XEC',

  // Vanguard
  'VCN', 'VFV', 'VUN', 'VXC', 'VIU', 'VEE', 'VAB', 'VBG', 'VBU',
  'VSB', 'VSC', 'VEQT', 'VGRO', 'VBAL', 'VRIF', 'VDY', 'VRE',

  // BMO
  'ZAG', 'ZDB', 'ZSP', 'ZDV', 'ZRE', 'ZWB', 'ZWC', 'ZEB', 'ZEA',
  'ZEM', 'ZCN', 'ZLB', 'ZLU', 'ZGQ', 'ZCS', 'ZST', 'ZTL', 'ZMI',
  'ZPR', 'ZPS', 'ZQQ', 'ZNQ', 'ZUQ',

  // CI (formerly First Asset)
  'CBAL', 'CEQT',

  // Horizons / Global X
  'HXS', 'HXT', 'HBB', 'HXCN', 'HBAL', 'HEQT',

  // Purpose Investments
  'PDF', 'PBI', 'PHR', 'PSA', 'RPS',

  // Mackenzie
  'QUU', 'QCN',

  // TD
  'TPE', 'TPU', 'TTP',

  // Fidelity
  'FBAL', 'FCIG', 'FEQT', 'FCCL',
]);

export function isValidCanadianETF(ticker: string): boolean {
  return VALID_CANADIAN_ETFS.has(ticker.toUpperCase());
}
