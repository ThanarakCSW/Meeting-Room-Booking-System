import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Database } from '@/types/database'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from '@/components/ui/dialog'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Pencil, Trash2, Plus, LogOut, LayoutDashboard, CalendarDays, Settings, BarChart3, Wifi, Tv, MoreHorizontal, Search, AlertTriangle } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AdminScheduler } from '@/components/admin/AdminScheduler'
import { RoomStatusManager } from '@/components/admin/RoomStatusManager'
import { AnalyticsReports } from '@/components/admin/AnalyticsReports'
import { IssuesList } from '@/components/admin/IssuesList'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

type Room = Database['public']['Tables']['rooms']['Row']

export default function AdminDashboard() {
    const { toast } = useToast()
    const queryClient = useQueryClient()
    const navigate = useNavigate()
    const { signOut } = useAuth()

    // Existing State for Room Edit
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingRoom, setEditingRoom] = useState<Room | null>(null)
    const [formData, setFormData] = useState({
        name: '',
        capacity: 0,
        facilities: '',
        is_vip: false
    })
    const [searchQuery, setSearchQuery] = useState('')

    const { data: rooms } = useQuery({
        queryKey: ['admin-rooms'],
        queryFn: async () => {
            const { data, error } = await supabase.from('rooms').select('*').order('id')
            if (error) throw error
            return data as Room[]
        }
    })

    const handleSignOut = async () => {
        await signOut()
        navigate('/login')
    }

    // --- Room Management Handlers (Reused) ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const facilitiesArray = formData.facilities.split(',').map(f => f.trim()).filter(Boolean)
            if (editingRoom) {
                await supabase.from('rooms').update({
                    name: formData.name,
                    capacity: formData.capacity,
                    facilities: facilitiesArray,
                    is_vip: formData.is_vip
                }).eq('id', editingRoom.id)
                toast({ title: "Room Updated" })
            } else {
                await supabase.from('rooms').insert({
                    name: formData.name,
                    capacity: formData.capacity,
                    facilities: facilitiesArray,
                    is_vip: formData.is_vip
                })
                toast({ title: "Room Created" })
            }
            setIsDialogOpen(false)
            setEditingRoom(null)
            setFormData({ name: '', capacity: 0, facilities: '', is_vip: false })
            queryClient.invalidateQueries({ queryKey: ['admin-rooms'] })
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error", description: error.message })
        }
    }

    const startEdit = (room: Room) => {
        setEditingRoom(room)
        setFormData({
            name: room.name,
            capacity: room.capacity,
            facilities: room.facilities?.join(', ') || '',
            is_vip: room.is_vip
        })
        setIsDialogOpen(true)
    }

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this room?')) return
        const { error } = await supabase.from('rooms').delete().eq('id', id)
        if (error) toast({ variant: 'destructive', description: error.message })
        else {
            toast({ title: "Room Deleted" })
            queryClient.invalidateQueries({ queryKey: ['admin-rooms'] })
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Admin Header */}
            <header className="bg-white border-b px-8 py-4 flex items-center justify-between shadow-sm sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="bg-black text-white p-2 rounded-lg">
                        <LayoutDashboard className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Admin Console</h1>
                        <p className="text-xs text-gray-500">Meeting Room Management System</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-600">Administrator</span>
                    <Button variant="outline" size="sm" onClick={handleSignOut}>
                        <LogOut className="w-4 h-4 mr-2" /> Sign Out
                    </Button>
                </div>
            </header>

            <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
                <Tabs defaultValue="scheduler" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-4 max-w-xl bg-white border shadow-sm">
                        <TabsTrigger value="scheduler" className="data-[state=active]:bg-gray-100">
                            <CalendarDays className="w-4 h-4 mr-2" /> Timeline
                        </TabsTrigger>
                        <TabsTrigger value="rooms" className="data-[state=active]:bg-gray-100">
                            <Settings className="w-4 h-4 mr-2" /> Rooms
                        </TabsTrigger>
                        <TabsTrigger value="issues" className="data-[state=active]:bg-gray-100">
                            <AlertTriangle className="w-4 h-4 mr-2" /> Issues
                        </TabsTrigger>
                        <TabsTrigger value="analytics" className="data-[state=active]:bg-gray-100">
                            <BarChart3 className="w-4 h-4 mr-2" /> Reports
                        </TabsTrigger>
                    </TabsList>

                    {/* 1. Scheduler Tab */}
                    <TabsContent value="scheduler" className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold tracking-tight">Master Schedule</h2>
                            <p className="text-sm text-gray-500">Manage all organization bookings and blocks.</p>
                        </div>
                        <AdminScheduler rooms={rooms || []} />
                    </TabsContent>

                    {/* 2. Rooms Tab (Management + Quick Actions) */}
                    <TabsContent value="rooms" className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold tracking-tight">Room Control</h2>
                            {/* Desktop Add Button */}
                            <Button
                                className="hidden md:flex"
                                onClick={() => { setEditingRoom(null); setFormData({ name: '', capacity: 0, facilities: '', is_vip: false }); setIsDialogOpen(true) }}
                            >
                                <Plus className="w-4 h-4 mr-2" /> Add Room
                            </Button>

                            {/* Mobile FAB Add Button - Corrected Position and Z-Index */}
                            <Button
                                className="md:hidden fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 flex items-center justify-center p-0"
                                onClick={() => { setEditingRoom(null); setFormData({ name: '', capacity: 0, facilities: '', is_vip: false }); setIsDialogOpen(true) }}
                            >
                                <Plus className="w-8 h-8 text-white" />
                            </Button>

                            {/* Add/Edit Room Dialog */}
                            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>{editingRoom ? 'Edit Room' : 'Add New Room'}</DialogTitle>
                                    </DialogHeader>
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Name</Label>
                                            <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Capacity</Label>
                                            <Input type="number" value={formData.capacity} onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) })} required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Facilities</Label>
                                            <Input value={formData.facilities} onChange={e => setFormData({ ...formData, facilities: e.target.value })} placeholder="Wifi, TV" />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input type="checkbox" id="vip" checked={formData.is_vip} onChange={e => setFormData({ ...formData, is_vip: e.target.checked })} />
                                            <Label htmlFor="vip">VIP Room</Label>
                                        </div>
                                        <DialogFooter>
                                            <Button type="submit">Save</Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </div>

                        {/* Status Manager Panel (Live Status + Toggles) */}
                        <RoomStatusManager rooms={rooms || []} />

                        {/* Detailed List (Optional for direct edit/delete - could integrate into Manager but keeping here for full CRUD) */}
                        {/* Inventory List - Responsive Switch */}
                        <div className="bg-white rounded-md border">
                            {/* Desktop Table View */}
                            <div className="hidden md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Capacity</TableHead>
                                            <TableHead>Facilities</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {rooms?.map(room => (
                                            <TableRow key={room.id}>
                                                <TableCell className="font-medium">{room.name}</TableCell>
                                                <TableCell>{room.capacity}</TableCell>
                                                <TableCell>{room.facilities?.join(', ')}</TableCell>
                                                <TableCell>
                                                    {room.status === 'maintenance' ?
                                                        <Badge variant="secondary">Maintenance</Badge> :
                                                        <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>
                                                    }
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button variant="ghost" size="icon" onClick={() => startEdit(room)}><Pencil className="w-4 h-4" /></Button>
                                                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(room.id)}><Trash2 className="w-4 h-4" /></Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mobile Card View with Search & Compact Design */}
                            <div className="md:hidden pb-20">
                                {/* Sticky Search Bar */}
                                <div className="sticky top-0 bg-gray-50 pt-2 pb-4 z-40 px-1">
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                        <Input
                                            type="search"
                                            placeholder="Search rooms..."
                                            className="pl-9 bg-white shadow-sm"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {rooms?.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase())).map(room => (
                                        <Card
                                            key={room.id}
                                            className="shadow-sm active:scale-[0.99] transition-transform overflow-hidden"
                                        >
                                            <div
                                                className="p-4 flex items-center justify-between"
                                                onClick={() => startEdit(room)} // Tap entire card to edit
                                            >
                                                <div className="flex flex-col gap-1">
                                                    <h3 className="text-base font-bold text-gray-900 leading-none">{room.name}</h3>
                                                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                                                        <Users className="w-3.5 h-3.5" />
                                                        <span>{room.capacity}</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    {room.status === 'maintenance' ?
                                                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5">Maintenance</Badge> :
                                                        <Badge className="bg-green-500 text-white text-[10px] h-5 px-1.5 hover:bg-green-600">Active</Badge>
                                                    }

                                                    {/* Actions Dropdown */}
                                                    <div onClick={(e) => e.stopPropagation()}>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                                                                    <MoreHorizontal className="w-5 h-5 text-gray-400" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={() => startEdit(room)}>
                                                                    <Pencil className="w-4 h-4 mr-2" /> Edit Details
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    className="text-red-600 focus:text-red-600"
                                                                    onClick={() => handleDelete(room.id)}
                                                                >
                                                                    <Trash2 className="w-4 h-4 mr-2" /> Delete Room
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    {/* 3. Analytics Tab */}
                    <TabsContent value="analytics">
                        <AnalyticsReports rooms={rooms || []} />
                    </TabsContent>

                    {/* 4. Issues Tab */}
                    <TabsContent value="issues">
                        <IssuesList />
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    )
}
