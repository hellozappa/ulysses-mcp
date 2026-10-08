import { describe, it, expect } from "@jest/globals";
import { createExtensionHandler, extendedTools } from "./extended-tools.js";
import { callbackValue, walk, projectSections } from "./library.js";
import { renderHTML, exportDocument } from "./export.js";
import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { APICall } from "./extended-tools.js";

const project = { identifier: "project", title: "Book", type: "project", containers: [
  { identifier: "main", title: "Content", type: "projectMain", sheets: [{ identifier: "chapter", type: "sheet", title: "Chapter" }] },
  { identifier: "extras", title: "Extras", type: "projectExtras", sheets: [{ identifier: "research", type: "sheet", title: "Research" }], containers: [{ identifier: "templates", title: "Templates", type: "group" }] },
] };
const wrap = (key: string, value: unknown) => JSON.stringify({ [key]: JSON.stringify(value) });
describe("API library contracts", () => {
  it("decodes callback JSON exactly once, preserving percent sequences", () => expect(callbackValue(wrap("sheet", { text: "%25 and 100%" }), "sheet")).toEqual({ text: "%25 and 100%" }));
  it("rejects omitted callback fields", () => expect(() => callbackValue("{}", "sheet")).toThrow("omitted"));
  it("distinguishes Projects and excludes only their Extras subtree", () => {
    expect(projectSections(project).main.map(x => x.identifier)).toEqual(["main"]);
    expect(walk([project], false).map(x => x.identifier)).toEqual(["project", "main", "chapter"]);
    expect(() => projectSections({ identifier: "group", title: "Book", type: "group" })).toThrow("actual");
  });
});
describe("extension execution, not copies of implementation", () => {
  it("lists actual Projects and rejects ordinary groups for Project calls", async () => {
    const api: APICall = async (action) => action === "get-root-items" ? wrap("items", [{ identifier: "root", type: "other", title: "Library", containers: [project] }]) : wrap("item", { identifier: "group", title: "Book", type: "group" });
    const handle = createExtensionHandler(api);
    expect((await handle("ulysses_list_projects", { access_token: "test" }) as any[])[0].project.identifier).toBe("project");
    await expect(handle("ulysses_get_project", { id: "group", access_token: "test" })).rejects.toThrow("actual");
  });
  it("bounds full-text reads and reports unsearched coverage", async () => {
    const calls: string[] = [];
    const api: APICall = async (action, params) => {
      calls.push(action);
      return action === "get-item" ? wrap("item", project) : wrap("sheet", { identifier: params!.id, title: "Chapter", type: "sheet", text: "needle" });
    };
    const handle = createExtensionHandler(api);
    const result: any = await handle("ulysses_search", { access_token: "test", scope_id: "project", query: "needle", field: "text", scan_limit: 1 });
    expect(result.nextOffset).toBe(1); expect(result.truncated).toBe(true);
    expect(calls.filter(x => x === "read-sheet")).toHaveLength(1);
    await expect(handle("ulysses_search", { access_token: "test", query: "x", scan_limit: 501 })).rejects.toThrow("integer");
  });
  it("copies a template through the API into the verified Project destination", async () => {
    const calls: any[] = [];
    const handle = createExtensionHandler(async (action, params) => { calls.push({ action, params }); return action === "copy" ? "{}" : wrap("item", params!.id === "project" ? project : { identifier: "source", title: "Template", type: "sheet" }); });
    await handle("ulysses_copy_sheet_template", { id: "source", project_id: "project", template_group_id: "templates", access_token: "test" });
    expect(calls.at(-1)).toEqual({ action: "copy", params: { id: "source", targetGroup: "templates" } });
  });
  it("validates scan bounds before any API call", async () => {
    let calls = 0;
    const handle = createExtensionHandler(async () => { calls++; throw new Error("Unexpected call"); });
    await expect(handle("ulysses_search", { access_token: "test", query: "x", scan_limit: 501 })).rejects.toThrow("integer");
    expect(calls).toBe(0);
  });
  it("uses metadata for title searches and respects Extras exclusion", async () => {
    const calls: string[] = [];
    const handle = createExtensionHandler(async action => { calls.push(action); return wrap("item", project); });
    const result: any = await handle("ulysses_search", { access_token: "test", scope_id: "project", query: "chapter", include_extras: false });
    expect(result.matches.map((x: any) => x.identifier)).toEqual(["chapter"]);
    expect(result.candidateCount).toBe(1); expect(result.nextOffset).toBeNull();
    expect(calls).toEqual(["get-item"]);
  });
  it("requires approval for Project rename and verifies the Project readback", async () => {
    const calls: string[] = []; let title = "Book";
    const handle = createExtensionHandler(async (action, params) => {
      calls.push(action);
      if (action === "set-group-title") { title = params!.title; return "{}"; }
      return wrap("item", { ...project, title });
    });
    await expect(handle("ulysses_project_api", { id: "project", access_token: "test", operation: "rename", title: "New Book" })).rejects.toThrow("approval");
    expect(calls).toEqual([]);
    expect((await handle("ulysses_project_api", { id: "project", access_token: "test", operation: "rename", title: "New Book", approved: true }) as any).verified).toBe(true);
    expect(calls).toEqual(["get-item", "set-group-title", "get-item"]);
  });
  it("never falls back to UI or retries an unsupported Project rename", async () => {
    let mutations = 0;
    const handle = createExtensionHandler(async action => {
      if (action === "set-group-title") { mutations++; throw new Error("Unsupported Project root"); }
      return wrap("item", project);
    });
    await expect(handle("ulysses_project_api", { id: "project", access_token: "test", operation: "rename", title: "X", approved: true })).rejects.toThrow("Unsupported");
    expect(mutations).toBe(1);
  });
  it("rejects a template destination outside the Project Extras", async () => {
    const handle = createExtensionHandler(async (_action, params) => wrap("item", params!.id === "project" ? project : { identifier: "source", title: "Template", type: "sheet" }));
    await expect(handle("ulysses_copy_sheet_template", { id: "source", project_id: "project", template_group_id: "main", access_token: "test" })).rejects.toThrow("inside");
  });
  it("restores only enumerated trashed items to an explicit live destination", async () => {
    const calls: any[] = [];
    const discarded = { identifier: "discarded", type: "sheet", title: "Discarded" };
    const handle = createExtensionHandler(async (action, params) => {
      calls.push({ action, params });
      if (action === "get-root-items") return wrap("items", [project, { identifier: "trash", title: "Trash", type: "trash", sheets: [discarded] }]);
      if (action === "move") return JSON.stringify({ targetId: "restored" });
      return wrap("item", { identifier: "main", type: "projectMain", title: "Content", sheets: [{ ...discarded, identifier: "restored" }] });
    });
    const args = { id: "discarded", target_group: "main", access_token: "test", approved: true };
    const result: any = await handle("ulysses_restore_item", args);
    expect(result.verified).toBe(true);
    expect(calls.find(x => x.action === "move").params).toEqual({ id: "discarded", targetGroup: "main", "access-token": "test" });
    await expect(handle("ulysses_restore_item", { ...args, id: "chapter" })).rejects.toThrow("Trash");
    await expect(handle("ulysses_restore_item", { ...args, target_group: "trash" })).rejects.toThrow("destination");
    await expect(handle("ulysses_restore_item", { ...args, approved: false })).rejects.toThrow("approval");
    expect(calls.filter(x => x.action === "move")).toHaveLength(1);
  });
  it("dispatches the missing QuickLook action without requiring authorization", async () => {
    const handle = createExtensionHandler(async (action, params) => JSON.stringify({ action, params }));
    expect(JSON.parse(await handle("ulysses_get_quick_look_url", { id: "chapter" }) as string)).toEqual({ action: "get-quick-look-url", params: { id: "chapter" } });
  });
  it("fails on missing API text instead of emitting a blank export", async () => {
    const handle = createExtensionHandler(async () => wrap("sheet", { identifier: "id", type: "sheet", title: "Draft" }));
    await expect(handle("ulysses_sheet_statistics", { id: "id", access_token: "test" })).rejects.toThrow("full text");
  });
  it("registers distinct tools with precise schemas", () => expect(new Set(extendedTools.map(x => x.name)).size).toBe(extendedTools.length));
});
describe("exports", () => {
  it("renders structure and footnotes, escapes title and raw HTML", () => {
    const html = renderHTML("# Heading\n\n**strong** [link](https://example.com)\n\nFootnote[^1]\n\n[^1]: Note\n\n<script>alert(1)</script>", "<title>");
    expect(html).toContain("<h1>Heading</h1>"); expect(html).toContain("<strong>strong</strong>"); expect(html).toContain("footnote"); expect(html).not.toContain("<script>"); expect(html).toContain("&lt;title&gt;");
  });
  it("excludes Project Extras and material from group export, and refuses truncation", async () => {
    const directory = await mkdtemp(join(process.cwd(), "work/project-export-test-"));
    const root = structuredClone(project);
    root.containers[0].sheets!.push({ identifier: "material", title: "Notes", type: "sheet", isMaterial: true } as any);
    const reads: string[] = [];
    const handle = createExtensionHandler(async (action, params) => {
      if (action === "get-item") return wrap("item", root);
      reads.push(params!.id);
      return wrap("sheet", { identifier: params!.id, title: "Chapter", type: "sheet", text: "# Chapter\n\nText" });
    });
    const result: any = await handle("ulysses_export", { id: "project", access_token: "test", format: "markdown", output_path: join(directory, "book.md") });
    expect(reads).toEqual(["chapter"]); expect(result.sheets).toEqual(["chapter"]);
    expect(await readFile(result.outputPath, "utf8")).toBe("# Chapter\n\nText");
    root.containers[0].sheets!.push({ identifier: "second", title: "Second", type: "sheet" });
    reads.length = 0;
    await expect(handle("ulysses_export", { id: "project", access_token: "test", format: "markdown", output_path: join(directory, "too-many.md"), sheet_limit: 1 })).rejects.toThrow("truncating");
    expect(reads).toEqual([]);
  });
  it("exports exact Markdown and native RTF conversion without overwriting", async () => {
    const directory = await mkdtemp(join(process.cwd(), "work/export-test-"));
    const output = join(directory, "draft.md");
    await exportDocument("# Draft\n\nText", "Draft", "markdown", output);
    expect(await readFile(output, "utf8")).toBe("# Draft\n\nText");
    await expect(exportDocument("overwrite", "Draft", "markdown", output)).rejects.toThrow();
    const rtf = join(directory, "draft.rtf");
    await exportDocument("# Draft\n\n**Bold** and café", "Draft", "rtf", rtf);
    expect(await readFile(rtf, "utf8")).toContain("{\\rtf1");
  }, 15000); // Allow the native converter's bounded 10-second timeout to complete.
});
