import { GoogleGenAI, Modality } from '@google/genai';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Serverda GEMINI_API_KEY sozlanmagan' });
  }

  const ai = new GoogleGenAI({ apiKey });
  const { action, payload } = req.body || {};

  try {
    if (action === 'generateContent') {
      const { model, contents, config } = payload || {};
      const response = await ai.models.generateContent({
        model: model || 'gemini-3.8-flash',
        contents,
        config
      });
      return res.status(200).json({
        text: response.text,
        candidates: response.candidates
      });
    }

    if (action === 'generateTTS') {
      const { text, voiceName } = payload || {};
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-tts-preview',
        contents: [{ text }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voiceName || 'Aoede'
              }
            }
          }
        }
      });

      const part = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
      if (!part?.inlineData?.data) {
        return res.status(500).json({ error: 'Audio olinmadi' });
      }

      return res.status(200).json({
        audioBase64: part.inlineData.data,
        mimeType: part.inlineData.mimeType || 'audio/mp3'
      });
    }

    if (action === 'generateImage') {
      const { prompt, aspectRatio, primaryModel, alternateModel } = payload || {};
      const pModel = primaryModel || 'gemini-3.1-flash-lite-image';
      const aModel = alternateModel || 'gemini-3.1-flash-image';

      try {
        const response = await ai.models.generateContent({
          model: pModel,
          contents: { parts: [{ text: prompt }] },
          config: {
            imageConfig: {
              aspectRatio: aspectRatio || '9:16'
            }
          }
        });

        const part = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
        if (part?.inlineData?.data) {
          return res.status(200).json({
            dataUrl: `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`
          });
        }
      } catch (err: any) {
        console.warn('Primary image model failed, trying alternate:', err?.message);
      }

      const fallback = await ai.models.generateContent({
        model: aModel,
        contents: { parts: [{ text: prompt }] },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio || '9:16'
          }
        }
      });

      const fPart = fallback.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
      if (!fPart?.inlineData?.data) {
        return res.status(500).json({ error: 'Rasm generatsiya qilib bo‘lmadi' });
      }

      return res.status(200).json({
        dataUrl: `data:${fPart.inlineData.mimeType || 'image/png'};base64,${fPart.inlineData.data}`
      });
    }

    if (action === 'transcribeAudio') {
      const { audioBase64, mimeType, prompt } = payload || {};
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            inlineData: {
              mimeType: mimeType || 'audio/mp3',
              data: audioBase64
            }
          },
          {
            text: prompt
          }
        ]
      });

      return res.status(200).json({
        text: response.text
      });
    }

    return res.status(400).json({ error: 'Noma‘lum action: ' + action });
  } catch (error: any) {
    console.error('API Gemini Error:', error);
    return res.status(500).json({
      error: error?.message || 'Gemini server xatoligi'
    });
  }
}
