import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { TEMPLATE_DEFINITIONS } from '@/lib/whatsapp-templates'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const db = createServiceClient()
  const wabaId = process.env.WHATSAPP_WABA_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_TOKEN

  let metaTemplatesFound = 0
  const metaStatusMap: Record<string, string> = {}

  // 1. If Meta credentials exist, attempt to fetch live templates from Meta Graph API
  if (wabaId && accessToken && !accessToken.includes('dummy')) {
    try {
      const res = await fetch(`https://graph.facebook.com/v20.0/${wabaId}/message_templates?limit=100`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      if (res.ok) {
        const json = await res.json()
        const metaList = json.data || []
        metaTemplatesFound = metaList.length

        for (const mt of metaList) {
          metaStatusMap[mt.name] = mt.status || 'APPROVED'

          // If Meta has a template that's not in our standard definitions, we can optionally import it
          if (!TEMPLATE_DEFINITIONS[mt.name]) {
            const bodyComponent = mt.components?.find((c: any) => c.type === 'BODY')
            const headerComponent = mt.components?.find((c: any) => c.type === 'HEADER')
            const footerComponent = mt.components?.find((c: any) => c.type === 'FOOTER')

            await db.from('whatsapp_message_templates').upsert(
              {
                template_code: mt.name,
                meta_template_name: mt.name,
                category: mt.category || 'UTILITY',
                header_text: headerComponent?.text || null,
                body_text: bodyComponent?.text || '',
                footer_text: footerComponent?.text || null,
                language: mt.language || 'en',
                variables: [],
                active: mt.status === 'APPROVED',
                approval_status: mt.status || 'APPROVED',
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'template_code' }
            )
          }
        }
      }
    } catch (metaErr) {
      console.warn('Meta Graph API template fetch error (continuing with local sync):', metaErr)
    }
  }

  // 2. Upsert all 12 standard Hinglish MarutiCab templates
  let syncedCount = 0
  for (const [code, tpl] of Object.entries(TEMPLATE_DEFINITIONS)) {
    const metaApproval = metaStatusMap[tpl.meta_template_name] || metaStatusMap[code] || 'APPROVED'

    const { error } = await db.from('whatsapp_message_templates').upsert(
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
        approval_status: metaApproval,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'template_code' }
    )

    if (!error) syncedCount++
  }

  // 3. Return updated template list
  const { data: updatedList } = await db
    .from('whatsapp_message_templates')
    .select('*')
    .order('created_at', { ascending: true })

  return NextResponse.json({
    success: true,
    message: metaTemplatesFound > 0
      ? `Synced ${syncedCount} templates. Live Meta verification found ${metaTemplatesFound} templates in your WhatsApp Business Account.`
      : `Successfully synced and updated all ${syncedCount} standard MarutiCab Hinglish templates in the system.`,
    templates: updatedList || [],
    metaSynced: metaTemplatesFound > 0,
  })
}
