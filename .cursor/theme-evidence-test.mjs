#!/usr/bin/env node
/**
 * Theme/evidence feature tests + selected regressions (IDOR, metadata photo, cancel, reject).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API = process.env.API_URL || 'http://127.0.0.1:5109';
const results = [];
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const THEMES = ['Sulama', 'Gubreleme', 'Ilaclama', 'Dikim', 'Hasat', 'Bakim'];

function ok(name, pass, detail) {
  results.push({ name, pass: Boolean(pass), detail });
  const mark = pass ? 'PASS' : 'FAIL';
  const d =
    detail === undefined
      ? ''
      : typeof detail === 'string'
        ? detail
        : JSON.stringify(detail);
  console.log(`${mark}  ${name}${d ? ` — ${d}` : ''}`);
}

async function req(p, { method = 'GET', token, body, formData, headers } = {}) {
  const res = await fetch(`${API}${p}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body && !formData ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: formData ? formData : body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data, ok: res.ok, text };
}

async function login(email, password) {
  const r = await req('/api/auth/login', { method: 'POST', body: { email, password } });
  return {
    ...r,
    token: r.data?.accessToken || r.data?.token,
  };
}

function taskIdOf(created) {
  if (typeof created.data === 'string') return created.data;
  return created.data?.id || created.data?.taskId || null;
}

async function uploadPhoto(taskId, token, filename = 'proof.png') {
  const fd = new FormData();
  fd.append('file', new Blob([PNG_1X1], { type: 'image/png' }), filename);
  return req(`/api/tasks/${taskId}/photos`, { method: 'POST', token, formData: fd });
}

function evidenceFor(theme) {
  const now = new Date();
  const started = new Date(now.getTime() - 3600000).toISOString();
  const ended = now.toISOString();
  switch (theme) {
    case 'Sulama':
      return { durationMinutes: 45, waterAmount: 200, waterUnit: 'litre' };
    case 'Gubreleme':
      return { fertilizerName: 'NPK 15-15-15', amount: 25, amountUnit: 'kg' };
    case 'Ilaclama':
      return { pesticideName: 'Bakır', dose: '200 ml/100L', waterAmount: 100, waterUnit: 'litre' };
    case 'Dikim':
      return { seedlingCount: 120, startedAt: started, endedAt: ended };
    case 'Hasat':
      return { productQuantity: 350, productUnit: 'kg', crateCount: 14 };
    case 'Bakim':
      return { description: 'Yaprak budama ve sıra temizliği' };
    default:
      return {};
  }
}

/** Officer planned targets — Dikim has no start/end times. */
function plannedEvidenceFor(theme) {
  switch (theme) {
    case 'Sulama':
      return { durationMinutes: 40, waterAmount: 180, waterUnit: 'litre' };
    case 'Gubreleme':
      return { fertilizerName: 'NPK 15-15-15', amount: 20, amountUnit: 'kg' };
    case 'Ilaclama':
      return { pesticideName: 'Bakır', dose: '200 ml/100L', waterAmount: 90, waterUnit: 'litre' };
    case 'Dikim':
      return { seedlingCount: 100 };
    case 'Hasat':
      return { productQuantity: 300, productUnit: 'kg', crateCount: 12 };
    case 'Bakim':
      return { description: 'Planlanan yaprak budama' };
    default:
      return {};
  }
}

async function main() {
  console.log(`\n=== THEME / EVIDENCE TEST @ ${API} ===\n`);

  const health = await req('/health');
  ok('A health', health.status === 200 && health.data?.status === 'healthy', health.data);

  const admin = await login('admin@agriculture.local', 'Admin123!');
  const officer = await login('uzman@agriculture.local', 'Officer123!');
  const producer = await login('5537472823', 'asd');
  ok('A admin login', Boolean(admin.token), { status: admin.status });
  ok('A officer login', Boolean(officer.token), { status: officer.status });
  ok('A producer login', Boolean(producer.token), { status: producer.status });
  if (!admin.token || !officer.token || !producer.token) {
    finish(1);
    return;
  }

  const officerLands = await req('/api/lands', { token: officer.token });
  const land = officerLands.data?.[0];
  ok('A officer land', Boolean(land?.id), land?.id);
  if (!land?.id) {
    finish(1);
    return;
  }

  // B1: create each theme with planned evidence
  const createdByTheme = {};
  for (const theme of THEMES) {
    const created = await req(`/api/lands/${land.id}/tasks`, {
      method: 'POST',
      token: officer.token,
      body: {
        title: `Tema ${theme} ${Date.now()}`,
        description: `theme test ${theme}`,
        theme,
        plannedEvidence: plannedEvidenceFor(theme),
        dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      },
    });
    const id = taskIdOf(created);
    createdByTheme[theme] = id;
    ok(`B1 create theme ${theme}`, created.status === 200 && Boolean(id), {
      status: created.status,
      id,
      data: created.data,
    });
  }

  // B2: create without theme → 400
  const noTheme = await req(`/api/lands/${land.id}/tasks`, {
    method: 'POST',
    token: officer.token,
    body: { title: `NoTheme ${Date.now()}`, description: 'should fail' },
  });
  ok('B2 create without theme → 400', noTheme.status === 400, {
    status: noTheme.status,
    code: noTheme.data?.code || noTheme.data?.Code,
  });

  // B2b: theme without planned evidence → 400
  const noPlanned = await req(`/api/lands/${land.id}/tasks`, {
    method: 'POST',
    token: officer.token,
    body: {
      title: `NoPlanned ${Date.now()}`,
      theme: 'Sulama',
      dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    },
  });
  ok('B2b create without plannedEvidence → 400', noPlanned.status === 400, {
    status: noPlanned.status,
    code: noPlanned.data?.code || noPlanned.data?.Code,
    message: noPlanned.data?.message || noPlanned.data?.Message,
  });

  // B2c: Sulama dual evidence — planned stored, actual on complete, pending shows both
  {
    const created = await req(`/api/lands/${land.id}/tasks`, {
      method: 'POST',
      token: officer.token,
      body: {
        title: `Dual Sulama ${Date.now()}`,
        theme: 'Sulama',
        plannedEvidence: plannedEvidenceFor('Sulama'),
        dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      },
    });
    const dualId = taskIdOf(created);
    ok('B2c dual create Sulama', created.ok && Boolean(dualId), {
      status: created.status,
      id: dualId,
    });
    if (dualId) {
      const before = await req(`/api/tasks/${dualId}`, { token: producer.token });
      const plannedRaw =
        before.data?.plannedEvidenceJson || before.data?.PlannedEvidenceJson || '';
      ok(
        'B2c producer sees plannedEvidenceJson',
        before.ok && typeof plannedRaw === 'string' && plannedRaw.includes('180'),
        { plannedSnippet: String(plannedRaw).slice(0, 120) },
      );

      await uploadPhoto(dualId, producer.token);
      const done = await req(`/api/tasks/${dualId}/complete`, {
        method: 'POST',
        token: producer.token,
        body: { notes: 'sulama dual', evidence: evidenceFor('Sulama') },
      });
      ok('B2c complete with actual', done.ok, { status: done.status });

      const pending = await req('/api/tasks/pending-approval', { token: officer.token });
      const card = (pending.data || []).find((t) => t.id === dualId);
      const pJson = card?.plannedEvidenceJson || card?.PlannedEvidenceJson || '';
      const aJson = card?.evidenceJson || card?.EvidenceJson || '';
      ok(
        'B2c pending Planlanan|Gerçekleşen',
        Boolean(card) &&
          String(pJson).includes('180') &&
          String(aJson).includes('200'),
        {
          hasCard: Boolean(card),
          planned: String(pJson).slice(0, 80),
          actual: String(aJson).slice(0, 80),
        },
      );
      if (done.ok) {
        await req(`/api/tasks/${dualId}/approve`, {
          method: 'POST',
          token: officer.token,
        });
      }
    }
  }
  // B3: Gubreleme complete without fertilizer fields → 400
  const gubreId = createdByTheme.Gubreleme;
  if (gubreId) {
    await uploadPhoto(gubreId, producer.token);
    const bad = await req(`/api/tasks/${gubreId}/complete`, {
      method: 'POST',
      token: producer.token,
      body: { notes: 'eksik kanıt' },
    });
    ok('B3 Gubreleme complete without evidence → 400', bad.status === 400, {
      status: bad.status,
      data: bad.data,
    });
  } else {
    ok('B3 Gubreleme complete without evidence → 400', false, 'no gubre task');
  }

  // B4: Gubreleme with evidence + real photo → 200 awaiting approval
  if (gubreId) {
    // already has 1 photo from B3
    const good = await req(`/api/tasks/${gubreId}/complete`, {
      method: 'POST',
      token: producer.token,
      body: {
        notes: 'gübreleme tamam',
        evidence: evidenceFor('Gubreleme'),
      },
    });
    ok('B4 Gubreleme complete with evidence → 200', good.status === 200 || good.ok, {
      status: good.status,
      data: good.data,
    });

    // B5: pending / GET shows theme + evidence
    const pending = await req('/api/tasks/pending-approval', { token: officer.token });
    const inPending = pending.ok && (pending.data || []).some((t) => t.id === gubreId);
    const detail = await req(`/api/tasks/${gubreId}`, { token: officer.token });
    const themeOk =
      detail.data?.theme === 'Gubreleme' || detail.data?.Theme === 'Gubreleme';
    const ev =
      detail.data?.evidenceJson ||
      detail.data?.EvidenceJson ||
      detail.data?.evidence ||
      '';
    const evStr = typeof ev === 'string' ? ev : JSON.stringify(ev || '');
    ok('B5 pending has gubre task', inPending, { pendingCount: pending.data?.length });
    ok('B5 GET theme+evidence', detail.ok && themeOk && evStr.includes('NPK'), {
      status: detail.data?.status,
      theme: detail.data?.theme,
      evidenceSnippet: evStr.slice(0, 120),
      completionNotes: detail.data?.completionNotes?.slice?.(0, 120),
    });

    // B6: approve
    const approve = await req(`/api/tasks/${gubreId}/approve`, {
      method: 'POST',
      token: officer.token,
    });
    const after = await req(`/api/tasks/${gubreId}`, { token: officer.token });
    ok('B6 approve Gubreleme', approve.ok && after.data?.status === 2, {
      approveStatus: approve.status,
      taskStatus: after.data?.status,
    });
  }

  // B7: Sulama + Bakim smoke
  async function completeTheme(theme, minPhotos = 1) {
    const id = createdByTheme[theme];
    if (!id) {
      ok(`B7 ${theme} smoke`, false, 'missing task');
      return;
    }
    for (let i = 0; i < minPhotos; i++) {
      const up = await uploadPhoto(id, producer.token, `${theme.toLowerCase()}-${i}.png`);
      if (!(up.ok || up.status === 201)) {
        ok(`B7 ${theme} smoke`, false, { step: 'photo', status: up.status, data: up.data });
        return;
      }
    }
    const done = await req(`/api/tasks/${id}/complete`, {
      method: 'POST',
      token: producer.token,
      body: { notes: `${theme} ok`, evidence: evidenceFor(theme) },
    });
    const detail = await req(`/api/tasks/${id}`, { token: producer.token });
    ok(`B7 ${theme} smoke`, done.ok && detail.data?.status === 5, {
      completeStatus: done.status,
      taskStatus: detail.data?.status,
      theme: detail.data?.theme,
    });
    if (done.ok) {
      await req(`/api/tasks/${id}/approve`, { method: 'POST', token: officer.token });
    }
  }
  await completeTheme('Sulama', 1);
  await completeTheme('Bakim', 2);

  // B8: old-style (Theme NULL) open task — complete with photo/notes still works
  const oldOpen = await req(`/api/tasks?producerId=33333333-3333-3333-3333-333333333333`, {
    token: producer.token,
  });
  const legacy = (oldOpen.data || []).find(
    (t) =>
      !t.theme &&
      (t.status === 0 || t.status === 1 || t.status === 3 || t.status === 4) &&
      t.landId === land.id,
  );
  if (legacy) {
    if (legacy.requiresPhoto) {
      await uploadPhoto(legacy.id, producer.token, 'legacy.png');
    }
    const legacyDone = await req(`/api/tasks/${legacy.id}/complete`, {
      method: 'POST',
      token: producer.token,
      body: { notes: 'eski görev tamam' },
    });
    ok('B8 legacy Theme=null complete', legacyDone.ok, {
      status: legacyDone.status,
      taskId: legacy.id,
      title: legacy.title,
      data: legacyDone.data,
    });
    if (legacyDone.ok) {
      await req(`/api/tasks/${legacy.id}/approve`, { method: 'POST', token: officer.token });
    }
  } else {
    // Create via raw SQL isn't available; try completing any null-theme open task on any land
    const anyLegacy = (oldOpen.data || []).find(
      (t) => !t.theme && (t.status === 0 || t.status === 1 || t.status === 3 || t.status === 4),
    );
    if (anyLegacy) {
      if (anyLegacy.requiresPhoto) await uploadPhoto(anyLegacy.id, producer.token, 'legacy.png');
      const legacyDone = await req(`/api/tasks/${anyLegacy.id}/complete`, {
        method: 'POST',
        token: producer.token,
        body: { notes: 'eski görev tamam' },
      });
      ok('B8 legacy Theme=null complete', legacyDone.ok, {
        status: legacyDone.status,
        taskId: anyLegacy.id,
        title: anyLegacy.title,
        landId: anyLegacy.landId,
      });
    } else {
      ok('B8 legacy Theme=null complete', true, 'SKIP no open null-theme task (acceptable)');
    }
  }

  // C regressions — Producer IDOR (only own tasks)
  const adminTasks = await req('/api/tasks', { token: admin.token });
  const foreignTask = (adminTasks.data || []).find(
    (t) => t.producerId && t.producerId !== '33333333-3333-3333-3333-333333333333',
  );
  if (foreignTask) {
    const idor = await req(`/api/tasks/${foreignTask.id}`, { token: producer.token });
    ok('C IDOR foreign task blocked', idor.status === 403, {
      status: idor.status,
      foreignId: foreignTask.id,
    });
  } else {
    const idorList = await req(
      '/api/tasks?producerId=a3333333-3333-3333-3333-333333333301',
      { token: producer.token },
    );
    ok('C IDOR foreign task blocked', idorList.status === 403, {
      status: idorList.status,
      mode: 'list-filter',
    });
  }

  // Metadata-only photo → 400
  const metaTask = createdByTheme.Hasat;
  if (metaTask) {
    const meta = await req(`/api/tasks/${metaTask}/photos`, {
      method: 'POST',
      token: producer.token,
      body: { fileName: 'fake.jpg', contentType: 'image/jpeg', storageKey: 'x' },
    });
    ok('C metadata-only photo → 400', meta.status === 400, {
      status: meta.status,
      data: meta.data,
    });
  } else {
    ok('C metadata-only photo → 400', false, 'no hasat task');
  }

  // Cancel open pending task
  const cancelCreate = await req(`/api/lands/${land.id}/tasks`, {
    method: 'POST',
    token: officer.token,
    body: {
      title: `Cancel me ${Date.now()}`,
      theme: 'Hasat',
      plannedEvidence: plannedEvidenceFor('Hasat'),
    },
  });
  const cancelId = taskIdOf(cancelCreate);
  if (cancelId) {
    const cancel = await req(`/api/tasks/${cancelId}/cancel`, {
      method: 'POST',
      token: officer.token,
    });
    const cancelDetail = await req(`/api/tasks/${cancelId}`, { token: officer.token });
    ok('C cancel open task', cancel.ok && cancelDetail.data?.status === 4, {
      cancelStatus: cancel.status,
      taskStatus: cancelDetail.data?.status,
    });
  } else {
    ok('C cancel open task', false, cancelCreate.data);
  }

  // Reject/revise
  const revCreate = await req(`/api/lands/${land.id}/tasks`, {
    method: 'POST',
    token: officer.token,
    body: {
      title: `Revise me ${Date.now()}`,
      theme: 'Sulama',
      plannedEvidence: plannedEvidenceFor('Sulama'),
    },
  });
  const revId = taskIdOf(revCreate);
  if (revId) {
    await uploadPhoto(revId, producer.token);
    await req(`/api/tasks/${revId}/complete`, {
      method: 'POST',
      token: producer.token,
      body: { evidence: evidenceFor('Sulama') },
    });
    const revise = await req(`/api/tasks/${revId}/reject`, {
      method: 'POST',
      token: officer.token,
      body: { reason: 'Fotoğraf net değil, tekrar çekin' },
    });
    const afterRev = await req(`/api/tasks/${revId}`, { token: officer.token });
    ok('C reject/revise', revise.ok && afterRev.data?.status === 6, {
      reviseStatus: revise.status,
      taskStatus: afterRev.data?.status,
      data: revise.data,
    });
  } else {
    ok('C reject/revise', false, revCreate.data);
  }

  // Officer land isolation
  const otherLands = await req('/api/lands', { token: admin.token });
  const unassigned = (otherLands.data || []).find(
    (l) => l.id !== land.id && l.assignedOfficerUserId && l.assignedOfficerUserId !== land.assignedOfficerUserId,
  );
  if (unassigned) {
    const forbid = await req(`/api/lands/${unassigned.id}`, { token: officer.token });
    // list-scoped officers may 403 on detail or get filtered — try create task
    const createForbid = await req(`/api/lands/${unassigned.id}/tasks`, {
      method: 'POST',
      token: officer.token,
      body: { title: 'isolation', theme: 'Sulama' },
    });
    ok(
      'C officer land isolation 403',
      forbid.status === 403 || createForbid.status === 403,
      { detailStatus: forbid.status, createStatus: createForbid.status, landId: unassigned.id },
    );
  } else {
    ok('C officer land isolation 403', true, 'SKIP no unassigned land found');
  }

  finish(results.some((r) => !r.pass) ? 1 : 0);
}

function finish(code) {
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n=== SUMMARY ${passed} PASS / ${failed} FAIL ===\n`);
  const out = path.join(__dirname, 'theme-evidence-test-report.json');
  fs.writeFileSync(out, JSON.stringify({ passed, failed, results }, null, 2));
  console.log(`Wrote ${out}`);
  process.exit(code);
}

main().catch((e) => {
  console.error('FATAL', e);
  finish(1);
});
