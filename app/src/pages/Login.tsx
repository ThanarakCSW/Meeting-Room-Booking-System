import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

// NOTE: check if use-toast is in hooks or components/ui. Shadcn default is hooks/use-toast usually or components/ui/use-toast.
// I will assume hooks/use-toast if I configured components.json to use @/hooks?
// Wait, my components.json has "aliases": { "utils": "@/lib/utils" }. It doesn't specify hooks. 
// Standard shadcn init puts simple hooks in @/lib/utils or @/hooks. 
// Let's assume `@/components/ui/use-toast` or `@/hooks/use-toast`. 
// The `add toast` command usually creates `components/ui/toast.tsx`, `components/ui/toaster.tsx`, `components/ui/use-toast.ts`.
// But wait, the latest shadcn might be different. 
// I'll try `@/components/ui/use-toast` first, or `@/hooks/use-toast`.
// Actually, I'll try to find where it is later if it fails. For now I will comment it out or use a simple alert if not sure. 
// But I need to be professional. 
// I'll stick to `@/hooks/use-toast` as a common convention or `@/components/ui/use-toast`.
// I'll use `@/hooks/use-toast` and if it fails I'll move it.

export default function Login() {
    const [identifier, setIdentifier] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()
    const { toast } = useToast()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        let loginEmail = identifier

        // Check if identifier is an email
        const isEmail = identifier.includes('@')

        if (!isEmail) {
            // Lookup email by username
            const { data, error } = await supabase
                .from('profiles')
                .select('email')
                .eq('username', identifier)
                .single()

            if (error || !data || !data.email) {
                toast({
                    variant: "destructive",
                    title: "Login failed",
                    description: "Username not found or has no email linked.",
                })
                setLoading(false)
                return
            }
            loginEmail = data.email
        }

        // Try to sign in
        const { data: { user }, error } = await supabase.auth.signInWithPassword({
            email: loginEmail,
            password,
        })

        if (error) {
            toast({
                variant: "destructive",
                title: "Error logging in",
                description: error.message,
            })
            setLoading(false)
        } else if (user) {
            // Check if user is admin
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .maybeSingle()

            toast({
                title: "Logged in successfully",
                description: "Redirecting...",
            })

            if (profile?.role === 'admin') {
                navigate('/admin')
            } else {
                navigate('/')
            }
        }
    }

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const { error } = await supabase.auth.signUp({
            email: identifier,
            password,
        })

        if (error) {
            toast({
                variant: "destructive",
                title: "Error signing up",
                description: error.message,
            })
        } else {
            toast({
                title: "Signup successful",
                description: "Please check your email for verification (if enabled) or login.",
            })
        }
        setLoading(false)
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Meeting Room Booking</CardTitle>
                    <CardDescription>Login or Signup to book your room.</CardDescription>
                </CardHeader>
                <div className="p-6 pt-0">
                    <form onSubmit={handleLogin} className="space-y-4 mb-4">
                        <div className="space-y-2">
                            <Label htmlFor="identifier">Username or Email</Label>
                            <Input
                                id="identifier"
                                type="text"
                                placeholder="Username or m@example.com"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button type="submit" className="flex-1" disabled={loading}>
                                {loading ? 'Loading...' : 'Login'}
                            </Button>
                            <Button type="button" variant="outline" className="flex-1" onClick={handleSignup} disabled={loading}>
                                Signup
                            </Button>
                        </div>
                        <div className="text-center mt-4">
                            <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">
                                Forgot password?
                            </Link>
                        </div>
                    </form>
                </div>
            </Card>
        </div>
    )
}
