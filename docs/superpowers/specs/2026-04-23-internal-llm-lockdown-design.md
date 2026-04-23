# Internal LLM Lockdown Design

Date: 2026-04-23

## Goal

Customize Cherry Studio so it cannot be used to configure or launch external LLM services. The app should keep normal chat functionality through one editable internal OpenAI-compatible server, and keep manual MCP server configuration for internal MCP endpoints.

## Scope

In scope:

- Replace the many built-in LLM providers with one editable provider named `Internal Server`.
- Keep provider settings for the internal server only: API host, API key, model list, health check, and model editing.
- Keep manual MCP server add/edit/start/stop for internal use.
- Remove MCP discovery surfaces: marketplaces, provider sync pages, external built-in MCP entries, and marketplace auto-install flows.
- Remove external channel support, including Telegram, Feishu/Lark, QQ, WeChat, Discord, and Slack UI and backend adapters.
- Remove MinApps as an external AI web-app surface. This includes the `/apps` page, custom mini-app add flow, pinned mini-app sidebar behavior, and routes that can open external AI sites in WebViews.
- Remove Code Tools as an external LLM launcher surface. This includes Claude Code, Gemini CLI, OpenAI Codex, Qwen Code, iFlow, Kimi, OpenCode, and GitHub Copilot CLI entry points.
- Remove OpenClaw user-facing and backend integration points.
- Disable web-search and image-generation provider surfaces that can call external services. First pass removes entry points and empties provider lists; physical file deletion is deferred.

Out of scope for the first implementation pass:

- Full dependency pruning from `package.json`.
- Bulk deletion of unused image assets and i18n strings.
- Database schema changes.
- Redux state shape changes beyond safe initial values and migration sanitation.

## Recommended Approach

Use a product-lockdown implementation rather than UI-only hiding or full code deletion.

This means routes, menus, initial configuration, and main-process entry points should be disabled together so users cannot reach external providers through hidden URLs, persisted state, IPC calls, or side panels. Large dead-code deletion can happen later after typecheck and runtime behavior are stable.

## LLM Provider Design

Add a single internal provider config:

- `id`: `internal`
- `name`: `Internal Server`
- `type`: `openai`
- `apiHost`: editable, initially `http://localhost:8000/v1`
- `apiKey`: editable, optional for llama.cpp/vLLM deployments that do not require auth
- `models`: editable by the existing model list UI
- `enabled`: true
- `isSystem`: true

Provider settings should select this provider by default and not expose:

- Add provider popup.
- External system provider list.
- Provider official website/API key/docs links.
- OAuth flows for Anthropic, CherryIN, GitHub Copilot, or similar.
- Gemini, Anthropic, Azure, Bedrock, Vertex, Ollama, LM Studio, OpenRouter, and other external-specific settings.

Persisted provider state should be sanitized so existing user data does not reintroduce external providers after upgrade.

## MCP Design

Keep:

- Manual add/edit/delete of MCP servers.
- Server transport types currently supported by manual configuration, assuming the user points them at internal endpoints or internal commands.
- Assistant MCP tool selection.

Disable these entry points in the first implementation pass:

- MCP marketplaces page.
- Third-party MCP provider sync pages.
- Built-in external MCP entries such as Brave Search, Dify Knowledge, Didi MCP, flomo, nowledge, and marketplace auto-install.
- Remote auto-discovery links and API key sync helpers.

The built-in `hub` server can remain internal-only if required by automatic MCP tool aggregation, but it should not appear as an installable external service.

## External Channels Design

Remove user-facing channel settings and backend activation:

- Delete the settings menu item and route for channels.
- Do not start `ChannelManager` at app startup.
- Remove preload exposure for channel QR login, status, and log methods.
- Do not register IPC handlers for channel logs/status and QR credential checks.
- Prevent channel adapters from lazy-loading.

Database tables can remain for now to avoid migration risk, but the app should not connect to external messaging platforms.

## MinApps Design

Treat MinApps as an external LLM bypass because they embed external AI services in WebViews.

Disable these entry points in the first implementation pass:

- Sidebar `minapp` icon and default sidebar entry.
- `/apps` and `/apps/:appId` routes.
- MinApps launchpad entries.
- Pinned mini-app rendering in the sidebar.
- Custom mini-app creation and persisted `custom-minapps.json` loading.
- OpenClaw dashboard mini-app launch.

The minapps Redux slice can remain temporarily with empty initial lists to avoid broad store surgery.

## Code Tools Design

Remove Code Tools as an external LLM launcher:

- Remove the sidebar `code_tools` icon and route `/code`.
- Do not expose Code Tools page UI.
- Do not register preload/IPC handlers that launch code tools.
- Keep terminal detection service files only if still referenced, but they should not be reachable from UI.

This prevents users from launching Claude Code, Gemini CLI, OpenAI Codex, Qwen Code, and related tools with external provider credentials.

## OpenClaw Design

Remove user-facing and process entry points:

- Remove sidebar `openclaw` icon and route `/openclaw`.
- Remove OpenClaw launchpad entry.
- Remove OpenClaw preload API surface.
- Remove OpenClaw IPC handler registration.
- Do not import or start OpenClaw services from main process startup.
- Sanitize sidebar migration logic so OpenClaw is not added back to persisted settings.

OpenClaw service files and tests can be deleted in a later cleanup pass after the app builds.

## Web Search And Image Generation

Disable external search and external image-generation provider paths:

- Remove Web Search settings menu and route.
- Do not register the input bar web-search tool.
- Initialize web-search providers as an empty list.
- Remove image generation sidebar/page routes for external painting providers.
- Do not register the input bar image-generation tool unless it is explicitly backed by the internal provider.

If internal image generation is needed later, add it as a separate internal-only feature with a dedicated model capability check.

## Navigation And Persistence

Sanitize visible navigation defaults:

- Default sidebar icons should exclude `store`, `paintings`, `minapp`, `code_tools`, and `openclaw`.
- Settings menu should exclude web search and channels.
- Launchpad should exclude MinApps, Code Tools, and OpenClaw entries.
- Persisted sidebar icon lists should be filtered during migration or selector usage.

Routes for removed pages should redirect to `/` or `/settings/provider` rather than rendering hidden functionality.

## Testing

Targeted tests:

- Provider initial state contains only `Internal Server`.
- Existing persisted external providers are filtered out.
- MCP built-in installable list excludes external entries while manual add still works.
- Sidebar defaults exclude removed surfaces.
- MinApps initial state is empty and routes are unreachable.
- Channels do not start at app initialization.
- OpenClaw IPC handlers are not registered.

Required verification before completion:

- `pnpm lint`
- `pnpm test`
- `pnpm format`

