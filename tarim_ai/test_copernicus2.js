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
  const id1 = 'sh-142bda52-f026-41d7-b275-55af9491f925';
  const id2 = 'sh-3efc7c41-be35-4154-a31d-af5b9925fd49'; // maybe it starts with sh- ?
  const id3 = 'sh-1911ee1d-d292-401d-8a0d-e93a150d02ed';
  
  const secrets = ['3efc7c41-be35-4154-a31d-af5b9925fd49', '1911ee1d-d292-401d-8a0d-e93a150d02ed'];
  
  for (const secret of secrets) {
      await testAuth(id1, secret);
      await testAuth(id2, secret);
      await testAuth(id3, secret);
  }
}
main();
