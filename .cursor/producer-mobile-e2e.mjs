#!/usr/bin/env node
/**
 * Producer mobile E2E — every API the Expo app hits, plus LAN connectivity.
 */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const API = process.env.API_URL || 'http://127.0.0.1:5109';
const results = [];
const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

async function req(path, { method = 'GET', token, body, headers, formData } = {}) {
  const res = await fetch(`${API}${path}`, {
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
  return req('/api/auth/login', { method: 'POST', body: { email, password } });
}

async function main() {
  console.log(`\n=== PRODUCER MOBILE E2E @ ${API} ===\n`);

  // Health
  {
    const h = await req('/health');
    ok('health', h.status === 200 && h.data?.status === 'healthy', h.data);
  }

  // Login
  const loginRes = await login('5537472823', 'asd');
  const token = loginRes.data?.accessToken || loginRes.data?.token;
  ok('producer login', loginRes.status === 200 && Boolean(token), {
    status: loginRes.status,
    roles: loginRes.data?.roles,
  });
  if (!token) {
    finish(1);
    return;
  }

  // Tabs: /me, tasks/today, lands, notifications, conversations
  const me = await req('/api/me', { token });
  ok('GET /api/me', me.ok && me.data?.roles?.includes('Producer'), {
    producerId: me.data?.producerId,
    fullName: me.data?.fullName,
  });
  const producerId = me.data?.producerId;

  const today = await req('/api/tasks/today', { token });
  ok('GET /api/tasks/today', today.ok && Array.isArray(today.data), {
    count: today.data?.length,
  });

  const lands = await req('/api/lands', { token });
  ok('GET /api/lands', lands.ok && Array.isArray(lands.data), {
    count: lands.data?.length,
  });
  const land = lands.data?.[0];

  const notifs = await req('/api/notifications', { token });
  ok('GET /api/notifications', notifs.ok && Array.isArray(notifs.data), {
    count: notifs.data?.length,
  });

  const convos = await req('/api/conversations/expert', { token });
  ok('GET /api/conversations/expert', convos.ok && Array.isArray(convos.data), {
    count: convos.data?.length,
  });

  if (producerId) {
    const allTasks = await req(`/api/tasks?producerId=${producerId}`, { token });
    ok('GET /api/tasks?producerId', allTasks.ok && Array.isArray(allTasks.data), {
      count: allTasks.data?.length,
    });
  } else {
    ok('GET /api/tasks?producerId', false, 'no producerId');
  }

  // Officer creates task for full flow
  const officerLogin = await login('uzman@agriculture.local', 'Officer123!');
  const officerTok =
    officerLogin.data?.accessToken || officerLogin.data?.token;
  ok('officer login (for task create)', Boolean(officerTok), {
    status: officerLogin.status,
  });

  let taskId = null;
  // Prefer a land both officer and producer can use (officer list ∩ producer lands)
  const officerLands = await req('/api/lands', { token: officerTok });
  const sharedLand =
    (officerLands.data || []).find((ol) =>
      (lands.data || []).some((pl) => pl.id === ol.id),
    ) || land;

  if (officerTok && sharedLand?.id) {
    const created = await req(`/api/lands/${sharedLand.id}/tasks`, {
      method: 'POST',
      token: officerTok,
      body: {
        title: `Mobil E2E ${Date.now()}`,
        description: 'Foto + tamamla + onay',
        theme: 'Sulama',
        plannedEvidence: { durationMinutes: 25, waterAmount: 80, waterUnit: 'litre' },
        dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        requiresPhoto: true,
        requiresQuantity: false,
      },
    });
    taskId =
      typeof created.data === 'string'
        ? created.data
        : created.data?.id || created.data?.taskId;
    ok('officer create task', created.ok && Boolean(taskId), {
      status: created.status,
      taskId,
      landId: sharedLand.id,
    });
  } else {
    ok('officer create task', false, {
      hasOfficer: Boolean(officerTok),
      landId: sharedLand?.id,
    });
  }

  // Task detail
  if (taskId) {
    const detail = await req(`/api/tasks/${taskId}`, { token });
    ok('GET /api/tasks/:id', detail.ok && detail.data?.id === taskId, {
      title: detail.data?.title,
      status: detail.data?.status,
      requiresPhoto: detail.data?.requiresPhoto,
    });

    // Photo upload (1x1 PNG)
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );
    const fd = new FormData();
    fd.append(
      'file',
      new Blob([png], { type: 'image/png' }),
      'e2e-proof.png',
    );
    const up = await req(`/api/tasks/${taskId}/photos`, {
      method: 'POST',
      token,
      formData: fd,
    });
    ok('POST /api/tasks/:id/photos', up.ok || up.status === 201, {
      status: up.status,
      data: typeof up.data === 'object' ? up.data : String(up.data).slice(0, 120),
    });

    // Complete → awaiting approval (theme evidence required)
    const complete = await req(`/api/tasks/${taskId}/complete`, {
      method: 'POST',
      token,
      body: {
        notes: 'Mobil E2E tamamlandı',
        evidence: { durationMinutes: 25, waterAmount: 80, waterUnit: 'litre' },
      },
    });
    ok('POST /api/tasks/:id/complete', complete.ok, {
      status: complete.status,
      data: complete.data,
    });

    const after = await req(`/api/tasks/${taskId}`, { token });
    ok(
      'task status AwaitingApproval (5)',
      after.ok && after.data?.status === 5,
      { status: after.data?.status },
    );

    // Ask expert
    const ask = await req('/api/conversations/ask-expert', {
      method: 'POST',
      token,
      body: {
        subject: `E2E Soru ${Date.now()}`,
        landId: land?.id ?? null,
      },
    });
    const conversationId =
      typeof ask.data === 'string'
        ? ask.data
        : ask.data?.id || ask.data?.conversationId;
    ok('POST /api/conversations/ask-expert', ask.ok && Boolean(conversationId), {
      status: ask.status,
      conversationId,
    });

    if (conversationId) {
      const thread = await req(`/api/conversations/${conversationId}`, {
        token,
      });
      ok('GET /api/conversations/:id', thread.ok, {
        status: thread.status,
        messages: thread.data?.messages?.length,
      });

      const msg = await req(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        token,
        body: { body: 'Merhaba uzman, E2E test mesajı.' },
      });
      ok('POST /api/conversations/:id/messages', msg.ok, { status: msg.status });
    }

    // Notifications read-all
    const readAll = await req('/api/notifications/read-all', {
      method: 'POST',
      token,
    });
    ok('POST /api/notifications/read-all', readAll.ok || readAll.status === 204, {
      status: readAll.status,
    });

    // Officer approve
    if (officerTok) {
      const approve = await req(`/api/tasks/${taskId}/approve`, {
        method: 'POST',
        token: officerTok,
      });
      ok('POST /api/tasks/:id/approve', approve.ok, { status: approve.status });

      const approved = await req(`/api/tasks/${taskId}`, { token });
      ok(
        'task status Approved (2)',
        approved.ok && approved.data?.status === 2,
        { status: approved.data?.status },
      );
    }
  }

  // Refresh token
  const refreshTok = loginRes.data?.refreshToken;
  if (refreshTok) {
    const refreshed = await req('/api/auth/refresh', {
      method: 'POST',
      body: { refreshToken: refreshTok },
    });
    ok(
      'POST /api/auth/refresh',
      refreshed.ok && Boolean(refreshed.data?.accessToken),
      { status: refreshed.status },
    );
  } else {
    ok('POST /api/auth/refresh', false, 'no refreshToken');
  }

  finish(results.every((r) => r.pass) ? 0 : 1);
}

function finish(code) {
  const pass = results.filter((r) => r.pass).length;
  const fail = results.filter((r) => !r.pass).length;
  console.log(`\n=== SUMMARY: ${pass} PASS / ${fail} FAIL / ${results.length} TOTAL ===\n`);
  fs.writeFileSync(
    path.join(__dirname, 'producer-mobile-e2e-report.json'),
    JSON.stringify({ api: API, pass, fail, results }, null, 2),
  );
  process.exit(code);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
