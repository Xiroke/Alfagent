/**
 * Map widget contract for legal-address selection.
 *
 * Stub today: MapWidgetStub simulates pin selection.
 * Swap provider via MAP_PROVIDER and implement YandexMapAdapter / CianMapAdapter
 * without changing address step UI.
 */

import type { MapPoint, MapWidgetProps } from "@/features/registration-wizard/types"

export type MapProvider = "yandex" | "cian"

export const MAP_PROVIDER: MapProvider = "yandex"

export interface MapAdapter {
  readonly provider: MapProvider
  /** Future: mount real SDK into container. */
  mount(container: HTMLElement, props: MapWidgetProps): () => void
  geocode?(query: string): Promise<MapPoint[]>
}

export class YandexMapAdapter implements MapAdapter {
  readonly provider = "yandex" as const

  mount(_container: HTMLElement, _props: MapWidgetProps): () => void {
    // Placeholder: integrate window.ymaps / @yandex/ymaps3 when API key is ready.
    return () => undefined
  }

  async geocode(query: string): Promise<MapPoint[]> {
    void query
    return []
  }
}

export class CianMapAdapter implements MapAdapter {
  readonly provider = "cian" as const

  mount(_container: HTMLElement, _props: MapWidgetProps): () => void {
    // Placeholder: CIAN listing picker / iframe embed.
    return () => undefined
  }

  async geocode(query: string): Promise<MapPoint[]> {
    void query
    return []
  }
}

export function createMapAdapter(provider: MapProvider = MAP_PROVIDER): MapAdapter {
  if (provider === "cian") return new CianMapAdapter()
  return new YandexMapAdapter()
}

export const MOSCOW_CENTER = { lat: 55.7558, lon: 37.6173 } as const

export const SAMPLE_OFFICES: MapPoint[] = [
  {
    lat: 55.751_244,
    lon: 37.618_423,
    label: "Москва, ул. Тверская, 7",
    providerMeta: { source: "yandex", listingId: "demo-tverskaya-7" },
  },
  {
    lat: 55.764_409,
    lon: 37.605_754,
    label: "Москва, Большая Никитская, 22",
    providerMeta: { source: "cian", listingId: "demo-nikitskaya-22" },
  },
  {
    lat: 55.733_835,
    lon: 37.588_144,
    label: "Москва, Ленинский пр-т, 15А",
    providerMeta: { source: "yandex", listingId: "demo-leninsky-15a" },
  },
]
