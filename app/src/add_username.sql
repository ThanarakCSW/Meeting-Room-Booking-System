-- 1. Add username and email columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username text UNIQUE,
ADD COLUMN IF NOT EXISTS email text;

-- 2. Update the handle_new_user function to store email and username (from metadata)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, email, username)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    'user', 
    new.email, 
    new.raw_user_meta_data->>'username' -- Assuming username is passed in metadata during signup
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Backfill email from auth.users (requires permission to read auth.users)
-- Note: This might need to be run by a superuser or via dashboard SQL editor
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- 4. (Optional) Backfill username from email if null (e.g. user part of email)
-- UPDATE public.profiles
-- SET username = split_part(email, '@', 1)
-- WHERE username IS NULL;
