import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Database } from '@/types/database'
import { useQuery } from '@tanstack/react-query'
import { format, subMinutes, parseISO } from 'date-fns'
import { CheckCircle, Clock, Calendar, ArrowLeft } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from 'react-router-dom'

type Booking = Database['public']['Tables']['bookings']['Row'] & {
    rooms: Database['public']['Tables']['rooms']['Row'] // joined room data
}

export default function MyBookingsPage() {
    const { toast } = useToast()
    const navigate = useNavigate()
    const [currentTime, setCurrentTime] = useState(new Date())

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000) // Update every minute
        return () => clearInterval(timer)
    }, [])

    const { data: bookings, refetch } = useQuery({
        queryKey: ['my-bookings-page'],
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
        return currentTime >= checkInWindowStart && currentTime < parseISO(booking.end_time)
    }

    return (
        <div className="min-h-screen bg-gray-50/30">
            {/* Header */}
            <header className="bg-white border-b px-8 py-4 flex items-center justify-between shadow-sm sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 text-white p-2 rounded-lg">
                        <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">My Bookings</h1>
                        <p className="text-xs text-gray-500">Manage your reservations</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
                    </Button>
                </div>
            </header>

            <main className="p-8 max-w-5xl mx-auto">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {bookings?.map((booking) => (
                        <Card key={booking.id} className="relative shadow-sm hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3 border-b bg-gray-50/50">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-base font-bold text-gray-900 line-clamp-1" title={booking.title || 'Untitled'}>
                                            {booking.title || 'Untitled Meeting'}
                                        </CardTitle>
                                        <CardDescription className="text-xs font-medium text-gray-500 mt-1 flex items-center gap-1">
                                            {booking.rooms?.name}
                                        </CardDescription>
                                    </div>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${booking.status === 'confirmed' ? 'bg-green-100 text-green-700 border-green-200' :
                                            booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                                booking.status === 'checked-in' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                    'bg-gray-100 text-gray-700 border-gray-200'
                                        }`}>
                                        {booking.status.toUpperCase()}
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4 text-sm space-y-4">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-gray-700">
                                        <Calendar className="w-4 h-4 text-gray-400" />
                                        <span>{format(parseISO(booking.start_time), 'EEEE, MMMM d, yyyy')}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-700">
                                        <Clock className="w-4 h-4 text-gray-400" />
                                        <span>{format(parseISO(booking.start_time), 'HH:mm')} - {format(parseISO(booking.end_time), 'HH:mm')}</span>
                                    </div>
                                </div>

                                {canCheckIn(booking) ? (
                                    <Button
                                        onClick={() => handleCheckIn(booking.id)}
                                        className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
                                        size="sm"
                                    >
                                        <CheckCircle className="w-4 h-4" /> Check In Now
                                    </Button>
                                ) : (
                                    <div className="h-9 flex items-center justify-center text-xs text-gray-400 italic bg-gray-50 rounded border border-dashed">
                                        {booking.status === 'checked-in' ? 'Checked In' : 'Check-in available 15m before start'}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}

                    {bookings && bookings.length === 0 && (
                        <div className="col-span-full text-center py-12 bg-white rounded-lg border border-dashed">
                            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <h3 className="text-lg font-medium text-gray-900">No Bookings Found</h3>
                            <p className="text-gray-500 mb-4">You have not made any room reservations yet.</p>
                            <Button onClick={() => navigate('/')}>Book a Room</Button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
