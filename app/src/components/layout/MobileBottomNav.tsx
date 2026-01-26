import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Calendar, User, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

export function MobileBottomNav() {
    const location = useLocation()
    const { user } = useAuth()
    const [isAdmin, setIsAdmin] = useState(false)

    useEffect(() => {
        if (user) {
            supabase.from('profiles').select('role').eq('id', user.id).maybeSingle().then(({ data }) => {
                if (data?.role === 'admin') setIsAdmin(true)
            })
        }
    }, [user])

    const isActive = (path: string) => location.pathname === path

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-safe">
            <div className="grid grid-cols-4 h-16">
                <Link
                    to="/"
                    className={cn(
                        "flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
                        isActive('/') ? "text-blue-600" : "text-gray-500 hover:text-gray-900"
                    )}
                >
                    <LayoutDashboard className="w-5 h-5" />
                    Home
                </Link>
                <Link
                    to="/my-bookings"
                    className={cn(
                        "flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
                        // Assuming booking history is on Profile page for now
                        isActive('/my-bookings') && location.search.includes('tab=bookings') ? "text-blue-600" : "text-gray-500 hover:text-gray-900"
                    )}
                >
                    <Calendar className="w-5 h-5" />
                    Bookings
                </Link>
                {isAdmin && (
                    <Link
                        to="/admin"
                        className={cn(
                            "flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
                            isActive('/admin') ? "text-blue-600" : "text-gray-500 hover:text-gray-900"
                        )}
                    >
                        <Shield className="w-5 h-5" />
                        Admin
                    </Link>
                )}
                <Link
                    to="/profile"
                    className={cn(
                        "flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
                        isActive('/profile') && !location.search.includes('tab=bookings') ? "text-blue-600" : "text-gray-500 hover:text-gray-900"
                    )}
                >
                    <User className="w-5 h-5" />
                    Profile
                </Link>
            </div>
        </div>
    )
}
