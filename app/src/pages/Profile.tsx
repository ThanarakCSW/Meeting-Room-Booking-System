import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function Profile() {
    const { user, profile, loading: authLoading } = useAuth()
    const [fullName, setFullName] = useState('')
    const [department, setDepartment] = useState('')
    const [saving, setSaving] = useState(false)
    const { toast } = useToast()
    const navigate = useNavigate()

    useEffect(() => {
        if (profile) {
            setFullName(profile.full_name || '')
            setDepartment(profile.department || '')
        }
    }, [profile])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return
        setSaving(true)

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: fullName,
                    department: department,
                })
                .eq('id', user.id)

            if (error) throw error

            toast({
                title: "Profile Updated",
                description: "Your profile information has been saved.",
            })
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message,
            })
        } finally {
            setSaving(false)
        }
    }

    if (authLoading) return <div className="p-8">Loading...</div>

    return (
        <div className="min-h-screen bg-gray-50/30 p-8">
            <div className="max-w-md mx-auto bg-white rounded-lg border shadow-sm p-6">
                <Button variant="ghost" className="mb-4 pl-0 hover:bg-transparent" onClick={() => navigate(-1)}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>

                <h1 className="text-2xl font-bold mb-6">User Profile</h1>

                <form onSubmit={handleSave} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" value={user?.email || ''} disabled className="bg-gray-50" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input
                            id="fullName"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="John Doe"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="department">Department</Label>
                        <Input
                            id="department"
                            value={department}
                            onChange={(e) => setDepartment(e.target.value)}
                            placeholder="Engineering"
                        />
                    </div>

                    <Button type="submit" className="w-full" disabled={saving}>
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </form>
            </div>
        </div>
    )
}
