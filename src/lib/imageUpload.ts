export type ImageKind = "jpeg" | "png" | "gif" | "webp";

const EXT: Record<ImageKind, string> = {
  jpeg: ".jpg",
  png: ".png",
  gif: ".gif",
  webp: ".webp",
};

// Inspect the first bytes of a buffer to identify real image format.
// The client-declared MIME type is not trusted — we match against magic bytes.
export function detectImageKind(buf: Buffer): ImageKind | null {
  if (buf.length < 12) return null;

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return "png";
  }

  // GIF: "GIF87a" or "GIF89a"
  if (
    buf[0] === 0x47 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x38 &&
    (buf[4] === 0x37 || buf[4] === 0x39) &&
    buf[5] === 0x61
  ) {
    return "gif";
  }

  // WebP: "RIFF"...."WEBP" (bytes 0-3 = RIFF, bytes 8-11 = WEBP)
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return "webp";
  }

  return null;
}

export function extensionFor(kind: ImageKind): string {
  return EXT[kind];
}
