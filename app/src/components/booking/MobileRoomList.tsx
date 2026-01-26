import { Database } from '@/types/database'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, Plus } from 'lucide-react'
import { format, parseISO, isWithinInterval } from 'date-fns'

type Room = Database['public']['Tables']['rooms']['Row']
type Booking = Database['public']['Tables']['bookings']['Row'] & { profiles?: { full_name: string } | null }

interface MobileRoomListProps {
    rooms: Room[]
    bookings: Booking[]
    onBookClick: (room: Room) => void
}

export function MobileRoomList({ rooms, bookings, onBookClick }: MobileRoomListProps) {
    const now = new Date()

    return (
        <div className="space-y-4 p-4 pb-24">
            {rooms.map(room => {
                // Filter bookings for this room for today (or the currently selected date in dashboard? Dashboard usually passes bookings for selected date)
                // Assuming 'bookings' prop contains bookings for the relevant day as per Dashboard logic
                const roomBookings = bookings
                    .filter(b => b.room_id === room.id)
                    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

                // Determine status
                const isMaintenance = room.status === 'maintenance'
                const isOccupied = !isMaintenance && roomBookings.some(b =>
                    isWithinInterval(now, { start: parseISO(b.start_time), end: parseISO(b.end_time) })
                )

                return (
                    <Card key={room.id} className="shadow-sm">
                        <CardHeader className="pb-3 border-b bg-gray-50/50">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-lg font-bold text-gray-900">{room.name}</CardTitle>
                                        {room.is_vip && <Badge variant="outline" className="text-[10px] border-yellow-300 bg-yellow-50 text-yellow-800 uppercase tracking-tighter">VIP</Badge>}
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                        <Users className="w-3 h-3" />
                                        <span>{room.capacity} People</span>
                                    </div>
                                </div>

                                {isMaintenance ? (
                                    <Badge variant="secondary" className="bg-gray-200 text-gray-600">Maintenance</Badge>
                                ) : isOccupied ? (
                                    <Badge variant="destructive" className="bg-red-500 hover:bg-red-600">Busy</Badge>
                                ) : (
                                    <Badge variant="default" className="bg-green-500 hover:bg-green-600">Available</Badge>
                                )}
                            </div>
                        </CardHeader>

                        <CardContent className="pt-4">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Today's Schedule</h4>
                            {roomBookings.length === 0 ? (
                                <div className="text-sm text-gray-400 italic py-2 text-center bg-gray-50 rounded border border-dashed">
                                    No bookings yet
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {roomBookings.map(booking => (
                                        <div key={booking.id} className="text-sm border-l-2 border-blue-500 pl-3 py-1 bg-gray-50/30 rounded-r-sm">
                                            <div className="flex justify-between items-center">
                                                <span className="font-medium text-gray-900 truncate max-w-[150px]">{booking.title}</span>
                                                <span className="text-xs font-mono text-gray-500 bg-white px-1.5 py-0.5 rounded border">
                                                    {format(parseISO(booking.start_time), 'HH:mm')} - {format(parseISO(booking.end_time), 'HH:mm')}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-0.5 truncate">
                                                {booking.profiles?.full_name || 'Unknown User'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>

                        <CardFooter className="pt-2 pb-4">
                            <Button
                                className="w-full bg-blue-600 hover:bg-blue-700"
                                onClick={() => onBookClick(room)}
                                disabled={isMaintenance}
                            >
                                <Plus className="w-4 h-4 mr-2" /> Book Room
                            </Button>
                        </CardFooter>
                    </Card>
                )
            })}
        </div>
    )
}
