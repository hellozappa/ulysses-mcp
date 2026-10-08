# Ulysses MCP Server

[![MCP](https://img.shields.io/badge/MCP-Compatible-blue)](https://modelcontextprotocol.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An MCP (Model Context Protocol) server that enables AI assistants to interact with the [Ulysses](https://ulysses.app) writing application on macOS.

## Blog

[Building Ulysses Mcp From Frustration To A Smarter Writing Workflow](https://pebcak-consulting-llc.github.io/pebcak-consulting-llc/2025/10/30/building-ulysses-mcp-from-frustration-to-a-smarter-writing-workflow.html)

## Overview

This MCP server provides comprehensive tools to automate Ulysses via its x-callback-url API, allowing AI assistants like Claude, Cline, and other MCP-compatible clients to:

- 📝 **Create and manage sheets** - Create new documents with content
- 📁 **Organize with groups** - Create and manage folder structures  
- ✏️ **Add content** - Insert or append text to existing sheets
- 🏷️ **Attach metadata** - Add notes, keywords, and images to sheets
- 📖 **Read content** - Extract sheet contents and metadata (requires authorization)
- 🧭 **Navigate** - Open specific sheets, groups, or special sections
- 🔧 **Modify** - Move, copy, rename, and delete items (requires authorization)

## Prerequisites

- macOS (Ulysses is Mac/iOS only)
- [Ulysses](https://ulysses.app) installed
- Node.js 18.0.0 or higher
- An MCP-compatible client (Claude Desktop, Cline, etc.)

## Installation

### Using npm

```bash
npm install ulysses-mcp
```

### From Source

```bash
git clone https://github.com/sonofagl1tch/ulysses-mcp.git
cd ulysses-mcp
npm install
npm run build
```

### Building the Helper App

> ⚠️ **IMPORTANT**: The helper app binary is not included in this repository for security reasons. You must build it locally after installation.

After installation, you need to build the helper app (required for callback operations):

```bash
npm run build-helper
```

This creates a small macOS application that handles callbacks from Ulysses. The helper app:

- Runs automatically when needed (you don't need to start it manually)
- Registers a custom URL scheme (`ulysses-mcp-callback://`)
- Enables operations that require callbacks (authorization, reading content, etc.)
- **Should never be committed to version control** (already in .gitignore)

For more details, see [Helper App Documentation](./docs/HELPER_APP.md).

## Configuration

### For Claude Desktop

Add to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "ulysses": {
      "command": "node",
      "args": ["/path/to/ulysses-mcp/build/index.js"]
    }
  }
}
```

### For Cline (VS Code Extension)

Add to Cline's MCP settings:

**macOS**: `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`

```json
{
  "mcpServers": {
    "ulysses": {
      "disabled": false,
      "autoApprove": [],
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/ulysses-mcp/build/index.js"]
    }
  }
}
```

### For Other MCP Clients

Refer to your client's documentation for adding MCP servers via stdio transport.

## Available Tools

The server advertises 34 tools: the original 23 URL API tools, ten API-backed extensions, and an unavailable current-sheet compatibility tool. Shortcuts-based detection is disabled. Tool availability does not establish live compatibility with a particular Ulysses release.

### Content Creation

- `ulysses_new_sheet` - Create a new sheet with content
- `ulysses_new_group` - Create a new group (folder)

### Content Modification

- `ulysses_insert` - Insert/append text to existing sheets
- `ulysses_attach_note` - Attach notes to sheets
- `ulysses_attach_keywords` - Add keywords (tags)
- `ulysses_attach_image` - Attach images (base64)

### Navigation

- `ulysses_open` - Open specific sheet or group
- `ulysses_open_all` - Open "All" section
- `ulysses_open_recent` - Open "Last 7 Days"
- `ulysses_open_favorites` - Open "Favorites"

### Information & Authorization

- `ulysses_get_version` - Get Ulysses and API version
- `ulysses_authorize` - Request library access (required for reading)
- `ulysses_read_sheet` - Read sheet contents (requires auth)
- `ulysses_get_item` - Get sheet/group info (requires auth)
- `ulysses_get_root_items` - Get library structure (requires auth)

### Advanced Operations (Require Authorization)

- `ulysses_move` - Move sheets/groups
- `ulysses_copy` - Copy sheets/groups
- `ulysses_trash` - Move items to trash
- `ulysses_set_group_title` - Rename groups
- `ulysses_set_sheet_title` - Change sheet titles
- `ulysses_remove_keywords` - Remove keywords
- `ulysses_update_note` - Update existing notes
- `ulysses_remove_note` - Remove notes

### API-backed Extensions

- `ulysses_get_current_sheet` — Returns `status: unavailable` without launching any app, reading bodies, or using clipboard/Accessibility. No supported direct API route has been verified. Shortcuts invocation is disabled; this tool remains only for compatibility with existing clients.

- `ulysses_get_capabilities` — Explain available routes and their limits without opening Ulysses.
- `ulysses_list_projects` / `ulysses_get_project` — Enumerate actual API `project` objects and inspect their `projectMain` / `projectExtras` sections. Regular groups are not Projects.
- `ulysses_project_api` — Open a verified Project or attempt to rename its root via `set-group-title`, with explicit human approval and readback. Project-root rename support has not been validated live.
- `ulysses_copy_sheet_template` — Copy a sheet into an explicitly identified container inside a Project’s Extras. The API has no semantic Templates identifier: supply `template_group_id` after identifying the actual Templates container; a matching title alone is insufficient.
- `ulysses_restore_item` — Attempt API `move` from an enumerated Trash section to an explicit live destination ID, with human approval and destination readback. This does not implement native Put Back or whole-Project restoration, and requires live validation.
- `ulysses_search` — Search API metadata or sequential API reads by title, keywords, or text. Optional `scope_id`; `scan_limit` defaults to 50 (maximum 500). `nextOffset` and `truncated` disclose unsearched sheets. API enumeration offsets can shift as the library changes; filter contents are not enumerated by the API. Library-wide enumeration may include Trash when returned by Ulysses.
- `ulysses_export` — Export sheet/group/Project bodies to `markdown`, `html`, or `rtf`, at an absolute `output_path`. Existing files are never overwritten. Group/Project exports exclude material; Project exports exclude Extras. Explicit sheet or Extras selection allows intentional export of that content. `sheet_limit` defaults to 100 (maximum 500); larger exports fail instead of silently truncating. Filter export is unsupported.
- `ulysses_sheet_statistics` — Count words/characters in API Markdown, including markup; these differ from native statistics.
- `ulysses_get_quick_look_url` — Retrieve the documented macOS sheet filesystem URL. Do not write to Ulysses library internals.

Markdown preserves the text returned by `read-sheet`; multiple bodies are joined with two newlines in API enumeration order. HTML uses Markdown rendering with tables and footnotes; RTF uses macOS `textutil`. These are body exports: they omit attached notes/keywords and do not reconstruct embedded attachments or native Ulysses styles. Unsupported Markdown XL constructs may remain literal. Native export fidelity requires a later non-URL-API route.

All API commands now wait for `x-success` / `x-error`, including mutations. A launched URL is not treated as success. Tool calls execute sequentially; after a timeout or uncertain mutation, inspect the library before repeating it.

### Beta and Public Release Targeting

By default, `ulysses://` uses the system’s registered Ulysses handler. If multiple releases are installed, set `ULYSSES_APP_PATH` to the intended application bundle’s exact path in the MCP environment. No Beta-specific path or bundle name is embedded in the server. Inspect `ulysses_get_version` once per target: Project types and material metadata require API version 3. Source/build tests are separate from live Beta and public-release verification.

Shortcuts must not be launched by this server. Current-sheet detection is unavailable, and `ULYSSES_CURRENT_SHEET_SHORTCUT` no longer enables it. Historical workflow prototypes are preserved locally but excluded from Git, packaging, and staging. `ULYSSES_APP_PATH` continues to select the target for documented Ulysses URL API calls.

Read-only current-sheet/editor inspection is possible through macOS Accessibility in a capable agent client. It was verified through Codex on Beta, but it is not implemented inside this MCP server. Verify exact API identity independently before mutations. The portable [Ulysses agent skill](skills/ulysses/SKILL.md) documents this boundary and API-first operation.

### Build and Stage Without Replacing the Configured Runtime

```bash
npm run build-all
npm run stage-runtime
```

`build-all` compiles TypeScript and the callback helper without registering its URL scheme or launching applications. `stage-runtime` creates a fresh `work/staged/runtime-*` directory containing compiled modules, the callback app, production dependencies, and a SHA-256 manifest. It does not alter the configured runtime or MCP settings. The manifest destination defaults to `$CODEX_HOME/servers/ulysses-mcp` (or `~/.codex/servers/ulysses-mcp`); `ULYSSES_RUNTIME_PATH` overrides it. Review the staged manifest and back up the installed runtime before an explicitly approved replacement. Copy the complete runtime, not only `build/index.js`; reconnect the MCP client afterward and ensure the changed callback helper is actually running.

## Usage Examples

### Creating a New Sheet

```typescript
// Create a daily journal entry
{
  "tool": "ulysses_new_sheet",
  "arguments": {
    "text": "# Journal Entry - October 23, 2025\n\nToday I...",
    "group": "/Journal",
    "format": "markdown"
  }
}
```

### Adding Keywords

```typescript
// Tag a sheet for organization
{
  "tool": "ulysses_attach_keywords",
  "arguments": {
    "id": "sheet-identifier-here",
    "keywords": "Draft,Blog,Technical"
  }
}
```

### Reading Content (Requires Authorization)

```typescript
// First, authorize
{
  "tool": "ulysses_authorize",
  "arguments": {
    "appname": "My AI Assistant"
  }
}
// After approving in Ulysses, use the token to read
{
  "tool": "ulysses_read_sheet",
  "arguments": {
    "id": "sheet-identifier-here",
    "text": "YES",
    "access_token": "your-access-token"
  }
}
```

## Getting Sheet Identifiers

Sheet and group identifiers are required for many operations. Here's how to get them:

### On Mac

1. Select a sheet in the sheet list
2. Press ⌘C (command-C) to copy its identifier
3. Or: Hold ⌥ (option/alt) while right-clicking → "Copy Callback Identifier"

### On iOS/iPadOS

1. Touch and hold a sheet
2. Select "Share" → "Share Shortcuts Identifier" → "Copy"
3. For groups: Tap `…` button → Share → Share Shortcuts Identifier

Identifiers look like: `H8zLAmc1I0njH-0Ql-3YGQ`

## Authorization

Some operations (reading content, destructive changes) require authorization:

1. Use the `ulysses_authorize` tool with your app name
2. Approve the authorization request in Ulysses
3. Copy the provided access token
4. Use the token in subsequent operations that require it

Access tokens persist until revoked in Ulysses preferences.

## Security

> ⚠️ **PRIVACY WARNING**: While this MCP server is completely local and private, your AI assistant may send data to cloud services depending on your configuration:
>
> - **Cloud AI (Claude Desktop, ChatGPT, etc.)**: Your writing may be sent to their servers
> - **Local AI (Ollama, LM Studio)**: Stays completely local ✅
>
> For sensitive content, use local-only AI models. See [Privacy Documentation](./docs/PRIVACY.md) for details.

### Access Token Handling

⚠️ **IMPORTANT SECURITY WARNINGS**:

- **Access tokens provide full access to your Ulysses library**. Treat them like passwords.
- **Never commit tokens to version control** or share them publicly.
- **Store tokens securely** if you need to persist them between sessions.
- **Revoke tokens** you no longer need via Ulysses → Preferences → Privacy.
- **Rate limiting**: Destructive operations are limited to 10 per minute to prevent accidental damage.

### Input Validation

This server implements comprehensive input validation:

- Required parameters are validated for presence and non-empty values
- Text inputs have reasonable length limits (1MB for content, 100KB for notes)
- Enum values are validated against allowed options
- All actions are validated against a whitelist
- Command injection is prevented via secure command execution

### Security Features

- ✅ Command injection protection using `execFile` instead of `exec`
- ✅ Input validation on all parameters
- ✅ Action whitelist validation
- ✅ Rate limiting on destructive operations
- ✅ Sanitized error messages
- ✅ No sensitive data exposure in logs

### Reporting Security Issues

If you discover a security vulnerability, please email <sonofagl1tch@pebcakconsulting.com> or open a security advisory on GitHub. Do not open public issues for security vulnerabilities.

## Use Cases

### Content Creation Workflows

- **Blog Writing**: Generate posts with AI and save to Ulysses
- **Daily Journaling**: Auto-create dated entries
- **Note Taking**: Quick capture with AI assistance
- **Research Organization**: Structure research with AI help

### Content Management

- **Batch Tagging**: Organize content with keywords
- **Content Review**: Analyze sheets programmatically
- **Library Organization**: Automate structure and filing
- **Backup & Archive**: Export content systematically

### AI-Assisted Writing

- **Content Generation**: AI writes, saves to Ulysses
- **Editing Assistance**: Read, suggest, update content
- **Research Integration**: Fetch and incorporate research
- **Outline Expansion**: Turn briefs into full articles

## Limitations & Future Enhancements

### Current Limitations

The MCP server is limited by the capabilities of the Ulysses x-callback-url API. Some features available in the Ulysses GUI are not currently available via the API:

**Outside the URL API scope:**

- **Current sheet and full-body replacement** — No documented URL actions. Shortcuts-based detection is disabled. A direct current-sheet API route has not been verified; current-sheet detection and in-place body replacement remain outside this implementation.
- **Native Project lifecycle/settings** — Creation, conversion, whole-Project duplication, archive/restore, permanent erase, icons/colors, goals/deadlines require another route.

- **Native search** — No native search URL action; `ulysses_search` searches API data locally.
- **Native statistics** — `ulysses_sheet_statistics` calculates counts from API Markdown; native counts/reading time are unavailable.
- **Native export** — Markdown/HTML/RTF body exports are implemented locally; native styles, attachments, PDF/DOCX exports are unavailable.
- ❌ **Publishing** - Cannot publish directly to WordPress, Medium, or other platforms
- ❌ **Goals and targets** - Cannot set or retrieve writing goals
- ❌ **Sheet history** - Cannot access revision history or version control
- ❌ **Filters** - Cannot filter sheets by date, keywords, or other criteria
- ❌ **Favorites management** - Cannot mark/unmark sheets as favorites via API
- ❌ **Theme/appearance** - Cannot control Ulysses appearance or editor settings

### Feature Request Submitted

A feature request has been submitted to Ulysses to expand the x-callback-url API with additional capabilities. If you'd like to see more features, consider:

1. **Voting** on the feature request (link TBD when available)
2. **Contacting Ulysses support** to express interest in API expansion
3. **Sharing use cases** that would benefit from enhanced API access

### Workarounds

For some limitations, partial workarounds exist:

- **Statistics**: Read sheet content and calculate locally
- **Search**: Use `get-root-items` with `recursive=YES` and filter locally
- **Export**: Read content and export using external tools

### Potential Future Enhancements

If the Ulysses API is expanded, this MCP server could potentially support:

- 🔮 Full-text search across the library
- 🔮 Export sheets to various formats
- 🔮 Retrieve writing statistics and analytics
- 🔮 Manage writing goals and targets
- 🔮 Access revision history
- 🔮 Advanced filtering and sorting
- 🔮 Publishing integrations

**Note:** These enhancements depend on Ulysses expanding their x-callback-url API. The MCP server is designed to be easily updated when new API capabilities become available.

## 📚 Documentation

For detailed information about architecture, security, privacy, and authentication, see the comprehensive documentation in the [docs/](./docs/) directory:

- **[Architecture](./docs/ARCHITECTURE.md)** - System architecture, data flows, and technical details
- **[Authentication](./docs/AUTHENTICATION.md)** - Authorization model, access tokens, and security
- **[Privacy & Security](./docs/PRIVACY.md)** - Privacy guarantees, security features, and verification
- **[Documentation Index](./docs/README.md)** - Complete documentation overview

## Development

### Building

```bash
npm run build
```

### Watching for Changes

```bash
npm run watch
```

### Testing with MCP Inspector

```bash
npm run inspector
```

## Project Structure

```
ulysses-mcp/
├── src/
│   └── index.ts          # Main server implementation
├── build/                # Compiled JavaScript output
├── package.json
├── tsconfig.json
├── README.md
└── LICENSE
```

## API Reference

This server implements Ulysses x-callback-url API version 3.

For detailed API documentation:

- [Ulysses x-callback-url Documentation](https://github.com/ulyssesapp/x-callback-documentation)
- [Model Context Protocol](https://modelcontextprotocol.io)

## Troubleshooting

### Server Not Connecting

- Verify Ulysses is installed on your Mac
- Check the build path in your MCP configuration
- Rebuild the server: `npm run build`
- Restart your MCP client

### Authorization Issues

- Run `ulysses_authorize` to get a new token
- Approve the request in Ulysses when prompted
- Copy and save the access token
- Check token hasn't been revoked in Ulysses preferences

### Sheet Identifiers Not Working

- Verify the 22-character identifier format
- Ensure the sheet still exists in Ulysses
- Note: External folder identifiers may change if items move

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This is an unofficial tool and is not affiliated with or endorsed by Ulysses GmbH & Co. KG. Ulysses is a trademark of Ulysses GmbH & Co. KG.

## Acknowledgments

- [Ulysses](https://ulysses.app) - For creating an excellent writing application with a powerful automation API
- [Model Context Protocol](https://modelcontextprotocol.io) - For providing the framework to connect AI assistants with tools
- [Anthropic](https://anthropic.com) - For Claude and the MCP initiative

## Support

- **Issues**: [GitHub Issues](https://github.com/sonofagl1tch/ulysses-mcp/issues)
- **Ulysses Support**: [ulysses.app/support](https://ulysses.app/support)
- **MCP Documentation**: [modelcontextprotocol.io](https://modelcontextprotocol.io)

---

Made with ❤️ for the Ulysses and AI community
