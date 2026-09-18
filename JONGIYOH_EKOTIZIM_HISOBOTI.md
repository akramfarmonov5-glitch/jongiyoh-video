# Jongiyoh Ekotizimi: Bosh Boshqaruv va Rivojlanish Hisoboti

Ushbu hujjat **Jongiyoh.uz** ekotizimining barcha asosiy loyihalari (`Jongiyoh.uz` sayti, `jongiyoh video` studiyasi va `veo-video-generator`) bo‘yicha amalga oshirilgan barcha ishlar, xavfsizlik choralari, tuzatilgan xatolar va joriy holatning yagona rasmiy manbasidir.

---

## 1. Jongiyoh.uz — Asosiy Veb-Portal va Do'kon

* **Commitlar soni:** 22 ta commit
* **Sayt ko‘lami:** Bitta sahifadan **28 ta to‘liq sahifali** professional tizimga aylandi.
* **Sitemap:** 21 tadan 28 ta manzilga kengaytirildi.

### Mahsulot Sahifalari Strukturasi
Ilgari butun do‘kon bitta sahifada joylashgan edi. Endi har bir mahsulot o‘zining mustaqil sahifasiga ega:
* `/mahsulot/qirqbogin`
* `/mahsulot/kurkumin`
* `/mahsulot/lebedushka`
* `/mahsulot/altay-gulhayri`
* `/mahsulot/qandli-diabet-choy`
* `/mahsulot/bogimlar-toplami`

**Har bir sahifada:**
- Rasmiy narx va qadoq ma’lumoti;
- **"Nima qila olmaydi"** halol ilmiy chegarasi (soxta da’volar yo‘q);
- To‘g‘ri qabul qilish tartibi va dozalari;
- Ehtiyot choralari va qarshi ko‘rsatmalar (YMYL standarti);
- Tez-tez beriladigan savollar (FAQ);
- Google SEO uchun boyitilgan mikro-ma’lumotlar: `Product`, `BreadcrumbList`, `FAQPage` sxemalari.
- *(Eslatma: Haqiqiy xaridorlar sharhi to‘planmaguncha, yulduzcha reytingi ataylab qo‘yilmadi).*

### Analitika va Kuzatuv (Tracking)
| Ko‘rsatkich | Ilgari | Hozirgi holat |
| :--- | :--- | :--- |
| **Meta Pixel** | 1 / 27 sahifa | **27 / 27 sahifada to‘liq faol** |
| **Buyurtma manbasi** | Faqat `sayt` yoki `miniapp` | Kirgan sahifa + havola + `utm_*` teglari |
| **`event_source_url`** | Doimiy ravishda `/` | Foydalanuvchi buyurtma bergan aniq sahifa |

*CRM ichida har bir buyurtma uchun "Qayerdan kelgan" ma’lumot qutisi ishga tushirildi.*

### Kundalik Avtomatik Maqola Generatsiyasi
- **Rejim:** Har kuni soat **08:00** da Gemini 3.8 yangi maqola qoralamasini tayyorlaydi.
- **Nazorat:** Telegram orqali adminga xabar yuboriladi → Admin tasdiqlaydi → Saytga avtomatik chop etiladi.
- **Xavfsizlik filtri:** Taqiqlangan iboralar (`davolaydi`, `shifo topasiz`...), xavfli HTML va yupqa matnlar rad etiladi.
- **Birinchi chop etilgan maqola:** *"Suyak sho‘rva va jelatin bo‘g‘imga yordam beradimi?"*

---

## 2. Jongiyoh Video — Reels & Shorts Studiyasi

* **Jonli havola:** [https://jongiyoh-video.vercel.app](https://jongiyoh-video.vercel.app)
* **GitHub:** [akramfarmonov5-glitch/jongiyoh-video](https://github.com/akramfarmonov5-glitch/jongiyoh-video)
* **Asosiy vazifasi:** Instagram Reels, TikTok va YouTube Shorts uchun 9:16 vertikal fito-videolar (Hormozi karaoke titrlari, retsept infografikasi, o‘zbekcha nutq va ney musiqasi) yaratish.

### Xavfsizlik Arxitekturasi Inqilobi
* **Muammo:** `vite.config.ts` dagi `define` sozlamasi sababli `GEMINI_API_KEY` frontend bundle fayliga ochiq holda tushib qolish xavfi bor edi.
* **Yechim:**
  - Barcha Gemini so‘rovlari uchun Vercel Serverless funksiyasi (`api/gemini.ts`) yaratildi.
  - `vite.config.ts` dan barcha `define` kalitlari tozalab tashlandi.
  - Frontend JS bundle hajmi **669 KB dan 385 KB gacha qisqardi** (40% tezlashdi).
  - Client bundle ichida API kalit izi **0 ta** ekanligi audit qilindi va mustaqil tasdiqlandi.
  - Brauzerdan to‘g‘ridan-to‘g‘ri chiqish yo‘q, barcha so‘rovlar xavfsiz `/api/gemini` proksisi orqali o‘tadi.

---

## 3. Veo Video Generator — AI Kinematik Video Tizimi

* **Lokal manzil:** `http://localhost:3001`
* **Texnologik asos:** Express + Vite + FFmpeg + Google Veo 3.1 Fast / Gemini Omni.
* **Hisoblar taqsimoti:** Video renderlash — Vertex AI xizmat hisobi (`service_account.json`), matn va promptlar — `GEMINI_API_KEY`.
* **Yangi ishlab chiqilgan vositalar:**
  - `tools/ovoz-qosh.mjs` — Gemini TTS nutqini videoga avtomatik montaj qiladi.
  - `tools/musiqa.mjs` — Toza litsenziyali fon musiqasini procedural sintezlaydi.
* **Kashfiyot:** Standart Google TTS da o‘zbekcha ovoz yo‘q, biroq **Gemini TTS** va **Omni 1.1** o‘zbekcha ravon va tabiiy gapiradi.
* **Amaliy natija:** 60.6 soniyalik, 6 kadrli, yagona qahramonli, to‘liq o‘zbekcha nutqli Veo sinov videosi muvaffaqiyatli chiqarildi.

---

## 4. Aniqlangan va To'liq Tuzatilgan Xatoliklar

Ekotizim auditida aniqlanib, to‘liq bartaraf etilgan kamchiliklar:

| Aniqlangan xato | Oqibati va xavfi | Qilingan tuzatish |
| :--- | :--- | :--- |
| `?product=` o‘qilmasligi | 15 ta maqola CTA havolasi doim Qirqbo‘g‘inga olib borardi | URL parametrini to‘g‘ri parslash yo‘lga qo‘yildi |
| Chegirma noaniqligi | Bitta mahsulotda −20% va −25% yonma-yon ko‘rinardi | Yagona matematik hisob-kitob kiritildi |
| Apostrof filtri xatosi | `"dori o'rnini bosadi"` iborasi tekshiruvdan o‘tib ketardi | RegExp filtri O‘zbekcha apostroflarga moslashtirildi |
| `tasdiqla()` funksiyasi | Uchta boshqaruv tugmasi bosilganda hech narsa qilmasdi | Funksiya bog‘lanishi to‘g‘rilandi |
| Postgres sana formati | `Thu Sep 17` Search Console’da 3 ta xatolik keltirib chiqargan | ISO 8601 xalqaro formatiga o‘tkazildi |
| Telegram xabari yo‘qolishi | Sarlavhada `&` belgisi bo‘lsa, xabar yetib bormasdi | URL encode va xavfsiz matn uzatish joriy etildi |
| Brend nomi takrori | `... \| Jongiyoh — Jongiyoh.uz` (74 belgi, sarlavha buzilardi) | Qisqa va toza SEO title formatiga keltirildi |
| To‘plam sinov surati | Google Schema indeksiga test rasmi chiqib qolgan edi | Haqiqiy mahsulot surati bilan almashtirildi |
| Gemini Omni 401 xatosi | Eski kalit sababli 401 berib, bildirmasdan Veo’ga tushardi | Yangi Tier 1 kalit ulandi va Omni tiklandi |
| API kalit sizishi xavfi | `vite.config.ts` kalitni client bundle’ga yozib yuborardi | Serverless `/api/gemini` proksisi qurildi |

---

## 5. Sarf-Xarajatlar Balansi (Billing Tahlili)

* **Video generatsiyasi (Veo 3.1 + Omni):** ≈ **$18 – $20** (60 soniyalik video).
* **TTS nutq va matn so‘rovlari:** ≈ **$0.50**.
* **Jongiyoh.uz va Serverless API:** **$0** (bepul kvota).
* **To‘lov manbasi:** Kartadan naqd pul yechilmadi — xarajatlar to‘liq `akbarjonrovshanov13@gmail.com` hisobidagi mavjud promo-kreditdan qoplandi.

---

## 6. Ochiq Qolgan Vazifalar va Navbatdagi Qadamlar

1. **📦 Лебедушка va Altay mahsulot qadoqlari:**
   - Haqiqiy qutiga qarab ularning sof og‘irligi (grammi yoki paket soni) kiritilishi kerak.
2. **📈 Google Search Console:**
   - Sanalar to‘g‘rilandi, Google saytni qayta ko‘zdan kechirganda 3 ta xatolik avtomatik yopiladi.
3. **🤖 Ertalabki 08:00 cron jarayoni:**
   - Har kuni soat 08:00 da Telegramga yangi maqola qoralamasi kelishi nazorat qilinadi.
4. **💳 Google Cloud Kredit Muddatlari:**
   - `akbarjon...` hisobidagi qoldiq kredit muddati: **2026-yil 4-oktyabr** (undam keyin pullik rejimga o‘tadi).
   - `optombazar2...` hisobidagi zaxira $300 kredit muddati: **2026-yil 6-noyabr**.
5. **🎵 Yangi videoga musiqa ulash:**
   - `tools/musiqa.mjs` yordamida fito-videoga Sharqona ney yoki mayin fon ohangini berish.
