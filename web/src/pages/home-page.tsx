import { ArrowRight } from "@phosphor-icons/react"
import { Link } from "react-router-dom"

import { Button } from "@/shared/components/ui/button"
import { Card } from "@/shared/components/ui/card"

export function HomePage() {
  return (
    <section className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
          Alfagent
        </p>
        <h1 className="mt-3 max-w-xl text-4xl font-bold tracking-tight text-ink md:text-5xl">
          Откройте ООО онлайн вместе с банковскими сервисами
        </h1>
        <p className="mt-4 max-w-[55ch] text-base leading-relaxed text-ink-muted">
          Несколько учредителей, юридический адрес, налоговый режим и подбор РКО.
          Мастер сохраняет прогресс на каждом шаге.
        </p>
        <div className="mt-8">
          <Button asChild size="lg">
            <Link to="/registration">
              Начать регистрацию
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3">
        {[
          {
            title: "Несколько собственников",
            text: "Динамический список учредителей с долями и сканами паспортов.",
          },
          {
            title: "Адрес на карте",
            text: "Интеграция под Яндекс Карты / ЦИАН с единым адаптером.",
          },
          {
            title: "Налоги под профиль",
            text: "ОСН, УСН или АУСН с понятным сравнением ограничений.",
          },
        ].map((item) => (
          <Card key={item.title} padding="sm" className="p-5">
            <h2 className="text-sm font-bold text-ink">{item.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">{item.text}</p>
          </Card>
        ))}
      </div>
    </section>
  )
}
