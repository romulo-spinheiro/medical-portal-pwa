"use client"

import React, { Suspense, useState, useEffect } from "react"
import { useApp } from "@/context/app-context"
import { useAuth } from "@/context/AuthContext"
import { Plus, Trash2, CheckCircle, User, Stethoscope, Loader2, ArrowLeft } from "lucide-react"
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

    // PHONE MASK: (XX) XXXXX-XXXX
    const formatPhone = (val: string) => {
        const digits = val.replace(/\D/g, "").slice(0, 11)
        let masked = digits
        if (digits.length > 2) masked = `(${digits.slice(0, 2)}) ${digits.slice(2)}`
        if (digits.length > 7) masked = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
        return masked
    }

    const handlePhoneInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPhone(formatPhone(e.target.value))
    }

    // Load initial data
    useEffect(() => {
        const fetchAux = async () => {
            const { data: s } = await supabase.from('specialties').select('*').order('name')
            const { data: n } = await supabase.from('neighborhoods').select('*').order('name')
            if (s) setSpecialties(s)
            if (n) setNeighborhoods(n)
        }
        fetchAux()
    }, [supabase])

    // Hydration for Edit mode
    useEffect(() => {
        const fetchDoc = async () => {
            if (!editId) return
            setIsLoadingData(true)
            try {
                const { data: dr } = await supabase.from("doctors").select("*").eq("id", editId).single()
                if (dr) {
                    setName(dr.name)
                    setCrm(dr.crm)
                    setPhone(formatPhone(dr.phone || ""))
                    setSelectedSpecialtyId(dr.specialty_id)
                    setAvatarUrl(dr.avatar_url)

                    const { data: sch } = await supabase.from("schedules").select("*").eq("doctor_id", editId)
                    if (sch && sch.length > 0) {
                        const grouped: Record<string, any> = {}
                        sch.forEach(s => {
                            const k = `${s.place_name}-${s.neighborhood_id}-${s.start_time.slice(0, 5)}-${s.end_time.slice(0, 5)}`
                            if (!grouped[k]) grouped[k] = { ...s, days: [s.day_of_week] }
                            else if (!grouped[k].days.includes(s.day_of_week)) grouped[k].days.push(s.day_of_week)
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

    const updateSlot = (id: string, field: keyof ServiceSlot, val: any) => setSlots(slots.map(s => s.id === id ? { ...s, [field]: val } : s))
    const toggleDay = (id: string, day: string) => setSlots(slots.map(s => s.id === id ? { ...s, days_of_week: s.days_of_week.includes(day) ? s.days_of_week.filter(d => d !== day) : [...s.days_of_week, day] } : s))
    const addSlot = () => setSlots([...slots, { id: Date.now().toString(), place_name: "", neighborhood_id: null, days_of_week: [], start_time: "", end_time: "" }])
    const removeSlot = (id: string) => slots.length > 1 && setSlots(slots.filter(s => s.id !== id))

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
        const sid = showNeighDialog
        if (!sid || !newNeighName.trim()) return
        const { data } = await addNeighborhood(newNeighName.trim())
        if (data) {
            setNeighborhoods([...neighborhoods, data])
            updateSlot(sid, "neighborhood_id", Number(data.id))
            setNewNeighName("")
            setShowNeighDialog(null)
        }
    }

    // SAVING LOGIC - ABSOLUTE FIX
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user || isSubmitting) return

        setErrors({})
        if (!name.trim()) { setErrors({ name: "Nome obrigatório" }); return }
        if (!selectedSpecialtyId) { setErrors({ specialty: "Especialidade obrigatória" }); return }

        setIsSubmitting(true)
        try {
            const initials = name.split(" ").filter(Boolean).map(n => n[0]).join("").substring(0, 2).toUpperCase()
            const cleanPhone = phone // Masked but that's fine for text col
            let doctor_id = editId

            // 1. DOCTOR DATA (including phone)
            const docPayload = {
                name, crm, phone: cleanPhone, specialty_id: selectedSpecialtyId, avatar_url: avatarUrl || initials, user_id: user.id
            }

            if (editId) {
                const { error } = await supabase.from("doctors").update(docPayload).eq("id", editId)
                if (error) throw error
            } else {
                const { data, error } = await supabase.from("doctors").insert(docPayload).select().single()
                if (error) throw error
                doctor_id = data.id
            }

            // 2. CLEAN SCHEDULES (Golden Rule: DELETE then INSERT)
            if (editId) {
                await supabase.from("schedules").delete().eq("doctor_id", editId)
            }

            const schedRows = slots.flatMap(s => s.days_of_week.map(day => ({
                doctor_id, place_name: s.place_name, neighborhood_id: s.neighborhood_id, day_of_week: day, start_time: s.start_time, end_time: s.end_time
            }))).filter(r => r.place_name && r.neighborhood_id && r.day_of_week)

            if (schedRows.length > 0) {
                const { error } = await supabase.from("schedules").insert(schedRows)
                if (error) throw error
            }

            setSuccess(true)
            await loadData()
            setTimeout(() => router.push("/"), 1200)

        } catch (err: any) {
            setErrors({ submit: err.message })
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isAuthLoading || isLoadingData) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-[#22c55e]" /></div>

    return (
        <div className="min-h-screen bg-gray-50/50 pb-24">
            <div className="sticky top-0 z-40 border-b border-white/40 bg-white/30 px-4 pb-4 pt-6 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                    <Link href="/" className="rounded-full bg-white/50 p-2 text-gray-500 border border-white/40"><ArrowLeft className="h-4 w-4" /></Link>
                    <h1 className="text-xl font-medium text-gray-800">{editId ? "Editar Médico" : "Novo Médico"}</h1>
                </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6 p-4 max-w-lg mx-auto">
                {success && <div className="rounded-2xl bg-green-50 p-4 text-[#22c55e] border border-green-100 flex items-center gap-2"><CheckCircle className="h-5 w-5" /><span>Salvo com sucesso!</span></div>}
                {errors.submit && <div className="rounded-2xl bg-red-50 p-4 text-red-600 border border-red-100 text-xs">{errors.submit}</div>}

                <div className="rounded-3xl border border-white/80 bg-white/60 p-6 shadow-xl backdrop-blur-xl">
                    <h2 className="mb-6 flex items-center gap-2 text-[10px] font-medium uppercase tracking-widest text-gray-400"><User className="h-3.5 w-3.5" />Dados Básicos</h2>
                    <div className="space-y-4">
                        <div className="space-y-1"><label className="text-[10px] font-medium uppercase text-gray-400 px-1">Nome Completo</label><input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full h-12 rounded-2xl border border-gray-100 bg-white/80 px-4 text-sm font-medium outline-none" placeholder="Ex: Dr. Silva" /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1"><label className="text-[10px] font-medium uppercase text-gray-400 px-1">CRM</label><input type="text" value={crm} onChange={e => setCrm(e.target.value)} className="w-full h-12 rounded-2xl border border-gray-100 bg-white/80 px-4 text-sm font-medium outline-none" /></div>
                            <div className="space-y-1"><label className="text-[10px] font-medium uppercase text-gray-400 px-1">Telefone</label><input type="text" value={phone} onChange={handlePhoneInput} className="w-full h-12 rounded-2xl border border-gray-100 bg-white/80 px-4 text-sm font-medium outline-none" placeholder="(00) 00000-0000" /></div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-medium uppercase text-gray-400 px-1">Especialidade</label>
                            <div className="flex gap-2">
                                <select value={selectedSpecialtyId ?? ""} onChange={e => setSelectedSpecialtyId(Number(e.target.value))} className="flex-1 h-12 rounded-2xl border border-gray-100 bg-white/80 px-4 text-sm font-medium outline-none appearance-none">
                                    <option value="">Selecione...</option>
                                    {specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                <button type="button" onClick={() => setShowSpecDialog(true)} className="rounded-2xl bg-[#22c55e]/5 px-4 text-[#22c55e] border border-[#22c55e]/10">+</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h2 className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-widest text-gray-400 px-2"><Stethoscope className="h-3.5 w-3.5" />Locais e Horários</h2>
                    {slots.map(s => (
                        <div key={s.id} className="relative rounded-3xl border border-white/80 bg-white/60 p-6 shadow-lg backdrop-blur-xl">
                            {slots.length > 1 && <button type="button" onClick={() => removeSlot(s.id)} className="absolute right-4 top-4 text-gray-300"><Trash2 className="h-4 w-4" /></button>}
                            <div className="space-y-4">
                                <div className="space-y-1"><label className="text-[10px] font-medium uppercase text-gray-400 px-1">Local</label><input type="text" value={s.place_name} onChange={e => updateSlot(s.id, "place_name", e.target.value)} className="w-full h-11 rounded-2xl border border-gray-100 bg-white/80 px-4 text-sm font-medium" /></div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-medium uppercase text-gray-400 px-1">Bairro</label>
                                    <div className="flex gap-2">
                                        <select value={s.neighborhood_id ?? ""} onChange={e => updateSlot(s.id, "neighborhood_id", Number(e.target.value))} className="flex-1 h-11 rounded-2xl border border-gray-100 bg-white/80 px-4 text-sm font-medium appearance-none">
                                            <option value="">Selecione...</option>
                                            {neighborhoods.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                                        </select>
                                        <button type="button" onClick={() => setShowNeighDialog(s.id)} className="rounded-2xl bg-[#22c55e]/5 px-3 text-[#22c55e] border border-[#22c55e]/10">+</button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-medium uppercase text-gray-400 px-1">Dias da Semana</label>
                                    <div className="flex flex-wrap gap-2">
                                        {DAYS_OF_WEEK.map(d => (
                                            <button key={d.value} type="button" onClick={() => toggleDay(s.id, d.value)} className={`rounded-xl px-4 py-2 text-[10px] font-medium uppercase transition-all ${s.days_of_week.includes(d.value) ? "bg-[#22c55e] text-white" : "bg-white/50 text-gray-400 border border-gray-100"}`}>{d.short}</button>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1"><label className="text-[10px] font-medium uppercase text-gray-400 px-1">Chegada</label><input type="time" value={s.start_time} onChange={e => updateSlot(s.id, "start_time", e.target.value)} className="w-full h-11 rounded-2xl border border-gray-100 bg-white/80 px-4 text-sm font-medium" /></div>
                                    <div className="space-y-1"><label className="text-[10px] font-medium uppercase text-gray-400 px-1">Saída</label><input type="time" value={s.end_time} onChange={e => updateSlot(s.id, "end_time", e.target.value)} className="w-full h-11 rounded-2xl border border-gray-100 bg-white/80 px-4 text-sm font-medium" /></div>
                                </div>
                            </div>
                        </div>
                    ))}
                    <button type="button" onClick={addSlot} className="w-full py-4 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 text-xs font-medium hover:bg-white">+ Adicionar Novo Local</button>
                </div>

                <button type="submit" disabled={isSubmitting} className="w-full h-14 rounded-2xl bg-[#22c55e] text-white font-medium uppercase tracking-widest shadow-xl active:scale-95 disabled:opacity-50">{isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : (editId ? "Confirmar Edição" : "Cadastrar Médico")}</button>
            </form>

            <Dialog open={showSpecDialog} onOpenChange={setShowSpecDialog}><DialogContent className="rounded-3xl"><DialogHeader><DialogTitle className="font-medium">Especialidade</DialogTitle></DialogHeader><Input placeholder="Ex: Cardiologia" value={newSpecName} onChange={e => setNewSpecName(e.target.value)} className="rounded-2xl h-11" /><DialogFooter className="flex gap-2"><Button variant="outline" onClick={() => setShowSpecDialog(false)} className="flex-1 rounded-2xl">Cancelar</Button><Button onClick={handleAddSpec} className="flex-1 rounded-2xl bg-[#22c55e] text-white">Salvar</Button></DialogFooter></DialogContent></Dialog>
            <Dialog open={!!showNeighDialog} onOpenChange={o => !o && setShowNeighDialog(null)}><DialogContent className="rounded-3xl"><DialogHeader><DialogTitle className="font-medium">Bairro</DialogTitle></DialogHeader><Input placeholder="Ex: Centro" value={newNeighName} onChange={e => setNewNeighName(e.target.value)} className="rounded-2xl h-11" /><DialogFooter className="flex gap-2"><Button variant="outline" onClick={() => setShowNeighDialog(null)} className="flex-1 rounded-2xl">Cancelar</Button><Button onClick={handleAddNeigh} className="flex-1 rounded-2xl bg-[#22c55e] text-white">Salvar</Button></DialogFooter></DialogContent></Dialog>
        </div>
    )
}

export default function RegisterPage() {
    return <Suspense><CadastroContent /></Suspense>
}
