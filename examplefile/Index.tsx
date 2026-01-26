import { useState, useCallback } from "react";
import { Header } from "@/components/booking/Header";
import { TimelineGrid } from "@/components/booking/TimelineGrid";
import { BookingModal } from "@/components/booking/BookingModal";
import { Legend } from "@/components/booking/Legend";
import { rooms, initialBookings, timeSlots } from "@/data/mockData";
import { Booking } from "@/types/booking";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    roomId: string;
    hour: number;
  } | null>(null);
  
  const { toast } = useToast();

  const handlePrevDay = () => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() - 1);
      return newDate;
    });
  };

  const handleNextDay = () => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + 1);
      return newDate;
    });
  };

  const handleNewBooking = () => {
    setSelectedSlot(null);
    setModalOpen(true);
  };

  const handleSlotClick = (roomId: string, hour: number) => {
    setSelectedSlot({ roomId, hour });
    setModalOpen(true);
  };

  const handleCancelBooking = useCallback((bookingId: string) => {
    const booking = bookings.find((b) => b.id === bookingId);
    setBookings((prev) => prev.filter((b) => b.id !== bookingId));
    toast({
      title: "Booking cancelled",
      description: booking ? `"${booking.title}" has been removed.` : "The booking has been removed.",
    });
  }, [bookings, toast]);

  const handleCreateBooking = (data: {
    roomId: string;
    title: string;
    organizer: string;
    startTime: number;
    endTime: number;
  }) => {
    // Check for conflicts
    const hasConflict = bookings.some(
      (b) =>
        b.roomId === data.roomId &&
        ((data.startTime >= b.startTime && data.startTime < b.endTime) ||
          (data.endTime > b.startTime && data.endTime <= b.endTime) ||
          (data.startTime <= b.startTime && data.endTime >= b.endTime))
    );

    if (hasConflict) {
      toast({
        title: "Booking conflict",
        description: "This time slot is already booked. Please choose another time.",
        variant: "destructive",
      });
      return;
    }

    const newBooking: Booking = {
      id: `b-${Date.now()}`,
      ...data,
    };

    setBookings((prev) => [...prev, newBooking]);
    toast({
      title: "Booking created",
      description: `"${data.title}" has been scheduled.`,
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header
        currentDate={currentDate}
        onPrevDay={handlePrevDay}
        onNextDay={handleNextDay}
        onNewBooking={handleNewBooking}
      />
      
      <TimelineGrid
        rooms={rooms}
        bookings={bookings}
        timeSlots={timeSlots}
        onSlotClick={handleSlotClick}
        onCancelBooking={handleCancelBooking}
      />
      
      <Legend />

      <BookingModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreateBooking}
        rooms={rooms}
        timeSlots={timeSlots}
        initialRoomId={selectedSlot?.roomId}
        initialStartTime={selectedSlot?.hour}
      />
    </div>
  );
};

export default Index;
