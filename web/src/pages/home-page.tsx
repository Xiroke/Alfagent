/**
 * Home = exact visual clone of `main_page.html` (alfabank.ru dump + its CDN CSS).
 * Served as static HTML so hashed Alfa classes render correctly.
 */
export function HomePage() {
  return (
    <iframe
      title="Alfagent"
      src="/alfa-home.html"
      className="fixed inset-0 z-10 h-[100dvh] w-full border-0 bg-[#121212]"
    />
  )
}
