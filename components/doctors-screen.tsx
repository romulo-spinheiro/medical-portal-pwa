"use client"

import { useState, useMemo } from "react"
import { useApp, type Doctor, type Schedule } from "@/context/app-context"
import { Search, Filter, ChevronDown, MapPin, Phone } from "lucide-react"
import { DoctorDetailsModal } from "@/components/DoctorDetailsModal"

export function DoctorsScreen() {
  const { doctors, schedules, specialties: dbSpecialties, neighborhoods: dbNeighborhoods } = useApp()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSpecialty, setSelectedSpecialty] = useState("Todas")
  const [selectedNeighborhood, setSelectedNeighborhood] = useState("Todos")
  const [showFilters, setShowFilters] = useState(false)

  // Modal states
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // 1. BLINDAGEM VISUAL (AGRUPAMENTO): Matematicamente 1 Card por Médico
  const uniqueList = useMemo(() => {
    const uniqueDoctorsMap = new Map<string, any>()

    doctors.forEach((doc) => {
      if (!uniqueDoctorsMap.has(doc.id)) {
        // Primeira vez: Criamos o registro do médico com sua lista de horários
        uniqueDoctorsMap.set(doc.id, {
          ...doc,
          all_schedules: schedules.filter(s => s.doctor_id === doc.id)
        })
      }
    })

    return Array.from(uniqueDoctorsMap.values())
  }, [doctors, schedules])

  // 2. FILTRAGEM (em cima da lista única)
  const filteredDoctors = useMemo(() => {
    return uniqueList.filter((doctor) => {
      const searchMatch =
        !searchQuery ||
        doctor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doctor.specialty_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        doctor.crm.toLowerCase().includes(searchQuery.toLowerCase())

      const specialtyMatch =
        selectedSpecialty === "Todas" || doctor.specialty_name === selectedSpecialty

      const neighborhoodMatch =
        selectedNeighborhood === "Todos" ||
        doctor.all_schedules.some((s: any) => s.neighborhood_name === selectedNeighborhood)

      return searchMatch && specialtyMatch && neighborhoodMatch
    })
  }, [uniqueList, searchQuery, selectedSpecialty, selectedNeighborhood])

  // Get data for filters
  const specialties = useMemo(() => {
    const list = dbSpecialties.length > 0
      ? dbSpecialties.map(s => s.name)
      : Array.from(new Set(doctors.map(d => d.specialty_name).filter(Boolean)))
    return ["Todas", ...list.sort()]
  }, [dbSpecialties, doctors])

  const neighborhoods = useMemo(() => {
    const list = dbNeighborhoods.length > 0
      ? dbNeighborhoods.map(n => n.name)
      : Array.from(new Set(schedules.map(s => s.neighborhood_name).filter(Boolean)))
    return ["Todos", ...list.sort()]
  }, [dbNeighborhoods, schedules])

  const handleDoctorClick = (doctor: Doctor) => {
    setSelectedDoctor(doctor)
    setIsModalOpen(true)
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header & Sticky Search */}
      <div className="sticky top-0 z-40 border-b border-white/40 bg-white/30 px-4 pb-4 pt-6 backdrop-blur-xl">
        <h1 className="mb-4 text-xl font-medium text-gray-800 tracking-tight">Médicos Cadastrados</h1>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, CRM ou especialidade"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-white/60 bg-white/50 py-3 pl-11 pr-4 text-sm font-medium text-gray-800 placeholder-gray-400 backdrop-blur-sm focus:border-[#22c55e]/50 focus:outline-none transition-all"
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`mt-3 flex w-full items-center justify-between rounded-2xl border border-white/60 px-4 py-3 transition-all ${showFilters || selectedSpecialty !== "Todas" || selectedNeighborhood !== "Todos"
              ? "bg-[#22c55e]/5 text-[#22c55e] border-[#22c55e]/30"
              : "bg-white/40 text-gray-500"
            }`}
        >
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span className="text-sm font-medium">Filtrar por Especialidade/Bairro</span>
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${showFilters ? "rotate-180" : ""}`} />
        </button>

        {showFilters && (
          <div className="mt-2 space-y-4 rounded-3xl border border-white/80 bg-white/60 p-4 backdrop-blur-xl animate-in slide-in-from-top-2">
            <div className="space-y-1">
              <label className="text-[10px] font-medium uppercase text-gray-400 px-1">Especialidade</label>
              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                className="w-full h-11 rounded-2xl border border-gray-100 bg-white/80 px-4 text-sm font-medium text-gray-800 outline-none appearance-none"
              >
                {specialties.map(s => <option key={s as string} value={s as string}>{s as string}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium uppercase text-gray-400 px-1">Bairro</label>
              <select
                value={selectedNeighborhood}
                onChange={(e) => setSelectedNeighborhood(e.target.value)}
                className="w-full h-11 rounded-2xl border border-gray-100 bg-white/80 px-4 text-sm font-medium text-gray-800 outline-none appearance-none"
              >
                {neighborhoods.map(n => <option key={n as string} value={n as string}>{n as string}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4 px-4 py-6">
        <p className="px-1 text-[10px] font-medium uppercase tracking-widest text-gray-400">
          {filteredDoctors.length} {filteredDoctors.length === 1 ? "Registro encontrado" : "Registros encontrados"}
        </p>

        {filteredDoctors.length === 0 ? (
          <div className="rounded-3xl border border-gray-100 bg-white/40 p-10 text-center backdrop-blur-sm">
            <p className="text-gray-400 text-sm font-medium">Nenhum médico encontrado com as especificações.</p>
          </div>
        ) : (
          filteredDoctors.map((doctor) => (
            <button
              key={doctor.id}
              onClick={() => handleDoctorClick(doctor)}
              className="w-full rounded-2xl border border-white/80 bg-white/60 p-5 text-left shadow-lg shadow-gray-200/20 backdrop-blur-xl transition-all hover:bg-white/80 hover:scale-[1.01] active:scale-[0.99]"
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
                  <span>Ver agendamentos</span>
                </div>
                <span className="text-[#22c55e] font-medium">Detalhes</span>
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
