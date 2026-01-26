import { Button } from '@/components/ui/button'
import { Calendar, Menu, User, LogOut } from 'lucide-react'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from '@/hooks/useAuth'
import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function Header() {
    const { signOut, user } = useAuth()
    const navigate = useNavigate()
    const [isAdmin, setIsAdmin] = useState(false)

    useEffect(() => {
        if (user) {
            supabase.from('profiles').select('role').eq('id', user.id).maybeSingle().then(({ data }) => {
                if (data?.role === 'admin') setIsAdmin(true)
            })
        }
    }, [user])

    const handleSignOut = async () => {
        await signOut()
        navigate('/login')
    }

    const NavLinks = ({ mobile = false, onClick = () => { } }) => (
        <>
            <Link
                to="/"
                className={`text-sm font-medium transition-colors hover:text-primary ${mobile ? 'block py-2 text-lg' : 'text-muted-foreground'}`}
                onClick={onClick}
            >
                Dashboard
            </Link>
            <Link
                to="/profile"
                className={`text-sm font-medium transition-colors hover:text-primary ${mobile ? 'block py-2 text-lg' : 'text-muted-foreground'}`}
                onClick={onClick}
            >
                Profile
            </Link>
            {isAdmin && (
                <Link
                    to="/admin"
                    className={`text-sm font-medium transition-colors hover:text-blue-600 ${mobile ? 'block py-2 text-lg text-blue-600' : 'text-blue-600'}`}
                    onClick={onClick}
                >
                    Admin Panel
                </Link>
            )}
        </>
    )

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
            <div className="flex h-16 items-center px-4 md:px-8 justify-between">
                {/* Branding */}
                <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
                    <div className="bg-blue-600 p-1.5 rounded-lg text-white">
                        <Calendar className="w-5 h-5" />
                    </div>
                    <span>Room Scheduler</span>
                </div>

                {/* Desktop Nav - Center */}
                <nav className="hidden md:flex items-center gap-6">
                    <NavLinks />
                </nav>

                {/* Desktop User Profile - Right */}
                <div className="hidden md:flex items-center gap-4">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={`https://avatar.vercel.sh/${user?.email}`} alt={user?.email || ''} />
                                    <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end" forceMount>
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">{user?.user_metadata?.full_name || 'User'}</p>
                                    <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => navigate('/profile')}>
                                My Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate('/')}>
                                My Bookings
                            </DropdownMenuItem>
                            {isAdmin && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => navigate('/admin')}>Admin Dashboard</DropdownMenuItem>
                                </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Log out</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Mobile Hamburger - Right */}
                <div className="md:hidden flex items-center gap-2">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <Menu className="w-5 h-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right">
                            <SheetHeader>
                                <SheetTitle>Menu</SheetTitle>
                            </SheetHeader>
                            <div className="grid gap-4 py-8">
                                <NavLinks mobile onClick={() => { }} />
                                <Link
                                    to="/"
                                    className="text-lg font-medium py-2 hover:text-primary block"
                                >
                                    My Bookings
                                </Link>
                                <div className="border-t pt-4 mt-2">
                                    <Button variant="ghost" className="w-full justify-start text-red-600 px-0 hover:text-red-700 hover:bg-red-50" onClick={handleSignOut}>
                                        <LogOut className="mr-2 h-4 w-4" />
                                        Log out
                                    </Button>
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </header>
    )
}
