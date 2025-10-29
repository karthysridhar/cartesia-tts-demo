// ✅ CommonJS version
require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const cors = require('cors'); // ✅ Add this

const OpenAI = require('openai');

const app = express();

// ✅ Allow CORS from your Netlify site
app.use(cors({
  origin: ['https://cartesia-tts-demo.netlify.app'], // your frontend URL
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));


// 🧠 Environment variables
const PORT = process.env.PORT || 10000;
const API_KEY = process.env.CARTESIA_API_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

// 🧩 OpenAI setup
const openai = new OpenAI({
  apiKey: OPENAI_KEY,
});

const CARTESIA_API_BASE = "https://api.cartesia.ai/tts/bytes";

// 🟢 Route: Fetch available voices
app.get('/voices', async (req, res) => {
  try {
    const response = await fetch('https://api.cartesia.ai/voices', {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Cartesia-Version': '2025-04-16',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Cartesia voices error:', errText);
      return res.status(502).json({ error: errText });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching voices:', error);
    res.status(500).json({ error: 'Failed to fetch voices' });
  }
});

// 🟢 Route: Generate speech with Cartesia
app.post('/generate', async (req, res) => {
  try {
    const { text, voice_id, model_id = 'sonic-multilingual-v1' } = req.body;

    if (!text || !voice_id) {
      return res.status(400).json({ error: 'Missing text or voice_id' });
    }

    const response = await fetch(CARTESIA_API_BASE, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Cartesia-Version': '2025-04-16'
      },
      body: JSON.stringify({
        transcript: text,
        model_id,
        voice: { mode: "id", id: voice_id },
        output_format: {
          container: "wav",
          encoding: "pcm_f32le",
          sample_rate: 44100
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Cartesia error:', errText);
      return res.status(500).json({ error: 'internal server error' });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.setHeader('Content-Type', 'audio/wav');
    res.send(buffer);
  } catch (error) {
    console.error('Server error', error);
    res.status(500).json({ error: 'internal server error' });
  }
});

// 🧠 Route: Ask GPT and get AI response
app.post('/chat', async (req, res) => {
  try {
    const { message, messages } = req.body;
    if (!message && !Array.isArray(messages))
      return res.status(400).json({ error: 'Message or messages is required' });

    const mockOrders = [
      {
        id: "ARTZ-4593",
        item: "The Super Puff™ Shorty (Size M, Black)",
        status: "Packed and getting ready to ship",
        eta: "Thursday, October 24",
        carrier: "Canada Post"
      },
      {
        id: "ARTZ-3621",
        item: "Cozy Fleece Hoodie (Size L, Beige)",
        status: "Delivered on October 20",
        carrier: "FedEx"
      }
    ];

    const chatPrompt = `
You are an AI assistant for Aritzia's online store.
You help customers check order status, update addresses, and provide friendly, human-like service.
Be polite and conversational.
Use warm language like “Absolutely!” or “You got it!” when appropriate.
Here’s your mock order database:

${JSON.stringify(mockOrders, null, 2)}

Respond naturally to the customer message below.
    `;

    const messageList = [
      { role: "system", content: chatPrompt }
    ];

    if (Array.isArray(messages)) {
      for (const m of messages) {
        if (m && m.role && m.content)
          messageList.push({ role: m.role, content: m.content });
      }
    } else if (message) {
      messageList.push({ role: "user", content: message });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messageList
    });

    const reply = completion.choices[0].message.content;
    res.json({ reply });
  } catch (err) {
    console.error('OpenAI error:', err);
    res.status(500).json({ error: 'Chat generation failed' });
  }
});

// 🟢 Start server
app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});
