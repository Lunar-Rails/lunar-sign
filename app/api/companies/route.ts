import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CompanyCreateSchema } from '@/lib/schemas'
import { logAudit } from '@/lib/audit'

function toSlug(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

async function ensureAdmin(userId: string, supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  return profile?.role === 'admin'
}

async function generateUniqueSlug(baseSlug: string, supabase: Awaited<ReturnType<typeof createClient>>) {
  let nextSlug = baseSlug || 'company'
  let suffix = 1

  while (true) {
    const { data: existing } = await supabase
      .from('companies')
      .select('id')
      .eq('slug', nextSlug)
      .maybeSingle()

    if (!existing) return nextSlug

    suffix += 1
    nextSlug = `${baseSlug || 'company'}-${suffix}`
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = await ensureAdmin(user.id, supabase)
    if (!isAdmin)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const validation = CompanyCreateSchema.safeParse(body)
    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors
      const errorMessage = Object.values(fieldErrors)[0]?.[0] || 'Validation error'
      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }

    const rawName = validation.data.name
    const uniqueSlug = await generateUniqueSlug(toSlug(rawName), supabase)

    const { data: company, error } = await supabase
      .from('companies')
      .insert({
        name: rawName.trim(),
        slug: uniqueSlug,
        created_by: user.id,
      })
      .select('*')
      .single()

    if (error) {
      console.error('Create company error:', error)
      return NextResponse.json(
        { error: 'Failed to create company' },
        { status: 500 }
      )
    }

    await logAudit(user.id, 'company_created', 'company', company.id, {
      company_name: company.name,
      company_slug: company.slug,
    })

    return NextResponse.json({ success: true, data: { company } }, { status: 201 })
  } catch (error) {
    console.error('Create company API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
