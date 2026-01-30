"use client"

import { Home, Users, UserPlus, LogOut } from "lucide-react"

type Screen = "home" | "doctors" | "register"

interface BottomNavProps {
  currentScreen: Screen
  onNavigate: (screen: Screen) => void
  onLogout: () => void
}

export function BottomNav({ currentScreen, onNavigate, onLogout }: BottomNavProps) {

  const navItems = [
    { id: "home" as Screen, label: "Roteiro", icon: Home },
    { id: "doctors" as Screen, label: "Médicos", icon: Users },
    { id: "register" as Screen, label: "Cadastro", icon: UserPlus },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/60 bg-white/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = currentScreen === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-1 flex-col items-center gap-1 rounded-2xl px-3 py-2 transition-all ${
                isActive
                  ? "bg-[#22c55e]/10 text-[#22c55e]"
                  : "text-gray-500 hover:bg-gray-100/50"
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? "stroke-[2.5]" : ""}`} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          )
        })}
        <button
          onClick={onLogout}
          className="flex flex-1 flex-col items-center gap-1 rounded-2xl px-3 py-2 text-gray-500 transition-all hover:bg-red-50 hover:text-red-500"
        >
          <LogOut className="h-5 w-5" />
          <span className="text-xs font-medium">Sair</span>
        </button>
      </div>
      {/* Safe area for mobile */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  )
}
