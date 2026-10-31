# MarutiCab WhatsApp Cloud API

## Account details

These non-secret identifiers and statuses were supplied on 2026-10-31.

| Setting | Value |
| --- | --- |
| Platform | Meta WhatsApp Cloud API |
| Connection | Connected |
| Display number | +91 72823 16090 |
| Approved business name | Maruti digital |
| Meta app | Avadh Bajaj |
| App ID | 1543169234022851 |
| WABA ID | 1760242028347854 |
| Phone Number ID | 1379464058575093 |
| Account mode | Live |
| Quality rating | Red; account reports recent blocks/reports |
| Code verification status | Expired; check/re-verify in Meta before relying on live messaging |

## App integration

- Webhook endpoint: `/api/whatsapp/webhook` (Meta callback: `https://maruticab.in/api/whatsapp/webhook`)
- Subscribe the WABA webhook to the `messages` field so both inbound messages and outgoing delivery statuses are received.
- Default Graph API version: `v21.0`; override with `WHATSAPP_API_VERSION` if the Meta app is pinned to another supported version.
- Server-side variables: `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TOKEN` (permanent system-user token; `WHATSAPP_ACCESS_TOKEN` is retained as a compatibility alias), `WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`, `ADMIN_WHATSAPP_NUMBER`, `SUPPORT_WHATSAPP_NUMBER`, `APP_BASE_URL`, `WHATSAPP_API_VERSION`.
- Automatic booking templates also require approval and enablement in the admin template settings, `WHATSAPP_QUALITY_RATING`, `WHATSAPP_CODE_VERIFICATION_STATUS`, and `WHATSAPP_AUTOMATION_ENABLED`. Keep the enable switch false until the phone is verified and the quality issue is resolved.
- Optional integrations: `WHATSAPP_MOCK=true` records local mock sends without contacting Meta. `N8N_WEBHOOK_URL` and `N8N_WEBHOOK_SECRET` enable signed booking-event forwarding.
- Public WhatsApp contact links use `NEXT_PUBLIC_WHATSAPP_NUMBER` and default to `917282316090`.
- Configure the callback as `https://<deployed-domain>/api/whatsapp/webhook`, enter `WHATSAPP_VERIFY_TOKEN` in Meta, then subscribe to `messages`.
- Apply `supabase/migrations/20261031210000_whatsapp_cloud_api.sql` before enabling the webhook. Submit the exact approved utility templates listed in `whatsapp-templates.md` and enter their approved names in the admin panel.

## Readiness notes

- Keep the red-rated number to expected customer conversations while the quality issue is reviewed. Do not send unsolicited bulk messages. Only message people who asked to be contacted, and honor opt-outs.
- Confirm the expired code-verification status in WhatsApp Manager and complete any required number verification with the phone owner.
- The code intentionally does not send live traffic while the supplied quality rating is RED or verification is EXPIRED. Use mock mode for local checks until both account readiness and the admin template approvals are in place.
- Never put access tokens, app secrets, webhook verify tokens, or payment credentials in this file, source control, or chat. Store them in the deployment's server-side environment settings.
