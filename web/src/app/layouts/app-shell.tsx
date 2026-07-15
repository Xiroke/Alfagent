import { NavLink, Outlet } from "react-router-dom"

import { cn } from "@/shared/lib/utils"

const NAV = [
  { to: "/", label: "Обзор" },
  { to: "/registration", label: "Регистрация ООО" },
]

export function AppShell() {
  return (
    <div className="min-h-[100dvh] bg-canvas">
      <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur-md">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between gap-6 px-4 md:px-6">
          <NavLink to="/" className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
              A
            </span>
            <span className="text-base font-bold tracking-tight text-ink">Alfagent</span>
          </NavLink>
          <nav className="flex items-center gap-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "rounded-xl px-3.5 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent-soft text-accent-fg"
                      : "text-ink-muted hover:bg-surface hover:text-ink",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
        <Outlet />
      </main>
    </div>
  )
}
