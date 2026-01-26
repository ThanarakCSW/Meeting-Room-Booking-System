import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { format, addDays, subDays } from 'date-fns'

interface DateToolbarProps {
    currentDate: Date
    onDateChange: (date: Date) => void
    onNewBooking?: () => void
}

export function DateToolbar({ currentDate, onDateChange, onNewBooking }: DateToolbarProps) {
    return (
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50/50 border-b border-gray-200">
            {/* Center: Date Navigation - optimized for mobile to be full width or centered */}
            <div className="flex items-center justify-center flex-1 gap-4">
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-full bg-white shadow-sm"
                    onClick={() => onDateChange(subDays(currentDate, 1))}
                >
                    <ChevronLeft className="w-4 h-4" />
                </Button>

                <span className="text-sm font-semibold text-gray-900 min-w-[140px] text-center">
                    {format(currentDate, 'EEE, MMM d, yyyy')}
                </span>

                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-full bg-white shadow-sm"
                    onClick={() => onDateChange(addDays(currentDate, 1))}
                >
                    <ChevronRight className="w-4 h-4" />
                </Button>
            </div>

            {/* Right: New Booking (Optional here, or FAB on mobile) */}
            {onNewBooking && (
                <Button
                    onClick={onNewBooking}
                    size="sm"
                    className="hidden md:flex bg-blue-600 hover:bg-blue-700 text-white gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Book
                </Button>
            )}
        </div>
    )
}
