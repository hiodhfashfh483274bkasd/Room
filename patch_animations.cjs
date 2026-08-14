const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// 1. Replace rocketSource initialization
const oldRocketSource = "let rocketSource = fs.existsSync('rocket.gif') ? { source: 'rocket.gif' } : { url: 'https://media.giphy.com/media/l41lZxzroU33typuU/giphy.gif' };";
const newRocketSource = "let rocketSource = fs.existsSync('fly.gif') ? { source: 'fly.gif' } : { url: 'https://media.giphy.com/media/l41lZxzroU33typuU/giphy.gif' };";
code = code.replace(oldRocketSource, newRocketSource);

// 2. Replace crash logic
const oldCrashLogic = "await safeEditMessage(game.chatId, game.messageId, `💥 Краш на ${multiplier.toFixed(2)}x\\nВы проиграли`, undefined, game.isTextFallback);";
const newCrashLogic = `try {
                await bot.telegram.deleteMessage(game.chatId, game.messageId!);
            } catch (e) {}
            
            try {
                let loseSource = fs.existsSync('lose.gif') ? { source: 'lose.gif' } : { url: 'https://media.giphy.com/media/l41lZxzroU33typuU/giphy.gif' };
                if (game.isTextFallback) {
                    await bot.telegram.sendMessage(game.chatId, \`💥 Краш на \${multiplier.toFixed(2)}x\\nВы проиграли\`);
                } else {
                    await bot.telegram.sendAnimation(game.chatId, loseSource, { caption: \`💥 Краш на \${multiplier.toFixed(2)}x\\nВы проиграли\` });
                }
            } catch (e) {
                await bot.telegram.sendMessage(game.chatId, \`💥 Краш на \${multiplier.toFixed(2)}x\\nВы проиграли\`).catch(() => {});
            }`;
code = code.replace(oldCrashLogic, newCrashLogic);

// 3. Replace take logic
const oldTakeLogic = "await safeEditMessage(game.chatId, game.messageId, `✅ Вы забрали выигрыш!\\n\\nКоэффициент: ${game.currentMultiplier.toFixed(2)}x\\nВыигрыш: ${winAmount} CRASH`, undefined, game.isTextFallback);";
const newTakeLogic = `try {
        await bot.telegram.deleteMessage(game.chatId, game.messageId!);
    } catch (e) {}

    try {
        let winSource = fs.existsSync('win.gif') ? { source: 'win.gif' } : { url: 'https://media.giphy.com/media/l41lZxzroU33typuU/giphy.gif' };
        if (game.isTextFallback) {
            await bot.telegram.sendMessage(game.chatId, \`✅ Вы забрали выигрыш!\\n\\nКоэффициент: \${game.currentMultiplier.toFixed(2)}x\\nВыигрыш: \${winAmount} CRASH\`);
        } else {
            await bot.telegram.sendAnimation(game.chatId, winSource, {
                caption: \`✅ Вы забрали выигрыш!\\n\\nКоэффициент: \${game.currentMultiplier.toFixed(2)}x\\nВыигрыш: \${winAmount} CRASH\`
            });
        }
    } catch(e) {
        await bot.telegram.sendMessage(game.chatId, \`✅ Вы забрали выигрыш!\\n\\nКоэффициент: \${game.currentMultiplier.toFixed(2)}x\\nВыигрыш: \${winAmount} CRASH\`).catch(() => {});
    }`;
code = code.replace(oldTakeLogic, newTakeLogic);

fs.writeFileSync('server.ts', code);
