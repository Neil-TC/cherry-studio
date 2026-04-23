# Internal LLM Lockdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lock this Cherry Studio fork to one editable OpenAI-compatible internal LLM server while removing external LLM, MCP marketplace, channel, MinApps, Code Tools, web search, image generation, and OpenClaw entry points.

**Architecture:** Add small lockdown helpers for internal provider and navigation sanitization, then route existing store/config/UI/main-process entry points through those helpers. Prefer disabling routes, menus, initial state, migration, and IPC registration over broad file deletion so the first pass is buildable and reviewable.

**Tech Stack:** Electron 38, React 19, Redux Toolkit with redux-persist, TypeScript, Vitest, pnpm.

---

## File Structure

- Create `src/renderer/src/config/internalLockdown.ts`: shared internal-only constants and sanitize helpers for providers, models, sidebar icons, MinApps, and WebSearch.
- Create `src/renderer/src/config/__tests__/internalLockdown.test.ts`: unit tests for provider/model/navigation sanitizers.
- Modify `src/renderer/src/types/provider.ts`: add `internal` to `SystemProviderIdSchema` and `SystemProviderIds`.
- Modify `src/renderer/src/config/models/default.ts`: define `internalDefaultModel`, use it for default model slots, and add `internal` to `SYSTEM_MODELS`.
- Modify `src/renderer/src/config/providers.ts`: expose only `INTERNAL_PROVIDER` through `SYSTEM_PROVIDERS`, add internal provider URL metadata, and keep external configs unreachable.
- Modify `src/renderer/src/store/llm.ts`: use internal provider/model initial state and sanitize provider/model reducers.
- Modify `src/renderer/src/hooks/useProvider.ts`: remove implicit `CHERRYAI_PROVIDER` injection and expose only sanitized internal providers.
- Modify `src/renderer/src/store/migrate.ts` and `src/renderer/src/store/index.ts`: add migration version `207` to sanitize persisted providers, default models, sidebar icons, MinApps, WebSearch, and MCP built-ins.
- Modify `src/renderer/src/config/sidebar.ts`: remove external surface icons from defaults.
- Modify `src/renderer/src/Router.tsx`, `src/renderer/src/components/app/Sidebar.tsx`, `src/renderer/src/pages/settings/SettingsPage.tsx`, and `src/renderer/src/pages/launchpad/LaunchpadPage.tsx`: remove routes/menu entries for removed surfaces.
- Modify `src/renderer/src/store/minapps.ts`, `src/renderer/src/config/minapps.ts`, and `src/renderer/src/hooks/useMinapps.ts`: make MinApps empty and prevent custom external app loading.
- Modify `src/renderer/src/config/webSearchProviders.ts`, `src/renderer/src/store/websearch.ts`, and `src/renderer/src/pages/home/Inputbar/tools/index.ts`: empty external search providers and stop registering web-search/image-generation tools.
- Modify `src/renderer/src/store/mcp.ts` and `src/renderer/src/pages/settings/MCPSettings/index.tsx`: keep manual MCP server UI, remove discovery/provider sync/builtin external lists.
- Modify `src/main/index.ts`, `src/main/ipc.ts`, `src/preload/index.ts`, and `packages/shared/IpcChannel.ts`: stop exposing/starting channels, Code Tools launcher IPC, and OpenClaw IPC surfaces.
- Modify focused tests under `src/renderer/src/store/__tests__`, `src/renderer/src/config/__tests__`, and `src/main/services/__tests__` only where required by behavior changes.

---

### Task 1: Internal Lockdown Helpers

**Files:**
- Create: `src/renderer/src/config/internalLockdown.ts`
- Create: `src/renderer/src/config/__tests__/internalLockdown.test.ts`
- Modify: `src/renderer/src/types/provider.ts`
- Modify: `src/renderer/src/config/models/default.ts`

- [ ] **Step 1: Write failing sanitizer tests**

Create `src/renderer/src/config/__tests__/internalLockdown.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import {
  INTERNAL_PROVIDER,
  INTERNAL_PROVIDER_ID,
  internalDefaultModel,
  sanitizeInternalModel,
  sanitizeInternalProviders,
  sanitizeSidebarIcons
} from '../internalLockdown'

describe('internal lockdown config', () => {
  it('keeps exactly one internal provider while preserving existing internal settings', () => {
    const providers = sanitizeInternalProviders([
      {
        ...INTERNAL_PROVIDER,
        apiHost: 'http://llm.internal/v1',
        apiKey: 'secret',
        models: [{ id: 'llama-3', name: 'llama-3', provider: INTERNAL_PROVIDER_ID, group: 'Internal' }]
      },
      {
        id: 'openai',
        name: 'OpenAI',
        type: 'openai',
        apiKey: 'external',
        apiHost: 'https://api.openai.com',
        models: [],
        enabled: true,
        isSystem: true
      }
    ])

    expect(providers).toHaveLength(1)
    expect(providers[0]).toMatchObject({
      id: INTERNAL_PROVIDER_ID,
      name: 'Internal Server',
      apiHost: 'http://llm.internal/v1',
      apiKey: 'secret'
    })
    expect(providers[0].models).toEqual([
      { id: 'llama-3', name: 'llama-3', provider: INTERNAL_PROVIDER_ID, group: 'Internal' }
    ])
  })

  it('falls back to the internal default model for external persisted models', () => {
    expect(sanitizeInternalModel({ id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', group: 'OpenAI' })).toEqual(
      internalDefaultModel
    )
  })

  it('filters removed sidebar icons', () => {
    expect(sanitizeSidebarIcons(['assistants', 'store', 'paintings', 'minapp', 'code_tools', 'openclaw'])).toEqual([
      'assistants'
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test:renderer src/renderer/src/config/__tests__/internalLockdown.test.ts
```

Expected: FAIL because `src/renderer/src/config/internalLockdown.ts` does not exist.

- [ ] **Step 3: Add internal provider type support**

Update `src/renderer/src/types/provider.ts`:

```ts
export const SystemProviderIdSchema = z.enum([
  'internal',
  'cherryin',
  'silicon',
  // keep existing entries after this line
])
```

Update `SystemProviderIds` in the same file:

```ts
export const SystemProviderIds = {
  internal: 'internal',
  cherryin: 'cherryin',
  silicon: 'silicon',
  // keep existing entries after this line
} as const satisfies Record<SystemProviderId, SystemProviderId>
```

- [ ] **Step 4: Add internal model default**

Update `src/renderer/src/config/models/default.ts` near the existing `qwenModel`:

```ts
export const internalDefaultModel: Model = {
  id: 'local-model',
  name: 'Local Model',
  provider: 'internal',
  group: 'Internal'
}

export const SYSTEM_MODELS: Record<SystemProviderId | 'defaultModel', Model[]> = {
  defaultModel: [
    internalDefaultModel,
    internalDefaultModel,
    internalDefaultModel,
    internalDefaultModel
  ],
  internal: [internalDefaultModel],
  // keep existing provider model entries after this line
}
```

- [ ] **Step 5: Implement lockdown helper**

Create `src/renderer/src/config/internalLockdown.ts`:

```ts
import type { Model, Provider, SidebarIcon, SystemProvider } from '@renderer/types'

import { internalDefaultModel } from './models'

export const INTERNAL_PROVIDER_ID = 'internal'

export const INTERNAL_PROVIDER: SystemProvider = {
  id: INTERNAL_PROVIDER_ID,
  name: 'Internal Server',
  type: 'openai',
  apiKey: '',
  apiHost: 'http://localhost:8000/v1',
  models: [internalDefaultModel],
  isSystem: true,
  enabled: true
}

const REMOVED_SIDEBAR_ICONS = new Set<SidebarIcon>(['store', 'paintings', 'minapp', 'code_tools', 'openclaw'])

export function sanitizeInternalModel(model: Model | undefined): Model {
  return model?.provider === INTERNAL_PROVIDER_ID ? model : internalDefaultModel
}

export function sanitizeInternalProviders(providers: Provider[] | undefined): Provider[] {
  const existing = providers?.find((provider) => provider.id === INTERNAL_PROVIDER_ID)

  return [
    {
      ...INTERNAL_PROVIDER,
      ...existing,
      id: INTERNAL_PROVIDER_ID,
      name: existing?.name?.trim() || INTERNAL_PROVIDER.name,
      type: 'openai',
      isSystem: true,
      enabled: true,
      models: existing?.models?.length ? existing.models : INTERNAL_PROVIDER.models
    }
  ]
}

export function sanitizeSidebarIcons(icons: SidebarIcon[] | undefined): SidebarIcon[] {
  const sanitized = (icons ?? []).filter((icon) => !REMOVED_SIDEBAR_ICONS.has(icon))
  return sanitized.includes('assistants') ? sanitized : ['assistants', ...sanitized]
}
```

- [ ] **Step 6: Run helper tests**

Run:

```bash
pnpm test:renderer src/renderer/src/config/__tests__/internalLockdown.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit helper changes**

```bash
git add src/renderer/src/config/internalLockdown.ts src/renderer/src/config/__tests__/internalLockdown.test.ts src/renderer/src/types/provider.ts src/renderer/src/config/models/default.ts
git commit --signoff -m "feat: add internal llm lockdown helpers"
```

---

### Task 2: Restrict LLM Provider State And Settings

**Files:**
- Modify: `src/renderer/src/config/providers.ts`
- Modify: `src/renderer/src/store/llm.ts`
- Modify: `src/renderer/src/hooks/useProvider.ts`
- Modify: `src/renderer/src/services/AssistantService.ts`
- Modify: `src/renderer/src/pages/settings/ProviderSettings/ProviderList.tsx`

- [ ] **Step 1: Write provider state tests**

Create `src/renderer/src/store/__tests__/llm-lockdown.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { INTERNAL_PROVIDER_ID } from '@renderer/config/internalLockdown'

import llmReducer, { initialState, updateProviders } from '../llm'

describe('llm internal lockdown', () => {
  it('initializes only the internal provider', () => {
    expect(initialState.providers.map((provider) => provider.id)).toEqual([INTERNAL_PROVIDER_ID])
    expect(initialState.defaultModel.provider).toBe(INTERNAL_PROVIDER_ID)
    expect(initialState.quickModel.provider).toBe(INTERNAL_PROVIDER_ID)
    expect(initialState.translateModel.provider).toBe(INTERNAL_PROVIDER_ID)
  })

  it('filters external providers when provider list is replaced', () => {
    const next = llmReducer(
      initialState,
      updateProviders([
        {
          id: 'openai',
          name: 'OpenAI',
          type: 'openai',
          apiKey: 'external',
          apiHost: 'https://api.openai.com',
          models: [],
          enabled: true,
          isSystem: true
        }
      ])
    )

    expect(next.providers.map((provider) => provider.id)).toEqual([INTERNAL_PROVIDER_ID])
  })
})
```

- [ ] **Step 2: Run test to verify current behavior fails**

Run:

```bash
pnpm test:renderer src/renderer/src/store/__tests__/llm-lockdown.test.ts
```

Expected: FAIL because current initial state includes many system providers.

- [ ] **Step 3: Export only the internal provider config**

In `src/renderer/src/config/providers.ts`, import the helper:

```ts
import { INTERNAL_PROVIDER } from './internalLockdown'
```

Change provider exports:

```ts
export const SYSTEM_PROVIDERS_CONFIG: Record<SystemProviderId, SystemProvider> = {
  internal: INTERNAL_PROVIDER,
  // keep existing entries in file for source compatibility, but do not export them through SYSTEM_PROVIDERS
} as const

export const SYSTEM_PROVIDERS: SystemProvider[] = [INTERNAL_PROVIDER]
```

Add internal provider URL metadata to `PROVIDER_URLS`:

```ts
internal: {
  api: {
    url: 'http://localhost:8000/v1'
  }
},
```

- [ ] **Step 4: Sanitize LLM initial state and reducers**

In `src/renderer/src/store/llm.ts`, import helpers:

```ts
import { internalDefaultModel, sanitizeInternalModel, sanitizeInternalProviders } from '@renderer/config/internalLockdown'
```

Set initial models/providers:

```ts
export const initialState: LlmState = {
  defaultModel: internalDefaultModel,
  topicNamingModel: internalDefaultModel,
  quickModel: internalDefaultModel,
  translateModel: internalDefaultModel,
  quickAssistantId: '',
  providers: sanitizeInternalProviders(SYSTEM_PROVIDERS),
  settings: {
    // keep existing settings object unchanged
  }
}
```

Update reducers:

```ts
updateProviders: (state, action: PayloadAction<Provider[]>) => {
  state.providers = sanitizeInternalProviders(action.payload)
},
addProvider: (state, action: PayloadAction<Provider>) => {
  state.providers = sanitizeInternalProviders([...state.providers, action.payload])
},
setDefaultModel: (state, action: PayloadAction<{ model: Model }>) => {
  state.defaultModel = sanitizeInternalModel(action.payload.model)
},
setQuickModel: (state, action: PayloadAction<{ model: Model }>) => {
  state.quickModel = sanitizeInternalModel(action.payload.model)
},
setTranslateModel: (state, action: PayloadAction<{ model: Model }>) => {
  state.translateModel = sanitizeInternalModel(action.payload.model)
},
```

- [ ] **Step 5: Remove implicit CherryAI provider injection**

In `src/renderer/src/hooks/useProvider.ts`, remove `CHERRYAI_PROVIDER` import and update selectors:

```ts
const selectEnabledProviders = createSelector(selectProviders, (providers) =>
  sanitizeInternalProviders(providers).map(normalizeProvider)
)

const selectAllProvidersWithCherryAI = createSelector(selectProviders, (providers) =>
  sanitizeInternalProviders(providers).map(normalizeProvider)
)
```

- [ ] **Step 6: Hide add-provider UI**

In `src/renderer/src/pages/settings/ProviderSettings/ProviderList.tsx`, remove the add provider button rendering by making `onAddProvider` unreachable and deleting the visible `PlusIcon` button. Keep edit/model-management for the selected internal provider.

Expected JSX shape:

```tsx
<ProviderActions>
  <Input value={searchText} onChange={(event) => setSearchText(event.target.value)} />
</ProviderActions>
```

- [ ] **Step 7: Run LLM tests**

Run:

```bash
pnpm test:renderer src/renderer/src/store/__tests__/llm-lockdown.test.ts src/renderer/src/config/__tests__/internalLockdown.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit provider lockdown**

```bash
git add src/renderer/src/config/providers.ts src/renderer/src/store/llm.ts src/renderer/src/hooks/useProvider.ts src/renderer/src/services/AssistantService.ts src/renderer/src/pages/settings/ProviderSettings/ProviderList.tsx src/renderer/src/store/__tests__/llm-lockdown.test.ts
git commit --signoff -m "feat: restrict providers to internal server"
```

---

### Task 3: Sanitize Persisted Navigation, Providers, MinApps, WebSearch, And MCP

**Files:**
- Modify: `src/renderer/src/store/index.ts`
- Modify: `src/renderer/src/store/migrate.ts`
- Modify: `src/renderer/src/config/sidebar.ts`
- Modify: `src/renderer/src/store/minapps.ts`
- Modify: `src/renderer/src/store/websearch.ts`
- Modify: `src/renderer/src/store/mcp.ts`

- [ ] **Step 1: Write migration helper test**

Create `src/renderer/src/store/__tests__/internal-lockdown-migrate.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { INTERNAL_PROVIDER_ID } from '@renderer/config/internalLockdown'
import migrate from '../migrate'

describe('internal lockdown migration', () => {
  it('removes persisted external surfaces', async () => {
    const state = await migrate(
      {
        llm: {
          providers: [{ id: 'openai', name: 'OpenAI', type: 'openai', apiKey: '', apiHost: '', models: [] }],
          defaultModel: { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', group: 'OpenAI' },
          quickModel: { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', group: 'OpenAI' },
          translateModel: { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', group: 'OpenAI' }
        },
        settings: {
          sidebarIcons: {
            visible: ['assistants', 'store', 'paintings', 'minapp', 'code_tools', 'openclaw'],
            disabled: []
          }
        },
        minapps: { enabled: [{ id: 'openai' }], disabled: [], pinned: [{ id: 'openai' }] },
        websearch: { providers: [{ id: 'tavily' }] },
        mcp: {
          servers: [{ id: 'brave', name: '@modelcontextprotocol/server-brave-search', type: 'inMemory' }]
        }
      } as any,
      206
    )

    expect(state.llm.providers.map((provider: any) => provider.id)).toEqual([INTERNAL_PROVIDER_ID])
    expect(state.llm.defaultModel.provider).toBe(INTERNAL_PROVIDER_ID)
    expect(state.settings.sidebarIcons.visible).toEqual(['assistants'])
    expect(state.minapps.enabled).toEqual([])
    expect(state.minapps.pinned).toEqual([])
    expect(state.websearch.providers).toEqual([])
    expect(state.mcp.servers).toEqual([])
  })
})
```

- [ ] **Step 2: Run migration test to verify it fails**

Run:

```bash
pnpm test:renderer src/renderer/src/store/__tests__/internal-lockdown-migrate.test.ts
```

Expected: FAIL because migration `207` does not exist.

- [ ] **Step 3: Update sidebar defaults**

In `src/renderer/src/config/sidebar.ts`:

```ts
export const DEFAULT_SIDEBAR_ICONS: SidebarIcon[] = [
  'assistants',
  'agents',
  'translate',
  'knowledge',
  'files',
  'notes'
]
```

- [ ] **Step 4: Empty MinApps and WebSearch initial states**

In `src/renderer/src/store/minapps.ts`:

```ts
const initialState: MinAppsState = {
  enabled: [],
  disabled: [],
  pinned: []
}
```

In `src/renderer/src/store/websearch.ts`:

```ts
export const initialState: WebSearchState = {
  defaultProvider: '',
  providers: [],
  searchWithTime: false,
  maxResults: 0,
  excludeDomains: [],
  subscribeSources: [],
  overwrite: false,
  compressionConfig: {
    method: 'none',
    cutoffUnit: 'char'
  },
  providerConfig: {}
}
```

- [ ] **Step 5: Restrict built-in MCP install list**

In `src/renderer/src/store/mcp.ts`, keep only local/internal built-ins:

```ts
export const builtinMCPServers: BuiltinMCPServer[] = [
  {
    id: nanoid(),
    name: BuiltinMCPServerNames.memory,
    type: 'inMemory',
    isActive: true,
    env: {
      MEMORY_FILE_PATH: 'YOUR_MEMORY_FILE_PATH'
    },
    shouldConfig: true,
    provider: 'Internal',
    installSource: 'builtin',
    isTrusted: true
  },
  {
    id: nanoid(),
    name: BuiltinMCPServerNames.sequentialThinking,
    type: 'inMemory',
    isActive: true,
    provider: 'Internal',
    installSource: 'builtin',
    isTrusted: true
  },
  {
    id: nanoid(),
    name: BuiltinMCPServerNames.filesystem,
    type: 'inMemory',
    args: ['/Users/username/Desktop'],
    disabledAutoApproveTools: [...filesystemManualApprovalTools],
    shouldConfig: true,
    isActive: false,
    provider: 'Internal',
    installSource: 'builtin',
    isTrusted: true
  }
] as const
```

- [ ] **Step 6: Add migration 207**

In `src/renderer/src/store/index.ts`, set:

```ts
version: 207,
```

In `src/renderer/src/store/migrate.ts`, import helpers:

```ts
import {
  sanitizeInternalModel,
  sanitizeInternalProviders,
  sanitizeSidebarIcons
} from '@renderer/config/internalLockdown'
```

Add migration entry before `createMigrate`:

```ts
'207': (state: RootState) => {
  try {
    state.llm.providers = sanitizeInternalProviders(state.llm.providers)
    state.llm.defaultModel = sanitizeInternalModel(state.llm.defaultModel)
    state.llm.topicNamingModel = sanitizeInternalModel(state.llm.topicNamingModel)
    state.llm.quickModel = sanitizeInternalModel(state.llm.quickModel)
    state.llm.translateModel = sanitizeInternalModel(state.llm.translateModel)

    state.settings.sidebarIcons.visible = sanitizeSidebarIcons(state.settings.sidebarIcons.visible)
    state.settings.sidebarIcons.disabled = sanitizeSidebarIcons(state.settings.sidebarIcons.disabled)

    state.minapps.enabled = []
    state.minapps.disabled = []
    state.minapps.pinned = []

    state.websearch.providers = []
    state.websearch.defaultProvider = ''
    state.websearch.searchWithTime = false
    state.websearch.maxResults = 0

    const allowedBuiltinNames = new Set([
      BuiltinMCPServerNames.memory,
      BuiltinMCPServerNames.sequentialThinking,
      BuiltinMCPServerNames.filesystem
    ])
    state.mcp.servers = state.mcp.servers.filter(
      (server) => !isBuiltinMCPServer(server) || allowedBuiltinNames.has(server.name)
    )

    logger.info('migrate 207 success')
    return state
  } catch (error) {
    logger.error('migrate 207 error', error as Error)
    return state
  }
},
```

- [ ] **Step 7: Run migration tests**

Run:

```bash
pnpm test:renderer src/renderer/src/store/__tests__/internal-lockdown-migrate.test.ts src/renderer/src/store/__tests__/mcp.test.ts
```

Expected: PASS after updating any MCP test expectations to the internal built-in list.

- [ ] **Step 8: Commit persistence lockdown**

```bash
git add src/renderer/src/store/index.ts src/renderer/src/store/migrate.ts src/renderer/src/config/sidebar.ts src/renderer/src/store/minapps.ts src/renderer/src/store/websearch.ts src/renderer/src/store/mcp.ts src/renderer/src/store/__tests__/internal-lockdown-migrate.test.ts src/renderer/src/store/__tests__/mcp.test.ts
git commit --signoff -m "feat: sanitize persisted external surfaces"
```

---

### Task 4: Remove External UI Routes And Menus

**Files:**
- Modify: `src/renderer/src/Router.tsx`
- Modify: `src/renderer/src/components/app/Sidebar.tsx`
- Modify: `src/renderer/src/pages/settings/SettingsPage.tsx`
- Modify: `src/renderer/src/pages/launchpad/LaunchpadPage.tsx`
- Modify: `src/renderer/src/pages/settings/MCPSettings/index.tsx`

- [ ] **Step 1: Remove top-level route imports and routes**

In `src/renderer/src/Router.tsx`, remove imports for `CodeToolsPage`, `MinAppPage`, `MinAppsPage`, `OpenClawPage`, `PaintingsRoutePage`, and `AssistantPresetsPage`.

Change routes to:

```tsx
<Routes>
  <Route path="/" element={<HomePage />} />
  <Route path="/agents" element={<AgentPage />} />
  <Route path="/translate" element={<TranslatePage />} />
  <Route path="/files" element={<FilesPage />} />
  <Route path="/notes" element={<NotesPage />} />
  <Route path="/knowledge" element={<KnowledgePage />} />
  <Route path="/settings/*" element={<SettingsPage />} />
  <Route path="/launchpad" element={<LaunchpadPage />} />
  <Route path="*" element={<HomePage />} />
</Routes>
```

- [ ] **Step 2: Remove sidebar icons for disabled surfaces**

In `src/renderer/src/components/app/Sidebar.tsx`, remove imports and map entries for `LayoutGrid`, `Palette`, `Code`, `Sparkle`, and `OpenClawSidebarIcon`.

Keep `iconMap` and `pathMap` to active icons only:

```ts
const iconMap = {
  assistants: <MessageSquare size={18} className="icon" />,
  agents: <MousePointerClick size={18} className="icon" />,
  translate: <Languages size={18} className="icon" />,
  knowledge: <FileSearch size={18} className="icon" />,
  files: <Folder size={18} className="icon" />,
  notes: <NotepadText size={18} className="icon" />
}

const pathMap = {
  assistants: '/',
  agents: '/agents',
  translate: '/translate',
  knowledge: '/knowledge',
  files: '/files',
  notes: '/notes'
}
```

- [ ] **Step 3: Remove settings menu entries**

In `src/renderer/src/pages/settings/SettingsPage.tsx`, remove imports and menu/routes for `ChannelsSettings`, `WebSearchSettings`, and `ApiServerSettings` if the API server is not required for internal use. Keep MCP settings.

Required route set:

```tsx
<Routes>
  <Route path="provider" element={<ProviderList />} />
  <Route path="model" element={<ModelSettings />} />
  <Route path="scheduled-tasks" element={<TasksSettings />} />
  <Route path="docprocess" element={<DocProcessSettings />} />
  <Route path="quickphrase" element={<QuickPhraseSettings />} />
  <Route path="mcp/*" element={<MCPSettings />} />
  <Route path="skills" element={<SkillsSettings />} />
  <Route path="memory" element={<MemorySettings />} />
  <Route path="general/*" element={<GeneralSettings />} />
  <Route path="display" element={<DisplaySettings />} />
  <Route path="shortcut" element={<ShortcutSettings />} />
  <Route path="quickAssistant" element={<QuickAssistantSettings />} />
  <Route path="selectionAssistant" element={<SelectionAssistantSettings />} />
  <Route path="data" element={<DataSettings />} />
  <Route path="about" element={<AboutSettings />} />
</Routes>
```

- [ ] **Step 4: Remove MCP discovery tabs**

In `src/renderer/src/pages/settings/MCPSettings/index.tsx`, remove imports and menu/routes for `BuiltinMCPServerList`, `McpMarketList`, `ProviderDetail`, provider logo imports, and `providers`.

Keep these routes:

```tsx
<Routes>
  <Route index element={<Navigate to="servers" replace />} />
  <Route path="servers" element={<McpServersList />} />
  <Route path="settings/:serverId" element={<McpSettings />} />
  <Route
    path="mcp-install"
    element={
      <SettingContainer style={{ backgroundColor: 'inherit' }}>
        <InstallNpxUv />
      </SettingContainer>
    }
  />
  <Route path="*" element={<Navigate to="servers" replace />} />
</Routes>
```

- [ ] **Step 5: Run renderer typecheck**

Run:

```bash
pnpm typecheck
```

Expected: PASS for route/menu type references after removing unused imports.

- [ ] **Step 6: Commit UI route removal**

```bash
git add src/renderer/src/Router.tsx src/renderer/src/components/app/Sidebar.tsx src/renderer/src/pages/settings/SettingsPage.tsx src/renderer/src/pages/launchpad/LaunchpadPage.tsx src/renderer/src/pages/settings/MCPSettings/index.tsx
git commit --signoff -m "feat: remove external llm navigation surfaces"
```

---

### Task 5: Disable MinApps, Web Search, And Image Generation Entry Points

**Files:**
- Modify: `src/renderer/src/config/minapps.ts`
- Modify: `src/renderer/src/hooks/useMinapps.ts`
- Modify: `src/renderer/src/config/webSearchProviders.ts`
- Modify: `src/renderer/src/pages/home/Inputbar/tools/index.ts`
- Modify: `src/renderer/src/pages/home/Inputbar/Inputbar.tsx`

- [ ] **Step 1: Empty MinApps config**

In `src/renderer/src/config/minapps.ts`, replace default/custom loading exports with:

```ts
import type { MinAppType } from '@renderer/types'

export const defaultMinApps: MinAppType[] = []
export const allMinApps: MinAppType[] = []

export async function loadMiniApps(): Promise<MinAppType[]> {
  return []
}
```

- [ ] **Step 2: Empty web search providers**

In `src/renderer/src/config/webSearchProviders.ts`:

```ts
import type { WebSearchProvider, WebSearchProviderId } from '@renderer/types'

type WebSearchProviderConfig = {
  websites: {
    official: string
    apiKey?: string
  }
}

export const WEB_SEARCH_PROVIDER_CONFIG: Partial<Record<WebSearchProviderId, WebSearchProviderConfig>> = {}
export const WEB_SEARCH_PROVIDERS: WebSearchProvider[] = []
```

- [ ] **Step 3: Stop registering input tools that can call external services**

In `src/renderer/src/pages/home/Inputbar/tools/index.ts`, remove:

```ts
import './webSearchTool'
import './generateImageTool'
```

- [ ] **Step 4: Disable auto image-generation toggles**

In `src/renderer/src/pages/home/Inputbar/Inputbar.tsx`, remove the effect that auto-enables image generation based on model capabilities. The resulting logic should not set `assistant.enableGenerateImage` automatically.

- [ ] **Step 5: Run focused renderer tests**

Run:

```bash
pnpm test:renderer src/renderer/src/store/__tests__/minapps.test.ts
```

Expected: update tests so empty/pinned behavior remains deterministic; PASS after expectations reflect lockdown.

- [ ] **Step 6: Commit tool surface lockdown**

```bash
git add src/renderer/src/config/minapps.ts src/renderer/src/hooks/useMinapps.ts src/renderer/src/config/webSearchProviders.ts src/renderer/src/pages/home/Inputbar/tools/index.ts src/renderer/src/pages/home/Inputbar/Inputbar.tsx src/renderer/src/store/__tests__/minapps.test.ts
git commit --signoff -m "feat: disable external app and search tools"
```

---

### Task 6: Disable Channel, OpenClaw, And Code Tools IPC Surfaces

**Files:**
- Modify: `src/main/index.ts`
- Modify: `src/main/ipc.ts`
- Modify: `src/preload/index.ts`
- Modify: `packages/shared/IpcChannel.ts`

- [ ] **Step 1: Stop channel and OpenClaw startup imports**

In `src/main/index.ts`, remove imports:

```ts
import { channelManager } from './services/agents/services/channels'
import { registerSessionStreamIpc } from './services/agents/services/channels/sessionStreamIpc'
import { openClawService } from './services/OpenClawService'
```

Remove startup calls:

```ts
registerSessionStreamIpc()
await channelManager.start()
```

- [ ] **Step 2: Remove OpenClaw and channel IPC handlers**

In `src/main/ipc.ts`, remove the `openClawService` import and delete handler blocks for:

```ts
IpcChannel.Channel_GetLogs
IpcChannel.Channel_GetStatuses
IpcChannel.OpenClaw_CheckInstalled
IpcChannel.OpenClaw_Install
IpcChannel.OpenClaw_Uninstall
IpcChannel.OpenClaw_StartGateway
IpcChannel.OpenClaw_StopGateway
IpcChannel.OpenClaw_GetStatus
IpcChannel.OpenClaw_CheckHealth
IpcChannel.OpenClaw_GetDashboardUrl
IpcChannel.OpenClaw_SyncConfig
IpcChannel.OpenClaw_GetChannels
IpcChannel.OpenClaw_CheckUpdate
IpcChannel.OpenClaw_PerformUpdate
IpcChannel.WeChat_HasCredentials
```

- [ ] **Step 3: Remove preload exposed APIs**

In `src/preload/index.ts`, remove `wechat`, `feishu`, `channel`, and `openclaw` entries from the exposed API object. Also remove local OpenClaw type declarations at the top of the file.

- [ ] **Step 4: Keep shared channel constants only if required by generated types**

In `packages/shared/IpcChannel.ts`, delete OpenClaw and channel enum members only after TypeScript confirms there are no remaining references. If deleting produces broad generated API churn, keep enum members but do not register handlers or expose preload methods.

- [ ] **Step 5: Run static reference check**

Run:

```bash
rg -n "window\\.api\\.(openclaw|channel|wechat|feishu)|OpenClaw_|Channel_Get|WeChat_HasCredentials" src packages
```

Expected: no matches in reachable renderer/main code after handler removal. Matches in tests or removed page files are acceptable only if those files are no longer imported by routes.

- [ ] **Step 6: Run typecheck**

Run:

```bash
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit backend IPC lockdown**

```bash
git add src/main/index.ts src/main/ipc.ts src/preload/index.ts packages/shared/IpcChannel.ts
git commit --signoff -m "feat: disable external integration ipc"
```

---

### Task 7: Final Verification And Formatting

**Files:**
- Modify: files changed by formatting only.

- [ ] **Step 1: Run lint**

Run:

```bash
pnpm lint
```

Expected: PASS. If i18n sort errors appear, run `pnpm i18n:sync` and rerun `pnpm lint`.

- [ ] **Step 2: Run tests**

Run:

```bash
pnpm test
```

Expected: PASS. If removed external tests fail because they import disabled UI routes, update those tests to assert the disabled behavior or remove route imports from test setup.

- [ ] **Step 3: Run format**

Run:

```bash
pnpm format
```

Expected: PASS with no remaining formatting diff after command completes.

- [ ] **Step 4: Inspect final diff**

Run:

```bash
git status --short
git diff --stat
```

Expected: only intentional lockdown files are modified.

- [ ] **Step 5: Commit verification fixes**

If formatting or test adjustments changed files:

```bash
git add .
git commit --signoff -m "chore: finalize internal llm lockdown"
```

- [ ] **Step 6: Push branch**

Run:

```bash
git push -u origin custom/internal-llm-lockdown
```

Expected: branch pushed to `https://github.com/Neil-TC/cherry-studio.git`.

---

## Self-Review

- Spec coverage: The plan covers internal provider restriction, MCP manual-only behavior, channel removal, MinApps removal, Code Tools removal, OpenClaw removal, web-search/image-generation disabling, navigation persistence, tests, and final verification.
- Placeholder scan: No deferred implementation markers are present.
- Type consistency: The internal provider id is consistently `internal`, model provider is consistently `internal`, and migration version is consistently `207`.

