import { Link } from "react-router-dom"

import { AiChatWidget } from "@/features/ai-chat"
import { RegistrationWizard } from "@/features/registration-wizard"

/**
 * Split layout: registration wizard (left) + AI business assistant (right).
 * Full-viewport banking workspace — not nested under AppShell padding.
 */
export function RegistrationPage() {
  return (
    <div className="flex h-screen gap-4 overflow-hidden bg-[#F3F4F6] p-4 md:gap-6 md:p-6">
      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="flex shrink-0 items-center justify-between border-b border-[#E5E7EB] px-6 py-3 md:px-8">
          <Link
            to="/"
            className="flex items-center gap-2.5 text-sm font-bold tracking-tight text-[#0B1F35] transition-opacity hover:opacity-80"
          >
            <span className="flex size-7 items-center justify-center rounded-lg bg-[#EF3124] text-xs font-bold text-white">
              A
            </span>
            Alfagent
          </Link>
          <span className="hidden text-xs font-medium text-[#59606D] sm:inline">
            Регистрация ООО
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6 md:p-8">
          <RegistrationWizard />
        </div>
      </section>

      <div className="hidden h-full w-full max-w-md shrink-0 lg:block lg:w-96 xl:w-[26rem]">
        <AiChatWidget className="h-full" />
      </div>
    </div>
  )
}
