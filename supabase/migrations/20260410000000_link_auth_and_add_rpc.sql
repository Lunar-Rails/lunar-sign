-- =====================================================
-- Link dems_users to Supabase auth.users
-- =====================================================

-- Add FK from dems_users.user_id to auth.users so Supabase
-- auth user IDs are the source of truth.
ALTER TABLE dems_users
  ADD CONSTRAINT fk_dems_users_auth_user
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- =====================================================
-- Auto-create dems_users profile on signup
-- =====================================================

CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role_id uuid;
BEGIN
  SELECT role_id INTO v_role_id FROM dems_roles WHERE role_code = 'user';

  INSERT INTO dems_users (user_id, full_name, email, role_id, status)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    v_role_id,
    'active'
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

-- =====================================================
-- RPC: get_or_create_dems_user
-- Used by the frontend after login to fetch (or lazily
-- create) the caller's dems_users profile.
-- =====================================================

CREATE OR REPLACE FUNCTION get_or_create_dems_user()
RETURNS TABLE (
  user_id        uuid,
  full_name      text,
  email          text,
  role_name      text,
  role_code      text,
  company_id     uuid,
  department_id  uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id  uuid := auth.uid();
  v_role_id  uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM dems_users WHERE dems_users.user_id = v_user_id) THEN
    SELECT r.role_id INTO v_role_id FROM dems_roles r WHERE r.role_code = 'user';

    INSERT INTO dems_users (user_id, full_name, email, role_id, status)
    SELECT
      v_user_id,
      COALESCE(
        au.raw_user_meta_data->>'full_name',
        au.raw_user_meta_data->>'name',
        split_part(au.email, '@', 1)
      ),
      au.email,
      v_role_id,
      'active'
    FROM auth.users au
    WHERE au.id = v_user_id
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN QUERY
  SELECT
    u.user_id,
    u.full_name,
    u.email,
    r.role_name,
    r.role_code,
    u.company_id,
    u.department_id
  FROM dems_users u
  JOIN dems_roles r ON u.role_id = r.role_id
  WHERE u.user_id = v_user_id;
END;
$$;

-- =====================================================
-- Add signed_pdf_path to dems_documents
-- (needed for the signing flow built next)
-- =====================================================

ALTER TABLE dems_documents
  ADD COLUMN IF NOT EXISTS signed_pdf_path text;
