import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowRight, Buildings, ChatCircleText, FileText } from "@phosphor-icons/react"

import { cn } from "@/shared/lib/utils"

const MOBILE_MAX = 480

const STEPS = [
  {
    n: "01",
    title: "Диалог или документ",
    text: "Ответьте на вопросы ассистента или загрузите анкету — данные подставятся сами.",
  },
  {
    n: "02",
    title: "Проверка черновика",
    text: "Сводка по компании, учредителям, адресу и налоговому режиму в одном месте.",
  },
  {
    n: "03",
    title: "Протокол и дальше",
    text: "Скачайте протокол учредителей и продолжите путь к счёту в Альфа-Банке.",
  },
] as const

const FEATURES = [
  {
    title: "Регистрация ООО",
    text: "Несколько учредителей, доли, адрес и налоги — без бумажной суеты.",
    href: "/registration",
    tone: "accent" as const,
    icon: Buildings,
  },
  {
    title: "Вопросы нейросети",
    text: "В диалоге напишите «альфа …» — спросите про УСН, адрес или Сколково.",
    href: "/registration",
    tone: "ink" as const,
    icon: ChatCircleText,
  },
  {
    title: "Документы",
    text: "Черновик заявки и протокол общего собрания — сразу из собранных данных.",
    href: "/registration",
    tone: "muted" as const,
    icon: FileText,
  },
] as const

function useIsMobileHome() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < MOBILE_MAX : false,
  )

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_MAX - 1}px)`)
    const apply = () => setIsMobile(mq.matches)
    apply()
    mq.addEventListener("change", apply)
    return () => mq.removeEventListener("change", apply)
  }, [])

  return isMobile
}

/** Phone home: banner + previous sections below. */
function MobileHomePage() {
  return (
    <div className="min-h-[100dvh] bg-[#b16bff] text-ink">
      <Link
        to="/registration"
        className="block w-full"
        aria-label="Открыть регистрацию"
      >
        <img
          src="/mobile-index.jpg"
          alt="Открой бизнес с сервисами Альфа-Банка"
          className="block h-auto w-full"
        />
      </Link>

      <section id="how" className="bg-canvas px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="max-w-lg text-2xl font-bold tracking-tight text-ink">
            Три шага до готового черновика
          </h2>
          <ol className="mt-10 grid gap-0">
            {STEPS.map((step, i) => (
              <li
                key={step.n}
                className={cn(
                  "border-border py-6",
                  i < STEPS.length - 1 && "border-b",
                )}
              >
                <p className="font-mono text-xs font-medium tracking-wider text-ink-subtle">
                  {step.n}
                </p>
                <h3 className="mt-3 text-lg font-semibold tracking-tight text-ink">
                  {step.title}
                </h3>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">
                  {step.text}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="services" className="bg-canvas px-4 pb-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="max-w-md text-2xl font-bold tracking-tight text-ink">
            Всё для старта компании
          </h2>
          <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-ink-muted">
            Один сервис вместо десятка вкладок и консультаций.
          </p>

          <div className="mt-10 grid gap-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon
              return (
                <Link
                  key={feature.title}
                  to={feature.href}
                  className="group flex min-h-[180px] flex-col justify-between rounded-2xl border border-border bg-surface p-6 shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.99]"
                >
                  <span
                    className={cn(
                      "flex size-10 items-center justify-center rounded-xl",
                      feature.tone === "accent" && "bg-accent-soft text-accent",
                      feature.tone === "ink" && "bg-[#121212]/8 text-ink",
                      feature.tone === "muted" && "bg-[#B36BFF]/15 text-[#7A3DB8]",
                    )}
                  >
                    <Icon className="size-6" weight="duotone" />
                  </span>
                  <div className="mt-6">
                    <h3 className="text-xl font-bold tracking-tight text-ink">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">
                      {feature.text}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
                      Перейти
                      <ArrowRight
                        className="size-4 transition-transform duration-300 group-hover:translate-x-0.5"
                        weight="bold"
                      />
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      <section className="bg-canvas px-4 pb-16">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 rounded-3xl bg-ink px-6 py-10">
          <div className="max-w-lg">
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Готовы зарегистрировать ООО?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/65">
              Начните диалог — займёт несколько минут.
            </p>
          </div>
          <Link
            to="/registration"
            className="inline-flex h-12 shrink-0 items-center gap-2.5 rounded-xl bg-accent px-6 text-sm font-semibold text-white transition-all hover:bg-accent-hover active:scale-[0.98]"
          >
            К регистрации
            <span className="flex size-7 items-center justify-center rounded-full bg-white/15">
              <ArrowRight className="size-3.5" weight="bold" />
            </span>
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#121212] px-4 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-lg bg-accent text-xs font-bold text-white">
              A
            </span>
            <span className="text-sm font-semibold text-white">Alfagent</span>
          </div>
          <p className="text-xs text-white/45">
            Сервис для открытия бизнеса с продуктами Альфа-Банка
          </p>
        </div>
      </footer>
    </div>
  )
}

function DesktopAlfaHome() {
  return (
    <iframe
      title="Alfagent"
      src="/alfa-home.html"
      className="fixed inset-0 z-10 h-[100dvh] w-full border-0 bg-[#121212]"
    />
  )
}

/**
 * Home: Alfa HTML clone on ≥480px, banner + sections on phones.
 */
export function HomePage() {
  const isMobile = useIsMobileHome()
  return isMobile ? <MobileHomePage /> : <DesktopAlfaHome />
}
