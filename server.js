import express from "express";
import multer from "multer";
import axios from "axios";
import dotenv from "dotenv";
import Replicate from "replicate";

dotenv.config();

const app = express();
const upload = multer({ dest: "uploads/" });
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN
});

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
            font-family: system-ui, sans-serif;
            text-align: center;
            padding: 40px 10px;
          }
          h1 {
            font-size: 42px;
            color: #00eaff;
            text-shadow: 0 0 12px #00eaffaa;
          }
          h2 {
            color: #ff4dff;
            text-shadow: 0 0 10px #ff4dffaa;
          }
          .box {
            margin: 30px auto;
            padding: 20px;
            max-width: 900px;
            background: #0f172a;
            border-radius: 14px;
            border: 1px solid #00eaff55;
            box-shadow: 0 0 25px #00eaff33;
          }
          code {
            background: #020617;
            padding: 12px;
            display: block;
            border-radius: 8px;
            margin-top: 10px;
            text-align: left;
            color: #a5f3fc;
            font-size: 14px;
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
        <p>API inayofanya <b>CHOCHOTE</b> unachoandika kwa kutumia AI + Picha.</p>

        <div class="box">
          <h2>🧪 Jinsi ya Kutumia</h2>
          <p>Tuma request ya aina ya <b>POST</b> kwenye:</p>
          <code>POST /process</code>

          <p>Tumia <b>form-data</b>:</p>
          <code>
image: (file ya picha)<br>
text: (maelekezo yoyote)
          </code>

          <p>Mfano wa maelekezo:</p>
          <code>
"ondoa background"<br>
"nifanye cartoon"<br>
"weka jina langu juu ya picha"<br>
"badilisha background iwe beach"<br>
"ongeza mwanga na contrast"
          </code>
        </div>

        <p class="footer">© 2026 BROKEN LORD CMD — LORD AI IMAGE API</p>
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
              "Convert user instructions into a clean, concise image editing prompt. Respond with ONLY the prompt."
          },
          {
            role: "user",
            content: `Instruction: "${userText}". Convert to image editing prompt.`
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

    // STEP 2: Run Replicate model
    const output = await replicate.run("black-forest-labs/flux-2-pro", {
      input: {
        prompt: aiPrompt,
        image: image.path
      }
    });

    res.json({
      status: "success",
      instruction: userText,
      ai_prompt: aiPrompt,
      output_url: output?.[0] || output
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI processing failed", details: err.message });
  }
});

// =========================
//  START SERVER
// =========================
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`LORD AI IMAGE API running on port ${port}`);
});
