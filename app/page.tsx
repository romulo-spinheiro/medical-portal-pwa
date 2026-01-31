"use client"

import { useState, useEffect } from "react"
import { useApp } from "@/context/app-context"
import { useAuth } from "@/context/AuthContext"
import { HomeScreen } from "@/components/home-screen"
import { DoctorsScreen } from "@/components/doctors-screen"
import { RegisterScreen } from "@/components/register-screen"
import { BottomNav } from "@/components/bottom-nav"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"

type Screen = "home" | "doctors" | "register"

export default function App() {
  const { user, isLoading, logout } = useAuth()
  const { loadData } = useApp()
  const [currentScreen, setCurrentScreen] = useState<Screen>("home")
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/auth")
    }
  }, [user, isLoading, router])

  const handleLogout = async () => {
    await logout()
    router.replace("/auth")
  }

  // Add test commit
  // Show loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-[#22c55e]" />
          <p className="text-gray-500 font-medium">Sincronizando portal...</p>
        </div>
      </div>
    )
  }

  // Guard: if user is still null after loading, let the useEffect handle redirect
  if (!user) return null

  return (
    <div className="mx-auto max-w-lg min-h-screen bg-transparent">
      {/* Current Screen */}
      <div className="pb-24">
        {currentScreen === "home" && <HomeScreen />}
        {currentScreen === "doctors" && <DoctorsScreen />}
        {currentScreen === "register" && (
          <div className="pt-4">
            <Link href="/cadastro" className="block p-8 text-center text-gray-500 italic">
              Redirecionando para página de cadastro...
            </Link>
            {/* Note: In this version, we probably want to just redirect or use the component */}
            {/* I'll use the existing RegisterScreen component if they want to keep the SPA feel */}
            <RegisterScreen />
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav
        currentScreen={currentScreen}
        onNavigate={(screen) => {
          if (screen === "register") {
            router.push("/cadastro")
          } else {
            setCurrentScreen(screen)
          }
        }}
        onLogout={handleLogout}
      />
    </div>
  )
}
