import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Activity, AlertTriangle, CheckCircle2, DoorClosed } from 'lucide-react'

type Room = Database['public']['Tables']['rooms']['Row']

interface RoomStatusManagerProps {
    rooms: Room[]
}

export function RoomStatusManager({ rooms }: RoomStatusManagerProps) {
    const { toast } = useToast()

    // Calculate Stats
    const totalRooms = rooms.length
    const maintenanceRooms = rooms.filter(r => r.status === 'maintenance').length
    const activeRooms = totalRooms - maintenanceRooms
    // Mock "In Use" for now as we don't have realtime booking state passed here easily without more complex props or fetching
    // Ideally we pass bookings prop or fetch active bookings here. 
    // For MVP UI, let's keep it simple or static 0 for now unless we refactor to pass bookings.
    const inUseRooms = 0

    const toggleRoomStatus = async (room: Room) => {
        const newStatus = room.status === 'active' ? 'maintenance' : 'active'

        try {
            const { error } = await supabase
                .from('rooms')
                .update({ status: newStatus })
                .eq('id', room.id)

            if (error) throw error
            toast({
                title: `Room Updated`,
                description: `${room.name} is now ${newStatus === 'maintenance' ? 'under maintenance' : 'active'}.`
            })
            // Parent query invalidation should handle UI update if we invalidate queries properly in parent
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message })
        }
    }

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Rooms</CardTitle>
                        <DoorClosed className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalRooms}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{activeRooms}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{maintenanceRooms}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Issues Reported</CardTitle>
                        <Activity className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">0</div>
                        <p className="text-xs text-muted-foreground">Last 24h</p>
                    </CardContent>
                </Card>
            </div>

            {/* Room List Control */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Room Status</CardTitle>
                    <CardDescription>Toggle maintenance mode to instantly block bookings.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {rooms.map(room => (
                        <div key={room.id} className="flex items-center justify-between p-3 border rounded-lg bg-white shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className={`w-3 h-3 rounded-full ${room.status === 'active' ? 'bg-green-500' : 'bg-orange-500'}`} />
                                <div>
                                    <div className="font-medium">{room.name}</div>
                                    <div className="text-xs text-gray-500">Capacity: {room.capacity}</div>
                                </div>
                                {room.is_vip && <Badge variant="outline" className="border-yellow-200 bg-yellow-50 text-yellow-800">VIP</Badge>}
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">{room.status === 'active' ? 'Operational' : 'Maintenance'}</span>
                                <Switch
                                    checked={room.status === 'active'}
                                    onCheckedChange={() => toggleRoomStatus(room)}
                                />
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    )
}
