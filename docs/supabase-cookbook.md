# Supabase Cookbook — Lunar Sign

Step-by-step guide to configure a Supabase project for Lunar Sign, including Google OAuth authentication, database schema, storage buckets, and Row Level Security.

## Prerequisites

- A [Supabase account](https://supabase.com/dashboard) (free tier is sufficient for MVP)
- A [Google Cloud Platform](https://console.cloud.google.com/) project linked to your Google Workspace
- Node.js 18+ installed locally

---

## Part 1: Create the Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Fill in:
   - **Name:** `lunar-sign`
   - **Database Password:** generate a strong password and save it in your password manager
   - **Region:** choose the closest to your team (e.g. `eu-west-1` for Europe)
4. Click **Create new project** and wait for provisioning (~2 minutes)
5. Once ready, go to **Project Settings > API** (or use the Connect dialog)
6. Copy these values — you'll need them shortly:
   - **Project URL** (e.g. `https://abcdefg.supabase.co`)
   - **Publishable Key** (starts with `sb_publishable_...`) or the legacy `anon` key

---

## Part 2: Configure Google OAuth

### 2.1 Set up Google Cloud OAuth credentials

1. Go to the [Google Auth Platform console](https://console.cloud.google.com/auth/overview) in your GCP project
2. If not done already, configure the **Audience**:
   - Go to [Audience](https://console.cloud.google.com/auth/audience)
   - Set **User type** to **Internal** (restricts sign-in to your Google Workspace domain only — this is what you want for an internal tool)
3. Configure **Data Access (Scopes)**:
   - Go to [Data Access](https://console.cloud.google.com/auth/scopes)
   - Ensure these scopes are present:
     - `openid` (add manually if missing)
     - `.../auth/userinfo.email` (added by default)
     - `.../auth/userinfo.profile` (added by default)
   - Do **not** add sensitive or restricted scopes — they trigger a lengthy verification process
4. (Optional) Configure **Branding**:
   - Go to [Branding](https://console.cloud.google.com/auth/branding)
   - Set app name to "Lunar Sign" and upload a logo

### 2.2 Create OAuth Client ID

1. Go to [Clients > Create](https://console.cloud.google.com/auth/clients/create)
2. Choose **Web application** as the application type
3. Name it `Lunar Sign`
4. Under **Authorized JavaScript origins**, add:
   - `http://localhost:3000` (for local development)
   - Your production URL when known (e.g. `https://lunar-sign.vercel.app`)
5. Under **Authorized redirect URIs**, add:
   - Your Supabase callback URL — find it in Supabase Dashboard > **Authentication > Providers > Google**. It looks like `https://<project-ref>.supabase.co/auth/v1/callback`
   - `http://127.0.0.1:54321/auth/v1/callback` (for Supabase local dev, if you use it)
6. Click **Create**
7. Copy the **Client ID** and **Client Secret**

### 2.3 Enable Google provider in Supabase

1. In Supabase Dashboard, go to **Authentication > Providers**
2. Find **Google** and toggle it **on**
3. Paste the **Client ID** and **Client Secret** from step 2.2
4. Click **Save**

### 2.4 Configure redirect URLs

1. In Supabase Dashboard, go to **Authentication > URL Configuration**
2. Set **Site URL** to `http://localhost:3000` (change to production URL before deploying)
3. Under **Redirect URLs**, add:
   - `http://localhost:3000/auth/callback`
   - Your production callback (e.g. `https://lunar-sign.vercel.app/auth/callback`)
4. Click **Save**

---

## Part 3: Database Schema

Run the following SQL in the Supabase Dashboard **SQL Editor** (go to **SQL Editor > New query**).

### 3.1 Profiles table

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role text not null default 'member' check (role in ('admin', 'manager', 'member')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Admins can read all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can update any profile"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Users can update their own profile (non-role fields)"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select role from public.profiles where id = auth.uid())
  );
```

### 3.2 Auto-create profile on sign-up

This trigger creates a `profiles` row whenever a new user signs up via Google OAuth.

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### 3.3 Bootstrap the first admin

After the first user signs up (you), promote them to admin. Run this once after your first login — replace the email with your own:

```sql
update public.profiles
set role = 'admin'
where email = 'your.email@company.com';
```

### 3.4 Documents table

```sql
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  file_path text not null,
  uploaded_by uuid not null references public.profiles(id),
  status text not null default 'draft' check (status in ('draft', 'pending', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.documents enable row level security;

create policy "Users can read documents they uploaded"
  on public.documents for select
  using (uploaded_by = auth.uid());

create policy "Users can read documents where they are a signer"
  on public.documents for select
  using (
    exists (
      select 1 from public.signature_requests
      where document_id = documents.id and signer_id = auth.uid()
    )
  );

create policy "Admins can read all documents"
  on public.documents for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Authenticated users can create documents"
  on public.documents for insert
  with check (auth.uid() = uploaded_by);

create policy "Document owner can update their documents"
  on public.documents for update
  using (uploaded_by = auth.uid());
```

### 3.5 Signature requests table

```sql
create table public.signature_requests (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  signer_id uuid not null references public.profiles(id),
  requested_by uuid not null references public.profiles(id),
  status text not null default 'pending' check (status in ('pending', 'signed', 'declined')),
  "order" int not null default 0,
  signed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.signature_requests enable row level security;

create policy "Signers can read their own requests"
  on public.signature_requests for select
  using (signer_id = auth.uid());

create policy "Requesters can read requests they created"
  on public.signature_requests for select
  using (requested_by = auth.uid());

create policy "Admins can read all requests"
  on public.signature_requests for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Authenticated users can create signature requests"
  on public.signature_requests for insert
  with check (auth.uid() = requested_by);

create policy "Signers can update their own request status"
  on public.signature_requests for update
  using (signer_id = auth.uid());
```

### 3.6 Signatures table

```sql
create table public.signatures (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.signature_requests(id) on delete cascade,
  signer_id uuid not null references public.profiles(id),
  signature_data text not null,
  document_hash text not null,
  signed_pdf_path text not null,
  ip_address text,
  user_agent text,
  signed_at timestamptz not null default now()
);

alter table public.signatures enable row level security;

create policy "Signers can read their own signatures"
  on public.signatures for select
  using (signer_id = auth.uid());

create policy "Admins can read all signatures"
  on public.signatures for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Signers can insert their own signature"
  on public.signatures for insert
  with check (auth.uid() = signer_id);
```

### 3.7 Audit log table

```sql
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_log enable row level security;

create policy "Admins can read audit logs"
  on public.audit_log for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Authenticated users can insert audit entries"
  on public.audit_log for insert
  with check (auth.uid() = actor_id);
```

---

## Part 4: Storage Buckets

### 4.1 Create buckets

Run in the SQL Editor:

```sql
insert into storage.buckets (id, name, public)
values
  ('documents', 'documents', false),
  ('signed-documents', 'signed-documents', false);
```

Both buckets are **private** — files are only accessible via signed URLs or through RLS policies.

### 4.2 Storage RLS policies

```sql
-- Documents bucket: upload
create policy "Authenticated users can upload documents"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'documents');

-- Documents bucket: read own uploads or assigned documents
create policy "Users can read their own documents"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'documents'
    and (
      owner_id = auth.uid()
      or exists (
        select 1 from public.documents d
        join public.signature_requests sr on sr.document_id = d.id
        where d.file_path = name and sr.signer_id = auth.uid()
      )
    )
  );

-- Signed documents bucket: upload
create policy "Authenticated users can upload signed documents"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'signed-documents');

-- Signed documents bucket: read
create policy "Users can read signed documents they are involved with"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'signed-documents'
    and (
      owner_id = auth.uid()
      or exists (
        select 1 from public.signatures s
        where s.signed_pdf_path = name
        and (
          s.signer_id = auth.uid()
          or exists (
            select 1 from public.signature_requests sr
            join public.documents d on d.id = sr.document_id
            where sr.id = s.request_id and d.uploaded_by = auth.uid()
          )
        )
      )
    )
  );
```

---

## Part 5: Next.js Client Setup

### 5.1 Install packages

```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

### 5.2 Environment variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here
```

Get these values from **Supabase Dashboard > Project Settings > API** (or the Connect dialog).

### 5.3 Create Supabase client utilities

Create three files under `lib/supabase/`:

**`lib/supabase/client.ts`** — for Client Components (runs in the browser):

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
```

**`lib/supabase/server.ts`** — for Server Components, Server Actions, and Route Handlers:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet, _headers) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  )
}
```

**`lib/supabase/proxy.ts`** — session refresh logic used by the Next.js proxy:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value)
          )
        },
      },
    }
  )

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard
  // to debug issues with users being randomly logged out.
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims

  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

### 5.4 Hook up the proxy

Create `proxy.ts` in the project root (next to `next.config.ts`):

```typescript
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

---

## Part 6: Auth Callback Route

Create the OAuth callback handler at `app/auth/callback/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  let next = searchParams.get('next') ?? '/'
  if (!next.startsWith('/')) {
    next = '/'
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-code-error`)
}
```

---

## Part 7: Sign-in Flow

Create a login page at `app/login/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { GoogleSignInButton } from './google-sign-in-button'

export default async function LoginPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (data?.claims) {
    redirect('/')
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-2xl font-bold">Lunar Sign</h1>
        <p className="text-muted-foreground">Sign in with your company Google account</p>
        <GoogleSignInButton />
      </div>
    </div>
  )
}
```

Create the client component at `app/login/google-sign-in-button.tsx`:

```tsx
'use client'

import { createClient } from '@/lib/supabase/client'

export function GoogleSignInButton() {
  async function handleSignIn() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <button
      onClick={handleSignIn}
      className="inline-flex w-full items-center justify-center gap-2 rounded-md border bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24">
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
          fill="#4285F4"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          fill="#EA4335"
        />
      </svg>
      Sign in with Google
    </button>
  )
}
```

---

## Part 8: Sign-out

Use this in any server action or client component:

```typescript
// Server Action
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

// Client Component
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
await supabase.auth.signOut()
```

---

## Part 9: Vercel Deployment

### 9.1 Environment variables

In Vercel Dashboard > your project > **Settings > Environment Variables**, add:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project-ref.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` (or your anon key) |

### 9.2 Update Supabase redirect URLs

1. Go to Supabase Dashboard > **Authentication > URL Configuration**
2. Set **Site URL** to your Vercel production URL (e.g. `https://lunar-sign.vercel.app`)
3. Add your production callback to **Redirect URLs**: `https://lunar-sign.vercel.app/auth/callback`

### 9.3 Update Google OAuth origins

1. Go to [Google Auth Platform > Clients](https://console.cloud.google.com/auth/clients)
2. Edit your `Lunar Sign` OAuth client
3. Add your Vercel production URL to **Authorized JavaScript origins**
4. Verify the Supabase callback URL is still in **Authorized redirect URIs**

---

## Part 10: Verification Checklist

After completing all steps, verify the setup works:

- [ ] **Supabase project** is running and accessible at your project URL
- [ ] **Google OAuth provider** is enabled in Supabase Dashboard > Authentication > Providers
- [ ] **Tables exist** — check in Supabase Dashboard > Table Editor: `profiles`, `documents`, `signature_requests`, `signatures`, `audit_log`
- [ ] **Storage buckets exist** — check in Supabase Dashboard > Storage: `documents`, `signed-documents`
- [ ] **RLS is enabled** on all tables — each table should show a shield icon in the Table Editor
- [ ] **Environment variables** are set in `.env.local`
- [ ] **First sign-in** works — navigate to `http://localhost:3000`, get redirected to `/login`, click "Sign in with Google", complete the OAuth flow, get redirected back to the app
- [ ] **Profile auto-created** — after first sign-in, check `profiles` table in Supabase; your row should exist with your Google name and email
- [ ] **Admin bootstrap** — run the admin promotion SQL from step 3.3 with your email

---

## Reference Links

- [Supabase Google OAuth docs](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase SSR for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase Next.js client setup](https://supabase.com/ui/docs/nextjs/client)
- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [Official Next.js auth example (source)](https://github.com/supabase/supabase/tree/master/examples/auth/nextjs)
