export default async function(event) {
  const startedAt = Date.now();
  const response = await fetch('https://api.typesafe.ai/v1/systemone', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
    agiWings: { connection: 'jev' },
  });
  const text = await response.text();
  return { status: response.status, elapsedMs: Date.now() - startedAt, body: JSON.parse(text) };
}
