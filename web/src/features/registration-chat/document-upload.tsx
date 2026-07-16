import { useRef, useState } from "react"
import { FileArrowUp, SpinnerGap } from "@phosphor-icons/react"

import {
  mapPrefillToDraft,
  PREFILL_ACCEPT,
  prefillFromDocument,
} from "@/features/registration-wizard/api/prefill"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"

import { createFounder } from "./flow"
import { useRegistrationChatStore } from "./store"

export function ChatDocumentUpload({ className }: { className?: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const applyDocumentDraft = useRegistrationChatStore((s) => s.applyDocumentDraft)

  const handleFile = async (file: File | null) => {
    if (!file || loading) return
    setError(null)
    setLoading(true)
    try {
      const response = await prefillFromDocument(file)
      const draft = mapPrefillToDraft(response, createFounder)
      const note = response.model_notes
        ? `Загружен «${response.source_filename}». ${response.model_notes}`
        : `Загружен «${response.source_filename}». Данные подставлены в сводку.`
      applyDocumentDraft(draft, note)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось обработать файл")
    } finally {
      setLoading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={loading}
        onClick={() => inputRef.current?.click()}
      >
        {loading ? (
          <SpinnerGap className="size-4 animate-spin" />
        ) : (
          <FileArrowUp className="size-4" />
        )}
        {loading ? "Читаем…" : "Загрузить файл"}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={PREFILL_ACCEPT}
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0] ?? null)
        }}
      />
      {error ? <span className="text-xs text-[#EF3124]">{error}</span> : null}
    </div>
  )
}
