import { ReelScene, VeoJobState, VeoModelChoice, AspectRatio } from "../types";

// Default Veo backend URL: defaults to local 3001 in dev, can be configured via env
const DEFAULT_VEO_LOCAL_URL = "http://localhost:3001";

export const getVeoBaseUrl = (): string => {
  if (typeof window !== "undefined" && (window as any).__VEO_BACKEND_URL__) {
    return (window as any).__VEO_BACKEND_URL__;
  }
  return DEFAULT_VEO_LOCAL_URL;
};

export interface VeoHealthResponse {
  status: string;
  hasVertexKey: boolean;
  projectId: string;
  models: string[];
}

/**
 * Checks if the Veo video generator backend is running and ready.
 */
export const checkVeoHealth = async (): Promise<VeoHealthResponse | null> => {
  // 1. Try direct local port 3001
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`${DEFAULT_VEO_LOCAL_URL}/api/health`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {}

  // 2. Try proxy /api/veo?action=health
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch("/api/veo?action=health", {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {}

  return null;
};

export interface VeoScenePayload {
  prompt: string;
  image?: {
    base64: string;
    mimeType?: string;
  } | null;
}

export interface StartVeoGenerationParams {
  aspectRatio: AspectRatio;
  style?: string;
  customScenes: VeoScenePayload[];
  veoModel?: VeoModelChoice;
}

/**
 * Initiates an asynchronous Veo / Omni video generation job.
 */
export const startVeoJob = async (params: StartVeoGenerationParams): Promise<{ jobId: string }> => {
  const payload = {
    aspectRatio: params.aspectRatio === AspectRatio.PORTRAIT ? "9:16" : params.aspectRatio === AspectRatio.LANDSCAPE ? "16:9" : "1:1",
    style: params.style || "Cinematic",
    customScenes: params.customScenes,
    veoModel: params.veoModel || "omni",
  };

  // Try direct local port 3001 first
  try {
    const res = await fetch(`${DEFAULT_VEO_LOCAL_URL}/api/generate-video`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.jobId) return { jobId: data.jobId };
    }
  } catch (e) {}

  // Fallback to /api/veo proxy
  const proxyRes = await fetch("/api/veo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "generate", payload }),
  });

  if (!proxyRes.ok) {
    let err = "Veo serveri bilan bog'lanib bo'lmadi";
    try {
      const j = await proxyRes.json();
      err = j.error || err;
    } catch {}
    throw new Error(err);
  }

  return await proxyRes.json();
};

export interface PollVeoJobOptions {
  onProgress?: (state: VeoJobState) => void;
  pollIntervalMs?: number;
  maxWaitMs?: number;
  abortSignal?: AbortSignal;
}

/**
 * Polls the Veo job until completion or failure.
 */
export const pollVeoJob = async (
  jobId: string,
  onProgressOrOptions?: ((state: VeoJobState) => void) | PollVeoJobOptions,
  pollIntervalMs = 3000,
  maxWaitMs = 600000 // 10 minutes
): Promise<VeoJobState> => {
  const onProgress = typeof onProgressOrOptions === 'function' ? onProgressOrOptions : onProgressOrOptions?.onProgress;
  const interval = typeof onProgressOrOptions === 'object' && onProgressOrOptions.pollIntervalMs ? onProgressOrOptions.pollIntervalMs : pollIntervalMs;
  const timeout = typeof onProgressOrOptions === 'object' && onProgressOrOptions.maxWaitMs ? onProgressOrOptions.maxWaitMs : maxWaitMs;
  const signal = typeof onProgressOrOptions === 'object' ? onProgressOrOptions.abortSignal : undefined;

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (signal?.aborted) {
      throw new Error("Veo generatsiyasi to'xtatildi.");
    }

    let jobData: any = null;

    // Try direct local port 3001
    try {
      const res = await fetch(`${DEFAULT_VEO_LOCAL_URL}/api/jobs/${jobId}`);
      if (res.ok) {
        jobData = await res.json();
      }
    } catch (e) {}

    // Try proxy
    if (!jobData) {
      try {
        const pRes = await fetch(`/api/veo?action=status&jobId=${encodeURIComponent(jobId)}`);
        if (pRes.ok) {
          jobData = await pRes.json();
        }
      } catch (e) {}
    }

    if (jobData) {
      const calculatedProgress = jobData.progress ?? (
        jobData.status === 'completed' || jobData.done ? 100 : (
          jobData.clipCount && jobData.currentClipIndex !== undefined
            ? Math.min(95, Math.round(((jobData.currentClipIndex + 1) / jobData.clipCount) * 80) + 10)
            : 25
        )
      );

      const currentState: VeoJobState = {
        jobId,
        status: jobData.status || (jobData.done ? (jobData.error ? "failed" : "completed") : "running"),
        progress: calculatedProgress,
        currentClipIndex: jobData.currentClipIndex,
        clipCount: jobData.clipCount,
        message: jobData.message,
        videoUrl: jobData.fullVideoUrl 
          ? (jobData.fullVideoUrl.startsWith("http") ? jobData.fullVideoUrl : `${DEFAULT_VEO_LOCAL_URL}${jobData.fullVideoUrl}`)
          : (jobData.videoUrl ? (jobData.videoUrl.startsWith("http") ? jobData.videoUrl : `${DEFAULT_VEO_LOCAL_URL}${jobData.videoUrl}`) : undefined),
        fullVideoUrl: jobData.fullVideoUrl
          ? (jobData.fullVideoUrl.startsWith("http") ? jobData.fullVideoUrl : `${DEFAULT_VEO_LOCAL_URL}${jobData.fullVideoUrl}`)
          : undefined,
        clips: jobData.clips?.map((c: string) => c.startsWith("http") ? c : `${DEFAULT_VEO_LOCAL_URL}${c}`),
        error: jobData.error,
      };

      if (onProgress) {
        onProgress(currentState);
      }

      if (currentState.status === "completed") {
        return currentState;
      }

      if (currentState.status === "failed") {
        throw new Error(currentState.error || "Veo generatsiyasi muvaffaqiyatsiz tugadi");
      }
    }

    await new Promise((r) => setTimeout(r, interval));
  }

  throw new Error("Veo generatsiyasi vaqti tugadi (Timeout 10 daqiqa). Server holatini tekshiring.");
};

/**
 * Maps high-level ReelScene objects into dynamic, cinematic camera-directed
 * prompts for Google Veo / Gemini Omni, preventing "talking-head" repetition.
 */
export const mapReelScenesToVeoScenes = (scenes: ReelScene[], topic: string): VeoScenePayload[] => {
  const cameraDirections = [
    // Scene 1: Medium hook shot
    "Medium eye-level shot, friendly and engaging natural presenter with gentle smile, warm natural daylight, sun-dappled botanical garden backdrop, slow smooth push-in camera motion,",
    // Scene 2: Macro hands & tea leaves
    "Extreme macro close-up shot, gentle hands holding dried organic herbal leaves and blossoms over a rustic ceramic mortar, golden volumetric lighting, shallow depth of field, slow tilt,",
    // Scene 3: Teapot brewing action
    "Close-up documentary shot, hot boiling water slowly pouring into an authentic transparent glass teapot filled with herbal infusion, beautiful amber swirls, delicate steam rising, slow orbiting camera,",
    // Scene 4: Traditional herbal heritage / caution
    "Atmospheric cinematic shot of a vintage wooden apothecary table, antique medical book manuscript, brass herbal balance scale, warm directional Rembrandt lighting, serious reflective mood,",
    // Scene 5: Healthy mobility & nature
    "Cinematic wide tracking shot, active healthy person gracefully walking along a scenic fresh green mountain path, vitality, joyful energy, golden hour backlight, smooth gimbal movement,",
    // Scene 6: Smartphone & Telegram CTA
    "Clean aesthetic lifestyle shot on a cozy wooden cafe table, hands holding a modern smartphone opening the Telegram chat, steaming teacup beside it, warm soft lighting, slow zoom-out."
  ];

  return scenes.map((scene, idx) => {
    const dir = cameraDirections[idx % cameraDirections.length];
    const narrationText = scene.narration.replace(/["]/g, "'");
    
    // Strict prompt formulation adhering to QOIDALAR.md:
    // Continuous 10s action, camera direction, strictly NO text/packaging on screen, speech instruction
    const prompt = `${dir} Subject: authentic herbal wellness related to ${topic.slice(0, 40)}. While continuous movement occurs, the speaker naturally says in fluent Uzbek: "${narrationText}". High resolution, photorealistic 8k, authentic documentary realism, strictly NO text on screen, NO artificial glowing neon, NO split screen.`;

    return {
      prompt,
      image: null
    };
  });
};
