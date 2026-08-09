async function testAuth(clientId, clientSecret) {
  const tokenUrl = 'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token';
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);
  const res = await fetch(tokenUrl, { method: 'POST', body: params });
  if (res.ok) { console.log(`[SUCCESS] Client ID: ${clientId} | Secret: ${clientSecret}`); return true; }
  else { console.log(`[FAILED] Client ID: ${clientId} | Secret: ${clientSecret} | Status: ${res.status}`); return false; }
}
async function main() {
  await testAuth('sh-160820a4-8ef0-4190-8bbd-45033dac76d2', 'd5VgM5yyhXxRkTEuqRjH7PzZG0BqYmXN');
}
main();
