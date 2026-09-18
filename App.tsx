import React, { useState, useEffect, useRef } from 'react';
import { 
  AppState, 
  VideoData, 
  VoiceType, 
  SubtitleStyle, 
  SubtitlePosition, 
  AspectRatio, 
  BackgroundMusicGenre,
  ReelStyle,
  VisualGenre,
  AIArticle,
  ReelScene,
  SavedProject,
  CustomImageItem,
  CustomAudioItem,
  AIModelEngine,
  ImageModelEngine,
  VisualGenerationStrategy,
  RecipeCardData,
  VideoEngine,
  VeoModelChoice,
  VeoJobState
} from './types';
import { 
  fetchAndExtractArticle, 
  generateJongiyohReelScript, 
  generateScriptFromText,
  generateAudio, 
  generateSceneImagesWithStrategy,
  extractUnsplashPhotoId, 
  markUnsplashIdUsed, 
  generateSingleImage, 
  resolveContextualStockImage, 
  ensureStringArray, 
  transcribeAndSegmentAudio, 
  splitScriptIntoScenes,
  extractRecipeCardFromArticle,
  generateVeoOptimizedScript
} from './services/geminiService';
import {
  checkVeoHealth,
  startVeoJob,
  pollVeoJob,
  mapReelScenesToVeoScenes,
  VeoHealthResponse
} from './services/veoService';
import { 
  TRENDING_HERBS_TOPICS,
  SAMPLE_JONGIYOH_ARTICLES,
  generateSeoSlug
} from './constants';
import VideoPlayer from './components/VideoPlayer';

const STORAGE_KEY = 'jongiyoh_reels_saved_projects_v1';

export const TEXT_TEMPLATES = [
  {
    label: "🌿 Qirqbo'g'in va bo'g'imlar",
    title: "Qirqbo'g'in o'ti: Bo'g'imlar va tog'ay salomatligi",
    text: `Dala qirqbo'g'in o'ti inson bo'g'imlari va suyaklari uchun tabiatning eng kuchli ne'matlaridan biridir.
Uning tarkibidagi tabiiy biologik kremniy moddasi sinovial suyuqlik va tog'ay to'qimasini oziqlantirishga yordam beradi.
Tayyorlash juda oson: 1 choy qoshiq quritilgan giyohni 250 millilitr qaynoq suvda 30 daqiqa damlang. Kuniga yarim stakandan ovqatdan oldin iliq holda ichiladi.
Diqqat, qat'iy ogohlantirish: o'tkir buyrak kasalliklari, buyrak toshi va homiladorlik davrida qabul qilish mutlaqo taqiqlanadi!
Damlama 3 hafta davomida qabul qilinib, so'ngra 10 kun tanaffus qilinishi shart. O'zingizga mos dozani aniqlash uchun Jongiyoh bot orqali hisoblang.`
  },
  {
    label: "🍋 Ertalabki iliq suv",
    title: "Ertalabki limonli suv: Quvvat va organizmni tozalash",
    text: `Har kuni ertalab och qoringa bir stakan iliq limonli suv ichish organizmni uyg'otishning eng oddiy va samarali usulidir.
Limon tarkibidagi C vitamini va organik kislotalar jigar faoliyatini faollashtiradi va ovqat hazm qilish tizimini tozalaydi.
Shuningdek, u moddalar almashinuvini tezlashtirib, kun davomida tetiklik va yengillik bag'ishlaydi.
Biroq oshqozon yarasi yoki yuqori kislotalilik bilan og'rigan insonlar ehtiyot bo'lishlari lozim.
Sog'lom turmush tarzi uchun ushbu videoni saqlab oling va yaqinlaringizga yuboring!`
  },
  {
    label: "🧘 Ibn Sino: 4 Ustun",
    title: "Abu Ali ibn Sino: Sog'lom uzoq umr ko'rish 4 ustuni",
    text: `Buyuk tabib Abu Ali ibn Sino o'zining "Tib qonunlari" asarida inson salomatligi to'rtta asosiy ustunga tayanishini ta'kidlagan.
Birinchi ustun — doimiy jismoniy harakat va badantarbiya, ikkinchisi — toza havo va me'yordagi to'g'ri oziqlanishdir.
Uchinchi ustun — sifatli uyqu va ruhiy xotirjamlik, to'rtinchisi esa organizmni zararli moddalardan tabiiy giyohlar bilan tozalashdir.
Ibn Sino aytganidek: "Harakatda bo'lgan odamga ko'p dori-darmonning keragi yo'q".
Ushbu donishmandlik o'gitlarini yaqinlaringiz bilan ulashing va sahifamizga obuna bo'ling!`
  },
  {
    label: "🍵 Tog'rayhon va uyqu",
    title: "Tog'rayhon choyi: Asablar xotirjamligi va sog'lom uyqu",
    text: `Tog'rayhon o'simligi qadimdan asab tizimini tinchlantirish va uyqu sifatini yaxshilashda tengsiz hisoblanadi.
Kechki payt damlangan bir piyola xushbo'y tog'rayhon choyi kundalik stress va bosh og'rig'ini yengillashtiradi.
Bir choy qoshiq giyohni bir stakan qaynoq suvda 15 daqiqa tindirib, bir qoshiq tabiiy asal bilan ichish tavsiya etiladi.
Homilador ayollarga bachadon tonusini oshirishi sababli tog'rayhon ichish man etiladi.
Salomatlik va tabiiy tabobat sirlari uchun Jongiyoh sahifasini kuzatib boring!`
  }
];

const App: React.FC = () => {
  // Active Tab: 'ai_generator' | 'text_to_video' | 'custom_media'
  const [activeTab, setActiveTab] = useState<'ai_generator' | 'text_to_video' | 'custom_media'>('ai_generator');

  // Main Input State (Jongiyoh Link / Topic Tab)
  const [articleUrl, setArticleUrl] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<AIArticle | null>(null);
  const [isExtractingArticle, setIsExtractingArticle] = useState(false);
  const [channelHandle, setChannelHandle] = useState('@jongiyoh');

  // Text to Video State (Matndan Video Tab)
  const [rawTextInput, setRawTextInput] = useState('');
  const [rawTextTitle, setRawTextTitle] = useState('');
  const [targetSceneCount, setTargetSceneCount] = useState<number>(0);
  
  // Custom Media State (Custom Media Tab)
  const [customImages, setCustomImages] = useState<CustomImageItem[]>([]);
  const [customAudio, setCustomAudio] = useState<CustomAudioItem | null>(null);
  const [customTopic, setCustomTopic] = useState('');
  const [customScriptText, setCustomScriptText] = useState('');
  const [customAudioMode, setCustomAudioMode] = useState<'upload_mp3' | 'gemini_tts'>('upload_mp3');
  const [isProcessingCustom, setIsProcessingCustom] = useState(false);
  const [isTranscribingAudio, setIsTranscribingAudio] = useState(false);
  const [transcribeSuccessNotice, setTranscribeSuccessNotice] = useState(false);

  // Customization controls
  const [reelStyle, setReelStyle] = useState<ReelStyle>(ReelStyle.AUTO);
  const [visualGenre, setVisualGenre] = useState<VisualGenre>(VisualGenre.AUTO);
  const [voice, setVoice] = useState<VoiceType>(VoiceType.PROFESSIONAL);
  const [musicGenre, setMusicGenre] = useState<BackgroundMusicGenre>(BackgroundMusicGenre.MEDITATION_CHILL);
  const [musicVolume, setMusicVolume] = useState<number>(10);
  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyle>(SubtitleStyle.HORMOZI_EMERALD);
  const [subtitlePosition, setSubtitlePosition] = useState<SubtitlePosition>(SubtitlePosition.BOTTOM);
  const [karaokeMode, setKaraokeMode] = useState<boolean>(true);
  const [karaokeChunkSize, setKaraokeChunkSize] = useState<'dynamic' | 'standard'>('dynamic');
  const [showEmojiAccents, setShowEmojiAccents] = useState<boolean>(true);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.PORTRAIT);
  const [audioSpeed, setAudioSpeed] = useState<number>(1.0);
  const [modelEngine, setModelEngine] = useState<AIModelEngine>(AIModelEngine.GEMINI_3_8_FLASH);
  const [imageModel, setImageModel] = useState<ImageModelEngine>(ImageModelEngine.FLASH_LITE_IMAGE);
  const [visualStrategy, setVisualStrategy] = useState<VisualGenerationStrategy>(VisualGenerationStrategy.HYBRID);

  // 🎬 Dual Video Engine & Veo Studio State
  const [videoEngine, setVideoEngine] = useState<VideoEngine>(VideoEngine.CANVAS_2D);
  const [veoModel, setVeoModel] = useState<VeoModelChoice>('omni');
  const [veoHealth, setVeoHealth] = useState<VeoHealthResponse | null>(null);
  const [veoJobState, setVeoJobState] = useState<VeoJobState | null>(null);
  const [isGeneratingVeo, setIsGeneratingVeo] = useState<boolean>(false);
  const [veoAbortController, setVeoAbortController] = useState<AbortController | null>(null);
  const [showVeoModal, setShowVeoModal] = useState<boolean>(false);

  // 🫖 Final Recipe Infographic Card State
  const [showRecipeCard, setShowRecipeCard] = useState<boolean>(true);
  const [recipeCardTiming, setRecipeCardTiming] = useState<'both' | 'recipe_scene' | 'video_end'>('both');
  const [isRecipeCardExpanded, setIsRecipeCardExpanded] = useState<boolean>(false);
  const [recipeCardData, setRecipeCardData] = useState<RecipeCardData>({
    title: "Dalachoy Damlamasi",
    dosage: "1 osh qoshiq (5-10 gr)",
    water: "200-250 ml qaynoq suv (95°C)",
    steepTime: "15-20 daqiqa (ustini yopib)",
    frequency: "Kuniga 2 mahal, ovqatdan 30 daq. oldin",
    duration: "21 kun qabul + 7 kun tanaffus",
    warning: "Homiladorlik va buyrak toshida taqiqlanadi!",
    callToAction: "📌 Retseptni yo'qotmaslik uchun SAQLAB OLING! 💾"
  });

  // UI state
  const [showFactLockModal, setShowFactLockModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editingScript, setEditingScript] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [seoFilename, setSeoFilename] = useState('');
  const [copiedFilename, setCopiedFilename] = useState(false);
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [copiedTags, setCopiedTags] = useState(false);
  const [regeneratingSceneIndex, setRegeneratingSceneIndex] = useState<number | null>(null);

  // Hidden file inputs
  const replaceSceneFileInputRef = useRef<HTMLInputElement>(null);
  const [replaceTargetSceneIndex, setReplaceTargetSceneIndex] = useState<number | null>(null);
  const replaceAudioFileInputRef = useRef<HTMLInputElement>(null);
  const customImagesFileInputRef = useRef<HTMLInputElement>(null);
  const customAudioFileInputRef = useRef<HTMLInputElement>(null);

  // Saved Projects
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);

  // Generation pipeline state
  const [state, setState] = useState<AppState>({
    isLoading: false,
    loadingStep: '',
    error: null,
    videoData: null,
  });

  // Load history from localStorage and register used Unsplash images
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSavedProjects(parsed);
        if (Array.isArray(parsed)) {
          parsed.forEach((p: SavedProject) => {
            p.videoData?.images?.forEach(img => {
              const pid = extractUnsplashPhotoId(img);
              if (pid) markUnsplashIdUsed(pid);
            });
          });
        }
      }
    } catch (e) {
      console.warn("Failed to load saved projects", e);
    }
  }, []);

  // Check Veo Backend Health on Mount
  useEffect(() => {
    checkVeoHealth()
      .then(res => {
        setVeoHealth(res);
      })
      .catch(() => {
        setVeoHealth(null);
      });
  }, []);

  // Sync recipe card data whenever videoData changes
  useEffect(() => {
    if (state.videoData?.recipeCard) {
      setRecipeCardData(state.videoData.recipeCard);
    } else if (state.videoData?.aiArticle) {
      setRecipeCardData(extractRecipeCardFromArticle(state.videoData.aiArticle));
    } else if (state.videoData?.topic) {
      const clean = state.videoData.topic.replace(/damlamasi|choyi|siri|foydalari|haqida|retsepti/gi, '').trim();
      setRecipeCardData(prev => ({
        ...prev,
        title: `${clean || 'Dorivor Giyoh'} Damlamasi`
      }));
    }
  }, [state.videoData]);

  const handleUpdateRecipeField = (field: keyof RecipeCardData, val: string) => {
    setRecipeCardData(prev => {
      const next = { ...prev, [field]: val };
      if (state.videoData) {
        setState(s => s.videoData ? ({
          ...s,
          videoData: { ...s.videoData, recipeCard: next }
        }) : s);
      }
      return next;
    });
  };

  const saveProjectToHistory = (newVideoData: VideoData) => {
    try {
      newVideoData.images?.forEach(img => {
        const pid = extractUnsplashPhotoId(img);
        if (pid) markUnsplashIdUsed(pid);
      });

      const project: SavedProject = {
        id: Date.now().toString(),
        topic: newVideoData.topic,
        articleUrl: newVideoData.articleUrl || selectedArticle?.url || '',
        timestamp: Date.now(),
        videoData: newVideoData,
        caption: newVideoData.instagramCaption || newVideoData.caption,
        coverHeadline: newVideoData.coverHeadline
      };
      const updated = [project, ...savedProjects.filter(p => p.topic.toLowerCase() !== newVideoData.topic.toLowerCase())].slice(0, 15);
      setSavedProjects(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn("Failed to save to history", e);
    }
  };

  const deleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedProjects.filter(p => p.id !== id);
    setSavedProjects(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {}
  };

  const loadProject = (proj: SavedProject) => {
    if (proj.videoData.businessArticle) {
      setSelectedArticle(proj.videoData.businessArticle);
      setArticleUrl(proj.videoData.businessArticle.url);
    } else if (proj.articleUrl) {
      setArticleUrl(proj.articleUrl);
    }
    setState({
      isLoading: false,
      loadingStep: '',
      error: null,
      videoData: proj.videoData
    });
    setShowHistory(false);
  };

  // Handle URL / Topic Extraction
  const handleExtractUrl = async (urlToFetch?: string) => {
    const targetUrl = urlToFetch || articleUrl;
    if (!targetUrl.trim()) return;

    setIsExtractingArticle(true);
    setState(prev => ({ ...prev, error: null }));
    
    try {
      const article = await fetchAndExtractArticle(targetUrl);
      setSelectedArticle(article);
      setArticleUrl(article.url);
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        error: err?.message || "Giyoh yoki maqolani tahlil qilishda xatolik yuz berdi."
      }));
    } finally {
      setIsExtractingArticle(false);
    }
  };

  // MAIN GENERATION PIPELINE (Jongiyoh Tab)
  const handleGenerateReel = async (explicitTarget?: string) => {
    const rawTarget = (typeof explicitTarget === 'string' ? explicitTarget : articleUrl).trim();
    let currentArticle = selectedArticle;

    const needsFetch = (!currentArticle && Boolean(rawTarget)) || 
      (Boolean(rawTarget) && currentArticle && currentArticle.url !== rawTarget && !currentArticle.url.includes(rawTarget));

    if (!currentArticle && !rawTarget) {
      setState(prev => ({ ...prev, error: "Iltimos, Jongiyoh.uz maqolasi havolasini (URL) kiriting yoki dorivor giyoh mavzusini yozing!" }));
      return;
    }

    setState({
      isLoading: true,
      loadingStep: "1/5: Jongiyoh.uz fito-bazasi va tibbiy YMYL faktlar tahlil qilinmoqda...",
      error: null,
      videoData: null
    });

    try {
      if (needsFetch) {
        setState(prev => ({
          ...prev,
          loadingStep: "1/5: Havola ochilib, giyohning shifobaxsh xususiyatlari va qarshi ko'rsatmalari o'rganilmoqda..."
        }));
        currentArticle = await fetchAndExtractArticle(rawTarget);
        setSelectedArticle(currentArticle);
        setArticleUrl(currentArticle.url);
      }

      if (!currentArticle) {
        throw new Error("Maqola ma'lumotlarini aniqlab bo'lmadi. Iltimos, havolani tekshirib qayta kiriting.");
      }

      // Step 2: Script & Scenes Generation
      setState(prev => ({
        ...prev,
        loadingStep: `2/5: 6-8 ta professional fito-kadrli ssenariy yozilmoqda (${modelEngine})...`
      }));
      
      const scriptResult = await generateJongiyohReelScript(currentArticle, reelStyle, visualGenre, modelEngine);

      // Step 3: High quality Gemini Voice Narration (TTS)
      setState(prev => ({
        ...prev,
        loadingStep: "3/5: Samimiy va ishonchli O'zbekcha nutq yozilmoqda (gemini-3.1-flash-tts-preview)..."
      }));

      const audioBase64 = await generateAudio(scriptResult.fullScript, voice);

      // Step 4: Scene Visuals Generation
      setState(prev => ({
        ...prev,
        loadingStep: `4/5: Tabiiy dorivor giyohlar va damlama tasvirlari tayyorlanmoqda (${visualStrategy === VisualGenerationStrategy.HYBRID ? 'Gibrid: 4 AI + 3 Unsplash botanik foto' : visualStrategy === VisualGenerationStrategy.ALL_AI ? '100% AI generatsiya' : 'Unsplash haqiqiy fotosuratlari'})...`
      }));

      const { images: generatedImages, updatedScenes } = await generateSceneImagesWithStrategy(
        scriptResult.scenes,
        aspectRatio,
        visualStrategy,
        currentArticle.title || currentArticle.summary || '',
        (completed, total, mode) => {
          setState(prev => ({
            ...prev,
            loadingStep: `4/5: Tasvirlar tayyorlanmoqda (${completed} / ${total}) — ${mode === 'ai' ? '🌿 AI chizmoqda' : '📸 Botanik foto yuklanmoqda'}...`
          }));
        },
        imageModel
      );

      // Step 5: Audio & Subtitle Sync
      setState(prev => ({
        ...prev,
        loadingStep: "5/5: Video, karaoke subtitrlar va sokin orqa fon musiqasi sinxronlanmoqda..."
      }));

      const newVideoData: VideoData = {
        topic: currentArticle.title,
        articleTitle: currentArticle.title,
        articleUrl: currentArticle.url,
        hook: scriptResult.hook,
        fullScript: scriptResult.fullScript,
        script: scriptResult.scriptSegments,
        scriptSegments: scriptResult.scriptSegments,
        scenes: updatedScenes,
        images: generatedImages,
        imagePrompts: scriptResult.imagePrompts,
        audioBase64,
        caption: scriptResult.caption,
        instagramCaption: scriptResult.caption,
        hashtags: scriptResult.hashtags,
        coverHeadline: scriptResult.coverHeadline,
        coverSubtitle: scriptResult.coverSubtitle,
        lockedFacts: currentArticle.lockedFacts,
        businessArticle: currentArticle,
        reelStyle,
        visualGenre
      };

      setState({
        isLoading: false,
        loadingStep: '',
        error: null,
        videoData: newVideoData
      });

      saveProjectToHistory(newVideoData);

    } catch (err: any) {
      console.error("Reel generation failed", err);
      setState({
        isLoading: false,
        loadingStep: '',
        error: err?.message || "Video yaratishda xatolik yuz berdi. Iltimos qayta urinib ko'ring.",
        videoData: null
      });
    }
  };

  // MAIN GENERATION PIPELINE (Text-to-Video Tab)
  const handleGenerateFromText = async () => {
    const trimmed = rawTextInput.trim();
    if (!trimmed) {
      setState(prev => ({ 
        ...prev, 
        error: "Iltimos, video yaratish uchun matn maydoniga biror matn yozing yoki yuqoridagi tayyor namunalardan birini tanlang!" 
      }));
      return;
    }

    setState({
      isLoading: true,
      loadingStep: "1/4: Matn tahlil qilinib, 9:16 vertikal kadrlar ssenariysi tuzilmoqda...",
      error: null,
      videoData: null
    });

    try {
      // Step 1: Script & Scene generation from user text
      const scriptResult = await generateScriptFromText(trimmed, {
        title: rawTextTitle.trim() || undefined,
        style: reelStyle,
        genre: visualGenre,
        modelEngine,
        targetSceneCount
      });

      // Step 2: Gemini TTS Audio
      setState(prev => ({
        ...prev,
        loadingStep: "2/4: O'zbekcha professional diktor nutqi yozilmoqda (Gemini 3.1 Flash TTS)..."
      }));
      const audioBase64 = await generateAudio(scriptResult.fullScript, voice);

      // Step 3: Visual Generation (AI or Real Photos)
      setState(prev => ({
        ...prev,
        loadingStep: `3/4: Kadrlarga mos tasvirlar tayyorlanmoqda (${visualStrategy === VisualGenerationStrategy.HYBRID ? 'Gibrid: 4 AI + 3 Unsplash' : visualStrategy === VisualGenerationStrategy.ALL_AI ? '100% AI' : 'Unsplash fotosuratlari'})...`
      }));

      const { images: generatedImages, updatedScenes } = await generateSceneImagesWithStrategy(
        scriptResult.scenes,
        aspectRatio,
        visualStrategy,
        scriptResult.articleTitle || rawTextTitle || 'dorivor giyohlar',
        (completed, total, mode) => {
          setState(prev => ({
            ...prev,
            loadingStep: `3/4: Tasvirlar tayyorlanmoqda (${completed} / ${total}) — ${mode === 'ai' ? '🌿 AI chizmoqda' : '📸 Botanik foto yuklanmoqda'}...`
          }));
        },
        imageModel
      );

      // Step 4: Sync
      setState(prev => ({
        ...prev,
        loadingStep: "4/4: Subtitrlar va sokin fon musiqasi sinxronlanmoqda..."
      }));

      const newVideoData: VideoData = {
        topic: scriptResult.articleTitle,
        articleTitle: scriptResult.articleTitle,
        hook: scriptResult.hook,
        fullScript: scriptResult.fullScript,
        script: scriptResult.scriptSegments,
        scriptSegments: scriptResult.scriptSegments,
        scenes: updatedScenes,
        images: generatedImages,
        imagePrompts: scriptResult.imagePrompts,
        audioBase64,
        caption: scriptResult.caption,
        instagramCaption: scriptResult.caption,
        hashtags: scriptResult.hashtags,
        coverHeadline: scriptResult.coverHeadline,
        coverSubtitle: scriptResult.coverSubtitle,
        reelStyle,
        visualGenre,
        recipeCard: scriptResult.recipeCard
      };

      setState({
        isLoading: false,
        loadingStep: '',
        error: null,
        videoData: newVideoData
      });

      saveProjectToHistory(newVideoData);

    } catch (err: any) {
      console.error("Text-to-Video generation failed:", err);
      setState({
        isLoading: false,
        loadingStep: '',
        error: err?.message || "Matndan video yaratishda xatolik yuz berdi. Iltimos qayta urinib ko'ring.",
        videoData: null
      });
    }
  };

  // MAIN GENERATION PIPELINE (Google Veo 3.1 & Omni Video Engine)
  const handleGenerateVeoVideo = async (targetTopic?: string, targetText?: string) => {
    // 1. Check Veo server health
    const health = await checkVeoHealth();
    if (!health || health.status !== 'ok') {
      alert("⚠️ Google Veo serveri (localhost:3001) bilan aloqa o'rnatilmadi!\n\nIltimos, terminalda:\ncd c:\\Users\\pc\\Desktop\\loyihalarim\\veo-video-generator\nnpm run server\nbuyrug'ini ishga tushiring.");
      return;
    }

    const topic = (targetTopic || selectedArticle?.title || rawTextTitle || articleUrl || "Dorivor Giyohlar").trim();
    const content = targetText || rawTextInput || selectedArticle?.content || selectedArticle?.summary || articleUrl;

    if (!topic && !content) {
      alert("Iltimos, dorivor giyoh mavzusini yoki matnini kiriting!");
      return;
    }

    const controller = new AbortController();
    setVeoAbortController(controller);
    setIsGeneratingVeo(true);
    setShowVeoModal(true);
    setState(prev => ({
      ...prev,
      isLoading: true,
      loadingStep: "1/4: Veo 3.1 & Omni uchun 11-14 so'zli fito-ssenariy tuzilmoqda...",
      error: null
    }));

    try {
      // Step 1: Generate Veo Script strictly calibrated to 11-14 words & cinematic prompt without hallucinations
      const scriptResult = await generateVeoOptimizedScript(content || topic, {
        title: topic,
        targetClips: 5,
        modelEngine
      });

      // Step 2: Map to VeoScenes
      const veoScenes = mapReelScenesToVeoScenes(scriptResult.scenes, topic);

      setState(prev => ({
        ...prev,
        loadingStep: `2/4: Google Veo render navbatiga qo'yilmoqda (${veoModel === 'omni' ? 'Gemini Omni' : 'Veo 3.1 Fast'})...`
      }));

      // Step 3: Start Veo job
      const startRes = await startVeoJob({
        aspectRatio,
        style: "Cinematic",
        customScenes: veoScenes,
        veoModel
      });

      if (!startRes.jobId) {
        throw new Error("Veo backendidan jobId qabul qilinmadi");
      }

      // Step 4: Poll job progress
      const finalJob = await pollVeoJob(
        startRes.jobId,
        {
          onProgress: (job) => {
            setVeoJobState(job);
            setState(prev => ({
              ...prev,
              loadingStep: `3/4: Veo AI: ${job.progress ?? 50}% — ${job.message || 'Kadrlar render qilinmoqda...'}`
            }));
          },
          abortSignal: controller.signal,
          pollIntervalMs: 3000
        }
      );

      if (finalJob.status === 'failed') {
        throw new Error(finalJob.error || "Veo generatsiya jarayonida xatolik yuz berdi");
      }

      const finalVideoUrl = finalJob.fullVideoUrl || finalJob.videoUrl || '';

      const newVideoData: VideoData = {
        topic,
        articleTitle: topic,
        articleUrl: selectedArticle?.url || articleUrl,
        hook: scriptResult.hook,
        fullScript: scriptResult.fullScript,
        script: scriptResult.scriptSegments,
        scriptSegments: scriptResult.scriptSegments,
        scenes: scriptResult.scenes,
        images: finalJob.clips || [],
        imagePrompts: scriptResult.imagePrompts,
        audioBase64: '',
        caption: scriptResult.caption,
        instagramCaption: scriptResult.caption,
        hashtags: scriptResult.hashtags,
        coverHeadline: scriptResult.coverHeadline,
        coverSubtitle: (scriptResult as any).coverSubtitle || "JONGIYOH.UZ",
        lockedFacts: selectedArticle?.lockedFacts,
        businessArticle: selectedArticle || undefined,
        reelStyle,
        visualGenre,
        videoEngine: VideoEngine.VEO_AI,
        veoVideoUrl: finalVideoUrl,
        veoJobId: finalJob.jobId,
        veoModel
      };

      setState({
        isLoading: false,
        loadingStep: '',
        error: null,
        videoData: newVideoData
      });

      saveProjectToHistory(newVideoData);
      setIsGeneratingVeo(false);
      setShowVeoModal(false);
      setVeoJobState(null);
      setVeoAbortController(null);

    } catch (err: any) {
      console.error("Veo generation error:", err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        loadingStep: '',
        error: "Google Veo generatsiya xatosi: " + (err?.message || "Noma'lum xatolik")
      }));
      setIsGeneratingVeo(false);
      setShowVeoModal(false);
      setVeoJobState(null);
      setVeoAbortController(null);
    }
  };

  const handleCancelVeoGeneration = () => {
    if (veoAbortController) {
      veoAbortController.abort();
      setVeoAbortController(null);
    }
    setIsGeneratingVeo(false);
    setShowVeoModal(false);
    setVeoJobState(null);
    setState(prev => ({
      ...prev,
      isLoading: false,
      loadingStep: '',
      error: "Veo generatsiyasi to'xtatildi."
    }));
  };

  // CUSTOM MEDIA UPLOAD & SPEECH-TO-TEXT LOGIC
  const handleProcessImageFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const availableSlots = 10 - customImages.length;
    if (availableSlots <= 0) {
      alert("Siz maksimum 10 tagacha rasm yuklashingiz mumkin.");
      return;
    }

    const filesToRead = fileArray.slice(0, availableSlots);
    filesToRead.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        if (url) {
          setCustomImages(prev => {
            if (prev.length >= 10) return prev;
            const newItem: CustomImageItem = {
              id: Date.now() + Math.random().toString(36).substring(2, 7),
              url,
              name: file.name,
              subtitle: ''
            };
            return [...prev, newItem];
          });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleProcessAudioFile = (file: File) => {
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|m4a|aac|ogg)$/i)) {
      alert("Iltimos, audio fayl tanlang (.mp3, .wav, .m4a, .aac, .ogg)!");
      return;
    }

    const sizeFormatted = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        const tempAudio = new Audio(dataUrl);
        tempAudio.onloadedmetadata = () => {
          setCustomAudio({
            name: file.name,
            base64: dataUrl,
            duration: tempAudio.duration,
            sizeFormatted
          });
        };
        setTimeout(() => {
          setCustomAudio(prev => prev ? prev : {
            name: file.name,
            base64: dataUrl,
            duration: 30,
            sizeFormatted
          });
        }, 1000);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleTranscribeUploadedAudio = async () => {
    if (!customAudio?.base64) {
      alert("Iltimos, avval MP3 audio faylingizni yuklang!");
      return;
    }

    setIsTranscribingAudio(true);
    try {
      const targetCount = customImages.length > 0 ? customImages.length : 6;
      const res = await transcribeAndSegmentAudio(customAudio.base64, targetCount);
      
      setCustomScriptText(res.fullTranscript);
      if (!customTopic && res.topic) {
        setCustomTopic(res.topic);
      }

      if (customImages.length > 0 && res.subtitles.length > 0) {
        setCustomImages(prev => prev.map((img, idx) => ({
          ...img,
          subtitle: res.subtitles[idx] || res.subtitles[idx % res.subtitles.length] || img.subtitle
        })));
      }

      setTranscribeSuccessNotice(true);
      setTimeout(() => setTranscribeSuccessNotice(false), 4000);
    } catch (err: any) {
      alert("Ovozni tahlil qilishda xatolik: " + (err?.message || "Iltimos, qayta urinib ko'ring"));
    } finally {
      setIsTranscribingAudio(false);
    }
  };

  const handleRemoveCustomImage = (index: number) => {
    setCustomImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleMoveCustomImage = (index: number, direction: 'left' | 'right') => {
    if (direction === 'left' && index === 0) return;
    if (direction === 'right' && index === customImages.length - 1) return;
    
    setCustomImages(prev => {
      const copy = [...prev];
      const targetIndex = direction === 'left' ? index - 1 : index + 1;
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const handleUpdateImageSubtitle = (index: number, newSubtitle: string) => {
    setCustomImages(prev => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = { ...copy[index], subtitle: newSubtitle };
      }
      return copy;
    });
  };

  const handleGenerateFromCustomMedia = async () => {
    if (customImages.length === 0) {
      setState(prev => ({ ...prev, error: "Kamida 1 ta rasm yuklang (maksimum 10 ta)!" }));
      return;
    }

    setIsProcessingCustom(true);
    setState(prev => ({
      ...prev,
      isLoading: true,
      loadingStep: "Yuklangan fotosuratlar va fito-nutq tahlil qilinmoqda...",
      error: null,
      videoData: null
    }));

    try {
      let finalAudioBase64 = customAudio?.base64 || '';
      let totalAudioDuration = customAudio?.duration || (customImages.length * 4.5);
      let scriptLines: string[] = [];

      if (finalAudioBase64 && !customScriptText.trim()) {
        const hasIndividualSubtitles = customImages.some(img => img.subtitle && img.subtitle.trim().length > 0);
        if (!hasIndividualSubtitles) {
          setState(prev => ({ ...prev, loadingStep: "AI Ovozni tinglamoqda va o'zbekcha subtitrlar yaratilmoqda..." }));
          try {
            const transResult = await transcribeAndSegmentAudio(finalAudioBase64, customImages.length);
            if (transResult.fullTranscript) {
              setCustomScriptText(transResult.fullTranscript);
              scriptLines = transResult.subtitles;
              if (!customTopic && transResult.topic) {
                setCustomTopic(transResult.topic);
              }
            }
          } catch (e) {
            console.warn("Auto transcribe fallback", e);
          }
        }
      }

      if (customScriptText.trim() && scriptLines.length === 0) {
        scriptLines = splitScriptIntoScenes(customScriptText, customImages.length);
      }

      if (scriptLines.length === 0) {
        scriptLines = customImages.map(img => img.subtitle?.trim() || '');
      }

      const fallbackTopic = customTopic.trim() || "Dorivor Giyohlar va Shifo Sirlari";
      if (scriptLines.every(s => !s || s.startsWith('Kadr '))) {
        scriptLines = [
          `${fallbackTopic} haqida bilishingiz kerak bo'lgan eng muhim sirlar.`,
          "Giyoh tarkibidagi faol moddalar organizmni tabiiy tozalaydi.",
          "To'g'ri damlash va kunlik me'yorni saqlash juda muhimdir.",
          "Diqqat: buyrak toshi va homiladorlikda qat'iyan man etiladi.",
          "Shaxsiy dozani hisoblash uchun Jongiyoh botga kiring.",
          "Tabiiy salomatlik uchun sahifamizga obuna bo'ling!"
        ].slice(0, customImages.length);
      }

      if (customAudioMode === 'gemini_tts' || !finalAudioBase64) {
        const textToSpeak = customScriptText.trim() || scriptLines.join(' ') || fallbackTopic;
        setState(prev => ({ ...prev, loadingStep: "AI Ovoz generatsiya qilinmoqda (Gemini TTS)..." }));
        finalAudioBase64 = await generateAudio(textToSpeak, voice);
        totalAudioDuration = Math.max(customImages.length * 3.5, 15);
      }

      const sceneDuration = totalAudioDuration / customImages.length;
      const motions: ('push-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'parallax')[] = [
        'push-in', 'zoom-out', 'pan-left', 'push-in', 'pan-right', 'parallax', 'push-in', 'zoom-out', 'pan-left', 'pan-right'
      ];

      const scenes: ReelScene[] = customImages.map((img, idx) => {
        const startTime = idx * sceneDuration;
        const endTime = (idx + 1) * sceneDuration;
        const line = img.subtitle?.trim() || scriptLines[idx] || scriptLines[idx % scriptLines.length] || fallbackTopic;
        const isWarning = /qarshi|mumkin emas|taqiq|ehtiyot/i.test(line);

        return {
          id: `custom-scene-${idx + 1}`,
          type: isWarning ? 'warning' : (idx === 0 ? 'hook' : idx === customImages.length - 1 ? 'cta' : 'benefit'),
          narration: line,
          subtitleText: line,
          visualPrompt: img.name || `Kadr ${idx + 1}`,
          imageUrl: img.url,
          customImage: img.url,
          startTime,
          endTime,
          duration: sceneDuration,
          headline: img.headline || (isWarning ? "⚠️ QARSHI KO'RSATMALAR" : idx === 0 ? (customTopic || "JONGIYOH") : undefined),
          statText: img.statText,
          visualMotion: motions[idx % motions.length]
        };
      });

      const videoTopic = customTopic.trim() || customImages[0]?.name?.replace(/\.[^/.]+$/, "") || "Jongiyoh Fito Reel";
      const fullScript = scriptLines.join(' ');

      const newVideoData: VideoData = {
        topic: videoTopic,
        articleTitle: videoTopic,
        hook: scenes[0]?.narration || videoTopic,
        fullScript,
        script: scriptLines,
        scriptSegments: scriptLines,
        scenes,
        images: customImages.map(img => img.url),
        imagePrompts: customImages.map(img => img.name),
        audioBase64: finalAudioBase64,
        caption: `🌿 ${videoTopic}\n\n${fullScript}\n\n💬 Shaxsiy xavfsiz doza: @jongiyoh_bot\n🌐 Rasmiy sayt: jongiyoh.uz`,
        instagramCaption: `🌿 ${videoTopic}\n\n${fullScript}\n\n💬 Shaxsiy xavfsiz doza: @jongiyoh_bot\n🌐 Rasmiy sayt: jongiyoh.uz`,
        hashtags: ['#jongiyoh', '#fitoterapiya', '#tabiiydavo', '#salomatlik', '#reels', '#uzbekistan'],
        coverHeadline: videoTopic,
        coverSubtitle: "JONGIYOH.UZ",
        reelStyle,
        visualGenre
      };

      setState({
        isLoading: false,
        loadingStep: '',
        error: null,
        videoData: newVideoData
      });

      saveProjectToHistory(newVideoData);

    } catch (err: any) {
      console.error("Custom video processing failed:", err);
      setState({
        isLoading: false,
        loadingStep: '',
        error: err?.message || "Shaxsiy medialardan video yaratishda xatolik yuz berdi.",
        videoData: null
      });
    } finally {
      setIsProcessingCustom(false);
    }
  };

  const handleReplaceSceneImage = (sceneIndex: number, file: File) => {
    if (!state.videoData || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const newImgUrl = e.target?.result as string;
      if (newImgUrl && state.videoData) {
        const updatedImages = [...state.videoData.images];
        updatedImages[sceneIndex] = newImgUrl;

        const updatedScenes = state.videoData.scenes ? [...state.videoData.scenes] : [];
        if (updatedScenes[sceneIndex]) {
          updatedScenes[sceneIndex] = {
            ...updatedScenes[sceneIndex],
            imageUrl: newImgUrl,
            customImage: newImgUrl,
            imageSource: 'custom'
          };
        }

        const updatedVideoData: VideoData = {
          ...state.videoData,
          images: updatedImages,
          scenes: updatedScenes
        };

        setState(prev => ({ ...prev, videoData: updatedVideoData }));
        saveProjectToHistory(updatedVideoData);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleReplaceProjectAudio = (file: File) => {
    if (!state.videoData || (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|m4a|aac|ogg)$/i))) {
      alert("Iltimos, audio fayl tanlang (.mp3, .wav, .m4a, .aac, .ogg)!");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const newAudioUrl = e.target?.result as string;
      if (newAudioUrl && state.videoData) {
        const updatedVideoData: VideoData = {
          ...state.videoData,
          audioBase64: newAudioUrl
        };
        setState(prev => ({ ...prev, videoData: updatedVideoData }));
        saveProjectToHistory(updatedVideoData);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRegenerateSceneImage = async (sceneIndex: number) => {
    if (!state.videoData) return;
    setRegeneratingSceneIndex(sceneIndex);

    try {
      const targetScene = state.videoData.scenes?.[sceneIndex];
      const promptToUse = targetScene?.visualPrompt || `${state.videoData.topic}: ${targetScene?.narration || ''}, authentic botanical macro photography, healing medicinal herbs, soft warm natural daylight, 35mm camera, strictly NO neon, NO sci-fi glow`;
      
      const newImg = await generateSingleImage(promptToUse, aspectRatio, imageModel);

      const updatedImages = [...state.videoData.images];
      updatedImages[sceneIndex] = newImg;

      const updatedScenes = state.videoData.scenes ? [...state.videoData.scenes] : [];
      if (updatedScenes[sceneIndex]) {
        updatedScenes[sceneIndex] = {
          ...updatedScenes[sceneIndex],
          imageUrl: newImg,
          imageSource: 'ai'
        };
      }

      const updatedVideoData: VideoData = {
        ...state.videoData,
        images: updatedImages,
        scenes: updatedScenes
      };

      setState(prev => ({ ...prev, videoData: updatedVideoData }));
      saveProjectToHistory(updatedVideoData);
    } catch (e: any) {
      alert("Rasmni qayta generatsiya qilishda xatolik: " + e?.message);
    } finally {
      setRegeneratingSceneIndex(null);
    }
  };

  const handlePickAlternativeStockPhoto = (sceneIndex: number) => {
    if (!state.videoData) return;
    const scene = state.videoData.scenes?.[sceneIndex];
    const usedIds = new Set<string>();
    
    state.videoData.images.forEach(img => {
      const pid = extractUnsplashPhotoId(img);
      if (pid) usedIds.add(pid);
    });

    const newStock = resolveContextualStockImage(
      scene?.headline || scene?.visualPrompt || state.videoData.topic,
      state.videoData.topic,
      sceneIndex + 99,
      usedIds
    );

    const pid = extractUnsplashPhotoId(newStock);
    if (pid) markUnsplashIdUsed(pid);

    const updatedImages = [...state.videoData.images];
    updatedImages[sceneIndex] = newStock;

    const updatedScenes = state.videoData.scenes ? [...state.videoData.scenes] : [];
    if (updatedScenes[sceneIndex]) {
      updatedScenes[sceneIndex] = {
        ...updatedScenes[sceneIndex],
        imageUrl: newStock,
        imageSource: 'unsplash'
      };
    }

    const updatedVideoData: VideoData = {
      ...state.videoData,
      images: updatedImages,
      scenes: updatedScenes
    };

    setState(prev => ({ ...prev, videoData: updatedVideoData }));
    saveProjectToHistory(updatedVideoData);
  };

  const handleUpdateActiveSceneSubtitle = (sceneIndex: number, newSubtitle: string) => {
    if (!state.videoData) return;
    const updatedScenes = state.videoData.scenes ? [...state.videoData.scenes] : [];
    if (updatedScenes[sceneIndex]) {
      updatedScenes[sceneIndex] = {
        ...updatedScenes[sceneIndex],
        narration: newSubtitle,
        subtitleText: newSubtitle
      };
    }

    const updatedVideoData: VideoData = {
      ...state.videoData,
      scenes: updatedScenes,
      fullScript: updatedScenes.map(s => s.narration).join('\n\n')
    };

    setState(prev => ({ ...prev, videoData: updatedVideoData }));
    saveProjectToHistory(updatedVideoData);
  };

  const handleUpdateActiveScenePrompt = (sceneIndex: number, newPrompt: string) => {
    if (!state.videoData) return;
    const updatedScenes = state.videoData.scenes ? [...state.videoData.scenes] : [];
    if (updatedScenes[sceneIndex]) {
      updatedScenes[sceneIndex] = {
        ...updatedScenes[sceneIndex],
        visualPrompt: newPrompt
      };
    }

    const updatedVideoData: VideoData = {
      ...state.videoData,
      scenes: updatedScenes
    };

    setState(prev => ({ ...prev, videoData: updatedVideoData }));
    saveProjectToHistory(updatedVideoData);
  };

  const handleSaveEditedScript = async (newScript: string, regenerateVoice: boolean) => {
    if (!state.videoData) return;
    setEditingScript(false);

    const sentences = newScript
      .split(/\r?\n+|(?<=[.?!])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (regenerateVoice) {
      setState(prev => ({
        ...prev,
        isLoading: true,
        loadingStep: "Yangi matn bo'yicha AI Ovoz qayta yozilmoqda..."
      }));

      try {
        const newAudio = await generateAudio(newScript, voice);

        const updatedScenes = state.videoData.scenes?.map((s, i) => ({
          ...s,
          narration: sentences[i] || s.narration,
          subtitleText: sentences[i] || s.subtitleText
        })) || [];

        const updatedVideoData: VideoData = {
          ...state.videoData,
          fullScript: newScript,
          script: sentences,
          scriptSegments: sentences,
          scenes: updatedScenes,
          audioBase64: newAudio
        };

        setState({
          isLoading: false,
          loadingStep: '',
          error: null,
          videoData: updatedVideoData
        });
        saveProjectToHistory(updatedVideoData);
      } catch (e: any) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: "Yangi ovozni generatsiya qilishda xatolik: " + e?.message
        }));
      }
    } else {
      const updatedScenes = state.videoData.scenes?.map((s, i) => ({
        ...s,
        narration: sentences[i] || s.narration,
        subtitleText: sentences[i] || s.subtitleText
      })) || [];

      const updatedVideoData: VideoData = {
        ...state.videoData,
        fullScript: newScript,
        script: sentences,
        scriptSegments: sentences,
        scenes: updatedScenes
      };

      setState(prev => ({ ...prev, videoData: updatedVideoData }));
      saveProjectToHistory(updatedVideoData);
    }
  };

  useEffect(() => {
    if (state.videoData?.topic) {
      setSeoFilename(generateSeoSlug(state.videoData.topic));
    }
  }, [state.videoData?.topic]);

  const handleCopyCaption = () => {
    if (!state.videoData) return;
    const text = `${state.videoData.instagramCaption || state.videoData.caption || ''}\n\n${ensureStringArray(state.videoData.hashtags).join(' ')}`;
    navigator.clipboard.writeText(text);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  const handleCopyFilename = () => {
    if (!seoFilename) return;
    const clean = seoFilename.trim();
    const finalName = clean.endsWith('.mp4') ? clean : `${clean}.mp4`;
    navigator.clipboard.writeText(finalName);
    setCopiedFilename(true);
    setTimeout(() => setCopiedFilename(false), 2000);
  };

  const handleCopyTitle = () => {
    const title = state.videoData?.coverHeadline || state.videoData?.topic || '';
    if (!title) return;
    navigator.clipboard.writeText(title);
    setCopiedTitle(true);
    setTimeout(() => setCopiedTitle(false), 2000);
  };

  const handleCopyTags = () => {
    if (!state.videoData?.hashtags) return;
    const tags = ensureStringArray(state.videoData.hashtags)
      .map(h => h.replace(/^#/, ''))
      .join(', ');
    navigator.clipboard.writeText(tags);
    setCopiedTags(true);
    setTimeout(() => setCopiedTags(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#041d15] text-emerald-50 antialiased flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={replaceSceneFileInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0] && replaceTargetSceneIndex !== null) {
            handleReplaceSceneImage(replaceTargetSceneIndex, e.target.files[0]);
            e.target.value = '';
          }
        }}
      />
      <input
        type="file"
        ref={replaceAudioFileInputRef}
        accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            handleReplaceProjectAudio(e.target.files[0]);
            e.target.value = '';
          }
        }}
      />

      {/* 1. TOP HEADER */}
      <header className="border-b border-emerald-900/60 bg-[#06241b]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-green-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 font-black text-white text-xl">
              🌿
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base tracking-tight text-white">Jongiyoh.uz</span>
                <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase px-2 py-0.5 rounded-md">
                  Fito & Tabobat Video Studio
                </span>
              </div>
              <p className="text-xs text-emerald-400/80">Dorivor giyohlar, YMYL tibbiy xavfsizlik va Telegram voronka tizimi</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a 
              href="https://jongiyoh.uz" 
              target="_blank" 
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs text-emerald-300 hover:text-emerald-100 transition font-semibold px-3 py-1.5 rounded-lg hover:bg-emerald-900/60 border border-emerald-800/60"
            >
              jongiyoh.uz
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>

            {savedProjects.length > 0 && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 text-xs font-bold px-3 py-1.5 rounded-xl border border-emerald-800 transition flex items-center gap-1.5 cursor-pointer"
              >
                📁 Tarix ({savedProjects.length})
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 2. MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Controls & Generation Mode (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* DUAL ENGINE SWITCH: 2D Canvas Motion vs Google Veo 3.1 & Omni */}
          <div className="bg-[#052219] p-3.5 rounded-2xl border border-emerald-800/80 shadow-xl space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
                  Studio Dvigateli (Engine):
                </span>
                {veoHealth?.status === 'ok' ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Veo Faol (localhost:3001)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40" title="Veo generatsiyasi uchun veo-video-generator serverini yoqing">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    Veo Offline (localhost:3001)
                  </span>
                )}
              </div>
              <span className="text-[10px] font-mono text-emerald-400/80">
                {videoEngine === VideoEngine.CANVAS_2D ? "⚡ Tezkor (~25s) • ~$0.02" : "🎬 Kino Sifat (~4m) • ~$8.5 GCP"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVideoEngine(VideoEngine.CANVAS_2D)}
                className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                  videoEngine === VideoEngine.CANVAS_2D
                    ? 'bg-gradient-to-br from-emerald-900/90 to-[#072a20] border-emerald-400 text-white shadow-md shadow-emerald-500/10'
                    : 'bg-[#041d15] border-emerald-900/80 text-emerald-300/70 hover:text-white hover:border-emerald-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs flex items-center gap-1.5">
                    <span>⚡</span>
                    <span>2D Kinematik Studio</span>
                  </span>
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded font-bold">
                    Kundalik postlar
                  </span>
                </div>
                <p className="text-[10px] text-emerald-200/80 leading-snug">
                  2D Motion Canvas + Gemini 3.1 Flash TTS + Zumrad Karaoke. Bir zumda tayyor bo'ladi.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setVideoEngine(VideoEngine.VEO_AI)}
                className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                  videoEngine === VideoEngine.VEO_AI
                    ? 'bg-gradient-to-br from-purple-950/80 via-emerald-950 to-[#072a20] border-emerald-400 text-white shadow-lg shadow-emerald-500/20'
                    : 'bg-[#041d15] border-emerald-900/80 text-emerald-300/70 hover:text-white hover:border-emerald-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs flex items-center gap-1.5 text-emerald-300">
                    <span>🎬</span>
                    <span>Google Veo 3.1 & Omni</span>
                  </span>
                  <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-1.5 py-0.5 rounded font-bold">
                    Target / Reklama
                  </span>
                </div>
                <p className="text-[10px] text-emerald-200/80 leading-snug">
                  Google Veo 3.1 va Gemini Omni bilan to'liq AI kino-video. Jimlik avtomatik qirqiladi.
                </p>
              </button>
            </div>

            {/* If Veo Engine is selected, show model choices */}
            {videoEngine === VideoEngine.VEO_AI && (
              <div className="p-2.5 rounded-xl bg-[#021811] border border-emerald-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-emerald-300">Veo Modeli:</span>
                  <div className="flex bg-[#041d15] p-0.5 rounded-lg border border-emerald-800">
                    <button
                      type="button"
                      onClick={() => setVeoModel('omni')}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition cursor-pointer ${
                        veoModel === 'omni' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-emerald-400 hover:text-white'
                      }`}
                    >
                      🗣️ Gemini Omni (Nutq bilan)
                    </button>
                    <button
                      type="button"
                      onClick={() => setVeoModel('fast')}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition cursor-pointer ${
                        veoModel === 'fast' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-emerald-400 hover:text-white'
                      }`}
                    >
                      🎥 Veo 3.1 Fast (Kino B-roll)
                    </button>
                  </div>
                </div>
                <span className="text-[10px] text-emerald-400/80 font-mono">
                  {veoModel === 'omni' ? "11-14 so'z/kadr • Nutqli personaj" : "Fotoreal kinematik harakat"}
                </span>
              </div>
            )}
          </div>

          {/* TOP MODE TOGGLE TABS */}
          <div className="bg-[#072a20] p-1.5 rounded-2xl border border-emerald-900/80 grid grid-cols-3 gap-1.5 shadow-lg">
            <button
              onClick={() => setActiveTab('ai_generator')}
              className={`py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'ai_generator'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                  : 'text-emerald-300 hover:text-white hover:bg-emerald-900/60'
              }`}
            >
              <span>🌿</span>
              <span className="truncate">Havola / Giyoh</span>
            </button>

            <button
              onClick={() => setActiveTab('text_to_video')}
              className={`py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'text_to_video'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                  : 'text-emerald-300 hover:text-white hover:bg-emerald-900/60'
              }`}
            >
              <span>✍️</span>
              <span className="truncate">Matndan Video</span>
            </button>
            
            <button
              onClick={() => setActiveTab('custom_media')}
              className={`py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'custom_media'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                  : 'text-emerald-300 hover:text-white hover:bg-emerald-900/60'
              }`}
            >
              <span>📸</span>
              <span className="truncate">O'z Media & MP3</span>
            </button>
          </div>

          {/* TAB 1: JONGIYOH FOTO GENERATOR */}
          {activeTab === 'ai_generator' && (
            <div className="space-y-6">
              
              {/* YMYL & Medical Safety Guarantee Banner */}
              <div className="bg-gradient-to-r from-emerald-950/70 via-[#072d22] to-[#06241b] border border-emerald-500/30 rounded-2xl p-4 flex items-start gap-3 shadow-lg">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 font-black text-lg">
                  🛡️
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400">
                      YMYL Tibbiy Xavfsizlik & Qarshi Ko'rsatmalar Kafolati (30% Qoida)
                    </h3>
                    {selectedArticle?.lockedFacts && (
                      <button
                        onClick={() => setShowFactLockModal(true)}
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold underline"
                      >
                        Faktlarni tekshirish
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-emerald-200/90 mt-1 leading-relaxed">
                    Google va Yandex talablariga mos ravishda, har bir videoda biologik ta'sir mexanizmi, aniq doza va <strong>kimlarga ichish mumkin emasligi (homiladorlik, buyrak toshi)</strong> 100% kafolatlanadi.
                  </p>
                </div>
              </div>

              {/* STEP 1: Article URL Input & Link-to-Video Engine */}
              <div className="bg-[#072a20]/90 border border-emerald-900/70 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-emerald-200 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center text-[10px] font-black">1</span>
                    Maqola Havolasi (Jongiyoh.uz, Kun.uz, Wikipedia yoki istalgan sayt) yoki Mavzu
                  </label>
                  <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Har qanday link qo'llab-quvvatlanadi
                  </span>
                </div>

                {/* Primary Input with 1-Click Generate & Analyze */}
                <div className="space-y-2">
                  <div className="relative">
                    {articleUrl.includes('\n') || articleUrl.length > 90 ? (
                      <textarea 
                        rows={4}
                        placeholder="https://... (Jongiyoh.uz, Kun.uz, Wikipedia, PubMed yoki boshqa har qanday sayt havolasi) yoki maqola matnini to'g'ridan-to'g'ri joylang..."
                        value={articleUrl}
                        onChange={(e) => setArticleUrl(e.target.value)}
                        className="w-full bg-[#041d15] border border-emerald-800/80 rounded-xl p-3.5 pr-10 text-xs text-white placeholder-emerald-700 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 font-sans leading-relaxed transition"
                      />
                    ) : (
                      <input 
                        type="text"
                        placeholder="https://... (Jongiyoh, Kun.uz, Daryo, Wikipedia, PubMed yoki har qanday sayt) yoki giyoh / mavzu nomi..."
                        value={articleUrl}
                        onChange={(e) => setArticleUrl(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (videoEngine === VideoEngine.VEO_AI) {
                              handleGenerateVeoVideo(articleUrl);
                            } else {
                              handleGenerateReel(articleUrl);
                            }
                          }
                        }}
                        className="w-full bg-[#041d15] border border-emerald-800/80 rounded-xl pl-4 pr-10 py-3 text-sm text-white placeholder-emerald-700 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 font-medium transition"
                      />
                    )}
                    {articleUrl && (
                      <button 
                        onClick={() => { setArticleUrl(''); setSelectedArticle(null); }}
                        className="absolute right-3 top-3 text-emerald-500 hover:text-emerald-300 text-xs cursor-pointer p-1 bg-[#06241b] rounded"
                        title="Tozalash"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                    <span className="text-[11px] text-emerald-400/80">
                      {articleUrl.length > 90 
                        ? `📝 Maqola matni kiritildi (${articleUrl.length} belgi). To'g'ridan-to'g'ri video yaratish mumkin.`
                        : '💡 Istalgan veb-sayt havolasi (link) yoki mavzu matnini kiritishingiz mumkin.'}
                    </span>

                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleExtractUrl()}
                        disabled={isExtractingArticle || !articleUrl.trim()}
                        className="bg-[#06241b] hover:bg-emerald-900 disabled:opacity-50 text-emerald-200 hover:text-white font-bold px-3 py-2.5 rounded-xl text-xs transition border border-emerald-800 flex items-center justify-center gap-1 cursor-pointer"
                        title="Faqat matn va YMYL faktlarni tahlil qilish"
                      >
                        {isExtractingArticle ? (
                          <span className="animate-spin text-sm">🔄</span>
                        ) : (
                          <span>🔍 Tahlil qilish</span>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          if (videoEngine === VideoEngine.VEO_AI) {
                            handleGenerateVeoVideo(articleUrl);
                          } else {
                            handleGenerateReel(articleUrl);
                          }
                        }}
                        disabled={state.isLoading || (!articleUrl.trim() && !selectedArticle)}
                        className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition active:scale-95 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5 cursor-pointer font-sans"
                      >
                        <span>{videoEngine === VideoEngine.VEO_AI ? '🎬' : '⚡'}</span>
                        <span>{videoEngine === VideoEngine.VEO_AI ? 'VEO VIDEO YARATISH' : 'VIDEO YARATISH'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Trending Herbs Topics Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] text-emerald-300">
                    <span className="font-bold text-emerald-200 flex items-center gap-1">
                      <span>🌿</span> Ommabop Dorivor Giyohlar & Mavzular:
                    </span>
                    <span className="text-emerald-500">Tanlang va video yarating</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {TRENDING_HERBS_TOPICS.map((topic, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setArticleUrl(topic.query);
                          handleExtractUrl(topic.query);
                        }}
                        className="bg-[#041d15] hover:bg-emerald-950 text-emerald-200 hover:text-emerald-300 border border-emerald-800/80 hover:border-emerald-500/60 px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        title={topic.subtitle}
                      >
                        <span>{topic.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* ACTIVE ARTICLE CARD OVERVIEW */}
              {selectedArticle && (
                <div className="bg-[#072a20]/90 border border-emerald-900/70 rounded-2xl p-5 shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Tahlil qilingan Fito Maqola
                        </span>
                        {selectedArticle.category && (
                          <span className="text-xs text-emerald-300 font-bold">{selectedArticle.category}</span>
                        )}
                      </div>
                      <h2 className="text-base font-black text-white mt-1.5 leading-snug">{selectedArticle.title}</h2>
                      {selectedArticle.url && (
                        <a 
                          href={selectedArticle.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-mono mt-1 underline"
                        >
                          <span>🔗 Manba: {selectedArticle.url.replace(/^https?:\/\//, '')}</span>
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                      <button
                        onClick={() => setSelectedArticle(null)}
                        className="text-emerald-400 hover:text-white hover:bg-emerald-900 border border-emerald-800 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                        title="Tahlil kartasini yopish"
                      >
                        ✕ Yopish
                      </button>
                      <button
                        onClick={() => {
                          if (videoEngine === VideoEngine.VEO_AI) {
                            handleGenerateVeoVideo(selectedArticle?.title || articleUrl);
                          } else {
                            handleGenerateReel();
                          }
                        }}
                        disabled={state.isLoading}
                        className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition active:scale-95 shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>{videoEngine === VideoEngine.VEO_AI ? '🎬' : '⚡'}</span>
                        <span>{videoEngine === VideoEngine.VEO_AI ? 'Veo Video Yaratish' : 'Video yaratish'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="bg-[#041d15] p-3 rounded-xl border border-emerald-900/80">
                      <span className="text-[10px] font-black uppercase text-emerald-400 block">Faol Shifobaxsh Modda</span>
                      <span className="text-xs font-bold text-teal-300 mt-0.5 block line-clamp-2">{selectedArticle.keyInnovation || "Tabiiy biologik faol moddalar"}</span>
                    </div>
                    <div className="bg-[#041d15] p-3 rounded-xl border border-emerald-900/80">
                      <span className="text-[10px] font-black uppercase text-emerald-400 block">Dozasi & Retsepti</span>
                      <span className="text-xs font-black text-emerald-400 mt-0.5 block line-clamp-2">{selectedArticle.benchmarkStats || "1 osh qoshiq 200 ml suvga"}</span>
                    </div>
                    <div className="bg-[#041d15] p-3 rounded-xl border border-red-900/60 bg-red-950/20">
                      <span className="text-[10px] font-black uppercase text-red-400 block">⚠️ Qarshi Ko'rsatma (YMYL)</span>
                      <span className="text-xs font-bold text-red-300 mt-0.5 block line-clamp-2">
                        {Array.isArray(selectedArticle.risksAndLimits) ? selectedArticle.risksAndLimits.join(', ') : "Buyrak toshi va homiladorlikda mumkin emas"}
                      </span>
                    </div>
                  </div>

                  {/* Locked Facts Chips */}
                  {selectedArticle.lockedFacts && (
                    <div className="bg-[#041d15]/80 p-3 rounded-xl border border-emerald-900/70 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
                          <span>🛡️</span> Videoda 100% kafolatlangan tibbiy qoidalar:
                        </span>
                        <button 
                          onClick={() => setShowFactLockModal(true)} 
                          className="text-[10px] text-emerald-400 hover:underline font-bold cursor-pointer"
                        >
                          Batafsil tekshirish
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {ensureStringArray(selectedArticle.lockedFacts.amounts).slice(0, 3).map((item, i) => (
                          <span key={`amt-${i}`} className="text-[10px] bg-[#072a20] border border-emerald-800 text-emerald-200 px-2 py-0.5 rounded font-mono">
                            {item}
                          </span>
                        ))}
                        {ensureStringArray(selectedArticle.lockedFacts.percentages).slice(0, 2).map((item, i) => (
                          <span key={`pct-${i}`} className="text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded font-mono">
                            {item}
                          </span>
                        ))}
                        {ensureStringArray(selectedArticle.lockedFacts.otherCriticalFacts).slice(0, 2).map((item, i) => (
                          <span key={`cr-${i}`} className="text-[10px] bg-teal-500/10 border border-teal-500/30 text-teal-300 px-2 py-0.5 rounded">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* TAB 2: TEXT-TO-VIDEO GENERATOR (MATNDAN VIDEO) */}
          {activeTab === 'text_to_video' && (
            <div className="space-y-6">
              {/* Feature Intro Banner */}
              <div className="bg-gradient-to-r from-emerald-950/70 via-[#072d22] to-[#06241b] border border-emerald-500/30 rounded-2xl p-4 flex items-start gap-3 shadow-lg">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 font-black text-lg">
                  ✍️
                </div>
                <div className="flex-1">
                  <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400">
                    Ixtiyoriy Matndan Video Yaratish (Text to Video Studio)
                  </h3>
                  <p className="text-xs text-emerald-200/90 mt-1 leading-relaxed">
                    Istalgan maqola, dorivor giyoh retsepti, hayotiy hikoya, she'r yoki tavsiyani kiriting. Gemini AI uni tahlil qilib, 9:16 vertikal kadrlar, O'zbekcha tabiiy diktor ovozi, kinematik tasvirlar va karaoke subtitrlar bilan to'liq video yasab beradi.
                  </p>
                </div>
              </div>

              {/* Main Input Card */}
              <div className="bg-[#072a20]/90 border border-emerald-900/70 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-emerald-200 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center text-[10px] font-black">1</span>
                    Matn va Sarlavhani Kiriting
                  </label>
                  <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    O'zbek / Rus / Ingliz
                  </span>
                </div>

                {/* Optional Title and Scene Count */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-emerald-300 block mb-1">
                      Mavzu yoki Sarlavha (ixtiyoriy)
                    </label>
                    <input
                      type="text"
                      placeholder="Masalan: Bo'g'imlar qisirlashi va qirqbo'g'in yoki Tonggi foydali odatlar..."
                      value={rawTextTitle}
                      onChange={(e) => setRawTextTitle(e.target.value)}
                      className="w-full bg-[#041d15] border border-emerald-800/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-emerald-700 focus:outline-none focus:border-emerald-400 font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-emerald-300 block mb-1">
                      Kadrlar soni
                    </label>
                    <select
                      value={targetSceneCount}
                      onChange={(e) => setTargetSceneCount(Number(e.target.value))}
                      className="w-full bg-[#041d15] border border-emerald-800/80 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-emerald-400 cursor-pointer"
                    >
                      <option value={0}>Avtomatik (4-6 kadr)</option>
                      <option value={3}>3 ta kadr (~15-20 sek)</option>
                      <option value={5}>5 ta kadr (~30-40 sek)</option>
                      <option value={7}>7 ta kadr (~50-60 sek)</option>
                    </select>
                  </div>
                </div>

                {/* Main Textarea */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-emerald-300">
                      Asosiy Matn (Maqola, hikoya, retsept yoki tavsiya)
                    </label>
                    {rawTextInput && (
                      <button
                        onClick={() => { setRawTextInput(''); setRawTextTitle(''); }}
                        className="text-[11px] text-emerald-500 hover:text-emerald-300 font-bold cursor-pointer"
                      >
                        ✕ Tozalash
                      </button>
                    )}
                  </div>

                  <textarea
                    rows={7}
                    placeholder="Bu yerga video qilmoqchi bo'lgan ixtiyoriy matningizni yozing yoki nusxalab joylang...&#10;&#10;Masalan: Dorivor giyohlarning inson tanasiga foydasi, to'g'ri damlash qoidalari, Abu Ali ibn Sino tavsiyalari, sog'lom turmush tarzi yoki qiziqarli hayotiy xulosa..."
                    value={rawTextInput}
                    onChange={(e) => setRawTextInput(e.target.value)}
                    className="w-full bg-[#041d15] border border-emerald-800/80 rounded-xl p-3.5 text-xs text-white placeholder-emerald-700 focus:outline-none focus:border-emerald-400 font-sans leading-relaxed transition"
                  />

                  {/* Character & Word counter info */}
                  <div className="flex items-center justify-between text-[11px] text-emerald-400/80 pt-0.5">
                    <span>
                      {rawTextInput.trim().length > 0 ? (
                        <>
                          📝 {rawTextInput.trim().length} belgi • {rawTextInput.trim().split(/\s+/).filter(Boolean).length} so'z 
                          <span className="text-emerald-300 font-bold ml-1.5">
                            (~{Math.max(12, Math.round(rawTextInput.trim().split(/\s+/).filter(Boolean).length / 2.2))} soniya nutq)
                          </span>
                        </>
                      ) : (
                        '💡 Istalgan uzunlikdagi matnni kiritishingiz mumkin.'
                      )}
                    </span>
                    <button
                      onClick={() => {
                        if (videoEngine === VideoEngine.VEO_AI) {
                          handleGenerateVeoVideo(rawTextTitle, rawTextInput);
                        } else {
                          handleGenerateFromText();
                        }
                      }}
                      disabled={state.isLoading || !rawTextInput.trim()}
                      className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-slate-950 font-black px-4 py-1.5 rounded-xl text-xs uppercase tracking-wider transition active:scale-95 shadow-md shadow-emerald-500/20 flex items-center gap-1 cursor-pointer font-sans"
                    >
                      <span>{videoEngine === VideoEngine.VEO_AI ? '🎬' : '⚡'}</span>
                      <span>{videoEngine === VideoEngine.VEO_AI ? 'VEO VIDEO' : 'VIDEO YARATISH'}</span>
                    </button>
                  </div>
                </div>

                {/* Quick Samples / Templates */}
                <div className="space-y-1.5 pt-2 border-t border-emerald-900/60">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-emerald-200 flex items-center gap-1">
                      <span>💡</span> 1-bosishda sinab ko'rish uchun tayyor matnlar:
                    </span>
                    <span className="text-emerald-500">Tanlang va darhol yarating</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {TEXT_TEMPLATES.map((tmpl, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setRawTextTitle(tmpl.title);
                          setRawTextInput(tmpl.text);
                        }}
                        className="text-left bg-[#041d15] hover:bg-emerald-950/80 border border-emerald-800/70 hover:border-emerald-500/60 p-2.5 rounded-xl transition cursor-pointer group"
                      >
                        <div className="text-xs font-bold text-emerald-300 group-hover:text-emerald-200 flex items-center justify-between">
                          <span>{tmpl.label}</span>
                          <span className="text-[10px] text-emerald-500 group-hover:text-emerald-400 font-mono">Yuklash ↵</span>
                        </div>
                        <p className="text-[10px] text-emerald-500/80 line-clamp-1 mt-0.5">
                          {tmpl.title}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CUSTOM MEDIA UPLOAD (1-10 IMAGES & MP3 AUDIO) */}
          {activeTab === 'custom_media' && (
            <div className="space-y-6">
              
              <div className="bg-gradient-to-r from-emerald-950/70 via-[#072d22] to-[#06241b] border border-emerald-500/30 rounded-2xl p-4 flex items-start gap-3 shadow-lg">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 font-black text-lg">
                  📸
                </div>
                <div className="flex-1">
                  <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400">
                    Shaxsiy Fito-Rasmlar (10 tagacha) va MP3 Ovoz
                  </h3>
                  <p className="text-xs text-emerald-200/90 mt-1 leading-relaxed">
                    Dorivor giyohlaringiz, damlamalaringiz yoki dorixonangiz fotosuratlarini yuklang. AI nutqni avtomatik eshitib YMYL xavfsiz subtitrlarga ajratadi!
                  </p>
                </div>
              </div>

              {/* 1. CUSTOM IMAGES UPLOAD SECTION */}
              <div className="bg-[#072a20]/90 border border-emerald-900/70 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-emerald-200 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center text-[10px] font-black">1</span>
                    Rasmlar Yuklash (Maksimum 10 ta)
                  </label>
                  <span className="text-xs font-black text-emerald-400 bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-800">
                    {customImages.length} / 10 ta rasm
                  </span>
                </div>

                <input
                  type="file"
                  ref={customImagesFileInputRef}
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleProcessImageFiles(e.target.files);
                      e.target.value = '';
                    }
                  }}
                />

                <div
                  onClick={() => customImagesFileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      handleProcessImageFiles(e.dataTransfer.files);
                    }
                  }}
                  className="border-2 border-dashed border-emerald-800 hover:border-emerald-400 bg-[#041d15] rounded-2xl p-5 text-center cursor-pointer transition group"
                >
                  <div className="w-10 h-10 mx-auto rounded-full bg-[#072a20] border border-emerald-800 group-hover:border-emerald-500/50 flex items-center justify-center text-lg text-emerald-400 mb-2 transition">
                    🌿
                  </div>
                  <p className="text-xs font-bold text-emerald-200">
                    Giyohlar va mahsulotlar suratlarini bu yerga tashlang yoki fayl tanlang (10 tagacha)
                  </p>
                  <p className="text-[11px] text-emerald-500 mt-1">
                    PNG, JPG, WEBP formatlari qo'llab-quvvatlanadi
                  </p>
                </div>

                {customImages.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between text-xs text-emerald-300">
                      <span className="font-bold text-emerald-200">Kadrlarning ketma-ketligi va har bir kadr subtitri ({customImages.length} ta):</span>
                      <button
                        onClick={() => setCustomImages([])}
                        className="text-[11px] text-red-400 hover:text-red-300 font-bold cursor-pointer"
                      >
                        Barchasini o'chirish
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {customImages.map((item, idx) => (
                        <div 
                          key={item.id}
                          className="bg-[#041d15] border border-emerald-900 rounded-xl p-2.5 flex gap-2.5 items-start"
                        >
                          <div className="relative w-16 h-24 rounded-lg overflow-hidden bg-emerald-950 shrink-0">
                            <img 
                              src={item.url} 
                              alt={item.name}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute top-1 left-1 bg-black/80 text-emerald-400 text-[10px] font-black px-1.5 py-0.5 rounded border border-emerald-500/30">
                              #{idx + 1}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-emerald-300 truncate max-w-[120px]">{item.name}</span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleMoveCustomImage(idx, 'left')}
                                  disabled={idx === 0}
                                  className="p-1 rounded bg-emerald-900 hover:bg-emerald-800 disabled:opacity-30 text-[10px] text-emerald-200 font-bold"
                                  title="Oldinga siljitish"
                                >
                                  ◀
                                </button>
                                <button
                                  onClick={() => handleMoveCustomImage(idx, 'right')}
                                  disabled={idx === customImages.length - 1}
                                  className="p-1 rounded bg-emerald-900 hover:bg-emerald-800 disabled:opacity-30 text-[10px] text-emerald-200 font-bold"
                                  title="Keyinga siljitish"
                                >
                                  ▶
                                </button>
                                <button
                                  onClick={() => handleRemoveCustomImage(idx)}
                                  className="text-emerald-500 hover:text-red-400 text-xs p-1"
                                  title="O'chirish"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>

                            <input
                              type="text"
                              value={item.subtitle || ''}
                              onChange={(e) => handleUpdateImageSubtitle(idx, e.target.value)}
                              placeholder={`${idx + 1}-kadrda chiqadigan subtitr gapi...`}
                              className="w-full bg-[#072a20] border border-emerald-800 focus:border-emerald-400 rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder-emerald-700 focus:outline-none"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. CUSTOM AUDIO SECTION */}
              <div className="bg-[#072a20]/90 border border-emerald-900/70 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-emerald-200 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center text-[10px] font-black">2</span>
                    Ovoz (O'z MP3 Audio yoki AI Ovoz)
                  </label>
                  <div className="flex bg-[#041d15] p-0.5 rounded-lg border border-emerald-900 text-[11px] font-bold">
                    <button
                      onClick={() => setCustomAudioMode('upload_mp3')}
                      className={`px-2.5 py-1 rounded-md transition cursor-pointer ${customAudioMode === 'upload_mp3' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-emerald-400'}`}
                    >
                      🎵 MP3 Yuklash
                    </button>
                    <button
                      onClick={() => setCustomAudioMode('gemini_tts')}
                      className={`px-2.5 py-1 rounded-md transition cursor-pointer ${customAudioMode === 'gemini_tts' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-emerald-400'}`}
                    >
                      🎙️ AI Ovoz (TTS)
                    </button>
                  </div>
                </div>

                {customAudioMode === 'upload_mp3' ? (
                  <div className="space-y-3">
                    <input
                      type="file"
                      ref={customAudioFileInputRef}
                      accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleProcessAudioFile(e.target.files[0]);
                          e.target.value = '';
                        }
                      }}
                    />

                    {customAudio ? (
                      <div className="space-y-3">
                        <div className="bg-[#041d15] border border-emerald-500/40 p-4 rounded-xl flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg font-black">
                              🎵
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-white line-clamp-1">{customAudio.name}</h4>
                              <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-mono mt-0.5">
                                <span>⏱️ {Math.round(customAudio.duration || 0)} soniya</span>
                                <span>•</span>
                                <span>💾 {customAudio.sizeFormatted}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => customAudioFileInputRef.current?.click()}
                              className="text-xs text-emerald-400 hover:text-emerald-300 font-bold underline px-2 py-1 cursor-pointer"
                            >
                              Almashtirish
                            </button>
                            <button
                              onClick={() => setCustomAudio(null)}
                              className="text-emerald-500 hover:text-red-400 text-xs p-1 cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        {/* SPEECH TO TEXT BUTTON */}
                        <button
                          onClick={handleTranscribeUploadedAudio}
                          disabled={isTranscribingAudio}
                          className="w-full bg-[#06241b] hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 hover:text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
                        >
                          {isTranscribingAudio ? (
                            <>
                              <span className="animate-spin">🔄</span>
                              <span>Fito-nutq eshitilib, matnga aylantirilmoqda...</span>
                            </>
                          ) : (
                            <>
                              <span>✨</span>
                              <span>OVOZDAN AVTOMATIK SUBTITR ANIQLASH (AI Speech-to-Text)</span>
                            </>
                          )}
                        </button>

                        {transcribeSuccessNotice && (
                          <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-700 text-xs text-emerald-300 flex items-center gap-2">
                            <span>✅</span>
                            <span>Nutq muvaffaqiyatli tahlil qilindi va subtitrlar kadrlar bo'yicha taqsimlandi!</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        onClick={() => customAudioFileInputRef.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (e.dataTransfer.files?.[0]) {
                            handleProcessAudioFile(e.dataTransfer.files[0]);
                          }
                        }}
                        className="border-2 border-dashed border-emerald-800 hover:border-emerald-400 bg-[#041d15] rounded-2xl p-5 text-center cursor-pointer transition group"
                      >
                        <div className="w-10 h-10 mx-auto rounded-full bg-[#072a20] border border-emerald-800 group-hover:border-emerald-500/50 flex items-center justify-center text-lg text-emerald-400 mb-1.5 transition">
                          🎙️
                        </div>
                        <p className="text-xs font-bold text-emerald-200">
                          O'z MP3 yoki WAV audio faylingizni yuklang
                        </p>
                        <p className="text-[11px] text-emerald-500 mt-0.5">
                          AI nutqingizni avtomatik eshitib subtitrlar yaratadi yoki quyida matnini yozishingiz mumkin
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-emerald-400">
                      O'z MP3 faylingiz bo'lmasa, quyidagi fito-ssenariy matnini kiriting va AI ovozini tanlang:
                    </p>
                    <select
                      value={voice}
                      onChange={(e) => setVoice(e.target.value as VoiceType)}
                      className="w-full bg-[#041d15] border border-emerald-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-400"
                    >
                      <option value={VoiceType.PROFESSIONAL}>🎙️ Samimiy Tabib & Fitoterapevt (Aoede)</option>
                      <option value={VoiceType.FRIENDLY}>🤝 Iliq & Do'stona Maslahatchi (Kore)</option>
                      <option value={VoiceType.CALM}>🎧 Vazmin & Tinch Tabobat Ovozi (Charon)</option>
                      <option value={VoiceType.SERIOUS}>👔 Rasmiy Ilmiy Fitolog (Fenrir)</option>
                      <option value={VoiceType.ENERGETIC}>🔥 Tezkor & Jonli Spiker (Puck)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* 3. SCRIPT TEXTAREA */}
              <div className="bg-[#072a20]/90 border border-emerald-900/70 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-emerald-200 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center text-[10px] font-black">3</span>
                    Ovoz Matni & Fito-Ssenariy
                  </label>
                  <span className="text-[11px] text-emerald-400 font-medium">Har bir gap alohida kadrga tushadi</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-emerald-300 block mb-1">Video Sarlavhasi (Mavzu)</label>
                    <input
                      type="text"
                      placeholder="Masalan: Bo'g'imlar qisirlashiga qirqbo'g'in damlamasi"
                      value={customTopic}
                      onChange={(e) => setCustomTopic(e.target.value)}
                      className="w-full bg-[#041d15] border border-emerald-800/80 rounded-xl px-4 py-2.5 text-xs text-white placeholder-emerald-700 focus:outline-none focus:border-emerald-400 font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-emerald-300 block mb-1">
                      Ovoz Matni (Audioda aytilgan gaplar)
                    </label>
                    <textarea
                      placeholder="Audioda aytilgan gaplarni shu yerga yozing yoki audiodan AI orqali aniqlang.&#10;&#10;Masalan:&#10;Bo'g'imlaringiz qisirlab og'riyaptimi?&#10;Qirqbo'g'in o'tidagi kremniy tog'aylarni oziqlantiradi.&#10;1 osh qoshiq giyohni 200 ml qaynoq suvda damlang.&#10;Diqqat: buyrak toshi va homiladorlikda ichish qat'iyan man etiladi!&#10;Shaxsiy dozangizni Jongiyoh bot orqali bepul hisoblang."
                      value={customScriptText}
                      onChange={(e) => setCustomScriptText(e.target.value)}
                      rows={5}
                      className="w-full bg-[#041d15] border border-emerald-800/80 rounded-xl p-3 text-xs text-white placeholder-emerald-700 focus:outline-none focus:border-emerald-400 font-sans leading-relaxed"
                    />
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* GENERAL CUSTOMIZATION CONTROLS */}
          <div className="bg-[#072a20]/90 border border-emerald-900/70 rounded-2xl p-5 shadow-xl space-y-5">
            <label className="text-xs font-black uppercase tracking-wider text-emerald-200 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center text-[10px] font-black">⚙️</span>
              Fito-Dizayn, Subtitr & Fon Musiqasi
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Visual Strategy: 4 AI + 3 Unsplash Hybrid */}
              <div className="space-y-1.5 sm:col-span-2 bg-[#041d15] p-3 rounded-xl border border-emerald-800/80">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-emerald-400 uppercase flex items-center gap-1.5">
                    <span>🖼️</span> Rasmlar Manbai & Gibrid Generatsiya
                  </label>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                    {visualStrategy === VisualGenerationStrategy.HYBRID ? '⚡ 2X Tezroq & Tabiiy' : visualStrategy === VisualGenerationStrategy.ALL_AI ? '🎨 100% AI' : '📸 100% Botanik Foto'}
                  </span>
                </div>
                <select
                  value={visualStrategy}
                  onChange={(e) => setVisualStrategy(e.target.value as VisualGenerationStrategy)}
                  className="w-full bg-[#072a20] border border-emerald-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-400 cursor-pointer"
                >
                  <option value={VisualGenerationStrategy.HYBRID}>
                    ⚡ Gibrid rejim (4 ta AI botanik kadr + 3 ta Unsplash real giyohlar fotosi) — Tavsiya etiladi!
                  </option>
                  <option value={VisualGenerationStrategy.ALL_AI}>
                    🎨 100% AI generatsiya (barcha kadrlar AI tomonidan chiziladi)
                  </option>
                  <option value={VisualGenerationStrategy.ALL_REAL}>
                    📸 100% Haqiqiy Unsplash dorivor giyoh fotosuratlari (tezkor preview)
                  </option>
                </select>
                <p className="text-[10px] text-emerald-400/80">
                  {visualStrategy === VisualGenerationStrategy.HYBRID 
                    ? "✨ 1, 3, 5, 7-kadrlar mavzuga mos AI orqali chiziladi, 2, 4, 6-kadrlar esa Unsplash dorivor giyoh fotosuratlari bilan to'ldiriladi. Bu video sifatini oshiradi va vaqtni 2 barobarga tejaydi."
                    : visualStrategy === VisualGenerationStrategy.ALL_AI
                    ? "Barcha kadrlar AI tomonidan noldan chiziladi (~35-40 soniya)."
                    : "Barcha kadrlar haqiqiy Unsplash dorivor giyoh fotosuratlaridan olinadi (bir necha soniyada tayyor)."
                  }
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-300 font-bold bg-emerald-950/60 border border-emerald-800/60 rounded-lg px-2.5 py-1">
                  <span>🔒</span>
                  <span>Takrorlanmaslik kafolati: Bir postda chiqqan fotosuratlar boshqa postlarda hech qachon qayta takrorlanmaydi.</span>
                </div>
              </div>

              {/* Visual Genre */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-emerald-300 uppercase">Vizual Fito Uslub (Rasm Janri)</label>
                <select
                  value={visualGenre}
                  onChange={(e) => setVisualGenre(e.target.value as VisualGenre)}
                  className="w-full bg-[#041d15] border border-emerald-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-400 cursor-pointer"
                >
                  <option value={VisualGenre.AUTO}>🌿 Tabiiy Dorivor O'tlar & Bog'lar (Eng tabiiy, neonsiz)</option>
                  <option value={VisualGenre.HERBAL_TEAPOT}>🍵 Shifobaxsh Damlama & Choynak (Makro va bug')</option>
                  <option value={VisualGenre.BOTANICAL_MACRO}>🌱 Botanik Makro & Yangi Barglar (Shudring va quyosh)</option>
                  <option value={VisualGenre.ANCIENT_HEALER}>📜 Sharq Tabobati & Qadimgi Kitoblar (Ibn Sino ruhiyati)</option>
                  <option value={VisualGenre.HEALTHY_JOINTS}>🚶 Faol Harakat & Sog'lom Bo'g'imlar (Tabiat qo'ynida yurish)</option>
                  <option value={VisualGenre.APOTHECARY_LAB}>🔬 Fito-Laboratoriya & Ekstrakt (Ilmiy tahlil)</option>
                </select>
              </div>

              {/* Subtitle & Karaoke Settings */}
              <div className="space-y-2.5 bg-[#021811] p-3.5 rounded-xl border border-emerald-800/80">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-emerald-300 uppercase flex items-center gap-1.5">
                    <span>🎤</span>
                    <span>Subtitr & Karaoke Rejimi</span>
                  </label>
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/40">
                    🔥 Trend Shorts/Reels
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-emerald-400 font-medium">Uslub va Effekt:</label>
                  <select
                    value={subtitleStyle}
                    onChange={(e) => setSubtitleStyle(e.target.value as SubtitleStyle)}
                    className="w-full bg-[#041d15] border border-emerald-700/80 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-400 cursor-pointer shadow-inner"
                  >
                    <option value={SubtitleStyle.HORMOZI_EMERALD}>🟢 🔥 Trend Zumrad Karaoke (Yashil plashka + sakrash)</option>
                    <option value={SubtitleStyle.HORMOZI_GOLD}>🟡 ⚡ Viral Oltin-Sariq (Hormozi / TikTok uslubi)</option>
                    <option value={SubtitleStyle.NEON_PULSE}>💎 ✨ Neon Glow & Charaqlovchi Nurlar</option>
                    <option value={SubtitleStyle.EMERALD_HERBS}>🌿 🟢 Klassik Tabiiy Zumrad (Jongiyoh)</option>
                    <option value={SubtitleStyle.GOLDEN_HONEY}>🍯 🟡 Asal Rangli Oltin (Iliq kurkumin)</option>
                    <option value={SubtitleStyle.WARNING_RED}>⚠️ 🔴 Qat'iy Qarshi Ko'rsatma (YMYL Qizil)</option>
                    <option value={SubtitleStyle.CLEAN_MINIMAL}>🖤 Toza Minimal Oq-Qora</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <div className="space-y-1">
                    <label className="text-[10px] text-emerald-400 font-medium">Joylashuvi:</label>
                    <select
                      value={subtitlePosition}
                      onChange={(e) => setSubtitlePosition(e.target.value as SubtitlePosition)}
                      className="w-full bg-[#041d15] border border-emerald-800 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-white focus:outline-none focus:border-emerald-400 cursor-pointer"
                    >
                      <option value={SubtitlePosition.BOTTOM}>Pastki (Reels xavfsiz)</option>
                      <option value={SubtitlePosition.CENTER}>Markazda (Diqqat)</option>
                      <option value={SubtitlePosition.TOP}>Tepadagi</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-emerald-400 font-medium">Fraza sur'ati:</label>
                    <select
                      value={karaokeChunkSize}
                      onChange={(e) => setKaraokeChunkSize(e.target.value as 'dynamic' | 'standard')}
                      className="w-full bg-[#041d15] border border-emerald-800 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-white focus:outline-none focus:border-emerald-400 cursor-pointer"
                    >
                      <option value="dynamic">⚡ 2-3 so'z (Dinamik)</option>
                      <option value="standard">📄 4-5 so'z (Kengroq)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-emerald-900/60 text-[11px]">
                  <label htmlFor="emojiAccentsToggle" className="text-emerald-300 font-medium flex items-center gap-1.5 cursor-pointer">
                    <span>✨</span>
                    <span>Fito-emojilar va kalit so'zlar yoritilishi</span>
                  </label>
                  <input
                    id="emojiAccentsToggle"
                    type="checkbox"
                    checked={showEmojiAccents}
                    onChange={(e) => setShowEmojiAccents(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* 🫖 YAKUNIY «DAMLASH RETSEPTI & DOZA» INFOGRAFIKASI */}
              <div className="bg-[#041d15] border border-emerald-800/80 rounded-2xl p-3.5 space-y-2.5 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">🫖</span>
                    <label className="text-[11px] font-bold text-emerald-300 uppercase tracking-wide">
                      Damlash Retsepti & Doza Kartasi
                    </label>
                  </div>
                  <span className="text-[9px] bg-emerald-950 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                    📌 Viral Saqlash
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-emerald-900/60 text-[11px]">
                  <label htmlFor="recipeCardToggle" className="text-emerald-200 font-medium flex items-center gap-1.5 cursor-pointer">
                    <span>✨</span>
                    <span>Infografika kartasini videoga joylash</span>
                  </label>
                  <input
                    id="recipeCardToggle"
                    type="checkbox"
                    checked={showRecipeCard}
                    onChange={(e) => setShowRecipeCard(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                  />
                </div>

                {showRecipeCard && (
                  <div className="space-y-2 pt-1 border-t border-emerald-900/50">
                    <div className="space-y-1">
                      <label className="text-[10px] text-emerald-400 font-medium">Ko'rsatish vaqti:</label>
                      <select
                        value={recipeCardTiming}
                        onChange={(e) => setRecipeCardTiming(e.target.value as 'both' | 'recipe_scene' | 'video_end')}
                        className="w-full bg-[#072a20] border border-emerald-800 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-white focus:outline-none focus:border-emerald-400 cursor-pointer"
                      >
                        <option value="both">🌟 Retsept sahnasida + Video yakunida (Tavsiya)</option>
                        <option value="video_end">🎬 Faqat video yakunida (Oxirgi 7 soniya)</option>
                        <option value="recipe_scene">🍵 Faqat retsept/damlash sahnasida</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsRecipeCardExpanded(!isRecipeCardExpanded)}
                      className="w-full flex items-center justify-between text-[11px] font-bold text-emerald-300 hover:text-white bg-[#072a20]/70 hover:bg-[#072a20] px-3 py-2 rounded-xl border border-emerald-800/60 transition cursor-pointer"
                    >
                      <span>⚙️ Retsept parametrlarini tahrirlash ({recipeCardData.title || "Giyoh damlamasi"})</span>
                      <span className="text-xs">{isRecipeCardExpanded ? '▲ Yopish' : '▼ Ochish'}</span>
                    </button>

                    {isRecipeCardExpanded && (
                      <div className="space-y-2.5 p-3 rounded-xl bg-[#021811] border border-emerald-900/80 text-[11px]">
                        <div>
                          <label className="text-[10px] text-emerald-400 font-medium">Retsept Sarlavhasi:</label>
                          <input
                            type="text"
                            value={recipeCardData.title}
                            onChange={(e) => handleUpdateRecipeField('title', e.target.value)}
                            className="w-full bg-[#072a20] border border-emerald-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-400 font-bold"
                            placeholder="Masalan: Dalachoy Damlamasi"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-emerald-400 font-medium">🌿 Giyoh miqdori / Doza:</label>
                            <input
                              type="text"
                              value={recipeCardData.dosage}
                              onChange={(e) => handleUpdateRecipeField('dosage', e.target.value)}
                              className="w-full bg-[#072a20] border border-emerald-800 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-400 font-semibold"
                              placeholder="1 osh qoshiq (5-10 gr)"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-emerald-400 font-medium">💧 Qaynoq suv:</label>
                            <input
                              type="text"
                              value={recipeCardData.water}
                              onChange={(e) => handleUpdateRecipeField('water', e.target.value)}
                              className="w-full bg-[#072a20] border border-emerald-800 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-400 font-semibold"
                              placeholder="200-250 ml (90-95°C)"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-emerald-400 font-medium">⏳ Damlash vaqti:</label>
                            <input
                              type="text"
                              value={recipeCardData.steepTime}
                              onChange={(e) => handleUpdateRecipeField('steepTime', e.target.value)}
                              className="w-full bg-[#072a20] border border-emerald-800 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-400 font-semibold"
                              placeholder="15-20 daqiqa (ustini yopib)"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-emerald-400 font-medium">🍵 Qabul tartibi:</label>
                            <input
                              type="text"
                              value={recipeCardData.frequency}
                              onChange={(e) => handleUpdateRecipeField('frequency', e.target.value)}
                              className="w-full bg-[#072a20] border border-emerald-800 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-400 font-semibold"
                              placeholder="Kuniga 2 mahal, ovqatdan oldin"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] text-emerald-400 font-medium">🗓️ Kurs davomiyligi:</label>
                          <input
                            type="text"
                            value={recipeCardData.duration}
                            onChange={(e) => handleUpdateRecipeField('duration', e.target.value)}
                            className="w-full bg-[#072a20] border border-emerald-800 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-400 font-semibold"
                            placeholder="21 kun qabul + 7 kun tanaffus"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-red-400 font-medium">⚠️ Qarshi ko'rsatma (YMYL xavfsizlik):</label>
                          <input
                            type="text"
                            value={recipeCardData.warning}
                            onChange={(e) => handleUpdateRecipeField('warning', e.target.value)}
                            className="w-full bg-[#200909] border border-red-900/80 rounded-lg px-2 py-1 text-xs text-red-200 focus:outline-none focus:border-red-500 font-semibold"
                            placeholder="Homiladorlik va buyrak toshida taqiqlanadi!"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-amber-400 font-medium">📌 Call to Action (Saqlab olish):</label>
                          <input
                            type="text"
                            value={recipeCardData.callToAction}
                            onChange={(e) => handleUpdateRecipeField('callToAction', e.target.value)}
                            className="w-full bg-[#072a20] border border-amber-600/60 rounded-lg px-2 py-1 text-xs text-amber-200 focus:outline-none focus:border-amber-400 font-bold"
                            placeholder="📌 Retseptni yo'qotmaslik uchun SAQLAB OLING! 💾"
                          />
                        </div>

                        {state.videoData?.aiArticle && (
                          <div className="pt-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                if (state.videoData?.aiArticle) {
                                  setRecipeCardData(extractRecipeCardFromArticle(state.videoData.aiArticle));
                                }
                              }}
                              className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
                            >
                              🔄 Maqoladan qayta tiklash
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Background Music */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-emerald-300 uppercase">Fon Musiqasi</label>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    {musicGenre === BackgroundMusicGenre.NONE ? "O'chiq" : `${musicVolume}% ovoz`}
                  </span>
                </div>
                <select
                  value={musicGenre}
                  onChange={(e) => setMusicGenre(e.target.value as BackgroundMusicGenre)}
                  className="w-full bg-[#041d15] border border-emerald-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-400 cursor-pointer"
                >
                  <option value={BackgroundMusicGenre.MEDITATION_CHILL}>🌿 Tinch Tabiat & Shabadalar (Tavsiya)</option>
                  <option value={BackgroundMusicGenre.NATURE_CALM}>🧘 Meditatsiya & Chuqur Xotirjamlik</option>
                  <option value={BackgroundMusicGenre.WATER_STREAM}>💧 Mayin Suv Oqimi & Shudring</option>
                  <option value={BackgroundMusicGenre.ORIENTAL_NEY}>🪈 Sharqona Ney & Ud Sadolari</option>
                  <option value={BackgroundMusicGenre.MOUNTAIN_BREEZE}>🏔️ Tog' Shamoli & Qushlar Sayrashi</option>
                  <option value={BackgroundMusicGenre.NONE}>🔇 Musiqasiz (Faqat toza ovoz)</option>
                </select>
                
                {musicGenre !== BackgroundMusicGenre.NONE && (
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-emerald-500 font-medium">Balandlik:</span>
                    <button
                      type="button"
                      onClick={() => setMusicVolume(5)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${musicVolume <= 5 ? 'bg-emerald-500 text-slate-950' : 'bg-[#041d15] text-emerald-400 hover:text-white'}`}
                    >
                      5% Nozik
                    </button>
                    <button
                      type="button"
                      onClick={() => setMusicVolume(10)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${musicVolume === 10 ? 'bg-emerald-500 text-slate-950' : 'bg-[#041d15] text-emerald-400 hover:text-white'}`}
                    >
                      10% Tavsiya
                    </button>
                    <button
                      type="button"
                      onClick={() => setMusicVolume(20)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${musicVolume === 20 ? 'bg-emerald-500 text-slate-950' : 'bg-[#041d15] text-emerald-400 hover:text-white'}`}
                    >
                      20% O'rtacha
                    </button>
                  </div>
                )}
              </div>

              {/* AI Voice Speaker & Speed */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-emerald-300 uppercase">AI Ovoz Spikeri & Tezlik</label>
                  <span className="text-[10px] text-emerald-400 font-mono">{audioSpeed}x tezlik</span>
                </div>
                <select
                  value={voice}
                  onChange={(e) => setVoice(e.target.value as VoiceType)}
                  className="w-full bg-[#041d15] border border-emerald-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-400 cursor-pointer"
                >
                  <option value={VoiceType.PROFESSIONAL}>🎙️ Samimiy Tabib & Fitoterapevt (Aoede)</option>
                  <option value={VoiceType.FRIENDLY}>🤝 Iliq & Do'stona Maslahatchi (Kore)</option>
                  <option value={VoiceType.CALM}>🎧 Vazmin & Tinch Tabobat Ovozi (Charon)</option>
                  <option value={VoiceType.SERIOUS}>👔 Rasmiy Ilmiy Fitolog (Fenrir)</option>
                  <option value={VoiceType.ENERGETIC}>🔥 Tezkor & Jonli Spiker (Puck)</option>
                </select>

                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-emerald-500 font-medium">Tezlik:</span>
                  {[0.9, 1.0, 1.15].map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => setAudioSpeed(spd)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${audioSpeed === spd ? 'bg-emerald-400 text-slate-950 font-black' : 'bg-[#041d15] text-emerald-400 hover:text-white'}`}
                    >
                      {spd === 0.9 ? '0.9x Vazmin' : spd === 1.0 ? '1.0x Standart' : '1.15x Tezkor'}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* AI ENGINE CONTROL */}
            <div className="pt-2 border-t border-emerald-900/60">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-emerald-300 uppercase flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Jongiyoh Fito AI Dvigateli (2026)
                </span>
                <span className="text-[10px] text-emerald-300 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded-full font-mono">
                  @google/genai SDK
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#041d15] border border-emerald-900/70 p-3.5 rounded-xl">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-emerald-400 uppercase flex items-center justify-between">
                    <span>Ssenariy & YMYL Tahlili</span>
                    <span className="text-[9px] text-emerald-400 font-mono">2026 GA</span>
                  </label>
                  <select
                    value={modelEngine}
                    onChange={(e) => setModelEngine(e.target.value as AIModelEngine)}
                    className="w-full bg-[#072a20] border border-emerald-700 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-white focus:outline-none focus:border-emerald-400 cursor-pointer"
                  >
                    <option value={AIModelEngine.GEMINI_3_8_FLASH}>⚡ gemini-3.8-flash (Tezkor & Aniq Fito Tahlil)</option>
                    <option value={AIModelEngine.GEMINI_3_1_PRO}>🧠 gemini-3.1-pro-preview (Flagman • Chuqur Tibbiy Tahlil)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-emerald-400 uppercase flex items-center justify-between">
                    <span>Botanik Tasvir Modeli</span>
                    <span className="text-[9px] text-emerald-400 font-mono">Real Macro</span>
                  </label>
                  <select
                    value={imageModel}
                    onChange={(e) => setImageModel(e.target.value as ImageModelEngine)}
                    className="w-full bg-[#072a20] border border-emerald-700 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-white focus:outline-none focus:border-emerald-400 cursor-pointer"
                  >
                    <option value={ImageModelEngine.FLASH_LITE_IMAGE}>⚡ gemini-3.1-flash-lite-image (Ultra-tezkor & barqaror)</option>
                    <option value={ImageModelEngine.FLASH_IMAGE}>📸 gemini-3.1-flash-image (Nano Banana 2 • 8K Fotorealizm)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* GENERATE ACTION BUTTON */}
            {activeTab === 'ai_generator' ? (
              <button
                onClick={() => {
                  if (videoEngine === VideoEngine.VEO_AI) {
                    handleGenerateVeoVideo(selectedArticle?.title || articleUrl);
                  } else {
                    handleGenerateReel();
                  }
                }}
                disabled={state.isLoading || (!selectedArticle && !articleUrl.trim())}
                className={`w-full font-black py-4 px-6 rounded-2xl shadow-xl text-sm uppercase tracking-wider transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer border ${
                  videoEngine === VideoEngine.VEO_AI
                    ? 'bg-gradient-to-r from-purple-700 via-emerald-600 to-teal-600 hover:from-purple-600 hover:to-teal-500 text-white shadow-purple-900/30 border-purple-400/40'
                    : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 shadow-emerald-500/20 border-emerald-400/40'
                } disabled:opacity-50`}
              >
                {state.isLoading ? (
                  <div className="flex items-center gap-2">
                    <span className="animate-spin text-lg">⏳</span>
                    <span>{state.loadingStep || "Jongiyoh Video yaratilmoqda..."}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>{videoEngine === VideoEngine.VEO_AI ? '🎬' : '🌿'}</span>
                    <span>{videoEngine === VideoEngine.VEO_AI ? 'GOOGLE VEO REELNI YARATISH' : 'JONGIYOH REELNI YARATISH'}</span>
                    <span className="text-xs bg-slate-950/20 px-2 py-0.5 rounded-full font-mono font-normal">
                      {videoEngine === VideoEngine.VEO_AI ? "Vertex AI • Kinematik" : "YMYL Xavfsiz • 6-8 kadr"}
                    </span>
                  </div>
                )}
              </button>
            ) : activeTab === 'text_to_video' ? (
              <button
                onClick={() => {
                  if (videoEngine === VideoEngine.VEO_AI) {
                    handleGenerateVeoVideo(rawTextTitle, rawTextInput);
                  } else {
                    handleGenerateFromText();
                  }
                }}
                disabled={state.isLoading || !rawTextInput.trim()}
                className={`w-full font-black py-4 px-6 rounded-2xl shadow-xl text-sm uppercase tracking-wider transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer border ${
                  videoEngine === VideoEngine.VEO_AI
                    ? 'bg-gradient-to-r from-purple-700 via-emerald-600 to-teal-600 hover:from-purple-600 hover:to-teal-500 text-white shadow-purple-900/30 border-purple-400/40'
                    : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 shadow-emerald-500/20 border-emerald-400/40'
                } disabled:opacity-50`}
              >
                {state.isLoading ? (
                  <div className="flex items-center gap-2">
                    <span className="animate-spin text-lg">⏳</span>
                    <span>{state.loadingStep || "Matndan video yaratilmoqda..."}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>{videoEngine === VideoEngine.VEO_AI ? '🎬' : '✍️'}</span>
                    <span>{videoEngine === VideoEngine.VEO_AI ? 'MATNDAN GOOGLE VEO YARATISH' : 'MATNDAN VIDEO YARATISH'}</span>
                    <span className="text-xs bg-slate-950/20 px-2 py-0.5 rounded-full font-mono font-normal">
                      {videoEngine === VideoEngine.VEO_AI 
                        ? 'Veo 3.1 & Omni • Kinematik' 
                        : (targetSceneCount > 0 ? `${targetSceneCount} kadr` : 'Avto 4-7 kadr') + ' • Gemini TTS'}
                    </span>
                  </div>
                )}
              </button>
            ) : (
              <button
                onClick={handleGenerateFromCustomMedia}
                disabled={state.isLoading || isProcessingCustom || customImages.length === 0}
                className="w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600 hover:from-emerald-400 hover:to-green-500 disabled:opacity-50 text-slate-950 font-black py-4 px-6 rounded-2xl shadow-xl shadow-emerald-500/20 text-sm uppercase tracking-wider transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer border border-emerald-400/40"
              >
                {isProcessingCustom || state.isLoading ? (
                  <div className="flex items-center gap-2">
                    <span className="animate-spin text-lg">⏳</span>
                    <span>{state.loadingStep || "Medialardan video tayyorlanmoqda..."}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>🎬</span>
                    <span>O'Z MEDIALARIMDAN VIDEO YARATISH</span>
                    <span className="text-xs bg-slate-950/20 px-2 py-0.5 rounded-full font-mono font-normal">
                      {customImages.length} ta rasm {customAudio ? '• MP3 Ovoz' : ''}
                    </span>
                  </div>
                )}
              </button>
            )}

            {state.error && (
              <div className="p-4 rounded-xl bg-red-950/50 border border-red-800 text-xs text-red-300">
                ⚠️ {state.error}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Video Player Studio & Generated Assets (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* VIDEO PLAYER CONTAINER */}
          <div className="bg-[#072a20]/90 border border-emerald-900/70 rounded-2xl p-5 shadow-2xl flex flex-col items-center">
            {state.videoData ? (
              <VideoPlayer
                images={state.videoData.images}
                audioBase64={state.videoData.audioBase64}
                scriptSegments={state.videoData.scriptSegments || state.videoData.script || []}
                scenes={state.videoData.scenes}
                topic={state.videoData.topic}
                handle={channelHandle}
                subtitleStyle={subtitleStyle}
                subtitlePosition={subtitlePosition}
                aspectRatio={aspectRatio}
                musicGenre={musicGenre}
                musicVolume={musicVolume}
                coverHeadline={state.videoData.coverHeadline}
                coverSubtitle={state.videoData.coverSubtitle}
                onEditScript={() => setEditingScript(true)}
                audioSpeed={audioSpeed}
                onSpeedChange={setAudioSpeed}
                customFilename={seoFilename}
                karaokeMode={karaokeMode}
                karaokeChunkSize={karaokeChunkSize}
                showEmojiAccents={showEmojiAccents}
                recipeCard={recipeCardData}
                showRecipeCard={showRecipeCard}
                recipeCardTiming={recipeCardTiming}
                veoVideoUrl={state.videoData.veoVideoUrl}
              />
            ) : (
              <div className="w-[300px] h-[533px] rounded-2xl border-2 border-dashed border-emerald-900 bg-[#041d15] flex flex-col items-center justify-center p-6 text-center text-emerald-500 space-y-3">
                <div className="w-16 h-16 rounded-full bg-[#072a20] flex items-center justify-center text-2xl border border-emerald-800 text-emerald-400">
                  🌿
                </div>
                <h3 className="text-sm font-bold text-emerald-200">Jongiyoh Video Prevyu</h3>
                <p className="text-xs text-emerald-400/80 leading-relaxed">
                  Dorivor giyoh mavzusini tanlang yoki o'z fotosuratlaringiz (10 tagacha) va MP3 audioingizni yuklab "Video Yaratish" tugmasini bosing.
                </p>
                {state.isLoading && (
                  <div className="pt-4 space-y-2 w-full">
                    <div className="w-full bg-emerald-950 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-400 h-full w-2/3 animate-pulse"></div>
                    </div>
                    <span className="text-[11px] text-emerald-300 font-bold block">{state.loadingStep}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SCENES INSPECTOR & MEDIA REPLACEMENT */}
          {state.videoData && (
            <div className="bg-[#072a20]/90 border border-emerald-900/70 rounded-2xl p-5 shadow-xl space-y-4">
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-emerald-200">
                    🎬 Kadrlar ({state.videoData.scenes?.length || state.videoData.images.length} ta)
                  </h3>
                  
                  <button
                    onClick={() => replaceAudioFileInputRef.current?.click()}
                    className="text-[11px] text-emerald-300 hover:text-white font-bold flex items-center gap-1 bg-[#041d15] px-2 py-1 rounded-lg border border-emerald-800 cursor-pointer"
                    title="Loyihaning audio ovozini o'z MP3 faylingiz bilan almashtirish"
                  >
                    🎵 Ovozni MP3 bilan almashtirish
                  </button>
                </div>

                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1 scrollbar-thin">
                  {state.videoData.scenes?.map((scene, idx) => {
                    const isUnsplash = scene.imageSource === 'unsplash' || (state.videoData?.images[idx] && state.videoData.images[idx].includes('unsplash.com'));
                    const isWarning = scene.type === 'warning';
                    
                    return (
                      <div key={scene.id || idx} className={`p-2.5 rounded-xl border text-xs flex items-start gap-2.5 ${isWarning ? 'bg-red-950/30 border-red-900/60' : 'bg-[#041d15] border-emerald-900/80'}`}>
                        <div className="w-16 h-24 rounded-lg bg-emerald-950 border border-emerald-900 overflow-hidden shrink-0 relative group">
                          {state.videoData?.images[idx] && (
                            <img 
                              src={state.videoData.images[idx]} 
                              alt={`Scene ${idx + 1}`} 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <div className="absolute inset-0 bg-black/85 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 transition p-1">
                            <button
                              onClick={() => handleRegenerateSceneImage(idx)}
                              disabled={regeneratingSceneIndex === idx}
                              title="AI orqali qayta chizish"
                              className="text-[9px] bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-1.5 py-1 rounded w-full text-center cursor-pointer transition active:scale-95"
                            >
                              {regeneratingSceneIndex === idx ? "⏳..." : "🌿 AI Chizish"}
                            </button>
                            <button
                              onClick={() => handlePickAlternativeStockPhoto(idx)}
                              title="Boshqa botanik foto tanlash"
                              className="text-[9px] bg-teal-600 hover:bg-teal-500 text-white font-bold px-1.5 py-1 rounded w-full text-center cursor-pointer transition active:scale-95"
                            >
                              📸 Boshqa foto
                            </button>
                            <button
                              onClick={() => {
                                setReplaceTargetSceneIndex(idx);
                                replaceSceneFileInputRef.current?.click();
                              }}
                              title="O'z rasmingizni yuklash"
                              className="text-[9px] bg-[#072a20] hover:bg-emerald-900 text-emerald-200 font-bold px-1.5 py-0.5 rounded w-full text-center cursor-pointer"
                            >
                              📁 O'z rasmingiz
                            </button>
                          </div>
                        </div>

                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center justify-between gap-1 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-black uppercase text-emerald-400">
                                Kadr #{idx + 1}
                              </span>
                              {isWarning ? (
                                <span className="text-[9px] font-bold text-red-300 bg-red-950/80 px-1.5 py-0.5 rounded border border-red-800 flex items-center gap-0.5">
                                  <span>⚠️</span> Qarshi ko'rsatma
                                </span>
                              ) : isUnsplash ? (
                                <span className="text-[9px] font-bold text-teal-300 bg-teal-950/70 px-1.5 py-0.5 rounded border border-teal-800/80 flex items-center gap-0.5">
                                  <span>📸</span> Real Botanik Foto
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold text-emerald-300 bg-emerald-950/70 px-1.5 py-0.5 rounded border border-emerald-800/80 flex items-center gap-0.5">
                                  <span>🌿</span> AI Generatsiya
                                </span>
                              )}
                            </div>

                            {scene.statText && (
                              <span className={`text-[10px] font-black px-1.5 py-0.2 rounded border ${isWarning ? 'text-red-300 bg-red-950/60 border-red-800' : 'text-emerald-400 bg-emerald-950/60 border-emerald-800'}`}>
                                {scene.statText}
                              </span>
                            )}
                          </div>
                          
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={scene.narration || ''}
                              onChange={(e) => handleUpdateActiveSceneSubtitle(idx, e.target.value)}
                              placeholder="Ushbu kadr subtitri..."
                              className="w-full bg-[#072a20] border border-emerald-900 focus:border-emerald-400 rounded px-2.5 py-1.5 text-[11px] text-white focus:outline-none"
                            />
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] text-emerald-600 font-mono shrink-0">🌿 Vizual:</span>
                              <input
                                type="text"
                                value={scene.visualPrompt || ''}
                                onChange={(e) => handleUpdateActiveScenePrompt(idx, e.target.value)}
                                placeholder="Kadrning rasm prompti..."
                                className="w-full bg-[#072a20]/60 border border-emerald-900/60 focus:border-emerald-400 rounded px-2 py-0.5 text-[10px] text-emerald-200 focus:outline-none font-mono truncate hover:overflow-visible focus:overflow-visible"
                                title="Rasmni postdan kelib chiqib chizish uchun prompt"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-0.5 text-[10px] text-emerald-500">
                            <button
                              onClick={() => handleRegenerateSceneImage(idx)}
                              disabled={regeneratingSceneIndex === idx}
                              className="text-emerald-400 hover:text-emerald-200 hover:underline flex items-center gap-0.5 cursor-pointer font-bold"
                            >
                              <span>🌿</span> Post bo'yicha AI chizish
                            </button>
                            <span>•</span>
                            <button
                              onClick={() => handlePickAlternativeStockPhoto(idx)}
                              className="text-teal-400 hover:text-teal-200 hover:underline flex items-center gap-0.5 cursor-pointer font-bold"
                            >
                              <span>📸</span> Boshqa real foto
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SEO & EKSPORT MARKAZI (YouTube Shorts, Reels, TikTok, Google Video) */}
              <div className="pt-3 border-t border-emerald-900/60 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                    <span>🚀</span>
                    <span>SEO & Eksport Markazi (Google, YouTube, Reels)</span>
                  </h4>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded-full font-mono">
                    Video SEO
                  </span>
                </div>

                {/* 1. SEO Fayl Nomi (Download Filename) */}
                <div className="bg-[#041d15] p-3 rounded-xl border border-emerald-800/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-emerald-300 uppercase tracking-wide flex items-center gap-1">
                      <span>📁</span> SEO Fayl Nomi (Yuklab olinganda saqlanadi):
                    </label>
                    <button
                      onClick={handleCopyFilename}
                      className="text-[10px] text-emerald-400 hover:text-white font-bold flex items-center gap-1 cursor-pointer bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800"
                    >
                      {copiedFilename ? "✅ Nusxalandi" : "📋 Nusxa olish"}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={seoFilename}
                      onChange={(e) => setSeoFilename(e.target.value)}
                      placeholder="jongiyoh-mavzu-nomi"
                      className="flex-1 bg-[#072a20] border border-emerald-700/60 rounded-lg px-2.5 py-1.5 text-xs text-emerald-100 font-mono focus:outline-none focus:border-emerald-400"
                    />
                    <span className="text-xs text-emerald-400 font-mono font-bold shrink-0">.mp4</span>
                  </div>
                  <p className="text-[10px] text-emerald-400/80 leading-normal flex items-center gap-1">
                    <span>💡</span> Google & YouTube tavsiyasi: Kichik harflar va defislar (`jongiyoh-qirqbogin-foydasi.mp4`) qidiruv botlariga videongizni tez topishga yordam beradi.
                  </p>
                </div>

                {/* 2. SEO Sarlavha & YouTube Teglari */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="bg-[#041d15] p-2.5 rounded-xl border border-emerald-900 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-400">📌 Video Sarlavhasi (Title):</span>
                      <button
                        onClick={handleCopyTitle}
                        className="text-[9px] text-emerald-400 hover:text-white font-bold"
                      >
                        {copiedTitle ? "✅ Nusxalandi" : "📋 Nusxa"}
                      </button>
                    </div>
                    <p className="text-[11px] text-white font-semibold line-clamp-2">
                      {state.videoData.coverHeadline || state.videoData.topic}
                    </p>
                  </div>

                  <div className="bg-[#041d15] p-2.5 rounded-xl border border-emerald-900 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-400">🏷️ YouTube Teglari (Tags):</span>
                      <button
                        onClick={handleCopyTags}
                        className="text-[9px] text-emerald-400 hover:text-white font-bold"
                      >
                        {copiedTags ? "✅ Nusxalandi" : "📋 Nusxa"}
                      </button>
                    </div>
                    <p className="text-[10px] text-emerald-300 font-mono truncate">
                      {ensureStringArray(state.videoData.hashtags).map(h => h.replace(/^#/, '')).join(', ')}
                    </p>
                  </div>
                </div>

                {/* 3. Instagram Caption & Hashtags */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h5 className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
                      📝 Post Tavsifi & Hashtaglar (Instagram / TikTok):
                    </h5>
                    <button
                      onClick={handleCopyCaption}
                      className="text-xs text-emerald-400 hover:text-emerald-200 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedCaption ? "✅ Nusxalandi" : "📋 Nusxa olish"}
                    </button>
                  </div>
                  <div className="bg-[#041d15] p-3 rounded-xl border border-emerald-900 text-[11px] text-emerald-200 max-h-28 overflow-y-auto whitespace-pre-wrap font-sans leading-relaxed">
                    {state.videoData.instagramCaption || state.videoData.caption}
                    {"\n\n"}
                    {ensureStringArray(state.videoData.hashtags).join(' ')}
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

      </main>

      {/* FACT LOCK INSPECTOR MODAL */}
      {showFactLockModal && selectedArticle && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#06241b] border border-emerald-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-emerald-900 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🛡️</span>
                <h3 className="font-black text-white text-sm">YMYL Tibbiy Xavfsizlik & Qarshi Ko'rsatmalar Tizimi</h3>
              </div>
              <button onClick={() => setShowFactLockModal(false)} className="text-emerald-400 hover:text-white font-bold cursor-pointer">✕</button>
            </div>
            
            <p className="text-xs text-emerald-200 leading-relaxed">
              Quyidagi ma'lumotlar Jongiyoh.uz fito-bazasi va farmakopeya talablari asosida qulflangan:
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              <div className="bg-[#041d15] p-3 rounded-xl border border-red-900/60">
                <span className="text-[10px] font-black uppercase text-red-400 block">⚠️ 30% Majburiy Qarshi Ko'rsatmalar (YMYL):</span>
                <p className="text-xs text-red-200 mt-1">
                  {Array.isArray(selectedArticle.risksAndLimits) ? selectedArticle.risksAndLimits.join(', ') : "Buyrak toshi, o'tkir nefrit, homiladorlik va laktatsiya davrida qat'iyan man etiladi!"}
                </p>
              </div>

              <div className="bg-[#041d15] p-3 rounded-xl border border-emerald-900">
                <span className="text-[10px] font-black uppercase text-emerald-400 block">Aniq doza va damlash me'yori:</span>
                <p className="text-xs text-white mt-1">{ensureStringArray(selectedArticle.lockedFacts?.amounts).join(', ') || selectedArticle.benchmarkStats}</p>
              </div>

              <div className="bg-[#041d15] p-3 rounded-xl border border-emerald-900">
                <span className="text-[10px] font-black uppercase text-teal-400 block">Telegram voronka harakati:</span>
                <p className="text-xs text-teal-200 mt-1">@jongiyoh_bot orqali o'z shaxsiy xavfsiz dozangizni bir daqiqada hisoblang.</p>
              </div>
            </div>

            <button
              onClick={() => setShowFactLockModal(false)}
              className="w-full bg-emerald-900 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
            >
              Yopish
            </button>
          </div>
        </div>
      )}

      {/* EDIT SCRIPT MODAL */}
      {editingScript && state.videoData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#06241b] border border-emerald-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-emerald-900 pb-3">
              <h3 className="font-black text-white text-sm">Fito-Ssenariy va Subtitr Matnini Tahrirlash</h3>
              <button onClick={() => setEditingScript(false)} className="text-emerald-400 hover:text-white font-bold cursor-pointer">✕</button>
            </div>
            
            <p className="text-xs text-emerald-400">
              Har bir gap avtomatik tarzda kadrlar soni bo'yicha taqsimlanadi va ekranda subtitr sifatida chiqadi:
            </p>

            <textarea
              defaultValue={state.videoData.fullScript}
              id="edit-script-textarea"
              rows={8}
              className="w-full bg-[#041d15] border border-emerald-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-400 font-sans leading-relaxed"
            />

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                onClick={() => setEditingScript(false)}
                className="bg-[#041d15] hover:bg-emerald-950 text-emerald-300 font-bold py-2.5 px-4 rounded-xl text-xs transition cursor-pointer"
              >
                Bekor qilish
              </button>
              <button
                onClick={() => {
                  const val = (document.getElementById('edit-script-textarea') as HTMLTextAreaElement)?.value;
                  if (val) handleSaveEditedScript(val, false);
                }}
                className="flex-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
              >
                Subtitrlarni yangilash (Ovozni saqlab)
              </button>
              <button
                onClick={() => {
                  const val = (document.getElementById('edit-script-textarea') as HTMLTextAreaElement)?.value;
                  if (val) handleSaveEditedScript(val, true);
                }}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-2.5 rounded-xl text-xs transition cursor-pointer"
              >
                Saqlash & AI Ovozni qayta yozish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VEO LIVE PROGRESS MODAL */}
      {showVeoModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#06241b] border border-emerald-700/80 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-emerald-900 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center text-lg font-black border border-purple-500/40">
                  🎬
                </div>
                <div>
                  <h3 className="font-black text-white text-sm">Google Veo 3.1 & Omni Studio</h3>
                  <p className="text-[10px] text-emerald-400 font-mono">Vertex AI • gen-lang-client-0604912271</p>
                </div>
              </div>
              <span className="text-xs font-black px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                {veoModel === 'omni' ? 'Gemini Omni' : 'Veo 3.1 Fast'}
              </span>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-emerald-300">
                  {veoJobState?.message || state.loadingStep || "Video render qilinmoqda..."}
                </span>
                <span className="text-emerald-400 font-mono font-black">
                  {veoJobState?.progress ?? 10}%
                </span>
              </div>
              <div className="w-full bg-[#041d15] h-3 rounded-full overflow-hidden border border-emerald-900">
                <div 
                  className="bg-gradient-to-r from-emerald-500 via-teal-400 to-green-400 h-full transition-all duration-500"
                  style={{ width: `${Math.max(5, veoJobState?.progress ?? 10)}%` }}
                />
              </div>
            </div>

            {/* 4 Pipeline Milestones */}
            <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
              <div className={`p-2 rounded-xl border ${ (veoJobState?.progress ?? 10) >= 15 ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200' : 'bg-[#041d15] border-emerald-900 text-emerald-600'}`}>
                <div className="font-bold">1. Ssenariy</div>
                <div className="text-[9px] mt-0.5">11-14 so'z</div>
              </div>
              <div className={`p-2 rounded-xl border ${ (veoJobState?.progress ?? 10) >= 30 ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200' : 'bg-[#041d15] border-emerald-900 text-emerald-600'}`}>
                <div className="font-bold">2. Veo Render</div>
                <div className="text-[9px] mt-0.5">Vertex AI</div>
              </div>
              <div className={`p-2 rounded-xl border ${ (veoJobState?.progress ?? 10) >= 80 ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200' : 'bg-[#041d15] border-emerald-900 text-emerald-600'}`}>
                <div className="font-bold">3. Auto-Trim</div>
                <div className="text-[9px] mt-0.5">0.6s jimlik</div>
              </div>
              <div className={`p-2 rounded-xl border ${ (veoJobState?.progress ?? 10) >= 95 ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200' : 'bg-[#041d15] border-emerald-900 text-emerald-600'}`}>
                <div className="font-bold">4. Tayyor</div>
                <div className="text-[9px] mt-0.5">MP4 video</div>
              </div>
            </div>

            {/* Completed clips preview if any */}
            {veoJobState?.clips && veoJobState.clips.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold text-emerald-400 uppercase">
                  Tayyor bo'lgan kadrlar ({veoJobState.clips.length} ta):
                </span>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {veoJobState.clips.map((c, i) => (
                    <div key={i} className="w-16 h-20 bg-black/60 rounded-lg overflow-hidden border border-emerald-800 shrink-0 relative">
                      <video src={c.url} className="w-full h-full object-cover" muted autoPlay loop playsInline />
                      <span className="absolute bottom-1 right-1 bg-black/80 text-[8px] font-bold px-1 rounded text-emerald-300">
                        #{i + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Credit & time notice */}
            <div className="bg-[#041d15] p-3 rounded-xl border border-emerald-900/80 text-[11px] text-emerald-300/90 leading-relaxed flex items-start gap-2">
              <span className="text-base">💡</span>
              <span>
                Generatsiya taxminan <strong>3–5 daqiqa</strong> davom etadi. Google Cloud $300 bepul kreditidan hisoblanadi (~$8.5). Jarayon tugaguncha sahifani yopmang.
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-emerald-900">
              <button
                onClick={handleCancelVeoGeneration}
                className="text-xs text-red-400 hover:text-red-300 font-bold px-3 py-1.5 rounded-lg hover:bg-red-950/40 transition cursor-pointer"
              >
                Bekor qilish
              </button>
              <span className="text-[10px] text-emerald-500 font-mono">
                {veoJobState?.id ? `Job: ${veoJobState.id.slice(0, 8)}...` : 'Tayyorlanmoqda...'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* HISTORY DRAWER / MODAL */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#06241b] border border-emerald-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-emerald-900 pb-3">
              <h3 className="font-black text-white text-sm">Yaratilgan Jongiyoh Videolari Tarixi</h3>
              <button onClick={() => setShowHistory(false)} className="text-emerald-400 hover:text-white font-bold cursor-pointer">✕</button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {savedProjects.map(proj => (
                <div
                  key={proj.id}
                  onClick={() => loadProject(proj)}
                  className="bg-[#041d15] hover:bg-[#072a20] p-3 rounded-xl border border-emerald-900 flex items-center justify-between cursor-pointer transition"
                >
                  <div className="min-w-0 pr-2">
                    <h4 className="text-xs font-bold text-white line-clamp-1">{proj.topic}</h4>
                    <span className="text-[10px] text-emerald-500 font-mono">
                      {new Date(proj.timestamp).toLocaleDateString()} • {proj.videoData.scenes?.length || proj.videoData.images.length} kadr
                    </span>
                  </div>
                  <button
                    onClick={(e) => deleteProject(proj.id, e)}
                    className="text-emerald-500 hover:text-red-400 text-xs p-1"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="border-t border-emerald-950/80 py-6 text-center text-xs text-emerald-500/80">
        <a href="https://jongiyoh.uz" target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">Jongiyoh.uz</a> Tabiiy Dorivor Giyohlar & Fitoterapiya Platformasi • O'zbekiston
      </footer>
    </div>
  );
};

export default App;
