import MarkdownIt from "markdown-it";
import footnote from "markdown-it-footnote";
import { execFile } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { isAbsolute } from "node:path";

const renderer = new MarkdownIt({ html: false, linkify: true }).use(footnote);
export function renderHTML(markdown: string, title: string): string {
  const escaped = renderer.utils.escapeHtml(title);
  return `<!doctype html>\n<html><head><meta charset="utf-8"><title>${escaped}</title></head><body>\n${renderer.render(markdown)}</body></html>\n`;
}
export async function exportDocument(markdown: string, title: string, format: string, outputPath: string) {
  if (!isAbsolute(outputPath)) throw new Error("output_path must be absolute");
  if (!["markdown", "html", "rtf"].includes(format)) throw new Error("format must be markdown, html, or rtf");
  let data: string | Buffer = format === "markdown" ? markdown : renderHTML(markdown, title);
  if (format === "rtf") {
    data = await new Promise<Buffer>((resolve, reject) => {
      const child = execFile("/usr/bin/textutil", ["-convert", "rtf", "-format", "html", "-stdin", "-stdout"], { encoding: "buffer", timeout: 10000, maxBuffer: 16 * 1024 * 1024 }, (error, stdout) => {
        if (error) reject(new Error("HTML to RTF conversion failed")); else resolve(stdout);
      });
      child.stdin?.end(data);
    });
  }
  // Never overwrite an existing export, even when a client repeats a timed-out call.
  await writeFile(outputPath, data, { flag: "wx", mode: 0o600 });
  return { outputPath, format, bytes: Buffer.byteLength(data), renderer: format === "markdown" ? "Ulysses read-sheet Markdown" : "CommonMark + tables + footnotes; RTF converted by macOS textutil", limitations: format === "markdown" ? [] : ["Ulysses export styles and embedded image attachments are not reconstructed; Markdown XL extensions outside CommonMark may remain literal"] };
}
