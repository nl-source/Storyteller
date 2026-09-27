import { Router } from "express";

const router = Router();

router.post("/nature/reflection", async (req, res) => {
  const answer = typeof req.body?.answer === "string" ? req.body.answer.trim() : "";
  if (!answer) {
    res.status(400).json({ message: "An answer is required." });
    return;
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    res.json({
      reply:
        "DeepSeek is not connected yet, but I can still wonder with you: the wind gave the clouds and leaves a little push! / DeepSeek 还没有连接好，不过我们可以一起想想：是风给了云和树叶一点点推力！",
    });
    return;
  }

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
        temperature: 0.7,
        max_tokens: 120,
        messages: [
          {
            role: "system",
            content:
              "You are Garden Buddy, a warm, playful bilingual teacher for young children. Reply in simple English and Chinese, celebrate the child's idea, and explain that wind pushes clouds, leaves, or the tree. Keep it to two short sentences.",
          },
          { role: "user", content: answer },
        ],
      }),
    });
    if (!response.ok) {
      res.status(502).json({ message: "The reflection service is unavailable." });
      return;
    }
    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const reply = data.choices?.[0]?.message?.content?.trim();
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
