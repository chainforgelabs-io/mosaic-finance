/**
 * Read the first worksheets of an .xlsx file into rows of strings and numbers.
 * Keeps the spreadsheet on the device: no upload, no extra dependency.
 */

export type XlsxCell = string | number | null;

export async function sheetsFromXlsx(buffer: ArrayBuffer): Promise<XlsxCell[][][]> {
  const files = await unzip(buffer);
  const sharedXml = files.get("xl/sharedStrings.xml");
  const shared = sharedXml ? readSharedStrings(decode(sharedXml)) : [];
  const workbook = files.get("xl/workbook.xml");
  const rels = files.get("xl/_rels/workbook.xml.rels");
  const order = sheetPaths(workbook ? decode(workbook) : "", rels ? decode(rels) : "", files);

  return order
    .map((path) => readSheet(decode(files.get(path) ?? new Uint8Array()), shared))
    .filter((rows) => rows.length > 0);
}

function decode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

function sheetPaths(workbook: string, rels: string, files: Map<string, Uint8Array>): string[] {
  const targets = relTargets(rels);
  const order: string[] = [];
  for (const id of sheetIds(workbook)) {
    const target = targets.get(id);
    if (!target) continue;
    const path = normalizeZipPath(target);
    if (files.has(path)) order.push(path);
  }
  if (order.length > 0) return order;
  return [...files.keys()].filter((name) => /xl\/worksheets\/sheet\d+\.xml$/.test(name)).sort();
}

function relTargets(xml: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const tag of xml.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = tag[0].match(/\bId="([^"]+)"/)?.[1];
    const target = tag[0].match(/\bTarget="([^"]+)"/)?.[1];
    if (id && target) map.set(id, target);
  }
  return map;
}

function sheetIds(xml: string): string[] {
  const ids: string[] = [];
  for (const tag of xml.matchAll(/<sheet\b[^>]*>/g)) {
    const id = tag[0].match(/\br:id="([^"]+)"/)?.[1];
    if (id) ids.push(id);
  }
  return ids;
}

function normalizeZipPath(target: string): string {
  const clean = target.replace(/\\/g, "/").replace(/^\/+/, "");
  if (clean.startsWith("xl/")) return clean;
  return `xl/${clean}`;
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, digits: string) => String.fromCharCode(Number(digits)))
    .replace(/&amp;/g, "&");
}

function readSharedStrings(xml: string): string[] {
  const out: string[] = [];
  const parts = xml.split(/<si\b[^>]*>/);
  for (let i = 1; i < parts.length; i++) {
    const body = parts[i].split("</si>")[0] ?? "";
    const texts = [...body.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((match) => decodeXml(match[1]));
    out.push(texts.join(""));
  }
  return out;
}

function colIndex(ref: string): number {
  const letters = ref.match(/[A-Z]+/i)?.[0].toUpperCase() ?? "A";
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function rowIndex(ref: string): number {
  return Number(ref.match(/\d+/)?.[0] ?? "1") - 1;
}

function readSheet(xml: string, shared: string[]): XlsxCell[][] {
  const grid = new Map<number, Map<number, XlsxCell>>();
  let maxRow = -1;
  let maxCol = -1;
  const re = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
  for (const match of xml.matchAll(re)) {
    const attrs = match[1];
    const inner = match[2];
    if (inner == null) continue;
    const ref = attrs.match(/\br="([A-Z]+\d+)"/i)?.[1];
    if (!ref) continue;
    const type = attrs.match(/\bt="([^"]+)"/)?.[1] ?? "n";
    const value = cellValue(type, inner, shared);
    if (value == null) continue;
    const row = rowIndex(ref);
    const col = colIndex(ref);
    if (!grid.has(row)) grid.set(row, new Map());
    grid.get(row)!.set(col, value);
    if (row > maxRow) maxRow = row;
    if (col > maxCol) maxCol = col;
  }
  if (maxRow < 0) return [];
  const rows: XlsxCell[][] = [];
  for (let row = 0; row <= maxRow; row++) {
    const line: XlsxCell[] = [];
    const cells = grid.get(row);
    for (let col = 0; col <= maxCol; col++) line.push(cells?.get(col) ?? null);
    rows.push(line);
  }
  return rows;
}

function cellValue(type: string, inner: string, shared: string[]): XlsxCell | null {
  if (type === "s") {
    const index = Number(inner.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "");
    return shared[index] ?? "";
  }
  if (type === "inlineStr") {
    const texts = [...inner.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((match) => decodeXml(match[1]));
    return texts.join("");
  }
  if (type === "str") return decodeXml(inner.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "");
  if (type === "b") return inner.includes(">1<") ? "TRUE" : "FALSE";
  const raw = inner.match(/<v>([\s\S]*?)<\/v>/)?.[1];
  if (raw == null || raw === "") return null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : raw;
}

async function unzip(buffer: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const eocd = findEocd(view);
  if (eocd < 0) throw new Error("not-xlsx");
  const count = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  if (offset === 0xffffffff) throw new Error("not-xlsx");

  const files = new Map<string, Uint8Array>();
  for (let n = 0; n < count; n++) {
    if (offset + 46 > bytes.length || view.getUint32(offset, true) !== 0x02014b50) break;
    const method = view.getUint16(offset + 10, true);
    const compSize = view.getUint32(offset + 20, true);
    const nameLen = view.getUint16(offset + 28, true);
    const extraLen = view.getUint16(offset + 30, true);
    const commentLen = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decode(bytes.subarray(offset + 46, offset + 46 + nameLen));
    offset += 46 + nameLen + extraLen + commentLen;
    if (!name || name.endsWith("/")) continue;
    if (localOffset + 30 > bytes.length) continue;
    const localNameLen = view.getUint16(localOffset + 26, true);
    const localExtraLen = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLen + localExtraLen;
    const compressed = bytes.subarray(dataStart, dataStart + compSize);
    if (method === 0) files.set(name, compressed);
    else if (method === 8) files.set(name, await inflateRaw(compressed));
  }
  return files;
}

function findEocd(view: DataView): number {
  const len = view.byteLength;
  if (len < 22) return -1;
  const start = Math.max(0, len - 22 - 65535);
  for (let i = len - 22; i >= start; i--) {
    if (view.getUint32(i, true) === 0x06054b50) return i;
  }
  return -1;
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === "undefined") throw new Error("not-xlsx");
  const stream = new DecompressionStream("deflate-raw");
  const writer = stream.writable.getWriter();
  const copy = new Uint8Array(data);
  await writer.write(copy);
  await writer.close();
  const reader = stream.readable.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      total += value.length;
    }
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}
