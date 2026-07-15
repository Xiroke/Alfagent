import { MapPin, Buildings } from "@phosphor-icons/react"

import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"

import {
  MAP_PROVIDER,
  MOSCOW_CENTER,
  SAMPLE_OFFICES,
  type MapAdapter,
  createMapAdapter,
} from "./types"
import type { MapPoint, MapWidgetProps } from "@/features/registration-wizard/types"

export function MapWidgetStub({
  provider = MAP_PROVIDER,
  initialCenter = MOSCOW_CENTER,
  selectedPoint = null,
  onSelectPoint,
  className,
}: MapWidgetProps) {
  const adapter: MapAdapter = createMapAdapter(provider)

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-surface shadow-sm",
        className,
      )}
      data-map-provider={adapter.provider}
      data-map-center={`${initialCenter.lat},${initialCenter.lon}`}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
        <div className="flex items-center gap-2">
          <Buildings className="size-4 text-accent" weight="duotone" />
          <span className="text-sm font-semibold text-ink">Карта юридического адреса</span>
        </div>
        <Badge variant="soft">
          {adapter.provider === "yandex" ? "Яндекс Карты" : "ЦИАН"} · stub
        </Badge>
      </div>

      <div className="relative min-h-[280px] bg-[linear-gradient(160deg,#F8F9FA_0%,#FFFFFF_45%,#FDECEA_100%)]">
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="absolute left-[12%] top-[20%] h-px w-[76%] bg-ink/10" />
          <div className="absolute left-[18%] top-[48%] h-px w-[64%] bg-ink/10" />
          <div className="absolute left-[28%] top-[10%] h-[78%] w-px bg-ink/10" />
          <div className="absolute left-[58%] top-[8%] h-[82%] w-px bg-ink/10" />
        </div>

        <div className="relative z-[1] grid gap-2.5 p-4 sm:grid-cols-3">
          {SAMPLE_OFFICES.map((point) => {
            const active =
              selectedPoint?.lat === point.lat && selectedPoint?.lon === point.lon
            return (
              <button
                key={point.label}
                type="button"
                onClick={() => onSelectPoint(point)}
                className={cn(
                  "rounded-xl border bg-surface/95 p-3.5 text-left shadow-sm transition-all duration-200 hover:border-accent/40",
                  active ? "border-accent ring-4 ring-accent/15" : "border-border",
                )}
              >
                <div className="mb-2 flex items-center gap-1.5 text-accent">
                  <MapPin className="size-4" weight="fill" />
                  <span className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">
                    {point.providerMeta?.source}
                  </span>
                </div>
                <p className="text-sm font-semibold leading-snug text-ink">{point.label}</p>
              </button>
            )
          })}
        </div>

        {selectedPoint ? (
          <div className="absolute bottom-3 left-3 right-3 rounded-xl border border-border bg-surface/95 px-3.5 py-2.5 text-xs text-ink-muted shadow-sm">
            Выбрано: <span className="font-semibold text-ink">{selectedPoint.label}</span>
            {" · "}
            {selectedPoint.lat.toFixed(5)}, {selectedPoint.lon.toFixed(5)}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3.5">
        <p className="text-xs text-ink-muted">
          Подключите API-ключ в <code className="font-mono">createMapAdapter()</code>
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            const fallback: MapPoint = SAMPLE_OFFICES[0]!
            onSelectPoint(fallback)
          }}
        >
          Выбрать демо-точку
        </Button>
      </div>
    </div>
  )
}

export { createMapAdapter, MAP_PROVIDER }
export type { MapAdapter, MapProvider } from "./types"
