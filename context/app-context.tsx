"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import { useAuth } from "./AuthContext"

// Types
export interface Profile {
  id: string
  name: string
  avatar: string
  avatar_url: string | null
}

export interface Doctor {
  id: string
  name: string
  specialty_id: number // Foreign key to specialties table
  specialty_name?: string // Joined from specialties table for display
  crm: string
  phone: string // New field
  avatar_url: string // Database column for initials
  user_id: string
}

export interface Schedule {
  id: string
  doctor_id: string
  place_name: string
  neighborhood_id: number // Foreign key to neighborhoods table
  neighborhood_name?: string // Joined for display
  day_of_week: string
  start_time: string
  end_time: string
}

export interface Specialty {
  id: string
  name: string
}

export interface Neighborhood {
  id: string
  name: string
}

interface AppContextType {
  user: User | null
  profile: Profile | null
  isLoading: boolean // This now represents overall loading (auth + app data)
  login: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>
  logout: () => Promise<void>
  doctors: Doctor[]
  schedules: Schedule[]
  specialties: Specialty[]
  neighborhoods: Neighborhood[]
  loadData: () => Promise<void>
  addDoctor: (
    doctor: Omit<Doctor, "id" | "user_id" | "specialty_name">,
    schedules: Omit<Schedule, "id" | "doctor_id" | "neighborhood_name">[]
  ) => Promise<{ error: string | null }>
  updateDoctor: (
    doctorId: string,
    doctor: Omit<Doctor, "id" | "user_id" | "specialty_name">,
    schedules: Omit<Schedule, "id" | "doctor_id" | "neighborhood_name">[]
  ) => Promise<{ error: string | null }>
  deleteDoctor: (doctorId: string) => Promise<{ error: string | null }>
  getDoctorById: (doctorId: string) => Doctor | undefined
  getSchedulesByDoctorId: (doctorId: string) => Schedule[]
  addSpecialty: (name: string) => Promise<{ data: Specialty | null; error: string | null }>
  addNeighborhood: (name: string) => Promise<{ data: Neighborhood | null; error: string | null }>
  updateProfileAvatar: (file: File) => Promise<{ error: string | null }>
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading, login, signUp, logout } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [appDataLoading, setAppDataLoading] = useState(true) // New state for app-specific data loading
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([])

  const supabase = createClient()

  // Load profile data from Auth metadata (NOT from profiles table to avoid 400)
  const loadProfile = useCallback(async (userId: string) => {
    try {
      // Usa apenas os metadados do Auth (sem query na tabela profiles)
      if (user) {
        const metadataName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0]
        const metadataAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture

        setProfile({
          id: userId,
          name: metadataName || "Usuário",
          avatar: metadataName ? metadataName[0].toUpperCase() : "?",
          avatar_url: metadataAvatar || null,
        })
      } else {
        setProfile(null)
      }
    } catch (err) {
      console.log("[loadProfile] Unexpected error:", err)
      setProfile(null)
    }
  }, [user])

  // Specialties and Neighborhoods are GLOBAL (shared by all users) - no user_id filter
  const loadSpecialtiesAndNeighborhoods = useCallback(async () => {
    try {
      const [specialtiesRes, neighborhoodsRes] = await Promise.all([
        supabase
          .from("specialties")
          .select("*")
          .order("name"),
        supabase
          .from("neighborhoods")
          .select("*")
          .order("name"),
      ])

      // Set to empty array if no data (not an error, just empty)
      setSpecialties(specialtiesRes.data || [])
      setNeighborhoods(neighborhoodsRes.data || [])
    } catch (err) {
      console.log("[v0] Error loading specialties/neighborhoods:", err)
      // Set empty arrays on error so UI still works
      setSpecialties([])
      setNeighborhoods([])
    }
  }, [supabase])

  const loadData = useCallback(async () => {
    if (!user) {
      setDoctors([])
      setSchedules([])
      setAppDataLoading(false)
      return
    }

    setAppDataLoading(true)
    try {
      // =====================================================================
      // QUERY 1: Load ALL specialties (simple, no joins)
      // =====================================================================
      const { data: specsData } = await supabase
        .from("specialties")
        .select("id, name")
        .order("name")

      const loadedSpecialties = specsData || []
      setSpecialties(loadedSpecialties)

      // =====================================================================
      // QUERY 2: Load ALL neighborhoods (simple, no joins)
      // =====================================================================
      const { data: neighsData } = await supabase
        .from("neighborhoods")
        .select("id, name")
        .order("name")

      const loadedNeighborhoods = neighsData || []
      setNeighborhoods(loadedNeighborhoods)

      // =====================================================================
      // QUERY 3: Load doctors for current user (simple, no joins)
      // =====================================================================
      const { data: doctorsData, error: doctorsError } = await supabase
        .from("doctors")
        .select("id, name, crm, phone, specialty_id, avatar_url, user_id")
        .eq("user_id", user.id)
        .order("name")

      if (doctorsError) {
        console.log("[loadData] Error loading doctors:", doctorsError.message)
        setDoctors([])
        setSchedules([])
        return
      }

      // Map doctors with specialty names (from loaded data, not state)
      const mappedDoctors = (doctorsData || []).map((d: any) => {
        const specName = loadedSpecialties.find(s => Number(s.id) === d.specialty_id)?.name || "Sem especialidade"
        return {
          id: d.id,
          name: d.name,
          specialty_id: d.specialty_id,
          specialty_name: specName,
          crm: d.crm || "",
          phone: d.phone || "",
          avatar_url: d.avatar_url || "",
          user_id: d.user_id,
        }
      })
      setDoctors(mappedDoctors)

      // =====================================================================
      // QUERY 4: Load schedules for these doctors (simple, no joins)
      // =====================================================================
      const doctorIds = mappedDoctors.map((d: any) => d.id)
      if (doctorIds.length > 0) {
        const { data: schedulesData, error: schedulesError } = await supabase
          .from("schedules")
          .select("id, doctor_id, place_name, neighborhood_id, day_of_week, start_time, end_time")
          .in("doctor_id", doctorIds)

        if (schedulesError) {
          console.log("[loadData] Error loading schedules:", schedulesError.message)
          setSchedules([])
        } else {
          // Map schedules with neighborhood names (from loaded data, not state)
          const mappedSchedules = (schedulesData || []).map((s: any) => {
            const neighName = loadedNeighborhoods.find(n => Number(n.id) === s.neighborhood_id)?.name || "Sem bairro"
            return {
              id: s.id,
              doctor_id: s.doctor_id,
              place_name: s.place_name || "",
              neighborhood_id: s.neighborhood_id,
              neighborhood_name: neighName,
              day_of_week: s.day_of_week || "",
              start_time: s.start_time || "",
              end_time: s.end_time || "",
            }
          })
          setSchedules(mappedSchedules)
        }
      } else {
        setSchedules([])
      }
    } catch (err) {
      console.log("[loadData] Unexpected error:", err)
      setDoctors([])
      setSchedules([])
    } finally {
      setAppDataLoading(false)
    }
  }, [user, supabase])

  // Load profile and user-specific data when user changes
  useEffect(() => {
    if (user) {
      loadProfile(user.id)
      loadData()
    } else {
      setProfile(null)
      setDoctors([])
      setSchedules([])
      setAppDataLoading(false) // Ensure loading state is false when no user
    }
  }, [user, loadProfile, loadData])

  // Initial load for global data (specialties and neighborhoods)
  useEffect(() => {
    loadSpecialtiesAndNeighborhoods()
  }, [loadSpecialtiesAndNeighborhoods])

  const isLoading = authLoading || appDataLoading

  const addDoctor = async (
    doctor: Omit<Doctor, "id" | "user_id" | "specialty_name">,
    newSchedules: Omit<Schedule, "id" | "doctor_id" | "neighborhood_name">[]
  ): Promise<{ error: string | null }> => {
    if (!user) return { error: "Usuário não autenticado" }

    try {
      // Insert doctor with correct column names: specialty_id (int), avatar_url (text), user_id (uuid)
      const { data: newDoctor, error: doctorError } = await supabase
        .from("doctors")
        .insert({
          name: doctor.name,
          crm: doctor.crm,
          phone: doctor.phone,
          specialty_id: doctor.specialty_id,
          avatar_url: doctor.avatar_url,
          user_id: user.id,
        })
        .select()
        .single()

      if (doctorError) {
        return { error: doctorError.message }
      }

      // Insert schedules with correct column names: neighborhood_id (not neighborhood)
      if (newSchedules.length > 0) {
        const schedulesToInsert = newSchedules.map((s) => ({
          doctor_id: newDoctor.id,
          neighborhood_id: s.neighborhood_id,
          place_name: s.place_name,
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          end_time: s.end_time,
        }))

        const { error: schedulesError } = await supabase
          .from("schedules")
          .insert(schedulesToInsert)

        if (schedulesError) {
          return { error: schedulesError.message }
        }
      }

      // Reload data
      await loadData()

      return { error: null }
    } catch (err) {
      console.log("[v0] Error in addDoctor:", err)
      return { error: "Erro ao cadastrar médico" }
    }
  }

  const updateDoctor = async (
    doctorId: string,
    doctor: Omit<Doctor, "id" | "user_id" | "specialty_name">,
    newSchedules: Omit<Schedule, "id" | "doctor_id" | "neighborhood_name">[]
  ): Promise<{ error: string | null }> => {
    if (!user) return { error: "Usuário não autenticado" }

    try {
      // 1. Update doctor info
      const { error: doctorError } = await supabase
        .from("doctors")
        .update({
          name: doctor.name,
          crm: doctor.crm,
          phone: doctor.phone,
          specialty_id: doctor.specialty_id,
          avatar_url: doctor.avatar_url,
        })
        .eq("id", doctorId)
        .eq("user_id", user.id)

      if (doctorError) {
        return { error: doctorError.message }
      }

      // 2. Delete existing schedules for this doctor
      const { error: deleteError } = await supabase
        .from("schedules")
        .delete()
        .eq("doctor_id", doctorId)

      if (deleteError) {
        return { error: "Erro ao atualizar agendamentos (delete)" }
      }

      // 3. Insert new schedules
      if (newSchedules.length > 0) {
        const schedulesToInsert = newSchedules.map((s) => ({
          doctor_id: doctorId,
          neighborhood_id: s.neighborhood_id,
          place_name: s.place_name,
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          end_time: s.end_time,
        }))

        const { error: insertError } = await supabase
          .from("schedules")
          .insert(schedulesToInsert)

        if (insertError) {
          return { error: insertError.message }
        }
      }

      // Reload data
      await loadData()

      return { error: null }
    } catch (err) {
      console.log("[v0] Error in updateDoctor:", err)
      return { error: "Erro ao atualizar médico" }
    }
  }

  const getDoctorById = (doctorId: string) => {
    return doctors.find((d) => d.id === doctorId)
  }

  const getSchedulesByDoctorId = (doctorId: string) => {
    return schedules.filter((s) => s.doctor_id === doctorId)
  }

  const deleteDoctor = async (doctorId: string): Promise<{ error: string | null }> => {
    if (!user) return { error: "Usuário não autenticado" }

    try {
      // Delete doctor (schedules will be deleted via CASCADE if set up, or manually)
      const { error: deleteError } = await supabase
        .from("doctors")
        .delete()
        .eq("id", doctorId)
        .eq("user_id", user.id) // Security: ensure user owns this doctor

      if (deleteError) {
        return { error: deleteError.message }
      }

      // Remove from local state immediately (no need to reload)
      setDoctors((prev) => prev.filter((d) => d.id !== doctorId))
      setSchedules((prev) => prev.filter((s) => s.doctor_id !== doctorId))

      return { error: null }
    } catch (err) {
      console.log("[v0] Error deleting doctor:", err)
      return { error: "Erro ao excluir médico" }
    }
  }

  // Specialties are GLOBAL - "Get or Create" logic
  const addSpecialty = async (name: string): Promise<{ data: Specialty | null; error: string | null }> => {
    try {
      // Try to insert
      const { data, error } = await supabase
        .from("specialties")
        .insert({ name })
        .select()
        .single()

      if (error) {
        // Check if it's a duplicate key error (Postgres code 23505)
        if (error.code === "23505" || error.message.includes("unique constraint") || error.message.includes("duplicate key")) {
          // Fetch the existing specialty
          const { data: existing, error: fetchError } = await supabase
            .from("specialties")
            .select("id, name")
            .eq("name", name)
            .single()

          if (fetchError || !existing) {
            return { data: null, error: "Erro ao buscar especialidade existente" }
          }

          // Add to local state if not already there
          setSpecialties((prev) => {
            if (prev.some((s) => s.id === existing.id)) return prev
            return [...prev, existing].sort((a, b) => a.name.localeCompare(b.name))
          })

          return { data: existing, error: null }
        }

        // Other error - return it
        return { data: null, error: error.message }
      }

      // Successfully inserted - add to local state
      setSpecialties((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      return { data, error: null }
    } catch (err) {
      console.log("[v0] Error adding specialty:", err)
      return { data: null, error: "Erro ao adicionar especialidade" }
    }
  }

  // Neighborhoods are GLOBAL - "Get or Create" logic
  const addNeighborhood = async (name: string): Promise<{ data: Neighborhood | null; error: string | null }> => {
    try {
      // Try to insert
      const { data, error } = await supabase
        .from("neighborhoods")
        .insert({ name })
        .select()
        .single()

      if (error) {
        // Check if it's a duplicate key error (Postgres code 23505)
        if (error.code === "23505" || error.message.includes("unique constraint") || error.message.includes("duplicate key")) {
          // Fetch the existing neighborhood
          const { data: existing, error: fetchError } = await supabase
            .from("neighborhoods")
            .select("id, name")
            .eq("name", name)
            .single()

          if (fetchError || !existing) {
            return { data: null, error: "Erro ao buscar bairro existente" }
          }

          // Add to local state if not already there
          setNeighborhoods((prev) => {
            if (prev.some((n) => n.id === existing.id)) return prev
            return [...prev, existing].sort((a, b) => a.name.localeCompare(b.name))
          })

          return { data: existing, error: null }
        }

        // Other error - return it
        return { data: null, error: error.message }
      }

      // Successfully inserted - add to local state
      setNeighborhoods((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      return { data, error: null }
    } catch (err) {
      console.log("[v0] Error adding neighborhood:", err)
      return { data: null, error: "Erro ao adicionar bairro" }
    }
  }

  const updateProfileAvatar = async (file: File): Promise<{ error: string | null }> => {
    if (!user) return { error: "Usuário não autenticado" }

    const fileExt = file.name.split(".").pop()
    const fileName = `${user.id}-${Date.now()}.${fileExt}`
    const filePath = `avatars/${fileName}`

    // Upload file to storage
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      return { error: uploadError.message }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath)

    // Update profile with avatar URL
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: urlData.publicUrl })
      .eq("id", user.id)

    if (updateError) {
      return { error: updateError.message }
    }

    // Update local profile state
    setProfile((prev) =>
      prev ? { ...prev, avatar_url: urlData.publicUrl } : null
    )

    return { error: null }
  }

  return (
    <AppContext.Provider
      value={{
        user,
        profile,
        isLoading,
        login,
        signUp,
        logout,
        doctors,
        schedules,
        specialties,
        neighborhoods,
        loadData,
        addDoctor,
        updateDoctor,
        deleteDoctor,
        getDoctorById,
        getSchedulesByDoctorId,
        addSpecialty,
        addNeighborhood,
        updateProfileAvatar,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider")
  }
  return context
}
