const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Add fileIdCache at the top level
code = code.replace(
    "const activeGames: Record<string, Game> = {};",
    "const activeGames: Record<string, Game> = {};\nconst fileIdCache: Record<string, string> = {};"
);

// Patch fly.gif logic
code = code.replace(
    /let msg;\n\s*try \{\n\s*let rocketSource = fs\.existsSync\('fly\.gif'\) \? \{ source: 'fly\.gif' \} : \{ url: 'https:\/\/media\.giphy\.com\/media\/l41lZxzroU33typuU\/giphy\.gif' \};\n\s*msg = await ctx\.replyWithAnimation\(rocketSource, \{[\s\S]*?\}\);\n\s*\} catch \(err\) \{[\s\S]*?game\.isTextFallback = true;[\s\S]*?\}/,
    `let msg;
    try {
        let rocketSource = fileIdCache['fly'] || (fs.existsSync('fly.gif') ? { source: 'fly.gif' } : { url: 'https://media.giphy.com/media/l41lZxzroU33typuU/giphy.gif' });
        
        msg = await ctx.replyWithAnimation(rocketSource, {
            caption: \`Коэффициент: 1.00x\`,
            ...Markup.inlineKeyboard([
                Markup.button.callback('Забрать', \`take_\${gameId}\`)
            ])
        });
        
        if (!fileIdCache['fly'] && msg.animation && msg.animation.file_id) {
            fileIdCache['fly'] = msg.animation.file_id;
        }
    } catch (err: any) {
        let retryAfter = 0;
        if (err.response && err.response.error_code === 429) {
            retryAfter = err.response.parameters?.retry_after || 2;
        } else {
            console.error("Error sending animation", err.message || err);
        }
        game.isTextFallback = true;
        try {
            if (retryAfter > 0) {
                await new Promise(resolve => setTimeout(resolve, Math.min(retryAfter, 5) * 1000));
            }
            msg = await ctx.reply(\`Коэффициент: 1.00x\`, Markup.inlineKeyboard([
                Markup.button.callback('Забрать', \`take_\${gameId}\`)
            ]));
        } catch (e: any) {
            user.balance += bet;
            await saveUser(ctx.from.id, user);
            delete activeGames[gameId];
            return ctx.reply('Ошибка запуска игры').catch(() => {});
        }
    }`
);

// Patch lose.gif logic
code = code.replace(
    /try \{\n\s*let loseSource = fs\.existsSync\('lose\.gif'\) \? \{ source: 'lose\.gif' \} : \{ url: 'https:\/\/media\.giphy\.com\/media\/l41lZxzroU33typuU\/giphy\.gif' \};\n\s*if \(game\.isTextFallback\) \{\n\s*await bot\.telegram\.sendMessage\(game\.chatId, `Краш на \$\{multiplier\.toFixed\(2\)\}x\\nВы проиграли`\);\n\s*\} else \{\n\s*await bot\.telegram\.sendAnimation\(game\.chatId, loseSource, \{ caption: `Краш на \$\{multiplier\.toFixed\(2\)\}x\\nВы проиграли` \}\);\n\s*\}\n\s*\} catch \(e\) \{/,
    `try {
                let loseSource = fileIdCache['lose'] || (fs.existsSync('lose.gif') ? { source: 'lose.gif' } : { url: 'https://media.giphy.com/media/l41lZxzroU33typuU/giphy.gif' });
                if (game.isTextFallback) {
                    await bot.telegram.sendMessage(game.chatId, \`Краш на \${multiplier.toFixed(2)}x\\nВы проиграли\`);
                } else {
                    const loseMsg = await bot.telegram.sendAnimation(game.chatId, loseSource, { caption: \`Краш на \${multiplier.toFixed(2)}x\\nВы проиграли\` });
                    if (!fileIdCache['lose'] && loseMsg.animation && loseMsg.animation.file_id) {
                        fileIdCache['lose'] = loseMsg.animation.file_id;
                    }
                }
            } catch (e) {`
);

// Patch win.gif logic
code = code.replace(
    /try \{\n\s*let winSource = fs\.existsSync\('win\.gif'\) \? \{ source: 'win\.gif' \} : \{ url: 'https:\/\/media\.giphy\.com\/media\/l41lZxzroU33typuU\/giphy\.gif' \};\n\s*if \(game\.isTextFallback\) \{\n\s*await bot\.telegram\.sendMessage\(game\.chatId, `Вы забрали выигрыш!\\n\\nКоэффициент: \$\{game\.currentMultiplier\.toFixed\(2\)\}x\\nВыигрыш: \$\{winAmount\} CRASH`\);\n\s*\} else \{\n\s*await bot\.telegram\.sendAnimation\(game\.chatId, winSource, \{\n\s*caption: `Вы забрали выигрыш!\\n\\nКоэффициент: \$\{game\.currentMultiplier\.toFixed\(2\)\}x\\nВыигрыш: \$\{winAmount\} CRASH`\n\s*\}\);\n\s*\}/,
    `try {
        let winSource = fileIdCache['win'] || (fs.existsSync('win.gif') ? { source: 'win.gif' } : { url: 'https://media.giphy.com/media/l41lZxzroU33typuU/giphy.gif' });
        if (game.isTextFallback) {
            await bot.telegram.sendMessage(game.chatId, \`Вы забрали выигрыш!\\n\\nКоэффициент: \${game.currentMultiplier.toFixed(2)}x\\nВыигрыш: \${winAmount} CRASH\`);
        } else {
            const winMsg = await bot.telegram.sendAnimation(game.chatId, winSource, {
                caption: \`Вы забрали выигрыш!\\n\\nКоэффициент: \${game.currentMultiplier.toFixed(2)}x\\nВыигрыш: \${winAmount} CRASH\`
            });
            if (!fileIdCache['win'] && winMsg.animation && winMsg.animation.file_id) {
                fileIdCache['win'] = winMsg.animation.file_id;
            }
        }`
);

fs.writeFileSync('server.ts', code);
