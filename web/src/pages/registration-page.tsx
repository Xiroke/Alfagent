import { useEffect } from "react"
import { Link } from "react-router-dom"

import {
  RegistrationInterviewChat,
  RegistrationSummary,
  useRegistrationChatStore,
} from "@/features/registration-chat"

/**
 * Registration as a chat interview; summary screen when complete.
 * Document upload remains available in chat header and on summary.
 */
export function RegistrationPage() {
  const phase = useRegistrationChatStore((s) => s.phase)

  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const root = document.getElementById("root")

    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyOverscroll: body.style.overscrollBehavior,
      rootOverflow: root?.style.overflow ?? "",
      rootHeight: root?.style.height ?? "",
    }

    html.style.overflow = "hidden"
    body.style.overflow = "hidden"
    body.style.overscrollBehavior = "none"
    if (root) {
      root.style.overflow = "hidden"
      root.style.height = "100%"
    }

    return () => {
      html.style.overflow = prev.htmlOverflow
      body.style.overflow = prev.bodyOverflow
      body.style.overscrollBehavior = prev.bodyOverscroll
      if (root) {
        root.style.overflow = prev.rootOverflow
        root.style.height = prev.rootHeight
      }
    }
  }, [])

  return (
    <div className="fixed inset-0 z-10 flex flex-col overflow-hidden bg-[#F3F4F6] p-4 md:p-6">
      <header className="mb-4 flex shrink-0 items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2.5 text-sm font-bold tracking-tight text-[#0B1F35] transition-opacity hover:opacity-80"
        >
          <span className="flex size-7 items-center justify-center rounded-lg bg-[#EF3124] text-xs font-bold text-white">
            A
          </span>
          Alfagent
        </Link>
        <span className="text-xs font-medium text-[#59606D]">Регистрация ООО</span>
      </header>

      {phase === "interview" ? (
        <div className="mx-auto min-h-0 w-full max-w-3xl flex-1">
          <RegistrationInterviewChat className="h-full" />
        </div>
      ) : (
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-2xl bg-white p-6 shadow-sm md:p-8"
          style={{ overflowAnchor: "none" }}
        >
          <RegistrationSummary />
        </div>
      )}
    </div>
  )
}
