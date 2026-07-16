import { useRef, useState } from "react"
import { FileArrowUp, SpinnerGap } from "@phosphor-icons/react"

import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"

import {
  mapPrefillToDraft,
  PREFILL_ACCEPT,
  prefillFromDocument,
} from "../api/prefill"
import { useRegistrationWizardStore } from "../store"

function createFounderFromPartial(
  partial?: Partial<import("../types").FounderDraft>,
): import("../types").FounderDraft {
  return {
    id: crypto.randomUUID(),
    fullName: "",
    email: "",
    phone: "",
    inn: "",
    ownershipShare: 100,
    isDirector: true,
    passportFileName: null,
    passportFileSize: null,
    ...partial,
  }
}

export function DocumentPrefillUpload({ className }: { className?: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const applyPrefill = useRegistrationWizardStore((s) => s.applyPrefill)

  const handleFile = async (file: File | null) => {
    if (!file || loading) return
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      const response = await prefillFromDocument(file)
      const draft = mapPrefillToDraft(response, createFounderFromPartial)
      applyPrefill(draft)
      const note = response.model_notes
        ? ` ${response.model_notes}`
        : " Проверьте поля и загрузите сканы паспортов."
      setSuccess(`Данные из «${response.source_filename}» подставлены.${note}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось обработать файл")
    } finally {
      setLoading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-[#E5E7EB] bg-[#FAFBFC] p-4",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#0B1F35]">
            Заполнить из документа
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[#59606D]">
            Загрузите анкету, устав или таблицу учредителей — мы извлечём текст и
            подставим данные в форму. Форматы: TXT, DOCX, PDF, XLSX (до 10 МБ).
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => inputRef.current?.click()}
          className="shrink-0"
        >
          {loading ? (
            <SpinnerGap className="size-4 animate-spin" />
          ) : (
            <FileArrowUp className="size-4" />
          )}
          {loading ? "Читаем…" : "Загрузить файл"}
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={PREFILL_ACCEPT}
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0] ?? null)
        }}
      />

      {error ? (
        <p className="mt-3 text-xs text-[#EF3124]" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mt-3 text-xs text-[#0F7B3F]" role="status">
          {success}
        </p>
      ) : null}
    </div>
  )
}
