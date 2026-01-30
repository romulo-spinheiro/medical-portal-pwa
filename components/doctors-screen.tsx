"use client"

import { useState, useMemo } from "react"
import { useApp, type Doctor, type Schedule } from "@/context/app-context"
import { Search, Filter, ChevronDown, X } from "lucide-react"
import { DoctorDetailsModal } from "@/components/DoctorDetailsModal"
import { Button } from "@/components/ui/button"

const DAYS_OF_WEEK = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]

export function DoctorsScreen() {
  const { doctors, schedules, specialties: dbSpecialties, neighborhoods: dbNeighborhoods, deleteDoctor } = useApp()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSpecialty, setSelectedSpecialty] = useState("Todas")
  const [selectedNeighborhood, setSelectedNeighborhood] = useState("Todos")
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string>("")
  const [showFilters, setShowFilters] = useState(false)

  // Modal states
  // Modal states
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Use database specialties, with fallback to extracted from doctors
  const specialties = useMemo(() => {
    if (dbSpecialties.length > 0) {
      return ["Todas", ...dbSpecialties.map(s => s.name).sort()]
    }
    // Fallback: extract from doctors' specialty_name
    const uniqueSpecialties = [...new Set(doctors.map((d) => d.specialty_name).filter(Boolean))]
    return ["Todas", ...uniqueSpecialties.sort()]
  }, [doctors, dbSpecialties])

  // Use database neighborhoods, with fallback to extracted from schedules
  const neighborhoods = useMemo(() => {
    if (dbNeighborhoods.length > 0) {
      return ["Todos", ...dbNeighborhoods.map(n => n.name).sort()]
    }
    const uniqueNeighborhoods = [...new Set(schedules.map((s) => s.neighborhood_name).filter(Boolean))]
    return ["Todos", ...uniqueNeighborhoods.sort()]
  }, [schedules, dbNeighborhoods])

  const filteredDoctors = useMemo(() => {
    return doctors.filter((doctor) => {
      // Search filter
      const searchMatch =
        !searchQuery ||
        doctor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doctor.specialty_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        doctor.crm.toLowerCase().includes(searchQuery.toLowerCase())

      // Specialty filter
      const specialtyMatch =
        selectedSpecialty === "Todas" || doctor.specialty_name === selectedSpecialty

      // Get doctor's schedules
      const doctorSchedules = schedules.filter((s) => s.doctor_id === doctor.id)

      // Neighborhood filter
      const neighborhoodMatch =
        selectedNeighborhood === "Todos" ||
        doctorSchedules.some((s) => s.neighborhood_name === selectedNeighborhood)

      // Day and time filter
      let dayTimeMatch = true
      if (selectedDay || selectedTime) {
        dayTimeMatch = doctorSchedules.some((s) => {
          const dayMatch = !selectedDay || s.day_of_week.toLowerCase() === selectedDay.toLowerCase()
          let timeMatch = true
          if (selectedTime) {
            const [hours] = selectedTime.split(":")
            const selectedMinutes = parseInt(hours) * 60
            const [startHours] = s.start_time.split(":")
            const [endHours] = s.end_time.split(":")
            const startMinutes = parseInt(startHours) * 60
            const endMinutes = parseInt(endHours) * 60
            timeMatch = selectedMinutes >= startMinutes && selectedMinutes < endMinutes
          }
          return dayMatch && timeMatch
        })
      }

      return searchMatch && specialtyMatch && neighborhoodMatch && dayTimeMatch
    })
  }, [doctors, schedules, searchQuery, selectedSpecialty, selectedNeighborhood, selectedDay, selectedTime])

  const clearFilters = () => {
    setSelectedSpecialty("Todas")
    setSelectedNeighborhood("Todos")
    setSelectedDay(null)
    setSelectedTime("")
  }

  const hasActiveFilters =
    selectedSpecialty !== "Todas" ||
    selectedNeighborhood !== "Todos" ||
    selectedDay ||
    selectedTime

  const getDoctorSchedules = (doctorId: string): Schedule[] => {
    return schedules.filter((s) => s.doctor_id === doctorId)
  }

  const handleDoctorClick = (doctor: Doctor) => {
    setSelectedDoctor(doctor)
    setIsModalOpen(true)
  }

  const selectedDoctorSchedules = selectedDoctor ? getDoctorSchedules(selectedDoctor.id) : []

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-white/40 bg-white/30 px-4 pb-4 pt-6 backdrop-blur-xl">
        <h1 className="mb-4 text-2xl font-bold text-gray-800">Médicos</h1>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar médico, especialidade ou CRM..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-white/60 bg-white/50 py-3 pl-12 pr-4 text-gray-800 placeholder-gray-400 backdrop-blur-sm transition-all focus:border-[#22c55e]/50 focus:bg-white/70 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/20"
          />
        </div>

        {/* Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`mt-3 flex w-full items-center justify-between rounded-2xl border border-white/60 px-4 py-3 transition-all ${showFilters || hasActiveFilters
            ? "bg-[#22c55e]/10 text-[#22c55e]"
            : "bg-white/40 text-gray-600"
            }`}
        >
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            <span className="font-medium">Filtros Avançados</span>
            {hasActiveFilters && (
              <span className="rounded-full bg-[#22c55e] px-2 py-0.5 text-xs text-white">
                Ativos
              </span>
            )}
          </div>
          <ChevronDown
            className={`h-5 w-5 transition-transform ${showFilters ? "rotate-180" : ""}`}
          />
        </button>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-3 space-y-4 rounded-2xl border border-white/60 bg-white/40 p-4 backdrop-blur-xl">
            {/* Specialty */}
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">
                Especialidade
              </label>
              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                className="w-full rounded-xl border border-white/60 bg-white/50 px-4 py-2.5 text-gray-800 backdrop-blur-sm focus:border-[#22c55e]/50 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/20"
              >
                {specialties.map((specialty) => (
                  <option key={specialty} value={specialty}>
                    {specialty}
                  </option>
                ))}
              </select>
            </div>

            {/* Neighborhood */}
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">
                Bairro
              </label>
              <select
                value={selectedNeighborhood}
                onChange={(e) => setSelectedNeighborhood(e.target.value)}
                className="w-full rounded-xl border border-white/60 bg-white/50 px-4 py-2.5 text-gray-800 backdrop-blur-sm focus:border-[#22c55e]/50 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/20"
              >
                {neighborhoods.map((neighborhood) => (
                  <option key={neighborhood} value={neighborhood}>
                    {neighborhood}
                  </option>
                ))}
              </select>
            </div>

            {/* Day + Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">
                  Dia
                </label>
                <select
                  value={selectedDay || ""}
                  onChange={(e) => setSelectedDay(e.target.value || null)}
                  className="w-full rounded-xl border border-white/60 bg-white/50 px-4 py-2.5 text-gray-800 backdrop-blur-sm focus:border-[#22c55e]/50 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/20"
                >
                  <option value="">Todos</option>
                  {DAYS_OF_WEEK.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">
                  Horário
                </label>
                <input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full rounded-xl border border-white/60 bg-white/50 px-4 py-2.5 text-gray-800 backdrop-blur-sm focus:border-[#22c55e]/50 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/20"
                />
              </div>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-100/50 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-200/50"
              >
                <X className="h-4 w-4" />
                Limpar Filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Doctor List */}
      <div className="space-y-3 px-4 py-4">
        <p className="text-sm text-gray-500">
          {filteredDoctors.length} {filteredDoctors.length === 1 ? "médico" : "médicos"}
        </p>

        {filteredDoctors.length === 0 ? (
          <div className="rounded-3xl border border-white/60 bg-white/40 p-8 text-center backdrop-blur-xl">
            <p className="text-gray-500">
              {doctors.length === 0
                ? "Você ainda não tem médicos cadastrados. Vá até a aba Cadastro para adicionar."
                : "Nenhum médico encontrado para os filtros selecionados."}
            </p>
          </div>
        ) : (
          filteredDoctors.map((doctor) => {
            const doctorSchedules = getDoctorSchedules(doctor.id)

            return (
              <button
                key={doctor.id}
                onClick={() => handleDoctorClick(doctor)}
                className="w-full rounded-3xl border border-white/60 bg-white/40 p-4 text-left shadow-lg backdrop-blur-xl transition-all hover:bg-white/60 hover:shadow-xl active:scale-[0.99]"
              >
                <div className="flex gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#22c55e] to-[#16a34a] text-lg font-bold text-white shadow-md">
                    {doctor.avatar_url || "?"}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{doctor.name}</h3>
                    <p className="text-sm text-[#22c55e]">{doctor.specialty_name || "Sem especialidade"}</p>
                    <p className="mt-0.5 text-xs text-gray-400">CRM: {doctor.crm}</p>
                  </div>
                </div>

                {/* Schedules Preview */}
                {doctorSchedules.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-400">
                      {doctorSchedules.length} {doctorSchedules.length === 1 ? "local" : "locais"} de atendimento
                    </p>
                  </div>
                )}
              </button>
            )
          })
        )}
      </div>

      {/* Doctor Details Modal */}
      <DoctorDetailsModal
        doctor={selectedDoctor}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}
