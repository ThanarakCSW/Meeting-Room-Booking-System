import { useRef, useEffect, useState } from 'react'
import { Database } from '@/types/database'
import { format, parseISO, differenceInMinutes, setHours, setMinutes, isBefore } from 'date-fns'
import { Users, X, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

type Room = Database['public']['Tables']['rooms']['Row']
type Booking = Database['public']['Tables']['bookings']['Row'] & { profiles?: { full_name: string } | null }

interface TimelineGridProps {
    rooms: Room[]
    bookings: Booking[]
    onSlotClick: (room: Room, date: Date) => void
    onCancelBooking: (bookingId: string) => void
    currentUserId?: string
}

const START_HOUR = 8
const END_HOUR = 18
const HOUR_WIDTH = 140
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)
const TOTAL_WIDTH = HOURS.length * HOUR_WIDTH

export function TimelineGrid({ rooms, bookings, onSlotClick, onCancelBooking, currentUserId }: TimelineGridProps) {
    const sidebarRef = useRef<HTMLDivElement>(null)
    const gridRef = useRef<HTMLDivElement>(null)
    const { toast } = useToast()
    const [now, setNow] = useState(new Date())

    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 60000) // Update every minute for check-in status
        return () => clearInterval(interval)
    }, [])

    const handleGridScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (sidebarRef.current) {
            sidebarRef.current.scrollTop = e.currentTarget.scrollTop
        }
    }

    const getLocationAndWidth = (booking: Booking) => {
        const start = parseISO(booking.start_time)
        const end = parseISO(booking.end_time)
        const baseTime = setMinutes(setHours(start, START_HOUR), 0)
        const startDiffMinutes = differenceInMinutes(start, baseTime)
        const durationMinutes = differenceInMinutes(end, start)
        const left = (startDiffMinutes / 60) * HOUR_WIDTH
        const width = (durationMinutes / 60) * HOUR_WIDTH
        return { left, width }
    }

    const handleCheckIn = async (bookingId: string, e: React.MouseEvent) => {
        e.stopPropagation()
        try {
            const { error } = await supabase
                .from('bookings')
                .update({ check_in_status: 'checked_in' })
                .eq('id', bookingId)

            if (error) throw error
            toast({ title: "Checked In", description: "You have successfully checked in." })
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message })
        }
    }

    const handleReportIssue = async (roomId: number, e: React.MouseEvent) => {
        e.stopPropagation()
        // Mock functionality for reporting issue
        try {
            const { error } = await supabase
                .from('rooms')
                .update({ status: 'maintenance' })
                .eq('id', roomId)

            if (error) throw error
            toast({ title: "Issue Reported", description: "Room marked as maintenance." })
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message })
        }
    }

    return (
        <div className="flex flex-1 overflow-hidden h-full border bg-white rounded-lg shadow-sm">
            <div ref={sidebarRef} className="w-[280px] flex-shrink-0 border-r border-gray-200 bg-white overflow-hidden">
                <div className="h-12 border-b bg-gray-50 flex items-center px-6 font-semibold text-gray-500 text-sm tracking-wide">
                    Meeting Room
                </div>
                <div>
                    {rooms.map(room => (
                        <div key={room.id} className={cn("h-28 border-b border-gray-100 flex flex-col justify-center px-6 hover:bg-gray-50/50 transition-colors group relative", room.status === 'maintenance' && "bg-gray-100/50")}>
                            <div className="font-bold text-gray-900 text-base flex items-center gap-2">
                                {room.name}
                                {room.is_vip && <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">VIP</span>}
                                {room.status === 'maintenance' && <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Maint.</span>}
                            </div>
                            <div className="flex items-center gap-4 mt-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                                <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                    <Users className="w-3 h-3" />
                                    <span>{room.capacity}</span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 ml-auto"
                                    onClick={(e) => handleReportIssue(room.id, e)}
                                    title="Report Issue"
                                >
                                    <AlertCircle className="w-4 h-4 text-red-400" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-auto relative bg-white" ref={gridRef} onScroll={handleGridScroll}>
                <div className="flex border-b bg-gray-50 sticky top-0 z-20 shadow-sm" style={{ width: TOTAL_WIDTH }}>
                    {HOURS.map(hour => (
                        <div key={hour} style={{ width: HOUR_WIDTH }} className="flex-shrink-0 border-r border-gray-200/60 py-4 text-center text-xs font-semibold text-gray-400">
                            {`${hour.toString().padStart(2, '0')}:00`}
                        </div>
                    ))}
                </div>

                <div className="relative" style={{ width: TOTAL_WIDTH }}>
                    <div className="absolute inset-0 flex pointer-events-none z-0">
                        {HOURS.map((_, i) => (
                            <div key={i} style={{ width: HOUR_WIDTH }} className="flex-shrink-0 border-r border-gray-100 h-full" />
                        ))}
                    </div>

                    {rooms.map(room => (
                        <div key={room.id} className="h-28 border-b border-gray-100 relative z-10">
                            {/* Empty Slot Interactions - Disabled if maintenance */}
                            {room.status !== 'maintenance' && (
                                <div className="absolute inset-0 flex">
                                    {HOURS.map(hour => (
                                        <div
                                            key={hour}
                                            style={{ width: HOUR_WIDTH }}
                                            className="h-full flex-shrink-0 group/slot relative cursor-pointer hover:bg-green-50/30 transition-all border-r border-transparent hover:border-green-200/50"
                                            onClick={() => {
                                                const slotDate = setMinutes(setHours(new Date(), hour), 0)
                                                onSlotClick(room, slotDate)
                                            }}
                                        >
                                            <div className="hidden group-hover/slot:flex absolute inset-2 bg-green-100/80 rounded-md border border-green-300 items-center justify-center text-green-700 font-semibold text-sm shadow-sm">
                                                + Book
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {bookings.filter(b => b.room_id === room.id).map(booking => {
                                const { left, width } = getLocationAndWidth(booking)
                                const isOwner = currentUserId === booking.user_id
                                const isPending = booking.status === 'pending'
                                const isCheckedIn = booking.check_in_status === 'checked_in'

                                // Check-in Logic: 15 mins before start until end of meeting (or some window)
                                const startTime = parseISO(booking.start_time)
                                const canCheckIn = isOwner && !isCheckedIn && !isPending &&
                                    isBefore(now, parseISO(booking.end_time)) &&
                                    differenceInMinutes(now, startTime) >= -15

                                return (
                                    <div
                                        key={booking.id}
                                        className={cn(
                                            "absolute top-2 bottom-2 rounded-md shadow-sm border p-3 z-20 group/block overflow-hidden transition-all cursor-default flex flex-col justify-between",
                                            isPending ? "bg-yellow-50 border-yellow-200 text-yellow-900" : "bg-red-600 border-red-700/20 text-white"
                                        )}
                                        style={{ left: `${left}px`, width: `${width - 4}px` }}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="text-sm font-bold truncate leading-tight tracking-tight pr-4">
                                                {booking.title}
                                            </div>
                                            {isOwner && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        onCancelBooking(booking.id)
                                                    }}
                                                    className="opacity-0 group-hover/block:opacity-100 p-1 hover:bg-black/20 rounded-full transition-all"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between text-[10px] mt-0.5 font-mono tracking-wider opacity-90">
                                            <span>
                                                {format(parseISO(booking.start_time), 'HH:mm')} - {format(parseISO(booking.end_time), 'HH:mm')}
                                            </span>
                                            {isPending && <span className="flex items-center gap-1 bg-yellow-200/50 px-1 rounded text-yellow-800"><Clock className="w-3 h-3" /> Approval</span>}
                                            {isCheckedIn && <span className="flex items-center gap-1 bg-green-500/20 px-1 rounded text-white font-bold"><CheckCircle className="w-3 h-3" /> On-site</span>}
                                        </div>

                                        {canCheckIn && (
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="h-6 text-[10px] mt-1 w-full bg-white/90 text-black hover:bg-white"
                                                onClick={(e) => handleCheckIn(booking.id, e)}
                                            >
                                                Check In
                                            </Button>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
