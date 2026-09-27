import { Router } from "express";

const router = Router();

router.post("/nature/reflection", async (req, res) => {
  const answer = typeof req.body?.answer === "string" ? req.body.answer.trim() : "";
  if (!answer) {
    res.status(400).json({ message: "An answer is required." });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.json({
      reply:
        "Gemini is not connected yet, but I can still wonder with you: the wind gave the clouds and leaves a little push! / Gemini 还没有连接好，不过我们可以一起想想：是风给了云和树叶一点点推力！",
    });
    return;
  }

  try {
    const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [
              {
                text:
                  "You are Garden Buddy, a warm, playful bilingual teacher for young children. Reply in simple English and Chinese, celebrate the child's idea, and explain that wind pushes clouds, leaves, or the tree. Keep it to two short sentences.",
              },
            ],
          },
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 120,
          },
          contents: [
            {
              role: "user",
              parts: [{ text: answer }],
            },
          ],
        }),
      },
    );
    if (!response.ok) {
      res.status(502).json({ message: "The reflection service is unavailable." });
      return;
    }
    const data = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const reply = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim();
    if (!reply) {
      res.status(502).json({ message: "The reflection service returned no reply." });
      return;
    }
    res.json({ reply });
  } catch (error) {
    req.log.error({ err: error }, "Nature reflection request failed");
    res.status(502).json({ message: "The reflection service is unavailable." });
  }
});

export default router;
