# Changelog

All notable changes to the Ulysses MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### API-backed library tools

Adds ten tools alongside the original 23 URL API tools:

- `ulysses_get_capabilities` reports implemented routes and unsupported operations.
- `ulysses_list_projects` and `ulysses_get_project` identify native Projects and expose their main-content and Extras sections; ordinary groups are not treated as Projects.
- `ulysses_project_api` opens a verified Project or attempts a root rename with explicit approval and readback. Rename support still requires validation on the selected Ulysses release.
- `ulysses_copy_sheet_template` copies into an explicitly identified container within Project Extras. It does not discover the native Templates role or configure default templates.
- `ulysses_restore_item` attempts to move an API-enumerated trashed sheet/group to an explicit live destination, with approval and readback. It does not implement native Put Back or whole-Project restoration.
- `ulysses_search` performs bounded title, keyword, or body searches over API data, with scope, scan limits, offsets, and explicit truncation. Title searches avoid full-body reads; this is not Ulysses' native search engine.
- `ulysses_sheet_statistics` calculates word and character counts from API-returned Markdown.
- `ulysses_get_quick_look_url` retrieves the documented read-only sheet preview URL.
- `ulysses_export` writes Markdown, HTML, or RTF body exports to a new absolute path, refusing to overwrite files. Group/Project exports exclude material; Project exports exclude Extras. Explicit sheet or Extras selection is supported.

### Completion, targeting, and build improvements

- All URL actions await success/error callbacks, including mutations; tool calls are serialized. Launching a URL no longer counts as successful completion.
- Hardened callback handling: validate callback IDs, recognize host-form error callbacks, write response files with owner-only permissions, and avoid logging callback URLs, tokens, or contents. Callback JSON is decoded once to preserve literal percent sequences.
- `ULYSSES_APP_PATH` selects an exact Beta or public app bundle; the default remains the system URL handler.
- Added `build-all` and `stage-runtime`: compile the callback helper without launching/registering it, then stage production files and dependencies with a SHA-256 manifest. Staging does not replace the configured runtime. `ULYSSES_RUNTIME_PATH` can override the manifest destination.
- Added focused API/export and no-Shortcuts regression coverage, a reproducible dependency lockfile, and a portable Ulysses agent skill in `skills/ulysses`.

### Current-sheet detection and limits

- **The server never invokes Shortcuts.** The retired implementation is disabled and its local workflow prototypes are excluded from Git, packaging, and staging. `ulysses_get_current_sheet` remains as a compatibility tool that returns `status: unavailable` without app launches or content reads. The advertised surface is 33 URL/API-backed tools plus the unavailable compatibility tool (34 total).
- Read-only macOS Accessibility inspection of the selected sheet/editor was verified externally through Codex on Ulysses Beta. It is not implemented in this MCP server, and a UI title alone is not a verified API identifier.
- No supported direct current-sheet API route has been verified. In-place full-body replacement and complete native Project lifecycle/settings remain unimplemented: creation/conversion, whole-Project duplication, archive/restore/erase, icons/colors, goals, and deadlines.
- HTML uses local Markdown rendering; RTF uses macOS `textutil`. Exports do not reproduce native styles, embedded attachments, attached notes/keywords, or all Markdown XL syntax. Multiple-sheet order is API enumeration order, not verified native export order.
- TypeScript build, focused regression checks, RTF conversion, and staged MCP checks passed. Public-release execution and the release-dependent Project rename/restore operations remain unverified. Source changes do not update an already installed or connected server; deploy the reviewed stage separately and reconnect the client.

## [0.1.0] - 2025-10-23

### Added

- Initial release of Ulysses MCP Server
- 24 tools for interacting with Ulysses writing app
- Content creation tools:
  - `ulysses_new_sheet` - Create new sheets
  - `ulysses_new_group` - Create new groups
- Content modification tools:
  - `ulysses_insert` - Insert/append text
  - `ulysses_attach_note` - Attach notes
  - `ulysses_attach_keywords` - Add keywords
  - `ulysses_attach_image` - Attach images
- Navigation tools:
  - `ulysses_open` - Open sheets/groups
  - `ulysses_open_all` - Open All section
  - `ulysses_open_recent` - Open Recent section
  - `ulysses_open_favorites` - Open Favorites
- Information & authorization tools:
  - `ulysses_get_version` - Get version info
  - `ulysses_authorize` - Request authorization
  - `ulysses_read_sheet` - Read sheet contents
  - `ulysses_get_item` - Get item info
  - `ulysses_get_root_items` - Get library structure
- Advanced operation tools:
  - `ulysses_move` - Move items
  - `ulysses_copy` - Copy items
  - `ulysses_trash` - Trash items
  - `ulysses_set_group_title` - Rename groups
  - `ulysses_set_sheet_title` - Change sheet titles
  - `ulysses_remove_keywords` - Remove keywords
  - `ulysses_update_note` - Update notes
  - `ulysses_remove_note` - Remove notes
- Comprehensive documentation:
  - README with installation and usage instructions
  - CONTRIBUTING guide for developers
  - MIT License
  - Example configurations for Claude Desktop and Cline
- Full implementation of Ulysses x-callback-url API version 3
- TypeScript source with proper type definitions
- Error handling and validation

### Notes

- This is the initial public release
- All tools have been tested with Ulysses on macOS
- Server uses stdio transport for MCP communication
- Requires Node.js 18.0.0 or higher

[0.1.0]: https://github.com/yourusername/ulysses-mcp/releases/tag/v0.1.0
