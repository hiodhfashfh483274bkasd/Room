const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// 1. Update activeGames type
code = code.replace(
    'pauseVisualsUntil?: number;',
    'pauseVisualsUntil?: number;\n    isTextFallback?: boolean;'
);

// 2. Update math
const oldMath = `    // 8% chance of instant crash at 1.00x (полный провал сразу)
    if (r < 0.08) {
        crashPoint = 1.00;
    } 
    // 27% chance of low crash (от 1.01 до 1.60)
    else if (r < 0.35) {
        crashPoint = 1.01 + (Math.random() * 0.59);
    } 
    // 35% chance of medium crash (от 1.60 до 3.00)
    else if (r < 0.70) {
        crashPoint = 1.60 + (Math.random() * 1.40);
    }
    // 20% chance of medium-high crash (от 3.00 до 6.00)
    else if (r < 0.90) {
        crashPoint = 3.00 + (Math.random() * 3.00);
    }
    // 10% chance of high crash (от 6.00 до 10.00)
    else {
        crashPoint = 6.00 + (Math.random() * 4.00);
    }`;

const newMath = `    // 10% chance of instant crash at 1.00x
    if (r < 0.10) {
        crashPoint = 1.00;
    } 
    // 45% chance of low crash (1.01 - 1.99)
    else if (r < 0.55) {
        crashPoint = 1.01 + (Math.random() * 0.99);
    } 
    // 25% chance of medium crash (2.00 - 3.99)
    else if (r < 0.80) {
        crashPoint = 2.00 + (Math.random() * 1.99);
    }
    // 12% chance of medium-high crash (4.00 - 6.99)
    else if (r < 0.92) {
        crashPoint = 4.00 + (Math.random() * 2.99);
    }
    // 8% chance of high crash (7.00 - 10.00)
    else {
        crashPoint = 7.00 + (Math.random() * 3.00);
    }`;
code = code.replace(oldMath, newMath);

// 3. Update safeEditMessage signature and logic
const oldSafeEdit = `async function safeEditMessage(chatId: number, messageId: number, text: string, markup?: any) {
    try {
        await bot.telegram.editMessageCaption(chatId, messageId, undefined, text, markup);
    } catch (err: any) {
        if (err.response && err.response.error_code === 429) {
            // Telegram blocked further edits for this message due to rate limits.
            // Instantly send a reply instead of hanging for 30 seconds.
            try {
                await bot.telegram.sendMessage(chatId, text, { 
                    reply_parameters: { message_id: messageId }
                });
            } catch (e) {}
        }
    }
}`;

const newSafeEdit = `async function safeEditMessage(chatId: number, messageId: number, text: string, markup?: any, isTextFallback?: boolean) {
    try {
        if (isTextFallback) {
            await bot.telegram.editMessageText(chatId, messageId, undefined, text, markup);
        } else {
            await bot.telegram.editMessageCaption(chatId, messageId, undefined, text, markup);
        }
    } catch (err: any) {
        if (err.response && err.response.error_code === 429) {
            try {
                await bot.telegram.sendMessage(chatId, text, { 
                    reply_parameters: { message_id: messageId }
                });
            } catch (e) {}
        }
    }
}`;
code = code.replace(oldSafeEdit, newSafeEdit);

// 4. Update the game fallback and game interval logic
const oldFallback = `    let msg;
    try {
        let rocketSource = fs.existsSync('rocket.gif') ? { source: 'rocket.gif' } : { url: 'https://media.giphy.com/media/l41lZxzroU33typuU/giphy.gif' };
        
        msg = await ctx.replyWithAnimation(rocketSource, {
            caption: \`Коэффициент: 1.00x\`,
            ...Markup.inlineKeyboard([
                Markup.button.callback('Забрать', \`take_\${gameId}\`)
            ])
        });
    } catch (err) {
        console.error("Error sending animation", err);
        // Refund if error
        user.balance += bet;
        saveDb();
        delete activeGames[gameId];
        return ctx.reply('⚠️ Ошибка запуска игры. Убедитесь, что у бота есть права на отправку медиа.');
    }`;

const newFallback = `    let msg;
    try {
        let rocketSource = fs.existsSync('rocket.gif') ? { source: 'rocket.gif' } : { url: 'https://media.giphy.com/media/l41lZxzroU33typuU/giphy.gif' };
        
        msg = await ctx.replyWithAnimation(rocketSource, {
            caption: \`Коэффициент: 1.00x\`,
            ...Markup.inlineKeyboard([
                Markup.button.callback('Забрать', \`take_\${gameId}\`)
            ])
        });
    } catch (err) {
        console.error("Error sending animation, falling back to text", err);
        game.isTextFallback = true;
        try {
            msg = await ctx.reply(\`🚀 Полет начался!\\nКоэффициент: 1.00x\`, Markup.inlineKeyboard([
                Markup.button.callback('Забрать', \`take_\${gameId}\`)
            ]));
        } catch (e) {
            user.balance += bet;
            saveDb();
            delete activeGames[gameId];
            return ctx.reply('⚠️ Ошибка запуска игры. Убедитесь, что у бота есть права.');
        }
    }`;
code = code.replace(oldFallback, newFallback);

// 5. Update interval logic
const oldInterval = `        if (game.status === 'crashed') {
            clearInterval(interval);
            // Leave game in memory for a few seconds so late clicks get a clear alert
            setTimeout(() => { delete activeGames[gameId]; }, 10000);
            await safeEditMessage(game.chatId, game.messageId, \`💥 Краш на \${multiplier.toFixed(2)}x\\nВы проиграли\`);
        } else {
            const now = Date.now();
            if (!game.pauseVisualsUntil || now >= game.pauseVisualsUntil) {
                try {
                    await bot.telegram.editMessageCaption(game.chatId, game.messageId, undefined, \`Коэффициент: \${multiplier.toFixed(2)}x\`, 
                        Markup.inlineKeyboard([
                            Markup.button.callback('Забрать', \`take_\${gameId}\`)
                        ])
                    );
                } catch (e: any) {
                    if (e.response && e.response.error_code === 429) {
                        const retryAfter = e.response.parameters?.retry_after || 2;
                        game.pauseVisualsUntil = Date.now() + (retryAfter * 1000);
                    }
                }
            }
        }`;

const newInterval = `        if (game.status === 'crashed') {
            clearInterval(interval);
            // Leave game in memory for a few seconds so late clicks get a clear alert
            setTimeout(() => { delete activeGames[gameId]; }, 10000);
            await safeEditMessage(game.chatId, game.messageId, \`💥 Краш на \${multiplier.toFixed(2)}x\\nВы проиграли\`, undefined, game.isTextFallback);
        } else {
            const now = Date.now();
            if (!game.pauseVisualsUntil || now >= game.pauseVisualsUntil) {
                try {
                    if (game.isTextFallback) {
                        await bot.telegram.editMessageText(game.chatId, game.messageId, undefined, \`🚀 Полет продолжается!\\nКоэффициент: \${multiplier.toFixed(2)}x\`, 
                            Markup.inlineKeyboard([
                                Markup.button.callback('Забрать', \`take_\${gameId}\`)
                            ])
                        );
                    } else {
                        await bot.telegram.editMessageCaption(game.chatId, game.messageId, undefined, \`Коэффициент: \${multiplier.toFixed(2)}x\`, 
                            Markup.inlineKeyboard([
                                Markup.button.callback('Забрать', \`take_\${gameId}\`)
                            ])
                        );
                    }
                } catch (e: any) {
                    if (e.response && e.response.error_code === 429) {
                        const retryAfter = e.response.parameters?.retry_after || 2;
                        game.pauseVisualsUntil = Date.now() + (retryAfter * 1000);
                    }
                }
            }
        }`;
code = code.replace(oldInterval, newInterval);

// 6. Fix `take` safeEditMessage
code = code.replace(
    'await safeEditMessage(game.chatId, game.messageId, `✅ Вы забрали выигрыш!\\n\\nКоэффициент: ${game.currentMultiplier.toFixed(2)}x\\nВыигрыш: ${winAmount} CRASH`);',
    'await safeEditMessage(game.chatId, game.messageId, `✅ Вы забрали выигрыш!\\n\\nКоэффициент: ${game.currentMultiplier.toFixed(2)}x\\nВыигрыш: ${winAmount} CRASH`, undefined, game.isTextFallback);'
);

fs.writeFileSync('server.ts', code);
