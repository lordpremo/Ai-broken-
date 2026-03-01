import express from "express";
import multer from "multer";
import axios from "axios";
import dotenv from "dotenv";
import Replicate from "replicate";
import cors from "cors";

dotenv.config();

const app = express();
const upload = multer({ dest: "uploads/" });

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN
});

app.use(express.json());
app.use(cors());

// =========================
//  LANDING PAGE
// =========================
app.get("/", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>LORD AI IMAGE & VIDEO API</title>
        <style>
          body { background:#05060a;color:#f5f5f5;font-family:system-ui,sans-serif;text-align:center;padding:40px 10px; }
          h1 { font-size:40px;color:#00eaff;text-shadow:0 0 12px #00eaffaa; }
          h2 { color:#ff4dff;text-shadow:0 0 10px #ff4dffaa; }
          .box { margin:20px auto;padding:20px;max-width:900px;background:#0f172a;border-radius:14px;border:1px solid #00eaff55;box-shadow:0 0 25px #00eaff33; }
          code { background:#020617;padding:10px;display:block;border-radius:8px;margin-top:10px;text-align:left;color:#a5f3fc;font-size:13px; }
          .footer { margin-top:30px;opacity:0.6;font-size:14px; }
        </style>
      </head>
      <body>
        <h1>🔥 BROKEN LORD CMD — AI IMAGE & VIDEO API 🔥</h1>
        <p>Image editing, image generation, na video generation — zote kwenye API moja.</p>

        <div class="box">
          <h2>🖼 POST /process — Image Editing (image + text)</h2>
          <code>
image: (file ya picha)<br>
text: (maelekezo ya editing, mfano: "ondoa background")
          </code>
        </div>

        <div class="box">
          <h2>🖌 POST /generate-image — Text → Image</h2>
          <code>
text: "a neon cyberpunk city at night, ultra detailed"
          </code>
        </div>

        <div class="box">
          <h2>🎬 POST /generate-video — Text → Video</h2>
          <code>
text: "a woman is walking through a busy Tokyo street at night, cinematic"
          </code>
        </div>

        <p class="footer">© 2026 BROKEN LORD CMD</p>
      </body>
    </html>
  `);
});

// =========================
//  /process — IMAGE EDITING
// =========================
app.post("/process", upload.single("image"), async (req, res) => {
  try {
    const userText = req.body.text;
    const image = req.file;

    if (!userText || !image) {
      return res.status(400).json({ error: "Missing text or image" });
    }

    // GROQ → convert instruction to clean prompt
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

    // Replicate — image-to-image using flux-1.1-pro
    const output = await replicate.run("black-forest-labs/flux-1.1-pro", {
      input: {
        prompt: aiPrompt,
        image: image.path,
        strength: 0.7
      }
    });

    res.json({
      status: "success",
      mode: "image_edit",
      instruction: userText,
      ai_prompt: aiPrompt,
      output_url: output?.url ? output.url() : output?.[0] || output
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI processing failed", details: err.message });
  }
});

// =========================
//  /generate-image — TEXT → IMAGE
// =========================
app.post("/generate-image", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Missing text" });

    const output = await replicate.run("black-forest-labs/flux-1.1-pro", {
      input: {
        prompt: text,
        prompt_upsampling: true
      }
    });

    res.json({
      status: "success",
      mode: "text_to_image",
      prompt: text,
      output_url: output?.url ? output.url() : output?.[0] || output
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Image generation failed", details: err.message });
  }
});

// =========================
//  /generate-video — TEXT → VIDEO
// =========================
app.post("/generate-video", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Missing text" });

    const output = await replicate.run("minimax/video-01", {
      input: {
        prompt: text
      }
    });

    res.json({
      status: "success",
      mode: "text_to_video",
      prompt: text,
      output_url: output?.url ? output.url() : output
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Video generation failed", details: err.message });
  }
});

// =========================
//  START SERVER
// =========================
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`LORD AI IMAGE & VIDEO API running on port ${port}`);
});
