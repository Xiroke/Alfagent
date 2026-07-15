import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"

import { AppShell } from "@/app/layouts/app-shell"
import { HomePage } from "@/pages/home-page"
import { RegistrationPage } from "@/pages/registration-page"

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
        </Route>
        {/* Full-viewport split layout (form + AI chat), outside padded shell */}
        <Route path="registration" element={<RegistrationPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
