import type { MinAppType } from '@renderer/types'

export const defaultMinApps: MinAppType[] = []
export const ORIGIN_DEFAULT_MIN_APPS: MinAppType[] = []

export async function loadCustomMiniApp(): Promise<MinAppType[]> {
  return []
}

export async function loadMiniApps(): Promise<MinAppType[]> {
  return []
}

export let allMinApps: MinAppType[] = []

export function updateAllMinApps(apps: MinAppType[]) {
  allMinApps = apps
}
