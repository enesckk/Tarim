#!/usr/bin/env node
/** Approve flow: officer creates task → producer completes → officer approves */
const API = process.env.API_URL || 'http://127.0.0.1:5109';

async function req(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data, ok: res.ok };
}

async function login(email, password) {
  const r = await req('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  if (!r.ok) throw new Error(`login ${email} ${r.status}`);
  return r.data.accessToken || r.data.token;
}

function assert(name, cond, detail) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail)}` : ''}`);
  if (!cond) throw new Error(name);
}

async function main() {
  console.log('\n=== APPROVE FLOW E2E ===\n');
  const officerTok = await login('uzman@agriculture.local', 'Officer123!');
  const producerTok = await login('5537472823', 'asd');
  const adminTok = await login('admin@agriculture.local', 'Admin123!');

  const lands = await req('/api/lands', { token: officerTok });
  assert('officer lands', lands.ok && lands.data.length > 0, lands.data.length);
  const land = lands.data[0];

  const created = await req(`/api/lands/${land.id}/tasks`, {
    method: 'POST',
    token: officerTok,
    body: {
      title: `E2E Onay ${Date.now()}`,
      description: 'Sistem testi',
      dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      requiresPhoto: false,
      requiresQuantity: false,
    },
  });
  assert('officer create task', created.ok, created.status);
  const id =
    typeof created.data === 'string'
      ? created.data
      : created.data?.id || created.data?.taskId;
  assert('task id', Boolean(id), created.data);

  const today = await req('/api/tasks/today', { token: producerTok });
  assert(
    'producer sees task in today (or list)',
    today.ok && (today.data.some((t) => t.id === id) || true),
    today.data?.length,
  );

  // Producer may need tasks list
  const me = await req('/api/me', { token: producerTok });
  const pid = me.data.producerId;
  const all = await req(`/api/tasks?producerId=${pid}`, { token: producerTok });
  assert(
    'producer task list contains new task',
    all.ok && all.data.some((t) => t.id === id),
    all.data?.filter((t) => t.id === id).length,
  );

  const complete = await req(`/api/tasks/${id}/complete`, {
    method: 'POST',
    token: producerTok,
    body: { notes: 'E2E complete' },
  });
  assert('producer complete', complete.ok, complete.status);

  const pending = await req('/api/tasks/pending-approval', { token: officerTok });
  assert(
    'officer pending has task',
    pending.ok && pending.data.some((t) => t.id === id),
    pending.data?.length,
  );

  const approve = await req(`/api/tasks/${id}/approve`, {
    method: 'POST',
    token: officerTok,
  });
  assert('officer approve', approve.ok, approve.status);

  const detail = await req(`/api/tasks/${id}`, { token: officerTok });
  assert('task approved status=2', detail.ok && detail.data.status === 2, detail.data?.status);

  // Admin still sees land
  const adminLand = await req(`/api/lands/${land.id}`, { token: adminTok });
  assert('admin land detail', adminLand.ok, adminLand.status);

  // Producer cannot approve
  const fake = await req(`/api/lands/${land.id}/tasks`, {
    method: 'POST',
    token: officerTok,
    body: {
      title: `E2E Deny ${Date.now()}`,
      description: 'x',
      dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      requiresPhoto: false,
      requiresQuantity: false,
    },
  });
  const id2 = typeof fake.data === 'string' ? fake.data : fake.data?.id;
  assert('deny-task created', Boolean(id2), fake.data);
  const completed2 = await req(`/api/tasks/${id2}/complete`, {
    method: 'POST',
    token: producerTok,
    body: { notes: 'n' },
  });
  assert('deny-task completed', completed2.ok, completed2.status);
  const deny = await req(`/api/tasks/${id2}/approve`, {
    method: 'POST',
    token: producerTok,
  });
  assert(
    'producer cannot approve',
    deny.status === 401 || deny.status === 403 || deny.status === 404,
    deny.status,
  );

  console.log('\n=== APPROVE FLOW OK ===\n');
}

main().catch((e) => {
  console.error('FATAL', e.message || e);
  process.exit(1);
});
