"use client"

import { useState, useMemo } from "react"
import { useApp } from "@/context/app-context"
import { MapPin, Clock, RefreshCw } from "lucide-react"

const DAYS_OF_WEEK = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]

export function HomeScreen() {
  const { profile, doctors, schedules, neighborhoods: dbNeighborhoods, loadData } = useApp()
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>("Todos")
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Use global neighborhoods from database, with fallback to extracting from schedules
  const neighborhoods = useMemo(() => {
    if (dbNeighborhoods.length > 0) {
      return ["Todos", ...dbNeighborhoods.map((n) => n.name).sort()]
    }
    // Fallback: extract from schedules if no global neighborhoods exist
    const uniqueNeighborhoods = [...new Set(schedules.map((s) => s.neighborhood_name).filter(Boolean))]
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
      await loadData()
    } catch (err) {
      console.log("[v0] Error refreshing data:", err)
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-white/40 bg-white/30 px-4 pb-4 pt-6 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url || "/placeholder.svg"}
                alt={profile.name}
                className="h-12 w-12 rounded-full object-cover shadow-lg"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#22c55e] text-lg font-bold text-white shadow-lg">
                {profile?.avatar || "?"}
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500">{getGreeting()},</p>
              <h1 className="text-xl font-bold text-gray-800">{profile?.name || "Usuário"}</h1>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="rounded-full p-2 text-gray-500 transition-colors hover:bg-white/50"
          >
            <RefreshCw className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3 px-4 py-4">
        {/* Days Filter */}
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
            Dia da Semana
          </p>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedDay(null)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                selectedDay === null
                  ? "bg-[#22c55e] text-white shadow-lg"
                  : "border border-white/60 bg-white/40 text-gray-600 backdrop-blur-sm hover:bg-white/60"
              }`}
            >
              Todos
            </button>
            {DAYS_OF_WEEK.map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  selectedDay === day
                    ? "bg-[#22c55e] text-white shadow-lg"
                    : "border border-white/60 bg-white/40 text-gray-600 backdrop-blur-sm hover:bg-white/60"
                }`}
              >
                {day.substring(0, 3)}
              </button>
            ))}
          </div>
        </div>

        {/* Neighborhoods Filter */}
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Bairro</p>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {neighborhoods.map((neighborhood) => (
              <button
                key={neighborhood}
                onClick={() => setSelectedNeighborhood(neighborhood)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  selectedNeighborhood === neighborhood
                    ? "bg-[#22c55e] text-white shadow-lg"
                    : "border border-white/60 bg-white/40 text-gray-600 backdrop-blur-sm hover:bg-white/60"
                }`}
              >
                {neighborhood}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Schedule Cards */}
      <div className="space-y-3 px-4">
        <p className="text-sm text-gray-500">
          {filteredSchedules.length} {filteredSchedules.length === 1 ? "resultado" : "resultados"}
        </p>

        {filteredSchedules.length === 0 ? (
          <div className="rounded-3xl border border-white/60 bg-white/40 p-8 text-center backdrop-blur-xl">
            <p className="text-gray-500">
              {schedules.length === 0
                ? "Você ainda não tem médicos cadastrados. Vá até a aba Cadastro para adicionar."
                : "Nenhum roteiro encontrado para os filtros selecionados."}
            </p>
          </div>
        ) : (
          filteredSchedules.map((schedule) => {
            const doctor = getDoctorById(schedule.doctor_id)
            if (!doctor) return null

            return (
              <div
                key={schedule.id}
                className="rounded-3xl border border-white/60 bg-white/40 p-4 shadow-lg backdrop-blur-xl transition-all hover:bg-white/50"
              >
                <div className="flex gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#22c55e] to-[#16a34a] text-sm font-bold text-white shadow-md">
                    {doctor.avatar_url || "?"}
                  </div>
                  <div className="flex-1 space-y-1">
                    <h3 className="font-semibold text-gray-800">{doctor.name}</h3>
                    <p className="text-sm text-[#22c55e]">{doctor.specialty_name || "Sem especialidade"}</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 rounded-full bg-white/60 px-3 py-1.5 text-xs text-gray-600">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{schedule.place_name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-white/60 px-3 py-1.5 text-xs text-gray-600">
                    <Clock className="h-3.5 w-3.5" />
                    <span>
                      {schedule.day_of_week} - {schedule.start_time} - {schedule.end_time}
                    </span>
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
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
