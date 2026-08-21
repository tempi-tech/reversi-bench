export default async function(event) {
  if (event.op === 'image') {
    const bytes = Uint8Array.from(atob(event.dataBase64), (c) => c.charCodeAt(0))
    const form = new FormData()
    form.append('payload_json', JSON.stringify({ content: event.content ?? '' }))
    form.append('files[0]', new Blob([bytes], { type: 'image/jpeg' }), event.filename ?? 'board.jpg')
    const res = await fetch(`https://discord.com/api/v10/channels/${event.channelId}/messages`, {
      method: 'POST',
      body: form,
    })
    return res.json()
  }
  if (event.op === 'forum') {
    const res = await fetch(`https://discord.com/api/v10/channels/${event.channelId}/threads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: event.name,
        auto_archive_duration: 1440,
        message: { content: event.content },
      }),
    })
    return res.json()
  }
  const res = await fetch(`https://discord.com/api/v10/channels/${event.channelId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: event.content }),
  })
  return res.json()
}
