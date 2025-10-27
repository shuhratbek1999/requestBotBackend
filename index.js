const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
require("dotenv").config();
const fs = require("fs");

const app = express();
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

let adminChatId = null;
if (fs.existsSync("chat.json")) {
  const data = JSON.parse(fs.readFileSync("chat.json", "utf8"));
  adminChatId = data.chat_id;
  console.log("♻️ Saqlangan chat_id o‘qildi:", adminChatId);
}

const lastRequests = {}; // { phone: timestamp }

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

// 📩 Frontenddan so‘rov
app.post("/send_request", async (req, res) => {
  const { name, phone, email, message } = req.body;

  if (!name || name.trim().length < 3) {
    return res.status(400).json({
      success: false,
      message: "Ism kamida 3 ta belgidan iborat bo‘lishi kerak.",
    });
  }

  const phoneRegex = /^\+?\d{9,15}$/;
  if (!phone || !phoneRegex.test(phone)) {
    return res
      .status(400)
      .json({ success: false, message: "Telefon raqam noto‘g‘ri formatda." });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return res
      .status(400)
      .json({ success: false, message: "Email noto‘g‘ri formatda." });
  }

  const now = Date.now();
  const cooldown = 60 * 60 * 1000;
  if (lastRequests[phone] && now - lastRequests[phone] < cooldown) {
    const waitTime = Math.ceil(
      (cooldown - (now - lastRequests[phone])) / 1000 / 60
    );
    return res.status(429).json({
      success: false,
      message: `Iltimos, ${waitTime} daqiqadan keyin qayta yuboring.`,
    });
  }

  lastRequests[phone] = now;

  if (!adminChatId) {
    return res.status(400).json({
      success: false,
      message: "Bot hali /start buyrug‘i orqali ishga tushirilmagan.",
    });
  }

  const text = `
📩 <b>Yangi so‘rov:</b>
👤 Ism: ${name}
📞 Tel: ${phone}
📧 Email: ${email}
💬 Xabar: ${message || "Yo‘q"}
`;

  try {
    await bot.sendMessage(adminChatId, text, { parse_mode: "HTML" });
    res
      .status(200)
      .json({ success: true, message: "So‘rov muvaffaqiyatli yuborildi!" });
  } catch (error) {
    console.error("Xatolik:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Botga yuborishda xatolik yuz berdi!" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server ishga tushdi: ${PORT}`));
