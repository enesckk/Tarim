export type IconKey =
  | 'home'
  | 'sosyal'
  | 'tahil'
  | 'aromatik'
  | 'klonlama'
  | 'aricilik'
  | 'katma'
  | 'sekabel'
  | 'analiz'
  | 'vizyon'
  | 'basvuru'
  | 'takip'
  | 'egitim'
  | 'uretim'
  | 'hasat'
  | 'pazara'
  | 'tahsis'
  | 'alim'

export type Accent = 'green' | 'lavender' | 'amber' | 'cyan'

export type TitleSeg = { text: string; accent?: boolean }
export type TitleLine = TitleSeg[]

export type BottomCard = {
  icon: string
  title: string
  desc: string
}

export type Chapter = {
  id: string
  index: number
  navLabel: string
  eyebrow: string
  title: TitleLine[]
  description?: string
  accent: Accent
  image: string
  icon: IconKey
  primaryCta?: { label: string; action?: string }
  secondaryCta?: { label: string; action?: string }
  bottomCards?: BottomCard[]
  scene:
    | 'seed'
    | 'satellite'
    | 'aerial'
    | 'apply'
    | 'phone'
    | 'training'
    | 'field'
    | 'harvest'
    | 'product'
}

export const CHAPTERS: Chapter[] = [
  {
    id: 'baslangic',
    index: 1,
    navLabel: 'Başlangıç',
    eyebrow: '01 — BAŞLANGIÇ',
    title: [
      [{ text: 'Toprağı üretime,' }],
      [{ text: 'üretimi değere ', accent: true }],
      [{ text: 'dönüştürüyoruz.', accent: true }],
    ],
    description:
      'Atıl ve değerlendirilmeyen kaynakları üretime kazandırıyor; insanı, bilgiyi ve üretimi sürdürülebilir bir ekonomik modelde buluşturuyoruz.',
    accent: 'green',
    image: '/chapters/1.webp',
    icon: 'home',
    primaryCta: { label: 'PROJEYİ İNCELE' },
    secondaryCta: { label: 'Detaylı bilgi →' },
    bottomCards: [
      { icon: 'sprout', title: 'Atıl Araziler', desc: 'Boş ve kullanılmayan araziler üretime kazandırılır.' },
      { icon: 'user', title: 'Sosyal Model', desc: 'Dezavantajlı bireylere dönemlik arazi tahsisi.' },
      { icon: 'phone', title: 'Üretim Desteği', desc: 'Tohum, ekipman ve uzman rehberliği sağlanır.' },
      { icon: 'shield', title: 'Alım Garantisi', desc: 'Üretilen tüm mahsul güvence ile satın alınır.' },
    ],
    scene: 'seed',
  },
  {
    id: 'sosyal-uretim',
    index: 2,
    navLabel: 'Sosyal Üretim',
    eyebrow: '02 — SOSYAL ÜRETİM',
    title: [
      [{ text: 'Üretmek isteyen' }],
      [{ text: 'insana alan ', accent: true }],
      [{ text: 'açıyoruz.', accent: true }],
    ],
    description:
      'Uygun katılımcıları belirliyor, dezavantajlı bireylere öncelik veriyor ve üretim yapacakları alanları dönemlik olarak tahsis ediyoruz.',
    accent: 'green',
    image: '/chapters/2.webp',
    icon: 'sosyal',
    primaryCta: { label: 'BAŞVURU SÜRECİ' },
    secondaryCta: { label: 'Detaylı bilgi →' },
    bottomCards: [
      { icon: 'user', title: 'Adil Seçim', desc: 'Şeffaf değerlendirme ile dezavantajlı gruplara öncelik.' },
      { icon: 'sprout', title: 'Dönemlik Tahsis', desc: 'Belirlenen alanlar üreticilere dönemlik verilmektedir.' },
      { icon: 'phone', title: 'Eğitim Desteği', desc: 'Uygulamalı teknik eğitim ve altyapı sağlanır.' },
      { icon: 'shield', title: 'Üretici Güvencesi', desc: 'Emeğin karşılığı alım garantisi ile korunur.' },
    ],
    scene: 'apply',
  },
  {
    id: 'tahil-uretimi',
    index: 3,
    navLabel: 'Tahıl Üretimi',
    eyebrow: '03 — TAHIL ÜRETİMİ',
    title: [
      [{ text: 'Verimli topraklarda' }],
      [{ text: 'sürdürülebilir tahıl ', accent: true }],
      [{ text: 'üretimi.', accent: true }],
    ],
    description:
      'Modern tarım teknikleri, doğru planlama ve nitelikli tohumlarla yüksek verim hedefliyoruz. Toprağımıza değer katıyor, geleceğe güvenle üretiyoruz.',
    accent: 'amber',
    image: '/chapters/3.webp',
    icon: 'tahil',
    primaryCta: { label: 'TAHIL ÜRETİMİ SÜRECİ' },
    secondaryCta: { label: 'Detaylı bilgi →' },
    bottomCards: [
      { icon: 'sprout', title: 'Doğru Planlama', desc: 'Bilimsel analizler ile doğru ekim planlaması.' },
      { icon: 'phone', title: 'Modern Teknoloji', desc: 'Gelişmiş makinelerle verimli üretim.' },
      { icon: 'chart', title: 'Yüksek Verim', desc: 'Kaliteli tohum ve doğru uygulamalarla verim artışı.' },
      { icon: 'leaf', title: 'Sürdürülebilir Üretim', desc: 'Toprağı koruyarak geleceğe değer katıyoruz.' },
    ],
    scene: 'field',
  },
  {
    id: 'aromatik-bitkiler',
    index: 4,
    navLabel: 'Aromatik Bitkiler',
    eyebrow: '04 — AROMATİK BİTKİLER',
    title: [
      [{ text: 'Doğadan gelen değeri' }],
      [{ text: 'katma değerli üretime ', accent: true }],
      [{ text: 'dönüştürüyoruz.', accent: true }],
    ],
    description:
      'İlk lokomotif ürünümüz lavanta başta olmak üzere, katma değeri yüksek tıbbi ve aromatik bitkileri yerli üreticilerimizle birlikte yetiştiriyoruz.',
    accent: 'lavender',
    image: '/chapters/4.webp',
    icon: 'aromatik',
    primaryCta: { label: 'LAVANTA ÜRETİMİ' },
    secondaryCta: { label: 'Detaylı bilgi →' },
    bottomCards: [
      { icon: 'leaf', title: 'Lokomotif Ürün', desc: 'Lavanta üretimi ile katma değerli tarım.' },
      { icon: 'sprout', title: 'Doğal Çeşitlilik', desc: 'Bölgeye uygun tıbbi ve aromatik bitkiler.' },
      { icon: 'sparkles', title: 'Lavanta Balı', desc: 'Lavanta bahçelerimizden yüksek prolinli bal üretimi.' },
      { icon: 'shield', title: 'Ekonomik Kazanç', desc: 'Yüksek pazar değerli nitelikli mahsul.' },
    ],
    scene: 'training',
  },
  {
    id: 'bitki-klonlama',
    index: 5,
    navLabel: 'Bitki Klonlama',
    eyebrow: '05 — BİTKİ KLONLAMA',
    title: [
      [{ text: 'Bilimle çoğaltıyor,' }],
      [{ text: 'sağlıklı fidelerle ', accent: true }],
      [{ text: 'büyütüyoruz.', accent: true }],
    ],
    description:
      'Kaliteli bitki materyallerini bilimsel yöntemlerle çoğaltıyor, daha güçlü ve hastalıksız bir tarımsal üretimi destekliyoruz.',
    accent: 'cyan',
    image: '/chapters/5.webp',
    icon: 'klonlama',
    primaryCta: { label: 'SÜRECİ KEŞFET' },
    secondaryCta: { label: 'Detaylı bilgi →' },
    bottomCards: [
      { icon: 'leaf', title: 'Yüksek Kalite', desc: 'Üstün genetik potansiyel.' },
      { icon: 'sprout', title: 'Sağlıklı Başlangıç', desc: 'Hastalıksız, güçlü fide üretimi.' },
      { icon: 'brain', title: 'Kontrollü Üretim', desc: 'Bilimsel ve izlenebilir doku kültürü.' },
      { icon: 'chart', title: 'Sürdürülebilir Gelecek', desc: 'Doğaya ve üreticiye yüksek değer.' },
    ],
    scene: 'satellite',
  },
  {
    id: 'aricilik-bal',
    index: 6,
    navLabel: 'Arıcılık & Bal',
    eyebrow: '06 — ARICILIK & BAL',
    title: [
      [{ text: 'Doğal potansiyeli' }],
      [{ text: 'sürdürülebilir üretime ', accent: true }],
      [{ text: 'dönüştürüyoruz.', accent: true }],
    ],
    description:
      'Lavanta bahçelerimiz ve florası zengin alanlarımızda modern arıcılık teknikleriyle katkısız, saf ve kaliteli bal üretiyoruz.',
    accent: 'amber',
    image: '/chapters/6.webp',
    icon: 'aricilik',
    primaryCta: { label: 'ARICILIK MODELİ' },
    secondaryCta: { label: 'Detaylı bilgi →' },
    bottomCards: [
      { icon: 'hexagon', title: 'Doğal Popülasyon', desc: 'Flora zengini alanlarda sürdürülebilir arıcılık.' },
      { icon: 'hexagon', title: 'Saf & Katkısız Bal', desc: 'Yüksek prolinli, saf ve doğal bal üretimi.' },
      { icon: 'leaf', title: 'Tozlaşma Desteği', desc: 'Tarımsal verimi artıran ekolojik flora dengesi.' },
      { icon: 'shield', title: 'Alım Garantisi', desc: 'Üretilen tüm bal alım garantisi ile satın alınır.' },
    ],
    scene: 'harvest',
  },
  {
    id: 'katma-deger',
    index: 7,
    navLabel: 'Katma Değer',
    eyebrow: '07 — KATMA DEĞER',
    title: [
      [{ text: 'Üreticiden alıyor,' }],
      [{ text: 'işleyerek değerini ', accent: true }],
      [{ text: 'büyütüyoruz.', accent: true }],
    ],
    description:
      'Şekabel Kooperatifi olarak; tahıldan aromatik bitkilere, arıcılık ürünlerinden fideye kadar üreticilerimizden aldığımız ürünleri modern tesislerimizde işleyip paketliyor, katma değere dönüştürüyoruz.',
    accent: 'green',
    image: '/chapters/7.webp',
    icon: 'katma',
    primaryCta: { label: 'KATMA DEĞER SÜRECİNİ İZLE' },
    secondaryCta: { label: 'Detaylı bilgi →' },
    bottomCards: [
      { icon: 'brain', title: 'İşleme', desc: 'Modern tesislerde hijyenik işleme.' },
      { icon: 'phone', title: 'Paketleme', desc: 'Çevre dostu ve güvenli paketleme.' },
      { icon: 'shield', title: 'Kooperatif Güvencesi', desc: 'Şeffaf ve sürdürülebilir süreç.' },
      { icon: 'chart', title: 'Katma Değer', desc: 'Üreticiden alınan değeri katlayarak büyütüyoruz.' },
    ],
    scene: 'product',
  },
  {
    id: 'sekabel',
    index: 8,
    navLabel: 'Şekabel',
    eyebrow: '08 — ŞEKABEL',
    title: [
      [{ text: 'Tarladan rafa,' }],
      [{ text: 'güvenle ', accent: true }],
      [{ text: 'ulaştırıyoruz.', accent: true }],
    ],
    description:
      'Şekabel aracılığıyla tahıl, aromatik bitkiler, bal ve diğer üretim çıktılarımız, güvenilir ve düzenli satış ağımızla tüketiciyle buluşur.',
    accent: 'green',
    image: '/chapters/8.webp',
    icon: 'sekabel',
    primaryCta: { label: "ŞEKABEL'İ KEŞFET" },
    secondaryCta: { label: 'Detaylı bilgi →' },
    bottomCards: [
      { icon: 'shield', title: 'Güvenilir Satış', desc: 'Kaliteli ürünleri güvenle tüketiciye ulaştırırız.' },
      { icon: 'user', title: 'Kooperatif Ağı', desc: 'Güçlü kooperatif yapımızla yaygın satış noktaları.' },
      { icon: 'leaf', title: 'Yerel Ürünler', desc: 'Yerelden üretilen, doğal ve katkısız ürünler.' },
      { icon: 'phone', title: 'Tüketiciye Ulaşım', desc: 'Düzenli ve sürdürülebilir dağıtım ağı.' },
    ],
    scene: 'product',
  },
]
