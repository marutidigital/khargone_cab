// src/app/api/whatsapp/route.ts
// Direct re-export of unified WhatsApp Webhook handler
// Ensures Meta Webhooks sent to either /api/whatsapp or /api/whatsapp/webhook behave identically

export { GET, POST, runtime } from './webhook/route'
