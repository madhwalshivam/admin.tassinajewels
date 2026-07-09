async function run() {
  const url = 'https://pub-17a03ed838cff7b48ee24c1876e145fc.r2.dev/tape/dfix/1783587443069-banner_tassila.png';
  try {
    const res = await fetch(url, { method: 'HEAD' });
    console.log('Status:', res.status);
    console.log('Headers:', Object.fromEntries(res.headers.entries()));
  } catch (err) {
    console.error('Fetch error:', err);
  }
}
run();
