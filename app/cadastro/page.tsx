"use client"

import React, { Suspense, useState, useEffect } from "react"
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

interface ServiceSlot {
    id: string
    place_name: string
    neighborhood_id: number | null
    days_of_week: string[]
    start_time: string
    end_time: string
}

function CadastroContent() {
    const { specialties: globalSpecs, neighborhoods: globalNeighs, addSpecialty, addNeighborhood, loadData } = useApp()
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
        { id: "1", place_name: "", neighborhood_id: null, days_of_week: [], start_time: "", end_time: "" },
    ])

    const [success, setSuccess] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [isLoadingData, setIsLoadingData] = useState(false)
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

    // CORREÇÃO: Função de máscara limpa de interferências (sem CCI links)
    const formatPhone = (val: string) => {
        if (!val) return ""
        const digits = val.replace(/\D/g, "").slice(0, 11)
        let masked = digits
        if (digits.length > 2) {
            masked = `(${digits.slice(0, 2)}) ${digits.slice(2)}`
        }
        if (digits.length > 7 && digits.length <= 10) {
            masked = `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
        } else if (digits.length > 10) {
            masked = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
        }
        return masked
    }

    const handlePhoneInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPhone(formatPhone(e.target.value))
    }

    // Carregar dados existentes
    useEffect(() => {
        const fetchDoc = async () => {
            if (!editId || !supabase) return
            setIsLoadingData(true)
            try {
                const { data: dr, error: drError } = await supabase
                    .from("doctors")
                    .select("*")
                    .eq("id", editId)
                    .single()

                if (drError) throw drError

                if (dr) {
                    setName(dr.name || "")
                    setCrm(dr.crm || "")
                    setPhone(formatPhone(dr.phone || ""))
                    setSelectedSpecialtyId(dr.specialty_id)
                    setAvatarUrl(dr.avatar_url)

                    const { data: sch, error: schError } = await supabase
                        .from("schedules")
                        .select("*")
                        .eq("doctor_id", editId)

                    if (schError) throw schError

                    if (sch && sch.length > 0) {
                        const grouped: Record<string, any> = {}
                        sch.forEach(s => {
                            const key = `${s.place_name.trim()}-${s.neighborhood_id || ""}-${s.start_time.slice(0, 5)}-${s.end_time.slice(0, 5)}`
                            if (!grouped[key]) {
                                grouped[key] = { ...s, days: [s.day_of_week] }
                            } else if (!grouped[key].days.includes(s.day_of_week)) {
                                grouped[key].days.push(s.day_of_week)
                            }
                        })

                        setSlots(Object.values(grouped).map((g, i) => ({
                            id: (i + 1).toString(),
                            place_name: g.place_name,
                            neighborhood_id: g.neighborhood_id,
                            days_of_week: g.days,
                            start_time: g.start_time.slice(0, 5),
                            end_time: g.end_time.slice(0, 5),
                        })))
                    }
                }
            } catch (err: any) {
                console.error("Erro ao carregar médico:", err)
                setErrors({ submit: "Erro ao carregar dados: " + err.message })
            } finally {
                setIsLoadingData(false)
            }
        }
        fetchDoc()
    }, [editId, supabase])

    const updateSlot = (id: string, field: keyof ServiceSlot, val: any) => setSlots(slots.map(s => s.id === id ? { ...s, [field]: val } : s))
    const toggleDay = (id: string, day: string) => setSlots(slots.map(s => s.id === id ? { ...s, days_of_week: s.days_of_week.includes(day) ? s.days_of_week.filter(d => d !== day) : [...s.days_of_week, day] } : s))
    const addSlot = () => setSlots([...slots, { id: Date.now().toString(), place_name: "", neighborhood_id: null, days_of_week: [], start_time: "", end_time: "" }])
    const removeSlot = (id: string) => slots.length > 1 && setSlots(slots.filter(s => s.id !== id))

    // SALVAMENTO ATÔMICO COM LIMPEZA GARANTIDA
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user || isSubmitting) return

        setIsSubmitting(true)
        setErrors({})

        try {
            const finalPhone = phone.trim()
            let doctor_id = editId

            const doctorPayload = {
                name: name.trim(),
                crm: crm.trim(),
                phone: finalPhone, // TELEFONE ATUALIZADO
                specialty_id: selectedSpecialtyId,
                avatar_url: avatarUrl || name.trim().charAt(0).toUpperCase()
            }

            if (editId) {
                // 1. ATUALIZA MÉDICO
                const { error: updError } = await supabase
                    .from("doctors")
                    .update(doctorPayload)
                    .eq("id", editId)
                    .eq("user_id", user.id) // Segurança adicional

                if (updError) throw updError

                // 2. LIMPEZA MANDATÓRIA (CRÍTICO: Resolve duplicação)
                // Se o delete falhar, lançamos erro e não prosseguimos para o insert
                const { error: delError } = await supabase
                    .from("schedules")
                    .delete()
                    .eq("doctor_id", editId)

                if (delError) throw delError
            } else {
                // INSERT NOVO MÉDICO
                const { data: newDoc, error: insError } = await supabase
                    .from("doctors")
                    .insert({ ...doctorPayload, user_id: user.id })
                    .select()
                    .single()

                if (insError) throw insError
                doctor_id = newDoc.id
            }

            // 3. INSERE OS NOVOS HORÁRIOS DEFINIDOS NO FORMULÁRIO
            const schedRows = slots.flatMap(s => s.days_of_week.map(day => ({
                doctor_id,
                place_name: s.place_name.trim(),
                neighborhood_id: s.neighborhood_id,
                day_of_week: day,
                start_time: s.start_time,
                end_time: s.end_time
            }))).filter(r => r.place_name && r.neighborhood_id && r.day_of_week)

            if (schedRows.length > 0) {
                const { error: schedError } = await supabase
                    .from("schedules")
                    .insert(schedRows)

                if (schedError) throw schedError
            }

            // 4. ATUALIZA O CONTEXTO GLOBAL E RETORNA
            await loadData()
            setSuccess(true)

            // Pequeno delay para feedback visual de sucesso
            setTimeout(() => {
                router.push("/")
                router.refresh() // Força o refresh da página de destino
            }, 800)

        } catch (err: any) {
            console.error("Erro completo no salvamento:", err)
            setErrors({ submit: "Falha ao gravar informações. Verifique sua conexão. Detalhe: " + (err.message || "Erro desconhecido") })
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isAuthLoading || isLoadingData) {
        return <div className="flex h-screen items-center justify-center bg-gray-50"><Loader2 className="h-10 w-10 animate-spin text-[#22c55e]" /></div>
    }

    return (
        <div className="min-h-screen bg-gray-50/50 pb-24">
            <div className="sticky top-0 z-40 border-b border-white/40 bg-white/30 px-4 pb-4 pt-6 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                    <Link href="/" className="rounded-full bg-white/50 p-2 text-gray-500 border border-white/40"><ArrowLeft className="h-4 w-4" /></Link>
                    <div>
                        <h1 className="text-xl font-medium text-gray-800 tracking-tight">{editId ? "Editar Profissional" : "Novo Cadastro"}</h1>
                        <p className="text-xs font-medium text-gray-400">Gerencie dados e escalas</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6 p-4 max-w-lg mx-auto">
                {success && (
                    <div className="flex items-center gap-3 rounded-2xl bg-green-50 border border-green-100 p-4 text-[#22c55e] animate-in fade-in zoom-in duration-300">
                        <CheckCircle className="h-5 w-5" />
                        <span className="text-sm font-medium">Dados salvos com sucesso! Redirecionando...</span>
                    </div>
                )}

                {errors.submit && (
                    <div className="rounded-2xl bg-red-50 p-4 text-xs font-medium text-red-600 border border-red-100 flex items-start gap-3">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{errors.submit}</span>
                    </div>
                )}

                <div className="rounded-3xl border border-white/80 bg-white/60 p-6 shadow-xl shadow-gray-200/20 backdrop-blur-xl">
                    <h2 className="mb-6 flex items-center gap-2 text-[10px] font-medium uppercase tracking-widest text-gray-400"><User className="h-3.5 w-3.5 text-[#22c55e]" />Informações Básicas</h2>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-medium uppercase text-gray-400 px-1">Nome</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full h-12 rounded-2xl border border-gray-100 bg-white/80 px-4 text-sm font-medium outline-none focus:border-[#22c55e]/50 transition-colors" placeholder="Nome do médico" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-medium uppercase text-gray-400 px-1">CRM</label>
                                <input type="text" value={crm} onChange={e => setCrm(e.target.value)} className="w-full h-12 rounded-2xl border border-gray-100 bg-white/80 px-4 text-sm font-medium outline-none focus:border-[#22c55e]/50 transition-colors" placeholder="00000-UF" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-medium uppercase text-gray-400 px-1">Telefone (WhastApp)</label>
                                <input type="text" value={phone} onChange={handlePhoneInput} className="w-full h-12 rounded-2xl border border-gray-100 bg-white/80 px-4 text-sm font-medium outline-none focus:border-[#22c55e]/50 transition-colors" placeholder="(00) 00000-0000" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-medium uppercase text-gray-400 px-1">Especialidade</label>
                            <select value={selectedSpecialtyId ?? ""} onChange={e => setSelectedSpecialtyId(Number(e.target.value))} className="w-full h-12 rounded-2xl border border-gray-100 bg-white/80 px-4 text-sm font-medium outline-none appearance-none bg-no-repeat bg-[right_1rem_center]">
                                <option value="">Selecione...</option>
                                {globalSpecs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h2 className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-widest text-gray-400 px-2"><Stethoscope className="h-3.5 w-3.5 text-[#22c55e]" />Grade de Escalas</h2>
                    {slots.map(s => (
                        <div key={s.id} className="relative rounded-3xl border border-white/80 bg-white/60 p-6 shadow-lg shadow-gray-200/10 backdrop-blur-xl animate-in slide-in-from-bottom-2">
                            {slots.length > 1 && (
                                <button type="button" onClick={() => removeSlot(s.id)} className="absolute right-4 top-4 text-gray-300 hover:text-red-400 transition-colors">
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            )}
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-medium uppercase text-gray-400 px-1">Local da Unidade</label>
                                    <input type="text" value={s.place_name} onChange={e => updateSlot(s.id, "place_name", e.target.value)} className="w-full h-11 rounded-2xl border border-gray-100 bg-white/80 px-4 text-sm font-medium outline-none focus:border-[#22c55e]/50 transition-colors" placeholder="Ex: UPA Turu" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-medium uppercase text-gray-400 px-1">Bairro</label>
                                    <select value={s.neighborhood_id ?? ""} onChange={e => updateSlot(s.id, "neighborhood_id", Number(e.target.value))} className="w-full h-11 rounded-2xl border border-gray-100 bg-white/80 px-4 text-sm font-medium outline-none appearance-none">
                                        <option value="">Selecione o bairro...</option>
                                        {globalNeighs.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-medium uppercase text-gray-400 px-1">Dias</label>
                                    <div className="flex flex-wrap gap-2">
                                        {DAYS_OF_WEEK.map(d => (
                                            <button key={d.value} type="button" onClick={() => toggleDay(s.id, d.value)} className={`rounded-xl px-3 py-2 text-[10px] font-medium uppercase transition-all ${s.days_of_week.includes(d.value) ? "bg-[#22c55e] text-white shadow-sm" : "bg-white/50 text-gray-400 border border-gray-100 hover:bg-white"}`}>{d.short}</button>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-medium uppercase text-gray-400 px-1">Início</label>
                                        <input type="time" value={s.start_time} onChange={e => updateSlot(s.id, "start_time", e.target.value)} className="w-full h-11 rounded-2xl border border-gray-100 bg-white/80 px-4 text-sm font-medium" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-medium uppercase text-gray-400 px-1">Fim</label>
                                        <input type="time" value={s.end_time} onChange={e => updateSlot(s.id, "end_time", e.target.value)} className="w-full h-11 rounded-2xl border border-gray-100 bg-white/80 px-4 text-sm font-medium" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    <button type="button" onClick={addSlot} className="w-full h-14 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 text-xs font-medium bg-white/40 hover:bg-white transition-all flex items-center justify-center gap-2">
                        <Plus className="h-4 w-4" />
                        Adicionar Novo Local
                    </button>
                </div>

                <button type="submit" disabled={isSubmitting} className="group relative w-full h-14 rounded-2xl bg-[#22c55e] text-white font-medium uppercase tracking-widest shadow-xl shadow-[#22c55e]/20 active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center overflow-hidden">
                    {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : (editId ? "Salvar Alterações" : "Concluir Cadastro")}
                </button>
            </form>
        </div>
    )
}

export default function RegisterPage() {
    return <Suspense><CadastroContent /></Suspense>
}