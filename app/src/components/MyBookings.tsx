import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Database } from '@/types/database'
import { useQuery } from '@tanstack/react-query'
import { format, subMinutes, parseISO } from 'date-fns'
import { CheckCircle, Clock } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

type Booking = Database['public']['Tables']['bookings']['Row'] & {
    rooms: Database['public']['Tables']['rooms']['Row'] // joined room data
}

export function MyBookings() {
    const { toast } = useToast()
    const [currentTime, setCurrentTime] = useState(new Date())

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000) // Update every minute
        return () => clearInterval(timer)
    }, [])

    const { data: bookings, refetch } = useQuery({
        queryKey: ['my-bookings'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return []

            const { data, error } = await supabase
                .from('bookings')
                .select('*, rooms(*)')
                .eq('user_id', user.id)
                .order('start_time', { ascending: true })

            if (error) throw error
            return data as unknown as Booking[]
        }
    })

    const handleCheckIn = async (bookingId: string) => {
        try {
            const { error } = await supabase
                .from('bookings')
                .update({ status: 'checked-in' })
                .eq('id', bookingId)

            if (error) throw error

            toast({
                title: "Checked in!",
                description: "You have successfully checked into the room."
            })
            refetch()
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: "Error",
                description: error.message
            })
        }
    }

    const canCheckIn = (booking: Booking) => {
        if (booking.status !== 'confirmed') return false
        const start = parseISO(booking.start_time)
        const checkInWindowStart = subMinutes(start, 15)
        // Allow check-in if current time is after (start - 15m) AND before end_time (optional, usually before start + grace)
        // Requirement says "15 mins before". We can assume it stays open until meeting end or strict.
        // Let's say window is [Start - 15m, End].
        return currentTime >= checkInWindowStart && currentTime < parseISO(booking.end_time)
    }

    if (!bookings || bookings.length === 0) return null

    return (
        <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">My Upcoming Bookings</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {bookings.map((booking) => (
                    <Card key={booking.id} className="relative">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-lg">{booking.title}</CardTitle>
                                    <CardDescription>{booking.rooms?.name}</CardDescription>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full border ${booking.status === 'confirmed' ? 'bg-green-50 text-green-700 border-green-200' :
                                    booking.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                        booking.status === 'checked-in' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                            'bg-gray-50 text-gray-700 border-gray-200'
                                    }`}>
                                    {booking.status.toUpperCase()}
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="text-sm space-y-2">
                            <div className="flex items-center gap-2 text-gray-600">
                                <Clock className="w-4 h-4" />
                                <span>{format(parseISO(booking.start_time), 'MMM d, HH:mm')} - {format(parseISO(booking.end_time), 'HH:mm')}</span>
                            </div>

                            {canCheckIn(booking) && (
                                <Button
                                    onClick={() => handleCheckIn(booking.id)}
                                    className="w-full mt-2 gap-2"
                                    size="sm"
                                >
                                    <CheckCircle className="w-4 h-4" /> Check In
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
