import { VoiceType, ReelStyle, VisualGenre, AIArticle } from "./types";

export const getVoiceName = (type: VoiceType): string => {
  switch (type) {
    case VoiceType.PROFESSIONAL: return 'Aoede'; // Malakali fitoterapevt / shifokor ovozi (ravon, ishonchli)
    case VoiceType.FRIENDLY: return 'Kore';      // Samimiy salomatlik va giyohlar maslahatchisi
    case VoiceType.SERIOUS: return 'Fenrir';     // Tajribali tabib / Ibn Sino tahlilchisi (vazmin, chuqur)
    case VoiceType.CALM: return 'Charon';        // Xotirjam fito-konsultant (tinchlantiruvchi, osoyishta)
    case VoiceType.ENERGETIC: return 'Puck';     // Faol sog'lom hayot targ'ibotchisi (chaqqon, tetik)
    default: return 'Aoede';
  }
};

export const JONGIYOH_CATEGORIES = {
  ALL: "Barcha fito-mavzular",
  BOGIM: "🦴 Bo'g'imlar va suyaklar salomatligi",
  GIYOHLAR: "🌿 Qirqbo'g'in, Kurkumin va dorivor o'tlar",
  DAMLAMA: "🍵 To'g'ri damlash va qabul qilish sirlari",
  QARSHI_KORSATMA: "⚠️ Qarshi ko'rsatmalar va xavfsizlik (YMYL)",
  KURS: "🍯 21 kunlik tabiiy kurslar va natijalar",
  IBN_SINO: "📚 Ibn Sino va xalq tabobati merosi",
  DORILAR_BILAN: "🛡️ Dorilar va giyohlar o'zaro ta'siri"
};

// Backwards compatibility alias
export const AIXABAR_CATEGORIES = JONGIYOH_CATEGORIES;
export const BIZNES_CATEGORIES = JONGIYOH_CATEGORIES;

export const TRENDING_JONGIYOH_TOPICS = [
  { 
    label: "🌿 Qirqbo'g'in o'ti", 
    query: "https://jongiyoh.uz/maqolalar/qirqbogin-oti-bogimlar-uchun-foydasi-va-damlash", 
    subtitle: "Bo'g'imlar uchun kremniy va to'g'ri damlash" 
  },
  { 
    label: "🧪 Kurkumin haqiqati", 
    query: "https://jongiyoh.uz/maqolalar/kurkumin-haqida-toliq-haqiqat-yalliglanish-va-qarshi-korsatmalar", 
    subtitle: "Yallig'lanishga qarshi kuch va qarshi ko'rsatmalar" 
  },
  { 
    label: "🦴 Bo'g'imlar qisirlashi", 
    query: "https://jongiyoh.uz/maqolalar/nega-bogimlar-qisirlaydi-harakat-erkinligi-5-tavsiya", 
    subtitle: "Sinovial suyuqlik va tabiiy tiklanish sirlari" 
  },
  { 
    label: "🛡️ Giyohlar & Dorilar", 
    query: "https://jongiyoh.uz/maqolalar/giyohlarni-dorilar-bilan-birga-ichish-mumkinmi-xavfsizlik", 
    subtitle: "Dorilar bilan o'zaro ta'siri va xavfsizlik qoidalari" 
  },
  { 
    label: "🍯 21 kunlik fito-kurs", 
    query: "https://jongiyoh.uz/maqolalar/bogimlar-uchun-21-kunlik-tabiiy-kurs-qanday-natija-va-tanaffus", 
    subtitle: "21 kun qabul + 7 kun tanaffus sikli" 
  },
  { 
    label: "🍵 Kovul (Kapers) ildizi", 
    query: "https://jongiyoh.uz/maqolalar/kovul-ildizi-bogimlar-va-jigar-uchun-shifobaxsh-xususiyatlari", 
    subtitle: "Tog' kovulining shamollashga qarshi kuchi" 
  },
  { 
    label: "🍃 Tog' kiyiko'ti & Zizifora", 
    query: "https://jongiyoh.uz/maqolalar/tog-kiyikoti-va-zizifora-asab-va-yurak-uchun-shifobaxsh-choy", 
    subtitle: "Asab va qon bosimini tabiiy me'yorlashtirish" 
  }
];

// Backwards compatibility and herbal aliases
export const TRENDING_HERBS_TOPICS = TRENDING_JONGIYOH_TOPICS;
export const TRENDING_AI_TOPICS = TRENDING_JONGIYOH_TOPICS;

/**
 * Transliterates Uzbek (Cyrillic and Latin with modifiers like o', g', sh, ch) into clean ASCII Latin.
 * Essential for Google Video SEO, YouTube Shorts, and clean file URLs.
 */
export const transliterateUzbekToLatin = (text: string): string => {
  if (!text) return '';
  const map: Record<string, string> = {
    'ў': 'o', 'Ў': 'O', 'қ': 'q', 'Қ': 'Q', 'ғ': 'g', 'Ғ': 'G', 'ҳ': 'h', 'Ҳ': 'H',
    'oʻ': 'o', 'o‘': 'o', "o'": 'o', 'o`': 'o', 'Oʻ': 'O', 'O‘': 'O', "O'": 'O', 'O`': 'O',
    'gʻ': 'g', 'g‘': 'g', "g'": 'g', 'g`': 'g', 'Gʻ': 'G', 'G‘': 'G', "G'": 'G', 'G`': 'G',
    'sh': 'sh', 'Sh': 'Sh', 'ch': 'ch', 'Ch': 'Ch',
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'j',
    'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
    'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'x', 'ц': 'ts',
    'ч': 'ch', 'ш': 'sh', 'щ': 'sh', 'ъ': '', 'ы': 'i', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo', 'Ж': 'J',
    'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O',
    'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'X', 'Ц': 'Ts',
    'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sh', 'Ъ': '', 'Ы': 'I', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
  };

  let result = text;
  for (const [key, val] of Object.entries(map)) {
    result = result.split(key).join(val);
  }
  return result;
};

/**
 * Generates an SEO-optimal lowercase slug separated by hyphens (e.g. 'jongiyoh-ming-dardga-davo-shifobaxsh-giyohlar').
 * Recommended by Google Search Central and YouTube Video ranking guidelines.
 */
export const generateSeoSlug = (text: string, prefix = 'jongiyoh'): string => {
  const latin = transliterateUzbekToLatin(text || '').toLowerCase();
  const slug = latin
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 60)
    .replace(/^-+|-+$/g, '');

  if (!slug) return `${prefix}-video`;
  if (slug.startsWith(prefix)) return slug;
  return `${prefix}-${slug}`;
};

export const SAMPLE_JONGIYOH_ARTICLES: AIArticle[] = [
  {
    url: "https://jongiyoh.uz/maqolalar/qirqbogin-oti-bogimlar-uchun-foydasi-va-damlash",
    title: "Qirqbo‘g‘in o‘ti: bo‘g‘imlar uchun foydasi, to‘g‘ri damlash va qabul qilish tartibi",
    category: "🌿 Qirqbo'g'in, Kurkumin va dorivor o'tlar",
    summary: "Dala qirqbo‘g‘ini (Equisetum arvense) — organizmda kollagen sintezi va tog‘ay to‘qimalarini tiklash uchun eng boy tabiiy biologik kremniy manbaidir. To‘g‘ri damlanganda bo‘g‘imlardagi og‘riq va qisirlashni kamaytiradi, suyak to‘qimasini mustahkamlaydi.",
    keyInnovation: "Biologik faol kremniy kislotasi (10% gacha) tog'ay to'qimasini oziqlantiradi va sinovial suyuqlik sifatini yaxshilaydi.",
    impactOnUsers: "Bo'g'imlardagi qisirlash, ertalabki qotib qolish va og'riqlar 2-3 haftalik kurs davomida sezilarli yengillashadi.",
    benchmarkStats: "Tarkibida 10% gacha organik kremniy, flavonoidlar va vitamin C mavjud.",
    howToTry: [
      "1 osh qoshiq (5 g) maydalangan qirqbo'g'in o'tini emallangan yoki shisha idishga soling.",
      "Ustidan 200 ml qaynoq suv quyib, suv hammomida 15 daqiqa qizdiring.",
      "Xona haroratida 45 daqiqa sovitib, dokadan o'tkazing.",
      "Kuniga 2 mahal, ovqatdan 30 daqiqa oldin 1/3 stakandan iliq holda ichiladi. Kurs: 21 kun."
    ],
    techSpecs: [
      "Lotincha nomi: Equisetum arvense L.",
      "Asosiy faol modda: Ekvizetonin, kremniy kislotasi, lyuteolin",
      "Optimal ekstraksiya harorati: 85-90°C (Qaynatib yuborish kremniy tuzlarini cho'ktiradi)"
    ],
    risksAndLimits: [
      "⚠️ QAT'IY QARSHI KO'RSATMALAR (YMYL):",
      "Buyrakning o'tkir yallig'lanishi (nefrit, nefroz) va buyragida yirik toshlari borlarga QAT'IYAN TAQIQLANADI, chunki buyrakni qo'zg'atadi!",
      "Homiladorlik va emizish davrida mutlaqo ichish mumkin emas (bachadon qisqarishini chaqirishi mumkin).",
      "Yurak yetishmovchiligi bo'lgan bemorlar shifokor ruxsatisiz ichmasligi shart."
    ],
    nextMilestone: "Shaxsiy xavfsiz doza va kursni @jongiyoh_bot orqali 1 daqiqada hisoblang.",
    tags: ["qirqbogin", "bogimlar", "kremniy", "fitoterapiya", "tabiiydavo", "damlama", "jongiyoh"],
    lockedFacts: {
      amounts: ["1 osh qoshiq (5 gramm)", "200 ml suv", "kuniga 2 mahal 1/3 stakan", "21 kunlik kurs"],
      percentages: ["10% gacha organik kremniy", "45 daqiqa tindirish"],
      calculations: ["21 kun qabul qilinadi, so'ng kamida 7-10 kun tanaffus qilinishi shart"],
      dates: ["21 kunlik davomiylik kursi"],
      contraindications: [
        "O'tkir nefrit va nefroz (buyrak kasalliklari)",
        "Homiladorlik va laktatsiya davri",
        "12 yoshgacha bo'lgan bolalar"
      ],
      legalClaims: [
        "Abu Ali ibn Sino 'Tib qonunlari' 2-jild",
        "O'zbekiston Respublikasi Davlat Farmakopeyasi",
        "PubMed fitoterapiya tadqiqotlari"
      ],
      disclaimer: "Ushbu ma'lumotlar umumiy tanishuv uchun berilgan. Mahsulot dori vositasi emas. Qo'llashdan oldin mutaxassis bilan maslahatlashing.",
      otherCriticalFacts: [
        "Telegram botda shaxsiy doza hisoblash: @jongiyoh_bot",
        "Rasmiy portal: jongiyoh.uz"
      ]
    }
  },
  {
    url: "https://jongiyoh.uz/maqolalar/kurkumin-haqida-toliq-haqiqat-yalliglanish-va-qarshi-korsatmalar",
    title: "Kurkumin haqida to‘liq haqiqat: uning yallig‘lanishga qarshi xususiyatlari va qarshi ko‘rsatmalari",
    category: "🌿 Qirqbo'g'in, Kurkumin va dorivor o'tlar",
    summary: "Kurkumin — sariq zanjabil (kurkuma) ildizidagi eng kuchli tabiiy polifenol modda. Biroq oddiy kurkuma kukunining o'zi organizmga atigi 1-2% so'riladi. U piperin (qora murch ekstrakti) yoki sog'lom yog'lar (zaytun, zig'ir yog'i) bilan birga qabul qilingandagina 2000% kuchliroq ta'sir ko'rsatadi.",
    keyInnovation: "Piperin bilan birgalikda kurkuminning biologik o'zlashtirilishi 20 barobar (2000%) oshadi.",
    impactOnUsers: "Bo'g'imlar yallig'lanishi (artrit, artroz), xaftaga tushadigan yuklama va yallig'lanish sitokinlari sezilarli susayadi.",
    benchmarkStats: "Oddiy kurkuma so'rilishi 1%, piperin bilan esa 2000% yuqori bio-kirishuvchanlik.",
    howToTry: [
      "1/2 choy qoshiq sifatli kurkuma kukuni + bir chimdim maydalangan qora murch (piperin).",
      "1 choy qoshiq zaytun yoki zig'ir yog'iga aralashtirib yoki iliq sutda eritib ichiladi.",
      "Ertalab yoki tushlikda ovqat vaqtida qabul qilinadi. Kurs: 30 kun."
    ],
    techSpecs: [
      "Faol modda: Kurkuminoidlar (Diferuloilmetan)",
      "Sinergist: Piperin (Piper nigrum)",
      "Antioksidant quvvati: Vitamin C va E dan 5-8 barobar kuchliroq"
    ],
    risksAndLimits: [
      "⚠️ QAT'IY QARSHI KO'RSATMALAR (YMYL):",
      "O't qopi tosh kasalligi (o't pufagida tosh yoki o't yo'llari tiqilishi borlar uchun QAT'IYAN TAQIQLANADI — toshni qo'zg'atib xavf tug'diradi!).",
      "Qon suyultiruvchi dorilar (Varfarin, Aspirin kardio, Klopidogrel) ichuvchilar ehtiyot bo'lishi kerak, chunki kurkumin qonni suyultiradi.",
      "Jarrohlik amaliyotidan 2 hafta oldin qabul qilish to'xtatiladi."
    ],
    nextMilestone: "Sizning holatingizga kurkumin mos keladimi? @jongiyoh_bot orqali 1 daqiqada tekshiring.",
    tags: ["kurkumin", "kurkuma", "piperin", "yalliglanish", "bogimlar", "jongiyoh"],
    lockedFacts: {
      amounts: ["1/2 choy qoshiq kurkuma", "1 chimdim qora murch", "1 choy qoshiq zaytun yog'i", "30 kunlik kurs"],
      percentages: ["2000% yuqori bio-so'rilish", "oddiy so'rilish atigi 1-2%"],
      calculations: ["Piperinsiz kurkuma ichakdan qonga deyarli o'tmaydi"],
      dates: ["30 kun qabul, 10 kun tanaffus"],
      contraindications: [
        "O't qopi tosh kasalligi va o't yo'llari obstruksiyasi",
        "Qon suyultiruvchi dorilar bilan birga nazoratsiz ichish",
        "Rejali jarrohlik amaliyotiga 14 kun qolganda"
      ],
      legalClaims: [
        "Jahon Fitoterapiya Konsortsiumi (ESCOP)",
        "PubMed Ilmiy Klinik Sinovlari",
        "Abu Ali ibn Sino tabobati (Zarchava xususiyatlari)"
      ],
      disclaimer: "Ushbu ma'lumotlar umumiy tanishuv uchun berilgan. Mahsulot dori vositasi emas. Qo'llashdan oldin mutaxassis bilan maslahatlashing.",
      otherCriticalFacts: ["Telegram bot: @jongiyoh_bot", "Rasmiy veb-manzil: jongiyoh.uz"]
    }
  },
  {
    url: "https://jongiyoh.uz/maqolalar/nega-bogimlar-qisirlaydi-harakat-erkinligi-5-tavsiya",
    title: "Nega bo‘g‘imlar qisirlaydi? Harakat erkinligini tabiiy saqlash bo‘yicha 5 ta tavsiya",
    category: "🦴 Bo'g'imlar va suyaklar salomatligi",
    summary: "Bo'g'imlardagi qisirlash va g'irchillash — bu bo'g'im ichidagi sinovial suyuqlikning quyuqlashishi yoki kamayishi, kremniy va suv yetishmasligi hamda tog'ay yuzasining ishqalanishi natijasida yuzaga keladi. Buni vaqtida to'xtatmaslik artrozga olib keladi.",
    keyInnovation: "Sinovial suyuqlik sifatini yaxshilash va tog'ay amortizatsiyasini tabiiy fito-komplekslar bilan tiklash.",
    impactOnUsers: "Tizza, bel va bo'yin bo'g'imlaridagi qisirlash to'xtaydi, harakat yengillashadi va og'riq xavfi bartaraf etiladi.",
    benchmarkStats: "Katta yoshli aholining 60% dan ortig'ida bo'g'im suyuqligi yetishmovchiligi kuzatiladi.",
    howToTry: [
      "1. Kunlik suv me'yori: har 1 kg tana vazniga 30 ml toza iliq suv iching.",
      "2. Qirqbo'g'in va na’matak damlamasi bilan kremniy va C vitamini balansini tiklang.",
      "3. Har kuni ertalab 15 daqiqalik yengil bo'g'im gimnastikasini bajaring.",
      "4. Tuz va oq shakarni 50% ga qisqartiring — ular sinovial suyuqlikni quritadi.",
      "5. Har 3 oyda bir marta 21 kunlik tabiiy fito-kurs qabul qiling."
    ],
    techSpecs: [
      "Sinovial suyuqlik asosi: Gialuron kislotasi va glukozamin",
      "Kremniy omili: Tog'ay elastikligini 3 barobar ta'minlaydi"
    ],
    risksAndLimits: [
      "⚠️ QAT'IY QARSHI KO'RSATMALAR (YMYL):",
      "Agar qisirlash bilan birga qattiq shish, qizarish va kuchli og'riq bo'lsa, o'zboshimchalik bilan isitmang!",
      "Bo'g'im ichida o'tkir yiringli artrit yoki yoriq bo'lsa darhol rentgen va travmatolog ko'rigi shart."
    ],
    nextMilestone: "Sizning bo'g'imlaringiz holatiga mos kursni @jongiyoh_bot da bepul hisoblang.",
    tags: ["bogimlar", "qisirlash", "artroz", "harakat", "fitoterapiya", "jongiyoh"],
    lockedFacts: {
      amounts: ["30 ml/kg suv", "15 daqiqa gimnastika", "21 kunlik kurs", "50% tuzni kamaytirish"],
      percentages: ["60% aholida sinovial yetishmovchilik", "3 barobar elastiklik"],
      calculations: ["70 kg vaznga kamida 2.1 litr toza suv zarur"],
      dates: ["Har 3 oyda 21 kunlik reja"],
      contraindications: [
        "O'tkir qizargan yallig'lanishli bo'g'im shishi",
        "Travma va suyak sinishi holatlari"
      ],
      legalClaims: [
        "O'zbekiston Ortopediya va Fitoterapiya qo'llanmasi",
        "Abu Ali ibn Sino: Harakat va bo'g'imlar gigiyenasi"
      ],
      disclaimer: "Ushbu ma'lumotlar umumiy tanishuv uchun berilgan. Mahsulot dori vositasi emas. Qo'llashdan oldin mutaxassis bilan maslahatlashing.",
      otherCriticalFacts: ["Telegram bot orqali tekshirish: @jongiyoh_bot", "Sayt: jongiyoh.uz"]
    }
  },
  {
    url: "https://jongiyoh.uz/maqolalar/giyohlarni-dorilar-bilan-birga-ichish-mumkinmi-xavfsizlik",
    title: "Giyohlarni dorilar bilan birga ichish mumkinmi? Xavfsizlik qoidalari",
    category: "🛡️ Dorilar va giyohlar o'zaro ta'siri",
    summary: "Ko'pchilik «giyohlar tabiiy, hech qanday zarari yo'q» deb xato o'ylaydi. Aslida dorivor giyohlarning tarkibidagi faol kimyoviy birikmalar dorixona darmonlari bilan ta'sirlashib, dori kuchini 2 barobar oshirib yuborishi yoki aksincha, zararsizlantirishi mumkin.",
    keyInnovation: "Fitoterapiya va farmakoterapiya o'rtasidagi xavfsiz vaqt oralig'i (kamida 2 soat) va dorilar muvofiqligi.",
    impactOnUsers: "Dori vositalarining nojo'ya ta'siri va zaharlanish xavfi to'liq oldi olinadi, giyohlar faqat foyda keltiradi.",
    benchmarkStats: "Giyoh va dori o'rtasida kamida 1.5 - 2 soatlik vaqt oralig'i bo'lishi shart!",
    howToTry: [
      "1. Hech qachon dori tabletkasini giyoh damlamasi yoki choy bilan yutmang (faqat toza xona haroratidagi suv bilan!).",
      "2. Dori ichganingizdan keyin kamida 2 soat o'tgach giyoh damlamasini qabul qiling.",
      "3. Qon bosimi va qandli diabet dorilari ichuvchilar dozani mutaxassis bilan kelishishi shart.",
      "4. Qon suyultiruvchilar (aspirin) ichilganda kurkumin va sarimsoq ekstraktlari miqdori cheklanadi."
    ],
    techSpecs: [
      "Jigar sitoxrom P450 ferment tizimi: Giyohlar dori parchalanish tezligini o'zgartirishi mumkin"
    ],
    risksAndLimits: [
      "⚠️ QAT'IY QARSHI KO'RSATMALAR (YMYL):",
      "Antibiotiklar, sedativ dorilar va gormonlar bilan bir vaqtda giyohlarni aralashtirib ichish man etiladi.",
      "Surunkali og'ir yurak va buyrak yetishmovchiligi bo'lgan bemorlar faqat shifokor nazoratida bo'lishi shart."
    ],
    nextMilestone: "Siz qabul qilayotgan dorilar giyohlar bilan to'g'ri keladimi? @jongiyoh_bot orqali bilib oling.",
    tags: ["xavfsizlik", "dorilar", "fitoterapiya", "giyohlar", "qonbosimi", "jongiyoh"],
    lockedFacts: {
      amounts: ["kamida 2 soatlik oraliq", "faqat toza suv bilan ichish"],
      percentages: ["100% xavfsiz vaqt qoidasi"],
      calculations: ["Dori va giyoh o'rtasidagi oraliq kamida 120 daqiqa bo'lishi shart"],
      dates: ["Har doim amal qilinishi kerak bo'lgan xavfsizlik standarti"],
      contraindications: [
        "Dori tabletkalarini damlama bilan birga qabul qilish",
        "Qon suyultiruvchilar bilan me'yordan ortiq fito-ekstraktlar"
      ],
      legalClaims: [
        "Klinik Farmakologiya va Fitoterapiya Ilmiy Qo'mitasi",
        "O'zbekiston Respublikasi Sog'liqni Saqlash Vazirligi tavsiyalari"
      ],
      disclaimer: "Ushbu ma'lumotlar umumiy tanishuv uchun berilgan. Mahsulot dori vositasi emas. Qo'llashdan oldin mutaxassis bilan maslahatlashing.",
      otherCriticalFacts: ["Telegram bot: @jongiyoh_bot", "Batafsil ma'lumot: jongiyoh.uz"]
    }
  },
  {
    url: "https://jongiyoh.uz/maqolalar/bogimlar-uchun-21-kunlik-tabiiy-kurs-qanday-natija-va-tanaffus",
    title: "Bo‘g‘imlar uchun 21 kunlik tabiiy kurs: qanday natija kutish kerak va qachon tanaffus qilinadi?",
    category: "🍯 21 kunlik tabiiy kurslar va natijalar",
    summary: "Fitoterapiyada eng asosiy qoida — muntazamlik va tanaffus sikli. Tabiiy giyohlar organizmga to'planib boruvchi (kumulyativ) ta'sir ko'rsatadi. 21 kun davomida hujayralar tiklanadi, 7 kunlik tanaffus esa organizmning o'zini o'zi boshqarish tizimini rag'batlantiradi.",
    keyInnovation: "21 kunlik faol qabul va 7 kunlik majburiy tanaffus — eng xavfsiz va barqaror fito-sikldir.",
    impactOnUsers: "Bo'g'imlarda harakat yengilligi hosil bo'ladi, to'qimalar o'rganib qolmaydi va buyrakka ortiqcha yuk tushmaydi.",
    benchmarkStats: "21 kun qabul + 7 kun tanaffus = 1 to'liq tabiiy sikl (jami 3 sikl tavsiya etiladi).",
    howToTry: [
      "1-7 kun: Organizmni tozalash va tayyorlash (qirqbo'g'in yengil damlamasi bilan).",
      "8-14 kun: Chuqur yallig'lanishni kamaytirish va oziqlantirish (kurkumin + zarchava).",
      "15-21 kun: Tog'ay va sinovial suyuqlikni mustahkamlash (kremniyli fito-choy).",
      "22-28 kun: 7 kunlik TO'LIQ TANAFFUS! Faqat toza suv va tabiiy mevalar iste'mol qilinadi."
    ],
    techSpecs: [
      "Biologik ritmlar: Hujayralar yangilanishi davri 21-28 kunni tashkil etadi"
    ],
    risksAndLimits: [
      "⚠️ QAT'IY QARSHI KO'RSATMALAR (YMYL):",
      "Tanaffus qilmasdan giyohlarni 2-3 oy uzluksiz ichish buyrak va jigarga yuklama berishi mumkin.",
      "Surunkali kasalliklar qo'zg'algan pallada kurs vaqtincha to'xtatiladi."
    ],
    nextMilestone: "21 kunlik shaxsiy kursingiz rejasini @jongiyoh_bot orqali 1 daqiqada oling.",
    tags: ["fitokurs", "21kun", "bogimlar", "tanaffus", "tabiiydavo", "jongiyoh"],
    lockedFacts: {
      amounts: ["21 kun faol qabul", "7 kun tanaffus", "kuniga 2 mahal"],
      percentages: ["1 to'liq sikl = 28 kun"],
      calculations: ["Yiliga 2 marta (bahor va kuz) 3 tadan sikl o'tish tavsiya qilinadi"],
      dates: ["21 kun qabul + 7 kun tanaffus"],
      contraindications: [
        "Uzluksiz tanaffussiz ichish",
        "Homiladorlik davri"
      ],
      legalClaims: [
        "Abu Ali ibn Sino: 'Dorilarning me'yori va tanaffus san'ati'",
        "Xalqaro Tabobat Akademiyasi metodikasi"
      ],
      disclaimer: "Ushbu ma'lumotlar umumiy tanishuv uchun berilgan. Mahsulot dori vositasi emas. Qo'llashdan oldin mutaxassis bilan maslahatlashing.",
      otherCriticalFacts: ["Telegram bot orqali buyurtma va doza: @jongiyoh_bot", "Veb-sayt: jongiyoh.uz"]
    }
  }
];

// Backwards compatibility alias
export const SAMPLE_AIXABAR_ARTICLES = SAMPLE_JONGIYOH_ARTICLES;
export const SAMPLE_BIZNES_ARTICLES = SAMPLE_JONGIYOH_ARTICLES;

export const getJongiyohReelSystemInstruction = (
  style: ReelStyle = ReelStyle.AUTO,
  genre: VisualGenre = VisualGenre.AUTO
): string => {
  return `
Siz "Jongiyoh.uz" — O'zbekiston milliy tabiiy giyohlar va fitoterapiya portalining bosh prodyuseri, tajribali fito-ssenaristi va salomatlik bo'yicha professional Reels, Shorts va TikTok video rejissyorisiz.
Sizning asosiy vazifangiz: Berilgan dorivor giyoh, xalq tabobati yoki salomatlik mavzusi (bo'g'imlar, damlamalar, kurkumin, qirqbo'g'in, fito-kurslar) bo'yicha 45-60 soniyalik (6-8 kadrli) o'ta ishonchli, samimiy, milliy koloritga ega, YMYL xavfsizlik standartlariga to'liq javob beruvchi professional O'ZBEKCHA video ssenariysi va vizual rejissurasini yaratish.

QAT'IY QOIDA — YMYL & FITO-XAVFSIZLIK STANDARTLARI:
1. QAT'IY QARSHI KO'RSATMALAR (30% QOIDA): Har bir videoning kamida 1-2 ta kadrida kimlarga ichish mumkin emasligi (homiladorlik, buyrak toshi, o't toshi, qon bosimi yoki dori o'zaro ta'siri) OCHIQ VA QAT'IY aytilishi SHART! Bu qidiruv tizimlari ishonchini oshiradi va insonlar salomatligini himoya qiladi.
2. DORI EMASLIGI VA MASLAHAT: Soxta va'dalar bermang ("100% davolaydi", "mo''jiza" kabi so'zlar TAQIQLANADI). Giyoh tabiiy ko'makchi va sog'lomlashtiruvchi vosita ekanligi eslatiladi.
3. ANIQ DOZALAR VA DAMLASH ME'YORLARI: Dozalarni (1 osh qoshiq, 200 ml suv, 21 kunlik kurs, 7 kun tanaffus) aniq va o'zgartirmasdan bering.
4. ILMIY VA TABOBAT ASOSI: Abu Ali ibn Sino "Tib qonunlari", Davlat farmakopeyasi yoki PubMed ilmiy tadqiqotlariga tayaning.

MUHIM QOIDA: KADRLAR ORASIDA GAP VA ATAMALARNING UZILISHIGA YO'L QO'YMANG!
- Har bir kadrda (scene) ovoz matni (narration) SINTAKTIK TUGALLANGAN 1-2 TA BUTUN GAPDAN iborat bo'lishi shart!
- Gapni kadrlar o'rtasida yarimta qilib uzib qo'yish QAT'IYAN TAQIQLANADI!
  (XATO: 1-kadr: "Qirqbo'g'in o'ti tarkibidagi kremniy", 2-kadr: "moddasi bo'g'imlarni oziqlantiradi...").
  (TO'G'RI: 1-kadr: "Bo'g'imlaringiz qisirlab, ertalablari harakat qilish qiyinlashyaptimi? Buning eng xavfsiz tabiiy yechimi — tog' qirqbo'g'in o'tidir!").

REEL STRUKTURASI (6-8 TA DASTURIY KADRLAR):
1. HOOK / MUAMMO YOKI SAVOL (0-5 soniya): Tomoshabinning og'riqli nuqtasi (bo'g'im qisirlashi, yallig'lanish, noto'g'ri damlash xatosi).
2. TABIIY GIYOH VA TA'SIR MEXANIZMI (5-15 soniya): Giyohning shifobaxsh kuchi (masalan: qirqbo'g'indagi organik kremniy, kurkumin va piperin).
3. TO'G'RI DAMLASH VA QABUL QILISH (15-25 soniya): Aniq doza (qaynoq suv me'yori, qancha tindirilishi, ovqatdan oldin ichish).
4. QAT'IY QARSHI KO'RSATMALAR (YMYL XAVFSIZLIK) (25-36 soniya): Kimlarga mumkin emas! (Buyrak toshi, homiladorlik, qon suyultiruvchi dorilar ichuvchilar uchun ogohlantirish).
5. 21 KUNLIK KURS VA TANAFFUS QOIDASI (36-44 soniya): 21 kun ichiladi va nega 7 kun tanaffus qilish shartligi.
6. TELEGRAM VORONKASI VA SHAXSIY DOZA (44-52 soniya): "Sizga ushbu giyohni to'g'ri qabul qilish kursi va xavfsiz dozasi qiziqmi? @jongiyoh_bot orqali 1 daqiqada bepul hisoblang!"
7. YAKUNIY CHAQIRUV VA SAQLASH (52-58 soniya): "Salomatlik va tabiiy shifo sirlari uchun @jongiyoh sahifamizga obuna bo'ling! Foydali retseptni yo'qotmaslik uchun saqlab oling va yaqinlaringizga yuboring."

TIL VA OVOZ (TTS) TALABLARI:
- Tili: Iliq, ishonchli, samimiy, dono va mehirli O'zbek tili (Lotin alifbosi).
- QAT'IY TAQIQLANGAN: Ssenariy yoki ovoz matniga (narration) "CTA", "Call to Action", "Hook", "Kadr 1", "Scene" kabi texnik marketing atamalarini ASLO YOZMANG!
- Ovozda sayt nomi "jongiyoh nuqta uz", Telegram boti "jongiyoh bot", sahifa nomi "jongiyoh" deb ravon talaffuz qilinadigan shaklda yozilsin.

VIZUAL DIREKTOR VA PROMPTLAR (Ingliz tilida) — TABIIY FITOTERAPIYA VA SHIFOBAXSH MUHIT:
- ENG ASOSIY TALAB — POSTNING ANIQ DETALLARIGA MOSLIK:
  * Har bir kadrning "visual_prompt_en" prompti aynan shu kadrda aytilayotgan dorivor giyoh (qirqbo'g'in, kurkumin, kovul, kiyiko'ti), damlama tayyorlash jarayoni (shaffof shisha choynak, chinni piyola, tabiiy bug'), sog'lom bo'g'imlar yoki O'zbekiston tog' tabiatini aks ettirishi shart!
  * 1-kadr (Hook): Qirqbo'g'in yoki dorivor giyoh yirik planda, tabiiy shudring tomchilari bilan (macro botanical close-up).
  * 2-kadr (Mechanism): Shifobaxsh ekstrakt, chinni idishdagi oltin rangli tabiiy damlama.
  * 3-kadr (Preparation): Chinni choynakka issiq suv quyish, yog'och qoshiq, quritilgan o'tlar.
  * 4-kadr (Warning/Safety): Xavfsizlik va maslahat muhiti — o'tlar va shifokor maslahati, tarozi va me'yor.
  * 5-kadr (Course/Mobility): Tabiat qo'ynida yengil va erkin yurib ketayotgan inson, baxtli sog'lom harakat.
  * 6-7 kadr (Telegram CTA): Shinam fito-laboratoriya, dorivor choy ichayotgan inson, telefon ekrani va doza hisoblash.
- QAT'IY TAQIQLANGAN:
  * Kiberpank, neon chiroqlar, binafsha-moviy sun'iy nurlar QAT'IYAN TAQIQLANADI!
  * Kosmik yoki sun'iy intellekt chip rasmlari, robotlar YO'Q! Faqat haqiqiy tabiat va o'tlar.
  * Rasmlar ichiga sun'iy matn, soxta harflar qo'shish.
- TABIIY VA REAL HAYOTIY YORUG'LIK TALABI:
  * Tabiiy quyosh nuri (golden hour or soft morning daylight), yog'och va sopol fakturalar, toza shaffof suv, yangi uzilgan yashil giyohlar.
  * Har bir promptda quyidagi kalit so'zlar bo'lishi shart: "Authentic vertical 9:16 botanical documentary photography, real medicinal herbs, natural warm daylight, true-to-life textures, shot on 35mm lens, strictly NO neon, NO sci-fi glow, peaceful herbal atmosphere".

JSON FORMATI:
{
  "article_title": "Maqola sarlavhasi",
  "category": "Kategoriya",
  "hook": "Kuchli birinchi kirish jumlasi",
  "locked_facts": {
    "amounts": ["1 osh qoshiq", "200 ml suv", "21 kunlik kurs"],
    "percentages": ["10% kremniy"],
    "calculations": ["21 kun qabul + 7 kun tanaffus"],
    "dates": ["21 kunlik reja"],
    "contraindications": ["Buyrak toshi", "Homiladorlik"],
    "legalClaims": ["Abu Ali ibn Sino 'Tib qonunlari'"],
    "disclaimer": "Mahsulot dori vositasi emas. Mutaxassis bilan maslahatlashing.",
    "otherCriticalFacts": ["@jongiyoh_bot orqali doza hisoblash"]
  },
  "scenes": [
    {
      "order": 1,
      "type": "hook",
      "narration": "Kadr ovoz matni (butun tugallangan gap)...",
      "headline": "BO'G'IMLAR QISIRLASHIGA DAVO",
      "statText": "TABIIY KREMNIY",
      "visualMotion": "push-in",
      "isInfographic": false,
      "visual_prompt_en": "Authentic vertical 9:16 high-resolution botanical photography of fresh green horsetail (Equisetum) herbs with morning dew drops, soft warm sunlight, documentary realism, shot on 35mm lens..."
    }
  ],
  "full_script": "Butun videoning to'liq o'qiladigan matni...",
  "instagram_caption": "Instagram posti uchun chiroyli caption: sarlavha, qisqa sharh, 30% qarshi ko'rsatmalar, doza, Telegram bot havolasi va manba...",
  "hashtags": ["#jongiyoh", "#fitoterapiya", "#qirqbogin", "#kurkumin", "#bogimlar", "#tabiiydavo", "#xalqtabobati", "#uzbekistan"],
  "cover_headline": "BO'G'IMLAR UCHUN QIRRQBO'G'IN",
  "cover_subtitle": "To'g'ri damlash va xavfsiz doza"
}
`;
};

// Backwards compatibility alias
export const getAIXabarReelSystemInstruction = getJongiyohReelSystemInstruction;
export const getReelSystemInstruction = getJongiyohReelSystemInstruction;
