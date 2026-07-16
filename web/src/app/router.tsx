import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"

import { HomePage } from "@/pages/home-page"
import { RegistrationPage } from "@/pages/registration-page"

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Full-bleed Alfa-style landing (from main_page.html) */}
        <Route index element={<HomePage />} />
        <Route path="registration" element={<RegistrationPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
