import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'

async function ensureAdmin({
  supabase,
  userId,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>
  userId: string
}) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  return profile?.role === 'admin'
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: companyId, userId: targetUserId } = await params
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = await ensureAdmin({ supabase, userId: user.id })
    if (!isAdmin)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { error } = await supabase
      .from('company_members')
      .delete()
      .eq('company_id', companyId)
      .eq('user_id', targetUserId)

    if (error) {
      console.error('Delete company member error:', error)
      return NextResponse.json(
        { error: 'Failed to remove company member' },
        { status: 500 }
      )
    }

    await logAudit(user.id, 'company_member_removed', 'company', companyId, {
      member_user_id: targetUserId,
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Delete company member API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
