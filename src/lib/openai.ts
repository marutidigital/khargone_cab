// src/lib/openai.ts
// Direct OpenAI API Client for MarutiCab AI Assistant

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface OpenAIChatOptions {
  model?: string
  temperature?: number
  max_tokens?: number
  response_format?: { type: 'json_object' | 'text' }
}

export async function createChatCompletion(
  messages: OpenAIMessage[],
  options: OpenAIChatOptions = {}
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured in environment variables.')
  }

  const model = options.model || 'gpt-4o-mini'
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 0.4,
      max_tokens: options.max_tokens ?? 600,
      ...(options.response_format ? { response_format: options.response_format } : {}),
    }),
    signal: AbortSignal.timeout(20_000),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '')
    throw new Error(`OpenAI API error (${response.status}): ${errorBody}`)
  }

  const json = await response.json()
  return json.choices?.[0]?.message?.content || ''
}
