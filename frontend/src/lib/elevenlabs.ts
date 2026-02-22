// =============================================================================
// lib/elevenlabs.ts – Text-to-Speech integration via ElevenLabs API
// =============================================================================

// Default voice ID for a deep, gritty narrator ("Adam" or "Marcus" style)
// You can change this to any valid ElevenLabs Voice ID
const DEFAULT_NARRATOR_VOICE_ID = 'pNInz6obpgDQGcFmaJgB'; // Adam (American, Deep)

export async function generateNarratorAudio(text: string): Promise<string | null> {
    const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
    if (!apiKey) {
        console.warn('ElevenLabs API key is missing. Ensure VITE_ELEVENLABS_API_KEY is set in frontend/.env');
        return null;
    }

    // Prevent synthesizing empty or purely whitespace strings
    if (!text || !text.trim()) {
        return null;
    }

    try {
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${DEFAULT_NARRATOR_VOICE_ID}?output_format=mp3_44100_128`, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': apiKey,
            },
            body: JSON.stringify({
                text: text,
                model_id: 'eleven_turbo_v2_5', // Extremely fast, great for real-time game narration
                voice_settings: {
                    stability: 0.45,       // Slightly more expressive
                    similarity_boost: 0.75, // Stays true to the original voice
                }
            })
        });

        if (!response.ok) {
            console.error('ElevenLabs API error:', response.status, response.statusText);
            return null;
        }

        // Convert the returned MP3 stream into a Blob
        const audioBlob = await response.blob();

        // Create an object URL that can be played by the HTMLAudioElement
        const audioUrl = URL.createObjectURL(audioBlob);
        return audioUrl;

    } catch (error) {
        console.error('Failed to generate narrator audio:', error);
        return null;
    }
}
