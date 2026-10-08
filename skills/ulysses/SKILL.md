---
name: ulysses
description: Work with Ulysses sheets, groups, and native Projects through its MCP server, including API-backed discovery, bounded search, and Markdown, HTML, or RTF body exports. Use for Ulysses library operations; keep editorial coaching in the writing skills.
---

Use the exposed Ulysses MCP tools before other app-control routes. Discover the tools actually loaded in this session: source changes or staged builds do not mean the configured server has those tools. If available, `ulysses_get_capabilities` describes the URL API extensions and gaps. Shortcuts is prohibited: do not launch, invoke, or fall back to it.

## Resolve the target

Read `ulysses_get_version` once when release/API compatibility matters. Dedicated Project types and material metadata require API version 3. Beta and public Ulysses share the documented URL API; do not claim either release has been tested without live evidence. The server uses the system URL handler unless `ULYSSES_APP_PATH` selects an exact app bundle.

Use exact identifiers from API enumeration or a user-provided callback URL. Match title/path and type; resolve ambiguous matches with the user. A regular `group` is not a dedicated `project`. Inspect Project `projectMain` and `projectExtras` sections before choosing destinations. Do not infer the current sheet from recent items, editor titles, or an opened Project: the URL API does not expose focused selection.

Authorize only when an API action needs it. Treat the returned access token as a credential; use it for the operation without putting it in notes, source, exports, or logs. Ulysses access authorization is separate from approval for a destructive operation.

Current-sheet detection is unavailable under the no-Shortcuts requirement. Never invoke Shortcuts, including its CLI or URL runner, even in the background. Clients connected to an older build may still have the retired workflow: inspect the loaded capabilities before using current-sheet tools and reconnect to the corrected runtime. The corrected compatibility tool only reports unavailable. No direct current-sheet API route has been verified. Use an exact sheet identifier/callback link supplied by the user or an explicitly identified API-enumerated sheet; do not guess from recency or titles. Codex computer-use can inspect the selected sheet and editor through read-only macOS Accessibility when authorized by the task. This route was verified on Beta without Shortcuts; it is not yet integrated into the MCP server. UI titles alone do not establish a unique API identifier, so verify that independently before API mutations.

## Read, search, and edit

`read-sheet` returns text only when `text: YES` is requested. Keep API metadata inspection separate from full-body reads. For search, prefer an explicit scope and title search when sufficient. Use `ulysses_search` for bounded title/keyword/text scans, and report its coverage/truncation. Request subsequent offsets only when the task needs them; offsets can change with library mutations. API enumeration does not expose filter contents, and may include Trash.

Use existing API tools for creation, insertion, attachments, metadata, move/copy, and trash. `insert` adds text; `set-sheet-title` changes or inserts the first matching title paragraph. Neither performs full-body replacement. Do not simulate replacement by recreating or trashing the sheet: that can change its identifier and lose attachments. In-place replacement remains outside this implementation.

All actions await callbacks. On uncertain completion or timeout, inspect the target before retrying a mutation. Use proportionate readback after a change; avoid repeated checks that provide the same evidence.

## Native Projects

Use `ulysses_list_projects` / `ulysses_get_project` to inspect true Projects. Existing API actions can work with their accessible groups and sheets. `ulysses_project_api` verifies the root type before opening or attempting `set-group-title` rename; root rename requires live release validation. Stop on API errors; no automatic UI fallback.

For `ulysses_copy_sheet_template`, identify the actual Templates container and supply its exact `template_group_id`. The tool verifies that it lies inside this Project’s Extras; the API cannot distinguish it semantically from another container. Copying a template does not configure Project template defaults.

`ulysses_restore_item` attempts an API move of an enumerated trashed sheet/group to a specified live destination and reports readback. It does not implement native Put Back or whole-Project restoration. Set `approved: true` only after human approval of that specific mutation.

Project creation/conversion, whole-Project duplication, archive/restore/permanent erase, icons/colors, goals/deadlines, and native settings require a later route. Describe that boundary when requested; do not substitute regular groups or silently automate the UI.

## Export

Use `ulysses_export` with an absolute new output path and `markdown`, `html`, or `rtf`. Exports never overwrite existing files. Group/Project export excludes material; Project export excludes Extras. An explicitly selected sheet/Extras section is an intentional exception. Respect the sheet limit; do not split or increase it merely to bypass the user’s bulk-operation limits.

Markdown is API-returned body text; HTML is local Markdown rendering; RTF is local HTML-to-RTF conversion. Attached notes/keywords, embedded attachments, native export styles, and unsupported Markdown XL syntax are not reconstructed. Multiple sheets are joined in API enumeration order, which is not established as native export order. Say when native export fidelity is needed. Use QuickLook URLs read-only; never edit Ulysses internal library files.

Use the checked-out repository for source changes and inspect the MCP client configuration for the installed runtime path. Build/stage before an approved runtime replacement; reconnect afterward. Source checks and installed-runtime verification are separate.

Reference: [Ulysses URL API](https://github.com/ulyssesapp/x-callback-documentation) and [Projects](https://help.ulysses.app/en_US/the-library/projects).
