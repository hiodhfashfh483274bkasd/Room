const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Find the start of the bad block and the end
const startStr = "    let msg;\n    try {\n        let rocketSource = fileIdCache['fly']";
const endStr = "    game.messageId = msg.message_id;";

const startIndex = code.indexOf(startStr);
const endIndex = code.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
    const goodBlock = `    let msg;
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
    }
    
`;
    
    code = code.slice(0, startIndex) + goodBlock + code.slice(endIndex);
    fs.writeFileSync('server.ts', code);
} else {
    console.log("Could not find start or end index!");
}
