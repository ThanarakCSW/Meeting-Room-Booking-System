import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Switch } from '@/components/ui/switch'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Database } from '@/types/database'
import { addDays, addWeeks, isAfter, isBefore, addMinutes, format, parseISO } from 'date-fns'
import { Calendar, Clock, Users, CalendarDays, Repeat } from 'lucide-react'

type Room = Database['public']['Tables']['rooms']['Row']

interface BookingModalProps {
    room: Room
    trigger?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
    initialStartTime?: string
    initialEndTime?: string
}

// Helper to validate time rules
const validateBookingTime = (startStr: string): string | null => {
    if (!startStr) return "Start time is required."

    const now = new Date()
    const start = new Date(startStr)
    const minLeadTime = addMinutes(now, 30)

    if (isBefore(start, now)) {
        return "Cannot book dates in the past."
    }

    if (isBefore(start, minLeadTime)) {
        return "Bookings must be made at least 30 minutes in advance."
    }

    return null
}

export function BookingModal({ room, trigger, open: controlledOpen, onOpenChange: setControlledOpen, initialStartTime, initialEndTime }: BookingModalProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const open = controlledOpen ?? internalOpen
    const setOpen = setControlledOpen ?? setInternalOpen

    const [title, setTitle] = useState('')
    const [date, setDate] = useState('')
    const [startTime, setStartTime] = useState('')
    const [endTime, setEndTime] = useState('')

    const [attendees, setAttendees] = useState(1)
    const [isRecurring, setIsRecurring] = useState(false)
    const [repeatFrequency, setRepeatFrequency] = useState<'daily' | 'weekly'>('daily')
    const [repeatCount, setRepeatCount] = useState(1)

    const [loading, setLoading] = useState(false)
    const [validationError, setValidationError] = useState<string | null>(null)
    const { toast } = useToast()

    // Initialize state when dialog opens
    useEffect(() => {
        if (open) {
            if (initialStartTime) {
                const start = new Date(initialStartTime)
                setDate(format(start, 'yyyy-MM-dd'))
                setStartTime(format(start, 'HH:mm'))
            }
            if (initialEndTime) {
                const end = new Date(initialEndTime)
                setEndTime(format(end, 'HH:mm'))
            }
        }
    }, [open, initialStartTime, initialEndTime])

    // Validate on time change
    useEffect(() => {
        if (date && startTime) {
            const fullStart = `${date}T${startTime}`
            const error = validateBookingTime(fullStart)
            setValidationError(error)
        } else {
            setValidationError(null)
        }
    }, [date, startTime])

    const handleBook = async (e: React.FormEvent) => {
        e.preventDefault()

        // Final Validation Check
        const fullStartISO = `${date}T${startTime}`
        const timeError = validateBookingTime(fullStartISO)
        if (timeError) {
            setValidationError(timeError)
            return
        }

        setLoading(true)

        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.user) throw new Error('You must be logged in to book a room.')

            const user = session.user
            const start = new Date(fullStartISO)
            const end = new Date(`${date}T${endTime}`)

            if (isBefore(end, start)) {
                throw new Error("End time must be after start time.")
            }

            const bookingsToCreate = []

            if (isRecurring) {
                const maxDate = addWeeks(new Date(), 4)
                let currentStart = start
                let currentEnd = end

                for (let i = 0; i < repeatCount; i++) {
                    if (isAfter(currentStart, maxDate)) {
                        throw new Error("Recurring bookings cannot extend beyond 4 weeks.")
                    }
                    bookingsToCreate.push({ start: new Date(currentStart), end: new Date(currentEnd) })

                    if (repeatFrequency === 'daily') {
                        currentStart = addDays(currentStart, 1)
                        currentEnd = addDays(currentEnd, 1)
                    } else {
                        currentStart = addWeeks(currentStart, 1)
                        currentEnd = addWeeks(currentEnd, 1)
                    }
                }
            } else {
                bookingsToCreate.push({ start, end })
            }

            for (const booking of bookingsToCreate) {
                const { data: isAvailable, error: rpcError } = await supabase
                    .rpc('check_availability', {
                        p_room_id: room.id,
                        p_start_time: booking.start.toISOString(),
                        p_end_time: booking.end.toISOString()
                    })

                if (rpcError) throw rpcError
                if (!isAvailable) {
                    throw new Error(`Room is not available on ${booking.start.toLocaleDateString()} at ${format(booking.start, 'HH:mm')}.`)
                }
            }

            const inserts = bookingsToCreate.map(booking => ({
                room_id: room.id,
                user_id: user.id,
                title,
                start_time: booking.start.toISOString(),
                end_time: booking.end.toISOString(),
                status: room.is_vip ? 'pending' : 'confirmed',
                check_in_status: 'pending',
                attendees: attendees
            }))

            const { error: insertError } = await supabase
                .from('bookings')
                .insert(inserts)

            if (insertError) throw insertError

            toast({
                title: "Booking Successful",
                description: room.is_vip
                    ? "Your VIP booking request has been sent."
                    : "Your room has been successfully booked."
            })
            setOpen(false)
            setTitle('')
            setIsRecurring(false)
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Booking Failed",
                description: error.message
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ? trigger : (
                    <Button className="w-full" disabled={room.status === 'maintenance'}>
                        {room.status === 'maintenance' ? 'Under Maintenance' : 'Book Now'}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
                {/* Colorful Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
                        <CalendarDays className="w-6 h-6" />
                        Book {room.name}
                    </DialogTitle>
                    <DialogDescription className="text-blue-100 mt-1">
                        {room.is_vip ? 'VIP Room • Approval Required' : 'Standard Room • Instant Booking'}
                    </DialogDescription>
                </div>

                <div className="p-6 pt-4">
                    <form onSubmit={handleBook} className="space-y-6">

                        {/* Title Input */}
                        <div className="space-y-2">
                            <Label htmlFor="title" className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-500" /> Meeting Title
                            </Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                                placeholder="e.g. Q4 Strategy Sync"
                                className="h-10"
                            />
                        </div>

                        {/* Grid for Date, Start, End */}
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2 col-span-2">
                                <Label htmlFor="date" className="flex items-center gap-2">
                                    <CalendarDays className="w-4 h-4 text-gray-500" /> Date
                                </Label>
                                <Input
                                    id="date"
                                    type="date"
                                    min={new Date().toISOString().split('T')[0]} // Rule 1: No Past Dates
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="start" className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-gray-500" /> Start Time
                                </Label>
                                <Input
                                    id="start"
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    required
                                    className={validationError ? "border-red-500 focus-visible:ring-red-500" : ""}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="end" className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-gray-500" /> End Time
                                </Label>
                                <Input
                                    id="end"
                                    type="time"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {/* Validation Error Message */}
                        {validationError && (
                            <div className="font-medium text-[0.8rem] text-red-500 -mt-4">
                                {validationError}
                            </div>
                        )}

                        {/* Attendees */}
                        <div className="space-y-2">
                            <Label htmlFor="attendees" className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-gray-500" /> Attendees (Max: {room.capacity})
                            </Label>
                            <Input
                                id="attendees"
                                type="number"
                                min={1}
                                max={room.capacity}
                                value={attendees}
                                onChange={(e) => setAttendees(parseInt(e.target.value))}
                                required
                            />
                        </div>

                        {/* Recurring Toggle */}
                        <div className="border rounded-lg p-3 bg-gray-50 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <Repeat className="w-4 h-4 text-gray-500" />
                                    <Label htmlFor="recurring" className="cursor-pointer">Repeat Booking</Label>
                                </div>
                                <Switch id="recurring" checked={isRecurring} onCheckedChange={setIsRecurring} />
                            </div>

                            {isRecurring && (
                                <div className="grid grid-cols-2 gap-4 pt-2 animate-in fade-in slide-in-from-top-1">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Frequency</Label>
                                        <select
                                            className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm"
                                            value={repeatFrequency}
                                            onChange={(e) => setRepeatFrequency(e.target.value as 'daily' | 'weekly')}
                                        >
                                            <option value="daily">Daily</option>
                                            <option value="weekly">Weekly</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Occurrences</Label>
                                        <Input
                                            type="number"
                                            min={1}
                                            max={10}
                                            value={repeatCount}
                                            onChange={(e) => setRepeatCount(parseInt(e.target.value))}
                                            className="h-9 bg-white"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={loading || !!validationError} className="bg-blue-600 hover:bg-blue-700">
                                {loading ? 'Checking...' : 'Confirm Booking'}
                            </Button>
                        </DialogFooter>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    )
}
