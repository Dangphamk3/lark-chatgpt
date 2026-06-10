export default async function handler(req, res) {
  const body = req.body;

  // Xác thực challenge từ Lark
  if (body.challenge) {
    return res.json({ challenge: body.challenge });
  }

  const APPID   = 'App_ID_của_bạn';
  const SECRET  = 'App_Secret_của_bạn';
  const KEY     = 'OpenAI_API_Key_của_bạn';

  const event = body.event;
  if (!event?.message) return res.json({ ok: true });

  const content = JSON.parse(event.message.content);
  const userMsg = content.text.replace(/@\S+/g, '').trim();

  // Gọi OpenAI
  const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: userMsg }]
    })
  });
  const aiData = await aiRes.json();
  const reply = aiData.choices[0].message.content;

  // Lấy token Lark
  const tokenRes = await fetch(
    'https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: APPID, app_secret: SECRET })
    }
  );
  const tokenData = await tokenRes.json();
  const token = tokenData.tenant_access_token;

  // Gửi trả lời về Lark
  await fetch('https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=open_id', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      receive_id: event.sender.sender_id.open_id,
      msg_type: 'text',
      content: JSON.stringify({ text: reply })
    })
  });

  return res.json({ success: true });
}
