import type { WebSearchProvider, WebSearchProviderId } from '@renderer/types'

type WebSearchProviderConfig = {
  websites: {
    official: string
    apiKey?: string
  }
}

export const WEB_SEARCH_PROVIDER_CONFIG: Partial<Record<WebSearchProviderId, WebSearchProviderConfig>> = {}
export const WEB_SEARCH_PROVIDERS: WebSearchProvider[] = []
