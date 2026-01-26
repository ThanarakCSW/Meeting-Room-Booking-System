import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { NativeSelect } from '@/components/ui/native-select'
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { Database } from '@/types/database'

type Room = Database['public']['Tables']['rooms']['Row']

export default function ReportIssue() {
    const { toast } = useToast()
    const navigate = useNavigate()
    const [rooms, setRooms] = useState<Room[]>([])
    const [loading, setLoading] = useState(false)

    // Form State
    const [roomId, setRoomId] = useState<string>('')
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [severity, setSeverity] = useState('medium')

    useEffect(() => {
        const fetchRooms = async () => {
            const { data } = await supabase.from('rooms').select('*').order('name')
            if (data) setRooms(data)
        }
        fetchRooms()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('You must be logged in.')

            const { error } = await supabase.from('issues').insert({
                user_id: user.id,
                room_id: roomId ? parseInt(roomId) : null,
                title,
                description,
                severity,
                status: 'open'
            })

            if (error) throw error

            toast({
                title: "Issue Reported",
                description: "Thank you for reporting. Our team will look into it."
            })
            navigate('/')
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
        <div className="min-h-screen bg-gray-50/30">
            {/* Header */}
            <header className="bg-white border-b px-8 py-4 flex items-center justify-between shadow-sm sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="bg-red-600 text-white p-2 rounded-lg">
                        <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Report an Issue</h1>
                        <p className="text-xs text-gray-500">Help us maintain our facilities</p>
                    </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
                </Button>
            </header>

            <main className="p-8 max-w-2xl mx-auto">
                <div className="bg-white rounded-lg shadow-sm border p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">

                        <div className="space-y-2">
                            <Label>Issue Title</Label>
                            <Input
                                placeholder="e.g. Projector not working"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Affected Room (Optional)</Label>
                                <NativeSelect
                                    value={roomId}
                                    onChange={(e) => setRoomId(e.target.value)}
                                >
                                    <option value="0">General / No Specific Room</option>
                                    {rooms.map(room => (
                                        <option key={room.id} value={room.id.toString()}>
                                            {room.name}
                                        </option>
                                    ))}
                                </NativeSelect>
                            </div>

                            <div className="space-y-2">
                                <Label>Severity</Label>
                                <NativeSelect
                                    value={severity}
                                    onChange={(e) => setSeverity(e.target.value)}
                                >
                                    <option value="low">Low - Minor nuisance</option>
                                    <option value="medium">Medium - Needs attention</option>
                                    <option value="high">High - Critical failure</option>
                                </NativeSelect>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                                placeholder="Please describe the issue in detail..."
                                className="h-32"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                required
                            />
                        </div>

                        <Button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white" disabled={loading}>
                            {loading ? 'Submitting...' : 'Submit Report'}
                        </Button>
                    </form>
                </div>
            </main>
        </div>
    )
}
