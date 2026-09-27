import { describe, expect, it } from "vitest";
import { classifySpendingUpload } from "@/lib/tracking/upload-media";

describe("classifySpendingUpload", () => {
  it("accepts photos, screenshots, and PDFs by mime type", () => {
    expect(classifySpendingUpload("shot.png", "image/png")).toBe("png");
    expect(classifySpendingUpload("photo.jpg", "image/jpeg")).toBe("jpeg");
    expect(classifySpendingUpload("anim.gif", "image/gif")).toBe("gif");
    expect(classifySpendingUpload("pic.webp", "image/webp")).toBe("webp");
    expect(classifySpendingUpload("statement.pdf", "application/pdf")).toBe("pdf");
  });

  it("accepts iPhone HEIC and HEIF even when the browser omits a mime type", () => {
    expect(classifySpendingUpload("IMG_2044.HEIC", "image/heic")).toBe("heic");
    expect(classifySpendingUpload("IMG_2044.heif", "image/heif")).toBe("heic");
    expect(classifySpendingUpload("IMG_2044.HEIC", "")).toBe("heic");
    expect(classifySpendingUpload("IMG_2044.heic", "application/octet-stream")).toBe("heic");
  });

  it("falls back to the file extension for unlabeled downloads", () => {
    expect(classifySpendingUpload("export.PDF", "application/octet-stream")).toBe("pdf");
    expect(classifySpendingUpload("list.jpeg", "")).toBe("jpeg");
  });

  it("rejects files that are not a photo, screenshot, or PDF", () => {
    expect(classifySpendingUpload("notes.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe(
      "unsupported",
    );
    expect(classifySpendingUpload("data.csv", "text/csv")).toBe("unsupported");
  });
});
