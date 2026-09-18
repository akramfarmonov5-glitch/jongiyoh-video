import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { 
  SubtitleStyle, 
  SubtitlePosition, 
  AspectRatio, 
  BackgroundMusicGenre, 
  ReelScene,
  RecipeCardData
} from '../types';
import { createBackgroundMusic } from '../services/audioSynth';
import { generateSeoSlug } from '../constants';

interface VideoPlayerProps {
  images: string[];
  audioBase64: string;
  scriptSegments: string[];
  scenes?: ReelScene[];
  topic: string;
  handle?: string;
  subtitleStyle?: SubtitleStyle;
  subtitlePosition?: SubtitlePosition;
  aspectRatio?: AspectRatio;
  musicGenre?: BackgroundMusicGenre;
  musicVolume?: number;
  coverHeadline?: string;
  coverSubtitle?: string;
  onEditScript?: () => void;
  audioSpeed?: number;
  onSpeedChange?: (speed: number) => void;
  customFilename?: string;
  karaokeMode?: boolean;
  karaokeChunkSize?: 'dynamic' | 'standard';
  showEmojiAccents?: boolean;
  recipeCard?: RecipeCardData;
  showRecipeCard?: boolean;
  recipeCardTiming?: 'both' | 'recipe_scene' | 'video_end';
  veoVideoUrl?: string;
}

interface WordTiming {
  word: string;
  start: number;
  end: number;
  width: number;
  emoji?: string | null;
}

interface SubtitleLine {
  words: WordTiming[];
  totalWidth: number;
}

interface PreparedSubtitle {
  start: number;
  end: number;
  lines: SubtitleLine[];
  emoji?: string | null;
}

// Fito-emojilar va kalit so'zlarni avtomatik aniqlash
const getKeywordEmoji = (word: string): string | null => {
  const clean = word.toLowerCase().replace(/[^a-z0-9а-яёўқғҳ']/gi, '');
  if (!clean) return null;
  if (/^(shifo|davo|foyda|giyoh|fitotera|tabiiy|jongiyoh|efir|ekstrakt|ildiz|barg)/i.test(clean)) return '🌿';
  if (/^(damlama|choy|choynak|qaynatma|ichish|damlang|damlanadi|iching)/i.test(clean)) return '🍵';
  if (/^(suv|suyuqlik|tomchi|namlik)/i.test(clean)) return '💧';
  if (/^(yurak|qon|bosim|tomir|puls|arteriya)/i.test(clean)) return '❤️';
  if (/^(bo'g'im|bogim|tizza|bel|og'riq|ogriq|harakat|suyak|artrit|umurtqa)/i.test(clean)) return '🦴';
  if (/^(vaqt|kun|mahal|daqiqa|kurs|ertalab|kechqurun|muddat)/i.test(clean)) return '⏳';
  if (/^(xavf|taqiq|qarshi|ehtiyot|zarar|cheklang|homilador|allergiya)/i.test(clean)) return '⚠️';
  if (/^(kuchli|mo'jiza|mojiza|sir|natija|ajoyib|super|antioksidant|vitamin)/i.test(clean)) return '✨';
  if (/^(jigar|oshqozon|ichak|buyrak|o't)/i.test(clean)) return '🫀';
  return null;
};

interface MotionVector {
  startX: number;
  startY: number;
  startScale: number;
  endX: number;
  endY: number;
  endScale: number;
}

interface ProcessedImageLayer {
  canvas: HTMLCanvasElement;
  motion: MotionVector;
  transitionType: number;
  scene?: ReelScene;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  opacity: number;
}

// Dedicated Herbal Infographic Card Drawing Routine (9:16 & 16:9 Aware)
const drawRecipeInfographicCard = (
  ctx: CanvasRenderingContext2D,
  recipe: RecipeCardData,
  WIDTH: number,
  HEIGHT: number,
  isLandscape: boolean
) => {
  ctx.save();
  const cardW = isLandscape ? 1140 : Math.min(WIDTH - 120, 940);
  const cardH = isLandscape ? 560 : 700;
  const cardX = (WIDTH - cardW) / 2;
  const cardY = isLandscape ? 110 : 190;

  // 1. Frosted Botanical Apothecary Background
  ctx.fillStyle = "rgba(4, 28, 20, 0.96)";
  ctx.strokeStyle = "rgba(16, 185, 129, 0.92)"; // Glowing emerald border
  ctx.lineWidth = 4;
  ctx.shadowColor = "rgba(16, 185, 129, 0.45)";
  ctx.shadowBlur = 28;

  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 28);
  ctx.fill();
  ctx.stroke();

  // Reset shadow for inner elements
  ctx.shadowBlur = 0;

  // 2. Corner Apothecary Accents (Gold corner rivets)
  ctx.fillStyle = "#f59e0b";
  const cornerOffset = 18;
  const rivetRadius = 3.5;
  [
    [cardX + cornerOffset, cardY + cornerOffset],
    [cardX + cardW - cornerOffset, cardY + cornerOffset],
    [cardX + cornerOffset, cardY + cardH - cornerOffset],
    [cardX + cardW - cornerOffset, cardY + cardH - cornerOffset],
  ].forEach(([cx, cy]) => {
    ctx.beginPath();
    ctx.arc(cx, cy, rivetRadius, 0, Math.PI * 2);
    ctx.fill();
  });

  // 3. Header Badge Pill: "🫖 JONGIYOH FITO-RETSEPT"
  const pillW = isLandscape ? 360 : 330;
  const pillH = isLandscape ? 36 : 40;
  const pillX = (WIDTH - pillW) / 2;
  const pillY = cardY + (isLandscape ? 18 : 22);

  ctx.fillStyle = "rgba(16, 185, 129, 0.22)";
  ctx.strokeStyle = "rgba(52, 211, 153, 0.75)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillW, pillH, 20);
  ctx.fill();
  ctx.stroke();

  ctx.font = isLandscape ? "800 17px Inter, sans-serif" : "800 19px Inter, sans-serif";
  ctx.fillStyle = "#6ee7b7";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🫖 JONGIYOH FITO-RETSEPT & DOZA", WIDTH / 2, pillY + pillH / 2);

  // 4. Main Title
  const titleText = (recipe.title || "TABIIY DAMLASH TARTIBI").toUpperCase();
  ctx.font = isLandscape ? "900 27px Inter, sans-serif" : "900 33px Inter, sans-serif";
  ctx.fillStyle = "#fef08a"; // Honey gold
  ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
  ctx.shadowBlur = 8;
  ctx.fillText(titleText, WIDTH / 2, cardY + (isLandscape ? 82 : 94), cardW - 80);
  ctx.shadowBlur = 0;

  // 5. Golden-Emerald Dividing Line
  const grad = ctx.createLinearGradient(cardX + 40, 0, cardX + cardW - 40, 0);
  grad.addColorStop(0, "rgba(16, 185, 129, 0.1)");
  grad.addColorStop(0.5, "rgba(245, 158, 11, 0.75)");
  grad.addColorStop(1, "rgba(16, 185, 129, 0.1)");
  ctx.strokeStyle = grad;
  ctx.lineWidth = 2;
  ctx.beginPath();
  const divY = cardY + (isLandscape ? 112 : 130);
  ctx.moveTo(cardX + 40, divY);
  ctx.lineTo(cardX + cardW - 40, divY);
  ctx.stroke();

  // 6. 5-Item Structured Dosage Rows
  const rows = [
    { icon: "🌿", label: "Giyoh miqdori:", value: recipe.dosage || "1 osh qoshiq (5-10 gr)" },
    { icon: "💧", label: "Qaynoq suv:", value: recipe.water || "200-250 ml (90-95°C)" },
    { icon: "⏳", label: "Damlash vaqti:", value: recipe.steepTime || "15-20 daqiqa (ustini yopib)" },
    { icon: "🍵", label: "Qabul tartibi:", value: recipe.frequency || "Kuniga 2 mahal, ovqatdan 30 daq. oldin" },
    { icon: "🗓️", label: "Davomiyligi:", value: recipe.duration || "21 kun qabul + 7 kun tanaffus" },
  ];

  const rowStartY = divY + (isLandscape ? 16 : 22);
  const rowHeight = isLandscape ? 58 : 68;

  rows.forEach((r, idx) => {
    const currentY = rowStartY + idx * rowHeight;

    // Row Background subtle alternating strip
    if (idx % 2 === 0) {
      ctx.fillStyle = "rgba(16, 185, 129, 0.08)";
      ctx.beginPath();
      ctx.roundRect(cardX + 28, currentY - (rowHeight / 2) + 6, cardW - 56, rowHeight - 12, 12);
      ctx.fill();
    }

    // Left: Icon + Label
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = isLandscape ? "800 20px Inter, sans-serif" : "800 23px Inter, sans-serif";
    ctx.fillStyle = "#a7f3d0";
    ctx.fillText(`${r.icon}  ${r.label}`, cardX + 44, currentY);

    // Right: Bold Value with auto-scaling to prevent truncation
    ctx.textAlign = "right";
    let valFontSize = isLandscape ? 21 : 24;
    ctx.font = `900 ${valFontSize}px Inter, sans-serif`;
    const maxValW = cardW - (isLandscape ? 400 : 380);
    while (ctx.measureText(r.value).width > maxValW && valFontSize > 15) {
      valFontSize -= 1;
      ctx.font = `900 ${valFontSize}px Inter, sans-serif`;
    }
    ctx.fillStyle = idx === 0 || idx === 3 ? "#fef08a" : "#ffffff";
    ctx.fillText(r.value, cardX + cardW - 44, currentY);

    // Subtle micro divider
    if (idx < rows.length - 1) {
      ctx.strokeStyle = "rgba(16, 185, 129, 0.14)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cardX + 44, currentY + (rowHeight / 2));
      ctx.lineTo(cardX + cardW - 44, currentY + (rowHeight / 2));
      ctx.stroke();
    }
  });

  // 7. YMYL Contraindication Banner
  const warnY = rowStartY + (rows.length * rowHeight) + (isLandscape ? 6 : 10);
  const warnH = isLandscape ? 44 : 52;
  const warnW = cardW - 60;
  const warnX = cardX + 30;

  ctx.fillStyle = "rgba(69, 10, 10, 0.90)";
  ctx.strokeStyle = "rgba(239, 68, 68, 0.85)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(warnX, warnY, warnW, warnH, 14);
  ctx.fill();
  ctx.stroke();

  ctx.font = isLandscape ? "800 17px Inter, sans-serif" : "800 21px Inter, sans-serif";
  ctx.fillStyle = "#fca5a5";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const cleanWarn = recipe.warning ? recipe.warning.replace(/^⚠️\s*/, '') : "Homiladorlik va buyrak toshida mumkin emas!";
  ctx.fillText(`⚠️ QARSHI KO'RSATMA: ${cleanWarn}`, WIDTH / 2, warnY + warnH / 2, warnW - 30);

  // 8. Viral Retention Bookmark Bar
  const ctaY = warnY + warnH + (isLandscape ? 10 : 16);
  const ctaH = isLandscape ? 46 : 54;
  const ctaW = cardW - 60;
  const ctaX = cardX + 30;

  ctx.fillStyle = "rgba(245, 158, 11, 0.95)"; // Vibrant Amber
  ctx.shadowColor = "rgba(245, 158, 11, 0.4)";
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.roundRect(ctaX, ctaY, ctaW, ctaH, 27);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.font = isLandscape ? "900 19px Inter, sans-serif" : "900 22px Inter, sans-serif";
  ctx.fillStyle = "#022c22"; // High-contrast deep forest green
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(recipe.callToAction || "📌 Retseptni yo'qotmaslik uchun SAQLAB OLING! 💾", WIDTH / 2, ctaY + ctaH / 2, ctaW - 20);

  ctx.restore();
};

const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  images, 
  audioBase64, 
  scriptSegments, 
  scenes = [],
  topic, 
  handle = "@jongiyoh",
  subtitleStyle = SubtitleStyle.EMERALD_HERBS,
  subtitlePosition = SubtitlePosition.BOTTOM,
  aspectRatio = AspectRatio.PORTRAIT,
  musicGenre = BackgroundMusicGenre.NATURE_CALM,
  musicVolume = 25,
  coverHeadline,
  coverSubtitle,
  onEditScript,
  audioSpeed = 1.0,
  onSpeedChange,
  customFilename,
  karaokeMode = true,
  karaokeChunkSize = 'dynamic',
  showEmojiAccents = true,
  recipeCard,
  showRecipeCard = true,
  recipeCardTiming = 'both',
  veoVideoUrl
}) => {
  const [playerMode, setPlayerMode] = useState<'canvas' | 'veo'>(veoVideoUrl ? 'veo' : 'canvas');

  useEffect(() => {
    if (veoVideoUrl) {
      setPlayerMode('veo');
    }
  }, [veoVideoUrl]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const currentTimeRef = useRef(0);
  const [displayTime, setDisplayTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  
  const musicInstanceRef = useRef<{ stop: () => void } | null>(null);

  const [processedLayers, setProcessedLayers] = useState<ProcessedImageLayer[]>([]);
  const reqRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);

  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [isDownloadingRecipeCard, setIsDownloadingRecipeCard] = useState(false);

  // Compute 100% complete, authentic RecipeCardData with robust fallback
  const effectiveRecipeCard: RecipeCardData = useMemo(() => {
    if (recipeCard && (recipeCard.dosage || recipeCard.water)) {
      return recipeCard;
    }
    const recipeScene = scenes?.find(s => s.type === 'recipe' || /damlash|retsept|doza/i.test(`${s.headline} ${s.statText || ''}`));
    const warningScene = scenes?.find(s => s.type === 'warning' || /qarshi|mumkin emas/i.test(`${s.headline} ${s.statText || ''}`));
    const cleanTopic = topic ? topic.replace(/damlamasi|choyi|siri|foydalari|haqida|retsepti/gi, '').trim() : "Shifobaxsh Giyoh";

    return {
      title: `${cleanTopic.slice(0, 26)} Damlamasi`,
      dosage: recipeScene?.statText || "1 osh qoshiq (5-10 gr)",
      water: "200-250 ml qaynoq suv (95°C)",
      steepTime: "15-20 daqiqa (ustini yopib)",
      frequency: "Kuniga 2 mahal, ovqatdan 30 daq. oldin",
      duration: "21 kun qabul + 7 kun tanaffus",
      warning: warningScene?.statText || "Homiladorlik va buyrak toshida taqiqlanadi!",
      callToAction: "📌 Retseptni yo'qotmaslik uchun SAQLAB OLING! 💾"
    };
  }, [recipeCard, scenes, topic]);

  const WIDTH = aspectRatio === AspectRatio.LANDSCAPE ? 1920 : 1080; 
  const HEIGHT = aspectRatio === AspectRatio.PORTRAIT ? 1920 : 1080;
  const FPS = 30; 
  const FADE_DURATION = 0.7; 

  const BUFFER_SCALE = 1.25;
  const BUFFER_W = WIDTH * BUFFER_SCALE; 
  const BUFFER_H = HEIGHT * BUFFER_SCALE;

  // Helper: Decode Base64 to Uint8Array
  const decode = (base64: string) => {
    const clean = base64.includes('base64,') ? base64.split('base64,')[1] : base64;
    const binaryString = atob(clean);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  // Helper: Convert Raw PCM to AudioBuffer with endian-safe DataView and alignment
  const pcmToAudioBuffer = (data: Uint8Array, ctx: AudioContext) => {
    const sampleRate = 24000;
    const numChannels = 1;
    const safeByteLength = data.byteLength - (data.byteLength % 2);
    const frameCount = safeByteLength / 2;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    const channelData = buffer.getChannelData(0);
    const dataView = new DataView(data.buffer, data.byteOffset, safeByteLength);
    
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataView.getInt16(i * 2, true) / 32768.0;
    }
    return buffer;
  };

  // Robust Audio Decoder: Handles both native encoded audio (MP3/WAV/AAC) and Gemini raw PCM
  const decodeAudioPayload = async (rawPayload: string, ctx: AudioContext): Promise<AudioBuffer> => {
    const bytes = decode(rawPayload);
    try {
      // 1. Try Web Audio API native decode (MP3, WAV, AAC, OGG)
      const arrayBufferCopy = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      const decoded = await ctx.decodeAudioData(arrayBufferCopy);
      return decoded;
    } catch (err) {
      // 2. Fallback to 24kHz Raw PCM mono (Gemini TTS)
      return pcmToAudioBuffer(bytes, ctx);
    }
  };

  // 1. Initialize Audio
  useEffect(() => {
    let isCancelled = false;
    const initAudio = async () => {
      if (!audioBase64) return;
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const buffer = await decodeAudioPayload(audioBase64, ctx);
        
        if (!isCancelled) {
          setAudioContext(ctx);
          setAudioBuffer(buffer);
          setDuration(buffer.duration);
        }
      } catch (e) {
        console.error("Audio decoding failed:", e);
      }
    };
    initAudio();
    
    // Initialize light ambient particle dust
    const particles: Particle[] = [];
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * WIDTH,
        y: Math.random() * HEIGHT,
        size: Math.random() * 2.5 + 1,
        speedY: Math.random() * -1.8 - 0.5,
        speedX: Math.random() * 1.2 - 0.6,
        opacity: Math.random() * 0.4 + 0.1
      });
    }
    particlesRef.current = particles;
    
    return () => { 
      isCancelled = true;
      audioContext?.close(); 
    };
  }, [audioBase64]);

  // 2. Pre-process Images & Configure Motion
  useEffect(() => {
    const processImages = async () => {
      const promises = images.map((src, index) => {
        return new Promise<ProcessedImageLayer>((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = src;
          
          img.onload = () => {
            const offCanvas = document.createElement('canvas');
            offCanvas.width = BUFFER_W;
            offCanvas.height = BUFFER_H;
            const ctx = offCanvas.getContext('2d');
            
            if (ctx) {
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'medium';

              const imgRatio = img.naturalWidth / img.naturalHeight;
              const targetRatio = BUFFER_W / BUFFER_H;
              let dw, dh, dx, dy;
              
              if (imgRatio > targetRatio) {
                dh = BUFFER_H;
                dw = BUFFER_H * imgRatio;
                dy = 0;
                dx = (BUFFER_W - dw) / 2;
              } else {
                dw = BUFFER_W;
                dh = BUFFER_W / imgRatio;
                dx = 0;
                dy = (BUFFER_H - dh) / 2;
              }
              ctx.drawImage(img, dx, dy, dw, dh);
            }

            const maxOffsetX = BUFFER_W - WIDTH;
            const maxOffsetY = BUFFER_H - HEIGHT;
            const motionType = index % 6; 
            const transitionType = index % 4;

            let startX = 0, startY = 0, startScale = 1.0;
            let endX = 0, endY = 0, endScale = 1.15; 

            switch (motionType) {
              case 0: // Smooth push in
                startX = -maxOffsetX / 2; startY = -maxOffsetY / 2; startScale = 1.0;
                endX = -maxOffsetX / 2; endY = -maxOffsetY / 2; endScale = 1.20;
                break;
              case 1: // Pan Left & subtle zoom
                startX = 0; startY = -maxOffsetY / 2; startScale = 1.08;
                endX = -maxOffsetX; endY = -maxOffsetY / 2; endScale = 1.15;
                break;
              case 2: // Zoom Out
                startX = -maxOffsetX / 2; startY = -maxOffsetY / 2; startScale = 1.20;
                endX = -maxOffsetX / 2; endY = -maxOffsetY / 2; endScale = 1.02;
                break;
              case 3: // Pan Right
                startX = -maxOffsetX; startY = -maxOffsetY / 2; startScale = 1.12;
                endX = 0; endY = -maxOffsetY / 2; endScale = 1.06;
                break;
              case 4: // Upward drift
                startX = -maxOffsetX / 2; startY = -maxOffsetY; startScale = 1.12;
                endX = -maxOffsetX / 2; endY = 0; endScale = 1.05;
                break;
              case 5: // Subtle diagonal
                startX = 0; startY = 0; startScale = 1.08;
                endX = -maxOffsetX; endY = -maxOffsetY; endScale = 1.16;
                break;
            }

            resolve({
              canvas: offCanvas,
              motion: { startX, startY, startScale, endX, endY, endScale },
              transitionType,
              scene: scenes[index]
            });
          };

          img.onerror = () => {
            const c = document.createElement('canvas');
            c.width = WIDTH; c.height = HEIGHT;
            resolve({
              canvas: c,
              motion: { startX: 0, startY: 0, startScale: 1, endX: 0, endY: 0, endScale: 1 },
              transitionType: 0,
              scene: scenes[index]
            });
          };
        });
      });
      const loaded = await Promise.all(promises);
      setProcessedLayers(loaded);
    };
    if (images.length > 0) processImages();
  }, [images, scenes]);

  // 3. Subtitle Calculation with Viral Karaoke Phrase Grouping
  const preparedSubtitles = useMemo<PreparedSubtitle[]>(() => {
    if (!scriptSegments.length || duration === 0) return [];

    const totalCharsInScript = scriptSegments.reduce((acc, seg) => acc + seg.length, 0);
    let globalElapsed = 0;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];
    
    const fontSize = aspectRatio === AspectRatio.LANDSCAPE ? 50 : (karaokeMode ? 64 : 58); 
    ctx.font = `900 ${fontSize}px Inter, sans-serif`;
    const maxWidth = aspectRatio === AspectRatio.LANDSCAPE ? WIDTH - 300 : WIDTH - 180;
    const spaceWidth = ctx.measureText(' ').width;

    const allPrepared: PreparedSubtitle[] = [];

    scriptSegments.forEach(segmentText => {
      const segmentCharCount = segmentText.length;
      const segmentProportion = segmentCharCount / totalCharsInScript;
      const segmentDuration = duration * segmentProportion;
      const segmentStart = globalElapsed;
      const segmentEnd = segmentStart + segmentDuration;
      globalElapsed += segmentDuration;

      const rawWords = segmentText.split(/\s+/).filter(w => w.trim().length > 0);
      if (rawWords.length === 0) return;

      const totalCharsInSeg = segmentText.replace(/\s/g, '').length || 1;
      let currentWordTime = segmentStart;

      const wordTimings: WordTiming[] = rawWords.map(word => {
        const wLen = word.length;
        const wDuration = (wLen / totalCharsInSeg) * segmentDuration;
        const start = currentWordTime;
        const end = start + wDuration;
        currentWordTime = end;
        return { 
          word, 
          start, 
          end, 
          width: ctx.measureText(word).width,
          emoji: getKeywordEmoji(word)
        };
      });

      // Target words per chunk for viral retention
      const targetWords = karaokeChunkSize === 'standard' ? 5 : 3;

      if (!karaokeMode) {
        // Classic mode: fill lines up to maxWidth
        const lines: SubtitleLine[] = [];
        let currentLineWords: WordTiming[] = [];
        let currentLineWidth = 0;

        wordTimings.forEach((wt) => {
          const wWidth = wt.width;
          const potentialWidth = currentLineWidth + wWidth + (currentLineWords.length > 0 ? spaceWidth : 0);

          if (potentialWidth > maxWidth && currentLineWords.length >= 2) {
            lines.push({ words: currentLineWords, totalWidth: currentLineWidth });
            currentLineWords = [wt];
            currentLineWidth = wWidth;
          } else {
            if (currentLineWords.length > 0) currentLineWidth += spaceWidth;
            currentLineWords.push(wt);
            currentLineWidth += wWidth;
          }
        });
        if (currentLineWords.length > 0) {
          lines.push({ words: currentLineWords, totalWidth: currentLineWidth });
        }
        allPrepared.push({ start: segmentStart, end: segmentEnd, lines });
      } else {
        // Viral Karaoke Chunking (2-4 words per punchy card)
        const segmentChunks: PreparedSubtitle[] = [];
        let wIdx = 0;

        while (wIdx < wordTimings.length) {
          const chunkWords: WordTiming[] = [];
          let chunkWidth = 0;

          while (wIdx < wordTimings.length) {
            const wt = wordTimings[wIdx];
            const isFirst = chunkWords.length === 0;
            const nextWidth = chunkWidth + (isFirst ? 0 : spaceWidth) + wt.width;

            // Break if target words reached or line too wide
            if (!isFirst && (chunkWords.length >= targetWords || (chunkWords.length >= 2 && nextWidth > maxWidth))) {
              break;
            }
            chunkWords.push(wt);
            chunkWidth = nextWidth;
            wIdx++;
          }

          if (chunkWords.length > 0) {
            const cStart = chunkWords[0].start;
            const cEnd = chunkWords[chunkWords.length - 1].end;

            // Form lines inside the chunk (max 2 short lines)
            const lines: SubtitleLine[] = [];
            let lineWords: WordTiming[] = [];
            let lineWidth = 0;

            chunkWords.forEach(wt => {
              const potWidth = lineWidth + wt.width + (lineWords.length > 0 ? spaceWidth : 0);
              if (potWidth > maxWidth && lineWords.length >= 1) {
                lines.push({ words: lineWords, totalWidth: lineWidth });
                lineWords = [wt];
                lineWidth = wt.width;
              } else {
                if (lineWords.length > 0) lineWidth += spaceWidth;
                lineWords.push(wt);
                lineWidth += wt.width;
              }
            });
            if (lineWords.length > 0) {
              lines.push({ words: lineWords, totalWidth: lineWidth });
            }

            // Find keyword emoji for this chunk
            let foundEmoji: string | null = null;
            for (const cw of chunkWords) {
              if (cw.emoji) {
                foundEmoji = cw.emoji;
                break;
              }
            }

            segmentChunks.push({
              start: cStart,
              end: cEnd,
              lines,
              emoji: foundEmoji
            });
          }
        }

        // Seamless bridge between chunks to eliminate blank frame gaps
        for (let c = 0; c < segmentChunks.length; c++) {
          const next = segmentChunks[c + 1];
          segmentChunks[c].end = next ? next.start : segmentEnd;
        }

        allPrepared.push(...segmentChunks);
      }
    });

    return allPrepared;
  }, [scriptSegments, duration, aspectRatio, WIDTH, karaokeMode, karaokeChunkSize]);

  const drawLayer = useCallback((ctx: CanvasRenderingContext2D, layer: ProcessedImageLayer, progress: number, opacity: number) => {
    const { canvas, motion } = layer;
    const { startX, startY, startScale, endX, endY, endScale } = motion;

    const currentX = startX + (endX - startX) * progress;
    const currentY = startY + (endY - startY) * progress;
    const currentScale = startScale + (endScale - startScale) * progress;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(WIDTH / 2, HEIGHT / 2);
    ctx.scale(currentScale, currentScale);
    ctx.translate(-WIDTH / 2, -HEIGHT / 2);
    ctx.drawImage(canvas, currentX, currentY);
    ctx.restore();
  }, [WIDTH, HEIGHT]); 

  // 4. Main Draw Function
  const draw = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas || processedLayers.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Calculate active scene
    const totalImages = processedLayers.length;
    const safeDuration = duration > 0 ? duration : 5;
    const slotDuration = safeDuration / totalImages;
    
    let currentIndex = Math.floor(time / slotDuration);
    if (currentIndex >= totalImages) currentIndex = totalImages - 1;
    if (currentIndex < 0) currentIndex = 0;

    const nextIndex = (currentIndex + 1) < totalImages ? currentIndex + 1 : currentIndex;
    const timeInSlot = time - (currentIndex * slotDuration);
    const progress = Math.min(1, Math.max(0, timeInSlot / slotDuration));

    const currentLayer = processedLayers[currentIndex];
    const currentScene = scenes[currentIndex] || currentLayer?.scene;

    drawLayer(ctx, currentLayer, progress, 1);

    // Cross transitions between scenes
    if (timeInSlot > (slotDuration - FADE_DURATION) && nextIndex !== currentIndex) {
      const fadeTime = timeInSlot - (slotDuration - FADE_DURATION);
      const fadeProgress = fadeTime / FADE_DURATION;
      const transType = processedLayers[nextIndex].transitionType;
      
      ctx.save();
      if (transType === 0) {
        // Crossfade
        drawLayer(ctx, processedLayers[nextIndex], 0, fadeProgress);
      } else if (transType === 1) {
        // Slide Up
        ctx.translate(0, HEIGHT * (1 - fadeProgress));
        drawLayer(ctx, processedLayers[nextIndex], 0, 1);
      } else if (transType === 2) {
        // Zoom In Fade
        ctx.translate(WIDTH / 2, HEIGHT / 2);
        const scale = 0.85 + 0.15 * fadeProgress;
        ctx.scale(scale, scale);
        ctx.translate(-WIDTH / 2, -HEIGHT / 2);
        drawLayer(ctx, processedLayers[nextIndex], 0, fadeProgress);
      } else {
        // Soft Crossfade
        drawLayer(ctx, processedLayers[nextIndex], 0, fadeProgress);
      }
      ctx.restore();
    }

    // Modern Cinematic Dark Vignette & Bottom Gradient for Subtitle contrast
    const vignette = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, HEIGHT * 0.25, WIDTH / 2, HEIGHT / 2, HEIGHT * 0.75);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(10,15,30,0.65)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Bottom gradient for safe zone subtitle readability
    const bottomGrad = ctx.createLinearGradient(0, HEIGHT - 650, 0, HEIGHT);
    bottomGrad.addColorStop(0, 'rgba(0,0,0,0)');
    bottomGrad.addColorStop(0.5, 'rgba(0,0,0,0.7)');
    bottomGrad.addColorStop(1, 'rgba(0,0,0,0.92)');
    ctx.fillStyle = bottomGrad;
    ctx.fillRect(0, HEIGHT - 650, WIDTH, 650);

    // Ambient Floating Particles
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    particlesRef.current.forEach(p => {
      ctx.globalAlpha = p.opacity;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      
      p.y += p.speedY;
      p.x += p.speedX;
      if (p.y < 0) {
        p.y = HEIGHT;
        p.x = Math.random() * WIDTH;
      }
      if (p.x < 0) p.x = WIDTH;
      if (p.x > WIDTH) p.x = 0;
    });
    ctx.globalAlpha = 1;

    // --- TOP BRANDING WATERMARK ---
    ctx.save();
    const handleText = handle || "@jongiyoh";
    ctx.font = "900 32px Inter, sans-serif";
    const badgeContent = `🌿 ${handleText}`;
    const badgeWidth = Math.min(ctx.measureText(badgeContent).width + 48, WIDTH - 120);
    const badgeHeight = 60;
    const badgeX = 54;
    const badgeY = 74;

    // Watermark glass container - natural emerald
    ctx.fillStyle = "rgba(6, 36, 27, 0.90)";
    ctx.strokeStyle = "rgba(16, 185, 129, 0.85)"; // Emerald accent border
    ctx.lineWidth = 2.5;
    ctx.shadowColor = "rgba(16, 185, 129, 0.4)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 4;

    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 30);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#6ee7b7";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText(badgeContent, badgeX + 24, badgeY + badgeHeight / 2);
    ctx.restore();

    // --- SCENE TYPE & HEADLINE OVERLAYS (Responsive & Never Overflow Screen) ---
    if (currentScene) {
      const isRecipeScene = currentScene.type === 'recipe' || /damlash|retsept|doza|tayyorlash|choy/i.test(`${currentScene.headline || ''} ${currentScene.statText || ''}`);
      const isVideoEndRecipe = duration > 9 && time >= Math.max(duration - 7.5, 0) && time < Math.max(duration - 2.2, 0);

      const shouldShowRecipeCard = showRecipeCard && (
        (recipeCardTiming === 'both' && (isRecipeScene || isVideoEndRecipe)) ||
        (recipeCardTiming === 'recipe_scene' && isRecipeScene) ||
        (recipeCardTiming === 'video_end' && isVideoEndRecipe)
      );

      const isCtaScene = (currentScene.type === 'cta' || currentIndex === totalImages - 1) && !isVideoEndRecipe;
      const isWarningScene = currentScene.type === 'warning' || /qarshi|mumkin emas|taqiq|xavfsizlik|ymyl/i.test(`${currentScene.headline} ${currentScene.statText || ''}`);
      const isInfoScene = currentScene.isInfographic || !!currentScene.statText;

      // 1. DEDICATED FULL "DAMLASH RETSEPTI & DOZA" INFOGRAPHIC CARD
      if (shouldShowRecipeCard) {
        drawRecipeInfographicCard(ctx, effectiveRecipeCard, WIDTH, HEIGHT, aspectRatio === AspectRatio.LANDSCAPE);
      }
      // 2. FINAL CTA CARD OVERLAY (Telegram Bot & Funnel Conversion)
      else if (isCtaScene) {
        ctx.save();
        const ctaW = Math.min(WIDTH - 120, 880);
        const ctaH = 350;
        const ctaX = (WIDTH - ctaW) / 2;
        const ctaY = HEIGHT / 2 - 240;

        // Card Container Background & Glowing Emerald/Gold Border
        ctx.fillStyle = "rgba(6, 26, 20, 0.96)";
        ctx.strokeStyle = "rgba(245, 158, 11, 0.95)"; // Warm golden border
        ctx.lineWidth = 4;
        ctx.shadowColor = "rgba(245, 158, 11, 0.45)";
        ctx.shadowBlur = 30;

        ctx.beginPath();
        ctx.roundRect(ctaX, ctaY, ctaW, ctaH, 28);
        ctx.fill();
        ctx.stroke();

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Dynamic domain and handle
        const rawHandle = handleText.replace('@', '').trim();
        const displayDomain = rawHandle.includes('.') ? rawHandle : `${rawHandle || 'jongiyoh'}.uz`;

        // CTA Header (Auto-scaled for safety)
        const headerText = "🌿 SHAXSIY DOZA VA FITO-KURS!";
        ctx.font = "900 40px Inter, sans-serif";
        ctx.fillStyle = "#fef08a";
        ctx.shadowColor = "rgba(0,0,0,0.8)";
        ctx.shadowBlur = 10;
        ctx.fillText(headerText, WIDTH / 2, ctaY + 68, ctaW - 40);

        // CTA Subtext line 1
        const sub1 = "Yoshingiz va holatingizga mos xavfsiz dozani hisoblang:";
        ctx.font = "700 25px Inter, sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(sub1, WIDTH / 2, ctaY + 125, ctaW - 60);

        // CTA Subtext line 2 (Website | Telegram Bot)
        const sub2 = `${displayDomain} | @${rawHandle}_bot`;
        ctx.font = "800 28px Inter, sans-serif";
        ctx.fillStyle = "#6ee7b7";
        ctx.fillText(sub2, WIDTH / 2, ctaY + 172, ctaW - 60);

        // CTA Action Button Pill
        const pillW = Math.min(540, ctaW - 80);
        const pillH = 72;
        const pillX = (WIDTH - pillW) / 2;
        const pillY = ctaY + 230;

        ctx.fillStyle = "#10b981"; // Emerald green
        ctx.shadowColor = "rgba(16, 185, 129, 0.6)";
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.roundRect(pillX, pillY, pillW, pillH, 36);
        ctx.fill();

        ctx.font = "900 26px Inter, sans-serif";
        ctx.fillStyle = "#022c22";
        ctx.shadowBlur = 0;
        ctx.fillText("💬 TELEGRAM BOTDA HISOBLASH", WIDTH / 2, pillY + pillH / 2, pillW - 30);

        ctx.restore();
      } 
      // 2. WARNING / YMYL CONTRAINDICATIONS OVERLAY
      else if (isWarningScene && currentScene.statText) {
        ctx.save();
        const cardW = Math.min(WIDTH - 140, 880);
        const cardH = 220;
        const cardX = (WIDTH - cardW) / 2;
        const cardY = 240;

        ctx.fillStyle = "rgba(69, 10, 10, 0.94)"; // Crimson safety background
        ctx.strokeStyle = "rgba(239, 68, 68, 0.9)"; // Red alert border
        ctx.lineWidth = 3.5;
        ctx.shadowColor = "rgba(239, 68, 68, 0.4)";
        ctx.shadowBlur = 20;

        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardW, cardH, 24);
        ctx.fill();
        ctx.stroke();

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.font = "800 26px Inter, sans-serif";
        ctx.fillStyle = "#fca5a5";
        const title = "⚠️ QARSHI KO'RSATMALAR (YMYL XAVFSIZLIK)";
        ctx.fillText(title, WIDTH / 2, cardY + 55, cardW - 40);

        ctx.font = "900 48px Inter, sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(currentScene.statText, WIDTH / 2, cardY + 140, cardW - 40);
        ctx.restore();
      }
      // 3. RECIPE / STAT / INFOGRAPHIC CARD OVERLAY
      else if (isInfoScene && currentScene.statText) {
        ctx.save();
        const cardW = Math.min(WIDTH - 140, 880);
        const cardH = 220;
        const cardX = (WIDTH - cardW) / 2;
        const cardY = 240;

        ctx.fillStyle = "rgba(6, 36, 27, 0.93)"; // Emerald natural background
        ctx.strokeStyle = "rgba(16, 185, 129, 0.85)"; // Green border
        ctx.lineWidth = 3.5;
        ctx.shadowColor = "rgba(16, 185, 129, 0.35)";
        ctx.shadowBlur = 20;

        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardW, cardH, 24);
        ctx.fill();
        ctx.stroke();

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.font = "800 28px Inter, sans-serif";
        ctx.fillStyle = "#a7f3d0";
        const title = "🍵 " + (currentScene.headline || "DOZA VA TAYYORLASH TARTIBI").toUpperCase();
        ctx.fillText(title, WIDTH / 2, cardY + 55, cardW - 40);

        ctx.font = "900 54px Inter, sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(currentScene.statText, WIDTH / 2, cardY + 140, cardW - 40);
        ctx.restore();
      } 
      // 3. STANDARD SCENE HEADLINE / TOPIC BADGE (Responsive Multiline & Never Overflows!)
      else if (currentScene.headline && currentScene.headline.trim()) {
        ctx.save();
        const rawText = currentScene.headline.toUpperCase().trim();
        const maxBadgeW = Math.min(WIDTH - 120, 920);
        
        ctx.font = "900 34px Inter, sans-serif";
        const singleLineWidth = ctx.measureText(rawText).width;

        if (singleLineWidth <= maxBadgeW - 64) {
          // Fits on single line
          const hWidth = singleLineWidth + 64;
          const hHeight = 68;
          const hX = (WIDTH - hWidth) / 2;
          const hY = 210;

          ctx.fillStyle = "rgba(15, 23, 42, 0.90)";
          ctx.strokeStyle = "rgba(250, 204, 21, 0.75)";
          ctx.lineWidth = 2.5;
          ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
          ctx.shadowBlur = 16;

          ctx.beginPath();
          ctx.roundRect(hX, hY, hWidth, hHeight, 34);
          ctx.fill();
          ctx.stroke();

          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "#facc15";
          ctx.fillText(rawText, WIDTH / 2, hY + hHeight / 2, maxBadgeW - 50);
        } else {
          // Multiline text wrapping (2 lines) with auto-scale
          ctx.font = "900 30px Inter, sans-serif";
          const words = rawText.split(' ');
          const lines: string[] = [];
          let curLine = '';

          for (let i = 0; i < words.length; i++) {
            const testLine = curLine ? `${curLine} ${words[i]}` : words[i];
            const testW = ctx.measureText(testLine).width;
            if (testW > maxBadgeW - 64 && curLine) {
              lines.push(curLine);
              curLine = words[i];
            } else {
              curLine = testLine;
            }
          }
          if (curLine) lines.push(curLine);

          // Calculate badge dimensions
          let maxLineWidth = 0;
          lines.slice(0, 2).forEach(l => {
            const lw = ctx.measureText(l).width;
            if (lw > maxLineWidth) maxLineWidth = lw;
          });

          const hWidth = Math.min(maxBadgeW, maxLineWidth + 64);
          const hHeight = lines.length > 1 ? 104 : 68;
          const hX = (WIDTH - hWidth) / 2;
          const hY = 200;

          ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
          ctx.strokeStyle = "rgba(250, 204, 21, 0.75)";
          ctx.lineWidth = 2.5;
          ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
          ctx.shadowBlur = 16;

          ctx.beginPath();
          ctx.roundRect(hX, hY, hWidth, hHeight, 24);
          ctx.fill();
          ctx.stroke();

          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "#facc15";

          if (lines.length === 1) {
            ctx.fillText(lines[0], WIDTH / 2, hY + hHeight / 2, hWidth - 40);
          } else {
            ctx.fillText(lines[0], WIDTH / 2, hY + 32, hWidth - 40);
            ctx.fillText(lines[1] + (lines.length > 2 ? '...' : ''), WIDTH / 2, hY + 72, hWidth - 40);
          }
        }
        ctx.restore();
      }
    }

    // --- WORD-BY-WORD VIRAL KARAOKE SUBTITLES ---
    const activeSubtitle = preparedSubtitles.find(s => time >= s.start && time < s.end) ||
                           preparedSubtitles.find(s => time >= s.start && time < s.end + 0.35);

    if (activeSubtitle && activeSubtitle.lines.length > 0) {
      const fontSize = aspectRatio === AspectRatio.LANDSCAPE ? 50 : (karaokeMode ? 64 : 58);
      ctx.font = `900 ${fontSize}px Inter, sans-serif`;
      ctx.textBaseline = 'middle';
      const spaceWidth = ctx.measureText(' ').width;
      const lineHeight = fontSize * 1.28;

      let baseY = HEIGHT - 450; // Safe zone above Instagram / TikTok bottom UI
      if (subtitlePosition === SubtitlePosition.CENTER) baseY = HEIGHT / 2 + 80;
      if (subtitlePosition === SubtitlePosition.TOP) baseY = 380;
      if (aspectRatio !== AspectRatio.PORTRAIT && subtitlePosition === SubtitlePosition.BOTTOM) {
        baseY = HEIGHT - 180;
      }

      const totalLines = activeSubtitle.lines.length;
      const maxLineWidth = Math.max(...activeSubtitle.lines.map(l => l.totalWidth));

      // Container card dimensions
      const padX = 28;
      const padY = 16;
      const cardW = Math.max(360, Math.min(WIDTH - 100, maxLineWidth + padX * 2));
      const cardH = (totalLines * lineHeight) + padY * 2;
      const cardX = (WIDTH - cardW) / 2;
      const cardY = baseY - (cardH / 2);

      ctx.save();

      // Draw frosted backdrop plate
      if (subtitleStyle === SubtitleStyle.HORMOZI_EMERALD) {
        ctx.fillStyle = 'rgba(2, 28, 20, 0.88)';
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.55)';
        ctx.lineWidth = 3;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 18;
      } else if (subtitleStyle === SubtitleStyle.HORMOZI_GOLD || subtitleStyle === SubtitleStyle.YELLOW_VIRAL) {
        ctx.fillStyle = 'rgba(24, 18, 5, 0.90)';
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.55)';
        ctx.lineWidth = 3;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 18;
      } else if (subtitleStyle === SubtitleStyle.NEON_PULSE || subtitleStyle === SubtitleStyle.NEON_CYBER) {
        ctx.fillStyle = 'rgba(6, 20, 36, 0.90)';
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
        ctx.lineWidth = 3;
        ctx.shadowColor = 'rgba(56, 189, 248, 0.4)';
        ctx.shadowBlur = 20;
      } else if (subtitleStyle === SubtitleStyle.WARNING_RED) {
        ctx.fillStyle = 'rgba(65, 8, 8, 0.94)';
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = 'rgba(239, 68, 68, 0.4)';
        ctx.shadowBlur = 20;
      } else if (subtitleStyle === SubtitleStyle.EMERALD_HERBS) {
        ctx.fillStyle = 'rgba(4, 34, 24, 0.90)';
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.5)';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 16;
      } else if (subtitleStyle === SubtitleStyle.GOLDEN_HONEY) {
        ctx.fillStyle = 'rgba(25, 20, 8, 0.90)';
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 16;
      } else {
        // CLEAN_MINIMAL
        ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 14;
      }

      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, 24);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Top floating keyword emoji
      if (showEmojiAccents && activeSubtitle.emoji) {
        ctx.save();
        ctx.font = '40px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 10;
        ctx.fillText(activeSubtitle.emoji, WIDTH / 2, cardY - 24);
        ctx.restore();
      }

      // Draw each line of words
      activeSubtitle.lines.forEach((line, lineIdx) => {
        let lineY = baseY;
        if (totalLines > 1) {
          lineY = (baseY - (totalLines - 1) * (lineHeight / 2)) + (lineIdx * lineHeight);
        }

        let currentX = (WIDTH - line.totalWidth) / 2;

        line.words.forEach((wt) => {
          const isWordActive = time >= wt.start && time < wt.end;
          const isWordPast = time >= wt.end;
          const wordW = wt.width;

          ctx.save();

          let wordScale = 1.0;
          if (isWordActive) {
            const activeElapsed = time - wt.start;
            if (activeElapsed < 0.16) {
              wordScale = 1.0 + Math.sin((activeElapsed / 0.16) * Math.PI) * 0.16; // 1.16x spring bounce
            } else {
              wordScale = 1.06;
            }
          }

          const wordCenterX = currentX + wordW / 2;
          const wordCenterY = lineY;

          ctx.translate(wordCenterX, wordCenterY);
          ctx.scale(wordScale, wordScale);
          ctx.translate(-wordCenterX, -wordCenterY);

          ctx.font = `900 ${fontSize}px Inter, sans-serif`;
          ctx.textBaseline = 'middle';

          if (isWordActive) {
            // Draw Active Highlight Pop Badge behind the word
            const badgePadX = 14;
            const badgePadY = 8;
            const badgeW = wordW + badgePadX * 2;
            const badgeH = fontSize + badgePadY * 2;
            const badgeX = currentX - badgePadX;
            const badgeY = lineY - badgeH / 2;

            if (subtitleStyle === SubtitleStyle.HORMOZI_EMERALD) {
              ctx.fillStyle = '#10b981'; // Vibrant emerald badge
              ctx.shadowColor = '#10b981';
              ctx.shadowBlur = 24;
              ctx.beginPath();
              ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 14);
              ctx.fill();

              // Dark high-contrast text on bright emerald badge
              ctx.fillStyle = '#022417';
              ctx.fillText(wt.word, currentX, lineY);
            } else if (subtitleStyle === SubtitleStyle.HORMOZI_GOLD || subtitleStyle === SubtitleStyle.YELLOW_VIRAL) {
              ctx.fillStyle = '#facc15'; // Vibrant electric yellow
              ctx.shadowColor = '#f59e0b';
              ctx.shadowBlur = 24;
              ctx.beginPath();
              ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 14);
              ctx.fill();

              // Deep dark text on bright gold badge
              ctx.fillStyle = '#1c1917';
              ctx.fillText(wt.word, currentX, lineY);
            } else if (subtitleStyle === SubtitleStyle.NEON_PULSE || subtitleStyle === SubtitleStyle.NEON_CYBER) {
              ctx.fillStyle = 'rgba(56, 189, 248, 0.3)';
              ctx.strokeStyle = '#38bdf8';
              ctx.lineWidth = 3;
              ctx.shadowColor = '#38bdf8';
              ctx.shadowBlur = 24;
              ctx.beginPath();
              ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 14);
              ctx.fill();
              ctx.stroke();

              ctx.fillStyle = '#38bdf8';
              ctx.fillText(wt.word, currentX, lineY);
            } else if (subtitleStyle === SubtitleStyle.WARNING_RED) {
              ctx.fillStyle = '#ef4444';
              ctx.shadowColor = '#ef4444';
              ctx.shadowBlur = 24;
              ctx.beginPath();
              ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 14);
              ctx.fill();

              ctx.fillStyle = '#ffffff';
              ctx.fillText(wt.word, currentX, lineY);
            } else if (subtitleStyle === SubtitleStyle.EMERALD_HERBS) {
              ctx.fillStyle = 'rgba(16, 185, 129, 0.35)';
              ctx.strokeStyle = '#34d399';
              ctx.lineWidth = 2.5;
              ctx.shadowColor = '#10b981';
              ctx.shadowBlur = 20;
              ctx.beginPath();
              ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 14);
              ctx.fill();
              ctx.stroke();

              ctx.fillStyle = '#6ee7b7';
              ctx.fillText(wt.word, currentX, lineY);
            } else if (subtitleStyle === SubtitleStyle.GOLDEN_HONEY) {
              ctx.fillStyle = 'rgba(245, 158, 11, 0.35)';
              ctx.strokeStyle = '#f59e0b';
              ctx.lineWidth = 2.5;
              ctx.shadowColor = '#f59e0b';
              ctx.shadowBlur = 20;
              ctx.beginPath();
              ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 14);
              ctx.fill();
              ctx.stroke();

              ctx.fillStyle = '#fde047';
              ctx.fillText(wt.word, currentX, lineY);
            } else {
              // CLEAN_MINIMAL
              ctx.fillStyle = '#ffffff';
              ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
              ctx.shadowBlur = 20;
              ctx.beginPath();
              ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 14);
              ctx.fill();

              ctx.fillStyle = '#0f172a';
              ctx.fillText(wt.word, currentX, lineY);
            }
          } else {
            // Non-active word: thick black outline + crisp white text for 100% legibility
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 8;
            ctx.lineJoin = 'round';
            ctx.miterLimit = 2;
            ctx.strokeText(wt.word, currentX, lineY);

            if (isWordPast) {
              ctx.fillStyle = (subtitleStyle === SubtitleStyle.HORMOZI_EMERALD || subtitleStyle === SubtitleStyle.EMERALD_HERBS)
                ? 'rgba(167, 243, 208, 0.92)'
                : (subtitleStyle === SubtitleStyle.HORMOZI_GOLD ? 'rgba(254, 240, 138, 0.92)' : 'rgba(255, 255, 255, 0.82)');
            } else {
              ctx.fillStyle = '#ffffff';
            }
            ctx.fillText(wt.word, currentX, lineY);
          }

          ctx.restore();
          currentX += wordW + spaceWidth;
        });
      });
    }

  }, [processedLayers, duration, preparedSubtitles, drawLayer, scenes, handle, subtitlePosition, subtitleStyle, aspectRatio, WIDTH, HEIGHT, karaokeMode, showEmojiAccents, showRecipeCard, recipeCardTiming, effectiveRecipeCard]);

  // 5. Animation Loop
  const animate = useCallback(() => {
    if (!isPlaying || !audioContext) return;
    
    const now = audioContext.currentTime;
    const time = (now - startTime) * audioSpeed;
    
    if (time >= duration + 0.6) { 
      setIsPlaying(false);
      activeSourceRef.current?.stop();
      activeSourceRef.current = null;
      musicInstanceRef.current?.stop();
      musicInstanceRef.current = null;
      currentTimeRef.current = 0;
      setDisplayTime(0);
      draw(0);
      return;
    }

    currentTimeRef.current = time;
    setDisplayTime(time);
    draw(time);
    reqRef.current = requestAnimationFrame(animate);
  }, [isPlaying, audioContext, startTime, duration, audioSpeed, draw]);

  useEffect(() => {
    reqRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(reqRef.current!);
  }, [animate]);

  useEffect(() => {
    if (!isPlaying && processedLayers.length > 0) {
      draw(currentTimeRef.current);
    }
  }, [isPlaying, draw, processedLayers]);

  const startAudioPlaybackAt = (offsetSec: number) => {
    if (!audioContext || !audioBuffer) return;
    
    try {
      activeSourceRef.current?.stop();
      activeSourceRef.current?.disconnect();
    } catch (e) {}

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.playbackRate.value = audioSpeed;

    // Professional voice mastering chain:
    // 1. Gain boost (+2.5dB / 1.35x) to guarantee narration is loud and upfront
    const voiceGain = audioContext.createGain();
    voiceGain.gain.setValueAtTime(1.35, audioContext.currentTime);

    // 2. Dynamics compressor to even out speech dynamics and prevent words from being swallowed
    const compressor = audioContext.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-18, audioContext.currentTime);
    compressor.knee.setValueAtTime(12, audioContext.currentTime);
    compressor.ratio.setValueAtTime(4, audioContext.currentTime);
    compressor.attack.setValueAtTime(0.003, audioContext.currentTime);
    compressor.release.setValueAtTime(0.25, audioContext.currentTime);

    source.connect(voiceGain);
    voiceGain.connect(compressor);
    compressor.connect(audioContext.destination);
    activeSourceRef.current = source;

    musicInstanceRef.current?.stop();
    const bgSynth = createBackgroundMusic(audioContext, musicGenre, musicVolume);
    if (bgSynth) {
      bgSynth.masterGain.connect(audioContext.destination);
      musicInstanceRef.current = bgSynth;
    }

    source.start(0, offsetSec);
    setStartTime(audioContext.currentTime - offsetSec / audioSpeed);
  };

  const togglePlay = async () => {
    if (!audioContext || !audioBuffer) return;

    if (isPlaying) {
      try {
        activeSourceRef.current?.stop();
        activeSourceRef.current?.disconnect();
        activeSourceRef.current = null;
      } catch (e) {}
      musicInstanceRef.current?.stop();
      musicInstanceRef.current = null;
      setIsPlaying(false);
    } else {
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      startAudioPlaybackAt(currentTimeRef.current >= duration ? 0 : currentTimeRef.current);
      setIsPlaying(true);
    }
  };

  const handleSeek = (newTime: number) => {
    const clamped = Math.max(0, Math.min(duration, newTime));
    currentTimeRef.current = clamped;
    setDisplayTime(clamped);
    draw(clamped);

    if (isPlaying && audioContext) {
      startAudioPlaybackAt(clamped);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 6. HD Video Export (1080x1920 30FPS)
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas || !audioBuffer) return;
    if (downloadProgress !== null) return;

    setDownloadProgress(0);
    if (isPlaying) {
      try {
        activeSourceRef.current?.stop();
        activeSourceRef.current = null;
      } catch (e) {}
      musicInstanceRef.current?.stop();
      musicInstanceRef.current = null;
      setIsPlaying(false);
    }

    const types = [
      "video/mp4;codecs=h264,aac",
      "video/mp4",
      "video/webm;codecs=vp9,opus",
      "video/webm"
    ];
    const mimeType = types.find(t => MediaRecorder.isTypeSupported(t)) || "video/webm";
    const fileExt = mimeType.includes("mp4") ? "mp4" : "webm";

    const stream = canvas.captureStream(FPS);
    const recCtx = new AudioContext();
    const dest = recCtx.createMediaStreamDestination();
    
    const source = recCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.playbackRate.value = audioSpeed;

    // Professional voice enhancement in export
    const voiceGain = recCtx.createGain();
    voiceGain.gain.setValueAtTime(1.35, recCtx.currentTime);

    const compressor = recCtx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-18, recCtx.currentTime);
    compressor.knee.setValueAtTime(12, recCtx.currentTime);
    compressor.ratio.setValueAtTime(4, recCtx.currentTime);
    compressor.attack.setValueAtTime(0.003, recCtx.currentTime);
    compressor.release.setValueAtTime(0.25, recCtx.currentTime);

    source.connect(voiceGain);
    voiceGain.connect(compressor);
    compressor.connect(dest);

    const bgSynth = createBackgroundMusic(recCtx, musicGenre, musicVolume);
    if (bgSynth) {
      bgSynth.masterGain.connect(dest);
    }
    
    const tracks = dest.stream.getAudioTracks();
    if (tracks.length > 0) stream.addTrack(tracks[0]);

    const recorder = new MediaRecorder(stream, {
      mimeType: mimeType,
      videoBitsPerSecond: 12000000 
    });

    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    
    recorder.onstop = () => {
      bgSynth?.stop();
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const seoSlug = generateSeoSlug(topic);
      const chosenName = customFilename?.trim() ? customFilename.trim() : seoSlug;
      const cleanBase = chosenName.replace(/\.[^/.]+$/, "");
      const finalFilename = `${cleanBase}.${fileExt}`;
      a.download = finalFilename;
      a.click();
      
      recCtx.close();
      URL.revokeObjectURL(url);
      setDownloadProgress(null);
      currentTimeRef.current = 0;
      setDisplayTime(0);
      draw(0);
    };

    source.start(0);
    recorder.start();
    
    const recStartTime = performance.now();
    let lastProgressUpdate = 0;
    const effectiveDuration = duration / audioSpeed;

    const recordLoop = () => {
      const now = performance.now();
      const elapsedReal = (now - recStartTime) / 1000;
      const elapsedVideo = elapsedReal * audioSpeed;

      if (elapsedReal >= effectiveDuration) {
        setDownloadProgress(100);
        setTimeout(() => recorder.stop(), 500);
        return;
      }

      draw(elapsedVideo);

      if (now - lastProgressUpdate > 200) {
        const pct = Math.min(99, Math.round((elapsedReal / effectiveDuration) * 100));
        setDownloadProgress(pct);
        lastProgressUpdate = now;
      }

      requestAnimationFrame(recordLoop);
    };
    requestAnimationFrame(recordLoop);
  };

  // 7. Cover Generator (1080x1920 Static PNG)
  const handleDownloadCover = () => {
    setIsGeneratingCover(true);
    try {
      const coverCanvas = document.createElement('canvas');
      coverCanvas.width = 1080;
      coverCanvas.height = 1920;
      const ctx = coverCanvas.getContext('2d');
      if (!ctx) return;

      // 1. Draw base first frame
      if (processedLayers.length > 0) {
        drawLayer(ctx, processedLayers[0], 0.1, 1);
      } else {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 1080, 1920);
      }

      // 2. High-contrast Dark gradient overlay
      const grad = ctx.createLinearGradient(0, 0, 0, 1920);
      grad.addColorStop(0, 'rgba(15, 23, 42, 0.7)');
      grad.addColorStop(0.5, 'rgba(15, 23, 42, 0.4)');
      grad.addColorStop(1, 'rgba(15, 23, 42, 0.95)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1080, 1920);

      // 3. Top branding
      ctx.fillStyle = '#34d399';
      ctx.font = '900 40px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('JONGIYOH.UZ', 540, 180);

      // 4. Main Cover Headline Card
      const textToUse = coverHeadline || topic || "SHIFOBAXSH GIYOHLAR";
      const headlineW = 920;
      const headlineH = 400;
      const headlineX = 80;
      const headlineY = 760;

      ctx.fillStyle = "rgba(4, 29, 21, 0.94)";
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 6;
      ctx.shadowColor = "rgba(16, 185, 129, 0.5)";
      ctx.shadowBlur = 30;

      ctx.beginPath();
      ctx.roundRect(headlineX, headlineY, headlineW, headlineH, 32);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 58px Inter, sans-serif';
      
      // Wrap headline text
      const words = textToUse.toUpperCase().split(' ');
      let line = '';
      let lineY = headlineY + 120;
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > headlineW - 80 && n > 0) {
          ctx.fillText(line.trim(), 540, lineY);
          line = words[n] + ' ';
          lineY += 76;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line.trim(), 540, lineY);

      // 5. Subtitle Pill
      const sub = coverSubtitle || "Fitoterapiya & Tabiiy Salomatlik Merosi";
      ctx.fillStyle = '#facc15';
      ctx.font = '800 32px Inter, sans-serif';
      ctx.fillText(sub, 540, headlineY + 330);

      // 6. Bottom Callout
      ctx.font = '700 32px Inter, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillText('👉 To\'liq video ichkarida • @jongiyoh_bot', 540, 1750);

      // Download
      const url = coverCanvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      const coverSlug = generateSeoSlug(topic);
      a.download = `muqova-${coverSlug}.png`;
      a.click();
    } catch (e) {
      console.error("Failed to generate cover", e);
    } finally {
      setIsGeneratingCover(false);
    }
  };

  // 8. Seek to Recipe Infographic Scene
  const handleJumpToRecipe = () => {
    if (scenes && scenes.length > 0 && duration > 0) {
      const sceneIdx = scenes.findIndex(s => s.type === 'recipe' || /damlash|retsept|doza/i.test(`${s.headline} ${s.statText || ''}`));
      if (sceneIdx !== -1) {
        const targetTime = (sceneIdx / scenes.length) * duration + 0.4;
        handleSeek(Math.min(targetTime, duration - 1));
        return;
      }
    }
    if (duration > 5) {
      handleSeek(Math.max(duration - 4.5, 0));
    }
  };

  // 9. Download Recipe Card as High-Resolution 1080x1920 PNG
  const handleDownloadRecipeCardPng = () => {
    setIsDownloadingRecipeCard(true);
    try {
      const offCanvas = document.createElement('canvas');
      offCanvas.width = WIDTH;
      offCanvas.height = HEIGHT;
      const ctx = offCanvas.getContext('2d');
      if (!ctx) return;

      // 1. Draw recipe scene layer or first layer
      const recipeLayerIdx = scenes?.findIndex(s => s.type === 'recipe' || /damlash|retsept|doza/i.test(`${s.headline} ${s.statText || ''}`));
      const layerToUse = (recipeLayerIdx !== undefined && recipeLayerIdx >= 0 && processedLayers[recipeLayerIdx]) 
        ? processedLayers[recipeLayerIdx] 
        : (processedLayers[0] || null);

      if (layerToUse) {
        drawLayer(ctx, layerToUse, 0.15, 1);
      } else {
        ctx.fillStyle = "#022c22";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
      }

      // 2. High-contrast botanical dark overlay
      const grad = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 200, WIDTH / 2, HEIGHT / 2, Math.max(WIDTH, HEIGHT) / 1.1);
      grad.addColorStop(0, "rgba(2, 44, 34, 0.70)");
      grad.addColorStop(1, "rgba(1, 20, 15, 0.94)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // 3. Top Watermark
      ctx.save();
      const rawHandle = handle ? handle.replace('@', '').trim() : 'jongiyoh';
      const badgeContent = `🌿 @${rawHandle}`;
      ctx.font = "900 32px Inter, sans-serif";
      const badgeWidth = Math.min(ctx.measureText(badgeContent).width + 48, WIDTH - 120);
      ctx.fillStyle = "rgba(6, 36, 27, 0.92)";
      ctx.strokeStyle = "rgba(16, 185, 129, 0.85)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(54, 74, badgeWidth, 60, 30);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#6ee7b7";
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      ctx.fillText(badgeContent, 54 + 24, 74 + 30);
      ctx.restore();

      // 4. Draw the complete Recipe Card
      drawRecipeInfographicCard(ctx, effectiveRecipeCard, WIDTH, HEIGHT, aspectRatio === AspectRatio.LANDSCAPE);

      // 5. Footer Branding & Callout at bottom
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "800 28px Inter, sans-serif";
      ctx.fillStyle = "#6ee7b7";
      const domainText = rawHandle.includes('.') ? rawHandle : `${rawHandle}.uz`;
      ctx.fillText(`🌿 ${domainText.toUpperCase()}  •  TABIIY DORIVOR GIYOHLAR`, WIDTH / 2, HEIGHT - 180);

      ctx.font = "700 24px Inter, sans-serif";
      ctx.fillStyle = "#fef08a";
      ctx.fillText(`💬 Shaxsiy dozani hisoblash: @${rawHandle}_bot`, WIDTH / 2, HEIGHT - 130);
      ctx.restore();

      // 6. Download PNG
      const dataUrl = offCanvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      const fileSlug = generateSeoSlug(effectiveRecipeCard.title || topic || 'retsept');
      a.download = `damlash-retsepti-${fileSlug}.png`;
      a.click();
    } catch (err) {
      console.error("Failed to generate recipe card PNG:", err);
    } finally {
      setIsDownloadingRecipeCard(false);
    }
  };

  const getCanvasAspectClass = () => {
    if (aspectRatio === AspectRatio.SQUARE) return "w-[340px] h-[340px]";
    if (aspectRatio === AspectRatio.LANDSCAPE) return "w-[480px] h-[270px]";
    return "w-[300px] h-[533px]";
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* Veo vs Canvas Mode Switcher */}
      {veoVideoUrl && (
        <div className="flex bg-[#041d15] p-1 rounded-xl border border-purple-500/40 mb-3.5 gap-1.5 shadow-lg">
          <button
            onClick={() => setPlayerMode('veo')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              playerMode === 'veo' 
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/25' 
                : 'text-purple-300 hover:text-white hover:bg-purple-950/60'
            }`}
          >
            <span>🎬</span>
            <span>Google Veo Video (MP4)</span>
          </button>
          <button
            onClick={() => setPlayerMode('canvas')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              playerMode === 'canvas' 
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/25' 
                : 'text-emerald-300 hover:text-white hover:bg-emerald-950/60'
            }`}
          >
            <span>🎨</span>
            <span>2D Canvas Motion</span>
          </button>
        </div>
      )}

      {playerMode === 'veo' && veoVideoUrl ? (
        <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-purple-500/50 bg-black ring-4 ring-purple-500/20 transition-all duration-300 flex flex-col items-center w-full max-w-[340px]">
          <video
            src={veoVideoUrl}
            controls
            autoPlay
            playsInline
            className={`${getCanvasAspectClass()} bg-black object-cover w-full`}
          />
          <div className="w-full p-3 bg-[#06241b] border-t border-purple-900/60 flex items-center justify-between">
            <span className="text-xs text-purple-300 font-black flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
              Veo 3.1 & Omni
            </span>
            <a
              href={veoVideoUrl}
              download={`veo-${generateSeoSlug(topic || 'video')}.mp4`}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1 shadow cursor-pointer"
            >
              <span>📥</span>
              <span>MP4 Yuklab Olish</span>
            </a>
          </div>
        </div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-700 bg-black ring-4 ring-amber-500/30 transition-all duration-300">
          <canvas 
            ref={canvasRef} 
            width={WIDTH} 
            height={HEIGHT} 
            className={`${getCanvasAspectClass()} bg-black`}
          />
          <div className="absolute bottom-0 w-full p-4 flex justify-between items-center bg-gradient-to-t from-black/85 via-black/40 to-transparent">
            <button 
              onClick={togglePlay}
              disabled={downloadProgress !== null}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold p-3.5 rounded-full transition disabled:opacity-50 active:scale-95 shadow-lg flex items-center justify-center"
            >
              {isPlaying ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5 translate-x-0.5">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleJumpToRecipe}
                className="bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 backdrop-blur-md hover:border-emerald-400 shadow-md cursor-pointer"
                title="Damlash retsepti va doza infografikasiga o'tish"
              >
                🫖 Retsept Kadriga
              </button>
              {onEditScript && (
                <button
                  onClick={onEditScript}
                  className="bg-slate-900/80 hover:bg-slate-800 text-amber-300 border border-amber-500/30 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 backdrop-blur-md hover:border-amber-400 shadow-md cursor-pointer"
                >
                  ✏️ Matn
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Scrub bar & Time controls */}
      <div className="mt-4 w-full max-w-[340px] bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 space-y-2 backdrop-blur-md">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span className="text-white font-bold">{formatTime(displayTime)}</span>
          <span className="text-slate-500">{formatTime(duration)}</span>
        </div>
        
        <input 
          type="range"
          min="0"
          max={duration || 1}
          step="0.1"
          value={displayTime}
          onChange={(e) => handleSeek(Number(e.target.value))}
          className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
        />

        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] uppercase font-bold text-slate-400">Ovoz tezligi:</span>
          <div className="flex gap-1">
            {[0.9, 1.0, 1.15, 1.25].map((spd) => (
              <button
                key={spd}
                onClick={() => onSpeedChange?.(spd)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition ${audioSpeed === spd ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {downloadProgress !== null ? (
        <div className="mt-4 w-full max-w-[340px] space-y-3 bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-xl">
          <div className="flex justify-between text-xs text-slate-400 font-medium">
            <span>HD Reel yozilmoqda...</span>
            <span className="text-amber-400 font-bold font-mono">{downloadProgress}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 h-2.5 rounded-full transition-all duration-100 ease-linear shadow-[0_0_12px_rgba(245,158,11,0.6)]"
              style={{ width: `${downloadProgress}%` }}
            ></div>
          </div>
          <p className="text-[10px] text-center text-slate-500">1080×1920 30FPS Instagram formati tayyorlanmoqda</p>
        </div>
      ) : (
        <div className="mt-4 w-full max-w-[340px] space-y-2">
          <button
            onClick={handleDownload}
            disabled={!audioBuffer || processedLayers.length === 0}
            className="w-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-slate-950 font-black py-4 px-6 rounded-2xl shadow-xl shadow-amber-500/20 transition flex items-center justify-center gap-2 group active:scale-95 border border-amber-300/30 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.4} stroke="currentColor" className="w-5 h-5 group-hover:translate-y-0.5 transition-transform">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            REELNI YUKLAB OLISH (HD)
          </button>

          <button
            onClick={handleDownloadRecipeCardPng}
            disabled={processedLayers.length === 0 || isDownloadingRecipeCard}
            className="w-full bg-emerald-900/70 hover:bg-emerald-800 disabled:opacity-50 text-emerald-200 font-bold py-2.5 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 border border-emerald-700/60 active:scale-98 cursor-pointer shadow-lg"
          >
            {isDownloadingRecipeCard ? "⏳ Tayyorlanmoqda..." : "🫖 Retsept Infografikasini yuklab olish (PNG 1080×1920)"}
          </button>

          <button
            onClick={handleDownloadCover}
            disabled={processedLayers.length === 0 || isGeneratingCover}
            className="w-full bg-slate-800/90 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-bold py-2.5 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 border border-slate-700 active:scale-98 cursor-pointer"
          >
            🖼️ Cover yuklab olish (1080×1920)
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
