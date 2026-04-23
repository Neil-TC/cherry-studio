import { describe, expect, it } from 'vitest'

import { sanitizeInternalModel, sanitizeInternalProviders, sanitizeSidebarIcons } from '../internalLockdown'

describe('internal lockdown helpers', () => {
  it('keeps exactly one internal provider while preserving internal settings', () => {
    const providers = sanitizeInternalProviders([
      {
        id: 'internal',
        type: 'openai',
        name: 'Custom Internal',
        apiHost: 'http://localhost:9000/v1',
        apiKey: 'secret',
        models: [
          {
            id: 'custom-local',
            name: 'Custom Local',
            provider: 'internal',
            group: 'Internal'
          },
          {
            id: 'external-local',
            name: 'External Local',
            provider: 'openai',
            group: 'OpenAI'
          }
        ],
        isSystem: true,
        enabled: true
      },
      {
        id: 'openai',
        type: 'openai',
        name: 'External OpenAI',
        apiHost: 'https://api.openai.com/v1',
        apiKey: 'external',
        models: [],
        isSystem: true,
        enabled: true
      }
    ])

    expect(providers).toHaveLength(1)
    expect(providers[0]).toMatchObject({
      id: 'internal',
      type: 'openai',
      name: 'Custom Internal',
      apiHost: 'http://localhost:9000/v1',
      apiKey: 'secret',
      isSystem: true,
      enabled: true
    })
    expect(providers[0].models).toEqual([
      {
        id: 'custom-local',
        name: 'Custom Local',
        provider: 'internal',
        group: 'Internal'
      }
    ])
  })

  it('falls back to the internal default model for persisted external models', () => {
    expect(
      sanitizeInternalModel({
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'openai',
        group: 'OpenAI'
      })
    ).toMatchObject({
      id: '',
      name: '',
      provider: '',
      group: 'Internal'
    })
  })

  it('preserves sidebar icons and keeps assistants as required', () => {
    expect(sanitizeSidebarIcons(['assistants', 'store', 'paintings', 'minapp', 'code_tools', 'openclaw'])).toEqual([
      'assistants',
      'store',
      'paintings',
      'minapp',
      'code_tools',
      'openclaw'
    ])
  })
})
