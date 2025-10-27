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

let chatIds = [];

// Fayldan o‘qish
if (fs.existsSync("chat.json")) {
  const data = JSON.parse(fs.readFileSync("chat.json", "utf8"));
  chatIds = data.chat_ids || [];
  console.log("♻️ Saqlangan chat_id lar o‘qildi:", chatIds);
}

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  if (!chatIds.includes(chatId)) {
    chatIds.push(chatId);
    fs.writeFileSync("chat.json", JSON.stringify({ chat_ids: chatIds }));
    bot.sendMessage(
      chatId,
      "✅ Siz botga ulandingiz! Endi so‘rovlar shu yerda chiqadi."
    );
  } else {
    bot.sendMessage(chatId, "Bot allaqachon siz bilan ulanib bo‘lgan ✅");
  }
});

function validateRequest(name, phone, email) {
  const errors = [];

  if (!name || name.trim().length < 2) {
    errors.push("Ism kamida 2 ta belgidan iborat bo‘lishi kerak");
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

  if (!chatIds.length) {
    return res.status(400).json({
      success: false,
      message: "Hali hech kim /start orqali botga ulanmagan!",
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
    for (const id of chatIds) {
      await bot.sendMessage(id, text, { parse_mode: "HTML" });
    }
    res.json({
      success: true,
      message: "So‘rov barcha foydalanuvchilarga yuborildi!",
    });
  } catch (error) {
    console.error("Xatolik:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Botga yuborishda xatolik yuz berdi!" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server ishga tushdi: ${PORT}`));
