"use client"

import React from "react"
import { useState } from "react"
import { useApp } from "@/context/app-context"
import { User, Lock, Stethoscope, Mail, UserPlus, LogIn } from "lucide-react"

export function LoginScreen() {
  const { login, signUp } = useApp()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (isSignUp && !name.trim()) {
      setError("Por favor, informe seu nome")
      return
    }

    setIsLoading(true)

    try {
      if (isSignUp) {
        const result = await signUp(email, password, name)
        if (result.error) {
          setError(result.error)
        } else {
          setSuccess("Conta criada! Verifique seu email para confirmar o cadastro.")
          setEmail("")
          setPassword("")
          setName("")
        }
      } else {
        const result = await login(email, password)
        if (result.error) {
          setError("Email ou senha inválidos")
        }
      }
    } catch (err) {
      console.log("[v0] Login/signup error:", err)
      setError("Ocorreu um erro. Tente novamente.")
    } finally {
      // CRITICAL: Always unlock the UI
      setIsLoading(false)
    }
  }

  const toggleMode = () => {
    setIsSignUp(!isSignUp)
    setError("")
    setSuccess("")
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="rounded-3xl border border-white/60 bg-white/40 p-8 shadow-lg backdrop-blur-xl">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#22c55e] shadow-lg">
              <Stethoscope className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Portal Médico</h1>
            <p className="mt-1 text-sm text-gray-500">
              {isSignUp ? "Crie sua conta" : "Faça login para continuar"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Input (Sign Up only) */}
            {isSignUp && (
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-2xl border border-white/60 bg-white/50 py-3 pl-12 pr-4 text-gray-800 placeholder-gray-400 backdrop-blur-sm transition-all focus:border-[#22c55e]/50 focus:bg-white/70 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/20"
                  required={isSignUp}
                />
              </div>
            )}

            {/* Email Input */}
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-white/60 bg-white/50 py-3 pl-12 pr-4 text-gray-800 placeholder-gray-400 backdrop-blur-sm transition-all focus:border-[#22c55e]/50 focus:bg-white/70 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/20"
                required
              />
            </div>

            {/* Password Input */}
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-white/60 bg-white/50 py-3 pl-12 pr-4 text-gray-800 placeholder-gray-400 backdrop-blur-sm transition-all focus:border-[#22c55e]/50 focus:bg-white/70 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/20"
                required
                minLength={6}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-xl bg-red-50/80 p-3 text-center text-sm text-red-600 backdrop-blur-sm">
                {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="rounded-xl bg-green-50/80 p-3 text-center text-sm text-green-600 backdrop-blur-sm">
                {success}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#22c55e] py-3 font-semibold text-white shadow-lg transition-all hover:bg-[#16a34a] hover:shadow-xl active:scale-[0.98] disabled:opacity-70"
            >
              {isLoading ? (
                isSignUp ? "Criando conta..." : "Entrando..."
              ) : (
                <>
                  {isSignUp ? <UserPlus className="h-5 w-5" /> : <LogIn className="h-5 w-5" />}
                  {isSignUp ? "Criar Conta" : "Entrar"}
                </>
              )}
            </button>
          </form>

          {/* Toggle Mode */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              {isSignUp ? "Já tem uma conta?" : "Não tem uma conta?"}
            </p>
            <button
              onClick={toggleMode}
              className="mt-1 text-sm font-semibold text-[#22c55e] transition-colors hover:text-[#16a34a]"
            >
              {isSignUp ? "Fazer login" : "Criar conta"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
