import type { Model, Provider, SidebarIcon, SystemProvider } from '@renderer/types'

import { internalDefaultModel } from './models/default'

export const INTERNAL_PROVIDER_ID = 'internal'

export const INTERNAL_PROVIDER: SystemProvider = {
  id: INTERNAL_PROVIDER_ID,
  name: 'Internal Server',
  type: 'openai',
  apiHost: 'http://localhost:8000/v1',
  apiKey: '',
  models: [internalDefaultModel],
  isSystem: true,
  enabled: true
}

const REMOVED_SIDEBAR_ICONS = new Set<SidebarIcon>(['store', 'paintings', 'minapp', 'code_tools', 'openclaw'])

export function sanitizeInternalModel(model: Model | undefined): Model {
  return model?.provider === INTERNAL_PROVIDER_ID ? model : internalDefaultModel
}

export function sanitizeInternalProviders(providers: Provider[]): SystemProvider[] {
  const existingInternalProvider = providers.find((provider) => provider.id === INTERNAL_PROVIDER_ID)

  if (!existingInternalProvider) {
    return [INTERNAL_PROVIDER]
  }

  return [
    {
      ...INTERNAL_PROVIDER,
      ...existingInternalProvider,
      id: INTERNAL_PROVIDER_ID,
      type: 'openai',
      isSystem: true,
      enabled: true,
      apiHost: existingInternalProvider.apiHost ?? INTERNAL_PROVIDER.apiHost,
      apiKey: existingInternalProvider.apiKey ?? INTERNAL_PROVIDER.apiKey,
      name: existingInternalProvider.name ?? INTERNAL_PROVIDER.name,
      models: existingInternalProvider.models?.length ? existingInternalProvider.models : INTERNAL_PROVIDER.models
    }
  ]
}

export function sanitizeSidebarIcons(icons: SidebarIcon[]): SidebarIcon[] {
  const visibleIcons = icons.filter((icon) => !REMOVED_SIDEBAR_ICONS.has(icon))
  return visibleIcons.includes('assistants') ? visibleIcons : ['assistants', ...visibleIcons]
}
