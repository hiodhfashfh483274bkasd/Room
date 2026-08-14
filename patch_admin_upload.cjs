const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const uploadCmd = `
bot.command('upload_gifs', async (ctx) => {
    try {
        await ctx.reply("Загружаю fly.gif...");
        const m1 = await ctx.replyWithAnimation({ source: 'fly.gif' });
        await ctx.reply("fly.gif ID: " + m1.animation.file_id);
        
        await ctx.reply("Загружаю win.gif...");
        const m2 = await ctx.replyWithAnimation({ source: 'win.gif' });
        await ctx.reply("win.gif ID: " + m2.animation.file_id);
        
        await ctx.reply("Загружаю lose.gif...");
        const m3 = await ctx.replyWithAnimation({ source: 'lose.gif' });
        await ctx.reply("lose.gif ID: " + m3.animation.file_id);
    } catch (e) {
        await ctx.reply("Ошибка: " + e.message);
    }
});
`;

code = code.replace("bot.start((ctx) => {", uploadCmd + "\n\nbot.start((ctx) => {");
fs.writeFileSync('server.ts', code);
