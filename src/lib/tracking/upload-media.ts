import heicConvert from "heic-convert";

export type ClaudeImageType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

export type SpendingUploadKind = "pdf" | "jpeg" | "png" | "gif" | "webp" | "heic" | "unsupported";

export class UploadMediaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadMediaError";
  }
}

const UNSUPPORTED_MESSAGE =
  "That file type isn't supported. Upload a photo (including iPhone HEIC), a screenshot, or a PDF.";

const HEIC_READ_MESSAGE =
  "Couldn't read that photo. Try a screenshot or PDF, or export the photo as JPEG.";

export function classifySpendingUpload(fileName: string, mime: string): SpendingUploadKind {
  const type = mime.toLowerCase().split(";")[0]?.trim() ?? "";
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";

  if (type === "application/pdf" || type === "application/x-pdf") return "pdf";
  if (type === "image/jpeg" || type === "image/jpg") return "jpeg";
  if (type === "image/png") return "png";
  if (type === "image/gif") return "gif";
  if (type === "image/webp") return "webp";
  if (
    type === "image/heic" ||
    type === "image/heif" ||
    type === "image/heic-sequence" ||
    type === "image/heif-sequence"
  ) {
    return "heic";
  }

  const bare = type === "" || type === "application/octet-stream";
  if (bare || ext === "heic" || ext === "heif" || ext === "heics") {
    if (ext === "pdf") return "pdf";
    if (ext === "jpg" || ext === "jpeg") return "jpeg";
    if (ext === "png") return "png";
    if (ext === "gif") return "gif";
    if (ext === "webp") return "webp";
    if (ext === "heic" || ext === "heif" || ext === "heics") return "heic";
  }

  return "unsupported";
}

export interface PreparedSpendingMedia {
  kind: "image" | "pdf";
  mediaType: ClaudeImageType | "application/pdf";
  buffer: Buffer;
  extension: string;
}

export async function prepareSpendingMedia(
  buffer: Buffer,
  fileName: string,
  mime: string,
): Promise<PreparedSpendingMedia> {
  const kind = classifySpendingUpload(fileName, mime);
  if (kind === "unsupported") {
    throw new UploadMediaError(UNSUPPORTED_MESSAGE);
  }
  if (kind === "pdf") {
    return { kind: "pdf", mediaType: "application/pdf", buffer, extension: "pdf" };
  }
  if (kind === "heic") {
    try {
      const jpeg = await heicConvert({ buffer, format: "JPEG", quality: 0.85 });
      return {
        kind: "image",
        mediaType: "image/jpeg",
        buffer: Buffer.from(jpeg),
        extension: "jpg",
      };
    } catch {
      throw new UploadMediaError(HEIC_READ_MESSAGE);
    }
  }

  const mediaType: ClaudeImageType =
    kind === "png" ? "image/png" : kind === "gif" ? "image/gif" : kind === "webp" ? "image/webp" : "image/jpeg";
  const extension = kind === "png" ? "png" : kind === "gif" ? "gif" : kind === "webp" ? "webp" : "jpg";
  return { kind: "image", mediaType, buffer, extension };
}
