import { INTERNAL_PROVIDER_ID } from '@renderer/config/internalLockdown'
import { allMinApps } from '@renderer/config/minapps'
import migrate from '@renderer/store/migrate'
import { BuiltinMCPServerNames } from '@renderer/types'
import { describe, expect, it } from 'vitest'

describe('internal lockdown migration', () => {
  it('sanitizes persisted external surfaces to internal-only defaults', async () => {
    const migrated: any = await migrate(
      {
        _persist: { version: 206, rehydrated: false },
        llm: {
          providers: [
            {
              id: INTERNAL_PROVIDER_ID,
              name: 'Custom Internal',
              type: 'openai',
              apiHost: 'http://localhost:9000/v1',
              apiKey: 'secret',
              models: [
                {
                  id: 'internal-model',
                  name: 'Internal Model',
                  provider: INTERNAL_PROVIDER_ID,
                  group: 'Internal'
                },
                {
                  id: 'external-model',
                  name: 'External Model',
                  provider: 'openai',
                  group: 'OpenAI'
                }
              ],
              isSystem: true,
              enabled: true
            },
            {
              id: 'openai',
              name: 'OpenAI',
              type: 'openai',
              apiHost: 'https://api.openai.com/v1',
              apiKey: 'external',
              models: [],
              isSystem: true,
              enabled: true
            }
          ],
          defaultModel: {
            id: 'gpt-4o',
            name: 'GPT-4o',
            provider: 'openai',
            group: 'OpenAI'
          },
          topicNamingModel: {
            id: 'gpt-4o',
            name: 'GPT-4o',
            provider: 'openai',
            group: 'OpenAI'
          },
          quickModel: {
            id: 'gpt-4o',
            name: 'GPT-4o',
            provider: 'openai',
            group: 'OpenAI'
          },
          translateModel: {
            id: 'gpt-4o',
            name: 'GPT-4o',
            provider: 'openai',
            group: 'OpenAI'
          },
          quickAssistantId: '',
          settings: {
            ollama: { keepAliveTime: 0 },
            lmstudio: { keepAliveTime: 0 },
            gpustack: { keepAliveTime: 0 },
            vertexai: {
              serviceAccount: { privateKey: '', clientEmail: '' },
              projectId: '',
              location: ''
            },
            awsBedrock: {
              authType: 'iam',
              accessKeyId: '',
              secretAccessKey: '',
              apiKey: '',
              region: ''
            },
            cherryIn: {
              accessToken: '',
              refreshToken: ''
            }
          }
        },
        settings: {
          sidebarIcons: {
            visible: ['assistants', 'store', 'paintings', 'minapp', 'code_tools', 'openclaw'],
            disabled: ['store', 'code_tools']
          }
        },
        minapps: {
          enabled: allMinApps,
          disabled: allMinApps.slice(0, 1),
          pinned: allMinApps.slice(0, 1)
        },
        websearch: {
          defaultProvider: 'openai',
          providers: [
            {
              id: 'zhipu',
              name: 'ZhiPu',
              apiKey: 'secret'
            }
          ],
          searchWithTime: true,
          maxResults: 5,
          excludeDomains: ['example.com'],
          subscribeSources: [],
          overwrite: true,
          compressionConfig: {
            method: 'none',
            cutoffUnit: 'char'
          },
          providerConfig: {}
        },
        mcp: {
          servers: [
            {
              id: 'builtin-memory',
              name: BuiltinMCPServerNames.memory,
              type: 'inMemory',
              isActive: true,
              installSource: 'builtin'
            },
            {
              id: 'builtin-sequential',
              name: BuiltinMCPServerNames.sequentialThinking,
              type: 'inMemory',
              isActive: true,
              installSource: 'builtin'
            },
            {
              id: 'builtin-filesystem',
              name: BuiltinMCPServerNames.filesystem,
              type: 'inMemory',
              isActive: true,
              installSource: 'builtin'
            },
            {
              id: 'builtin-browser',
              name: BuiltinMCPServerNames.browser,
              type: 'inMemory',
              isActive: true,
              installSource: 'builtin'
            },
            {
              id: 'manual-custom',
              name: 'custom-server',
              type: 'http',
              isActive: true,
              installSource: 'manual'
            }
          ],
          isUvInstalled: true,
          isBunInstalled: true
        }
      } as any,
      209
    )

    expect(migrated.llm.providers).toHaveLength(1)
    expect(migrated.llm.providers[0].id).toBe(INTERNAL_PROVIDER_ID)
    expect(migrated.llm.providers[0].models.every((model: any) => model.provider === INTERNAL_PROVIDER_ID)).toBe(true)
    expect(migrated.llm.defaultModel.provider).toBe('')
    expect(migrated.llm.quickModel.provider).toBe('')
    expect(migrated.llm.translateModel.provider).toBe('')
    expect(migrated.llm.topicNamingModel.provider).toBe('')

    expect(migrated.settings.sidebarIcons.visible).toEqual([
      'assistants',
      'agents',
      'store',
      'paintings',
      'translate',
      'minapp',
      'knowledge',
      'files',
      'notes',
      'code_tools',
      'openclaw'
    ])
    expect(migrated.settings.sidebarIcons.disabled).toEqual([])
    expect(migrated.settings.navbarPosition).toBe('left')

    expect(migrated.minapps.enabled).toEqual([])
    expect(migrated.minapps.disabled).toEqual([])
    expect(migrated.minapps.pinned).toEqual([])

    expect(migrated.websearch.defaultProvider).toBe('')
    expect(migrated.websearch.providers).toEqual([])
    expect(migrated.websearch.searchWithTime).toBe(false)
    expect(migrated.websearch.maxResults).toBe(0)
    expect(migrated.websearch.excludeDomains).toEqual([])
    expect(migrated.websearch.overwrite).toBe(false)

    expect(migrated.mcp.servers.map((server: any) => server.name)).toEqual([
      BuiltinMCPServerNames.memory,
      BuiltinMCPServerNames.sequentialThinking,
      BuiltinMCPServerNames.filesystem,
      'custom-server'
    ])
  })
})
