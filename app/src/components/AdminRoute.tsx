import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export default function AdminRoute() {
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

    useEffect(() => {
        const checkAdmin = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                setIsAdmin(false)
                return
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .maybeSingle()

            setIsAdmin(profile?.role === 'admin')
        }
        checkAdmin()
    }, [])

    if (isAdmin === null) return <div>Loading...</div>

    return isAdmin ? <Outlet /> : <Navigate to="/" />
}
