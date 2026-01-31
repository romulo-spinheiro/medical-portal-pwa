"use client"

import { useState, useMemo } from "react"
import { useApp, type Doctor, type Schedule } from "@/context/app-context"
import { Search, Filter, ChevronDown, X, MapPin, Phone } from "lucide-react"
import { DoctorDetailsModal } from "@/components/DoctorDetailsModal"

const DAYS_OF_WEEK = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]

export function DoctorsScreen() {
  const { doctors, schedules, specialties: dbSpecialties, neighborhoods: dbNeighborhoods } = useApp()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSpecialty, setSelectedSpecialty] = useState("Todas")
  const [selectedNeighborhood, setSelectedNeighborhood] = useState("Todos")
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string>("")
  const [showFilters, setShowFilters] = useState(false)

  // Modal states
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const specialties = useMemo(() => {
    if (dbSpecialties.length > 0) {
      return ["Todas", ...dbSpecialties.map(s => s.name).sort()]
    }
    const uniqueSpecialties = Array.from(new Set(doctors.map((d) => d.specialty_name).filter(Boolean)))
    return ["Todas", ...uniqueSpecialties.sort()]
  }, [doctors, dbSpecialties])

  const neighborhoods = useMemo(() => {
    if (dbNeighborhoods.length > 0) {
      return ["Todos", ...dbNeighborhoods.map(n => n.name).sort()]
    }
    const uniqueNeighborhoods = Array.from(new Set(schedules.map((s) => s.neighborhood_name).filter(Boolean)))
    return ["Todos", ...uniqueNeighborhoods.sort()]
  }, [schedules, dbNeighborhoods])

  // ANTI-DUPLICATION LOGIC: 1 Card per Doctor ID
  const filteredDoctors = useMemo(() => {
    // 1. Group by ID to ensure a unique list
    const doctorsMap = new Map<string, Doctor>()
    doctors.forEach(doctor => {
      if (!doctorsMap.has(doctor.id)) {
        doctorsMap.set(doctor.id, doctor)
      }
    })

    const uniqueDoctors = Array.from(doctorsMap.values())

    // 2. Filter the unique list
    return uniqueDoctors.filter((doctor) => {
      const searchMatch =
        !searchQuery ||
        doctor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doctor.specialty_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        doctor.crm.toLowerCase().includes(searchQuery.toLowerCase())

      const specialtyMatch =
        selectedSpecialty === "Todas" || doctor.specialty_name === selectedSpecialty

      const doctorSchedules = schedules.filter((s) => s.doctor_id === doctor.id)

      const neighborhoodMatch =
        selectedNeighborhood === "Todos" ||
        doctorSchedules.some((s) => s.neighborhood_name === selectedNeighborhood)

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

  const handleDoctorClick = (doctor: Doctor) => {
    setSelectedDoctor(doctor)
    setIsModalOpen(true)
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header & Search */}
      <div className="sticky top-0 z-40 border-b border-white/40 bg-white/30 px-4 pb-4 pt-6 backdrop-blur-xl">
        <h1 className="mb-4 text-xl font-medium text-gray-800 tracking-tight">Equipe Médica</h1>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por médico, especialidade ou CRM"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-white/60 bg-white/50 py-3 pl-11 pr-4 text-sm font-medium text-gray-800 placeholder-gray-400 backdrop-blur-sm focus:border-[#22c55e]/50 focus:outline-none transition-all"
          />
        </div>

        {/* Filters Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`mt-3 flex w-full items-center justify-between rounded-2xl border border-white/60 px-4 py-3 transition-all ${showFilters || selectedSpecialty !== "Todas" || selectedNeighborhood !== "Todos"
              ? "bg-[#22c55e]/5 text-[#22c55e] border-[#22c55e]/20"
              : "bg-white/40 text-gray-500"
            }`}
        >
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span className="text-sm font-medium">Filtrar por Especialidade ou Bairro</span>
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${showFilters ? "rotate-180" : ""}`} />
        </button>

        {showFilters && (
          <div className="mt-2 space-y-4 rounded-3xl border border-white/80 bg-white/60 p-4 backdrop-blur-xl animate-in slide-in-from-top-2">
            <div className="space-y-1">
              <label className="text-[10px] font-medium uppercase text-gray-400 px-1 tracking-wider">Especialidade</label>
              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                className="w-full rounded-2xl border border-gray-100 bg-white/80 px-4 py-2.5 text-sm font-medium text-gray-800 outline-none appearance-none"
              >
                {specialties.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium uppercase text-gray-400 px-1 tracking-wider">Bairro</label>
              <select
                value={selectedNeighborhood}
                onChange={(e) => setSelectedNeighborhood(e.target.value)}
                className="w-full rounded-2xl border border-gray-100 bg-white/80 px-4 py-2.5 text-sm font-medium text-gray-800 outline-none appearance-none"
              >
                {neighborhoods.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4 px-4 py-6">
        <p className="px-1 text-[10px] font-medium uppercase tracking-widest text-gray-400">
          {filteredDoctors.length} {filteredDoctors.length === 1 ? "médico encontrado" : "médicos encontrados"}
        </p>

        {filteredDoctors.length === 0 ? (
          <div className="rounded-3xl border border-gray-100 bg-white/40 p-10 text-center">
            <p className="text-gray-400 text-sm font-medium">Nenhum médico disponível com estes filtros.</p>
          </div>
        ) : (
          filteredDoctors.map((doctor) => (
            <button
              key={doctor.id}
              onClick={() => handleDoctorClick(doctor)}
              className="w-full rounded-2xl border border-white/80 bg-white/60 p-5 text-left shadow-lg shadow-gray-200/20 backdrop-blur-xl transition-all hover:bg-white/80 active:scale-[0.99]"
            >
              <div className="flex gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#22c55e] to-[#16a34a] text-lg font-medium text-white shadow-md border-2 border-white/20">
                  {doctor.avatar_url || "?"}
                </div>
                <div className="flex-1 space-y-0.5">
                  <h3 className="text-base font-medium text-gray-800 tracking-tight leading-tight">{doctor.name}</h3>
                  <p className="text-xs font-medium text-[#22c55e]">{doctor.specialty_name}</p>
                  <div className="flex items-center gap-2 text-[10px] font-medium text-gray-400 uppercase tracking-widest">
                    <span>CRM: {doctor.crm}</span>
                    {doctor.phone && (
                      <>
                        <span className="text-gray-200">•</span>
                        <div className="flex items-center gap-1">
                          <Phone className="h-2.5 w-2.5" />
                          <span>{doctor.phone}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100/50 flex items-center justify-between text-[10px] font-medium text-gray-500 uppercase tracking-widest">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3 w-3 text-[#22c55e]/60" />
                  <span>Múltiplos locais e horários</span>
                </div>
                <span className="text-[#22c55e] font-medium">Ver horários →</span>
              </div>
            </button>
          ))
        )}
      </div>

      <DoctorDetailsModal
        doctor={selectedDoctor}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}
