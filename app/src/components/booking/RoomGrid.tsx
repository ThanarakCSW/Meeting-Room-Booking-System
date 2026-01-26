import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Wifi, Tv } from 'lucide-react'
import { Database } from '@/types/database'
import { isWithinInterval, parseISO, addHours, format } from 'date-fns'

type Room = Database['public']['Tables']['rooms']['Row']
type Booking = Database['public']['Tables']['bookings']['Row']

interface RoomGridProps {
    rooms: Room[]
    bookings: Booking[]
    onBookClick: (room: Room) => void
}

export function RoomGrid({ rooms, bookings, onBookClick }: RoomGridProps) {
    const now = new Date()

    const getRoomStatus = (room: Room) => {
        // Check if there is a booking RIGHT NOW
        const currentBooking = bookings.find(booking =>
            booking.room_id === room.id &&
            booking.status === 'confirmed' &&
            isWithinInterval(now, {
                start: parseISO(booking.start_time),
                end: parseISO(booking.end_time)
            })
        )

        if (currentBooking) {
            return {
                status: 'occupied',
                message: `Occupied until ${format(parseISO(currentBooking.end_time), 'HH:mm')}`,
                variant: 'destructive' as const
            }
        }

        if (room.status === 'maintenance') {
            return {
                status: 'maintenance',
                message: 'Under Maintenance',
                variant: 'secondary' as const
            }
        }

        return {
            status: 'free',
            message: 'Available Now',
            variant: 'default' as const // We'll style this as green manually or use a custom class, Badge default is black/primary
        }
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-1 overflow-y-auto">
            {rooms.map(room => {
                const status = getRoomStatus(room)

                return (
                    <Card key={room.id} className="flex flex-col overflow-hidden transition-all hover:shadow-md">
                        <div className="p-6 flex-1">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">{room.name}</h3>
                                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                        <Users className="w-4 h-4" />
                                        <span>{room.capacity} People</span>
                                    </div>
                                </div>
                                <Badge
                                    variant={status.variant === 'destructive' || status.variant === 'secondary' ? status.variant : 'outline'}
                                    className={`${status.status === 'free' ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200' : ''}`}
                                >
                                    {status.message}
                                </Badge>
                            </div>

                            {/* Facilities */}
                            <div className="flex flex-wrap gap-2 mb-4">
                                {room.facilities?.map((facility, i) => (
                                    <span key={i} className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-full border">
                                        {facility}
                                    </span>
                                ))}
                                {(!room.facilities || room.facilities.length === 0) && (
                                    <span className="text-xs text-gray-400 italic">No specific facilities</span>
                                )}
                            </div>
                        </div>

                        {/* Action Area */}
                        <div className="p-4 bg-gray-50 border-t mt-auto">
                            <Button
                                className={`w-full ${status.status === 'free' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                                variant={status.status === 'occupied' ? 'outline' : 'default'}
                                disabled={room.status === 'maintenance'}
                                onClick={() => onBookClick(room)}
                            >
                                {status.status === 'free' ? 'Book Now' : 'Schedule for Later'}
                            </Button>
                        </div>
                    </Card>
                )
            })}
        </div>
    )
}
