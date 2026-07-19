import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

const MOBILE_MAX = 480

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

/** Phone home: full-bleed banner → registration chat. */
function MobileHomePage() {
  return (
    <div className="fixed inset-0 z-10 bg-[#b16bff]">
      <Link to="/registration" className="block w-full" aria-label="Открыть регистрацию">
        <img
          src="/mobile-index.jpg"
          alt="Открой бизнес с сервисами Альфа-Банка"
          className="block h-auto w-full"
        />
      </Link>
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
 * Home: Alfa HTML clone on ≥480px, banner CTA on phones.
 */
export function HomePage() {
  const isMobile = useIsMobileHome()
  return isMobile ? <MobileHomePage /> : <DesktopAlfaHome />
}
