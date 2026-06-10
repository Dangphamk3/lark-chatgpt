module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).json({ ok: true });

  const body = req.body;
  if (body.challenge) return res.json({ challenge: body.challenge });

  const APPID  = process.env.LARK_APPID;
  const SECRET = process.env.LARK_SECRET;
  const KEY    = process.env.OPENAI_KEY;

  const event = body?.event;
  if (!event?.message) return res.json({ ok: true });

  const content = JSON.parse(event.message.content);
  const userMsg = content.text.replace(/@\S+/g, '').trim();

  const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KEY}` },
    body: JSON.stringify({ model: 'gpt-3.5-turbo', messages: [{ role: 'user', content: userMsg }] })
  });
  const aiData = await aiRes.json();
  const reply = aiData.choices[0].message.content;

  const tokenRes = await fetch('https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: APPID, app_secret: SECRET })
  });
  const { tenant_access_token: token } = await tokenRes.json();

  await fetch('https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=open_id', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      receive_id: event.sender.sender_id.open_id,
      msg_type: 'text',
      content: JSON.stringify({ text: reply })
    })
  });

  return res.json({ success: true });
}
