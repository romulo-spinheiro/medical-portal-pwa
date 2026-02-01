"use client"

import React, { Suspense, useState, useEffect, useCallback } from "react"
import { useApp } from "@/context/app-context"
import { useAuth } from "@/context/AuthContext"
import { Plus, Trash2, CheckCircle, User, Stethoscope, Loader2, ArrowLeft, AlertCircle } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

// UI Components
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const DAYS_OF_WEEK = [
    { short: "Seg", value: "segunda" },
    { short: "Ter", value: "terça" },
    { short: "Qua", value: "quarta" },
    { short: "Qui", value: "quinta" },
    { short: "Sex", value: "sexta" },
    { short: "Sab", value: "sábado" },
]

interface LocationSlot {
    id: string
    place_name: string
    neighborhood_id: number | null
    neighborhood_name: string
    days_of_week: string[]
    start_time: string
    end_time: string
}

function CadastroContent() {
    const { addSpecialty, addNeighborhood, loadData } = useApp()
    const { user, isLoading: isAuthLoading } = useAuth()
    const router = useRouter()
    const searchParams = useSearchParams()
    const doctorId = searchParams.get("id")
    const supabase = createClient()

    // =========================================================================
    // LOCAL DATA STATES (Carregados separadamente, sem depender do contexto)
    // =========================================================================
    const [allSpecialties, setAllSpecialties] = useState<any[]>([])
    const [allNeighborhoods, setAllNeighborhoods] = useState<any[]>([])

    // Form States
    const [name, setName] = useState("")
    const [crm, setCrm] = useState("")
    const [phone, setPhone] = useState("")
    const [specialtyId, setSpecialtyId] = useState<string>("")
    const [avatarUrl, setAvatarUrl] = useState<string>("")

    // Locations State
    const [locations, setLocations] = useState<LocationSlot[]>([
        { id: "new-1", place_name: "", neighborhood_id: null, neighborhood_name: "", days_of_week: [], start_time: "", end_time: "" },
    ])

    // Modal States
    const [isSpecialtyModalOpen, setIsSpecialtyModalOpen] = useState(false)
    const [newSpecialtyName, setNewSpecialtyName] = useState("")
    const [isNeighborhoodModalOpen, setIsNeighborhoodModalOpen] = useState(false)
    const [newNeighborhoodName, setNewNeighborhoodName] = useState("")

    // UI States
    const [success, setSuccess] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [isLoadingData, setIsLoadingData] = useState(true)

    // =========================================================================
    // PHONE MASK
    // =========================================================================
    const formatPhone = (val: string): string => {
        if (!val) return ""
        const digits = val.replace(/\D/g, "").slice(0, 11)
        if (digits.length === 0) return ""
        if (digits.length <= 2) return `(${digits}`
        if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
        if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
    }

    const handlePhoneInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPhone(formatPhone(e.target.value))
    }

    // =========================================================================
    // FETCH ALL DATA - Strategy: Completely Separate Queries (NO JOINS)
    // =========================================================================
    const fetchAllData = useCallback(async () => {
        setIsLoadingData(true)
        setErrors({})

        try {
            console.log("[fetchAllData] Starting data load...")

            // =====================================================================
            // QUERY 1: Load ALL specialties (simple, no joins)
            // =====================================================================
            const { data: specialtiesData, error: specialtiesError } = await supabase
                .from("specialties")
                .select("id, name")
                .order("name")

            if (specialtiesError) {
                console.error("[fetchAllData] Specialties error:", specialtiesError)
            } else {
                setAllSpecialties(specialtiesData || [])
                console.log("[fetchAllData] Specialties loaded:", specialtiesData?.length)
            }

            // =====================================================================
            // QUERY 2: Load ALL neighborhoods (simple, no joins)
            // =====================================================================
            const { data: neighborhoodsData, error: neighborhoodsError } = await supabase
                .from("neighborhoods")
                .select("id, name")
                .order("name")

            if (neighborhoodsError) {
                console.error("[fetchAllData] Neighborhoods error:", neighborhoodsError)
            } else {
                setAllNeighborhoods(neighborhoodsData || [])
                console.log("[fetchAllData] Neighborhoods loaded:", neighborhoodsData?.length)
            }

            // =====================================================================
            // QUERY 3: Load doctor data (if editing)
            // =====================================================================
            if (doctorId) {
                console.log("[fetchAllData] Loading doctor:", doctorId)

                const { data: doctorData, error: doctorError } = await supabase
                    .from("doctors")
                    .select("id, name, crm, phone, specialty_id, avatar_url")
                    .eq("id", doctorId)
                    .single()

                if (doctorError) {
                    console.error("[fetchAllData] Doctor error:", doctorError)
                    setErrors({ submit: "Erro ao carregar médico: " + doctorError.message })
                } else if (doctorData) {
                    console.log("[fetchAllData] Doctor loaded:", doctorData)

                    // Populate form fields
                    setName(doctorData.name || "")
                    setCrm(doctorData.crm || "")
                    setPhone(formatPhone(doctorData.phone || ""))
                    setSpecialtyId(doctorData.specialty_id?.toString() || "")
                    setAvatarUrl(doctorData.avatar_url || "")

                    // =============================================================
                    // QUERY 4: Load schedules for this doctor (simple, no joins)
                    // =============================================================
                    const { data: schedulesData, error: schedulesError } = await supabase
                        .from("schedules")
                        .select("id, place_name, neighborhood_id, day_of_week, start_time, end_time")
                        .eq("doctor_id", doctorId)

                    if (schedulesError) {
                        console.error("[fetchAllData] Schedules error:", schedulesError)
                    } else if (schedulesData && schedulesData.length > 0) {
                        console.log("[fetchAllData] Schedules loaded:", schedulesData.length)

                        // Group schedules by location+time (merge days)
                        const grouped: Record<string, any> = {}

                        schedulesData.forEach((s: any) => {
                            const key = `${s.place_name || ""}-${s.neighborhood_id || ""}-${s.start_time || ""}-${s.end_time || ""}`
                            if (!grouped[key]) {
                                // Find neighborhood name from local array
                                const hood = (neighborhoodsData || []).find((n: any) => n.id === s.neighborhood_id)
                                grouped[key] = {
                                    place_name: s.place_name || "",
                                    neighborhood_id: s.neighborhood_id,
                                    neighborhood_name: hood?.name || "",
                                    start_time: s.start_time?.slice(0, 5) || "",
                                    end_time: s.end_time?.slice(0, 5) || "",
                                    days: [s.day_of_week]
                                }
                            } else if (!grouped[key].days.includes(s.day_of_week)) {
                                grouped[key].days.push(s.day_of_week)
                            }
                        })

                        // Convert to array for state
                        const formattedLocations = Object.values(grouped).map((g: any, i: number) => ({
                            id: `loc-${i}-${Date.now()}`,
                            place_name: g.place_name,
                            neighborhood_id: g.neighborhood_id,
                            neighborhood_name: g.neighborhood_name,
                            days_of_week: g.days,
                            start_time: g.start_time,
                            end_time: g.end_time,
                        }))

                        if (formattedLocations.length > 0) {
                            setLocations(formattedLocations)
                            console.log("[fetchAllData] Locations set:", formattedLocations)
                        }
                    }
                }
            }

        } catch (err: any) {
            console.error("[fetchAllData] Unexpected error:", err)
            setErrors({ submit: "Erro inesperado: " + err.message })
        } finally {
            setIsLoadingData(false)
        }
    }, [doctorId, supabase])

    // Run fetch on mount
    useEffect(() => {
        fetchAllData()
    }, [fetchAllData])

    // =========================================================================
    // LOCATION HANDLERS
    // =========================================================================
    const updateLocation = (index: number, field: keyof LocationSlot, value: any) => {
        setLocations(prev => {
            const updated = [...prev]
            updated[index] = { ...updated[index], [field]: value }
            return updated
        })
    }

    const toggleDay = (index: number, day: string) => {
        setLocations(prev => {
            const updated = [...prev]
            const currentDays = updated[index].days_of_week
            updated[index] = {
                ...updated[index],
                days_of_week: currentDays.includes(day)
                    ? currentDays.filter(d => d !== day)
                    : [...currentDays, day]
            }
            return updated
        })
    }

    const addLocation = () => {
        setLocations(prev => [
            ...prev,
            { id: `new-${Date.now()}`, place_name: "", neighborhood_id: null, neighborhood_name: "", days_of_week: [], start_time: "", end_time: "" }
        ])
    }

    const removeLocation = (index: number) => {
        setLocations(prev => {
            if (prev.length <= 1) return prev
            return prev.filter((_, i) => i !== index)
        })
    }

    // =========================================================================
    // MODAL HANDLERS
    // =========================================================================
    const handleAddSpecialty = async () => {
        if (!newSpecialtyName.trim()) return
        const { data, error } = await addSpecialty(newSpecialtyName.trim())
        if (!error && data) {
            // Add to local array
            setAllSpecialties(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
            setNewSpecialtyName("")
            setIsSpecialtyModalOpen(false)
        } else {
            alert("Erro ao adicionar especialidade: " + error)
        }
    }

    const handleAddNeighborhood = async () => {
        if (!newNeighborhoodName.trim()) return
        const { data, error } = await addNeighborhood(newNeighborhoodName.trim())
        if (!error && data) {
            // Add to local array
            setAllNeighborhoods(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
            setNewNeighborhoodName("")
            setIsNeighborhoodModalOpen(false)
        } else {
            alert("Erro ao adicionar bairro: " + error)
        }
    }

    // =========================================================================
    // SAVE DOCTOR - NUCLEAR STRATEGY (Update -> Delete All -> Insert New)
    // =========================================================================
    const saveDoctor = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user || isSubmitting) return

        setIsSubmitting(true)
        setErrors({})
        setSuccess(false)

        // Clean phone (only digits)
        const cleanPhone = phone.replace(/\D/g, "")

        // FORCE RE-READ ID FROM URL TO AVOID CLOSURE STALENESS
        const currentParams = new URLSearchParams(window.location.search)
        const currentDoctorId = currentParams.get("id")

        console.log("[saveDoctor] START. ParamsID:", currentDoctorId, "BaseID:", doctorId)
        console.log("[saveDoctor] Payload PRE:", { name, crm, phone: cleanPhone })

        try {
            let finalDoctorId: string | null = currentDoctorId || doctorId // Prefer fresh ID

            // =====================================================================
            // STEP 1: UPDATE or INSERT Doctor
            // =====================================================================
            const doctorPayload = {
                name: name.trim(),
                crm: crm.trim(),
                phone: cleanPhone, // <<< PHONE EXPLICITLY INCLUDED
                specialty_id: specialtyId ? parseInt(specialtyId) : null,
                avatar_url: avatarUrl || name.trim().charAt(0).toUpperCase()
            }

            if (finalDoctorId) {
                // EDIT MODE: UPDATE existing doctor
                const { error: updateError } = await supabase
                    .from("doctors")
                    .update(doctorPayload)
                    .eq("id", finalDoctorId)

                if (updateError) {
                    console.error("[saveDoctor] UPDATE ERROR:", updateError)
                    throw new Error("Falha ao atualizar: " + updateError.message)
                }
            } else {
                // CREATE MODE: INSERT new doctor
                console.log("[saveDoctor] Data for INSERT:", { ...doctorPayload, user_id: user.id })

                const { data: newDoctor, error: insertError } = await supabase
                    .from("doctors")
                    .insert({ ...doctorPayload, user_id: user.id })
                    .select("id")
                    .single()

                if (insertError) {
                    console.error("[saveDoctor] INSERT ERROR:", JSON.stringify(insertError, null, 2))
                    throw new Error("Falha ao criar: " + (insertError.message || JSON.stringify(insertError)))
                }
                finalDoctorId = newDoctor.id
                console.log("[saveDoctor] Created ID:", finalDoctorId)
            }

            // =====================================================================
            // STEP 2: DELETE ALL existing schedules (NUCLEAR)
            // =====================================================================
            if (finalDoctorId) {
                const { error: deleteError } = await supabase
                    .from("schedules")
                    .delete()
                    .eq("doctor_id", parseInt(finalDoctorId))

                if (deleteError) {
                    console.error("[saveDoctor] DELETE ERROR:", deleteError)
                    throw new Error("Falha ao limpar escalas: " + deleteError.message)
                }
            }

            // =====================================================================
            // STEP 3: INSERT new schedules from current state
            // =====================================================================
            const schedulesToInsert = locations
                .flatMap(loc =>
                    loc.days_of_week.map(day => ({
                        doctor_id: finalDoctorId,
                        user_id: user.id, // Ensure ownership
                        place_name: loc.place_name.trim(),
                        neighborhood: loc.neighborhood_name, // Provide fallback text
                        neighborhood_id: loc.neighborhood_id ? Number(loc.neighborhood_id) : null,
                        day_of_week: day,
                        start_time: loc.start_time,
                        end_time: loc.end_time
                    }))
                )
                .filter(row =>
                    row.place_name &&
                    row.neighborhood_id &&
                    row.day_of_week &&
                    row.start_time &&
                    row.end_time
                )

            if (schedulesToInsert.length > 0) {
                const { error: insertSchedulesError } = await supabase
                    .from("schedules")
                    .insert(schedulesToInsert)

                if (insertSchedulesError) {
                    console.error("[saveDoctor] INSERT SCHEDULES ERROR:", JSON.stringify(insertSchedulesError, null, 2))
                    throw new Error("Falha ao salvar escalas: " + (insertSchedulesError.message || JSON.stringify(insertSchedulesError)))
                }
            }

            // =====================================================================
            // SUCCESS
            // =====================================================================

            // Force reload of global context data before redirecting
            await loadData()

            setSuccess(true)

            setTimeout(() => {
                router.push("/")
                router.refresh()
            }, 1000)

        } catch (err: any) {
            console.error("[saveDoctor] FINAL ERROR:", err)
            setErrors({ submit: err.message || "Erro ao salvar" })
        } finally {
            setIsSubmitting(false)
        }
    }

    // =========================================================================
    // LOADING STATE
    // =========================================================================
    if (isAuthLoading || isLoadingData) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <Loader2 className="h-10 w-10 animate-spin text-[#22c55e]" />
            </div>
        )
    }

    // =========================================================================
    // RENDER
    // =========================================================================
    return (
        <div className="min-h-screen bg-gray-50/50 pb-24">
            {/* Header */}
            <div className="sticky top-0 z-40 border-b border-white/40 bg-white/30 px-4 pb-4 pt-6 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                    <Link href="/" className="rounded-full bg-white/50 p-2 text-gray-500 border border-white/40">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-medium text-gray-800 tracking-tight">
                            {doctorId ? "Editar Profissional" : "Novo Cadastro"}
                        </h1>
                        <p className="text-xs font-medium text-gray-400">Gerencie dados e escalas</p>
                    </div>
                </div>
            </div>

            <form onSubmit={saveDoctor} className="space-y-6 p-4 max-w-lg mx-auto">
                {/* Success Message */}
                {success && (
                    <div className="flex items-center gap-3 rounded-2xl bg-green-50 border border-green-100 p-4 text-[#22c55e] animate-in fade-in zoom-in duration-300">
                        <CheckCircle className="h-5 w-5" />
                        <span className="text-sm font-medium">Dados salvos com sucesso! Redirecionando...</span>
                    </div>
                )}

                {/* Error Message */}
                {errors.submit && (
                    <div className="rounded-2xl bg-red-50 p-4 text-xs font-medium text-red-600 border border-red-100 flex items-start gap-3">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{errors.submit}</span>
                    </div>
                )}

                {/* Basic Info Card */}
                <div className="rounded-3xl border border-white/80 bg-white/60 p-6 shadow-xl shadow-gray-200/20 backdrop-blur-xl">
                    <h2 className="mb-6 flex items-center gap-2 text-[10px] font-medium uppercase tracking-widest text-gray-400">
                        <User className="h-3.5 w-3.5 text-[#22c55e]" />
                        Informações Básicas
                    </h2>
                    <div className="space-y-4">
                        {/* Name */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-medium uppercase text-gray-400 px-1">Nome</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full h-12 rounded-2xl border border-gray-100 bg-white/80 px-4 text-sm font-medium outline-none focus:border-[#22c55e]/50 transition-colors"
                                placeholder="Nome do médico"
                            />
                        </div>

                        {/* CRM + Phone */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-medium uppercase text-gray-400 px-1">CRM</label>
                                <input
                                    type="text"
                                    value={crm}
                                    onChange={e => setCrm(e.target.value)}
                                    className="w-full h-12 rounded-2xl border border-gray-100 bg-white/80 px-4 text-sm font-medium outline-none focus:border-[#22c55e]/50 transition-colors"
                                    placeholder="00000-UF"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-medium uppercase text-gray-400 px-1">Telefone (WhatsApp)</label>
                                <input
                                    type="text"
                                    value={phone}
                                    onChange={handlePhoneInput}
                                    className="w-full h-12 rounded-2xl border border-gray-100 bg-white/80 px-4 text-sm font-medium outline-none focus:border-[#22c55e]/50 transition-colors"
                                    placeholder="(00) 00000-0000"
                                />
                            </div>
                        </div>

                        {/* Specialty + Add Button */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-medium uppercase text-gray-400 px-1">Especialidade</label>
                            <div className="flex items-center gap-2">
                                <select
                                    value={specialtyId}
                                    onChange={e => setSpecialtyId(e.target.value)}
                                    className="w-full h-12 rounded-2xl border border-gray-100 bg-white/80 px-4 text-sm font-medium outline-none appearance-none"
                                >
                                    <option value="">Selecione...</option>
                                    {allSpecialties.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                                <Button type="button" variant="outline" size="icon" onClick={() => setIsSpecialtyModalOpen(true)}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Locations Section */}
                <div className="space-y-4">
                    <h2 className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-widest text-gray-400 px-2">
                        <Stethoscope className="h-3.5 w-3.5 text-[#22c55e]" />
                        Grade de Escalas
                    </h2>

                    {locations.map((loc, index) => (
                        <div
                            key={loc.id}
                            className="relative rounded-3xl border border-white/80 bg-white/60 p-6 shadow-lg shadow-gray-200/10 backdrop-blur-xl animate-in slide-in-from-bottom-2"
                        >
                            {/* Delete Button */}
                            {locations.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeLocation(index)}
                                    className="absolute right-4 top-4 text-gray-300 hover:text-red-400 transition-colors"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            )}

                            <div className="space-y-4">
                                {/* Place Name */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-medium uppercase text-gray-400 px-1">Local da Unidade</label>
                                    <input
                                        type="text"
                                        value={loc.place_name}
                                        onChange={e => updateLocation(index, "place_name", e.target.value)}
                                        className="w-full h-11 rounded-2xl border border-gray-100 bg-white/80 px-4 text-sm font-medium outline-none focus:border-[#22c55e]/50 transition-colors"
                                        placeholder="Ex: UPA Turu"
                                    />
                                </div>

                                {/* Neighborhood + Add Button */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-medium uppercase text-gray-400 px-1">Bairro</label>
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={loc.neighborhood_id ?? ""}
                                            onChange={e => updateLocation(index, "neighborhood_id", e.target.value ? parseInt(e.target.value) : null)}
                                            className="w-full h-11 rounded-2xl border border-gray-100 bg-white/80 px-4 text-sm font-medium outline-none appearance-none"
                                        >
                                            <option value="">Selecione o bairro...</option>
                                            {allNeighborhoods.map(n => (
                                                <option key={n.id} value={n.id}>{n.name}</option>
                                            ))}
                                        </select>
                                        <Button type="button" variant="outline" size="icon" onClick={() => setIsNeighborhoodModalOpen(true)}>
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Days */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-medium uppercase text-gray-400 px-1">Dias</label>
                                    <div className="flex flex-wrap gap-2">
                                        {DAYS_OF_WEEK.map(d => (
                                            <button
                                                key={d.value}
                                                type="button"
                                                onClick={() => toggleDay(index, d.value)}
                                                className={`rounded-xl px-3 py-2 text-[10px] font-medium uppercase transition-all ${loc.days_of_week.includes(d.value)
                                                    ? "bg-[#22c55e] text-white shadow-sm"
                                                    : "bg-white/50 text-gray-400 border border-gray-100 hover:bg-white"
                                                    }`}
                                            >
                                                {d.short}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Time */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-medium uppercase text-gray-400 px-1">Início</label>
                                        <input
                                            type="time"
                                            value={loc.start_time}
                                            onChange={e => updateLocation(index, "start_time", e.target.value)}
                                            className="w-full h-11 rounded-2xl border border-gray-100 bg-white/80 px-4 text-sm font-medium"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-medium uppercase text-gray-400 px-1">Fim</label>
                                        <input
                                            type="time"
                                            value={loc.end_time}
                                            onChange={e => updateLocation(index, "end_time", e.target.value)}
                                            className="w-full h-11 rounded-2xl border border-gray-100 bg-white/80 px-4 text-sm font-medium"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Add Location Button */}
                    <button
                        type="button"
                        onClick={addLocation}
                        className="w-full h-14 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 text-xs font-medium bg-white/40 hover:bg-white transition-all flex items-center justify-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Adicionar Novo Local
                    </button>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="group relative w-full h-14 rounded-2xl bg-[#22c55e] text-white font-medium uppercase tracking-widest shadow-xl shadow-[#22c55e]/20 active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center overflow-hidden"
                >
                    {isSubmitting ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                        doctorId ? "Salvar Alterações" : "Concluir Cadastro"
                    )}
                </button>

                {/* Specialty Modal */}
                <Dialog open={isSpecialtyModalOpen} onOpenChange={setIsSpecialtyModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Nova Especialidade</DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                            <Input
                                placeholder="Nome da especialidade"
                                value={newSpecialtyName}
                                onChange={(e) => setNewSpecialtyName(e.target.value)}
                            />
                        </div>
                        <DialogFooter>
                            <Button onClick={handleAddSpecialty}>Salvar</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Neighborhood Modal */}
                <Dialog open={isNeighborhoodModalOpen} onOpenChange={setIsNeighborhoodModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Novo Bairro</DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                            <Input
                                placeholder="Nome do bairro"
                                value={newNeighborhoodName}
                                onChange={(e) => setNewNeighborhoodName(e.target.value)}
                            />
                        </div>
                        <DialogFooter>
                            <Button onClick={handleAddNeighborhood}>Salvar</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </form>
        </div>
    )
}

export default function RegisterPage() {
    return <Suspense><CadastroContent /></Suspense>
}