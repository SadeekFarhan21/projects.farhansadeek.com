import { NextRequest, NextResponse } from 'next/server';
const VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel — calm, clear

export async function POST(req: NextRequest) {
  const { text } = await req.json();

  if (!text?.trim()) {
    return NextResponse.json({ error: 'No text provided' }, { status: 400 });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'No API key configured' }, { status: 500 });
  }

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_flash_v2_5',
        voice_settings: {
          // Calmer defaults for a more soothing delivery
          stability: 0.82,
          similarity_boost: 0.62,
          style: 0.0,
          use_speaker_boost: false,
        },
      }),
    },
  );

  if (!res.ok) {
    const detail = await res.text();
    return NextResponse.json({ error: detail }, { status: res.status });
  }

  const audio = await res.arrayBuffer();
  return new Response(audio, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-store',
    },
  });
}
