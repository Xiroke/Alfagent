import { useState } from "react"
import { ArrowCounterClockwise, DownloadSimple } from "@phosphor-icons/react"

import { downloadProtocolFromDraft } from "@/features/registration-wizard/api/protocol"
import { Button } from "@/shared/components/ui/button"
import { Separator } from "@/shared/components/ui/separator"

import { ChatDocumentUpload } from "./document-upload"
import { draftFromState } from "./flow"
import { useRegistrationChatStore } from "./store"

const TAX_LABEL: Record<string, string> = {
  osn: "ОСН",
  usn: "УСН",
  ausn: "АУСН",
}

export function RegistrationSummary() {
  const state = useRegistrationChatStore()
  const draft = draftFromState(state)
  const reset = useRegistrationChatStore((s) => s.reset)
  const backToInterview = useRegistrationChatStore((s) => s.backToInterview)
  const summaryPreview = useRegistrationChatStore((s) => s.summaryPreview)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  const handleDownloadProtocol = async () => {
    setDownloading(true)
    setDownloadError(null)
    try {
      await downloadProtocolFromDraft(draft)
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Не удалось скачать документ")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#EF3124]">
            {summaryPreview ? "Предпросмотр черновика" : "Черновик заявки"}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#0B1F35]">
            Сводка регистрации ООО
          </h1>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-[#59606D]">
            {summaryPreview
              ? "Покажите, что уже собрано. Можно вернуться в диалог и продолжить с того же вопроса."
              : "Проверьте данные. Можно загрузить документ заново или пройти диалог с нуля."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={downloading}
            onClick={() => void handleDownloadProtocol()}
          >
            <DownloadSimple className="size-4" />
            {downloading ? "Формируем…" : "Скачать протокол"}
          </Button>
          <ChatDocumentUpload />
          <Button type="button" variant="outline" size="sm" onClick={backToInterview}>
            {summaryPreview ? "Вернуться к диалогу" : "Продолжить диалог"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={reset}>
            <ArrowCounterClockwise className="size-4" />
            Сначала
          </Button>
        </div>
      </div>

      {downloadError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {downloadError}
        </p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[#0B1F35]">Компания</h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          <Item label="Полное наименование" value={draft.company.name || "—"} />
          <Item label="Краткое" value={draft.company.shortName || "—"} />
          <Item
            label="ОКВЭД"
            value={draft.company.okvedCodes.join(", ") || "—"}
          />
          <Item
            label="Уставный капитал"
            value={`${draft.company.authorizedCapital.toLocaleString("ru-RU")} ₽`}
          />
        </dl>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[#0B1F35]">Учредители</h2>
        {draft.founders.map((f, i) => (
          <div
            key={f.id}
            className="rounded-2xl border border-[#E5E7EB] bg-[#FAFBFC] p-4"
          >
            <p className="mb-3 text-sm font-semibold text-[#0B1F35]">
              Собственник {i + 1}
              {f.isDirector ? " · директор" : ""}
            </p>
            <dl className="grid gap-3 sm:grid-cols-2">
              <Item label="ФИО" value={f.fullName || "—"} />
              <Item label="Email" value={f.email || "—"} />
              <Item label="Телефон" value={f.phone || "—"} />
              <Item label="ИНН" value={f.inn || "—"} />
              <Item label="Доля" value={`${f.ownershipShare}%`} />
            </dl>
          </div>
        ))}
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[#0B1F35]">Адрес</h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          <Item
            label="Тип"
            value={draft.address.addressType === "home" ? "Домашний" : "Аренда"}
          />
          <Item label="Полный адрес" value={draft.address.fullAddress || "—"} />
          <Item label="Регион" value={draft.address.region || "—"} />
          <Item label="Город" value={draft.address.city || "—"} />
          <Item label="Улица" value={draft.address.street || "—"} />
          <Item label="Дом" value={draft.address.building || "—"} />
          <Item label="Квартира / офис" value={draft.address.apartment || "—"} />
          <Item label="Индекс" value={draft.address.postalCode || "—"} />
        </dl>
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[#0B1F35]">Налоги</h2>
        <Item
          label="Режим"
          value={TAX_LABEL[draft.tax.taxRegime] ?? draft.tax.taxRegime}
        />
      </section>

      <div className="rounded-xl border border-[#E5E7EB] bg-[#F3F4F6] px-4 py-3 text-sm text-[#59606D]">
        Это черновик. Отправка в ФНС и банк будет на следующем этапе продукта.
      </div>
    </div>
  )
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-[#8A919C]">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-[#0B1F35]">{value}</dd>
    </div>
  )
}
