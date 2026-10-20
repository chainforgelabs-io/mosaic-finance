import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { entriesFromPlanSheet, parseCsv } from "@/lib/tracking/plan-spreadsheet";
import { sheetsFromXlsx } from "@/lib/tracking/xlsx-sheet";

describe("plan spreadsheet", () => {
  it("reads a sectioned month grid and skips totals", () => {
    const rows = [
      ["Income"],
      ["Category", "Jan", "Feb", "Mar", "2026"],
      ["First Growth Salary", 10000, 10000, 12000, 32000],
      ["Enter Income Category...", "", "", "", ""],
      ["Total", 10000, 10000, 12000, 32000],
      ["Expenses"],
      ["Mortgage (Residential)", "$1,726.94", "$1,726.94", "$2,590.41"],
      ["To be allocated"],
      ["Savings"],
      ["TFSA", 500, 500, 500],
    ];
    const parsed = entriesFromPlanSheet(rows, 2026);
    expect(parsed.categories.map((row) => `${row.kind}:${row.slug}`)).toEqual([
      "income:first_growth_salary",
      "expense:mortgage_residential",
      "savings:tfsa",
    ]);
    const salary = parsed.entries.filter((entry) => entry.category === "first_growth_salary");
    expect(salary).toEqual([
      { kind: "income", category: "first_growth_salary", month: "2026-01-01", amount: 10000 },
      { kind: "income", category: "first_growth_salary", month: "2026-02-01", amount: 10000 },
      { kind: "income", category: "first_growth_salary", month: "2026-03-01", amount: 12000 },
    ]);
    const mortgage = parsed.entries.find((entry) => entry.month === "2026-03-01" && entry.kind === "expense");
    expect(mortgage?.amount).toBe(2590.41);
  });

  it("fills a biweekly row from the last payment date", () => {
    const rows = parseCsv("kind,name,amount,frequency,last payment\nexpense,Mortgage,863.47,biweekly,2026-01-02\n");
    const parsed = entriesFromPlanSheet(rows, 2026);
    const january = parsed.entries.find((entry) => entry.month === "2026-01-01");
    const february = parsed.entries.find((entry) => entry.month === "2026-02-01");
    expect(january?.amount).toBe(2590.41);
    expect(february?.amount).toBe(1726.94);
    expect(parsed.categories[0]).toEqual({ slug: "mortgage", label: "Mortgage", kind: "expense" });
  });

  it("reads a semicolon-separated sheet", () => {
    const rows = parseCsv("kind;name;amount\nincome;Salary;5000\n");
    const parsed = entriesFromPlanSheet(rows, 2026);
    expect(parsed.entries).toHaveLength(12);
    expect(parsed.entries[0].amount).toBe(5000);
  });
});

describe("xlsx sheet", () => {
  it("reads a deflated workbook into plan rows", async () => {
    const shared = `<?xml version="1.0"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>Income</t></si><si><t>Category</t></si><si><t>Jan</t></si><si><t>Feb</t></si><si><t>Mar</t></si><si><t>Salary</t></si><si><t>Expenses</t></si><si><t>Rent</t></si></sst>`;
    const sheet = `<?xml version="1.0"?><worksheet><sheetData>
      <row><c r="A1" t="s"><v>0</v></c></row>
      <row><c r="A2" t="s"><v>1</v></c><c r="B2" t="s"><v>2</v></c><c r="C2" t="s"><v>3</v></c><c r="D2" t="s"><v>4</v></c></row>
      <row><c r="A3" t="s"><v>5</v></c><c r="B3"><v>5000</v></c><c r="C3"><v>5100</v></c><c r="D3"><v>5200</v></c></row>
      <row><c r="A4" t="s"><v>6</v></c></row>
      <row><c r="A5" t="s"><v>7</v></c><c r="B5"><v>1800</v></c><c r="C5"><v>1800</v></c><c r="D5"><v>1800</v></c></row>
    </sheetData></worksheet>`;
    const workbook = `<?xml version="1.0"?><workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Budget" sheetId="1" r:id="rId1"/></sheets></workbook>`;
    const rels = `<?xml version="1.0"?><Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>`;
    const packed = zip([
      { name: "xl/sharedStrings.xml", data: Buffer.from(shared) },
      { name: "xl/workbook.xml", data: Buffer.from(workbook) },
      { name: "xl/_rels/workbook.xml.rels", data: Buffer.from(rels) },
      { name: "xl/worksheets/sheet1.xml", data: Buffer.from(sheet) },
    ]);
    const copy = new ArrayBuffer(packed.byteLength);
    new Uint8Array(copy).set(packed);
    const sheets = await sheetsFromXlsx(copy);
    const parsed = entriesFromPlanSheet(sheets[0], 2026);
    expect(parsed.categories.map((row) => row.slug)).toEqual(["salary", "rent"]);
    expect(parsed.entries.find((entry) => entry.category === "salary" && entry.month === "2026-03-01")?.amount).toBe(5200);
    expect(parsed.entries.find((entry) => entry.category === "rent")?.kind).toBe("expense");
  });
});

function crc32(data: Buffer): number {
  let crc = ~0;
  for (const byte of data) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}

function zip(files: { name: string; data: Buffer }[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.name);
    const compressed = deflateRawSync(file.data);
    const crc = crc32(file.data);
    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(file.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    name.copy(local, 30);
    const chunk = Buffer.concat([local, compressed]);
    locals.push(chunk);
    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(file.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    name.copy(central, 46);
    centrals.push(central);
    offset += chunk.length;
  }
  const centralBuf = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBuf, eocd]);
}
