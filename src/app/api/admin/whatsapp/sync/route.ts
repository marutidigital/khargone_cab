import { NextRequest, NextResponse } from 'next/server'
import { authorizeAdminRequest } from '@/lib/admin-auth'
import { createServiceClient } from '@/lib/supabase-server'
import { TEMPLATE_DEFINITIONS } from '@/lib/whatsapp-templates'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await authorizeAdminRequest(req)
  if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const db = createServiceClient()
  const wabaId = process.env.WHATSAPP_WABA_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_TOKEN

  let metaTemplatesFound = 0
  const metaTemplates: any[] = []

  // 1. Fetch live templates from Meta Graph API
  if (wabaId && accessToken && !accessToken.includes('dummy')) {
    try {
      const res = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/message_templates?limit=100`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (res.ok) {
        const json = await res.json()
        const metaList = json.data || []
        metaTemplatesFound = metaList.length

        for (const mt of metaList) {
          const bodyComp = mt.components?.find((c: any) => c.type === 'BODY')
          const headerComp = mt.components?.find((c: any) => c.type === 'HEADER')
          const footerComp = mt.components?.find((c: any) => c.type === 'FOOTER')
          const buttonsComp = mt.components?.find((c: any) => c.type === 'BUTTONS')

          const hasFlow = Boolean(
            buttonsComp?.buttons?.some((b: any) => b.type === 'FLOW') ||
            mt.name?.toLowerCase().includes('flow')
          )

          // Extract variables e.g. {{1}}, {{2}}
          const bodyText = bodyComp?.text || ''
          const varMatches = bodyText.match(/\{\{(\d+)\}\}/g) || []
          const variables = varMatches.map((v: string) => `param_${v.replace(/\D/g, '')}`)
          if (hasFlow) variables.push('__has_flow__')

          const isApproved = mt.status === 'APPROVED' || mt.status === 'ACTIVE'

          await db.from('whatsapp_message_templates').upsert(
            {
              template_code: mt.name.toLowerCase().trim(),
              meta_template_name: mt.name,
              category: hasFlow ? 'FLOW' : (mt.category || 'UTILITY'),
              header_text: headerComp?.text || null,
              body_text: bodyText,
              footer_text: footerComp?.text || null,
              language: mt.language || 'en',
              variables,
              active: isApproved,
              approval_status: mt.status || 'APPROVED',
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'template_code' }
          )

          metaTemplates.push({
            name: mt.name,
            status: mt.status,
            language: mt.language,
            hasFlow,
          })
        }
      }
    } catch (metaErr) {
      console.warn('Meta Graph API template fetch error:', metaErr)
    }
  }

  // 2. Also ensure standard MarutiCab definitions exist
  for (const [code, tpl] of Object.entries(TEMPLATE_DEFINITIONS)) {
    await db.from('whatsapp_message_templates').upsert(
      {
        template_code: code,
        meta_template_name: tpl.meta_template_name,
        category: 'UTILITY',
        header_text: tpl.header_text,
        body_text: tpl.body_text,
        footer_text: tpl.footer_text,
        language: 'en',
        variables: tpl.variables,
        active: true,
        approval_status: 'APPROVED',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'template_code' }
    )
  }

  // 3. Return all templates
  const { data: allTemplates } = await db
    .from('whatsapp_message_templates')
    .select('*')
    .order('template_code', { ascending: true })

  return NextResponse.json({
    success: true,
    metaTemplatesFound,
    metaTemplates,
    templates: allTemplates || [],
    message: metaTemplatesFound > 0
      ? `Successfully synced ${metaTemplatesFound} templates from Meta WhatsApp Manager!`
      : 'Synced standard MarutiCab templates successfully!',
  })
}
