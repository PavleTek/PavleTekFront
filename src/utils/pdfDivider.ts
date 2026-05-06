import { PDFDocument } from "pdf-lib";

export type PageRange = { start: number; end: number };

export function parsePageRanges(input: string, totalPages: number): PageRange[] {
  if (!input.trim()) {
    throw new Error("Page ranges cannot be empty.");
  }

  const parts = input.split(",").map((p) => p.trim());
  const ranges: PageRange[] = [];

  for (const part of parts) {
    if (!part) continue;

    if (part.includes("-")) {
      const [startStr, endStr] = part.split("-").map((s) => s.trim());
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);

      if (isNaN(start) || isNaN(end)) {
        throw new Error(`Invalid range: "${part}". Both start and end must be numbers.`);
      }
      if (start < 1 || start > totalPages || end < 1 || end > totalPages) {
        throw new Error(`Page numbers must be between 1 and ${totalPages}. Found: ${part}`);
      }
      if (start > end) {
        throw new Error(`Invalid range: "${part}". Start page cannot be greater than end page.`);
      }
      ranges.push({ start, end });
    } else {
      const page = parseInt(part, 10);
      if (isNaN(page)) {
        throw new Error(`Invalid page number: "${part}".`);
      }
      if (page < 1 || page > totalPages) {
        throw new Error(`Page number must be between 1 and ${totalPages}. Found: ${page}`);
      }
      ranges.push({ start: page, end: page });
    }
  }

  if (ranges.length === 0) {
    throw new Error("No valid page ranges found.");
  }

  return ranges;
}

export async function splitPdfByRanges(
  file: File,
  ranges: PageRange[]
): Promise<{ name: string; bytes: Uint8Array }[]> {
  const srcBytes = await file.arrayBuffer();
  const src = await PDFDocument.load(srcBytes);
  const baseName = file.name.replace(/\.pdf$/i, "");
  const out: { name: string; bytes: Uint8Array }[] = [];

  for (const r of ranges) {
    const dst = await PDFDocument.create();
    const indices: number[] = [];
    for (let i = r.start; i <= r.end; i++) {
      indices.push(i - 1);
    }
    const copied = await dst.copyPages(src, indices);
    copied.forEach((p) => dst.addPage(p));
    const bytes = await dst.save();
    const label = r.start === r.end ? `p${r.start}` : `p${r.start}-${r.end}`;
    out.push({ name: `${baseName}_${label}.pdf`, bytes });
  }

  return out;
}
