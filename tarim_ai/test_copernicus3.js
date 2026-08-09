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
  const ids = ['142bda52-f026-41d7-b275-55af9491f925', '3efc7c41-be35-4154-a31d-af5b9925fd49', '1911ee1d-d292-401d-8a0d-e93a150d02ed'];
  const secrets = ['142bda52-f026-41d7-b275-55af9491f925', '3efc7c41-be35-4154-a31d-af5b9925fd49', '1911ee1d-d292-401d-8a0d-e93a150d02ed'];
  
  for (const id of ids) {
    for (const secret of secrets) {
      if (id !== secret) await testAuth(id, secret);
    }
  }
}
main();
