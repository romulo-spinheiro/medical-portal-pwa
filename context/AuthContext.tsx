"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

interface AuthContextType {
    user: User | null
    isLoading: boolean
    login: (email: string, password: string) => Promise<{ error: string | null }>
    signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>
    logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        let mounted = true
        let authTimeout: NodeJS.Timeout

        const initializeAuth = async () => {
            try {
                setIsLoading(true)

                // Safety timeout to prevent infinite loading
                authTimeout = setTimeout(() => {
                    if (mounted && isLoading) {
                        console.warn("[Auth] Initialization timeout - forcing loading state to false")
                        setIsLoading(false)
                    }
                }, 3000)

                const {
                    data: { user: currentUser },
                    error,
                } = await supabase.auth.getUser()

                if (error) {
                    console.log("[Auth] getUser error:", error.message)
                    if (mounted) setUser(null)
                } else if (mounted) {
                    setUser(currentUser)
                }
            } catch (err) {
                console.log("[Auth] initializeAuth unexpected error:", err)
                if (mounted) setUser(null)
            } finally {
                if (mounted) {
                    clearTimeout(authTimeout)
                    setIsLoading(false)
                }
            }
        }

        initializeAuth()

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return

            if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
                setUser(session?.user ?? null)
                setIsLoading(false)
            } else if (event === "SIGNED_OUT") {
                setUser(null)
                setIsLoading(false)
            } else if (event === "INITIAL_SESSION") {
                setIsLoading(false)
            }
        })

        return () => {
            mounted = false
            if (authTimeout) clearTimeout(authTimeout)
            subscription.unsubscribe()
        }
    }, [supabase])

    const login = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        return { error: error?.message ?? null }
    }

    const signUp = async (email: string, password: string, name: string) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                    avatar_url: ''
                },
                emailRedirectTo: `${window.location.origin}/`,
            },
        })
        return { error: error?.message ?? null }
    }

    const logout = async () => {
        await supabase.auth.signOut()
        setUser(null)
    }

    return (
        <AuthContext.Provider value={{ user, isLoading, login, signUp, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider")
    }
    return context
}
