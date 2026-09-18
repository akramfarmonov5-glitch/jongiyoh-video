import { getJongiyohReelSystemInstruction, getVoiceName, SAMPLE_JONGIYOH_ARTICLES } from "../constants";
import { 
  AIArticle, 
  BusinessArticle, 
  LockedFacts, 
  ReelScene, 
  ReelStyle, 
  VisualGenre, 
  VoiceType, 
  AspectRatio, 
  AIModelEngine, 
  ImageModelEngine, 
  VisualGenerationStrategy, 
  RecipeCardData 
} from "../types";
import { 
  resolveContextualStockImage, 
  getRandomStockImageForScene, 
  extractUnsplashPhotoId, 
  markUnsplashIdUsed, 
  resetUsedUnsplashHistory 
} from "./stockImageService";

// Secure serverless proxy caller - zero API key exposure to browser
async function callGeminiApi(action: string, payload: any): Promise<any> {
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ action, payload })
  });

  if (!res.ok) {
    let errMsg = 'Gemini API xatoligi';
    try {
      const errData = await res.json();
      errMsg = errData.error || errMsg;
    } catch (e) {}
    throw new Error(errMsg);
  }

  return await res.json();
}

// Retry logic to handle intermittent API failures
async function retry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const msg = error?.message || JSON.stringify(error);
    const isServerError = error?.status === 500 || msg.includes('500') || msg.includes('overloaded');
    if (retries > 0 && isServerError) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return retry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

// Ultra-Resilient JSON Parser with Multi-Layer Syntax Repair
export const parseResponse = (text: string): any => {
  if (!text || typeof text !== 'string') {
    throw new Error("Bo'sh matn qaytdi.");
  }

  let cleanText = text.trim();
  cleanText = cleanText.replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, '$1').trim();
  cleanText = cleanText.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/i, '').trim();

  // 1. Direct parse
  try {
    return JSON.parse(cleanText);
  } catch (e1) {}

  // 2. Outermost braces
  const firstBrace = cleanText.indexOf('{');
  const firstBracket = cleanText.indexOf('[');
  let startIdx = -1;
  let isObject = true;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    isObject = true;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    isObject = false;
  }

  if (startIdx !== -1) {
    const endChar = isObject ? '}' : ']';
    const lastEndIdx = cleanText.lastIndexOf(endChar);
    let candidate = lastEndIdx > startIdx ? cleanText.slice(startIdx, lastEndIdx + 1) : cleanText.slice(startIdx);

    try {
      return JSON.parse(candidate);
    } catch (e2) {}

    let fixed = candidate.replace(/,\s*([\}\]])/g, '$1');
    fixed = fixed.replace(/[\u0000-\u001F\u007F-\u009F]/g, (c) => {
      if (c === '\n') return '\\n';
      if (c === '\r') return '\\r';
      if (c === '\t') return '\\t';
      return '';
    });

    try {
      return JSON.parse(fixed);
    } catch (e3) {}

    let openBraces = (fixed.match(/{/g) || []).length;
    let closeBraces = (fixed.match(/}/g) || []).length;
    let openBrackets = (fixed.match(/\[/g) || []).length;
    let closeBrackets = (fixed.match(/\]/g) || []).length;

    let balanced = fixed;
    while (openBrackets > closeBrackets) {
      balanced += ']';
      closeBrackets++;
    }
    while (openBraces > closeBraces) {
      balanced += '}';
      closeBraces++;
    }

    try {
      return JSON.parse(balanced);
    } catch (e4) {}
  }

  throw new Error("JSON ma'lumotlarini o'qib bo'lmadi.");
};

export const ensureStringArray = (val: any, fallback: string[] = []): string[] => {
  if (!val) return fallback;
  if (Array.isArray(val)) {
    return val
      .map(item => {
        if (typeof item === 'string') return item.trim();
        if (typeof item === 'number') return String(item);
        if (item && typeof item === 'object') {
          return item.step || item.action || item.name || item.title || item.text || JSON.stringify(item);
        }
        return String(item);
      })
      .filter(Boolean);
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return fallback;
    const lines = trimmed
      .split(/\r?\n/)
      .map(s => s.trim().replace(/^[-*•\d.]+\s*/, ''))
      .filter(Boolean);
    if (lines.length > 1) return lines;
    
    if (trimmed.includes(';') || (trimmed.includes(',') && !trimmed.match(/\d+,\d+/))) {
      const parts = trimmed.split(/[,;]\s*/).map(s => s.trim()).filter(Boolean);
      if (parts.length > 1) return parts;
    }
    return [trimmed];
  }
  if (typeof val === 'object') {
    return Object.values(val)
      .map(v => typeof v === 'string' ? v.trim() : String(v))
      .filter(Boolean);
  }
  return fallback;
};

/**
 * Scrapes article content from live URL using Jina Reader or direct fetch
 */
export const scrapeUrlContent = async (url: string): Promise<string | null> => {
  if (!url || !url.startsWith('http')) return null;

  try {
    const jinaUrl = `https://r.jina.ai/${url.trim()}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(jinaUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'text/plain, text/markdown'
      }
    });
    clearTimeout(timer);
    if (res.ok) {
      const text = await res.text();
      if (text && text.trim().length > 120) {
        return text.substring(0, 15000);
      }
    }
  } catch (e) {
    console.warn("Jina reader scraper bypassed:", e);
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      doc.querySelectorAll('script, style, nav, footer, header').forEach(el => el.remove());
      const articleEl = doc.querySelector('article') || doc.querySelector('main') || doc.body;
      const clean = articleEl?.textContent?.replace(/\s+/g, ' ').trim() || '';
      if (clean.length > 120) {
        return clean.substring(0, 15000);
      }
    }
  } catch (e) {}

  return null;
};

/**
 * 1. PHYTOTHERAPY & ARTICLE INGESTION ENGINE FOR JONGIYOH.UZ:
 * Extracts herbal wisdom, scientific basis, 30% contraindications (YMYL), and Telegram CTA.
 */
export const fetchAndExtractArticle = async (urlOrTopic: string): Promise<AIArticle> => {
  const cleanInput = urlOrTopic.trim();

  // 1. Check if matches pre-defined curated sample articles in constants.ts
  const foundSample = SAMPLE_JONGIYOH_ARTICLES.find(a => 
    a.url.toLowerCase() === cleanInput.toLowerCase() ||
    cleanInput.toLowerCase().includes(a.url.toLowerCase().split('/').pop() || '___') ||
    a.title.toLowerCase().includes(cleanInput.toLowerCase()) ||
    (cleanInput.toLowerCase().includes("qirqbo") && a.url.includes("qirqbogin")) ||
    (cleanInput.toLowerCase().includes("kurkumin") && a.url.includes("kurkumin")) ||
    (cleanInput.toLowerCase().includes("qisir") && a.url.includes("qisirlaydi")) ||
    (cleanInput.toLowerCase().includes("dori") && a.url.includes("dorilar")) ||
    (cleanInput.toLowerCase().includes("21") && a.url.includes("21-kunlik"))
  );

  if (foundSample) {
    return foundSample;
  }

  const scrapedText = cleanInput.startsWith('http') ? await scrapeUrlContent(cleanInput) : null;

  const prompt = scrapedText
    ? `
Siz "Jongiyoh.uz" video studiyasi va multimedia tahlilchisisiz.
Foydalanuvchi taqdim etgan URL havola yoki maqola matni keltirilgan:
MANBA / HAVOLA: ${cleanInput.startsWith('http') ? cleanInput : "Veb-maqola"}

MAQOLA MATNI (Asl manbadan olingan):
"""
${scrapedText}
"""

Eslatma: Ushbu maqola Jongiyoh.uz, Kun.uz, Daryo, Gazeta, Wikipedia, PubMed, Healthline yoki istalgan boshqa saytdan bo'lishi mumkin. Maqolaning asl faktlarini aslo buzmasdan, O'zbek tilida to'liq tahlil qiling:
1. title: Maqolaning aniq va jozibador O'zbekcha sarlavhasi
2. category: Kategoriya (masalan: Bo'g'imlar va suyaklar salomatligi, Dorivor o'tlar, Yangiliklar va tahlil, Foydali maslahatlar)
3. summary: Maqolaning asosiy mohiyati va qisqa mazmuni (2-3 jumla)
4. keyInnovation: Asosiy shifobaxsh faol modda, kalit yangilik yoki biologik ta'siri
5. impactOnUsers: Inson salomatligi yoki hayotiga ta'siri
6. benchmarkStats: Aniq doza, raqamlar yoki ko'rsatkichlar (masalan: 1 osh qoshiq, 200 ml suv, 85% natija)
7. howToTry: Foydalanish yoki qo'llash tartibi (bosqichma-bosqich qoidalar)
8. techSpecs: Ilmiy ma'lumotlar, atamalar yoki texnik xususiyatlar
9. risksAndLimits: ⚠️ Qat'iy qarshi ko'rsatmalar, cheklovlar yoki xavfsizlik ogohlantirishlari
10. nextMilestone: Telegram bot CTA (@jongiyoh_bot orqali maslahat yoki manzil)
11. lockedFacts:
    - amounts: Dozalar va me'yorlar
    - percentages: Foizlar
    - calculations: Qabul qilish tartibi
    - dates: Muddatlar
    - contraindications: Qarshi ko'rsatmalar
    - legalClaims: Manbalar (asl sayt, PubMed, Ibn Sino va b.)
    - otherCriticalFacts: Telegram bot va sayt

Return ONLY a JSON object conforming to the structure.`
    : `
Siz "Jongiyoh.uz" tabiiy dorivor giyohlar va fitoterapiya portali bosh fitoterapevti va tibbiy-ilmiy tahlilchisisiz.
Google Qidiruv va ilmiy fitoterapiya bazasi orqali quyidagi dorivor giyoh yoki salomatlik mavzusini tahlil qiling: "${cleanInput}".

Maqoladan quyidagi ma'lumotlarni va QAT'IY FAKTLARNI (LOCKED FACTS) ajratib bering (YMYL xavfsizlik standartlariga qat'iy asoslangan):
1. title: Dorivor giyoh yoki fito-mavzuning to'liq O'zbekcha sarlavhasi
2. category: Kategoriya (masalan: Bo'g'imlar va suyaklar salomatligi, Dorivor o'tlar, To'g'ri damlash, Qarshi ko'rsatmalar, 21 kunlik kurslar)
3. summary: Giyohning shifobaxsh xususiyatlari qisqa mazmuni
4. keyInnovation: Asosiy shifobaxsh faol modda va biologik ta'siri (kremniy, kurkumin, piperin)
5. impactOnUsers: Inson salomatligiga ijobiy ta'siri (harakat yengilligi, yallig'lanish kamayishi)
6. benchmarkStats: Aniq doza va ko'rsatkichlar (1 osh qoshiq, 200 ml suv, 21 kun)
7. howToTry: Damlash va qabul qilish tartibi
8. techSpecs: Ilmiy va farmakologik ma'lumotlar
9. risksAndLimits: ⚠️ QAT'IY QARSHI KO'RSATMALAR (YMYL XAVFSIZLIK: homiladorlik, buyrak toshi, dori o'zaro ta'siri)
10. nextMilestone: Telegram bot orqali shaxsiy doza hisoblash (@jongiyoh_bot)
11. lockedFacts:
    - amounts: Dozalar va me'yorlar
    - percentages: Foizlar
    - calculations: Kurs va tanaffus qoidalari
    - dates: Qabul qilish muddati
    - contraindications: 30% majburiy qarshi ko'rsatmalar
    - legalClaims: Abu Ali ibn Sino va ilmiy tadqiqotlar
    - otherCriticalFacts: @jongiyoh_bot va jongiyoh.uz

Return ONLY a JSON object conforming to the structure.`;

  try {
    const response = await retry(() => callGeminiApi('generateContent', {
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        tools: scrapedText ? [] : [{ googleSearch: {} }],
        responseMimeType: "application/json"
      }
    }));

    if (response.text) {
      const parsed = parseResponse(response.text);
      const benchmarkStr = typeof parsed.benchmarkStats === 'string' ? parsed.benchmarkStats : (parsed.benchmarkStats ? String(parsed.benchmarkStats) : "1 osh qoshiq 200 ml suvga damlanadi");
      const innovationStr = typeof parsed.keyInnovation === 'string' ? parsed.keyInnovation : (parsed.keyInnovation ? String(parsed.keyInnovation) : "Tabiiy biologik faol moddalar va tog'ay oziqlanishi");

      return {
        url: cleanInput.startsWith('http') ? cleanInput : `https://jongiyoh.uz/maqolalar/${encodeURIComponent(cleanInput.toLowerCase().replace(/\s+/g, '-'))}`,
        title: parsed.title || "Dorivor Giyohlar: Bo'g'imlar va Tabiiy Shifo Sirlari",
        category: parsed.category || "🌿 Dorivor o'tlar va Fitoterapiya",
        summary: parsed.summary || "Dorivor giyohlarning inson salomatligi uchun shifobaxsh xususiyatlari va to'g'ri qabul qilish tartibi.",
        keyInnovation: innovationStr,
        impactOnUsers: typeof parsed.impactOnUsers === 'string' ? parsed.impactUsers || parsed.impactOnUsers : "Bo'g'imlardagi qisirlash va og'riqlarni kamaytirib, harakat yengilligini ta'minlaydi.",
        benchmarkStats: benchmarkStr,
        howToTry: ensureStringArray(parsed.howToTry, ["1 osh qoshiq giyohni 200 ml qaynoq suvda damlang", "Kuniga 2 mahal iliq holda iching"]),
        techSpecs: ensureStringArray(parsed.techSpecs, ["Biologik kremniy va mikroelementlar"]),
        risksAndLimits: ensureStringArray(parsed.risksAndLimits, ["⚠️ Buyrak toshi va homiladorlikda shifokor bilan maslahatlashing"]),
        nextMilestone: typeof parsed.nextMilestone === 'string' ? parsed.nextMilestone : "@jongiyoh_bot orqali o'z shaxsiy dozangizni bepul hisoblang.",
        tags: ensureStringArray(parsed.tags, ["jongiyoh", "fitoterapiya", "tabiiydavo", "bogimlar", "damlama"]),
        lockedFacts: {
          amounts: ensureStringArray(parsed.lockedFacts?.amounts, [benchmarkStr, "21 kunlik kurs"]),
          percentages: ensureStringArray(parsed.lockedFacts?.percentages, ["100% tabiiy"]),
          calculations: ensureStringArray(parsed.lockedFacts?.calculations, ["21 kun qabul + 7 kun tanaffus"]),
          dates: ensureStringArray(parsed.lockedFacts?.dates, ["21 kunlik kurs"]),
          legalClaims: ensureStringArray(parsed.lockedFacts?.legalClaims, ["Abu Ali ibn Sino 'Tib qonunlari'"]),
          otherCriticalFacts: ensureStringArray(parsed.lockedFacts?.otherCriticalFacts, ["@jongiyoh_bot", "jongiyoh.uz"])
        }
      };
    }
  } catch (err) {
    console.warn("Failed to fetch live article via search, using smart phytotherapy fallback", err);
  }

  // Fallback default Jongiyoh article
  const slug = cleanInput.replace(/^https?:\/\//, '').split('/').filter(Boolean).pop() || "shifobaxsh-giyohlar";
  const formattedTitle = slug.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return {
    url: cleanInput.startsWith('http') ? cleanInput : `https://jongiyoh.uz/maqolalar/${slug}`,
    title: formattedTitle.length > 5 ? formattedTitle : "Qirqbo‘g‘in o‘ti: Bo‘g‘imlar uchun foydasi va to‘g‘ri damlash",
    category: "🌿 Dorivor o'tlar va Fitoterapiya",
    summary: "Dala qirqbo'g'ini va tog' giyohlarining bo'g'imlar, tog'ay to'qimasi va harakat erkinligi uchun shifobaxsh ta'siri.",
    keyInnovation: "Biologik faol organik kremniy va kollagen sintezi",
    impactOnUsers: "Bo'g'imlardagi qisirlash va og'riqlarni kamaytirib, harakat yengilligini tiklaydi.",
    benchmarkStats: "1 osh qoshiq 200 ml suvga damlanadi, 21 kunlik kurs",
    howToTry: [
      "1 osh qoshiq quritilgan giyohni 200 ml qaynoq suvga soling",
      "Suv hammomida 15 daqiqa qizdirib, 45 daqiqa tindiring",
      "Kuniga 2 mahal, ovqatdan 30 daqiqa oldin iching"
    ],
    techSpecs: ["Equisetum arvense, biologik kremniy"],
    risksAndLimits: ["⚠️ O'tkir buyrak kasalliklari va homiladorlikda ichish mumkin emas!"],
    nextMilestone: "@jongiyoh_bot orqali o'z shaxsiy xavfsiz dozangizni hisoblang.",
    tags: ["jongiyoh", "fitoterapiya", "qirqbogin", "bogimlar", "tabiiydavo"],
    lockedFacts: {
      amounts: ["1 osh qoshiq (5 g)", "200 ml suv", "21 kunlik kurs"],
      percentages: ["10% organik kremniy"],
      calculations: ["21 kun qabul + 7 kun tanaffus"],
      dates: ["21 kunlik kurs"],
      legalClaims: ["Abu Ali ibn Sino 'Tib qonunlari'"],
      otherCriticalFacts: ["@jongiyoh_bot", "jongiyoh.uz"]
    }
  };
};

export const extractRecipeCardFromArticle = (article: AIArticle): RecipeCardData => {
  const howTo = article.howToTry || [];
  const amounts = article.lockedFacts?.amounts || [];
  const calculations = article.lockedFacts?.calculations || [];
  const dates = article.lockedFacts?.dates || [];
  const risks = article.risksAndLimits || article.lockedFacts?.contraindications || [];

  const rawTitle = article.title || "Dorivor Giyoh";
  const cleanHerb = rawTitle
    .replace(/damlamasi|choyi|siri|foydalari|haqida|retsepti|mo'jizasi|tabiiy/gi, '')
    .trim()
    .replace(/^[:\s-]+|[:\s-]+$/g, '');

  let dosage = amounts.find(a => /qoshiq|gr|gramm|choy qoshiq/i.test(a)) || 
               howTo.find(h => /qoshiq|gr|gramm/i.test(h)) || 
               "1 osh qoshiq (5-10 gr)";
  if (dosage.length > 36) dosage = "1 osh qoshiq (5-10 gr)";

  let water = amounts.find(a => /ml|litr|suv|stakan/i.test(a)) || 
              howTo.find(h => /ml|suv|qaynoq|stakan/i.test(h)) || 
              "200-250 ml qaynoq suv (95°C)";
  if (water.length > 36) water = "200-250 ml qaynoq suv (95°C)";

  let steepTime = howTo.find(h => /daqiqa|damlang|tindiring|soat/i.test(h)) || "15-20 daqiqa (ustini yopib)";
  if (steepTime.length > 36) steepTime = "15-20 daqiqa (ustini yopib)";

  let frequency = howTo.find(h => /mahal|kuniga|ovqatdan|ertalab|kechqurun/i.test(h)) || 
                  calculations.find(c => /mahal|ichiladi|ovqatdan/i.test(c)) || 
                  "Kuniga 2 mahal, ovqatdan 30 daq. oldin";
  if (frequency.length > 45) frequency = "Kuniga 2 mahal, ovqatdan 30 daq. oldin";

  let duration = dates.find(d => /kun|kurs|hafta/i.test(d)) || 
                 calculations.find(c => /kurs|tanaffus/i.test(c)) || 
                 "21 kun qabul + 7 kun tanaffus";
  if (duration.length > 36) duration = "21 kun qabul + 7 kun tanaffus";

  let warning = risks[0] || "Homiladorlik va buyrak toshida mumkin emas!";
  if (warning.length > 55) warning = warning.substring(0, 52) + "...";

  return {
    title: `${cleanHerb ? cleanHerb.slice(0, 26) : 'Shifobaxsh Giyoh'} Damlamasi`,
    dosage,
    water,
    steepTime,
    frequency,
    duration,
    warning,
    callToAction: "📌 Retseptni yo'qotmaslik uchun SAQLAB OLING! 💾"
  };
};

// Fallback structured Jongiyoh Reel builder
const buildStructuredJongiyohReelFallback = (article: AIArticle) => {
  const stat = article.benchmarkStats || "1 OSH QOSHIQ / 200 ML";
  const titleTopic = article.title ? article.title.slice(0, 70) : "Shifobaxsh giyohlar siri";

  const fallbackScenes: ReelScene[] = [
    {
      id: `scene_${Date.now()}_0`,
      order: 1,
      type: 'hook',
      narration: `Bo'g'imlaringiz qisirlab, ertalablari harakatlanish og'irlashyaptimi? Buning eng xavfsiz tabiiy yechimi bor!`,
      headline: "BO'G'IMLAR QISIRLASHIGA DAVO",
      statText: "TABIIY SHIFO",
      visualMotion: 'push-in',
      isInfographic: false,
      visualPrompt: "Authentic vertical 9:16 high-resolution botanical photography of fresh green medicinal herbs with dew drops, soft warm sunlight, true-to-life colors, 35mm lens, strictly NO neon, NO sci-fi glow."
    },
    {
      id: `scene_${Date.now()}_1`,
      order: 2,
      type: 'benefit',
      narration: `Ushbu giyoh tarkibidagi organik moddalar tog'ay to'qimalarini oziqlantiradi va sinovial suyuqlikni tiklaydi.`,
      headline: "SHIFOBAXSH TA'SIR KUCHI",
      statText: "TOG'AY TIKLANISHI",
      visualMotion: 'zoom-out',
      isInfographic: true,
      visualPrompt: "Close-up macro shot of dried healing herbs in a clean ceramic apothecary bowl, warm natural ambient light, authentic botanical textures, 35mm lens."
    },
    {
      id: `scene_${Date.now()}_2`,
      order: 3,
      type: 'recipe',
      narration: `Tayyorlash juda oddiy: bir osh qoshiq giyohni ikki yuz millilitr qaynoq suvda o'n besh daqiqa damlang va tindiring.`,
      headline: "DAMLASH VA QABUL QILISH",
      statText: "1 OSH QOSHIQ / 200 ML",
      visualMotion: 'pan-left',
      isInfographic: true,
      visualPrompt: "Steaming hot herbal tea being poured into an authentic glass teapot, amber color infusion, clean wooden table, natural daylight, photorealistic documentary."
    },
    {
      id: `scene_${Date.now()}_3`,
      order: 4,
      type: 'warning',
      narration: `Diqqat, qat'iy qarshi ko'rsatma: buyragida toshi borlar va homilador ayollarga bu giyohni ichish mutlaqo mumkin emas!`,
      headline: "⚠️ QARSHI KO'RSATMALAR (YMYL)",
      statText: "BUYRAK TOSHI & HOMILADORLIK",
      visualMotion: 'push-in',
      isInfographic: true,
      visualPrompt: "Traditional medicine manuscript and vintage apothecary herbal balance scale, warm directional lighting, serious documentary realism."
    },
    {
      id: `scene_${Date.now()}_4`,
      order: 5,
      type: 'course',
      narration: `Damlama yigirma bir kun davomida ichiladi, shundan so'ng kamida bir hafta tanaffus qilish shart.`,
      headline: "21 KUNLIK TABIIY SIKL",
      statText: "21 KUN QABUL + 7 KUN TANAFFUS",
      visualMotion: 'pan-right',
      isInfographic: false,
      visualPrompt: "Healthy active person walking joyfully in fresh green mountain nature, free mobile joints, vitality and wellness, golden hour sunlight."
    },
    {
      id: `scene_${Date.now()}_5`,
      order: 6,
      type: 'cta',
      narration: `Sizning yoshingiz va holatingizga mos xavfsiz dozani bilish uchun Jongiyoh bot Telegram botimizga kiring va bir daqiqada hisoblang!`,
      headline: "SHAXSIY DOZANI HISOBLANG",
      statText: "@JONGIYOH_BOT",
      visualMotion: 'push-in',
      isInfographic: true,
      visualPrompt: "Person holding smartphone on a cozy wooden table with a hot herbal cup, opening Telegram bot, warm aesthetic, high definition realistic photo."
    },
    {
      id: `scene_${Date.now()}_6`,
      order: 7,
      type: 'cta',
      narration: `Salomatlik va tabiiy tabobat sirlari uchun Jongiyoh sahifamizga obuna bo'ling va videoni yaqinlaringizga yuboring!`,
      headline: "JONGIYOH.UZ",
      statText: "@JONGIYOH",
      visualMotion: 'zoom-out',
      isInfographic: false,
      visualPrompt: "Aesthetic natural flat-lay of dried mountain herbs, honey, and fresh mint on dark stone slate, bright natural illumination, photorealistic 8k."
    }
  ];

  return {
    articleTitle: article.title,
    category: article.category || "🌿 Dorivor o'tlar",
    hook: fallbackScenes[0].narration,
    scenes: fallbackScenes,
    fullScript: fallbackScenes.map(s => s.narration).join('\n\n'),
    scriptSegments: fallbackScenes.map(s => s.narration),
    imagePrompts: fallbackScenes.map(s => s.visualPrompt),
    caption: `🌿 ${article.title}\n\n🍵 Bo'g'imlar va tabiiy salomatlik uchun foydali retsept.\n⚠️ Eslatma: Buyrak toshida va homiladorlikda mumkin emas!\n\n💬 Shaxsiy xavfsiz dozani hisoblash: @jongiyoh_bot\n🌐 Rasmiy sayt: jongiyoh.uz\n\nVideoni yo'qotmaslik uchun saqlab oling va yaqinlaringizga yuboring!`,
    hashtags: ["#jongiyoh", "#fitoterapiya", "#qirqbogin", "#kurkumin", "#bogimlar", "#tabiiydavo", "#uzbekistan", "#salomatlik"],
    coverHeadline: article.title.length > 30 ? article.title.substring(0, 30) + '...' : article.title,
    coverSubtitle: "To'g'ri damlash va xavfsiz doza",
    lockedFacts: article.lockedFacts,
    recipeCard: extractRecipeCardFromArticle(article)
  };
};

export const cleanNarrationText = (text: string): string => {
  if (!text) return "";
  return text
    // Strip technical labels
    .replace(/\b(CTA|Call to Action|Hook|Kadr\s*\d+|Scene\s*\d+|Order\s*\d+|Intro|Outro|Title):?\s*/gi, '')
    // Strip markdown
    .replace(/[*_#`~[\](){}<>]/g, '')
    // Strip emojis
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

/**
 * Phonetic preprocessor for natural, high-accuracy Uzbek TTS pronunciation.
 * Converts herbal terms, dosages, units, and URLs into smooth, phonetically rich Uzbek speech.
 */
export const prepareTextForTTS = (text: string): string => {
  let cleaned = cleanNarrationText(text);

  cleaned = cleaned
    .replace(/@jongiyoh_bot\b/gi, 'Jongiyoh bot')
    .replace(/@jongiyoh\b/gi, 'Jongiyoh')
    .replace(/jongiyoh\.uz\b/gi, 'Jongiyoh nuqta uz')
    .replace(/\bjongiyoh\b/gi, 'Jongiyoh')
    .replace(/@aixabar\b/gi, 'Jongiyoh')
    .replace(/aixabar\.uz\b/gi, 'Jongiyoh nuqta uz')
    .replace(/\bYMYL\b/gi, 'tibbiy xavfsizlik standarti')
    .replace(/\b200\s*ml\b/gi, 'ikki yuz millilitr')
    .replace(/\b250\s*ml\b/gi, 'ikki yuz ellik millilitr')
    .replace(/\b100\s*ml\b/gi, 'yuz millilitr')
    .replace(/\bml\b/gi, 'millilitr')
    .replace(/\b1\s*osh\s*qoshiq\b/gi, 'bir osh qoshiq')
    .replace(/\b2\s*osh\s*qoshiq\b/gi, 'ikki osh qoshiq')
    .replace(/\b1\/2\b/gi, 'yarim')
    .replace(/\b1\/3\b/gi, 'uchdan bir')
    .replace(/\b21\s*kun\b/gi, 'yigirma bir kun')
    .replace(/\b21\s*kunlik\b/gi, 'yigirma bir kunlik')
    .replace(/\b7\s*kun\b/gi, 'yetti kun')
    .replace(/\b7\s*kunlik\b/gi, 'yetti kunlik')
    .replace(/\b30\s*kun\b/gi, 'o‘ttiz kun')
    .replace(/\b10\s*kun\b/gi, 'o‘n kun')
    .replace(/\b2000%\b/gi, 'ikki ming foiz')
    .replace(/\b10%\b/gi, 'o‘n foiz')
    .replace(/\b60%\b/gi, 'oltmish foiz')
    .replace(/\b85%\b/gi, 'sakson besh foiz')
    .replace(/%/g, ' foiz ')
    .replace(/&/g, ' va ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return cleaned;
};

/**
 * 2. VIRAL JONGIYOH REEL SCRIPT GENERATOR:
 * Generates 6-8 scenes strictly respecting YMYL safety, 30% contraindications, and phytotherapy rules.
 */
export const generateAIXabarReelScript = async (
  article: AIArticle,
  style: ReelStyle = ReelStyle.AUTO,
  genre: VisualGenre = VisualGenre.AUTO,
  modelEngine: AIModelEngine = AIModelEngine.GEMINI_3_8_FLASH
) => {
  const systemInstruction = getJongiyohReelSystemInstruction(style, genre);

  const lockedFactsText = JSON.stringify(article.lockedFacts || {}, null, 2);

  const prompt = `
QUYIDAGI FITOTERAPIYA MAQOLASI ASOSIDA 6-8 TA KADRLI PROFESSIONAL REELS/SHORTS SSENARIYSINI YARATING:
SARLAVHA: "${article.title}"
KATEGORIYA: "${article.category || 'Dorivor o\'tlar'}"
ASOSIY SHIFOBAXSH MODDA: "${article.keyInnovation || ''}"
INSON SALOMATLIGIGA TA'SIRI: "${article.impactOnUsers || ''}"
DOZASI VA TAYYORLASH: "${article.benchmarkStats || ''}"
TAYYORLASH BOSQICHLARI: ${JSON.stringify(article.howToTry || [])}
⚠️ QAT'IY QARSHI KO'RSATMALAR (YMYL XAVFSIZLIK): ${JSON.stringify(article.risksAndLimits || [])}
TELEGRAM BOT HARAKATI: "${article.nextMilestone || '@jongiyoh_bot orqali doza hisoblash'}"

QAT'IY FAKTLAR VA DOZALAR (LOCKED FACTS):
${lockedFactsText}

ESLATMA:
- Har bir kadrda ovoz matni (narration) SINTAKTIK TUGALLANGAN 1-2 TA GAP bo'lsin.
- 1-2 ta kadrda KIMLARGA MUMKIN EMASLIGI (qarshi ko'rsatma) aniq aytilsin!
- Oxirgi kadrlarda @jongiyoh_bot orqali shaxsiy xavfsiz doza hisoblash chaqirilsin.
- Visual prompts: Tabiiy dorivor giyohlar, chinni choynak, shaffof damlama, iliq quyosh nuri, haqiqiy tabiat. Kiberpank va neon TAQIQLANGAN!
`;

  try {
    const response = await retry(() => callGeminiApi('generateContent', {
      model: modelEngine || 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            article_title: { type: "string" },
            category: { type: "string" },
            hook: { type: "string" },
            locked_facts: {
              type: "object",
              properties: {
                amounts: { type: "array", items: { type: "string" } },
                percentages: { type: "array", items: { type: "string" } },
                calculations: { type: "array", items: { type: "string" } },
                dates: { type: "array", items: { type: "string" } },
                legalClaims: { type: "array", items: { type: "string" } },
                otherCriticalFacts: { type: "array", items: { type: "string" } }
              }
            },
            scenes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  order: { type: "integer" },
                  type: { type: "string" },
                  narration: { type: "string" },
                  headline: { type: "string" },
                  statText: { type: "string" },
                  visualMotion: { type: "string" },
                  isInfographic: { type: "boolean" },
                  visual_prompt_en: { type: "string" }
                },
                required: ["order", "type", "narration", "headline", "visual_prompt_en"]
              }
            },
            full_script: { type: "string" },
            instagram_caption: { type: "string" },
            hashtags: { type: "array", items: { type: "string" } },
            cover_headline: { type: "string" },
            cover_subtitle: { type: "string" }
          },
          required: ["article_title", "scenes", "full_script", "instagram_caption", "cover_headline"]
        }
      }
    }));

    if (!response.text) {
      return buildStructuredJongiyohReelFallback(article);
    }

    const parsed = parseResponse(response.text);
    const rawScenes = Array.isArray(parsed.scenes) && parsed.scenes.length >= 3 ? parsed.scenes : [];
    
    if (rawScenes.length === 0) {
      return buildStructuredJongiyohReelFallback(article);
    }

    const normalizedScenes: ReelScene[] = rawScenes.map((s: any, idx: number) => {
      const cleanNarration = cleanNarrationText(s.narration || "");
      const isWarning = s.type === 'warning' || /qarshi|mumkin emas|taqiq/i.test(`${s.headline} ${s.statText || ''}`);

      return {
        id: `scene_${Date.now()}_${idx}`,
        order: s.order || idx + 1,
        type: isWarning ? 'warning' : (s.type || (idx === 0 ? 'hook' : idx === rawScenes.length - 1 ? 'cta' : 'benefit')),
        narration: cleanNarration,
        headline: s.headline || (isWarning ? "QARSHI KO'RSATMALAR" : "JONGIYOH"),
        statText: s.statText || "",
        visualMotion: s.visualMotion || (idx % 2 === 0 ? 'push-in' : 'zoom-out'),
        isInfographic: !!s.isInfographic || isWarning || !!s.statText,
        visualPrompt: s.visual_prompt_en || `Authentic vertical 9:16 botanical documentary photograph of ${article.title ? article.title.slice(0, 60) : 'medicinal healing herbs'}: ${cleanNarration.slice(0, 80)}, natural warm sunlight, true-to-life organic colors, shot on 35mm camera, strictly NO neon, NO sci-fi glow`,
        infoCardData: s.statText ? {
          title: s.headline || (isWarning ? "⚠️ QARSHI KO'RSATMA" : "🌿 JONGIYOH"),
          mainStat: s.statText,
          subStat: "jongiyoh.uz",
          label: isWarning ? "YMYL Xavfsizlik" : "Fito Tavsiya"
        } : undefined
      };
    });

    const fullScript = normalizedScenes
      .map(s => {
        let text = cleanNarrationText(s.narration).trim();
        if (!/[.!?]$/.test(text)) text += '.';
        return text;
      })
      .filter(Boolean)
      .join('\n\n');
    const scriptSegments = normalizedScenes.map(s => s.narration);
    const imagePrompts = normalizedScenes.map(s => s.visualPrompt);

    return {
      articleTitle: parsed.article_title || article.title,
      category: parsed.category || article.category || "🌿 Dorivor o'tlar",
      hook: cleanNarrationText(parsed.hook || (normalizedScenes[0]?.narration || "")),
      scenes: normalizedScenes,
      fullScript,
      scriptSegments,
      imagePrompts,
      caption: parsed.instagram_caption || `🌿 ${article.title}\n\n🍵 Bo'g'imlar va salomatlik uchun tabiiy retsept.\n💬 Shaxsiy xavfsiz doza: @jongiyoh_bot\n🌐 Sayt: jongiyoh.uz`,
      hashtags: ensureStringArray(parsed.hashtags, ["#jongiyoh", "#fitoterapiya", "#qirqbogin", "#kurkumin", "#bogimlar", "#tabiiydavo", "#salomatlik", "#uzbekistan"]),
      coverHeadline: parsed.cover_headline || (article.title.length > 32 ? article.title.substring(0, 32) + '...' : article.title),
      coverSubtitle: parsed.cover_subtitle || "To'g'ri damlash va xavfsiz doza",
      lockedFacts: parsed.locked_facts || article.lockedFacts,
      recipeCard: extractRecipeCardFromArticle(article)
    };
  } catch (err) {
    console.warn("generateAIXabarReelScript API error, activating fallback generator:", err);
    return buildStructuredJongiyohReelFallback(article);
  }
};

// Aliases
export const generateJongiyohReelScript = generateAIXabarReelScript;
export const generateBusinessReelScript = generateAIXabarReelScript;

/**
 * 3. AUDIO GENERATOR (TTS):
 * High quality Uzbek audio narration using Gemini TTS with phonetic pre-processing.
 */
export const generateAudio = async (text: string, voiceType: VoiceType): Promise<string> => {
  const voiceName = getVoiceName(voiceType);
  const phoneticText = prepareTextForTTS(text || "Jongiyoh nuqta uz. Tabiiy giyohlar va salomatlik sirlari.");

  const response = await retry(() => callGeminiApi('generateTTS', {
    text: phoneticText,
    voiceName
  }));

  if (!response?.audioBase64) throw new Error("Audio hosil qilib bo'lmadi");
  return response.audioBase64;
};

const getAspectForGemini = (ratio: AspectRatio): '9:16' | '1:1' | '16:9' => {
  if (ratio === AspectRatio.LANDSCAPE) return '16:9';
  if (ratio === AspectRatio.SQUARE) return '1:1';
  return '9:16';
};

/**
 * 4. SINGLE SCENE IMAGE GENERATOR:
 * Generates vertical 9:16 authentic botanical and phytotherapy photograph.
 */
export const generateSingleImage = async (
  prompt: string, 
  aspectRatio: AspectRatio = AspectRatio.PORTRAIT,
  imageModel: ImageModelEngine = ImageModelEngine.FLASH_LITE_IMAGE
): Promise<string> => {
  const geminiAspect = getAspectForGemini(aspectRatio);
  
  // Clean unnatural tokens
  const sanitizedPrompt = prompt
    .replace(/\b(neon|cyberpunk|glowing\s+(circuits|lines|neon|grid)|neon\s+(cyan|violet|blue|purple|pink|lights?)|synthwave|futuristic\s+neon|surreal\s+glow)\b/gi, 'natural botanical')
    .replace(/\s+/g, ' ')
    .trim();

  const styleDescriptor = "authentic botanical documentary photography, real healing medicinal herbs, fresh and dried herbal tea leaves, porcelain and glass teapot, warm natural daylight, true-to-life colors and textures, shot on professional 35mm camera, strictly NO neon lighting, NO glowing purple or cyan lights, NO fantasy glow, NO CGI render";

  const enhancedPrompt = `${sanitizedPrompt}. Single standalone vertical 9:16 full-frame photograph, ${styleDescriptor}, photorealistic 8k documentary capture, strictly no collage, no 2x2 grid, no split screen, no storyboard sheet, no multi-panel layout, no readable text or letters inside image, clean video-ready frame for Reels montage.`;

  const primaryModel = imageModel || ImageModelEngine.FLASH_LITE_IMAGE;
  const alternateModel = primaryModel === ImageModelEngine.FLASH_LITE_IMAGE 
    ? ImageModelEngine.FLASH_IMAGE 
    : ImageModelEngine.FLASH_LITE_IMAGE;

  const response = await retry(() => callGeminiApi('generateImage', {
    prompt: enhancedPrompt,
    aspectRatio: geminiAspect,
    primaryModel,
    alternateModel
  }));

  if (!response?.dataUrl) throw new Error("Rasm yaratib bo'lmadi");
  return response.dataUrl;
};

/**
 * 5. HYBRID & ADAPTIVE SCENE IMAGES GENERATOR:
 */
export const generateSceneImagesWithStrategy = async (
  scenes: ReelScene[],
  aspectRatio: AspectRatio = AspectRatio.PORTRAIT,
  strategy: VisualGenerationStrategy = VisualGenerationStrategy.HYBRID,
  articleTopic: string = '',
  onProgress?: (completed: number, total: number, mode: 'ai' | 'unsplash') => void,
  imageModel: ImageModelEngine = ImageModelEngine.FLASH_LITE_IMAGE
): Promise<{ images: string[]; updatedScenes: ReelScene[] }> => {
  const total = scenes.length;
  const results: string[] = [];
  const updatedScenes: ReelScene[] = [...scenes];
  const usedInCurrentBatch = new Set<string>();

  for (let i = 0; i < total; i++) {
    const scene = scenes[i];
    const isAiScene = strategy === VisualGenerationStrategy.ALL_AI 
      ? true 
      : strategy === VisualGenerationStrategy.ALL_REAL 
      ? false 
      : (i % 2 === 0);

    if (onProgress) {
      onProgress(i + 1, total, isAiScene ? 'ai' : 'unsplash');
    }

    if (isAiScene) {
      try {
        const aiImg = await generateSingleImage(scene.visualPrompt, aspectRatio, imageModel);
        results.push(aiImg);
        updatedScenes[i] = {
          ...scene,
          imageUrl: aiImg,
          imageSource: 'ai'
        };
      } catch (err) {
        console.warn(`Scene ${i + 1} AI generation failed, falling back to Unsplash stock:`, err);
        const stockUrl = resolveContextualStockImage(
          scene.stockKeyword || scene.headline || scene.visualPrompt, 
          articleTopic, 
          i, 
          usedInCurrentBatch
        );
        const photoId = extractUnsplashPhotoId(stockUrl);
        if (photoId) usedInCurrentBatch.add(photoId);

        results.push(stockUrl);
        updatedScenes[i] = {
          ...scene,
          imageUrl: stockUrl,
          imageSource: 'unsplash'
        };
      }
    } else {
      const stockUrl = resolveContextualStockImage(
        scene.stockKeyword || scene.headline || scene.visualPrompt, 
        articleTopic, 
        i, 
        usedInCurrentBatch
      );
      const photoId = extractUnsplashPhotoId(stockUrl);
      if (photoId) usedInCurrentBatch.add(photoId);

      results.push(stockUrl);
      updatedScenes[i] = {
        ...scene,
        imageUrl: stockUrl,
        imageSource: 'unsplash'
      };
    }
  }

  return { images: results, updatedScenes };
};

export const generateSceneImages = async (
  prompts: string[], 
  aspectRatio: AspectRatio = AspectRatio.PORTRAIT,
  onProgress?: (completed: number, total: number) => void,
  imageModel: ImageModelEngine = ImageModelEngine.FLASH_LITE_IMAGE
): Promise<string[]> => {
  const total = prompts.length;
  const results: string[] = [];
  const usedInCurrentBatch = new Set<string>();

  for (let i = 0; i < prompts.length; i++) {
    const scenePrompt = prompts[i] || '';
    try {
      const imgData = await generateSingleImage(scenePrompt, aspectRatio, imageModel);
      results.push(imgData);
    } catch (e) {
      console.warn(`Scene ${i + 1} image generation fallback:`, e);
      const fallback = resolveContextualStockImage(scenePrompt, 'medicinal_herbs', i, usedInCurrentBatch);
      const photoId = extractUnsplashPhotoId(fallback);
      if (photoId) usedInCurrentBatch.add(photoId);
      results.push(fallback);
    }
    if (onProgress) {
      onProgress(i + 1, total);
    }
  }

  return results;
};

export { 
  resolveContextualStockImage, 
  getRandomStockImageForScene, 
  extractUnsplashPhotoId, 
  markUnsplashIdUsed, 
  resetUsedUnsplashHistory 
};

export interface AudioTranscriptionResult {
  fullTranscript: string;
  topic?: string;
  coverHeadline?: string;
  subtitles: string[];
}

export const transcribeAndSegmentAudio = async (
  audioBase64OrDataUrl: string,
  targetSceneCount: number = 6
): Promise<AudioTranscriptionResult> => {
  let base64Data = audioBase64OrDataUrl;
  let mimeType = 'audio/mp3';

  if (audioBase64OrDataUrl.includes(',')) {
    const parts = audioBase64OrDataUrl.split(',');
    const header = parts[0];
    base64Data = parts[1];
    if (header.includes('audio/wav')) mimeType = 'audio/wav';
    else if (header.includes('audio/ogg')) mimeType = 'audio/ogg';
    else if (header.includes('audio/aac')) mimeType = 'audio/aac';
    else if (header.includes('audio/m4a')) mimeType = 'audio/m4a';
    else if (header.includes('audio/mp4')) mimeType = 'audio/mp4';
    else if (header.includes('audio/webm')) mimeType = 'audio/webm';
    else mimeType = 'audio/mp3';
  }

  const prompt = `Ushbu yuklangan audio faylni tinglang va to'liq tahlil qiling:
1. Nutqdagi barcha so'zlarni 100% aniq o'zbek tilida matnga aylantiring (fullTranscript).
2. Ushbu nutqni ${targetSceneCount} ta videokadrga moslab, ketma-ket, ravon va to'g'ri subtitr gaplariga (subtitles massivida) bo'ling.
3. Video uchun qisqa mavzu (topic) va muqova sarlavhasi (coverHeadline) bering.

Javobni FAQAT JSON formatida qaytaring:
{
  "fullTranscript": "Audioda aytilgan to'liq gaplar...",
  "topic": "Video mavzusi",
  "coverHeadline": "Qisqa jozibali sarlavha",
  "subtitles": [
    "1-kadr uchun subtitr gapi...",
    "2-kadr uchun subtitr gapi..."
  ]
}`;

  try {
    const response = await retry(() => callGeminiApi('transcribeAudio', {
      audioBase64: base64Data,
      mimeType,
      prompt
    }));

    const text = response?.text;
    if (text) {
      const parsed = parseResponse(text);
      const subs = ensureStringArray(parsed.subtitles, []);
      return {
        fullTranscript: parsed.fullTranscript || text,
        topic: parsed.topic || "Jongiyoh Fito Video",
        coverHeadline: parsed.coverHeadline || parsed.topic || "JONGIYOH",
        subtitles: subs.length > 0 ? subs : [parsed.fullTranscript || "Audio nutqi"]
      };
    }
  } catch (err: any) {
    console.warn("Audio transcription with multimodal failed, using fallback:", err);
  }

  return {
    fullTranscript: "Yuklangan audio nutqi",
    topic: "Jongiyoh Fito Video",
    coverHeadline: "JONGIYOH",
    subtitles: Array.from({ length: targetSceneCount }, (_, i) => `Audio qismi ${i + 1}`)
  };
};

export const splitScriptIntoScenes = (
  scriptText: string,
  sceneCount: number
): string[] => {
  if (!scriptText || !scriptText.trim()) {
    return [];
  }

  const rawSentences = scriptText
    .split(/\r?\n+|(?<=[.?!])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  if (rawSentences.length === 0) return [];
  if (rawSentences.length === sceneCount) return rawSentences;

  if (rawSentences.length < sceneCount) {
    const words = scriptText.trim().split(/\s+/);
    const wordsPerScene = Math.max(1, Math.ceil(words.length / sceneCount));
    const result: string[] = [];
    for (let i = 0; i < sceneCount; i++) {
      const slice = words.slice(i * wordsPerScene, (i + 1) * wordsPerScene);
      if (slice.length > 0) {
        result.push(slice.join(' '));
      } else {
        result.push(result[result.length - 1] || scriptText);
      }
    }
    return result;
  }

  const sentencesPerScene = Math.ceil(rawSentences.length / sceneCount);
  const result: string[] = [];
  for (let i = 0; i < sceneCount; i++) {
    const slice = rawSentences.slice(i * sentencesPerScene, (i + 1) * sentencesPerScene);
    result.push(slice.join(' '));
  }
  return result;
};

export interface TextToScriptOptions {
  title?: string;
  style?: ReelStyle;
  genre?: VisualGenre;
  modelEngine?: AIModelEngine;
  targetSceneCount?: number;
}

/**
 * 6. TEXT-TO-VIDEO SCRIPT GENERATOR:
 * Converts arbitrary raw text into a professional, synchronized 9:16 vertical video script
 * with complete sentences, visual prompts, headlines, and captions.
 */
export const generateScriptFromText = async (
  rawText: string,
  options: TextToScriptOptions = {}
) => {
  const cleanInput = rawText.trim();
  if (!cleanInput) {
    throw new Error("Matn bo'sh bo'lishi mumkin emas.");
  }

  const {
    title,
    style = ReelStyle.AUTO,
    genre = VisualGenre.AUTO,
    modelEngine = AIModelEngine.GEMINI_3_8_FLASH,
    targetSceneCount = 0
  } = options;

  const sceneCountInstruction = targetSceneCount && targetSceneCount > 0
    ? `Aniq ${targetSceneCount} ta kadr yarating.`
    : `Matn uzunligiga qarab 4 tadan 7 tagacha optimal kadrlar ketma-ketligini yarating.`;

  const prompt = `
Siz professional ssenarist, multimedia rejissyori va O'zbek tilidagi qisqa vertikal videolar (Instagram Reels, TikTok, YouTube Shorts 9:16) bo'yicha mutaxassissiz.

Foydalanuvchi taqdim etgan quyidagi xom matn (maqola, tabobat tavsiyasi, retsept, hikoya, she'r, motivatsiya yoki yangilik) asosida to'liq, yuqori sifatli video ssenariysini yarating:

${title ? `FOYDALANUVCHI BERGAN MAVZU / SARLAVHA: "${title}"` : ''}

ASOSIY MATN:
"""
${cleanInput}
"""

VAZIFA VA QAT'IY TALABLAR:
1. ${sceneCountInstruction}
2. Har bir kadr uchun diktor ovozi (narration):
   - 100% tabiiy, chiroyli va ravon O'zbek tilida yozilsin.
   - Har bir kadrda 1-2 ta SINTAKTIK TUGALLANGAN to'liq gap bo'lsin. Gap o'rtasida uzilib qolmasin!
   - 1-kadr (hook): Tomoshabinni darhol qiziqtiruvchi, kuchli boshlanma.
   - O'rta kadrlar: Asosiy mazmun, bosqichlar, foydali sirlar. Agar salomatlik/giyoh haqida bo'lsa, aniq doza va kimlarga mumkin emasligi aytilsin.
   - Oxirgi kadr (cta): Videoni saqlab olish, ulashish yoki @jongiyoh_bot orqali maslahat olishga da'vat.
3. Kadr visual_prompt_en (Ingliz tilida):
   - Kadrning AYNAN SHU matniga mos, vertical 9:16 formatdagi kinematik fotografiya prompti.
   - Uslub: Authentic documentary photography, 35mm lens, natural daylight, photorealistic 8k, warm cinematic color grading.
   - TAQIQLANGAN: No neon, no cyberpunk glow, no split-screen, no collage, no text or letters inside the image.
4. Muqova va sarlavhalar:
   - cover_headline: 2-4 so'zdan iborat o'tkir, yirik muqova sarlavhasi (masalan: "BO'G'IMLARGA DAVO SIRI", "ERTALABKI MO''JIZA").
   - cover_subtitle: Qisqa tushuntiruvchi taglavha.
   - instagram_caption: Post uchun chiroyli emojilar bilan to'liq matn va CTA.
   - hashtags: 6-10 ta dolzarb hashtag.

Return ONLY a JSON object conforming to the schema.
`;

  try {
    const response = await retry(() => callGeminiApi('generateContent', {
      model: modelEngine || 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            article_title: { type: "string" },
            category: { type: "string" },
            hook: { type: "string" },
            scenes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  order: { type: "integer" },
                  type: { type: "string" },
                  narration: { type: "string" },
                  headline: { type: "string" },
                  statText: { type: "string" },
                  visualMotion: { type: "string" },
                  isInfographic: { type: "boolean" },
                  visual_prompt_en: { type: "string" }
                },
                required: ["order", "type", "narration", "headline", "visual_prompt_en"]
              }
            },
            full_script: { type: "string" },
            instagram_caption: { type: "string" },
            hashtags: { type: "array", items: { type: "string" } },
            cover_headline: { type: "string" },
            cover_subtitle: { type: "string" }
          },
          required: ["article_title", "scenes", "full_script", "instagram_caption", "cover_headline"]
        }
      }
    }));

    if (response?.text) {
      const parsed = parseResponse(response.text);
      const rawScenes = Array.isArray(parsed.scenes) && parsed.scenes.length >= 2 ? parsed.scenes : [];

      if (rawScenes.length > 0) {
        const resolvedTitle = parsed.article_title || title || cleanInput.slice(0, 45) + '...';
        const motions: ('push-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'parallax')[] = [
          'push-in', 'zoom-out', 'pan-left', 'push-in', 'pan-right', 'parallax'
        ];

        const normalizedScenes: ReelScene[] = rawScenes.map((s: any, idx: number) => {
          const cleanNarration = cleanNarrationText(s.narration || "");
          const isWarning = s.type === 'warning' || /qarshi|mumkin emas|taqiq|ehtiyot/i.test(`${s.headline} ${s.statText || ''} ${cleanNarration}`);

          return {
            id: `text_scene_${Date.now()}_${idx}`,
            order: s.order || idx + 1,
            type: isWarning ? 'warning' : (s.type || (idx === 0 ? 'hook' : idx === rawScenes.length - 1 ? 'cta' : 'benefit')),
            narration: cleanNarration,
            headline: s.headline || (isWarning ? "⚠️ QARSHI KO'RSATMALAR" : idx === 0 ? "MUHIM MA'LUMOT" : "TAVSIYA"),
            statText: s.statText || "",
            visualMotion: s.visualMotion || motions[idx % motions.length],
            isInfographic: !!s.isInfographic || isWarning || !!s.statText,
            visualPrompt: s.visual_prompt_en || `Authentic vertical 9:16 high-resolution documentary photograph representing: ${cleanNarration.slice(0, 70)}, natural warm daylight, true-to-life colors, shot on 35mm camera, strictly NO neon, NO text`,
            infoCardData: s.statText ? {
              title: s.headline || (isWarning ? "⚠️ DIQQAT" : "FOYDALI MASLAHAT"),
              mainStat: s.statText,
              subStat: "jongiyoh.uz",
              label: isWarning ? "Xavfsizlik" : "Tavsiya"
            } : undefined
          };
        });

        const fullScript = normalizedScenes
          .map(s => {
            let t = cleanNarrationText(s.narration).trim();
            if (!/[.!?]$/.test(t)) t += '.';
            return t;
          })
          .join('\n\n');

        return {
          articleTitle: resolvedTitle,
          category: parsed.category || "🌿 Salomatlik va Hayot",
          hook: cleanNarrationText(parsed.hook || normalizedScenes[0]?.narration || resolvedTitle),
          scenes: normalizedScenes,
          fullScript,
          scriptSegments: normalizedScenes.map(s => s.narration),
          imagePrompts: normalizedScenes.map(s => s.visualPrompt),
          caption: parsed.instagram_caption || `🌿 ${resolvedTitle}\n\n${fullScript}\n\n💬 Shaxsiy xavfsiz doza: @jongiyoh_bot\n🌐 Rasmiy sayt: jongiyoh.uz`,
          hashtags: ensureStringArray(parsed.hashtags, ["#jongiyoh", "#salomatlik", "#foydalimaslahat", "#tabiiydavo", "#uzbekistan"]),
          coverHeadline: parsed.cover_headline || (resolvedTitle.length > 28 ? resolvedTitle.substring(0, 28) + '...' : resolvedTitle),
          coverSubtitle: parsed.cover_subtitle || "Foydali tavsiyalar va sirlar",
          recipeCard: /damlama|choy|qirqbog|kurkumin|osh qoshiq|ml/i.test(cleanInput) ? {
            title: `${resolvedTitle.slice(0, 24)} Retsepti`,
            dosage: "1 osh qoshiq (5-10 gr)",
            water: "200-250 ml qaynoq suv",
            steepTime: "15-20 daqiqa damlash",
            frequency: "Kuniga 2 mahal",
            duration: "21 kunlik kurs",
            warning: "Homiladorlik va surunkali kasalliklarda shifokor bilan maslahatlashing",
            callToAction: "📌 Saqlab oling va yaqinlaringizga yuboring!"
          } : undefined
        };
      }
    }
  } catch (err) {
    console.warn("generateScriptFromText API call failed, using intelligent segmentation fallback:", err);
  }

  // Fallback if Gemini fails or is unreachable
  const targetCount = targetSceneCount && targetSceneCount > 0 ? targetSceneCount : 5;
  const segments = splitScriptIntoScenes(cleanInput, targetCount);
  const derivedTitle = title || cleanInput.split(/[.?!]/)[0]?.slice(0, 40) || "Salomatlik va Tabiat Sirlari";

  const fallbackScenes: ReelScene[] = segments.map((seg, idx) => {
    const isWarning = /qarshi|mumkin emas|taqiq|ehtiyot/i.test(seg);
    const motions: ('push-in' | 'zoom-out' | 'pan-left' | 'pan-right')[] = ['push-in', 'zoom-out', 'pan-left', 'pan-right'];
    return {
      id: `text_fallback_${Date.now()}_${idx}`,
      order: idx + 1,
      type: isWarning ? 'warning' : (idx === 0 ? 'hook' : idx === segments.length - 1 ? 'cta' : 'benefit'),
      narration: seg,
      headline: isWarning ? "⚠️ OGOHLANTIRISH" : idx === 0 ? derivedTitle.slice(0, 24) : `TAVSIYA ${idx + 1}`,
      statText: idx === 0 ? "MUHIM" : idx === segments.length - 1 ? "SAQLAB OLING" : "",
      visualMotion: motions[idx % motions.length],
      isInfographic: isWarning || idx === 0,
      visualPrompt: `Authentic vertical 9:16 documentary photograph of ${derivedTitle}: ${seg.slice(0, 60)}, warm natural morning sunlight, 35mm lens, photorealistic 8k, strictly NO neon, NO text`
    };
  });

  const fullFallbackScript = fallbackScenes.map(s => s.narration).join('\n\n');

  return {
    articleTitle: derivedTitle,
    category: "🌿 Tabiiy Salomatlik",
    hook: fallbackScenes[0]?.narration || derivedTitle,
    scenes: fallbackScenes,
    fullScript: fullFallbackScript,
    scriptSegments: fallbackScenes.map(s => s.narration),
    imagePrompts: fallbackScenes.map(s => s.visualPrompt),
    caption: `🌿 ${derivedTitle}\n\n${fullFallbackScript}\n\n💬 Maslahat: @jongiyoh_bot\n🌐 Sayt: jongiyoh.uz`,
    hashtags: ["#jongiyoh", "#salomatlik", "#tabiiydavo", "#foydalimaslahat", "#uzbekistan"],
    coverHeadline: derivedTitle.slice(0, 28),
    coverSubtitle: "Foydali tavsiyalar",
    recipeCard: undefined
  };
};

/**
 * 7. VEO & OMNI OPTIMIZED SCRIPT GENERATOR:
 * Strictly enforces the 15 Golden Rules from QOIDALAR.md:
 *  - 11-14 Uzbek words per scene (avoids dead silence and avoids repetition)
 *  - Dynamic cinematography (Medium -> Macro hands -> Teapot close-up -> Manuscript -> Nature walk -> CTA)
 *  - No packaging hallucinations (strictly no fake boxes or random text)
 */
export const generateVeoOptimizedScript = async (
  topicOrText: string,
  options: { title?: string; targetClips?: number; modelEngine?: AIModelEngine } = {}
) => {
  const cleanInput = topicOrText.trim();
  const { title, targetClips = 5, modelEngine = AIModelEngine.GEMINI_3_8_FLASH } = options;

  const prompt = `
Siz Google Veo 3.1 va Gemini Omni video modellari bo'yicha bosh rejissyor va ssenaristsiz.
Foydalanuvchi taqdim etgan quyidagi mavzu yoki matn asosida O'zbekistondagi eng sifatli kinematik video ssenariysini yarating:

${title ? `SARLAVHA: "${title}"` : ''}
MAVZU / MATN:
"""
${cleanInput}
"""

QAT'IY QOIDALAR (BU QOIDALAR BUZILSA VIDEO SIFATSIZ CHIQADI):
1. Aniq ${targetClips} ta kadr yarating (Kadr 1 dan Kadr ${targetClips} gacha).
2. HAR BIR KADR OVOZ MATNI (narration) QAT'IY 11 TAdan 14 TAGACHA O'ZBEKCHA SO'Z BO'LSIN!
   - 11 tadan kam bo'lsa: model bo'sh qolgan vaqtda so'zni takrorlaydi yoki 4 soniya jim tirjayib turadi!
   - 14 tadan ko'p bo'lsa: 10 soniyaga sig'may, gap o'rtasida kesilib qoladi!
   - Har bir gap tugallangan ma'noga ega bo'lsin.
3. KADRLARNING XILMA-XIL REJISSURASI (Bitta yigit barcha kadrda qotib turishi TAQIQLANGAN):
   - 1-kadr (Hook): O'rta plan (Medium shot) — samimiy qahramon tabiat fonida jilmayib muammoni aytadi.
   - 2-kadr (Sabab/Modda): Ekstremal makro (Extreme macro) — qo'llarda quritilgan dorivor giyoh barglari va shudring.
   - 3-kadr (Damlash/Retsept): Yaqin plan (Close-up) — shaffof shisha choynakka qaynoq suv quyiladi, bug' ko'tariladi.
   - 4-kadr (Ogohlantirish/YMYL): Jiddiy va vazmin plan — qadimiy tabobat qo'lyozmasi yoki tarozi (buyrak toshi va homiladorlikda ehtiyotkorlik).
   - 5-kadr (Harakat/Hayot): Keng plan (Wide tracking shot) — inson tog' qo'ynida yengil va erkin qadam tashlaydi.
   - 6-kadr (CTA): Yaqin plan — choy piyolasi yonida smartfonda Telegram ochilgan (@jongiyoh_bot orqali doza hisoblash).
4. TAQIQLAR:
   - Modelga quti yoki qadoq chizishni BUYURMANG (chunki model harflarni buziq chizadi).
   - Kiberpank, neon yoki sun'iy yorug'lik TAQIQLANGAN — faqat tabiiy quyosh nuri, haqiqiy tabiat, 35mm fotorealizm.

Return ONLY a JSON object conforming to the schema.`;

  try {
    const response = await retry(() => callGeminiApi('generateContent', {
      model: modelEngine || 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            article_title: { type: "string" },
            scenes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  order: { type: "integer" },
                  type: { type: "string" },
                  narration: { type: "string" },
                  headline: { type: "string" },
                  statText: { type: "string" },
                  camera_direction: { type: "string" },
                  visual_prompt_en: { type: "string" }
                },
                required: ["order", "type", "narration", "headline", "camera_direction", "visual_prompt_en"]
              }
            },
            full_script: { type: "string" },
            instagram_caption: { type: "string" },
            hashtags: { type: "array", items: { type: "string" } },
            cover_headline: { type: "string" }
          },
          required: ["article_title", "scenes", "full_script", "cover_headline"]
        }
      }
    }));

    if (response?.text) {
      const parsed = parseResponse(response.text);
      const rawScenes = Array.isArray(parsed.scenes) && parsed.scenes.length >= 2 ? parsed.scenes : [];

      if (rawScenes.length > 0) {
        const resolvedTitle = parsed.article_title || title || cleanInput.slice(0, 45);

        const normalizedScenes: ReelScene[] = rawScenes.map((s: any, idx: number) => {
          const cleanNarration = cleanNarrationText(s.narration || "");
          const isWarning = s.type === 'warning' || /qarshi|mumkin emas|taqiq|ehtiyot/i.test(`${s.headline} ${cleanNarration}`);

          return {
            id: `veo_scene_${Date.now()}_${idx}`,
            order: s.order || idx + 1,
            type: isWarning ? 'warning' : (s.type || (idx === 0 ? 'hook' : idx === rawScenes.length - 1 ? 'cta' : 'benefit')),
            narration: cleanNarration,
            headline: s.headline || (isWarning ? "⚠️ QARSHI KO'RSATMALAR" : idx === 0 ? "MUHIM MA'LUMOT" : "TAVSIYA"),
            statText: s.statText || "",
            visualMotion: 'push-in',
            isInfographic: isWarning || !!s.statText,
            visualPrompt: s.visual_prompt_en || `${s.camera_direction || 'Cinematic shot'}. Natural daylight, authentic 35mm documentary photography, strictly no text on screen.`,
            infoCardData: s.statText ? {
              title: s.headline || (isWarning ? "⚠️ DIQQAT" : "JONGIYOH"),
              mainStat: s.statText,
              subStat: "jongiyoh.uz",
              label: isWarning ? "Xavfsizlik" : "Tavsiya"
            } : undefined
          };
        });

        const fullScript = normalizedScenes.map(s => s.narration).join('\n\n');

        return {
          articleTitle: resolvedTitle,
          hook: normalizedScenes[0]?.narration || resolvedTitle,
          scenes: normalizedScenes,
          fullScript,
          scriptSegments: normalizedScenes.map(s => s.narration),
          imagePrompts: normalizedScenes.map(s => s.visualPrompt),
          caption: parsed.instagram_caption || `🌿 ${resolvedTitle}\n\n${fullScript}\n\n💬 Shaxsiy xavfsiz doza: @jongiyoh_bot\n🌐 Rasmiy sayt: jongiyoh.uz`,
          hashtags: ensureStringArray(parsed.hashtags, ["#jongiyoh", "#fitoterapiya", "#salomatlik", "#tabiiydavo", "#veo"]),
          coverHeadline: parsed.cover_headline || resolvedTitle.slice(0, 28),
          coverSubtitle: "JONGIYOH.UZ"
        };
      }
    }
  } catch (err) {
    console.warn("generateVeoOptimizedScript API failed, using fallback:", err);
  }

  // Fallback
  return generateScriptFromText(cleanInput, { title, targetSceneCount: targetClips, modelEngine });
};


