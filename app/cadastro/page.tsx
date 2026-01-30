"use client"

import React, { Suspense } from "react"
import { useState, useRef, useEffect } from "react"
import { useApp } from "@/context/app-context"
import { useAuth } from "@/context/AuthContext"
import { Plus, Trash2, CheckCircle, User, Stethoscope, Loader2, Camera, X, ArrowLeft, Phone } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

const DAYS_OF_WEEK = [
    { short: "Seg", full: "Segunda", value: "segunda" },
    { short: "Ter", full: "Terça", value: "terça" },
    { short: "Qua", full: "Quarta", value: "quarta" },
    { short: "Qui", full: "Quinta", value: "quinta" },
    { short: "Sex", full: "Sexta", value: "sexta" },
    { short: "Sab", full: "Sábado", value: "sábado" },
]

interface ServiceSlot {
    id: string
    place_name: string
    neighborhood_id: number | null
    days_of_week: string[]
    start_time: string
    end_time: string
}

function CadastroContent() {
    const { addDoctor, updateDoctor, specialties, neighborhoods, addSpecialty, addNeighborhood, updateProfileAvatar } = useApp()
    const { user, isLoading: isAuthLoading } = useAuth()
    const router = useRouter()
    const searchParams = useSearchParams()
    const editId = searchParams.get("id")
    const supabase = createClient()

    const [name, setName] = useState("")
    const [crm, setCrm] = useState("")
    const [phone, setPhone] = useState("")
    const [selectedSpecialtyId, setSelectedSpecialtyId] = useState<number | null>(null)
    const [slots, setSlots] = useState<ServiceSlot[]>([
        {
            id: "1",
            place_name: "",
            neighborhood_id: null,
            days_of_week: [],
            start_time: "",
            end_time: "",
        },
    ])

    const [success, setSuccess] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [isLoadingData, setIsLoadingData] = useState(false)

    // New specialty/neighborhood input states
    const [newSpecialty, setNewSpecialty] = useState("")
    const [newNeighborhood, setNewNeighborhood] = useState("")
    const [showNewSpecialty, setShowNewSpecialty] = useState(false)
    const [showNewNeighborhood, setShowNewNeighborhood] = useState<string | null>(null)
    const [isAddingSpecialty, setIsAddingSpecialty] = useState(false)
    const [isAddingNeighborhood, setIsAddingNeighborhood] = useState(false)

    // Avatar upload
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

    // Hydrate data if editing
    useEffect(() => {
        const fetchDoctorData = async () => {
            if (!editId) return

            setIsLoadingData(true)
            try {
                // 1. Fetch Doctor
                const { data: doctor, error: doctorError } = await supabase
                    .from("doctors")
                    .select("*")
                    .eq("id", editId)
                    .single()

                if (doctorError || !doctor) {
                    console.error("Error fetching doctor:", doctorError)
                    setErrors({ submit: "Médico não encontrado." })
                    return
                }

                // 2. Fetch Schedules
                const { data: schedules, error: schedulesError } = await supabase
                    .from("schedules")
                    .select("*")
                    .eq("doctor_id", editId)

                if (schedulesError) {
                    console.error("Error fetching schedules:", schedulesError)
                }

                // 3. Populate Form
                setName(doctor.name)
                setCrm(doctor.crm)
                setPhone(doctor.phone || "")
                setSelectedSpecialtyId(doctor.specialty_id)
                setAvatarUrl(doctor.avatar_url)

                if (schedules && schedules.length > 0) {
                    // Group schedules by place/time to reconstruct form slots
                    const grouped: Record<string, any> = {}

                    schedules.forEach((s) => {
                        const key = `${s.place_name}-${s.neighborhood_id}-${s.start_time}-${s.end_time}`
                        if (!grouped[key]) {
                            grouped[key] = {
                                ...s,
                                days: [s.day_of_week]
                            }
                        } else {
                            if (!grouped[key].days.includes(s.day_of_week)) {
                                grouped[key].days.push(s.day_of_week)
                            }
                        }
                    })

                    const reconstructedSlots: ServiceSlot[] = Object.values(grouped).map((group, index) => ({
                        id: (index + 1).toString(),
                        place_name: group.place_name,
                        neighborhood_id: group.neighborhood_id,
                        days_of_week: group.days,
                        start_time: group.start_time.slice(0, 5), // Format HH:mm
                        end_time: group.end_time.slice(0, 5),
                    }))

                    setSlots(reconstructedSlots)
                } else {
                    setSlots([{
                        id: "1",
                        place_name: "",
                        neighborhood_id: null,
                        days_of_week: [],
                        start_time: "",
                        end_time: "",
                    }])
                }
            } catch (err) {
                console.error("Hydration error:", err)
            } finally {
                setIsLoadingData(false)
            }
        }

        fetchDoctorData()
    }, [editId, supabase])

    const handleAddSpecialty = async () => {
        if (!newSpecialty.trim()) return
        setIsAddingSpecialty(true)
        try {
            const result = await addSpecialty(newSpecialty.trim())
            if (result.data) {
                setSelectedSpecialtyId(Number(result.data.id))
                setNewSpecialty("")
                setShowNewSpecialty(false)
            }
        } finally {
            setIsAddingSpecialty(false)
        }
    }

    const handleAddNeighborhood = async (slotId: string) => {
        if (!newNeighborhood.trim()) return
        setIsAddingNeighborhood(true)
        try {
            const result = await addNeighborhood(newNeighborhood.trim())
            if (result.data) {
                updateSlot(slotId, "neighborhood_id", Number(result.data.id))
                setNewNeighborhood("")
                setShowNewNeighborhood(null)
            }
        } finally {
            setIsAddingNeighborhood(false)
        }
    }

    const addSlot = () => {
        setSlots([
            ...slots,
            {
                id: Date.now().toString(),
                place_name: "",
                neighborhood_id: null,
                days_of_week: [],
                start_time: "",
                end_time: "",
            },
        ])
    }

    const removeSlot = (id: string) => {
        if (slots.length > 1) {
            setSlots(slots.filter((slot) => slot.id !== id))
        }
    }

    const updateSlot = (id: string, field: keyof ServiceSlot, value: any) => {
        setSlots(slots.map((slot) => (slot.id === id ? { ...slot, [field]: value } : slot)))
    }

    const toggleDay = (slotId: string, dayValue: string) => {
        setSlots(slots.map((slot) => {
            if (slot.id !== slotId) return slot
            const days = slot.days_of_week.includes(dayValue)
                ? slot.days_of_week.filter((d) => d !== dayValue)
                : [...slot.days_of_week, dayValue]
            return { ...slot, days_of_week: days }
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setErrors({})

        // Basic validation
        if (!name.trim()) { setErrors({ name: "Nome obrigatório" }); return }
        if (!selectedSpecialtyId) { setErrors({ specialty: "Especialidade obrigatória" }); return }

        setIsSubmitting(true)
        try {
            const initials = name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()

            const explodedSchedules = slots.flatMap(slot =>
                slot.days_of_week.map(day => ({
                    place_name: slot.place_name,
                    neighborhood_id: slot.neighborhood_id!,
                    day_of_week: day,
                    start_time: slot.start_time,
                    end_time: slot.end_time
                }))
            )

            const doctorData = {
                name,
                crm,
                phone,
                specialty_id: selectedSpecialtyId,
                avatar_url: avatarUrl || initials
            }

            const result = editId
                ? await updateDoctor(editId, doctorData, explodedSchedules)
                : await addDoctor(doctorData, explodedSchedules)

            if (result.error) {
                setErrors({ submit: result.error })
            } else {
                setSuccess(true)
                setTimeout(() => router.push("/"), 1000)
            }
        } catch (err: any) {
            setErrors({ submit: err.message })
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isAuthLoading || isLoadingData) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50/50">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-[#22c55e]" />
                    <p className="text-gray-500 font-medium">Carregando dados...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50/50 pb-24">
            {/* Header */}
            <div className="sticky top-0 z-40 border-b border-white/40 bg-white/30 px-4 pb-4 pt-6 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                    <Link href="/" className="rounded-full bg-white/50 p-2 text-gray-600 transition-colors hover:bg-white hover:text-gray-900">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">
                            {editId ? "Editar Médico" : "Cadastrar Médico"}
                        </h1>
                        <p className="text-sm text-gray-500">
                            {editId ? "Atualize as informações do profissional" : "Adicione um novo profissional à rede"}
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 p-4">
                {success && (
                    <div className="flex items-center gap-3 rounded-2xl bg-[#22c55e]/10 p-4 text-[#22c55e]">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-medium">Médico salvo com sucesso!</span>
                    </div>
                )}

                {errors.submit && (
                    <div className="rounded-2xl bg-red-50 p-4 text-center text-sm text-red-600 border border-red-100">
                        {errors.submit}
                    </div>
                )}

                {/* Doctor Info */}
                <div className="rounded-3xl border border-white/60 bg-white/40 p-6 shadow-lg backdrop-blur-xl">
                    <h2 className="mb-6 flex items-center gap-2 font-semibold text-gray-800">
                        <User className="h-5 w-5 text-[#22c55e]" />
                        Informações Básicas
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">Nome Completo</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full rounded-xl border border-white/60 bg-white/50 px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/20"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">CRM</label>
                                <input
                                    type="text"
                                    value={crm}
                                    onChange={(e) => setCrm(e.target.value)}
                                    className="w-full rounded-xl border border-white/60 bg-white/50 px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/20"
                                />
                            </div>
                            <div>
                                <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">Telefone</label>
                                <input
                                    type="text"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="(00) 00000-0000"
                                    className="w-full rounded-xl border border-white/60 bg-white/50 px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/20"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">Especialidade</label>
                            <div className="flex gap-2">
                                <select
                                    value={selectedSpecialtyId ?? ""}
                                    onChange={(e) => setSelectedSpecialtyId(Number(e.target.value))}
                                    className="flex-1 rounded-xl border border-white/60 bg-white/50 px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/20"
                                >
                                    <option value="">Selecione...</option>
                                    {specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                <button type="button" onClick={() => setShowNewSpecialty(true)} className="rounded-xl border border-[#22c55e]/30 bg-[#22c55e]/10 px-3 text-[#22c55e]">
                                    <Plus className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Slots */}
                <div className="space-y-4">
                    <h2 className="px-2 flex items-center gap-2 font-semibold text-gray-800">
                        <Stethoscope className="h-5 w-5 text-[#22c55e]" />
                        Locais e Horários
                    </h2>

                    {slots.map((slot, index) => (
                        <div key={slot.id} className="relative rounded-3xl border border-white/60 bg-white/40 p-6 shadow-md backdrop-blur-xl">
                            {slots.length > 1 && (
                                <button type="button" onClick={() => removeSlot(slot.id)} className="absolute right-4 top-4 text-gray-400 hover:text-red-500">
                                    <Trash2 className="h-5 w-5" />
                                </button>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="mb-2 block text-xs font-medium text-gray-500">Nome do Local</label>
                                    <input
                                        type="text"
                                        value={slot.place_name}
                                        onChange={(e) => updateSlot(slot.id, "place_name", e.target.value)}
                                        placeholder="Ex: Clínica Alpha"
                                        className="w-full rounded-xl border border-white/60 bg-white/50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]/20"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-medium text-gray-500">Bairro</label>
                                    <select
                                        value={slot.neighborhood_id ?? ""}
                                        onChange={(e) => updateSlot(slot.id, "neighborhood_id", Number(e.target.value))}
                                        className="w-full rounded-xl border border-white/60 bg-white/50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]/20"
                                    >
                                        <option value="">Selecione...</option>
                                        {neighborhoods.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-medium text-gray-500">Dias da Semana</label>
                                    <div className="flex flex-wrap gap-2">
                                        {DAYS_OF_WEEK.map(day => (
                                            <button
                                                key={day.value}
                                                type="button"
                                                onClick={() => toggleDay(slot.id, day.value)}
                                                className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${slot.days_of_week.includes(day.value)
                                                    ? "bg-[#22c55e] text-white shadow-md"
                                                    : "bg-white/50 text-gray-500 border border-white/60"
                                                    }`}
                                            >
                                                {day.short}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="mb-2 block text-xs font-medium text-gray-500">Início</label>
                                        <input
                                            type="time"
                                            value={slot.start_time}
                                            onChange={(e) => updateSlot(slot.id, "start_time", e.target.value)}
                                            className="w-full rounded-xl border border-white/60 bg-white/50 px-4 py-3 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-xs font-medium text-gray-500">Fim</label>
                                        <input
                                            type="time"
                                            value={slot.end_time}
                                            onChange={(e) => updateSlot(slot.id, "end_time", e.target.value)}
                                            className="w-full rounded-xl border border-white/60 bg-white/50 px-4 py-3 text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    <button type="button" onClick={addSlot} className="w-full rounded-2xl border-2 border-dashed border-white/60 py-4 text-gray-500 hover:border-[#22c55e]/50 hover:text-[#22c55e] transition-all flex items-center justify-center gap-2 bg-white/20">
                        <Plus className="h-5 w-5" />
                        Adicionar outro local de atendimento
                    </button>
                </div>

                {/* Submit Action */}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-full bg-[#22c55e] py-4 text-white font-bold shadow-xl shadow-[#22c55e]/20 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                    {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : editId ? "Atualizar Cadastro" : "Finalizar Cadastro"}
                </button>
            </form>
        </div>
    )
}

export default function RegisterPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-gray-50/50"><Loader2 className="h-10 w-10 animate-spin text-[#22c55e]" /></div>}>
            <CadastroContent />
        </Suspense>
    )
}
