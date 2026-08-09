export type TaskStatus = 'bugun' | 'geciken' | 'tamamlandi'

export type Task = {
  id: string
  title: string
  workflow: string // e.g. "Biber üretimi"
  description: string
  dueLabel: string // "Bugün", "Dün", "2 gün gecikti"
  status: TaskStatus
  photoRequired: boolean
  quantityLabel?: string // e.g. "Miktar (kg)" if quantity is expected
  // filled after completion
  photos?: string[]
  quantity?: string
  completedAt?: string
}

export type ChatMessage = {
  id: string
  from: 'uretici' | 'uzman'
  text?: string
  photo?: string
  time: string
  // problem report metadata
  kind?: 'mesaj' | 'sorun'
  topic?: string
}

export type StepState = 'bitti' | 'suanki' | 'gelecek'

// A note uploaded by the admin or the agronomist for a process step.
export type StepNote = {
  id: string
  author: string
  role: 'Yönetici' | 'Tarım Uzmanı'
  text: string
  time: string
}

export type WorkflowStep = {
  id: string
  title: string
  detail: string // short "ne yapılacak" context
  state: StepState
  taskId?: string // links to an actual task when actionable
  doneLabel?: string // e.g. "Dün 16:40" for finished steps
  // guidance shown when the producer opens the step
  guide?: string // longer "nasıl yapılır" explanation
  tips?: string[] // "dikkat edilecekler"
  notes?: StepNote[] // notes uploaded by admin / agronomist
}

export type AppNotification = {
  id: string
  type: 'gecikme' | 'yeni_gorev' | 'uzman'
  title: string
  body: string
  time: string
  taskId?: string
  read: boolean
}

export const producer = {
  name: 'Mehmet Yılmaz',
  phone: '+90 532 000 00 00',
  field: 'Şehitkamil – Beylerbeyi Tarlası',
  crop: 'Biber',
}

export const expert = {
  name: 'Ziraat Müh. Ayşe Demir',
  role: 'Tarım Uzmanı',
}

export const initialTasks: Task[] = [
  {
    id: 't1',
    title: 'Budama yap',
    workflow: 'Biber üretimi',
    description:
      'Bitkilerin alt yan sürgünlerini temizle. Hastalıklı dalları tarladan uzaklaştır. İşlem bitince fotoğraf ekle.',
    dueLabel: 'Bugün',
    status: 'bugun',
    photoRequired: true,
  },
  {
    id: 't2',
    title: 'Damla sulama kontrolü',
    workflow: 'Biber üretimi',
    description:
      'Ana hat ve laterallerde tıkanıklık var mı kontrol et. Basıncı gözle. Sorun görürsen sorun bildir.',
    dueLabel: 'Bugün',
    status: 'bugun',
    photoRequired: false,
  },
  {
    id: 't3',
    title: 'Gübreleme (taban gübresi)',
    workflow: 'Biber üretimi',
    description:
      'Verilen dozajda taban gübresini uygula. Uygulanan miktarı kaydet ve fotoğraf ekle.',
    dueLabel: '2 gün gecikti',
    status: 'geciken',
    photoRequired: true,
    quantityLabel: 'Uygulanan miktar (kg)',
  },
  {
    id: 't4',
    title: 'Yabancı ot temizliği',
    workflow: 'Biber üretimi',
    description: 'Sıra aralarındaki yabancı otları temizle.',
    dueLabel: 'Dün tamamlandı',
    status: 'tamamlandi',
    photoRequired: true,
    photos: ['/tidy-pepper-field-rows-after-weeding.png'],
    completedAt: 'Dün 16:40',
  },
]

export const workflow = {
  name: 'Biber üretimi',
  season: '2026 Sezonu',
}

// Full production process the admin assigned. Producer sees the whole path:
// finished steps ticked, current step highlighted, upcoming steps dimmed.
export const workflowSteps: WorkflowStep[] = [
  {
    id: 's1',
    title: 'Fide dikimi',
    detail: 'Fideler sıralara dikildi.',
    state: 'bitti',
    doneLabel: '2 hafta önce',
    guide:
      'Fideler sıra arası 70 cm, sıra üzeri 40 cm olacak şekilde dikilir. Kök boğazı toprak seviyesinde kalmalı, çok derine gömülmemeli.',
    tips: [
      'Dikimi serin saatlerde (sabah erken veya akşamüstü) yap.',
      'Dikimden hemen sonra can suyu ver.',
      'Solmuş veya hastalıklı fideleri dikme.',
    ],
    notes: [
      {
        id: 'sn1',
        author: 'Ziraat Müh. Ayşe Demir',
        role: 'Tarım Uzmanı',
        text: 'Fide aralığına dikkat edin, sık dikim havalandırmayı bozuyor ve hastalık riskini artırıyor.',
        time: '2 hafta önce',
      },
    ],
  },
  {
    id: 's2',
    title: 'Yabancı ot temizliği',
    detail: 'Sıra araları temizlendi.',
    state: 'bitti',
    taskId: 't4',
    doneLabel: 'Dün 16:40',
    guide:
      'Sıra aralarındaki yabancı otları kökünden temizle. Bitkiye zarar vermeden çapalama yap.',
    tips: [
      'Otları tarladan uzaklaştır, sıra arasında bırakma.',
      'Bitki köküne yakın çapayı yüzeysel tut.',
    ],
    notes: [
      {
        id: 'sn2',
        author: 'Yönetici',
        role: 'Yönetici',
        text: 'Bu adımın fotoğrafını mutlaka yükleyin, kayıt için gerekli.',
        time: '3 gün önce',
      },
    ],
  },
  {
    id: 's3',
    title: 'Gübreleme (taban gübresi)',
    detail: 'Taban gübresini uygula, miktarı kaydet.',
    state: 'suanki',
    taskId: 't3',
    guide:
      'Verilen dozajda taban gübresini sıra boyunca eşit dağıt ve toprağa karıştır. Uyguladığın miktarı kilogram olarak kaydet.',
    tips: [
      'Dekar başına önerilen dozu aşma.',
      'Gübreyi yaprakların üstüne değil toprağa uygula.',
      'Uygulamadan sonra sulama yap.',
    ],
    notes: [
      {
        id: 'sn3',
        author: 'Ziraat Müh. Ayşe Demir',
        role: 'Tarım Uzmanı',
        text: 'Bu parselde dekara 25 kg uygulayın. Yağmur bekleniyorsa uygulamayı yağmurdan önce bitirin.',
        time: 'Bugün 08:30',
      },
      {
        id: 'sn4',
        author: 'Yönetici',
        role: 'Yönetici',
        text: 'Gübre çuvalının fotoğrafını da ekleyin, marka ve miktar görünsün.',
        time: 'Bugün 08:45',
      },
    ],
  },
  {
    id: 's4',
    title: 'Budama',
    detail: 'Alt yan sürgünleri temizle.',
    state: 'suanki',
    taskId: 't1',
    guide:
      'Bitkinin ilk çatallanmasına kadar olan alt yan sürgünleri (koltuk) elle veya temiz makasla al. Hastalıklı dalları da temizle.',
    tips: [
      'Makası her bitki grubundan sonra dezenfekte et.',
      'Hastalıklı dalları tarladan uzaklaştır.',
      'Aşırı budamadan kaçın, gövdeyi yaralama.',
    ],
    notes: [
      {
        id: 'sn5',
        author: 'Ziraat Müh. Ayşe Demir',
        role: 'Tarım Uzmanı',
        text: 'Nemli havada budama yapmayın, kesim yerlerinden hastalık bulaşabilir.',
        time: 'Dün 17:00',
      },
    ],
  },
  {
    id: 's5',
    title: 'Damla sulama kontrolü',
    detail: 'Hat ve basıncı kontrol et.',
    state: 'suanki',
    taskId: 't2',
    guide:
      'Ana hat ve lateral borularda tıkanıklık, kaçak veya kopukluk var mı kontrol et. Damlatıcıların düzenli çalıştığını gözle.',
    tips: [
      'Basınç düşükse filtreyi kontrol et.',
      'Tıkalı damlatıcıları temizle veya değiştir.',
      'Sorun görürsen fotoğraf çekip sorun bildir.',
    ],
    notes: [
      {
        id: 'sn6',
        author: 'Yönetici',
        role: 'Yönetici',
        text: 'Geçen sezon hat sonlarında basınç düşüyordu, oraları özellikle kontrol edin.',
        time: 'Dün 12:00',
      },
    ],
  },
  {
    id: 's6',
    title: 'İlaçlama',
    detail: 'Zararlıya karşı koruyucu ilaçlama yapılacak.',
    state: 'gelecek',
    guide:
      'Uzman tarafından önerilen ilacı, belirtilen dozda ve koruyucu ekipmanla uygula. Uygulama zamanı yaklaşınca görev olarak düşecek.',
    tips: [
      'Mutlaka maske ve eldiven kullan.',
      'Rüzgarlı havada ilaçlama yapma.',
      'İlaçlama sonrası hasat bekleme süresine uy.',
    ],
    notes: [
      {
        id: 'sn7',
        author: 'Ziraat Müh. Ayşe Demir',
        role: 'Tarım Uzmanı',
        text: 'İlaç ve dozu yaprak biti durumuna göre bu adım açılınca netleştireceğim.',
        time: 'Planlandı',
      },
    ],
  },
  {
    id: 's7',
    title: 'Hasat',
    detail: 'Olgunlaşan biberler toplanacak.',
    state: 'gelecek',
    guide:
      'Olgunlaşan biberleri sap kısmıyla birlikte, bitkiyi yormadan topla. Toplama kaplarını temiz tut.',
    tips: [
      'Sabah serininde topla, biberler daha dayanıklı olur.',
      'Ezik ve çürükleri ayrı topla.',
    ],
    notes: [
      {
        id: 'sn8',
        author: 'Yönetici',
        role: 'Yönetici',
        text: 'Hasat miktarını her toplamada kaydedeceksiniz, detayları zamanı gelince paylaşacağız.',
        time: 'Planlandı',
      },
    ],
  },
]

export const initialMessages: ChatMessage[] = [
  {
    id: 'm1',
    from: 'uzman',
    text: 'Merhaba Mehmet Bey, budama işlemine bugün başlayabilirsiniz. Takıldığınız yerde yazın.',
    time: '09:12',
    kind: 'mesaj',
  },
  {
    id: 'm2',
    from: 'uretici',
    text: 'Tamam hocam, öğleden sonra başlıyorum.',
    time: '09:20',
    kind: 'mesaj',
  },
]

export const initialNotifications: AppNotification[] = [
  {
    id: 'n1',
    type: 'gecikme',
    title: 'Görev gecikti',
    body: 'Gübreleme (taban gübresi) görevi 2 gün gecikti.',
    time: '1 saat önce',
    taskId: 't3',
    read: false,
  },
  {
    id: 'n2',
    type: 'yeni_gorev',
    title: 'Yeni görev atandı',
    body: 'Budama yap görevi bugüne planlandı.',
    time: 'Bugün 08:00',
    taskId: 't1',
    read: false,
  },
  {
    id: 'n3',
    type: 'uzman',
    title: 'Uzman mesajı',
    body: 'Ziraat Müh. Ayşe Demir size bir mesaj yazdı.',
    time: 'Bugün 09:12',
    read: true,
  },
]
