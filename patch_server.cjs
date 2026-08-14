const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Patch 1: Replace telegram 429 logs in crash command
const oldCatch = `console.error("Error sending animation, falling back to text", err);
        game.isTextFallback = true;
        try {
            msg = await ctx.reply(\`🚀 Полет начался!\\nКоэффициент: 1.00x\`, Markup.inlineKeyboard([
                Markup.button.callback('Забрать', \`take_\${gameId}\`)
            ]));
        } catch (e) {
            user.balance += bet;
            await saveUser(ctx.from.id, user);
            delete activeGames[gameId];
            return ctx.reply('Ошибка запуска игры. Убедитесь, что у бота есть права');
        }`;

const newCatch = `let retryAfter = 2;
        if (err.response && err.response.error_code === 429) {
            retryAfter = err.response.parameters?.retry_after || 2;
        } else {
            console.error("Error sending animation", err.message || err);
        }
        game.isTextFallback = true;
        try {
            await new Promise(resolve => setTimeout(resolve, Math.min(retryAfter, 5) * 1000));
            msg = await ctx.reply(\`🚀 Полет начался!\\nКоэффициент: 1.00x\`, Markup.inlineKeyboard([
                Markup.button.callback('Забрать', \`take_\${gameId}\`)
            ]));
        } catch (e: any) {
            user.balance += bet;
            await saveUser(ctx.from.id, user);
            delete activeGames[gameId];
            return ctx.reply('Ошибка запуска игры').catch(() => {});
        }`;

code = code.replace(oldCatch, newCatch);

// Patch 2: Add retry to getUser and saveUser for "client is offline"
const oldDbRegex = /async function getUser\(id: number\) \{[\s\S]*?async function saveUser\(id: number, userData: \{ balance: number, lastBonus: number \}?\) \{[\s\S]*?\}/;
const newDb = `async function getUser(id: number, retries = 3): Promise<{balance: number, lastBonus: number}> {
    const idStr = id.toString();
    const docRef = doc(firestore, 'users', idStr);
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data() as { balance: number, lastBonus: number };
        } else {
            const newUser = { balance: 0, lastBonus: 0 };
            await setDoc(docRef, newUser);
            return newUser;
        }
    } catch (e: any) {
        if (retries > 0) {
            await new Promise(r => setTimeout(r, 1000));
            return getUser(id, retries - 1);
        }
        throw e;
    }
}

async function saveUser(id: number, userData: { balance: number, lastBonus: number }, retries = 3): Promise<void> {
    const idStr = id.toString();
    const docRef = doc(firestore, 'users', idStr);
    try {
        await setDoc(docRef, userData);
    } catch (e: any) {
        if (retries > 0) {
            await new Promise(r => setTimeout(r, 1000));
            return saveUser(id, userData, retries - 1);
        }
        throw e;
    }
}`;

code = code.replace(oldDbRegex, newDb);

fs.writeFileSync('server.ts', code);
