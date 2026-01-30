import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { MapPin, Clock, Phone, Pencil, Trash2, Loader2 } from "lucide-react"
import { Doctor, Schedule } from "@/context/app-context"
import { useApp } from "@/context/app-context"
import { useState } from "react"
import { useRouter } from "next/navigation"

interface DoctorDetailsModalProps {
    doctor: Doctor | null
    isOpen: boolean
    onClose: () => void
}

export function DoctorDetailsModal({ doctor, isOpen, onClose }: DoctorDetailsModalProps) {
    const { schedules, deleteDoctor } = useApp()
    const [isDeleting, setIsDeleting] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const router = useRouter()

    if (!doctor) return null

    // Filter schedules for this doctor
    const doctorSchedules = schedules.filter(s => s.doctor_id === doctor.id)

    // Group schedules logic
    const groupedSchedules = doctorSchedules.reduce((acc, curr) => {
        // Create a unique key based on place, neighborhood and time
        const key = `${curr.place_name}-${curr.neighborhood_id}-${curr.start_time}-${curr.end_time}`

        if (!acc[key]) {
            acc[key] = {
                ...curr,
                days: [curr.day_of_week]
            }
        } else {
            if (!acc[key].days.includes(curr.day_of_week)) {
                acc[key].days.push(curr.day_of_week)
            }
        }
        return acc
    }, {} as Record<string, Schedule & { days: string[] }>)

    const groupedList = Object.values(groupedSchedules)

    const handleEditClick = () => {
        onClose()
        router.push(`/cadastro?id=${doctor.id}`)
    }

    const handleDeleteClick = () => {
        setShowDeleteConfirm(true)
    }

    const handleConfirmDelete = async () => {
        setIsDeleting(true)
        try {
            const result = await deleteDoctor(doctor.id)
            if (result.error) {
                alert("Erro ao excluir médico: " + result.error)
            } else {
                onClose()
            }
        } catch (err) {
            alert("Erro ao excluir médico")
        } finally {
            setIsDeleting(false)
        }
    }

    // Helper to sort and format days
    const formatDays = (days: string[]) => {
        const dayOrder = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"]
        const sorted = days.sort((a, b) => {
            return dayOrder.indexOf(a.toLowerCase()) - dayOrder.indexOf(b.toLowerCase())
        })

        // Map to short names
        const shortNames: Record<string, string> = {
            "segunda": "Seg",
            "terça": "Ter",
            "quarta": "Qua",
            "quinta": "Qui",
            "sexta": "Sex",
            "sábado": "Sáb",
            "domingo": "Dom"
        }

        return sorted.map(d => shortNames[d.toLowerCase()] || d).join(", ")
    }

    // Remove seconds from time
    const formatTime = (time: string) => {
        return time.slice(0, 5)
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-h-[90vh] overflow-y-auto border-white/60 bg-white/90 backdrop-blur-xl sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-4">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#22c55e] to-[#16a34a] text-2xl font-bold text-white shadow-lg">
                            {doctor.avatar_url || "?"}
                        </div>
                        <div>
                            <DialogTitle className="text-xl text-gray-800">
                                {doctor.name}
                            </DialogTitle>
                            <DialogDescription className="mt-1 flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-[#22c55e]">{doctor.specialty_name}</span>
                                    <span className="text-gray-300">|</span>
                                    <span className="text-gray-500">CRM: {doctor.crm}</span>
                                </div>
                                {doctor.phone && (
                                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                                        <Phone className="h-3.5 w-3.5" />
                                        <span>{doctor.phone}</span>
                                    </div>
                                )}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {/* Schedules */}
                <div className="mt-4">
                    <h4 className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-500">
                        Locais de Atendimento
                    </h4>

                    {groupedList.length === 0 ? (
                        <p className="rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-400">
                            Nenhum local cadastrado
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {groupedList.map((item, index) => (
                                <div
                                    key={index}
                                    className="rounded-xl border border-gray-100 bg-gray-50/50 p-3"
                                >
                                    <div className="flex items-start gap-2">
                                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#22c55e]" />
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-700">{item.place_name}</p>
                                            <p className="text-sm text-gray-500">{item.neighborhood_name || "Sem bairro"}</p>
                                        </div>
                                    </div>
                                    <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                                        <Clock className="h-4 w-4 text-gray-400" />
                                        <span className="font-medium text-gray-700">
                                            {formatTime(item.start_time)} - {formatTime(item.end_time)}
                                        </span>
                                        <span className="text-gray-300">|</span>
                                        <span className="capitalize">{formatDays(item.days)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Delete Confirmation */}
                {showDeleteConfirm && (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
                        <p className="text-center text-sm text-red-700">
                            Tem certeza que deseja excluir este médico? Esta ação não pode ser desfeita.
                        </p>
                        <div className="mt-3 flex justify-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={isDeleting}
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleConfirmDelete}
                                disabled={isDeleting}
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Excluindo...
                                    </>
                                ) : (
                                    "Sim, excluir"
                                )}
                            </Button>
                        </div>
                    </div>
                )}

                <DialogFooter className="mt-4 flex-row gap-2 sm:justify-between">
                    <Button
                        variant="outline"
                        onClick={handleEditClick}
                        className="flex-1 bg-transparent"
                    >
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDeleteClick}
                        disabled={showDeleteConfirm}
                        className="flex-1"
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
