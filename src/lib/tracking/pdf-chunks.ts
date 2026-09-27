import { PDFDocument } from "pdf-lib";

export interface PdfChunk {
  buffer: Buffer;
  startPage: number;
  endPage: number;
  pageCount: number;
}

export async function pdfPageChunks(buffer: Buffer, pagesPerChunk: number): Promise<PdfChunk[]> {
  const src = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const pageCount = src.getPageCount();
  if (pageCount < 1) {
    throw new Error("PDF has no pages");
  }
  const size = Math.max(1, pagesPerChunk);
  const chunks: PdfChunk[] = [];
  for (let start = 0; start < pageCount; start += size) {
    const end = Math.min(start + size, pageCount);
    const doc = await PDFDocument.create();
    const copied = await doc.copyPages(
      src,
      Array.from({ length: end - start }, (_, index) => start + index),
    );
    for (const page of copied) doc.addPage(page);
    chunks.push({
      buffer: Buffer.from(await doc.save()),
      startPage: start + 1,
      endPage: end,
      pageCount,
    });
  }
  return chunks;
}
