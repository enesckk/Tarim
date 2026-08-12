export interface DronePhotoInfo {
  url: string
  title: string
  date: string
  resolution: string
}

const photo = (url: string, title: string, date: string): DronePhotoInfo => ({
  url,
  title,
  date,
  resolution: '4K Ultra HD',
})

const PARCEL_PHOTOS: Record<string, readonly DronePhotoInfo[]> = {
  'sinan|0|1513': [
    photo('/drone_photos/SINAN_1513_-_1.JPG', 'Sinan 0/1513 - Yüksek Çözünürlüklü Hava Çekimi (Kuzey)', '04.08.2026'),
    photo('/drone_photos/SINAN_1513_-_2.JPG', 'Sinan 0/1513 - Parsel Alanı Vejetasyon Çekimi (Batı)', '04.08.2026'),
    photo('/drone_photos/SINAN_1513_-_3.JPG', 'Sinan 0/1513 - Sınır Haritalama ve Arazi Çekimi (Güney)', '04.08.2026'),
    photo('/drone_photos/SINAN_1513_-_4.JPG', 'Sinan 0/1513 - Ortofoto Yüzey Çekimi (Doğu)', '04.08.2026'),
  ],
  'gungurge|108|7': [
    photo('/drone_photos/GUNGURGE_108_7_-_1.JPG', 'Güngürge 108/7 - Drone Genel Hava Çekimi', '02.08.2026'),
    photo('/drone_photos/GUNGURGE_108_7_-_2.JPG', 'Güngürge 108/7 - Parsel Sınır ve Toprak Detayı', '02.08.2026'),
    photo('/drone_photos/GUNGURGE_108_7_-_3.JPG', 'Güngürge 108/7 - Yüksek İrtifa Ortofoto', '02.08.2026'),
  ],
  'gungurge|131|80': [
    photo('/drone_photos/GUNGURGE_131_80_1.JPG', 'Güngürge 131/80 - Drone Hava Çekimi #1', '02.08.2026'),
    photo('/drone_photos/GUNGURGE_131_80_2.JPG', 'Güngürge 131/80 - Drone Hava Çekimi #2', '02.08.2026'),
  ],
  'subogazi|106|31': [
    photo('/drone_photos/SUBOGAZI_106_31_1.JPG', 'Suboğazı 106/31 - Drone Genel Hava Çekimi', '03.08.2026'),
    photo('/drone_photos/SUBOGAZI_106_31_2.JPG', 'Suboğazı 106/31 - Parsel Vejetasyon Çekimi', '03.08.2026'),
    photo('/drone_photos/SUBOGAZI_106_31_3.JPG', 'Suboğazı 106/31 - Yüksek İrtifa Ortofoto', '03.08.2026'),
  ],
  'subogazi|106|51': [
    photo('/drone_photos/SUBOGAZI_106_51_1.JPG', 'Suboğazı 106/51 - Drone Hava Çekimi #1', '03.08.2026'),
    photo('/drone_photos/SUBOGAZI_106_51_2.JPG', 'Suboğazı 106/51 - Drone Hava Çekimi #2', '03.08.2026'),
  ],
  'subogazi|142|40': [
    photo('/drone_photos/SUBOGAZI_142_40_1_.JPG', 'Suboğazı 142/40 - Drone Hava Çekimi', '03.08.2026'),
  ],
  'yalangoz|103|85': [
    photo('/drone_photos/YALANGOZ_103_85_1.JPG', 'Yalangoz 103/85 - Drone Hava Çekimi #1', '01.08.2026'),
    photo('/drone_photos/YALANGOZ_103_85_2.JPG', 'Yalangoz 103/85 - Drone Hava Çekimi #2', '01.08.2026'),
    photo('/drone_photos/YALANGOZ_103_85_3.JPG', 'Yalangoz 103/85 - Drone Hava Çekimi #3', '01.08.2026'),
  ],
  'isikli|151|1': [
    photo('/drone_photos/ISIKLI_151_1_1.JPG', 'Işıklı 151/1 - Drone Hava Çekimi', '05.08.2026'),
  ],
  'isikli|216|1': [
    photo('/drone_photos/ISIKLI_216_1_1.JPG', 'Işıklı 216/1 - Drone Hava Çekimi', '05.08.2026'),
  ],
}

function normalize(value?: string): string {
  return (value ?? '')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replaceAll('ı', 'i')
}

export function getDronePhotosForParcel(
  neighborhood?: string,
  block?: string,
  parcel?: string,
): DronePhotoInfo[] {
  const normalizedNeighborhood = normalize(neighborhood)
  const normalizedBlock = normalize(block)
  const normalizedParcel = normalize(parcel)

  // Sinan's verified cadastral block is 0. Older records sometimes left it blank.
  const blockKey =
    normalizedNeighborhood === 'sinan' && normalizedParcel === '1513' && !normalizedBlock
      ? '0'
      : normalizedBlock
  const key = `${normalizedNeighborhood}|${blockKey}|${normalizedParcel}`

  // Return a copy so callers cannot mutate the catalog shared by other lands.
  return [...(PARCEL_PHOTOS[key] ?? [])]
}
