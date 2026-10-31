export function shouldAcknowledgeDuplicateWebhook(processedAt: string | null | undefined) {
  return Boolean(processedAt)
}
