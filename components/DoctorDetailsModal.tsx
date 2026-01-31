import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { MapPin, Clock, Phone, Pencil, Trash2, Loader2, Contact, MessageCircle } from "lucide-react"
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

    // Agrupamento Visual
    const groupedSchedules = doctorSchedules.reduce((acc, curr) => {
        const key = `${curr.place_name}-${curr.neighborhood_id}-${curr.start_time}-${curr.end_time}`
        if (!acc[key]) {
            acc[key] = { ...curr, days: [curr.day_of_week] }
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

    const handleConfirmDelete = async () => {
        setIsDeleting(true)
        try {
            const result = await deleteDoctor(doctor.id)
            if (result.error) alert(result.error)
            else onClose()
        } finally {
            setIsDeleting(false)
        }
    }

    const handleWhatsApp = () => {
        if (!doctor.phone) return
        const cleanNumber = doctor.phone.replace(/\D/g, '')
        const finalNumber = cleanNumber.length <= 11 ? `55${cleanNumber}` : cleanNumber
        window.open(`https://wa.me/${finalNumber}`, '_blank')
    }

    const sortDays = (days: string[]) => {
        const order = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"]
        return days.sort((a, b) => order.indexOf(a.toLowerCase()) - order.indexOf(b.toLowerCase()))
    }

    const getShortDay = (day: string) => {
        const map: Record<string, string> = { "segunda": "Seg", "terça": "Ter", "quarta": "Qua", "quinta": "Qui", "sexta": "Sex", "sábado": "Sáb", "domingo": "Dom" }
        return map[day.toLowerCase()] || day
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-h-[85vh] overflow-y-auto border-white/60 bg-white/95 backdrop-blur-2xl sm:max-w-md rounded-3xl p-6 shadow-2xl">
                <DialogHeader>
                    <div className="flex items-center gap-5">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#22c55e] to-[#16a34a] text-2xl font-medium text-white shadow-xl border-4 border-white/20">
                            {doctor.avatar_url || "?"}
                        </div>
                        <div className="space-y-0.5">
                            <DialogTitle className="text-xl font-medium text-gray-800 leading-tight">
                                {doctor.name}
                            </DialogTitle>
                            <div className="flex flex-col gap-1">
                                <span className="text-sm font-medium text-[#22c55e]">{doctor.specialty_name}</span>
                                <div className="flex flex-wrap items-center gap-2 text-[10px] font-medium text-gray-400 uppercase tracking-widest">
                                    <div className="flex items-center gap-1">
                                        <Contact className="h-3 w-3" />
                                        <span>CRM: {doctor.crm}</span>
                                    </div>
                                    {doctor.phone && (
                                        <>
                                            <span className="text-gray-200">|</span>
                                            <div className="flex items-center gap-1">
                                                <Phone className="h-3 w-3" />
                                                <span>{doctor.phone}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                {/* BOTÃO WHATSAPP */}
                {doctor.phone && (
                    <div className="mt-8">
                        <button
                            onClick={handleWhatsApp}
                            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#22c55e] py-4 text-sm font-medium text-white shadow-lg shadow-[#22c55e]/20 active:scale-95 transition-all"
                        >
                            <MessageCircle className="h-5 w-5" />
                            Conversar no WhatsApp
                        </button>
                    </div>
                )}

                <div className="mt-8">
                    <h4 className="mb-4 text-[10px] font-medium uppercase tracking-widest text-gray-400">Escala de Atendimento</h4>
                    <div className="space-y-4">
                        {groupedList.map((item, index) => (
                            <div key={index} className="rounded-2xl border border-white/80 bg-white/60 p-4 shadow-sm backdrop-blur-sm">
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 rounded-full bg-[#22c55e]/10 p-2 text-[#22c55e]"><MapPin className="h-3.5 w-3.5" /></div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-800">{item.place_name}</p>
                                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">{item.neighborhood_name || "Sem bairro"}</p>
                                    </div>
                                </div>
                                <div className="mt-4 flex flex-col gap-3">
                                    <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
                                        <Clock className="h-3.5 w-3.5 text-[#22c55e]" />
                                        <span>{item.start_time.slice(0, 5)} — {item.end_time.slice(0, 5)}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {sortDays(item.days).map(day => (
                                            <span key={day} className="rounded-lg bg-gray-50 border border-gray-100 px-2 py-1 text-[9px] font-medium uppercase text-gray-500">
                                                {getShortDay(day)}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {!showDeleteConfirm ? (
                    <DialogFooter className="mt-8 flex-row gap-3">
                        <Button variant="outline" onClick={handleEditClick} className="flex-1 rounded-2xl h-12 border-gray-100 bg-white/60 font-medium text-gray-600">
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                        </Button>
                        <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)} className="flex-1 rounded-2xl h-12 bg-red-50 text-red-500 border-none font-medium hover:bg-red-100">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                        </Button>
                    </DialogFooter>
                ) : (
                    <div className="mt-6 rounded-2xl border border-red-100 bg-red-50/50 p-5 backdrop-blur-sm animate-in zoom-in">
                        <p className="text-center text-xs font-medium text-red-800">Deseja excluir este médico permanentemente?</p>
                        <div className="mt-4 flex gap-3">
                            <Button variant="outline" className="flex-1 h-10 rounded-xl" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>Cancelar</Button>
                            <Button variant="destructive" className="flex-1 h-10 rounded-xl shadow-lg shadow-red-200" onClick={handleConfirmDelete} disabled={isDeleting}>
                                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : "Sim, excluir"}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
