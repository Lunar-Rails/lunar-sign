import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { logAudit } from '@/lib/audit'

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const { data: requesterProfile, error: requesterError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (requesterError || requesterProfile?.role !== 'admin')
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  return { user }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const { id } = await params
    const serviceClient = getServiceClient()

    const { data: invitation, error } = await serviceClient
      .from('invitations')
      .update({ status: 'revoked' })
      .eq('id', id)
      .eq('status', 'pending')
      .select('id, email')
      .maybeSingle()

    if (error) {
      console.error('Failed to revoke invitation:', error)
      return NextResponse.json(
        { error: 'Failed to revoke invitation' },
        { status: 500 }
      )
    }

    if (!invitation)
      return NextResponse.json(
        { error: 'Pending invitation not found' },
        { status: 404 }
      )

    await logAudit(auth.user.id, 'invitation_revoked', 'invitation', invitation.id, {
      email: invitation.email,
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Admin invitation DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
