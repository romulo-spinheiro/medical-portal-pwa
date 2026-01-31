import React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { AppProvider } from "@/context/app-context"
import { AuthProvider } from "@/context/AuthContext"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Portal Médico",
  description: "Portal Médico - Gerencie seus médicos e roteiros",
  generator: "v0.app",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-512x512.png",
    apple: "/apple-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Portal Médico",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#22c55e",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} antialiased`}>
        <AuthProvider>
          <AppProvider>
            <main className="min-h-screen bg-gradient-to-br from-[#dcfce7] via-[#fce7f3] to-[#e0f2fe]">
              {children}
            </main>
          </AppProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
