export interface DronePhotoInfo {
  url: string
  title: string
  date: string
  resolution: string
}

export function getDronePhotosForParcel(neighborhood?: string, block?: string, parcel?: string): DronePhotoInfo[] {
  const nh = (neighborhood || '').trim().toLowerCase()
  const b = (block || '').trim()
  const p = (parcel || '').trim()

  if (nh.includes('sinan') || p === '1513') {
    return [
      { url: '/drone_photos/SINAN_1513_-_1.JPG', title: 'Sinan 1513 - Yüksek Çözünürlüklü Hava Çekimi (Kuzey)', date: '04.08.2026', resolution: '4K Ultra HD' },
      { url: '/drone_photos/SINAN_1513_-_2.JPG', title: 'Sinan 1513 - Parse Alanı Vejetasyon Çekimi (Batı)', date: '04.08.2026', resolution: '4K Ultra HD' },
      { url: '/drone_photos/SINAN_1513_-_3.JPG', title: 'Sinan 1513 - Sınır Haritalama ve Arazi Çekimi (Güney)', date: '04.08.2026', resolution: '4K Ultra HD' },
      { url: '/drone_photos/SINAN_1513_-_4.JPG', title: 'Sinan 1513 - Ortofoto Yüzey Çekimi (Doğu)', date: '04.08.2026', resolution: '4K Ultra HD' },
    ]
  }

  if (nh.includes('güngürge') || nh.includes('gungurge')) {
    if (p === '80' || b === '131') {
      return [
        { url: '/drone_photos/GUNGURGE_131_80_1.JPG', title: 'Güngürge 131/80 - Drone Hava Çekimi #1', date: '02.08.2026', resolution: '4K Ultra HD' },
        { url: '/drone_photos/GUNGURGE_131_80_2.JPG', title: 'Güngürge 131/80 - Drone Hava Çekimi #2', date: '02.08.2026', resolution: '4K Ultra HD' },
      ]
    }
    return [
      { url: '/drone_photos/GUNGURGE_108_7_-_1.JPG', title: 'Güngürge 108/7 - Drone Genel Hava Çekimi', date: '02.08.2026', resolution: '4K Ultra HD' },
      { url: '/drone_photos/GUNGURGE_108_7_-_2.JPG', title: 'Güngürge 108/7 - Parsel Sınır ve Toprak Detayı', date: '02.08.2026', resolution: '4K Ultra HD' },
      { url: '/drone_photos/GUNGURGE_108_7_-_3.JPG', title: 'Güngürge 108/7 - Yüksek İrtifa Ortofoto', date: '02.08.2026', resolution: '4K Ultra HD' },
    ]
  }

  if (nh.includes('suboğazı') || nh.includes('subogazi')) {
    if (p === '51') {
      return [
        { url: '/drone_photos/SUBOGAZI_106_51_1.JPG', title: 'Suboğazı 106/51 - Drone Hava Çekimi #1', date: '03.08.2026', resolution: '4K Ultra HD' },
        { url: '/drone_photos/SUBOGAZI_106_51_2.JPG', title: 'Suboğazı 106/51 - Drone Hava Çekimi #2', date: '03.08.2026', resolution: '4K Ultra HD' },
      ]
    }
    if (p === '40') {
      return [
        { url: '/drone_photos/SUBOGAZI_142_40_1_.JPG', title: 'Suboğazı 142/40 - Drone Hava Çekimi', date: '03.08.2026', resolution: '4K Ultra HD' },
      ]
    }
    return [
      { url: '/drone_photos/SUBOGAZI_106_31_1.JPG', title: 'Suboğazı 106/31 - Drone Genel Hava Çekimi', date: '03.08.2026', resolution: '4K Ultra HD' },
      { url: '/drone_photos/SUBOGAZI_106_31_2.JPG', title: 'Suboğazı 106/31 - Parsel Vejetasyon Çekimi', date: '03.08.2026', resolution: '4K Ultra HD' },
      { url: '/drone_photos/SUBOGAZI_106_31_3.JPG', title: 'Suboğazı 106/31 - Yüksek İrtifa Ortofoto', date: '03.08.2026', resolution: '4K Ultra HD' },
    ]
  }

  if (nh.includes('yalangoz')) {
    return [
      { url: '/drone_photos/YALANGOZ_103_85_1.JPG', title: 'Yalangoz 103/85 - Drone Hava Çekimi #1', date: '01.08.2026', resolution: '4K Ultra HD' },
      { url: '/drone_photos/YALANGOZ_103_85_2.JPG', title: 'Yalangoz 103/85 - Drone Hava Çekimi #2', date: '01.08.2026', resolution: '4K Ultra HD' },
      { url: '/drone_photos/YALANGOZ_103_85_3.JPG', title: 'Yalangoz 103/85 - Drone Hava Çekimi #3', date: '01.08.2026', resolution: '4K Ultra HD' },
    ]
  }

  if (nh.includes('ışıklı') || nh.includes('isikli')) {
    if (b === '216') {
      return [
        { url: '/drone_photos/ISIKLI_216_1_1.JPG', title: 'Işıklı 216/1 - Drone Hava Çekimi', date: '05.08.2026', resolution: '4K Ultra HD' },
      ]
    }
    return [
      { url: '/drone_photos/ISIKLI_151_1_1.JPG', title: 'Işıklı 151/1 - Drone Hava Çekimi', date: '05.08.2026', resolution: '4K Ultra HD' },
    ]
  }

  // Fallback default photos
  return [
    { url: '/drone_photos/SINAN_1513_-_1.JPG', title: 'Parsel Drone Yüksek Çözünürlük Çekimi', date: '04.08.2026', resolution: '4K Ultra HD' },
    { url: '/drone_photos/GUNGURGE_108_7_-_1.JPG', title: 'Parsel Ortofoto Vejetasyon Analiz Görseli', date: '02.08.2026', resolution: '4K Ultra HD' },
  ]
}
