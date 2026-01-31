"use client"

import React, { useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { User, Lock, Stethoscope, Mail, UserPlus, LogIn, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

export default function AuthPage() {
    const { login, signUp, user } = useAuth()
    const router = useRouter()

    const [isSignUp, setIsSignUp] = useState(false)
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [name, setName] = useState("")
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    React.useEffect(() => {
        if (user) {
            router.replace("/")
        }
    }, [user, router])

    if (user) {
        return null
    }

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
                    setError("Email ou senha inválidos. Verifique suas credenciais.")
                } else {
                    router.push("/")
                }
            }
        } catch (err: any) {
            console.error("[Auth] Submit error:", err)
            setError("Ocorreu um erro inesperado. Tente novamente.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#dcfce7] via-[#fce7f3] to-[#e0f2fe] p-4">
            <div className="w-full max-w-sm">
                <div className="rounded-3xl border border-white/60 bg-white/40 p-8 shadow-lg backdrop-blur-xl">
                    <div className="mb-8 flex flex-col items-center">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#22c55e] shadow-lg">
                            <Stethoscope className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-800">Portal Médico</h1>
                        <p className="mt-1 text-sm text-gray-500">
                            {isSignUp ? "Crie sua conta agora" : "Faça login para continuar"}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {isSignUp && (
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                                    <User className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Seu nome completo"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full rounded-2xl border border-white/60 bg-white/50 py-3 pl-12 pr-4 text-gray-800 placeholder-gray-400 backdrop-blur-sm transition-all focus:border-[#22c55e]/50 focus:bg-white/70 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/20"
                                    required={isSignUp}
                                />
                            </div>
                        )}

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

                        {error && (
                            <div className="rounded-xl bg-red-50/80 p-3 text-center text-sm text-red-600 backdrop-blur-sm">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="rounded-xl bg-green-50/80 p-3 text-center text-sm text-green-600 backdrop-blur-sm">
                                {success}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#22c55e] py-3 font-semibold text-white shadow-lg transition-all hover:bg-[#16a34a] hover:shadow-xl active:scale-[0.98] disabled:opacity-70"
                        >
                            {isLoading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <>
                                    {isSignUp ? <UserPlus className="h-5 w-5" /> : <LogIn className="h-5 w-5" />}
                                    {isSignUp ? "Criar Conta" : "Entrar"}
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-500">
                            {isSignUp ? "Já tem uma conta?" : "Não tem uma conta?"}
                        </p>
                        <button
                            onClick={() => setIsSignUp(!isSignUp)}
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
