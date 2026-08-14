const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
    "=== 'баланс' || (ctx.message as any).text.toLowerCase().startsWith('перевести')",
    "=== 'банк' || (ctx.message as any).text.toLowerCase().startsWith('дать')"
);

code = code.replace(
    "bot.hears(/^баланс$/i, async (ctx) => {",
    "bot.hears(/^банк$/i, async (ctx) => {"
);

code = code.replace(
    "bot.hears(/^перевести\\s+(\\d+)$/i, async (ctx) => {",
    "bot.hears(/^дать\\s+(\\d+)$/i, async (ctx) => {"
);

code = code.replace(/Ваш баланс:/g, "Ваш банк:");
code = code.replace(/ваш новый баланс:/g, "ваш новый банк:");
code = code.replace(/перевести средства/g, "дать средства");

fs.writeFileSync('server.ts', code);
