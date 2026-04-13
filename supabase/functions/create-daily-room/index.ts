import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const DAILY_API_KEY = Deno.env.get('DAILY_API_KEY')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    })
  }

  const apiKey = Deno.env.get('DAILY_API_KEY')
  if (!apiKey) return new Response(JSON.stringify({ error: 'DAILY_API_KEY secret is not set' }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })

  const { lectureId } = await req.json()
  const sanitizedId = lectureId.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase().slice(0, 30)

  try {
    const response = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        name: `v-${sanitizedId}`,
        privacy: 'public',
        properties: {
          start_audio_off: false,
          start_video_off: false
        }
      })
    })

    const data = await response.json()
    if (!response.ok) {
        console.error('Daily API error:', data)
        throw new Error(data.error || 'Failed to create room')
    }

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }
})
