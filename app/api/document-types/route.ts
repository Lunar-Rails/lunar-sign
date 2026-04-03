import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: documentTypes, error } = await supabase
      .from('document_types')
      .select('id, name, created_by, created_at')
      .order('name', { ascending: true })

    if (error) {
      console.error('Document types query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch document types' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: { documentTypes: documentTypes || [] },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Document types API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
