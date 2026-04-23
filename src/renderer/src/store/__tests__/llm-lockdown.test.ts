import { configureStore } from '@reduxjs/toolkit'
import { INTERNAL_PROVIDER_ID } from '@renderer/config/internalLockdown'
import { internalDefaultModel } from '@renderer/config/models/default'
import llmReducer, { initialState, updateProviders } from '@renderer/store/llm'
import { describe, expect, it, vi } from 'vitest'

describe('llm lockdown state', () => {
  it('starts with only the internal provider and internal default models', () => {
    expect(initialState.providers.map((provider) => provider.id)).toEqual([INTERNAL_PROVIDER_ID])
    expect(initialState.defaultModel.provider).toBe('')
    expect(initialState.quickModel.provider).toBe('')
    expect(initialState.translateModel.provider).toBe('')
    expect(initialState.topicNamingModel.provider).toBe('')
    expect(initialState.defaultModel).toMatchObject(internalDefaultModel)
  })

  it('filters external providers out of updateProviders and keeps only the internal provider', () => {
    const store = configureStore({
      reducer: { llm: llmReducer }
    })

    store.dispatch(
      updateProviders([
        {
          id: 'internal',
          name: 'Custom Internal',
          type: 'openai',
          apiHost: 'http://localhost:9000/v1',
          apiKey: 'secret',
          models: [
            {
              id: 'internal-model',
              name: 'Internal Model',
              provider: 'internal',
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
      ])
    )

    const providers = store.getState().llm.providers
    expect(providers).toHaveLength(1)
    expect(providers[0].id).toBe(INTERNAL_PROVIDER_ID)
    expect(providers[0].models).toEqual([
      {
        id: 'internal-model',
        name: 'Internal Model',
        provider: 'internal',
        group: 'Internal'
      }
    ])
  })

  it('getStoreProviders returns only the internal provider', async () => {
    vi.resetModules()
    vi.doMock('@renderer/store', () => ({
      __esModule: true,
      useAppDispatch: () => () => undefined,
      useAppSelector: (selector: (state: any) => unknown) =>
        selector({
          llm: {
            providers: [
              {
                id: INTERNAL_PROVIDER_ID,
                name: 'Internal Server',
                type: 'openai',
                apiHost: 'http://localhost:8000/v1',
                apiKey: '',
                models: [internalDefaultModel],
                isSystem: true,
                enabled: true
              }
            ]
          }
        }),
      default: {
        getState: () => ({
          llm: {
            providers: [
              {
                id: INTERNAL_PROVIDER_ID,
                name: 'Internal Server',
                type: 'openai',
                apiHost: 'http://localhost:8000/v1',
                apiKey: '',
                models: [internalDefaultModel],
                isSystem: true,
                enabled: true
              }
            ]
          }
        })
      }
    }))

    const { getStoreProviders } = await import('@renderer/hooks/useStore')
    const providers = getStoreProviders()

    expect(providers.map((provider) => provider.id)).toEqual([INTERNAL_PROVIDER_ID])
    expect(providers.every((provider) => provider.id === INTERNAL_PROVIDER_ID)).toBe(true)
  })
})
