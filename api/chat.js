export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, model, temperature, max_tokens } = req.body;

  try {
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: model || "llama-3.1-8b-instant",
        messages: messages,
        temperature: temperature || 0.7,
        max_tokens: max_tokens || 1024
      })
    });

    const data = await groqResponse.json();
    return res.status(groqResponse.status).json(data);
  } catch (error) {
    console.error('Groq Proxy Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
