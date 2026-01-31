"use client"

import React, { Suspense } from "react"
import { useState, useRef, useEffect } from "react"
import { useApp } from "@/context/app-context"
import { useAuth } from "@/context/AuthContext"
import { Plus, Trash2, CheckCircle, User, Stethoscope, Loader2, X, ArrowLeft, Phone as PhoneIcon } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

// UI Components
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

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
    const { addSpecialty, addNeighborhood, loadData } = useApp()
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
    const [specialties, setSpecialties] = useState<any[]>([])
    const [neighborhoods, setNeighborhoods] = useState<any[]>([])
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

    // Mask for phone number (XX) XXXXX-XXXX
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, "")
        if (value.length > 11) value = value.slice(0, 11)

        if (value.length > 2 && value.length <= 6) {
            value = `(${value.slice(0, 2)}) ${value.slice(2)}`
        } else if (value.length > 6) {
            value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`
        } else if (value.length > 0) {
            value = `(${value}`
        }
        setPhone(value)
    }

    // Load specialties and neighborhoods
    useEffect(() => {
        const fetchAux = async () => {
            const { data: s } = await supabase.from('specialties').select('*').order('name')
            const { data: n } = await supabase.from('neighborhoods').select('*').order('name')
            if (s) setSpecialties(s)
            if (n) setNeighborhoods(n)
        }
        fetchAux()
    }, [supabase])

    // Hydration for Editing
    useEffect(() => {
        const fetchDoc = async () => {
            if (!editId) return
            setIsLoadingData(true)
            try {
                const { data: doctor } = await supabase.from("doctors").select("*").eq("id", editId).single()
                if (doctor) {
                    setName(doctor.name)
                    setCrm(doctor.crm)
                    setPhone(doctor.phone || "")
                    setSelectedSpecialtyId(doctor.specialty_id)
                    setAvatarUrl(doctor.avatar_url)

                    const { data: scheds } = await supabase.from("schedules").select("*").eq("doctor_id", editId)
                    if (scheds && scheds.length > 0) {
                        const grouped: Record<string, any> = {}
                        scheds.forEach(s => {
                            const key = `${s.place_name}-${s.neighborhood_id}-${s.start_time.slice(0, 5)}-${s.end_time.slice(0, 5)}`
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
            } finally {
                setIsLoadingData(false)
            }
        }
        fetchDoc()
    }, [editId, supabase])

    const updateSlot = (id: string, field: keyof ServiceSlot, value: any) => {
        setSlots(slots.map(s => s.id === id ? { ...s, [field]: value } : s))
    }

    const toggleDay = (slotId: string, day: string) => {
        setSlots(slots.map(s => {
            if (s.id !== slotId) return s
            const days = s.days_of_week.includes(day) ? s.days_of_week.filter(d => d !== day) : [...s.days_of_week, day]
            return { ...s, days_of_week: days }
        }))
    }

    const addSlot = () => setSlots([...slots, { id: Date.now().toString(), place_name: "", neighborhood_id: null, days_of_week: [], start_time: "", end_time: "" }])
    const removeSlot = (id: string) => slots.length > 1 && setSlots(slots.filter(s => s.id !== id))

    // Modals
    const [newSpecName, setNewSpecName] = useState("")
    const [showSpecDialog, setShowSpecDialog] = useState(false)
    const [newNeighName, setNewNeighName] = useState("")
    const [showNeighDialog, setShowNeighDialog] = useState<string | null>(null)

    const handleAddSpec = async () => {
        if (!newSpecName.trim()) return
        const { data } = await addSpecialty(newSpecName.trim())
        if (data) {
            setSpecialties([...specialties, data])
            setSelectedSpecialtyId(Number(data.id))
            setNewSpecName("")
            setShowSpecDialog(false)
        }
    }

    const handleAddNeigh = async () => {
        const slotId = showNeighDialog
        if (!slotId || !newNeighName.trim()) return
        const { data } = await addNeighborhood(newNeighName.trim())
        if (data) {
            setNeighborhoods([...neighborhoods, data])
            updateSlot(slotId, "neighborhood_id", Number(data.id))
            setNewNeighName("")
            setShowNeighDialog(null)
        }
    }

    // THE CLEAN SAVE (GOLDEN RULE)
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user || isSubmitting) return

        setErrors({})
        if (!name.trim()) { setErrors({ name: "Nome obrigatório" }); return }
        if (!selectedSpecialtyId) { setErrors({ specialty: "Especialidade obrigatória" }); return }

        setIsSubmitting(true)
        try {
            const initials = name.split(" ").filter(Boolean).map(n => n[0]).join("").substring(0, 2).toUpperCase()
            const finalAvatar = avatarUrl || initials
            let doctor_id = editId

            // 1. UPDATE/INSERT Doctor (with Phone)
            if (editId) {
                const { error } = await supabase.from("doctors").update({
                    name, crm, phone, specialty_id: selectedSpecialtyId, avatar_url: finalAvatar
                }).eq("id", editId)
                if (error) throw error
            } else {
                const { data, error } = await supabase.from("doctors").insert({
                    user_id: user.id, name, crm, phone, specialty_id: selectedSpecialtyId, avatar_url: finalAvatar
                }).select().single()
                if (error) throw error
                doctor_id = data.id
            }

            // 2. CLEAN DELETE (Prevent Duplicates)
            if (editId) {
                const { error } = await supabase.from("schedules").delete().eq("doctor_id", editId)
                if (error) throw error
            }

            // 3. INSERT New Schedules
            const newScheds = slots.flatMap(s => s.days_of_week.map(day => ({
                doctor_id, place_name: s.place_name, neighborhood_id: s.neighborhood_id,
                day_of_week: day, start_time: s.start_time, end_time: s.end_time
            }))).filter(sc => sc.place_name && sc.neighborhood_id && sc.day_of_week)

            if (newScheds.length > 0) {
                const { error } = await supabase.from("schedules").insert(newScheds)
                if (error) throw error
            }

            setSuccess(true)
            await loadData()
            setTimeout(() => router.push("/"), 1200)
        } catch (err: any) {
            setErrors({ submit: "Erro: " + err.message })
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isAuthLoading || isLoadingData) return <div className="flex h-screen items-center justify-center bg-gray-50"><Loader2 className="h-10 w-10 animate-spin text-[#22c55e]" /></div>

    return (
        <div className="min-h-screen bg-gray-50/50 pb-24">
            <div className="sticky top-0 z-40 border-b border-white/40 bg-white/30 px-4 pb-4 pt-6 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                    <Link href="/" className="rounded-full bg-white/50 p-2 text-gray-500 border border-white/40">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-medium text-gray-800 tracking-tight">{editId ? "Editar Cadastro" : "Cadastro de Médico"}</h1>
                        <p className="text-xs font-medium text-gray-400">Gerencie escalas e contatos</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6 p-4 max-w-lg mx-auto">
                {success && (
                    <div className="flex items-center gap-3 rounded-2xl bg-green-50 border border-green-100 p-4 text-[#22c55e]">
                        <CheckCircle className="h-5 w-5" />
                        <span className="text-sm font-medium">Informações salvas com sucesso!</span>
                    </div>
                )}
                {errors.submit && <div className="rounded-2xl bg-red-50 p-4 text-center text-xs font-medium text-red-600 border border-red-100">{errors.submit}</div>}

                <div className="rounded-3xl border border-white/80 bg-white/60 p-6 shadow-xl shadow-gray-200/20 backdrop-blur-xl">
                    <h2 className="mb-6 flex items-center gap-2 text-[10px] font-medium uppercase tracking-widest text-gray-400"><User className="h-3.5 w-3.5 text-[#22c55e]" />Identificação</h2>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-medium uppercase text-gray-400 px-1">Nome</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full rounded-2xl border border-gray-100 bg-white/80 px-4 py-3 text-sm font-medium outline-none h-12" placeholder="Dr. Nome Sobrenome" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-medium uppercase text-gray-400 px-1">CRM</label>
                                <input type="text" value={crm} onChange={e => setCrm(e.target.value)} className="w-full rounded-2xl border border-gray-100 bg-white/80 px-4 py-3 text-sm font-medium outline-none h-12" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-medium uppercase text-gray-400 px-1">Telefone</label>
                                <input type="text" value={phone} onChange={handlePhoneChange} className="w-full rounded-2xl border border-gray-100 bg-white/80 px-4 py-3 text-sm font-medium outline-none h-12" placeholder="(00) 0.0000-0000" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-medium uppercase text-gray-400 px-1">Especialidade</label>
                            <div className="flex gap-2">
                                <select value={selectedSpecialtyId ?? ""} onChange={e => setSelectedSpecialtyId(Number(e.target.value))} className="flex-1 rounded-2xl border border-gray-100 bg-white/80 px-4 py-3 text-sm font-medium outline-none appearance-none h-12">
                                    <option value="">Selecione...</option>
                                    {specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                <button type="button" onClick={() => setShowSpecDialog(true)} className="rounded-2xl bg-[#22c55e]/5 px-4 text-[#22c55e] border border-[#22c55e]/10"><Plus className="h-4 w-4" /></button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h2 className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-widest text-gray-400 px-2"><Stethoscope className="h-3.5 w-3.5 text-[#22c55e]" />Cronograma</h2>
                    {slots.map(s => (
                        <div key={s.id} className="relative rounded-3xl border border-white/80 bg-white/60 p-6 shadow-lg shadow-gray-200/10 backdrop-blur-xl">
                            {slots.length > 1 && <button type="button" onClick={() => removeSlot(s.id)} className="absolute right-4 top-4 text-gray-300"><Trash2 className="h-4 w-4" /></button>}
                            <div className="space-y-4">
                                <div className="space-y-1"><label className="text-[10px] font-medium uppercase text-gray-400 px-1">Unidade</label><input type="text" value={s.place_name} onChange={e => updateSlot(s.id, "place_name", e.target.value)} className="w-full rounded-2xl border border-gray-100 bg-white/80 px-4 h-11 text-sm font-medium" /></div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-medium uppercase text-gray-400 px-1">Bairro</label>
                                    <div className="flex gap-2">
                                        <select value={s.neighborhood_id ?? ""} onChange={e => updateSlot(s.id, "neighborhood_id", Number(e.target.value))} className="flex-1 rounded-2xl border border-gray-100 bg-white/80 px-4 h-11 text-sm font-medium appearance-none">
                                            <option value="">Selecione...</option>
                                            {neighborhoods.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                                        </select>
                                        <button type="button" onClick={() => setShowNeighDialog(s.id)} className="rounded-2xl bg-[#22c55e]/5 px-3 text-[#22c55e] border border-[#22c55e]/10"><Plus className="h-4 w-4" /></button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-medium uppercase text-gray-400 px-1">Dias</label>
                                    <div className="flex flex-wrap gap-2">
                                        {DAYS_OF_WEEK.map(d => (
                                            <button key={d.value} type="button" onClick={() => toggleDay(s.id, d.value)} className={`rounded-xl px-4 py-2 text-[10px] font-medium uppercase transition-all ${s.days_of_week.includes(d.value) ? "bg-[#22c55e] text-white shadow-sm" : "bg-white/50 text-gray-400 border border-gray-100"}`}>{d.short}</button>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1"><label className="text-[10px] font-medium uppercase text-gray-400 px-1">Entrada</label><input type="time" value={s.start_time} onChange={e => updateSlot(s.id, "start_time", e.target.value)} className="w-full rounded-2xl border border-gray-100 bg-white/80 px-4 h-11 text-sm font-medium" /></div>
                                    <div className="space-y-1"><label className="text-[10px] font-medium uppercase text-gray-400 px-1">Saída</label><input type="time" value={s.end_time} onChange={e => updateSlot(s.id, "end_time", e.target.value)} className="w-full rounded-2xl border border-gray-100 bg-white/80 px-4 h-11 text-sm font-medium" /></div>
                                </div>
                            </div>
                        </div>
                    ))}
                    <button type="button" onClick={addSlot} className="w-full rounded-2xl border-2 border-dashed border-gray-200 py-4 text-gray-400 text-xs font-medium bg-white/40 hover:bg-white transition-colors">+ Novo Local de Plantão</button>
                </div>

                <button type="submit" disabled={isSubmitting} className="w-full h-14 rounded-2xl bg-[#22c55e] text-white font-medium uppercase tracking-widest shadow-xl shadow-[#22c55e]/10 active:scale-95 disabled:opacity-50 flex items-center justify-center">{isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : (editId ? "Salvar Alterações" : "Concluir Cadastro")}</button>
            </form>

            <Dialog open={showSpecDialog} onOpenChange={setShowSpecDialog}><DialogContent className="rounded-3xl"><DialogHeader><DialogTitle className="font-medium">Nova Especialidade</DialogTitle></DialogHeader><Input placeholder="Nome" value={newSpecName} onChange={e => setNewSpecName(e.target.value)} className="rounded-2xl border-gray-100 h-11 font-medium" /><DialogFooter className="flex gap-2"><Button variant="outline" onClick={() => setShowSpecDialog(false)} className="flex-1 rounded-2xl h-11">Cancelar</Button><Button onClick={handleAddSpec} className="flex-1 rounded-2xl bg-[#22c55e] h-11 text-white">Salvar</Button></DialogFooter></DialogContent></Dialog>
            <Dialog open={!!showNeighDialog} onOpenChange={o => !o && setShowNeighDialog(null)}><DialogContent className="rounded-3xl"><DialogHeader><DialogTitle className="font-medium">Novo Bairro</DialogTitle></DialogHeader><Input placeholder="Nome" value={newNeighName} onChange={e => setNewNeighName(e.target.value)} className="rounded-2xl border-gray-100 h-11 font-medium" /><DialogFooter className="flex gap-2"><Button variant="outline" onClick={() => setShowNeighDialog(null)} className="flex-1 rounded-2xl h-11">Cancelar</Button><Button onClick={handleAddNeigh} className="flex-1 rounded-2xl bg-[#22c55e] h-11 text-white">Salvar</Button></DialogFooter></DialogContent></Dialog>
        </div>
    )
}

export default function RegisterPage() {
    return <Suspense fallback={<div className="flex h-screen items-center justify-center bg-gray-50"><Loader2 className="h-10 w-10 animate-spin text-[#22c55e]" /></div>}><CadastroContent /></Suspense>
}
