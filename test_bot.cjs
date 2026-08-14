const { Telegraf } = require('telegraf');
const fs = require('fs');

async function test() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
        console.log("No token");
        return;
    }
    const bot = new Telegraf(token);
    try {
        console.log("Uploading fly.gif...");
        const msg = await bot.telegram.sendAnimation(process.env.TEST_CHAT_ID || '123456789', { source: 'fly.gif' });
        console.log("Success! File ID:", msg.animation.file_id);
    } catch (e) {
        console.error("Error:", e.message);
    }
}
test();
