const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
    /ctx\.reply\('❌ Этот бот работает только в групповых чатах\.'\);/g,
    "ctx.reply('Этот бот работает только в групповых чатах');"
);
code = code.replace(
    /ctx\.reply\('❌ Недостаточно средств для перевода\.'\);/g,
    "ctx.reply('Недостаточно средств для перевода');"
);
code = code.replace(
    /ctx\.reply\('❌ Недостаточно средств на балансе\.'\);/g,
    "ctx.reply('Недостаточно средств на балансе');"
);
code = code.replace(
    /msg = await ctx\.reply\(`🚀 Полет начался!\\nКоэффициент: 1\.00x`, Markup\.inlineKeyboard/g,
    "msg = await ctx.reply(`Коэффициент: 1.00x`, Markup.inlineKeyboard"
);
code = code.replace(
    /await bot\.telegram\.sendMessage\(game\.chatId, `💥 Краш на \$\{multiplier\.toFixed\(2\)\}x\\nВы проиграли`\)/g,
    "await bot.telegram.sendMessage(game.chatId, `Краш на ${multiplier.toFixed(2)}x\\nВы проиграли`)"
);
code = code.replace(
    /await bot\.telegram\.sendAnimation\(game\.chatId, loseSource, \{ caption: `💥 Краш на \$\{multiplier\.toFixed\(2\)\}x\\nВы проиграли` \}\);/g,
    "await bot.telegram.sendAnimation(game.chatId, loseSource, { caption: `Краш на ${multiplier.toFixed(2)}x\\nВы проиграли` });"
);
code = code.replace(
    /await bot\.telegram\.sendMessage\(game\.chatId, `💥 Краш на \$\{multiplier\.toFixed\(2\)\}x\\nВы проиграли`\)\.catch\(\(\) => \{\}\);/g,
    "await bot.telegram.sendMessage(game.chatId, `Краш на ${multiplier.toFixed(2)}x\\nВы проиграли`).catch(() => {});"
);
code = code.replace(
    /await bot\.telegram\.editMessageText\(game\.chatId, game\.messageId, undefined, `🚀 Полет продолжается!\\nКоэффициент: \$\{multiplier\.toFixed\(2\)\}x`/g,
    "await bot.telegram.editMessageText(game.chatId, game.messageId, undefined, `Коэффициент: ${multiplier.toFixed(2)}x`"
);
code = code.replace(
    /await ctx\.answerCbQuery\('💥 Ракета уже взорвалась! Вы не успели\.', \{ show_alert: true \}\)/g,
    "await ctx.answerCbQuery('Ракета уже взорвалась! Вы не успели', { show_alert: true })"
);
code = code.replace(
    /await bot\.telegram\.sendMessage\(game\.chatId, `✅ Вы забрали выигрыш!\\n\\nКоэффициент: \$\{game\.currentMultiplier\.toFixed\(2\)\}x\\nВыигрыш: \$\{winAmount\} CRASH`\)/g,
    "await bot.telegram.sendMessage(game.chatId, `Вы забрали выигрыш!\\n\\nКоэффициент: ${game.currentMultiplier.toFixed(2)}x\\nВыигрыш: ${winAmount} CRASH`)"
);
code = code.replace(
    /caption: `✅ Вы забрали выигрыш!\\n\\nКоэффициент: \$\{game\.currentMultiplier\.toFixed\(2\)\}x\\nВыигрыш: \$\{winAmount\} CRASH`/g,
    "caption: `Вы забрали выигрыш!\\n\\nКоэффициент: ${game.currentMultiplier.toFixed(2)}x\\nВыигрыш: ${winAmount} CRASH`"
);

fs.writeFileSync('server.ts', code);
