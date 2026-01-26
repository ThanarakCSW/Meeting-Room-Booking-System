import { useRef, useEffect, useState } from 'react'
import { Database } from '@/types/database'
import { format, parseISO, differenceInMinutes, setHours, setMinutes, startOfDay, isBefore, addMinutes } from 'date-fns'
import { Users, X, CheckCircle, AlertCircle, Clock, Calendar, Info, Ban, Edit, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { Badge } from '@/components/ui/badge'

type Room = Database['public']['Tables']['rooms']['Row']
type Booking = Database['public']['Tables']['bookings']['Row'] & { profiles?: { full_name: string, department: string } | null }

interface AdminSchedulerProps {
    rooms: Room[]
}

const START_HOUR = 8
const END_HOUR = 18
const HOUR_WIDTH = 140
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)
const TOTAL_WIDTH = HOURS.length * HOUR_WIDTH

export function AdminScheduler({ rooms }: AdminSchedulerProps) {
    const sidebarRef = useRef<HTMLDivElement>(null)
    const gridRef = useRef<HTMLDivElement>(null)
    const { toast } = useToast()
    const [bookings, setBookings] = useState<Booking[]>([])

    // Selection state
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
    const [showDetailsDialog, setShowDetailsDialog] = useState(false)
    const [showCancelAlert, setShowCancelAlert] = useState(false)
    const [selectedSlot, setSelectedSlot] = useState<{ room: Room, time: Date } | null>(null)

    const fetchBookings = async () => {
        const start = startOfDay(new Date()).toISOString()
        const { data, error } = await supabase
            .from('bookings')
            .select('*, profiles:user_id(full_name, department)')
            .gte('start_time', start) // For admin, maybe show all or just today? Let's stick to today for timeline
        // .lt('start_time', endOfDay(new Date()).toISOString())

        if (!error && data) {
            setBookings(data as Booking[])
        }
    }

    useEffect(() => {
        fetchBookings()
        const interval = setInterval(fetchBookings, 10000)
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

        // Handle multi-day or out of bounds for simple view (clip to 8-18)
        // Ideally we filter these out or handle gracefully
        const startDiffMinutes = differenceInMinutes(start, baseTime)

        const durationMinutes = differenceInMinutes(end, start)
        const left = (startDiffMinutes / 60) * HOUR_WIDTH
        const width = (durationMinutes / 60) * HOUR_WIDTH
        return { left, width }
    }

    const handleBookingClick = (booking: Booking) => {
        setSelectedBooking(booking)
        setShowDetailsDialog(true)
    }

    const handleCancelBooking = async () => {
        if (!selectedBooking) return
        try {
            const { error } = await supabase
                .from('bookings')
                .delete() // Admin deletes it
                .eq('id', selectedBooking.id)

            if (error) throw error
            toast({ title: "Booking Cancelled", description: "The booking has been permanently removed." })
            fetchBookings()
            setShowDetailsDialog(false)
            setShowCancelAlert(false)
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message })
        }
    }

    const handleBlockForMaintenance = async () => {
        if (!selectedSlot) return

        const startTime = selectedSlot.time
        const endTime = addMinutes(startTime, 60) // Block for 1 hour default

        try {
            const { error } = await supabase
                .from('bookings')
                .insert({
                    room_id: selectedSlot.room.id,
                    user_id: (await supabase.auth.getUser()).data.user?.id!, // Admin ID
                    title: "Maintenance",
                    start_time: startTime.toISOString(),
                    end_time: endTime.toISOString(),
                    status: 'confirmed', // Or pending?
                    // We need a way to mark this as maintenance block visually. 
                    // Maybe just title "Maintenance" is enough for v1, or use is_vip logic?
                    // Let's use title property check in render.
                })
            if (error) throw error
            toast({ title: "Slot Blocked", description: "Maintenance block created." })
            fetchBookings()
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message })
        }
    }

    const handleRightClickSlot = (e: React.MouseEvent, room: Room, hour: number) => {
        // e.preventDefault() // Context menu handles this
        const slotDate = setMinutes(setHours(new Date(), hour), 0)
        setSelectedSlot({ room, time: slotDate })
    }

    return (
        <div className="flex flex-1 overflow-hidden h-[600px] border bg-white rounded-lg shadow-sm">
            {/* Sidebar */}
            <div ref={sidebarRef} className="w-[200px] flex-shrink-0 border-r border-gray-200 bg-white overflow-hidden">
                <div className="h-12 border-b bg-gray-50 flex items-center px-4 font-semibold text-gray-500 text-xs uppercase tracking-wide">
                    Rooms
                </div>
                <div>
                    {rooms.map(room => (
                        <div key={room.id} className="h-20 border-b border-gray-100 flex flex-col justify-center px-4">
                            <div className="font-bold text-gray-900 text-sm">{room.name}</div>
                            <div className="text-xs text-gray-500">{room.capacity} Pax</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-auto relative bg-white" ref={gridRef} onScroll={handleGridScroll}>
                <div className="flex border-b bg-gray-50 sticky top-0 z-20 shadow-sm" style={{ width: TOTAL_WIDTH }}>
                    {HOURS.map(hour => (
                        <div key={hour} style={{ width: HOUR_WIDTH }} className="flex-shrink-0 border-r border-gray-200/60 py-3 text-center text-xs font-semibold text-gray-400">
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
                        <div key={room.id} className="h-20 border-b border-gray-100 relative z-10">
                            {/* Slots Layer for Context Menu */}
                            <div className="absolute inset-0 flex">
                                {HOURS.map(hour => (
                                    <ContextMenu key={hour}>
                                        <ContextMenuTrigger>
                                            <div
                                                className="h-full border-r border-transparent hover:bg-gray-50/50 transition-colors cursor-crosshair"
                                                style={{ width: HOUR_WIDTH }}
                                                onContextMenu={(e) => handleRightClickSlot(e, room, hour)}
                                            />
                                        </ContextMenuTrigger>
                                        <ContextMenuContent>
                                            <ContextMenuItem onClick={handleBlockForMaintenance}>
                                                <Ban className="w-4 h-4 mr-2" /> Block for Maintenance
                                            </ContextMenuItem>
                                        </ContextMenuContent>
                                    </ContextMenu>
                                ))}
                            </div>

                            {/* Bookings */}
                            {bookings.filter(b => b.room_id === room.id).map(booking => {
                                const { left, width } = getLocationAndWidth(booking)
                                const isMaintenance = booking.title === 'Maintenance'

                                return (
                                    <div
                                        key={booking.id}
                                        className={cn(
                                            "absolute top-2 bottom-2 rounded-md shadow-sm border p-2 z-20 overflow-hidden cursor-pointer hover:shadow-md transition-all text-xs flex flex-col justify-between",
                                            isMaintenance ? "bg-gray-100 border-gray-300 text-gray-500 stripe-pattern" : "bg-blue-100 border-blue-200 text-blue-800 hover:bg-blue-200"
                                        )}
                                        style={{ left: `${left}px`, width: `${width - 4}px` }}
                                        onClick={() => handleBookingClick(booking)}
                                    >
                                        <div className="font-semibold truncate">{booking.title}</div>
                                        {!isMaintenance && (
                                            <div className="flex items-center gap-1 opacity-80">
                                                <Users className="w-3 h-3" />
                                                <span className="truncate">{booking.profiles?.full_name}</span>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* Details Dialog */}
            <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Booking Details</DialogTitle>
                    </DialogHeader>
                    {selectedBooking && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-500 block mb-1">Title</span>
                                    <span className="font-medium">{selectedBooking.title}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block mb-1">Status</span>
                                    <Badge variant={selectedBooking.status === 'confirmed' ? "default" : "secondary"}>
                                        {selectedBooking.status}
                                    </Badge>
                                </div>
                                <div>
                                    <span className="text-gray-500 block mb-1">Organizer</span>
                                    <div className="font-medium">{selectedBooking.profiles?.full_name || 'Unknown'}</div>
                                    <div className="text-xs text-gray-400">{selectedBooking.profiles?.department || 'No Dept'}</div>
                                </div>
                                <div>
                                    <span className="text-gray-500 block mb-1">Time</span>
                                    <div className="font-medium">{format(parseISO(selectedBooking.start_time), 'PP')}</div>
                                    <div className="text-xs text-gray-400">
                                        {format(parseISO(selectedBooking.start_time), 'HH:mm')} - {format(parseISO(selectedBooking.end_time), 'HH:mm')}
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="gap-2 sm:gap-0">
                                <Button variant="destructive" onClick={() => setShowCancelAlert(true)}>
                                    <Trash2 className="w-4 h-4 mr-2" /> Cancel Booking
                                </Button>
                                <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                                    Close
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Cancel Alert */}
            <AlertDialog open={showCancelAlert} onOpenChange={setShowCancelAlert}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. Unlike canceling, this will permanently delete the booking record from the database.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCancelBooking} className="bg-red-600 hover:bg-red-700">
                            Delete Booking
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
