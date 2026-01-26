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
import { addDays, addWeeks, isAfter } from 'date-fns'

type Room = Database['public']['Tables']['rooms']['Row']

interface BookingDialogProps {
    room: Room
    trigger?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
    initialStartTime?: string
    initialEndTime?: string
}

export function BookingDialog({ room, trigger, open: controlledOpen, onOpenChange: setControlledOpen, initialStartTime, initialEndTime }: BookingDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const open = controlledOpen ?? internalOpen
    const setOpen = setControlledOpen ?? setInternalOpen

    const [title, setTitle] = useState('')
    const [startTime, setStartTime] = useState('')
    const [endTime, setEndTime] = useState('')
    const [attendees, setAttendees] = useState(1)
    const [isRecurring, setIsRecurring] = useState(false)
    const [repeatFrequency, setRepeatFrequency] = useState<'daily' | 'weekly'>('daily')
    const [repeatCount, setRepeatCount] = useState(1)

    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    // Reset or Initialize state when dialog opens
    useEffect(() => {
        if (open) {
            if (initialStartTime) setStartTime(initialStartTime)
            if (initialEndTime) setEndTime(initialEndTime)
        }
    }, [open, initialStartTime, initialEndTime])

    // Smart Recommendation Warning
    useEffect(() => {
        if (attendees && room.capacity >= 20 && attendees <= 2) {
            toast({
                title: "Smart Recommendation",
                description: `This room is too big for ${attendees} people. Consider using a smaller room.`,
                variant: 'default',
                className: "bg-yellow-50 border-yellow-200 text-yellow-800"
            })
        }
    }, [attendees, room.capacity, toast])

    const handleBook = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.user) throw new Error('You must be logged in to book a room.')

            const user = session.user
            const start = new Date(startTime)
            const end = new Date(endTime)
            const bookingsToCreate = []

            // Recurring Logic
            if (isRecurring) {
                // Constraint: Must not generate beyond 4 weeks
                const maxDate = addWeeks(new Date(), 4)

                let currentStart = start
                let currentEnd = end

                // Limit simulation to catch "6 months" abuse - though UI only allows count, let's enforce date limit check
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

            // Iterate and create bookings (check availability for each)
            for (const booking of bookingsToCreate) {
                // 1. Check availability
                const { data: isAvailable, error: rpcError } = await supabase
                    .rpc('check_availability', {
                        p_room_id: room.id,
                        p_start_time: booking.start.toISOString(),
                        p_end_time: booking.end.toISOString()
                    })

                if (rpcError) throw rpcError
                if (!isAvailable) {
                    throw new Error(`Room is not available on ${booking.start.toLocaleDateString()} at this time.`)
                }
            }

            // 2. Insert Bookings
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

            // @ts-ignore - Supabase types are tricky with exact matches sometimes
            const { error: insertError } = await supabase
                .from('bookings')
                .insert(inserts)

            if (insertError) throw insertError

            toast({
                title: "Booking Successful",
                description: room.is_vip
                    ? "Your VIP bookings are pending approval."
                    : `Successfully created ${inserts.length} booking(s).`
            })
            setOpen(false)
            setTitle('')
            setIsRecurring(false)
            setRepeatCount(1)
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
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
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Book {room.name}</DialogTitle>
                    <DialogDescription>
                        {room.is_vip && <span className="text-yellow-600 font-medium block mb-1">⚠️ VIP Room - Requires Approval</span>}
                        Enter details for your meeting.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleBook} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Meeting Title</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            placeholder="Design Sync"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="attendees">Number of Attendees</Label>
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

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="start">Start Time</Label>
                            <Input
                                id="start"
                                type="datetime-local"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="end">End Time</Label>
                            <Input
                                id="end"
                                type="datetime-local"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="flex items-center space-x-2 py-2">
                        <Switch id="recurring" checked={isRecurring} onCheckedChange={setIsRecurring} />
                        <Label htmlFor="recurring">Repeat Booking</Label>
                    </div>

                    {isRecurring && (
                        <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-md">
                            <div className="space-y-2">
                                <Label>Frequency</Label>
                                <select
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    value={repeatFrequency}
                                    onChange={(e) => setRepeatFrequency(e.target.value as 'daily' | 'weekly')}
                                >
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>Occurrences</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={10}
                                    value={repeatCount}
                                    onChange={(e) => setRepeatCount(parseInt(e.target.value))}
                                />
                                <span className="text-xs text-muted-foreground">Max 4 weeks ahead</span>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Booking...' : (room.is_vip ? 'Request Approval' : 'Confirm Booking')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
