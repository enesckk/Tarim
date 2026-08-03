#!/usr/bin/env node
/**
 * Replace AMS lands with FOTOLAR parcels, assign uzman/üretici, upload drone images.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const AMS = process.env.AMS_URL || 'http://127.0.0.1:5109'
const TAI = process.env.TARIM_AI_URL || 'http://127.0.0.1:4000'
const FOTOLAR = process.env.FOTOLAR_DIR || '/Users/enescikcik/Desktop/FOTOLAR'
const TKGM_SCRIPT =
  process.env.TKGM_SCRIPT || '/Users/enescikcik/tarim_ai/scripts/tkgm_geojson_ekle.py'
const WORK = '/tmp/fotolar-seed'
const SQL_CONTAINER = process.env.SQL_CONTAINER || 'personel-sql'

const OFFICERS = [
  'a2222222-2222-2222-2222-222222222201', // Mehmet
  'a2222222-2222-2222-2222-222222222202', // Elif
  'a2222222-2222-2222-2222-222222222203', // Can
  '22222222-2222-2222-2222-222222222222', // Ayşe
]

const PRODUCERS = [
  '33333333-3333-3333-3333-333333333333', // Mehmet Çiftçi
  'a3333333-3333-3333-3333-333333333301', // Hasan
  'a3333333-3333-3333-3333-333333333302', // Fatma
  'a3333333-3333-3333-3333-333333333303', // Ahmet
  'a3333333-3333-3333-3333-333333333304', // Zeynep
  '4d3f646b-e582-4a1c-b0cc-50101392a985', // Enes
]

const NEIGHBORHOOD_CANON = {
  gungurge: 'Güngürge',
  subogazi: 'Suboğazı',
  yalangoz: 'Yalangoz',
  isikli: 'Işıklı',
  sinan: 'Sinan',
}

function normKey(s) {
  return String(s || '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ç/g, 'c')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/\s+/g, '')
}

function titleNeighborhood(raw) {
  const key = normKey(raw)
  return NEIGHBORHOOD_CANON[key] || raw.trim()
}

function parsePhotoName(fileName) {
  const base = fileName.replace(/\.[^.]+$/i, '').replace(/\s+/g, ' ').trim()
  // SINAN 1513 - 4  → block 0
  let m = base.match(/^(.+?)\s+(\d+)\s*-\s*(\d+)\s*$/i)
  if (m && !/\d+\s+\d+\s*-/.test(base.replace(/\s*-\s*\d+\s*$/, ''))) {
    // ambiguous: "GUNGURGE 108 7 - 1" has two numbers before dash
  }
  // NAME BLOCK PARCEL - SEQ
  m = base.match(/^(.+?)\s+(\d+)\s+(\d+)\s*-\s*\d+\s*$/i)
  if (m) {
    return {
      neighborhood: titleNeighborhood(m[1]),
      block: m[2],
      parcel: m[3],
      fileName,
    }
  }
  // NAME BLOCK PARCEL SEQ
  m = base.match(/^(.+?)\s+(\d+)\s+(\d+)\s+\d+\s*$/i)
  if (m) {
    return {
      neighborhood: titleNeighborhood(m[1]),
      block: m[2],
      parcel: m[3],
      fileName,
    }
  }
  // NAME PARCEL - SEQ (Sinan)
  m = base.match(/^(.+?)\s+(\d+)\s*-\s*\d+\s*$/i)
  if (m) {
    return {
      neighborhood: titleNeighborhood(m[1]),
      block: '0',
      parcel: m[2],
      fileName,
    }
  }
  throw new Error(`Cannot parse photo name: ${fileName}`)
}

function parcelKey(p) {
  return `${normKey(p.neighborhood)}|${p.block}|${p.parcel}`
}

async function api(base, pathName, { method = 'GET', token, body, headers } = {}) {
  let res
  try {
    res = await fetch(`${base}${pathName}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch (e) {
    const cause = e && typeof e === 'object' && 'cause' in e ? e.cause : null
    throw new Error(
      `fetch ${method} ${base}${pathName} failed: ${e.message}${cause ? ` (${cause.code || cause})` : ''}`,
    )
  }
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  if (!res.ok) {
    const err = new Error(`${method} ${pathName} -> ${res.status}: ${text.slice(0, 300)}`)
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

function sqlPassword() {
  const envPath = '/Users/enescikcik/Desktop/Tarım/.env'
  const text = fs.readFileSync(envPath, 'utf8')
  for (const line of text.split('\n')) {
    if (line.startsWith('MSSQL_SA_PASSWORD=')) {
      return line.slice('MSSQL_SA_PASSWORD='.length).trim().replace(/^["']|["']$/g, '')
    }
  }
  throw new Error('MSSQL_SA_PASSWORD missing')
}

function runSql(query) {
  const pw = sqlPassword()
  const r = spawnSync(
    'docker',
    [
      'exec',
      SQL_CONTAINER,
      '/opt/mssql-tools18/bin/sqlcmd',
      '-S',
      'localhost',
      '-U',
      'sa',
      '-P',
      pw,
      '-C',
      '-d',
      'AgricultureDb',
      '-Q',
      query,
    ],
    { encoding: 'utf8' },
  )
  if (r.status !== 0) {
    throw new Error(r.stderr || r.stdout || 'sql failed')
  }
  return r.stdout
}

function fetchTkgm(parcel) {
  fs.mkdirSync(WORK, { recursive: true })
  const out = path.join(
    WORK,
    `${normKey(parcel.neighborhood)}-${parcel.block}-${parcel.parcel}.geojson`,
  )
  const r = spawnSync(
    'python3',
    [
      TKGM_SCRIPT,
      '--province',
      'Gaziantep',
      '--district',
      'Şehitkamil',
      '--neighborhood',
      parcel.neighborhood,
      '--block',
      parcel.block,
      '--parcel',
      parcel.parcel,
      '--output',
      path.join(WORK, 'archive.geojson'),
      '--single-feature-file',
      out,
      '--json',
    ],
    { encoding: 'utf8' },
  )
  if (r.status !== 0) {
    throw new Error(`TKGM ${parcel.neighborhood} ${parcel.block}/${parcel.parcel}: ${r.stderr || r.stdout}`)
  }
  const summary = JSON.parse(r.stdout)
  const feature = JSON.parse(fs.readFileSync(out, 'utf8'))
  const geom = feature.type === 'Feature' ? feature : feature.features?.[0]
  if (!geom?.geometry) throw new Error('No geometry from TKGM')
  return { summary, feature: geom, path: out }
}

function centroidOf(geometry) {
  const coords = []
  const walk = (c) => {
    if (typeof c[0] === 'number') coords.push(c)
    else c.forEach(walk)
  }
  walk(geometry.coordinates)
  if (!coords.length) return null
  const lng = coords.reduce((s, c) => s + c[0], 0) / coords.length
  const lat = coords.reduce((s, c) => s + c[1], 0) / coords.length
  return { latitude: lat, longitude: lng }
}

function parseAreaM2(areaStr) {
  if (areaStr == null) return null
  if (typeof areaStr === 'number') return areaStr
  const n = String(areaStr)
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^\d.]/g, '')
  const v = Number(n)
  return Number.isFinite(v) ? v : null
}

function compressImage(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  // Resize longest edge to 2400, then re-export as jpeg
  const r1 = spawnSync(
    'sips',
    ['-Z', '2400', src, '--out', dest],
    { encoding: 'utf8' },
  )
  if (r1.status !== 0) {
    throw new Error(`sips resize failed: ${r1.stderr || r1.stdout}`)
  }
  const r2 = spawnSync(
    'sips',
    ['-s', 'format', 'jpeg', '-s', 'formatOptions', '70', dest, '--out', dest],
    { encoding: 'utf8' },
  )
  if (r2.status !== 0) {
    throw new Error(`sips jpeg failed: ${r2.stderr || r2.stdout}`)
  }
  const size = fs.statSync(dest).size
  if (size > 9 * 1024 * 1024) {
    // second pass smaller
    spawnSync('sips', ['-Z', '1600', dest, '--out', dest], { encoding: 'utf8' })
    spawnSync(
      'sips',
      ['-s', 'format', 'jpeg', '-s', 'formatOptions', '60', dest, '--out', dest],
      { encoding: 'utf8' },
    )
  }
  return fs.statSync(dest).size
}

async function main() {
  const report = { parcels: [], lands: [], drones: [], deleted: null, errors: [] }
  fs.mkdirSync(WORK, { recursive: true })

  const files = fs
    .readdirSync(FOTOLAR)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .sort((a, b) => a.localeCompare(b, 'tr'))

  if (!files.length) throw new Error(`No photos in ${FOTOLAR}`)

  const byParcel = new Map()
  for (const fileName of files) {
    const parsed = parsePhotoName(fileName)
    const key = parcelKey(parsed)
    if (!byParcel.has(key)) {
      byParcel.set(key, {
        neighborhood: parsed.neighborhood,
        block: parsed.block,
        parcel: parsed.parcel,
        photos: [],
      })
    }
    byParcel.get(key).photos.push(path.join(FOTOLAR, fileName))
  }

  console.log(`Parcels from FOTOLAR: ${byParcel.size}`)
  for (const p of byParcel.values()) {
    console.log(` - ${p.neighborhood} ${p.block}/${p.parcel} photos=${p.photos.length}`)
  }

  // Login
  const login = await api(AMS, '/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@agriculture.local', password: 'Admin123!' },
  })
  const token = login.accessToken
  if (!token) throw new Error('Login failed')

  // Preflight
  await api(AMS, '/health')
  await api(TAI, '/health')
  console.log('Preflight OK: AMS + Tarım AI')

  // Soft-delete ALL existing lands (seed disabled in Development)
  const delOut = runSql(`
    UPDATE agriculture.Lands SET IsDeleted = 1, IsActive = 0, UpdatedAtUtc = SYSUTCDATETIME()
    WHERE IsDeleted = 0;
    SELECT @@ROWCOUNT AS DeletedCount;
  `)
  report.deleted = delOut
  console.log('Soft-deleted lands:\n', delOut)

  // Also soft-delete orphan tasks/alerts noise? optional — leave linked to deleted lands

  let i = 0
  for (const parcel of byParcel.values()) {
    const officerId = OFFICERS[i % OFFICERS.length]
    const producerId = PRODUCERS[i % PRODUCERS.length]
    i += 1

    console.log(`TKGM fetch ${parcel.neighborhood} ${parcel.block}/${parcel.parcel} ...`)
    let tkgm
    try {
      tkgm = fetchTkgm(parcel)
      console.log(`TKGM OK area=${tkgm.summary?.parcel?.area}`)
    } catch (e) {
      // Sinan fallback to point geojson if TKGM fails
      if (normKey(parcel.neighborhood) === 'sinan' && parcel.parcel === '1513') {
        const fallback = '/Users/enescikcik/Desktop/sinan-ada-0-parsel-1513-point.geojson'
        const fc = JSON.parse(fs.readFileSync(fallback, 'utf8'))
        tkgm = {
          summary: { status: 'FALLBACK', parcel: { area: null } },
          feature: fc.features[0],
          path: fallback,
        }
      } else {
        report.errors.push(String(e.message || e))
        throw e
      }
    }

    const areaM2 =
      parseAreaM2(tkgm.summary?.parcel?.area) ||
      parseAreaM2(tkgm.feature?.properties?.alan) ||
      parseAreaM2(tkgm.feature?.properties?.area) ||
      10000
    const sizeDecares = Math.max(0.1, Math.round((areaM2 / 1000) * 100) / 100)
    const center = centroidOf(tkgm.feature.geometry)
    const name = `${parcel.neighborhood} ${parcel.block}/${parcel.parcel}`

    console.log(`Creating land ${name} ...`)
    const landIdRaw = await api(AMS, '/api/lands', {
      method: 'POST',
      token,
      body: {
        name,
        parcelNumber: parcel.parcel,
        sizeInDecares: sizeDecares,
        cadastralBlock: parcel.block,
        latitude: center?.latitude ?? null,
        longitude: center?.longitude ?? null,
        soilType: 'Tarla',
        soilNotes: `TKGM drone seti — ${parcel.neighborhood} ada ${parcel.block} parsel ${parcel.parcel}`,
        city: 'Gaziantep',
        district: 'Şehitkamil',
        neighborhood: parcel.neighborhood,
        producerId,
      },
    })
    const landId = typeof landIdRaw === 'string' ? landIdRaw.replaceAll('"', '') : String(landIdRaw)
    console.log(`Created landId=${landId}`)

    console.log(`Assigning producer/officer ...`)
    await api(AMS, `/api/lands/${landId}/assignments`, {
      method: 'PUT',
      token,
      body: { producerId, officerUserId: officerId },
    })

    const landEntry = {
      landId,
      name,
      neighborhood: parcel.neighborhood,
      block: parcel.block,
      parcel: parcel.parcel,
      producerId,
      officerId,
      sizeDecares,
      centroid: center,
      tkgmStatus: tkgm.summary?.status || 'OK',
      photos: [],
    }

    for (const photoPath of parcel.photos) {
      const base = path.basename(photoPath)
      const compressed = path.join(WORK, 'compressed', base.replace(/\s+/g, '_').replace(/\.JPG$/i, '.jpg'))
      const byteSize = compressImage(photoPath, compressed)
      const buf = fs.readFileSync(compressed)
      const dataBase64 = buf.toString('base64')
      const uploaded = await api(TAI, '/api/drone-images', {
        method: 'POST',
        body: {
          capturedAt: '2026-07-30',
          fileName: base,
          contentType: 'image/jpeg',
          dataBase64,
          landId,
          landName: name,
          note: `FOTOLAR — ${base}`,
          parcelQuery: {
            province: 'Gaziantep',
            district: 'Şehitkamil',
            neighborhood: parcel.neighborhood,
            block: parcel.block,
            parcel: parcel.parcel,
          },
        },
      })
      landEntry.photos.push({
        id: uploaded.id,
        fileName: base,
        compressedBytes: byteSize,
        imageUrl: uploaded.imageUrl,
      })
      console.log(`  drone OK ${base} -> ${uploaded.id} (${Math.round(byteSize / 1024)} KB)`)
    }

    report.lands.push(landEntry)
    report.parcels.push({
      neighborhood: parcel.neighborhood,
      block: parcel.block,
      parcel: parcel.parcel,
      photoCount: parcel.photos.length,
    })
    console.log(`LAND OK ${name} id=${landId}`)
  }

  // Verify
  const lands = await api(AMS, '/api/lands', { token })
  const drones = await api(TAI, '/api/drone-images')
  report.verify = {
    landCount: Array.isArray(lands) ? lands.length : null,
    landNames: Array.isArray(lands) ? lands.map((l) => l.name) : null,
    droneCount: drones?.count ?? drones?.items?.length,
    landsMissingOfficer: Array.isArray(lands)
      ? lands.filter((l) => !l.assignedOfficerUserId).map((l) => l.name)
      : [],
    landsMissingProducer: Array.isArray(lands)
      ? lands.filter((l) => !l.producerId).map((l) => l.name)
      : [],
  }

  const outPath = '/Users/enescikcik/Desktop/Tarım/.cursor/fotolar-seed-report.json'
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ status: 'OK', reportPath: outPath, verify: report.verify }, null, 2))

  if (report.verify.landCount !== byParcel.size) {
    process.exitCode = 1
    console.error(`Expected ${byParcel.size} lands, got ${report.verify.landCount}`)
  }
  if (report.verify.landsMissingOfficer?.length || report.verify.landsMissingProducer?.length) {
    process.exitCode = 1
  }
  if ((report.verify.droneCount ?? 0) < files.length) {
    process.exitCode = 1
    console.error(`Expected >= ${files.length} drones, got ${report.verify.droneCount}`)
  }
}

main().catch((e) => {
  console.error(JSON.stringify({ status: 'FAILED', message: String(e.message || e) }, null, 2))
  process.exit(1)
})
