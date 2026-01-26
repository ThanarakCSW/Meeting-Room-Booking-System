import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Database } from '@/types/database'
import { Users, Wifi, Projector, CalendarClock, CheckCircle2, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { BookingDialog } from './BookingDialog'

type Room = Database['public']['Tables']['rooms']['Row']
type Booking = Database['public']['Tables']['bookings']['Row']

interface RoomCardProps {
    room: Room
    currentBooking?: Booking | null
}

export function RoomCard({ room, currentBooking }: RoomCardProps) {
    const isOccupied = !!currentBooking

    return (
        <Card className="rounded-2xl border-none shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden bg-white flex flex-col h-full">
            <div className={`h-2 w-full ${isOccupied ? 'bg-red-500' : 'bg-green-500'}`} />

            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <CardTitle className="text-xl font-semibold text-gray-900 leading-tight">
                        {room.name}
                    </CardTitle>
                    {isOccupied ? (
                        <div className="flex items-center gap-1.5 bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>In Use</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Available</span>
                        </div>
                    )}
                </div>
                <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span>Capacity: {room.capacity}</span>
                </div>
            </CardHeader>

            <CardContent className="flex-grow pt-0">
                <div className="mt-4 space-y-3">
                    {isOccupied && currentBooking && (
                        <div className="bg-red-50 p-3 rounded-xl border border-red-100 flex items-start gap-3">
                            <CalendarClock className="w-5 h-5 text-red-500 mt-0.5" />
                            <div>
                                <p className="text-xs font-medium text-red-800 uppercase tracking-wide">Reserved Until</p>
                                <p className="text-sm font-semibold text-red-900">
                                    {format(new Date(currentBooking.end_time), 'h:mm a')}
                                </p>
                                <p className="text-xs text-red-600 mt-0.5 line-clamp-1">{currentBooking.title}</p>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-wrap gap-2 mt-3">
                        {room.facilities?.map((facility, i) => (
                            <span key={i} className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-md font-medium">
                                {facility.toLowerCase().includes('wifi') && <Wifi className="w-3 h-3" />}
                                {facility.toLowerCase().includes('projector') && <Projector className="w-3 h-3" />}
                                {facility}
                            </span>
                        ))}
                    </div>
                </div>
            </CardContent>

            <CardFooter className="pt-4 border-t border-gray-50 bg-gray-50/30">
                <BookingDialog
                    room={room}
                    trigger={
                        <Button
                            className={`w-full rounded-xl font-medium shadow-none ${isOccupied ? 'bg-gray-100 text-gray-400 hover:bg-gray-100 cursor-not-allowed' : 'bg-primary hover:bg-primary/90'}`}
                            disabled={isOccupied}
                        >
                            {isOccupied ? 'Book for Later' : 'Book Now'}
                        </Button>
                    }
                />
            </CardFooter>
        </Card>
    )
}
