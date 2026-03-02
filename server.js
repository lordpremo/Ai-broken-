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
  res.send("🔥 BROKEN LORD CMD — AI IMAGE & VIDEO API IS LIVE 🔥");
});

// =========================
//  /process — IMAGE EDITING (C MODE)
// =========================
app.post("/process", upload.single("image"), async (req, res) => {
  try {
    const userText = req.body.text;
    const image = req.file;

    if (!userText || !image) {
      return res.status(400).json({ error: "Missing text or image" });
    }

    // 1. Convert instruction → clean AI prompt (Groq)
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

    // 2. Run image editing using flux-kontext-pro
    const output = await replicate.run("black-forest-labs/flux-kontext-pro", {
      input: {
        prompt: aiPrompt,
        input_image: image.path,
        output_format: "jpg"
      }
    });

    res.json({
      status: "success",
      mode: "image_edit_ai",
      instruction: userText,
      ai_prompt: aiPrompt,
      output_url: output?.url ? output.url() : output?.[0] || output
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "AI processing failed",
      details: err.message
    });
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
  console.log(`🔥 BROKEN LORD CMD API running on port ${port}`);
});
