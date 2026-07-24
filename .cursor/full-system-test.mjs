#!/usr/bin/env node
/**
 * Full system smoke: Admin + Officer(s) + Producer
 * Checks login, /me, role-scoped APIs, forbidden paths, DB-backed lists.
 */
const API = process.env.API_URL || 'http://127.0.0.1:5109';

const accounts = [
  {
    id: 'admin',
    email: 'admin@agriculture.local',
    password: 'Admin123!',
    expectRoles: ['Administrator'],
  },
  {
    id: 'officer',
    email: 'uzman@agriculture.local',
    password: 'Officer123!',
    phone: '05551112233',
    expectRoles: ['Officer'],
  },
  {
    id: 'officer1',
    email: 'uzman1@agriculture.local',
    password: 'Officer123!',
    expectRoles: ['Officer'],
  },
  {
    id: 'officer2',
    email: 'uzman2@agriculture.local',
    password: 'Officer123!',
    expectRoles: ['Officer'],
  },
  {
    id: 'officer3',
    email: 'uzman3@agriculture.local',
    password: 'Officer123!',
    expectRoles: ['Officer'],
  },
  {
    id: 'producer',
    email: 'uretici@agriculture.local',
    password: 'asd',
    phone: '5537472823',
    expectRoles: ['Producer'],
  },
];

const results = [];

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

async function req(path, { method = 'GET', token, body, headers } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data, ok: res.ok };
}

async function login(email, password) {
  return req('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

async function main() {
  console.log(`\n=== FULL SYSTEM TEST @ ${API} ===\n`);

  // 0) Health
  {
    const h = await req('/health');
    ok('API /health', h.status === 200 && h.data?.status === 'healthy', h.data);
  }

  const tokens = {};

  // 1) Logins (email)
  for (const acc of accounts) {
    const r = await login(acc.email, acc.password);
    const token = r.data?.accessToken || r.data?.token;
    const roles = r.data?.roles || r.data?.user?.roles || [];
    const pass =
      r.status === 200 &&
      Boolean(token) &&
      acc.expectRoles.every((role) =>
        roles.map(String).some((x) => x.toLowerCase() === role.toLowerCase()),
      );
    ok(`${acc.id} login (${acc.email})`, pass, {
      status: r.status,
      roles,
      hasToken: Boolean(token),
    });
    if (token) tokens[acc.id] = { token, raw: r.data };
  }

  // 2) Phone logins (officer + producer)
  for (const acc of accounts.filter((a) => a.phone)) {
    const r = await login(acc.phone, acc.password);
    const token = r.data?.accessToken || r.data?.token;
    ok(`${acc.id} phone login (${acc.phone})`, r.status === 200 && Boolean(token), {
      status: r.status,
    });
  }

  // 3) /api/me for each logged-in account
  for (const acc of accounts) {
    const t = tokens[acc.id]?.token;
    if (!t) {
      ok(`${acc.id} /me`, false, 'no token');
      continue;
    }
    const me = await req('/api/me', { token: t });
    const roles = me.data?.roles || [];
    const roleOk = acc.expectRoles.every((role) =>
      roles.map(String).some((x) => x.toLowerCase() === role.toLowerCase()),
    );
    ok(`${acc.id} /me`, me.status === 200 && roleOk, {
      status: me.status,
      email: me.data?.email,
      fullName: me.data?.fullName,
      phone: me.data?.phone,
      producerId: me.data?.producerId ?? null,
      roles,
    });
    tokens[acc.id].me = me.data;
  }

  const admin = tokens.admin?.token;
  const officer = tokens.officer?.token;
  const producer = tokens.producer?.token;

  // 4) Admin core endpoints
  if (admin) {
    const paths = [
      ['GET', '/api/dashboard'],
      ['GET', '/api/lands'],
      ['GET', '/api/producers'],
      ['GET', '/api/staff/officers'],
      ['GET', '/api/users/officers'],
      ['GET', '/api/workflows'],
      ['GET', '/api/inspections'],
      ['GET', '/api/harvest'],
      ['GET', '/api/notifications'],
      ['GET', '/api/conversations'],
      ['GET', '/api/seasons'],
    ];
    for (const [method, path] of paths) {
      const r = await req(path, { method, token: admin });
      const pass = r.status >= 200 && r.status < 300;
      const count = Array.isArray(r.data) ? `n=${r.data.length}` : typeof r.data;
      ok(`admin ${method} ${path}`, pass, `${r.status} ${count}`);
    }
  }

  // 5) Officer scoped + forbidden
  if (officer) {
    const allowed = [
      ['GET', '/api/dashboard'],
      ['GET', '/api/lands'],
      ['GET', '/api/producers'],
      ['GET', '/api/tasks/pending-approval'],
      ['GET', '/api/inspections'],
      ['GET', '/api/harvest'],
      ['GET', '/api/notifications'],
      ['GET', '/api/conversations'],
      ['GET', '/api/conversations/expert'],
      ['GET', '/api/me'],
    ];
    for (const [method, path] of allowed) {
      const r = await req(path, { method, token: officer });
      const pass = r.status >= 200 && r.status < 300;
      const count = Array.isArray(r.data) ? `n=${r.data.length}` : typeof r.data;
      ok(`officer ${method} ${path}`, pass, `${r.status} ${count}`);
    }

    const forbidden = [
      ['POST', '/api/lands', { name: 'X', parcelNumber: 'X', sizeInDecares: 1 }],
      ['POST', '/api/producers', { firstName: 'X', lastName: 'Y', nationalId: '111', phone: '0500' }],
      ['POST', '/api/workflows', { name: 'X', description: 'Y', cropType: 'Z', steps: [] }],
    ];
    for (const [method, path, body] of forbidden) {
      const r = await req(path, { method, token: officer, body });
      const pass = r.status === 401 || r.status === 403 || r.status === 404;
      ok(`officer FORBIDDEN ${method} ${path}`, pass, r.status);
    }

    // Officer may list workflow templates (land assign) but UI hides admin template editor
    {
      const r = await req('/api/workflows', { token: officer });
      ok(`officer GET /api/workflows`, r.status === 200 && Array.isArray(r.data), r.status);
    }

    // Officer lands must be subset / non-empty for demo
    const lands = await req('/api/lands', { token: officer });
    ok(
      'officer has assigned lands',
      Array.isArray(lands.data) && lands.data.length > 0,
      `n=${lands.data?.length}`,
    );
  }

  // 6) Producer mobile endpoints
  if (producer) {
    const me = tokens.producer.me;
    const pid = me?.producerId;
    ok('producer has producerId', Boolean(pid), pid);

    const allowed = [
      ['GET', '/api/tasks/today'],
      ['GET', '/api/notifications'],
      ['GET', '/api/conversations/expert'],
      ['GET', '/api/me'],
    ];
    if (pid) allowed.push(['GET', `/api/tasks?producerId=${pid}`]);

    for (const [method, path] of allowed) {
      const r = await req(path, { method, token: producer });
      const pass = r.status >= 200 && r.status < 300;
      const count = Array.isArray(r.data) ? `n=${r.data.length}` : typeof r.data;
      ok(`producer ${method} ${path}`, pass, `${r.status} ${count}`);
    }

    // Producer must NOT see staff admin surfaces
    for (const path of [
      '/api/staff/officers',
      '/api/workflows',
      '/api/dashboard',
      '/api/lands',
    ]) {
      const r = await req(path, { token: producer });
      if (path === '/api/lands') {
        // Producers see their own lands (profile + görev arazi kartı)
        ok(
          `producer lands scoped`,
          r.status === 200 && Array.isArray(r.data) && r.data.length > 0,
          `${r.status} n=${r.data?.length}`,
        );
      } else {
        const pass = r.status === 401 || r.status === 403 || r.status === 404;
        ok(`producer FORBIDDEN ${path}`, pass, r.status);
      }
    }
  }

  // 7) Cross-role land scoping: officer lands ⊆ admin lands
  if (admin && officer) {
    const a = await req('/api/lands', { token: admin });
    const o = await req('/api/lands', { token: officer });
    if (Array.isArray(a.data) && Array.isArray(o.data)) {
      const adminIds = new Set(a.data.map((x) => x.id));
      const allScoped = o.data.every((x) => adminIds.has(x.id));
      ok(
        'officer lands ⊆ admin lands',
        allScoped && o.data.length <= a.data.length,
        `officer=${o.data.length} admin=${a.data.length}`,
      );
    } else {
      ok('officer lands ⊆ admin lands', false, 'list failed');
    }
  }

  // 8) Officer approve queue + producer today consistency
  if (officer && producer) {
    const pending = await req('/api/tasks/pending-approval', { token: officer });
    ok(
      'officer pending-approval readable',
      pending.status === 200 && Array.isArray(pending.data),
      `n=${pending.data?.length}`,
    );
    const today = await req('/api/tasks/today', { token: producer });
    ok(
      'producer today tasks readable',
      today.status === 200 && Array.isArray(today.data),
      `n=${today.data?.length}`,
    );
  }

  // 9) All officers login + lands
  for (const id of ['officer1', 'officer2', 'officer3']) {
    const t = tokens[id]?.token;
    if (!t) continue;
    const lands = await req('/api/lands', { token: t });
    ok(
      `${id} lands readable`,
      lands.status === 200 && Array.isArray(lands.data),
      `n=${lands.data?.length}`,
    );
  }

  // 10) Refresh token smoke (admin)
  if (tokens.admin?.raw?.refreshToken) {
    const r = await req('/api/auth/refresh', {
      method: 'POST',
      body: { refreshToken: tokens.admin.raw.refreshToken },
    });
    ok(
      'admin refresh token',
      r.status === 200 && Boolean(r.data?.accessToken || r.data?.token),
      r.status,
    );
  } else {
    ok('admin refresh token', false, 'no refreshToken in login response');
  }

  // Summary
  const failed = results.filter((r) => !r.pass);
  const passed = results.filter((r) => r.pass);
  console.log(`\n=== SUMMARY: ${passed.length}/${results.length} passed, ${failed.length} failed ===\n`);
  if (failed.length) {
    console.log('FAILURES:');
    for (const f of failed) {
      console.log(` - ${f.name}: ${JSON.stringify(f.detail)}`);
    }
  }

  const outPath = new URL('./full-system-test-report.json', import.meta.url);
  await import('node:fs/promises').then((fs) =>
    fs.writeFile(outPath, JSON.stringify({ at: new Date().toISOString(), api: API, results }, null, 2)),
  );
  console.log(`Report: ${outPath.pathname}`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(2);
});
