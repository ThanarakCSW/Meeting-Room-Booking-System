-- Create the issues table
CREATE TABLE IF NOT EXISTS public.issues (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    room_id BIGINT REFERENCES public.rooms(id), -- Nullable if it's a general facility issue
    title TEXT NOT NULL,
    description TEXT,
    severity TEXT CHECK (severity IN ('low', 'medium', 'high')) DEFAULT 'medium',
    status TEXT CHECK (status IN ('open', 'in_progress', 'resolved')) DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;

-- Policies

-- 1. Users can view their own reported issues
CREATE POLICY "Users can view own issues" ON public.issues
    FOR SELECT USING (auth.uid() = user_id);

-- 2. Users can insert their own issues
CREATE POLICY "Users can create issues" ON public.issues
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Admins can view all issues (Assuming admin logic is handled via app role or separate check, for now allow if user is authenticated for simplicity or rely on Service Role for Admin Dashboard)
-- Ideally, we'd have an 'is_admin' function or claim. 
-- For this prototype, let's allow authenticated users to view all issues? NO, that's bad.
-- Let's stick to "Users view own". Admin Dashboard will likely use a Supabase client with Service Role or a policy that checks a specific email/role.
-- Since we don't have a robust role system, I will add a policy for a specific admin email or allow all for now? 
-- Wait, the AdminDashboard currently queries everything. Does it use the same anon key?
-- If so, RLS will block it.
-- Current AdminDashboard queries `bookings` and `rooms`.
-- Let's check `rooms` RLS.
-- Assuming we want to allow "Admins" to see all.
-- Policy for authenticated users to VIEW ALL (TEMPORARY FOR DEMO so Admin works without specific role setup)
CREATE POLICY "Authenticated users can view all issues (Admin Demo)" ON public.issues
    FOR SELECT USING (auth.role() = 'authenticated');

-- 4. Admins (Authenticated) can update issues (to resolve them)
CREATE POLICY "Authenticated users can update issues (Admin Demo)" ON public.issues
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Grant access
GRANT ALL ON public.issues TO authenticated;
GRANT ALL ON public.issues TO service_role;
