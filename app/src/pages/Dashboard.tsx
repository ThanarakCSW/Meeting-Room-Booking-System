import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { format, startOfDay, endOfDay, addHours, differenceInMinutes, parseISO } from 'date-fns'
import { Database } from '@/types/database'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BookingModal } from '@/components/booking/BookingModal'
import { useToast } from '@/hooks/use-toast'

// Import new Pixel-Perfect Components
import { DateToolbar } from '@/components/booking/DateToolbar'

import { TimelineGrid } from '@/components/booking/TimelineGrid'
import { RoomGrid } from '@/components/booking/RoomGrid'
import { MobileRoomList } from '@/components/booking/MobileRoomList'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { MyBookings } from '@/components/MyBookings'
import { LayoutGrid, List, Search, LogOut, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Room = Database['public']['Tables']['rooms']['Row']
type Booking = Database['public']['Tables']['bookings']['Row'] & { profiles?: { full_name: string } | null }

export default function Dashboard() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { toast } = useToast()
    const [date, setDate] = useState(new Date())
    const [session, setSession] = useState<any>(null)
    const { signOut } = useAuth() // Assuming useAuth is available or we use supabase directly. 
    // Wait, useAuth is not imported in Dashboard.tsx currently. I need to check imports.
    // Dashboard.tsx imports:
    // import { useToast } from '@/hooks/use-toast'
    // ...
    // It DOES NOT import useAuth. 
    // However, AdminDashboard imports useAuth.
    // I need to add import { useAuth } from '@/hooks/useAuth' to Dashboard.tsx first.

    // Interaction State
    // Interaction State
    const [dialogOpen, setDialogOpen] = useState(false)
    const [selectedSlot, setSelectedSlot] = useState<{ room: Room, start: string, end: string } | null>(null)
    const [viewMode, setViewMode] = useState<'timeline' | 'grid' | 'my-bookings'>('timeline')
    const [searchQuery, setSearchQuery] = useState('')

    // Auth check
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            if (!session) navigate('/login')
        })
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
            if (!session) navigate('/login')
        })
        return () => subscription.unsubscribe()
    }, [navigate])

    // Ghost Meeting Check (Auto-Release)
    useEffect(() => {
        const checkGhostMeetings = async () => {
            // Fetch active bookings that started > 15 mins ago and not checked in
            const now = new Date()
            const { data: ghostBookings } = await supabase
                .from('bookings')
                .select('*')
                .eq('status', 'confirmed')
                .eq('check_in_status', 'pending')
                .lt('start_time', addHours(now, -0.25).toISOString()) // Started more than 15 mins ago

            if (ghostBookings && ghostBookings.length > 0) {
                // Auto-cancel them
                for (const booking of ghostBookings) {
                    // Double check time difference just in case
                    if (differenceInMinutes(now, parseISO(booking.start_time)) > 15) {
                        await supabase
                            .from('bookings')
                            .update({ status: 'cancelled', check_in_status: 'missed' })
                            .eq('id', booking.id)
                    }
                }
                if (ghostBookings.length > 0) {
                    toast({
                        title: "Ghost Meetings Released",
                        description: `${ghostBookings.length} booking(s) were auto-cancelled due to no check-in.`
                    })
                    queryClient.invalidateQueries({ queryKey: ['bookings'] })
                }
            }
        }

        const interval = setInterval(checkGhostMeetings, 60000) // Run every minute
        checkGhostMeetings() // Run immediately

        return () => clearInterval(interval)
    }, [queryClient, toast])

    // Fetch Rooms
    const { data: rooms } = useQuery({
        queryKey: ['rooms'],
        queryFn: async () => {
            const { data } = await supabase.from('rooms').select('*').order('id')
            return data as Room[]
        }
    })

    // Fetch Bookings for Date
    const { data: bookings } = useQuery({
        queryKey: ['bookings', format(date, 'yyyy-MM-dd')],
        queryFn: async () => {
            const start = startOfDay(date).toISOString()
            const end = endOfDay(date).toISOString()

            const { data } = await supabase
                .from('bookings')
                .select('*, profiles:user_id(full_name)')
                .in('status', ['confirmed', 'checked-in', 'pending'])
                .lt('start_time', end)
                .gt('end_time', start)

            return data as Booking[]
        },
        refetchInterval: 5000
    })

    // Handle Click on Empty Grid Slot
    const handleSlotClick = (room: Room, startTime: Date) => {
        const endTime = addHours(startTime, 1)

        setSelectedSlot({
            room,
            start: format(startTime, "yyyy-MM-dd'T'HH:mm"),
            end: format(endTime, "yyyy-MM-dd'T'HH:mm")
        })
        setDialogOpen(true)
    }

    // Handle New Booking Button (General)
    const handleNewBooking = () => {
        if (!rooms || rooms.length === 0) return
        // Default to first room, current time (or next hour)
        const now = new Date()
        handleSlotClick(rooms[0], now)
    }

    // Handle Cancel Booking
    const handleCancelBooking = async (bookingId: string) => {
        try {
            const { error } = await supabase
                .from('bookings')
                .update({ status: 'cancelled' })
                .eq('id', bookingId)

            if (error) throw error

            toast({ title: "Booking Cancelled", description: "The reservation has been removed." })
            queryClient.invalidateQueries({ queryKey: ['bookings'] })
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message })
        }
    }

    const handleSignOut = async () => {
        // If useAuth provides signOut, use it. usage in AdminDashboard: const { signOut } = useAuth(); await signOut(); navigate('/login')
        // So I need to use useAuth hook.
        const { error } = await supabase.auth.signOut()
        if (error) toast({ variant: "destructive", title: "Error signing out", description: error.message })
        navigate('/login')
    }

    return (
        <div className="flex flex-col h-screen bg-gray-50/30">
            {/* Admin-style Header for User Dashboard */}
            <header className="bg-white border-b px-8 py-4 flex items-center justify-between shadow-sm sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 text-white p-2 rounded-lg">
                        <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Booking Console</h1>
                        <p className="text-xs text-gray-500">Meeting Room Booking System</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-600">{session?.user?.user_metadata?.full_name || 'User'}</span>
                    <Button variant="outline" size="sm" onClick={handleSignOut}>
                        <LogOut className="w-4 h-4 mr-2" /> Sign Out
                    </Button>
                </div>
            </header>
            <DateToolbar
                currentDate={date}
                onDateChange={setDate}
                onNewBooking={handleNewBooking}
            />

            {/* Desktop View */}
            {/* Control Bar: Search & Toggle - Desktop Only (Mobile has its own patterns usually, but let's keep it consistent) */}
            <div className="hidden md:flex items-center justify-between px-6 py-4 bg-white border-b shadow-sm gap-4">
                <div className="relative w-72">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                        placeholder="Search rooms..."
                        className="pl-9 bg-gray-50 border-gray-200"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200">
                    <Button
                        variant="ghost"
                        size="sm"
                        className={`gap-2 text-sm ${viewMode === 'timeline' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                        onClick={() => setViewMode('timeline')}
                    >
                        <List className="w-4 h-4" /> Timeline
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={`gap-2 text-sm ${viewMode === 'grid' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                        onClick={() => setViewMode('grid')}
                    >
                        <LayoutGrid className="w-4 h-4" /> Grid
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={`gap-2 text-sm ${viewMode === 'my-bookings' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                        onClick={() => setViewMode('my-bookings')}
                    >
                        <List className="w-4 h-4" /> My Bookings
                    </Button>
                </div>
            </div>

            {/* Desktop View Content */}
            <div className="hidden md:block flex-1 overflow-hidden m-6 relative">
                {/* Filtered Rooms */}
                {(() => {
                    const filteredRooms = rooms?.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase())) || []

                    if (viewMode === 'timeline') {
                        return (
                            <TimelineGrid
                                rooms={filteredRooms}
                                bookings={bookings || []}
                                onSlotClick={handleSlotClick}
                                onCancelBooking={handleCancelBooking}
                                currentUserId={session?.user?.id}
                            />
                        )
                    } else if (viewMode === 'grid') {
                        return (
                            <div className="h-full overflow-y-auto pr-2 pb-20">
                                <RoomGrid
                                    rooms={filteredRooms}
                                    bookings={bookings || []}
                                    onBookClick={(room) => handleSlotClick(room, new Date())}
                                />
                            </div>
                        )
                    } else {
                        return (
                            <div className="h-full overflow-y-auto pr-2 pb-20">
                                <MyBookings />
                            </div>
                        )
                    }
                })()}
            </div>

            {/* Mobile View */}
            <div className="block md:hidden">
                <MobileRoomList
                    rooms={rooms || []}
                    bookings={bookings || []}
                    onBookClick={(room) => handleSlotClick(room, new Date())}
                />
            </div>

            {/* Hidden booking dialog controlled by state */}
            {selectedSlot && (
                <BookingModal
                    room={selectedSlot.room}
                    open={dialogOpen}
                    onOpenChange={setDialogOpen}
                    initialStartTime={selectedSlot.start}
                    initialEndTime={selectedSlot.end}
                    trigger={<span />}
                />
            )}

            <MobileBottomNav />
        </div>
    )
}
