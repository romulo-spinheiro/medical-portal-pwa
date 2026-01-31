"use client"

import { useState, useMemo, useEffect, useCallback, useRef } from "react"
import { useApp } from "@/context/app-context"
import { useAuth } from "@/context/AuthContext"
import { createClient } from "@/lib/supabase/client"
import { MapPin, Clock, RefreshCw, Camera, Loader2 } from "lucide-react"

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

  // Fetch profile name and avatar
  const fetchProfileData = useCallback(async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single()

      if (error) {
        setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || "Doutor(a)")
        setAvatarUrl(user.user_metadata?.avatar_url || null)
        return
      }

      if (data) {
        setUserName(data.full_name || user.user_metadata?.full_name || "Doutor(a)")
        setAvatarUrl(data.avatar_url || null)
      }
    } catch (err) {
      console.error("Error loading profile:", err)
      setUserName("Doutor(a)")
    }
  }, [user, supabase])

  useEffect(() => {
    if (user) {
      fetchProfileData()
    }
  }, [user, fetchProfileData])

  // Handle Avatar Click
  const handleAvatarClick = () => {
    if (!isUploading) {
      fileInputRef.current?.click()
    }
  }

  // Handle File Upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setIsUploading(true)
    try {
      // 1. Generate unique file name
      const fileExt = file.name.split('.').pop()
      const fileName = `avatar-${user.id}-${Date.now()}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      // 2. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // 3. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // 4. Update Profile in DB
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      // 5. Update local state
      setAvatarUrl(publicUrl)
    } catch (err: any) {
      console.error("Upload failed:", err.message)
      alert("Falha no upload da imagem. Tente novamente.")
    } finally {
      setIsUploading(false)
      // Reset input value to allow selecting same file again
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const neighborhoods = useMemo(() => {
    if (dbNeighborhoods.length > 0) {
      return ["Todos", ...dbNeighborhoods.map((n) => n.name).sort()]
    }
    const uniqueNeighborhoods = Array.from(new Set(schedules.map((s) => s.neighborhood_name).filter(Boolean))) as string[]
    return ["Todos", ...uniqueNeighborhoods.sort()]
  }, [dbNeighborhoods, schedules])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Bom dia"
    if (hour < 18) return "Boa tarde"
    return "Boa noite"
  }

  const filteredSchedules = useMemo(() => {
    return schedules.filter((schedule) => {
      const dayMatch = !selectedDay || schedule.day_of_week.toLowerCase() === selectedDay.toLowerCase()
      const neighborhoodMatch =
        selectedNeighborhood === "Todos" || schedule.neighborhood_name === selectedNeighborhood
      return dayMatch && neighborhoodMatch
    })
  }, [schedules, selectedDay, selectedNeighborhood])

  const getDoctorById = (doctorId: string) => {
    return doctors.find((d) => d.id === doctorId)
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([
        loadData(),
        fetchProfileData()
      ])
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-white/40 bg-white/30 px-4 pb-4 pt-6 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleAvatarClick}
              disabled={isUploading}
              className="group relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#22c55e] to-[#16a34a] text-base font-medium text-white shadow-md border-2 border-white ring-4 ring-[#22c55e]/5 overflow-hidden transition-transform active:scale-90"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Perfil"
                  className={`h-full w-full object-cover transition-opacity ${isUploading ? 'opacity-30' : 'opacity-100'}`}
                />
              ) : (
                <span className={isUploading ? 'opacity-0' : 'opacity-100'}>
                  {userName ? userName[0].toUpperCase() : "?"}
                </span>
              )}

              {/* Hover/Loading Overlay */}
              <div className={`absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100 ${isUploading ? 'opacity-100' : ''}`}>
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : (
                  <Camera className="h-4 w-4 text-white" />
                )}
              </div>
            </button>
            <div>
              <h1 className="text-lg font-medium text-gray-800 tracking-tight leading-tight">
                {getGreeting()}, <span className="text-[#22c55e]">{userName || "Doutor(a)"}</span>
              </h1>
              <p className="text-[10px] font-medium uppercase tracking-widest text-gray-400">Meu Roteiro Diário</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/60 text-gray-400 shadow-sm border border-white/80 transition-all hover:bg-white hover:text-[#22c55e]"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="space-y-4 px-4 py-6">
        <div className="space-y-2">
          <p className="px-1 text-[10px] font-medium uppercase tracking-widest text-gray-400">
            Filtro por Dia
          </p>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedDay(null)}
              className={`shrink-0 rounded-2xl px-5 py-2 text-xs font-medium transition-all ${selectedDay === null
                ? "bg-[#22c55e] text-white shadow-md"
                : "border border-gray-100 bg-white/60 text-gray-500 hover:bg-white"
                }`}
            >
              Todos
            </button>
            {DAYS_OF_WEEK.map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                className={`shrink-0 rounded-2xl px-5 py-2 text-xs font-medium transition-all ${selectedDay === day
                  ? "bg-[#22c55e] text-white shadow-md"
                  : "border border-gray-100 bg-white/60 text-gray-500 hover:bg-white"
                  }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="px-1 text-[10px] font-medium uppercase tracking-widest text-gray-400">Filtro por Bairro</p>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {neighborhoods.map((neighborhood) => (
              <button
                key={neighborhood}
                onClick={() => setSelectedNeighborhood(neighborhood)}
                className={`shrink-0 rounded-2xl px-5 py-2 text-xs font-medium transition-all ${selectedNeighborhood === neighborhood
                  ? "bg-[#22c55e] text-white shadow-md"
                  : "border border-gray-100 bg-white/60 text-gray-500 hover:bg-white"
                  }`}
              >
                {neighborhood}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4 px-4">
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="text-[10px] font-medium uppercase tracking-widest text-gray-400">
            {filteredSchedules.length} {filteredSchedules.length === 1 ? "Escala encontrada" : "Escalas encontradas"}
          </p>
        </div>

        {filteredSchedules.length === 0 ? (
          <div className="rounded-3xl border border-gray-100 bg-white/40 p-10 text-center backdrop-blur-xl">
            <p className="text-gray-400 font-medium text-sm">
              Nada para exibir hoje.
            </p>
          </div>
        ) : (
          filteredSchedules.map((schedule) => {
            const doctor = getDoctorById(schedule.doctor_id)
            if (!doctor) return null

            return (
              <div
                key={schedule.id}
                className="rounded-3xl border border-white/80 bg-white/60 p-5 shadow-lg shadow-gray-200/30 backdrop-blur-xl transition-all hover:bg-white/80"
              >
                <div className="flex gap-4">
                  <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#22c55e] to-[#16a34a] text-sm font-medium text-white shadow-md border-2 border-white/20">
                    {doctor.avatar_url || "?"}
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <h3 className="text-base font-medium text-gray-800 tracking-tight leading-tight">{doctor.name}</h3>
                    <p className="text-xs font-medium text-[#22c55e]">{doctor.specialty_name || "Sem especialidade"}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <div className="flex items-center gap-2 rounded-2xl bg-white/80 px-4 py-2 text-xs font-medium text-gray-700 border border-gray-100">
                    <MapPin className="h-3.5 w-3.5 text-[#22c55e]" />
                    <span>{schedule.place_name}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl bg-white/80 px-4 py-2 text-xs font-medium text-gray-700 border border-gray-100">
                    <Clock className="h-3.5 w-3.5 text-[#22c55e]" />
                    <span className="capitalize">
                      {schedule.day_of_week} • {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2 px-1 text-[10px] font-medium uppercase tracking-widest text-gray-400">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#22c55e]/30"></div>
                  <span>{schedule.neighborhood_name || "Sem bairro"}</span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
