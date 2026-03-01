import express from "express";
import multer from "multer";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(express.json());

// =========================
//  BRAND LANDING PAGE
// =========================
app.get("/", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>LORD AI IMAGE API</title>
        <style>
          body {
            background: #05060a;
            color: #f5f5f5;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            text-align: center;
            padding: 40px 10px;
          }
          h1 {
            font-size: 42px;
            color: #00eaff;
            text-shadow: 0 0 12px #00eaffaa;
            margin-bottom: 10px;
          }
          h2 {
            color: #ff4dff;
            text-shadow: 0 0 10px #ff4dffaa;
          }
          p {
            font-size: 17px;
            opacity: 0.9;
          }
          .box {
            margin: 30px auto;
            padding: 20px;
            max-width: 900px;
            background: radial-gradient(circle at top, #111827, #020617);
            border-radius: 14px;
            border: 1px solid #00eaff55;
            box-shadow: 0 0 25px #00eaff33;
          }
          code {
            background: #020617;
            padding: 12px 14px;
            display: block;
            border-radius: 8px;
            margin-top: 10px;
            text-align: left;
            color: #a5f3fc;
            font-size: 14px;
            overflow-x: auto;
          }
          .tagline {
            margin-bottom: 20px;
            font-size: 18px;
          }
          .footer {
            margin-top: 40px;
            opacity: 0.6;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <h1>🔥 LORD AI IMAGE API 🔥</h1>
        <p class="tagline">Karibu kwenye API inayofanya <b>CHOCHOTE</b> unachoandika kwa kutumia picha yako.</p>

        <div class="box">
          <h2>🧪 Jinsi ya Kutumia</h2>
          <p>Tuma request ya aina ya <b>POST</b> kwenye endpoint hii:</p>
          <code>POST /process</code>

          <p>Tumia <b>form-data</b> kwenye body:</p>
          <code>
image: (file ya picha)<br>
text: (maelekezo yoyote unayotaka yafanyike kwenye picha)
          </code>

          <p>Mifano ya maelekezo:</p>
          <code>
"ondoa background"<br>
"nifanye cartoon"<br>
"weka jina langu juu ya picha"<br>
"ongeza blur na mwanga"<br>
"badilisha background iwe beach usiku"
          </code>

          <p>Response itarudisha:</p>
          <code>
status: "success"<br>
instruction: (ulichoandika)<br>
ai_prompt: (maelekezo yaliyosafishwa na AI)<br>
output: (data kutoka kwa model ya AI image)
          </code>
        </div>

        <p class="footer">© 2026 BROKEN LORD CMD — LORD AI IMAGE API • Built for anything you can imagine.</p>
      </body>
    </html>
  `);
});

// =========================
//  MAIN AI ENDPOINT
// =========================
app.post("/process", upload.single("image"), async (req, res) => {
  try {
    const userText = req.body.text;
    const image = req.file;

    if (!userText || !image) {
      return res.status(400).json({ error: "Missing text or image" });
    }

    // STEP 1: Convert user instruction → AI prompt (Groq)
    const groqResponse = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama3-8b-8192",
        messages: [
          {
            role: "system",
            content:
              "You convert user instructions into a clean, concise image editing prompt. Respond with ONLY the prompt, no explanation."
          },
          {
            role: "user",
            content: `Instruction: "${userText}". Convert this into a single image editing prompt.`
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const aiPrompt = groqResponse.data.choices[0].message.content.trim();

    // STEP 2: Send to Replicate for image editing
    const replicateResponse = await axios.post(
      "https://api.replicate.com/v1/predictions",
      {
        version: "black-forest-labs/flux-schnell",
        input: {
          prompt: aiPrompt,
          image: image.path
        }
      },
      {
        headers: {
          Authorization: `Token ${process.env.REPLICATE_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.json({
      status: "success",
      instruction: userText,
      ai_prompt: aiPrompt,
      output: replicateResponse.data
    });

  } catch (err) {
    console.error(err?.response?.data || err.message);
    res.status(500).json({ error: "AI processing failed" });
  }
});

// =========================
//  START SERVER
// =========================
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`LORD AI IMAGE API running on port ${port}`);
});
