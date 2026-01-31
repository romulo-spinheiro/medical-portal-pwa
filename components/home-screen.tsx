"use client"

import { useState, useMemo, useEffect, useCallback, useRef } from "react"
import { useApp, type Schedule, type Doctor } from "@/context/app-context"
import { useAuth } from "@/context/AuthContext"
import { createClient } from "@/lib/supabase/client"
import { MapPin, Clock, RefreshCw, Camera, Loader2, Phone } from "lucide-react"
import { DoctorDetailsModal } from "@/components/DoctorDetailsModal"

const DAYS_OF_WEEK = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]

export function HomeScreen() {
  const { doctors, schedules, neighborhoods: dbNeighborhoods, loadData } = useApp()
  const { user } = useAuth()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [userName, setUserName] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>("Todos")
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Modal Detail State
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Default to today
  useEffect(() => {
    if (!selectedDay) {
      const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long' })
      const capitalizedToday = today.charAt(0).toUpperCase() + today.slice(1)
      if (DAYS_OF_WEEK.includes(capitalizedToday)) {
        setSelectedDay(capitalizedToday)
      } else {
        setSelectedDay("Segunda")
      }
    }
  }, [])

  const fetchProfileData = useCallback(async () => {
    if (!user) return
    try {
      // 1. CORREÇÃO DO NOME: Busca explícita na tabela profiles
      const { data } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single()

      if (data && data.full_name) {
        setUserName(data.full_name)
        setAvatarUrl(data.avatar_url || null)
      } else {
        setUserName(user.user_metadata?.full_name || "Doutor(a)")
        setAvatarUrl(user.user_metadata?.avatar_url || null)
      }
    } catch (err) {
      setUserName("Doutor(a)")
    }
  }, [user, supabase])

  useEffect(() => { if (user) fetchProfileData() }, [user, fetchProfileData])

  const handleAvatarClick = () => { if (!isUploading) fileInputRef.current?.click() }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setIsUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const filePath = `${user.id}/avatar-${Date.now()}.${fileExt}`
      await supabase.storage.from('avatars').upload(filePath, file)
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)
      setAvatarUrl(publicUrl)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const neighborhoods = useMemo(() => {
    const list = dbNeighborhoods.length > 0 ? dbNeighborhoods.map(n => n.name) : Array.from(new Set(schedules.map(s => s.neighborhood_name).filter((n): n is string => Boolean(n))))
    return ["Todos", ...list.sort()]
  }, [dbNeighborhoods, schedules])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Bom dia"
    if (hour < 18) return "Boa tarde"
    return "Boa noite"
  }

  // LOGICA DE AGRUPAMENTO E DEDUPLICACAO DE HORARIOS INTERNOS
  const groupedSchedules = useMemo(() => {
    const filtered = schedules.filter((s) => {
      const dayMatch = !selectedDay || s.day_of_week.toLowerCase() === selectedDay.toLowerCase()
      const neighMatch = selectedNeighborhood === "Todos" || s.neighborhood_name === selectedNeighborhood
      return dayMatch && neighMatch
    })

    const groups = new Map<string, { doctor: Doctor, items: Schedule[] }>()

    filtered.forEach(item => {
      const doctor = doctors.find(d => d.id === item.doctor_id)
      if (!doctor) return

      if (!groups.has(item.doctor_id)) {
        groups.set(item.doctor_id, { doctor, items: [item] })
      } else {
        const group = groups.get(item.doctor_id)!
        const isDuplicate = group.items.some(existing =>
          existing.start_time.slice(0, 5) === item.start_time.slice(0, 5) &&
          existing.end_time.slice(0, 5) === item.end_time.slice(0, 5) &&
          existing.place_name === item.place_name &&
          existing.neighborhood_id === item.neighborhood_id
        )

        if (!isDuplicate) {
          group.items.push(item)
        }
      }
    })

    return Array.from(groups.values())
  }, [schedules, doctors, selectedDay, selectedNeighborhood])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try { await Promise.all([loadData(), fetchProfileData()]) }
    finally { setIsRefreshing(false) }
  }

  return (
    <div className="min-h-screen pb-24">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-white/40 bg-white/30 px-4 pb-4 pt-6 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={handleAvatarClick} disabled={isUploading} className="group relative h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-[#22c55e] to-[#16a34a] shadow-md border-2 border-white overflow-hidden active:scale-95 transition-transform">
              {avatarUrl ? (
                <img src={avatarUrl} className="h-full w-full object-cover" alt="" />
              ) : (
                <span className="text-white font-medium">{userName ? userName[0].toUpperCase() : "?"}</span>
              )}
              <div className={`absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 ${isUploading ? 'opacity-100' : ''}`}>
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Camera className="h-4 w-4 text-white" />}
              </div>
            </button>
            <div>
              <h1 className="text-lg font-medium text-gray-800 tracking-tight leading-tight">
                {getGreeting()}, <span className="text-[#22c55e]">{userName || "Doutor(a)"}</span>
              </h1>
              <p className="text-[10px] font-medium uppercase tracking-widest text-gray-400">Roteiro Diário</p>
            </div>
          </div>
          <button onClick={handleRefresh} disabled={isRefreshing} className="h-9 w-9 flex items-center justify-center rounded-full bg-white/60 text-gray-400 border border-white/80 transition-all hover:text-[#22c55e]">
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="space-y-4 px-4 py-6">
        <div className="space-y-2">
          <p className="px-1 text-[10px] font-medium uppercase tracking-widest text-gray-400">Selecione o Dia</p>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {DAYS_OF_WEEK.map(day => (
              <button key={day} onClick={() => setSelectedDay(day)} className={`shrink-0 rounded-2xl px-5 py-2 text-xs font-medium transition-all ${selectedDay === day ? "bg-[#22c55e] text-white shadow-md" : "border border-gray-100 bg-white/60 text-gray-500 hover:bg-white"}`}>{day}</button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="px-1 text-[10px] font-medium uppercase tracking-widest text-gray-400">Filtrar por Bairro</p>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {neighborhoods.map(n => (
              <button key={n} onClick={() => setSelectedNeighborhood(n)} className={`shrink-0 rounded-2xl px-5 py-2 text-xs font-medium transition-all ${selectedNeighborhood === n ? "bg-[#22c55e] text-white shadow-md" : "border border-gray-100 bg-white/60 text-gray-500 hover:bg-white"}`}>{n}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4 px-4">
        <div className="px-1"><p className="text-[10px] font-medium uppercase tracking-widest text-gray-400">{groupedSchedules.length} {groupedSchedules.length === 1 ? "Profissional Disponível" : "Profissionais Disponíveis"}</p></div>

        {groupedSchedules.length === 0 ? (
          <div className="rounded-3xl border border-gray-100 bg-white/40 p-10 text-center backdrop-blur-xl"><p className="text-gray-400 font-medium text-sm">Nenhum atendimento para os filtros aplicados.</p></div>
        ) : (
          groupedSchedules.map(({ doctor, items }) => (
            <button
              key={doctor.id}
              onClick={() => { setSelectedDoctor(doctor); setIsModalOpen(true); }}
              className="w-full rounded-3xl border border-white/80 bg-white/60 p-5 shadow-lg shadow-gray-200/20 backdrop-blur-xl text-left transition-all hover:bg-white/90 active:scale-[0.99]"
            >
              <div className="flex gap-4">
                {/* DOCTOR AVATAR FALLBACK: Círculo com inicial se não houver foto */}
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#22c55e] to-[#16a34a] text-lg font-medium text-white shadow-md border-2 border-white/20 overflow-hidden">
                  {doctor.avatar_url && doctor.avatar_url.trim() !== "" ? (
                    <img src={doctor.avatar_url} className="h-full w-full object-cover" alt="" />
                  ) : (
                    <span>{doctor.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>

                <div className="flex-1 space-y-0.5">
                  <h3 className="text-base font-medium text-gray-800 tracking-tight leading-tight">{doctor.name}</h3>
                  <p className="text-xs font-medium text-[#22c55e]">{doctor.specialty_name}</p>
                  {doctor.phone && (
                    <div className="flex items-center gap-1 text-[10px] font-medium text-gray-400 uppercase tracking-widest leading-none mt-1">
                      <Phone className="h-2.5 w-2.5" />
                      <span>{doctor.phone}</span>
                    </div>
                  )}
                </div>
                <div className="flex h-6 items-center rounded-full bg-[#22c55e]/10 px-2.5 text-[9px] font-medium uppercase tracking-wider text-[#22c55e]">
                  {items.length} {items.length === 1 ? "Atendimento" : "Atendimentos"}
                </div>
              </div>

              <div className="mt-5 space-y-2">
                {items.map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-2xl bg-white/50 px-4 py-2.5 border border-white/80 shadow-sm">
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-700">
                      <Clock className="h-3.5 w-3.5 text-[#22c55e]" />
                      <span>{s.start_time.slice(0, 5)} — {s.end_time.slice(0, 5)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-gray-400 uppercase tracking-widest">
                      <MapPin className="h-3 w-3" />
                      <span>{s.place_name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </button>
          ))
        )}
      </div>

      <DoctorDetailsModal doctor={selectedDoctor} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  )
}
