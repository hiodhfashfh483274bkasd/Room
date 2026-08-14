const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
    "|| (ctx.message as any).text.toLowerCase() === 'б'))",
    "|| (ctx.message as any).text.toLowerCase() === 'баланс' || (ctx.message as any).text.toLowerCase().startsWith('перевести'))"
);

code = code.replace(
    "bot.hears(/^б$/i, (ctx) => {",
    "bot.hears(/^баланс$/i, (ctx) => {"
);

code = code.replace(
    "bot.hears(/^п\\s+(\\d+)$/i, (ctx) => {",
    "bot.hears(/^перевести\\s+(\\d+)$/i, (ctx) => {"
);

fs.writeFileSync('server.ts', code);
