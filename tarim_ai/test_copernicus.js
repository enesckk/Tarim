

async function testAuth(clientId, clientSecret) {
  const tokenUrl = 'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token';
  
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);

  try {
    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });

    if (res.ok) {
      const data = await res.json();
      console.log(`[SUCCESS] Client ID: ${clientId} | Secret: ${clientSecret}`);
      console.log(`Access Token acquired! (length: ${data.access_token.length})`);
      return true;
    } else {
      const text = await res.text();
      console.log(`[FAILED] Client ID: ${clientId} | Secret: ${clientSecret} | Status: ${res.status} | Msg: ${text}`);
      return false;
    }
  } catch (err) {
    console.error('[ERROR]', err.message);
    return false;
  }
}

async function main() {
  // Let's test combinations
  const id1 = 'sh-142bda52-f026-41d7-b275-55af9491f925';
  const secret1 = '3efc7c41-be35-4154-a31d-af5b9925fd49';
  const secret2 = '1911ee1d-d292-401d-8a0d-e93a150d02ed';
  
  console.log("Testing combination 1...");
  const res1 = await testAuth(id1, secret1);
  
  if (!res1) {
     console.log("Testing combination 2...");
     await testAuth(id1, secret2);
  }
}

main();
