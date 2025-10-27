const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
require("dotenv").config();
const fs = require("fs");

const app = express();
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const bot = new TelegramBot(BOT_TOKEN, {
  polling: { interval: 300, autoStart: true },
});

let adminChatId = null;
if (fs.existsSync("chat.json")) {
  const data = JSON.parse(fs.readFileSync("chat.json", "utf8"));
  adminChatId = data.chat_id;
}

// /start buyrug‘i
bot.onText(/\/start/, (msg) => {
  if (adminChatId && adminChatId === msg.chat.id) {
    bot.sendMessage(msg.chat.id, "Bot allaqachon ishga tushgan ✅");
    return;
  }

  adminChatId = msg.chat.id;
  fs.writeFileSync("chat.json", JSON.stringify({ chat_id: adminChatId }));

  bot.sendMessage(
    adminChatId,
    "✅ Bot ishga tushdi! Endi frontdan so‘rov yuborsangiz, shu yerda chiqadi."
  );
});

function validateRequest(name, phone, email) {
  const errors = [];

  if (!name || name.trim().length < 3) {
    errors.push("Ism kamida 3 ta belgidan iborat bo‘lishi kerak");
  }

  const phoneRegex = /^\+?\d{9,15}$/;
  if (!phone || !phoneRegex.test(phone)) {
    errors.push("Telefon raqami noto‘g‘ri formatda");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    errors.push("Email noto‘g‘ri formatda");
  }

  return errors;
}

// Frontenddan so‘rov
app.post("/send_request", async (req, res) => {
  const { name, phone, email, message } = req.body;

  const errors = validateRequest(name, phone, email);
  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  if (!adminChatId || adminChatId === 0) {
    return res.status(400).json({
      success: false,
      message: "Bot hali hech kim bilan /start orqali aloqa o‘rnatmagan!",
    });
  }

  const text = `
📩 <b>Yangi so‘rov keldi:</b>
👤 Ism: ${name}
📞 Tel: ${phone}
📧 Email: ${email}
💬 Xabar: ${message || "Yo‘q"}
`;

  try {
    await bot.sendMessage(adminChatId, text, { parse_mode: "HTML" });
    res.status(200).json({ success: true, message: "So‘rov botga yuborildi!" });
  } catch (error) {
    console.error("Xatolik:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Botga yuborishda xatolik yuz berdi!" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server ishga tushdi: ${PORT}`));
