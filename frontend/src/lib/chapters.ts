export type IconKey =
  | 'home'
  | 'analiz'
  | 'vizyon'
  | 'basvuru'
  | 'takip'
  | 'egitim'
  | 'uretim'
  | 'hasat'
  | 'pazara';

export type Accent = 'lime' | 'gold';

export type TitleSeg = { text: string; accent?: boolean };
/** one visual line = a list of inline segments */
export type TitleLine = TitleSeg[];

export type Feature = {
  icon: IconKey | 'satellite' | 'brain' | 'phone' | 'user' | 'chart' | 'sprout';
  title: string;
  desc?: string;
};

export type Chapter = {
  id: string;
  index: number;
  navLabel: string;
  eyebrow: string;
  title: TitleLine[];
  description?: string;
  accent: Accent;
  serif?: boolean;
  image: string;
  icon: IconKey;
  cta?: { label: string; sub?: string };
  features?: Feature[];
  bullets?: string[];
  /** scene = special foreground effect for the cinematic overlay */
  scene:
    | 'seed'
    | 'satellite'
    | 'aerial'
    | 'apply'
    | 'phone'
    | 'training'
    | 'field'
    | 'harvest'
    | 'product';
};

export const CHAPTERS: Chapter[] = [
  {
    id: 'baslangic',
    index: 1,
    navLabel: 'Başlangıç',
    eyebrow: '01 — BAŞLANGIÇ',
    title: [
      [{ text: 'Yerli ve milli tohumdan' }],
      [{ text: 'toprağa ' }, { text: 'can,', accent: true }],
      [{ text: 'ekonomiye ' }, { text: 'kan,', accent: true }],
      [{ text: 'aileye ' }, { text: 'imkan.', accent: true }],
    ],
    accent: 'gold',
    image: '/chapters/baslangic.png',
    icon: 'home',
    cta: { label: 'Projeyi İzle', sub: '90 Saniye' },
    scene: 'seed',
  },
  {
    id: 'analiz',
    index: 2,
    navLabel: 'Analiz',
    eyebrow: '02 — ANALİZ',
    title: [
      [{ text: 'Atıl halde olan' }],
      [{ text: 'araziler tespit edilir,' }],
      [{ text: 'analiz edilir.', accent: true }],
    ],
    accent: 'lime',
    image: '/chapters/analiz.png',
    icon: 'analiz',
    features: [
      { icon: 'satellite', title: 'Uydu ile sürekli takip edilir' },
      { icon: 'brain', title: 'Yapay zeka ile analiz edilir' },
    ],
    scene: 'satellite',
  },
  {
    id: 'vizyon',
    index: 3,
    navLabel: 'Vizyon',
    eyebrow: '03 — VİZYON',
    title: [
      [{ text: 'Atıl araziler,' }],
      [{ text: 'üretimin geleceğine' }],
      [{ text: 'dönüşüyor.', accent: true }],
    ],
    accent: 'lime',
    image: '/chapters/vizyon.png',
    icon: 'vizyon',
    features: [
      { icon: 'sprout', title: 'Atıl Arazileri Üretime Kazandırıyoruz' },
      { icon: 'chart', title: 'Üreticiyi Güçlendiriyoruz' },
      { icon: 'takip', title: 'Sürdürülebilir Gelecek İnşa Ediyoruz' },
    ],
    scene: 'aerial',
  },
  {
    id: 'dijital-takip',
    index: 4,
    navLabel: 'Dijital Takip & Uzman Desteği',
    eyebrow: '04 — DİJİTAL TAKİP & UZMAN DESTEĞİ',
    title: [
      [{ text: 'Her adımını takip et,' }],
      [{ text: 'uzman desteğiyle güçlen.', accent: true }],
    ],
    accent: 'lime',
    image: '/chapters/dijital-takip.png',
    icon: 'takip',
    features: [
      {
        icon: 'phone',
        title: 'DİJİTAL TAKİP',
        desc: 'Tüm görev ve süreçlerini gerçek zamanlı izle.',
      },
      {
        icon: 'user',
        title: 'UZMAN DESTEĞİ',
        desc: 'Alanında uzman ekibimiz her adımda yanında.',
      },
    ],
    scene: 'phone',
  },
  {
    id: 'egitim',
    index: 5,
    navLabel: 'Eğitim',
    eyebrow: '05 — EĞİTİM',
    title: [
      [{ text: 'Uygulamalı eğitimle' }],
      [{ text: 'üretimde bir adım önde.', accent: true }],
    ],
    description:
      "AgroPark'ta uzmanlarımızla birlikte tarımsal bilginizi pratiğe dönüştürün.",
    accent: 'lime',
    image: '/chapters/egitim.png',
    icon: 'egitim',
    cta: { label: 'AgroPark Eğitim Tanıtımı', sub: '2:15 dk' },
    scene: 'training',
  },
  {
    id: 'uretim',
    index: 6,
    navLabel: 'Üretim',
    eyebrow: '06 — ÜRETİM',
    title: [
      [{ text: 'Modern tarımla', accent: true }],
      [{ text: 'üretim başlar.' }],
    ],
    description: 'Verimli üretim, doğru planlama ve modern ekipmanlarla başlar.',
    bullets: ['Hassas Ekim', 'Damla Sulama', 'Akıllı Makinalar', 'Verimli Üretim'],
    accent: 'gold',
    image: '/chapters/uretim.png',
    icon: 'uretim',
    scene: 'field',
  },
  {
    id: 'hasat',
    index: 7,
    navLabel: 'Garantili Alım',
    eyebrow: '07 — GARANTİLİ ALIM',
    title: [
      [{ text: 'Üretimin' }],
      [{ text: 'karşılığı ', accent: true }, { text: 'hazır.' }],
    ],
    description: 'Ürünler Şekabel Kooperatifi güvencesiyle alınır, üretici kazanır.',
    bullets: ['Garantili Alım', 'Üretici Kazancı', 'Yerel İstihdam', 'Şekabel Kooperatifi'],
    accent: 'gold',
    image: '/chapters/hasat.png',
    icon: 'hasat',
    scene: 'harvest',
  },
  {
    id: 'pazara',
    index: 8,
    navLabel: 'Pazara',
    eyebrow: '08 — PAZARA',
    title: [
      [{ text: 'Üreticiden alıyoruz,' }],
      [{ text: 'tesisimizde işliyoruz,' }],
      [{ text: 'halkımıza sunuyoruz.', accent: true }],
    ],
    description: 'Şehitkamil Tarım Ekosistemi güvencesiyle üreticinin emeğini işleyip doğrudan halkımızın sofrasına ulaştırıyoruz.',
    accent: 'gold',
    image: '/chapters/pazara.png',
    icon: 'pazara',
    cta: { label: 'Kurumsal İletişim & Başvuru', sub: 'Aşağı Kaydır' },
    scene: 'product',
  },
];
