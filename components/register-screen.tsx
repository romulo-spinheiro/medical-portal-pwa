"use client"

import React from "react"
import { useState, useRef } from "react"
import { useApp } from "@/context/app-context"
import { Plus, Trash2, CheckCircle, User, Stethoscope, Loader2, Camera, X } from "lucide-react"

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

export function RegisterScreen() {
  const { addDoctor, specialties, neighborhoods, addSpecialty, addNeighborhood, profile, updateProfileAvatar } = useApp()
  const [name, setName] = useState("")
  const [crm, setCrm] = useState("")
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

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingAvatar(true)
    try {
      const result = await updateProfileAvatar(file)
      if (result.error) {
        setErrors({ avatar: result.error })
      }
    } catch (err) {
      console.log("[v0] Error uploading avatar:", err)
      setErrors({ avatar: "Erro ao enviar imagem" })
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleAddSpecialty = async () => {
    if (!newSpecialty.trim()) return

    setIsAddingSpecialty(true)
    try {
      const result = await addSpecialty(newSpecialty.trim())

      if (result.error) {
        setErrors({ specialty: result.error })
      } else if (result.data) {
        // Select the newly created specialty by its ID
        setSelectedSpecialtyId(Number(result.data.id))
        setNewSpecialty("")
        setShowNewSpecialty(false)
      }
    } catch (err) {
      console.log("[v0] Error adding specialty:", err)
      setErrors({ specialty: "Erro ao adicionar especialidade" })
    } finally {
      setIsAddingSpecialty(false)
    }
  }

  const handleAddNeighborhood = async (slotId: string) => {
    if (!newNeighborhood.trim()) return

    setIsAddingNeighborhood(true)
    try {
      const result = await addNeighborhood(newNeighborhood.trim())

      if (result.error) {
        setErrors({ neighborhood: result.error })
      } else if (result.data) {
        // Select the newly created neighborhood by its ID
        updateSlot(slotId, "neighborhood_id", Number(result.data.id))
        setNewNeighborhood("")
        setShowNewNeighborhood(null)
      }
    } catch (err) {
      console.log("[v0] Error adding neighborhood:", err)
      setErrors({ neighborhood: "Erro ao adicionar bairro" })
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

  const updateSlot = (id: string, field: keyof ServiceSlot, value: string | string[] | number | null) => {
    setSlots(slots.map((slot) => (slot.id === id ? { ...slot, [field]: value } : slot)))
  }

  const toggleDay = (slotId: string, dayValue: string) => {
    setSlots(slots.map((slot) => {
      if (slot.id !== slotId) return slot
      const currentDays = slot.days_of_week
      const newDays = currentDays.includes(dayValue)
        ? currentDays.filter((d) => d !== dayValue)
        : [...currentDays, dayValue]
      return { ...slot, days_of_week: newDays }
    }))
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!name.trim()) newErrors.name = "Nome é obrigatório"
    if (!crm.trim()) newErrors.crm = "CRM é obrigatório"
    if (!selectedSpecialtyId) newErrors.specialty = "Especialidade é obrigatória"

    slots.forEach((slot, index) => {
      if (!slot.place_name.trim())
        newErrors[`slot-${index}-place_name`] = "Local é obrigatório"
      if (!slot.neighborhood_id) newErrors[`slot-${index}-neighborhood`] = "Bairro é obrigatório"
      if (slot.days_of_week.length === 0) newErrors[`slot-${index}-days_of_week`] = "Selecione ao menos um dia"
      if (!slot.start_time) newErrors[`slot-${index}-start_time`] = "Início é obrigatório"
      if (!slot.end_time) newErrors[`slot-${index}-end_time`] = "Fim é obrigatório"
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    // CRITICAL VALIDATION: Ensure IDs are valid numbers before submitting
    if (typeof selectedSpecialtyId !== "number" || isNaN(selectedSpecialtyId)) {
      setErrors({ specialty: "Selecione uma especialidade válida" })
      return
    }

    // Validate all neighborhood IDs are valid numbers
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i]
      if (typeof slot.neighborhood_id !== "number" || isNaN(slot.neighborhood_id)) {
        setErrors({ [`slot-${i}-neighborhood`]: "Selecione um bairro válido" })
        return
      }
    }

    setIsSubmitting(true)

    try {
      const initials = name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()

      // Expand slots with multiple days into separate schedule entries
      // Use neighborhood_id (not neighborhood string) for database column
      const expandedSchedules = slots.flatMap((slot) =>
        slot.days_of_week.map((day) => ({
          place_name: slot.place_name,
          neighborhood_id: slot.neighborhood_id!, // CRITICAL: Use neighborhood_id, not neighborhood
          day_of_week: day,
          start_time: slot.start_time,
          end_time: slot.end_time,
        }))
      )

      const result = await addDoctor(
        {
          name,
          crm,
          specialty_id: selectedSpecialtyId!,
          avatar_url: initials, // Database column is avatar_url
        },
        expandedSchedules
      )

      if (result.error) {
        setErrors({ submit: result.error })
        return
      }

      // Reset form on success
      setName("")
      setCrm("")
      setSelectedSpecialtyId(null)
      setSlots([
        {
          id: "1",
          place_name: "",
          neighborhood_id: null,
          days_of_week: [],
          start_time: "",
          end_time: "",
        },
      ])
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.log("[v0] Doctor registration error:", err)
      setErrors({ submit: "Erro ao cadastrar médico. Tente novamente." })
    } finally {
      // CRITICAL: Always unlock the UI
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-white/40 bg-white/30 px-4 pb-4 pt-6 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          {/* Profile Avatar */}
          <div className="relative">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={handleAvatarClick}
              disabled={isUploadingAvatar}
              className="relative h-14 w-14 overflow-hidden rounded-full border-2 border-white/60 bg-linear-to-br from-[#22c55e] to-[#16a34a] shadow-lg transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/50"
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url || "/placeholder.svg"}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-lg font-bold text-white">
                  {profile?.avatar || "?"}
                </span>
              )}
              {isUploadingAvatar ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all hover:bg-black/30 hover:opacity-100">
                  <Camera className="h-5 w-5 text-white" />
                </div>
              )}
            </button>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Cadastrar Médico</h1>
            <p className="text-sm text-gray-500">
              Adicione um novo médico e seus locais
            </p>
          </div>
        </div>
        {errors.avatar && (
          <p className="mt-2 text-xs text-red-500">{errors.avatar}</p>
        )}
      </div>

      {/* Success Message */}
      {success && (
        <div className="mx-4 mt-4 flex items-center gap-3 rounded-2xl bg-[#22c55e]/10 p-4 text-[#22c55e]">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">Médico cadastrado com sucesso!</span>
        </div>
      )}

      {/* Error Message */}
      {errors.submit && (
        <div className="mx-4 mt-4 rounded-2xl bg-red-50/80 p-4 text-center text-sm text-red-600">
          {errors.submit}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6 p-4">
        {/* Doctor Info Card */}
        <div className="rounded-3xl border border-white/60 bg-white/40 p-4 shadow-lg backdrop-blur-xl">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-800">
            <User className="h-5 w-5 text-[#22c55e]" />
            Informações do Médico
          </h2>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">
                Nome Completo
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. João da Silva"
                className={`w-full rounded-xl border bg-white/50 px-4 py-3 text-gray-800 placeholder-gray-400 backdrop-blur-sm transition-all focus:bg-white/70 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/20 ${errors.name ? "border-red-400" : "border-white/60"
                  }`}
              />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
            </div>

            {/* CRM */}
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">
                CRM
              </label>
              <input
                type="text"
                value={crm}
                onChange={(e) => setCrm(e.target.value)}
                placeholder="12345-MA"
                className={`w-full rounded-xl border bg-white/50 px-4 py-3 text-gray-800 placeholder-gray-400 backdrop-blur-sm transition-all focus:bg-white/70 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/20 ${errors.crm ? "border-red-400" : "border-white/60"
                  }`}
              />
              {errors.crm && <p className="mt-1 text-xs text-red-500">{errors.crm}</p>}
            </div>

            {/* Specialty */}
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">
                Especialidade
              </label>
              {showNewSpecialty ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSpecialty}
                    onChange={(e) => setNewSpecialty(e.target.value)}
                    placeholder="Nova especialidade"
                    className="flex-1 rounded-xl border border-white/60 bg-white/50 px-4 py-3 text-gray-800 placeholder-gray-400 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]/20"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleAddSpecialty}
                    disabled={isAddingSpecialty || !newSpecialty.trim()}
                    className="flex items-center justify-center rounded-xl bg-[#22c55e] px-4 text-white transition-all hover:bg-[#16a34a] disabled:opacity-50"
                  >
                    {isAddingSpecialty ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Plus className="h-5 w-5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewSpecialty(false)
                      setNewSpecialty("")
                    }}
                    className="flex items-center justify-center rounded-xl bg-gray-200 px-3 text-gray-600 transition-all hover:bg-gray-300"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <select
                      value={selectedSpecialtyId ?? ""}
                      onChange={(e) => setSelectedSpecialtyId(e.target.value ? Number(e.target.value) : null)}
                      className={`flex-1 rounded-xl border bg-white/50 px-4 py-3 text-gray-800 backdrop-blur-sm transition-all focus:bg-white/70 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/20 ${errors.specialty ? "border-red-400" : "border-white/60"
                        }`}
                    >
                      <option value="">
                        {specialties.length === 0
                          ? "Nenhuma especialidade cadastrada"
                          : "Selecione uma especialidade"}
                      </option>
                      {specialties.map((spec) => (
                        <option key={spec.id} value={spec.id}>
                          {spec.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowNewSpecialty(true)}
                      className="flex items-center justify-center rounded-xl border border-[#22c55e]/30 bg-[#22c55e]/10 px-3 text-[#22c55e] transition-all hover:bg-[#22c55e]/20"
                      title="Adicionar nova especialidade"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                  {specialties.length === 0 && (
                    <p className="text-xs text-gray-400">
                      Clique no botão + para cadastrar uma nova especialidade
                    </p>
                  )}
                </div>
              )}
              {errors.specialty && (
                <p className="mt-1 text-xs text-red-500">{errors.specialty}</p>
              )}
            </div>
          </div>
        </div>

        {/* Service Slots */}
        <div className="rounded-3xl border border-white/60 bg-white/40 p-4 shadow-lg backdrop-blur-xl">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-800">
            <Stethoscope className="h-5 w-5 text-[#22c55e]" />
            Locais de Atendimento
          </h2>

          <div className="space-y-4">
            {slots.map((slot, index) => (
              <div
                key={slot.id}
                className="relative rounded-2xl border border-white/40 bg-white/30 p-4"
              >
                {slots.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSlot(slot.id)}
                    className="absolute right-2 top-2 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}

                <p className="mb-3 text-xs font-medium text-gray-500">Local {index + 1}</p>

                <div className="space-y-3">
                  {/* Place Name */}
                  <input
                    type="text"
                    value={slot.place_name}
                    onChange={(e) => updateSlot(slot.id, "place_name", e.target.value)}
                    placeholder="Nome do Local (ex: Clínica Central)"
                    className={`w-full rounded-xl border bg-white/50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]/20 ${errors[`slot-${index}-place_name`] ? "border-red-400" : "border-white/60"
                      }`}
                  />

                  {/* Neighborhood */}
                  {showNewNeighborhood === slot.id ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newNeighborhood}
                        onChange={(e) => setNewNeighborhood(e.target.value)}
                        placeholder="Novo bairro"
                        className="flex-1 rounded-xl border border-white/60 bg-white/50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]/20"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleAddNeighborhood(slot.id)}
                        disabled={isAddingNeighborhood || !newNeighborhood.trim()}
                        className="flex items-center justify-center rounded-xl bg-[#22c55e] px-3 text-white transition-all hover:bg-[#16a34a] disabled:opacity-50"
                      >
                        {isAddingNeighborhood ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewNeighborhood(null)
                          setNewNeighborhood("")
                        }}
                        className="flex items-center justify-center rounded-xl bg-gray-200 px-2 text-gray-600 transition-all hover:bg-gray-300"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex gap-2">
                        <select
                          value={slot.neighborhood_id ?? ""}
                          onChange={(e) => updateSlot(slot.id, "neighborhood_id", e.target.value ? Number(e.target.value) : null)}
                          className={`flex-1 rounded-xl border bg-white/50 px-4 py-2.5 text-sm text-gray-800 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]/20 ${errors[`slot-${index}-neighborhood`] ? "border-red-400" : "border-white/60"
                            }`}
                        >
                          <option value="">
                            {neighborhoods.length === 0
                              ? "Nenhum bairro cadastrado"
                              : "Selecione o bairro"}
                          </option>
                          {neighborhoods.map((n) => (
                            <option key={n.id} value={n.id}>
                              {n.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setShowNewNeighborhood(slot.id)}
                          className="flex items-center justify-center rounded-xl border border-[#22c55e]/30 bg-[#22c55e]/10 px-2 text-[#22c55e] transition-all hover:bg-[#22c55e]/20"
                          title="Adicionar novo bairro"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      {neighborhoods.length === 0 && index === 0 && (
                        <p className="text-xs text-gray-400">
                          Clique no botão + para cadastrar um novo bairro
                        </p>
                      )}
                    </div>
                  )}

                  {/* Days - Multi-Select Toggle */}
                  <div>
                    <label className="mb-2 block text-xs text-gray-500">Dias de Atendimento</label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map((day) => {
                        const isSelected = slot.days_of_week.includes(day.value)
                        return (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => toggleDay(slot.id, day.value)}
                            className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${isSelected
                                ? "bg-[#22c55e] text-white shadow-md"
                                : "border border-white/60 bg-white/50 text-gray-600 hover:bg-white/70"
                              } ${errors[`slot-${index}-days_of_week`] && !isSelected
                                ? "border-red-300"
                                : ""
                              }`}
                          >
                            {day.short}
                          </button>
                        )
                      })}
                    </div>
                    {errors[`slot-${index}-days_of_week`] && (
                      <p className="mt-1 text-xs text-red-500">{errors[`slot-${index}-days_of_week`]}</p>
                    )}
                  </div>

                  {/* Time Range */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-xs text-gray-500">Início</label>
                      <input
                        type="time"
                        value={slot.start_time}
                        onChange={(e) => updateSlot(slot.id, "start_time", e.target.value)}
                        className={`w-full rounded-xl border bg-white/50 px-3 py-2.5 text-sm text-gray-800 backdrop-blur-sm transition-all focus:bg-white/70 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/20 ${errors[`slot-${index}-start_time`]
                            ? "border-red-400"
                            : "border-white/60"
                          }`}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-500">Fim</label>
                      <input
                        type="time"
                        value={slot.end_time}
                        onChange={(e) => updateSlot(slot.id, "end_time", e.target.value)}
                        className={`w-full rounded-xl border bg-white/50 px-3 py-2.5 text-sm text-gray-800 backdrop-blur-sm transition-all focus:bg-white/70 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/20 ${errors[`slot-${index}-end_time`]
                            ? "border-red-400"
                            : "border-white/60"
                          }`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Add Slot Button */}
            <button
              type="button"
              onClick={addSlot}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/60 py-3 text-sm font-medium text-gray-500 transition-all hover:border-[#22c55e]/50 hover:bg-[#22c55e]/5 hover:text-[#22c55e]"
            >
              <Plus className="h-4 w-4" />
              Adicionar Outro Local
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[#22c55e] py-4 font-semibold text-white shadow-lg transition-all hover:bg-[#16a34a] hover:shadow-xl active:scale-[0.98] disabled:opacity-70"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Cadastrando...
            </>
          ) : (
            "Cadastrar Médico"
          )}
        </button>
      </form>
    </div>
  )
}
