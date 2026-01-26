-- Add columns to rooms table safely
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT FALSE;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('active', 'maintenance')) DEFAULT 'active';

-- Add columns to bookings table safely
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS check_in_status TEXT CHECK (check_in_status IN ('pending', 'checked_in', 'missed')) DEFAULT 'pending';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS attendees INT DEFAULT 1;
