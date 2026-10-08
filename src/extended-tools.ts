import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { callbackValue, walk, projectSections, requiredString as str, boundedInteger, type Item } from "./library.js";
import { isAbsolute } from "node:path";
import { exportDocument } from "./export.js";
import { unavailableCurrentSheet } from "./current-sheet.js";

export type APICall = (action: string, params?: Record<string, string>) => Promise<string>;
type Args = Record<string, unknown>;
const string = { type: "string" };
const token = { ...string, description: "Ulysses authorization token. Never persist or disclose it." };
const approved = { type: "boolean", description: "Set true only after the human explicitly approves this specific destructive operation; server access authorization is not human approval." };
function tool(name: string, description: string, properties: Record<string, any>, required: string[], readOnly = false): Tool {
  return { name, description, inputSchema: { type: "object", additionalProperties: false, properties, required }, annotations: { readOnlyHint: readOnly, destructiveHint: !readOnly, openWorldHint: false } };
}
export const extendedTools: Tool[] = [
  tool("ulysses_get_capabilities", "Describe API-backed capabilities, local export conversion, and operations outside this server’s API scope.", {}, [], true),
  tool("ulysses_get_current_sheet", "Current-sheet detection is unavailable. Shortcuts is disabled and must not be launched. Returns an unavailable result without app, clipboard, or UI operations; no direct API route has been verified.", { access_token: token, text: { type: "boolean", description: "Retained for compatibility; no body is read while detection is unavailable." } }, [], true),
  tool("ulysses_list_projects", "Find actual Projects by API item type, including main content and Extras; regular groups are not Projects.", { access_token: token }, ["access_token"], true),
  tool("ulysses_get_project", "Inspect one actual Project and its main/Extras structure through the API.", { id: string, access_token: token }, ["id", "access_token"], true),
  tool("ulysses_search", "API-first bounded search by title, keyword, or full text in a specified group/Project or library. Returns scan offsets and explicit truncation; no implicit full-library body scan.", { access_token: token, query: string, scope_id: string, field: { type: "string", enum: ["title", "keywords", "text"] }, scan_limit: { type: "integer", minimum: 1, maximum: 500 }, offset: { type: "integer", minimum: 0 }, include_extras: { type: "boolean" } }, ["access_token", "query"], true),
  tool("ulysses_export", "Export a sheet, group, or Project to Markdown, HTML, or rich text (RTF) using API reads. Project export excludes Extras and material. HTML/RTF use local conversion, not Ulysses export styles. Never overwrites a file.", { id: string, access_token: token, format: { type: "string", enum: ["markdown", "html", "rtf"] }, output_path: string, sheet_limit: { type: "integer", minimum: 1, maximum: 500 } }, ["id", "access_token", "format", "output_path"]),
  tool("ulysses_sheet_statistics", "Calculate word/character counts from the API's Markdown text; these are not Ulysses' native rendered statistics.", { id: string, access_token: token }, ["id", "access_token"], true),
  tool("ulysses_project_api", "Use existing API operations on a verified Project root: open or rename. Rename support must be validated on the selected Ulysses release; API errors are not silently retried through UI.", { id: string, access_token: token, operation: { type: "string", enum: ["open", "rename"] }, title: string, approved }, ["id", "access_token", "operation"]),
  tool("ulysses_copy_sheet_template", "Copy a sheet into a user-identified Templates container inside a verified Project’s Extras. The API cannot distinguish a Templates container semantically; supply its exact identifier after inspecting the Project.", { id: string, project_id: string, template_group_id: string, access_token: token }, ["id", "project_id", "template_group_id", "access_token"]),
  tool("ulysses_restore_item", "Attempt to restore a trashed sheet/group via API move to an explicit destination identifier. Requires human approval. Native Put Back and whole-Project restoration are outside API scope; errors are never retried automatically.", { id: string, target_group: string, access_token: token, approved }, ["id", "target_group", "access_token", "approved"]),
  tool("ulysses_get_quick_look_url", "Get the documented macOS QuickLook filesystem URL for a sheet. This is read-only; do not edit Ulysses library internals.", { id: string }, ["id"], true),
];

export function createExtensionHandler(api: APICall) {
  async function read(id: string, access: string, includeText = true): Promise<Item> {
    const sheet = callbackValue<Item>(await api("read-sheet", { id, "access-token": access, text: includeText ? "YES" : "NO", "silent-mode": "YES" }), "sheet");
    if (sheet.identifier !== id || sheet.type !== "sheet" || (includeText && typeof sheet.text !== "string")) throw new Error("API response lacks the requested sheet identity or full text");
    return sheet;
  }
  async function item(id: string, access: string): Promise<Item> {
    const result = callbackValue<Item>(await api("get-item", { id, "access-token": access, recursive: "YES", "silent-mode": "YES" }), "item");
    if (result.identifier !== id || typeof result.type !== "string") throw new Error("API response lacks the requested item identity/type; use exact identifiers");
    return result;
  }
  async function roots(access: string): Promise<Item[]> {
    const result = callbackValue<Item[]>(await api("get-root-items", { "access-token": access, recursive: "YES", "silent-mode": "YES" }), "items");
    if (!Array.isArray(result)) throw new Error("API root items must be an array");
    return result;
  }
  function approval(args: Args) { if (args.approved !== true) throw new Error("Explicit human approval for this specific operation is required before approved can be true"); }
  return async (name: string, args: Args): Promise<unknown> => {
    switch (name) {
    case "ulysses_get_capabilities": return {
      api: ["Project enumeration and main/Extras structure", "existing sheets/groups actions", "bounded local search over API data", "sheet statistics from API Markdown", "explicit-destination template copy and restore attempts", "QuickLook URL"],
      exports: { formats: ["markdown", "html", "rtf"], source: "read-sheet Markdown", conversion: "Local HTML rendering; macOS textutil for RTF, not native Ulysses export" },
      current_sheet: unavailableCurrentSheet(),
      outside_api_scope: ["current-sheet detection without Shortcuts", "in-place full-body replacement", "native Project creation/conversion/duplication/archive/restoration/erase", "Project icons/colors/goals/deadlines", "native export styles and embedded attachments", "native search/filters/favorites/history/publishing"],
      appPath: process.env.ULYSSES_APP_PATH ?? "System handler for ulysses:// (Beta or public release)",
      project_rename: "Attempts documented set-group-title on an API-verified Project root; release support requires live validation",
      validation: "Tool availability and mocked tests do not establish live Beta/public release support",
    };
    case "ulysses_get_current_sheet": return unavailableCurrentSheet();
    case "ulysses_list_projects": return walk(await roots(str(args, "access_token"))).filter(x => x.type === "project").map(projectSections);
    case "ulysses_get_project": return projectSections(await item(str(args, "id"), str(args, "access_token")));
    case "ulysses_search": {
      const access = str(args, "access_token"), query = str(args, "query").toLocaleLowerCase();
      const field = args.field ?? "title";
      if (!["title", "text", "keywords"].includes(String(field))) throw new Error("Invalid search field");
      const offset = boundedInteger(args.offset, 0, 0, Number.MAX_SAFE_INTEGER);
      const limit = boundedInteger(args.scan_limit, 50, 1, 500);
      const scope = args.scope_id ? [await item(str(args, "scope_id"), access)] : await roots(access);
      const candidates = walk(scope, args.include_extras !== false).filter(x => x.type === "sheet");
      const subset = candidates.slice(offset, offset + limit), matches = [];
      for (const candidate of subset) {
        const sheet = field === "title" ? candidate : await read(candidate.identifier, access, field === "text");
        const text = field === "keywords" ? (sheet.keywords ?? []).join("\n") : field === "text" ? sheet.text! : sheet.title;
        const index = text.toLocaleLowerCase().indexOf(query);
        if (index >= 0) matches.push({ identifier: sheet.identifier, title: sheet.title, excerpt: text.slice(Math.max(0, index - 60), index + query.length + 100) });
      }
      return { matches, scanned: subset.length, candidateCount: candidates.length, nextOffset: offset + subset.length < candidates.length ? offset + subset.length : null, truncated: offset + subset.length < candidates.length, coverage: "Current API enumeration in its returned order; offsets are not a stable cursor if the library changes" };
    }
    case "ulysses_export": {
      const access = str(args, "access_token"), format = str(args, "format"), output = str(args, "output_path");
      if (!["markdown", "html", "rtf"].includes(format)) throw new Error("Invalid export format");
      if (!isAbsolute(output)) throw new Error("output_path must be absolute");
      const limit = boundedInteger(args.sheet_limit, 100, 1, 500);
      const root = await item(str(args, "id"), access);
      if (!["sheet", "group", "project", "projectMain", "projectExtras"].includes(root.type)) throw new Error("Export requires a sheet, regular group, or Project section; filter results are not enumerated by the API");
      const candidates = root.type === "sheet" ? [root] : walk([root], false).filter(x => x.type === "sheet" && !x.isMaterial);
      // Exporting an explicitly selected Extras section is intentional.
      if (root.type === "projectExtras") candidates.push(...walk([root]).filter(x => x.type === "sheet" && !x.isMaterial));
      if (candidates.length > limit) throw new Error(`Export has ${candidates.length} sheets; explicitly increase sheet_limit instead of silently truncating`);
      const sheets = [];
      for (const candidate of candidates) sheets.push(await read(candidate.identifier, access));
      const result = await exportDocument(sheets.map(x => x.text!).join("\n\n"), root.title, format, output);
      return { ...result, sheets: sheets.map(x => x.identifier), order: "API-returned order; verify grouping order if native export equivalence matters" };
    }
    case "ulysses_sheet_statistics": {
      const sheet = await read(str(args, "id"), str(args, "access_token"));
      const text = sheet.text!;
      return { identifier: sheet.identifier, words: text.trim() ? text.trim().split(/\s+/u).length : 0, characters: [...text].length, source: "API Markdown, including markup" };
    }
    case "ulysses_project_api": {
      const id = str(args, "id"), access = str(args, "access_token");
      if (!["open", "rename"].includes(String(args.operation))) throw new Error("Invalid Project API operation");
      if (args.operation === "rename") approval(args);
      const title = args.operation === "rename" ? str(args, "title") : "";
      if (title.length > 255) throw new Error("Project title exceeds 255 characters");
      projectSections(await item(id, access));
      if (args.operation === "open") return api("open", { id });
      await api("set-group-title", { group: id, title, "access-token": access });
      const after = await item(id, access);
      return { verified: after.type === "project" && after.title === title, project: after };
    }
    case "ulysses_copy_sheet_template": {
      const access = str(args, "access_token"), source = await item(str(args, "id"), access);
      if (source.type !== "sheet") throw new Error("Template source must be a sheet");
      const project = await item(str(args, "project_id"), access), sections = projectSections(project);
      const destination = str(args, "template_group_id");
      const selected = walk(sections.extras).filter(x => ["group", "other"].includes(x.type) && x.identifier === destination);
      if (selected.length !== 1) throw new Error("template_group_id must identify a container inside this Project’s Extras; identify the actual Templates destination before copying");
      return api("copy", { id: source.identifier, targetGroup: selected[0].identifier });
    }
    case "ulysses_restore_item": {
      approval(args);
      const id = str(args, "id"), target = str(args, "target_group"), access = str(args, "access_token");
      const library = await roots(access);
      const all = walk(library), trashed = walk(all.filter(x => x.type === "trash"));
      if (!trashed.some(x => x.identifier === id && ["sheet", "group"].includes(x.type))) throw new Error("Restore source must be a sheet or regular group in an API-enumerated Trash section");
      if (trashed.some(x => x.identifier === target) || !all.some(x => x.identifier === target && ["group", "projectMain", "projectExtras"].includes(x.type))) throw new Error("Restore destination must be an existing non-Trash group or Project section identifier");
      const callback = JSON.parse(await api("move", { id, targetGroup: target, "access-token": access }));
      const destination = await item(target, access);
      return { callback, verified: walk([destination]).some(x => x.identifier === (callback.targetId ?? id)), destination: target };
    }
    case "ulysses_get_quick_look_url": return api("get-quick-look-url", { id: str(args, "id") });
    default: throw new Error(`Unknown extension tool: ${name}`);
    }
  };
}
