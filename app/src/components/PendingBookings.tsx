import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Database } from '@/types/database'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { Check, X, Clock } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

type Booking = Database['public']['Tables']['bookings']['Row'] & {
    profiles: Database['public']['Tables']['profiles']['Row']
    rooms: Database['public']['Tables']['rooms']['Row']
}

export function PendingBookings() {
    const { toast } = useToast()
    const queryClient = useQueryClient()

    const { data: bookings } = useQuery({
        queryKey: ['pending-bookings'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('bookings')
                .select('*, profiles(*), rooms(*)')
                .eq('status', 'pending')
                .order('created_at', { ascending: true })

            if (error) throw error
            return data as unknown as Booking[]
        }
    })

    const handleAction = async (id: string, action: 'approve' | 'reject') => {
        try {
            const status = action === 'approve' ? 'confirmed' : 'cancelled'
            const { error } = await supabase
                .from('bookings')
                .update({ status })
                .eq('id', id)

            if (error) throw error

            toast({
                title: action === 'approve' ? "Booking Approved" : "Booking Rejected",
            })
            queryClient.invalidateQueries({ queryKey: ['pending-bookings'] })
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: "Error",
                description: error.message
            })
        }
    }

    if (!bookings || bookings.length === 0) return null

    return (
        <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-yellow-600">Pending VIP Approvals</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {bookings.map((booking) => (
                    <Card key={booking.id} className="border-yellow-200 bg-yellow-50">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-lg">{booking.title}</CardTitle>
                                    <CardDescription>{booking.rooms?.name} • {booking.profiles?.full_name || booking.profiles?.department || 'User'}</CardDescription>
                                </div>
                                <span className="bg-yellow-200 text-yellow-800 text-xs px-2 py-1 rounded-full border border-yellow-300">
                                    PENDING
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-2 text-gray-600 text-sm">
                                <Clock className="w-4 h-4" />
                                <span>{format(parseISO(booking.start_time), 'MMM d, HH:mm')} - {format(parseISO(booking.end_time), 'HH:mm')}</span>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                    size="sm"
                                    onClick={() => handleAction(booking.id, 'approve')}
                                >
                                    <Check className="w-4 h-4 mr-1" /> Approve
                                </Button>
                                <Button
                                    className="flex-1"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleAction(booking.id, 'reject')}
                                >
                                    <X className="w-4 h-4 mr-1" /> Reject
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
