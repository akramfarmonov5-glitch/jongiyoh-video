export enum ImageMode {
  GENERATE = 'GENERATE',
  FIND = 'FIND',
  UPLOAD = 'UPLOAD',
}

export enum VoiceType {
  PROFESSIONAL = 'Professional', // Aoede - Malakali fitoterapevt / shifokor ovozi
  FRIENDLY = 'Friendly',         // Kore - Samimiy salomatlik va giyohlar maslahatchisi
  SERIOUS = 'Serious',           // Fenrir - Tajribali tabib / Ibn Sino merosi tahlilchisi
  CALM = 'Calm',                 // Charon - Xotirjam va ishonchli fito-konsultant
  ENERGETIC = 'Energetic',       // Puck - Faol va chaqqon sog'lom hayot targ'ibotchisi
}

export enum SubtitleStyle {
  HORMOZI_EMERALD = 'HORMOZI_EMERALD', // 🔥 Trend Zumrad Karaoke (Faol so'z yashil plashkada sakraydi)
  HORMOZI_GOLD = 'HORMOZI_GOLD',       // ⚡ Viral Oltin-Sariq (Hormozi / TikTok trendi)
  NEON_PULSE = 'NEON_PULSE',           // ✨ Neon Glow & Charaqlovchi nurlar
  EMERALD_HERBS = 'EMERALD_HERBS',     // 🟢 Tabiiy zumrad yashil & toza oq glow
  GOLDEN_HONEY = 'GOLDEN_HONEY',       // 🟡 Iliq asal & kurkumin tillarang
  WARNING_RED = 'WARNING_RED',         // 🔴 YMYL xavfsizlik va qarshi ko'rsatma ogohlantirishi
  CLEAN_MINIMAL = 'CLEAN_MINIMAL',     // 🖤 Toza shifobaxsh obsidian qora shisha

  // Backwards compatibility aliases
  NEON_CYBER = 'NEON_CYBER',
  YELLOW_VIRAL = 'YELLOW_VIRAL',
  EMERALD_TECH = 'EMERALD_TECH',
  PURPLE_FUTURE = 'PURPLE_FUTURE',
  MINIMAL_DARK = 'MINIMAL_DARK',
}

export enum SubtitlePosition {
  BOTTOM = 'BOTTOM', // Safe zone for Instagram Reels / TikTok / YouTube Shorts
  CENTER = 'CENTER',
  TOP = 'TOP',
}

export enum AspectRatio {
  PORTRAIT = '9:16',  // 1080 x 1920 (Instagram Reels / TikTok / YouTube Shorts)
  SQUARE = '1:1',     // 1080 x 1080 (Instagram / Telegram post)
  LANDSCAPE = '16:9', // 1920 x 1080 (YouTube / Web video)
}

export enum AIModelEngine {
  GEMINI_3_8_FLASH = 'gemini-3.8-flash',         // Eng so'nggi tezkor & o'tkir model (2026 GA)
  GEMINI_3_1_PRO = 'gemini-3.1-pro-preview',     // Chuqur tibbiy-ilmiy tahlilchi model
}

export enum ImageModelEngine {
  FLASH_IMAGE = 'gemini-3.1-flash-image',        // Yuqori sifatli 8K kinematik fotosuratlar
  FLASH_LITE_IMAGE = 'gemini-3.1-flash-lite-image', // Ultra-tezkor tabiiy vizual generatsiya
}

export enum VisualGenerationStrategy {
  HYBRID = 'HYBRID',       // 4 ta AI + 3 ta Unsplash tabiiy foto (Tavsiya etiladi: tez & real)
  ALL_AI = 'ALL_AI',       // 100% AI generatsiya (barcha kadrlar AI tomonidan chiziladi)
  ALL_REAL = 'ALL_REAL',   // 100% Haqiqiy Unsplash fitoterapiya fotosuratlari
}

export enum ReelStyle {
  AUTO = 'AUTO',
  FITO_GUIDE = 'FITO_GUIDE',                     // Damlama & To'g'ri damlash tartibi
  JOINT_HEALTH = 'JOINT_HEALTH',                 // Bo'g'imlar va harakat erkinligi
  CONTRAINDICATION_ALERT = 'CONTRAINDICATION_ALERT', // 30% Qarshi ko'rsatmalar & Xavfsizlik (YMYL)
  HERB_DEEP_DIVE = 'HERB_DEEP_DIVE',             // Giyoh sirlari & Ilmiy tahlil
  NATURAL_COURSE = 'NATURAL_COURSE',             // 21 kunlik tabiiy tiklanish kursi
  
  // Aliases for compatibility
  BREAKING_NEWS = 'FITO_GUIDE',
  TECH_BREAKTHROUGH = 'HERB_DEEP_DIVE',
  DEEP_DIVE = 'HERB_DEEP_DIVE',
  AI_TOOLS = 'JOINT_HEALTH',
  FUTURE_ROBOTS = 'NATURAL_COURSE',
}

export enum VisualGenre {
  AUTO = 'AUTO',
  HERBAL_BOTANICAL_MACRO = 'HERBAL_BOTANICAL_MACRO',     // Jonli dorivor giyohlar (makro tabiat)
  APOTHECARY_PREPARATION = 'APOTHECARY_PREPARATION',     // Damlama tayyorlash & chinni choynak
  ANCIENT_MEDICINE_HERITAGE = 'ANCIENT_MEDICINE_HERITAGE', // Ibn Sino tabobati & qadimiy qo'lyozmalar
  MOUNTAIN_HERBS_NATURE = 'MOUNTAIN_HERBS_NATURE',       // O'zbekiston tog' giyohlari & toza tabiat
  CLEAN_WELLNESS_LIFESTYLE = 'CLEAN_WELLNESS_LIFESTYLE', // Sog'lom hayot & bo'g'imlar harakati
  HERBAL_LAB_SCIENCE = 'HERBAL_LAB_SCIENCE',             // Fitoterapiya ilmiy tahlili & ekstraktlar

  // Direct UI names
  HERBAL_TEAPOT = 'HERBAL_TEAPOT',
  BOTANICAL_MACRO = 'BOTANICAL_MACRO',
  ANCIENT_HEALER = 'ANCIENT_HEALER',
  HEALTHY_JOINTS = 'HEALTHY_JOINTS',
  APOTHECARY_LAB = 'APOTHECARY_LAB',

  // Aliases for compatibility
  PHOTOJOURNALISM_DOC = 'PHOTOJOURNALISM_DOC',
  CYBER_FUTURISTIC = 'CYBER_FUTURISTIC',
  SILICON_VALLEY = 'SILICON_VALLEY',
  AI_NEURAL_NETWORK = 'AI_NEURAL_NETWORK',
  ROBOTICS_HARDWARE = 'ROBOTICS_HARDWARE',
  MODERN_MINIMAL_TECH = 'MODERN_MINIMAL_TECH',
  DATA_CENTER_INFRA = 'DATA_CENTER_INFRA',
}

export enum BackgroundMusicGenre {
  NATURE_CALM = 'NATURE_CALM',           // Tinchlantiruvchi tabiat ohangi
  MEDITATION_CHILL = 'MEDITATION_CHILL', // Meditatsiya va chuqur xotirjamlik
  WATER_STREAM = 'WATER_STREAM',         // Mayin suv oqimi va shudring
  ORIENTAL_NEY = 'ORIENTAL_NEY',         // Sharqona ney va ud
  MOUNTAIN_BREEZE = 'MOUNTAIN_BREEZE',   // Tog' shamoli va qushlar
  MEDITATIVE_NEY = 'MEDITATIVE_NEY',     // Sharqona mayin ney va tor ohanglari
  ORGANIC_WELLNESS = 'ORGANIC_WELLNESS', // Yumshoq akustik salomatlik akkordlari
  WARM_HERBAL_LOFI = 'WARM_HERBAL_LOFI', // Iliq va shinam fito-lofi
  NONE = 'NONE',                         // Musiqasiz (toza diktor ovozi)

  // Aliases for compatibility
  TECH_STARTUP = 'TECH_STARTUP',
  CYBER_PULSE = 'CYBER_PULSE',
  NEURAL_FLOW = 'NEURAL_FLOW',
  TECH_MINIMAL = 'TECH_MINIMAL',
  CINEMATIC_TECH = 'CINEMATIC_TECH',
}

export interface LockedFacts {
  amounts: string[];             // Dozalar: 1 osh qoshiq, 200 ml suv, 2 mahal
  percentages: string[];         // Samaradorlik: 85% yallig'lanish kamayishi, 2000% so'rilish
  calculations: string[];        // Qabul qilish vaqti: ovqatdan 30 daqiqa oldin
  dates: string[];               // Kurs muddati: 21 kunlik qabul, 7 kun tanaffus
  contraindications?: string[];  // 30% majburiy blok: homiladorlik, buyrak toshi, dori o'zaro ta'siri
  legalClaims: string[];         // Rasmiy ilmiy manbalar: Ibn Sino "Tib qonunlari", PubMed
  disclaimer?: string;           // Dori vositasi emasligi haqida ogohlantirish
  otherCriticalFacts: string[];  // Telegram botda shaxsiy doza hisoblash
}

export interface AIArticle {
  url: string;
  title: string;
  category?: string;
  summary?: string;
  keyInnovation?: string;
  impactOnUsers?: string;
  benchmarkStats?: string;
  howToTry?: string[];
  techSpecs?: string[];
  risksAndLimits?: string[];
  nextMilestone?: string;
  tags?: string[];
  rawContent?: string;
  lockedFacts: LockedFacts;
  // Fitoterapiya va YMYL maxsus maydonlari:
  contraindications?: string[];
  preparationGuide?: string[];
  scientificSources?: string[];
  telegramCta?: string;
}

// Backwards compatibility aliases
export type BusinessArticle = AIArticle;
export type JongiyohArticle = AIArticle;

export type SceneType = 
  | 'hook' 
  | 'benefit' 
  | 'recipe' 
  | 'warning' 
  | 'science' 
  | 'course' 
  | 'cta'
  // Compatibility types
  | 'news' 
  | 'specs' 
  | 'benchmark' 
  | 'impact' 
  | 'practical';

export interface RecipeCardData {
  title?: string;
  dosage: string;
  water: string;
  steepTime: string;
  frequency: string;
  duration?: string;
  warning: string;
  callToAction?: string;
}

export interface ReelScene {
  id: string;
  order: number;
  type: SceneType;
  narration: string;
  subtitleText?: string;
  visualPrompt: string;
  imageUrl?: string;
  imageSource?: 'ai' | 'unsplash' | 'custom';
  stockKeyword?: string;
  customImage?: string;
  duration?: number;
  headline?: string;
  statText?: string;
  visualMotion?: 'push-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'parallax';
  emphasisWords?: string[];
  isInfographic?: boolean;
  infoCardData?: {
    title: string;
    mainStat: string;
    subStat?: string;
    label?: string;
  };
  recipeData?: RecipeCardData;
}

export interface VideoData {
  topic: string;
  articleTitle?: string;
  articleUrl?: string;
  hook?: string;
  script?: string[];
  scriptSegments?: string[];
  fullScript: string;
  scenes: ReelScene[];
  hashtags: string[];
  caption?: string;
  instagramCaption?: string;
  telegramCaption?: string;
  coverHeadline: string;
  coverSubtitle?: string;
  imagePrompts: string[];
  images: string[];
  imageUrls?: string[];
  audioBase64: string;
  sources?: { title: string; uri: string }[];
  timestamp?: number;
  lockedFacts?: LockedFacts;
  aiArticle?: AIArticle;
  businessArticle?: AIArticle;
  visualGenre?: VisualGenre;
  reelStyle?: ReelStyle;
  recipeCard?: RecipeCardData;
}

export interface SavedProject {
  id: string;
  topic: string;
  articleUrl?: string;
  timestamp: number;
  videoData: VideoData;
  caption?: string;
  coverHeadline?: string;
}

export interface PipelineStep {
  id: string;
  title: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  detail?: string;
}

export interface CustomImageItem {
  id: string;
  url: string;
  name: string;
  subtitle?: string;
  headline?: string;
  statText?: string;
}

export interface CustomAudioItem {
  name: string;
  base64: string;
  duration?: number;
  sizeFormatted?: string;
}

export interface AppState {
  isLoading: boolean;
  loadingStep: string;
  error: string | null;
  videoData: VideoData | null;
  pipelineSteps?: PipelineStep[];
}
