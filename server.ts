import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { Telegraf, Markup } from 'telegraf';
import fs from 'fs';

// Firebase DB setup
const configStr = fs.readFileSync('firebase-applet-config.json', 'utf-8');
const firebaseConfig = JSON.parse(configStr);
const firebaseApp = initializeApp(firebaseConfig);
const firestore = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

async function getUser(id: number, retries = 3): Promise<{balance: number, lastBonus: number}> {
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
}

const bot = new Telegraf('8496440044:AAEd9wOt-hXvYfSw5OKlmPWqfnq-HMZ0rf4');

// Game state
const fileIdCache: Record<string, string> = {};
const activeGames: Record<string, {
    userId: number;
    bet: number;
    currentMultiplier: number;
    crashPoint: number;
    status: 'running' | 'crashed' | 'won';
    chatId: number;
    messageId?: number;
    interval?: NodeJS.Timeout;
    pauseVisualsUntil?: number;
    isTextFallback?: boolean;
}> = {};


bot.command('upload_gifs', async (ctx) => {
    try {
        await ctx.reply("Загружаю polet.gif...");
        const m1 = await ctx.replyWithAnimation({ source: 'polet.gif' });
        await ctx.reply("polet.gif ID: " + m1.animation.file_id);
        
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


bot.start((ctx) => {
    if (ctx.chat.type === 'private') {
        const botUsername = ctx.botInfo.username;
        return ctx.reply(
            'Привет, чтобы начать тебе нужно добавить меня в группу и выдать мне права администратора',
            Markup.inlineKeyboard([
                Markup.button.url('Добавить в группу', `https://t.me/${botUsername}?startgroup=true`)
            ])
        );
    }
});

const ADMIN_ID = 8981281839;

bot.command('admin', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) {
        return;
    }
    
    ctx.reply(
        'Админ панель',
        Markup.inlineKeyboard([
            Markup.button.callback('Выдать себе 9999999999 CRASH', 'admin_add_balance')
        ])
    );
});

bot.action('admin_add_balance', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) {
        return ctx.answerCbQuery('Отказано в доступе', { show_alert: true });
    }
    
    const user = await getUser(ctx.from.id);
    user.balance += 9999999999;
    await saveUser(ctx.from.id, user);
    
    try { await ctx.answerCbQuery('Успешно'); } catch (e) {}
    await ctx.editMessageText(`Админ панель\nВаш банк: ${user.balance} CRASH`, 
        Markup.inlineKeyboard([
            Markup.button.callback('Выдать себе 9999999999 CRASH', 'admin_add_balance')
        ])
    ).catch(() => {});
});

// Filter to only allow groups
bot.use((ctx, next) => {
    if (ctx.chat && (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup')) {
        return next();
    } else {
        if (ctx.message && (ctx.message as any).text && ((ctx.message as any).text.startsWith('краш') || (ctx.message as any).text.toLowerCase() === 'банк' || (ctx.message as any).text.toLowerCase().startsWith('дать'))) {
            ctx.reply('Этот бот работает только в групповых чатах');
        }
    }
});

bot.hears(/^банк$/i, async (ctx) => {
    const user = await getUser(ctx.from.id);
    const now = Date.now();
    const canClaimBonus = now - user.lastBonus >= 24 * 60 * 60 * 1000;
    
    let text = `Ваш банк: ${user.balance} CRASH`;
    let markup = undefined;
    
    if (canClaimBonus) {
        markup = Markup.inlineKeyboard([
            Markup.button.callback('🎁 Бонус', 'claim_bonus')
        ]);
    }
    
    ctx.reply(text, markup);
});

bot.action('claim_bonus', async (ctx) => {
    const user = await getUser(ctx.from.id);
    const now = Date.now();
    
    if (now - user.lastBonus >= 24 * 60 * 60 * 1000) {
        user.balance += 3000;
        user.lastBonus = now;
        await saveUser(ctx.from.id, user);
        
        ctx.editMessageText(`Бонус успешно получен, ваш новый банк: ${user.balance} CRASH`).catch(() => {});
        try { await ctx.answerCbQuery('Вы получили 3000 CRASH бонуса!'); } catch (e) {}
    } else {
        try { await ctx.answerCbQuery('Бонус пока недоступен.', { show_alert: true }); } catch (e) {}
        ctx.editMessageText(`Ваш банк: ${user.balance} CRASH`).catch(() => {});
    }
});

bot.hears(/^дать\s+(\d+)$/i, async (ctx) => {
    const message = ctx.message;
    if (!message || !('reply_to_message' in message) || !message.reply_to_message) {
        return ctx.reply('Команда работает только в ответ на сообщение игрока, которому вы хотите дать средства');
    }
    
    const amount = parseInt(ctx.match[1], 10);
    if (isNaN(amount) || amount <= 0) {
        return ctx.reply('Сумма перевода должна быть больше нуля');
    }
    
    const senderId = ctx.from.id;
    const receiver = message.reply_to_message.from;
    
    if (!receiver) return;
    
    const receiverId = receiver.id;
    
    if (senderId === receiverId) {
        return ctx.reply('Вы не можете дать средства самому себе');
    }
    
    // Bots usually shouldn't receive funds (unless intended), but let's allow it or just ignore if it's the bot itself
    if (receiver.is_bot) {
        return ctx.reply('Вы не можете дать средства боту');
    }
    
    const senderUser = await getUser(senderId);
    
    if (senderUser.balance < amount) {
        return ctx.reply('Недостаточно средств для перевода');
    }
    
    const receiverUser = await getUser(receiverId);
    
    senderUser.balance -= amount;
    receiverUser.balance += amount;
    await saveUser(senderId, senderUser);
    await saveUser(receiverId, receiverUser);
    
    const senderName = ctx.from.first_name || 'Игрок';
    const receiverName = receiver.first_name || 'Игрок';
    
    return ctx.reply(`${senderName} перевел ${amount} CRASH для ${receiverName}`);
});

async function safeEditMessage(chatId: number, messageId: number, text: string, markup?: any, isTextFallback?: boolean) {
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
}

bot.hears(/^краш\s+(\d+)$/i, async (ctx) => {
    const hasActiveGame = Object.values(activeGames).some(g => g.userId === ctx.from.id && g.status === 'running');
    if (hasActiveGame) {
        return ctx.reply('Игра уже запущена');
    }

    const betStr = ctx.match[1];
    const bet = parseInt(betStr, 10);
    if (isNaN(bet) || bet <= 0) {
        return ctx.reply('Ставка должна быть больше нуля');
    }
    
    const user = await getUser(ctx.from.id);
    if (user.balance < bet) {
        return ctx.reply('Недостаточно средств на балансе');
    }
    
    // Deduct bet
    user.balance -= bet;
    await saveUser(ctx.from.id, user);
    
    // Calculate crash point
    let crashPoint = 1.00;
    
    const r = Math.random();
    
    // 10% chance of instant crash at 1.00x
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
    }
    
    // Округляем до ближайшего шага в 0.20 (чтобы было визуально 1.00, 1.20, 1.40 и т.д.)
    crashPoint = Math.floor((crashPoint + 0.001) / 0.2) * 0.2;
    crashPoint = Math.round(crashPoint * 100) / 100;
    
    // Переносим краши 1.20 на 1.40, чтобы не было "обидного" краша, 
    // и чтобы 1.00 не выпадал слишком часто.
    if (crashPoint === 1.20) {
        crashPoint = 1.40;
    }
    
    // Жесткий лимит на 10x
    if (crashPoint > 10.0) {
        crashPoint = 10.0;
    }
    
    const gameId = Date.now().toString() + '_' + ctx.from.id;
    
    const game: typeof activeGames[string] = {
        userId: ctx.from.id,
        bet,
        currentMultiplier: 1.0,
        crashPoint,
        status: 'running',
        chatId: ctx.chat.id,
        messageId: 0,
        interval: undefined
    };
    
    activeGames[gameId] = game;
    
    let msg;
    try {
        let rocketSource = fileIdCache['polet'] || (fs.existsSync('polet.gif') ? { source: 'polet.gif' } : { url: 'https://media.giphy.com/media/l41lZxzroU33typuU/giphy.gif' });
        
        msg = await ctx.replyWithAnimation(rocketSource, {
            caption: `Коэффициент: 1.00x`,
            ...Markup.inlineKeyboard([
                Markup.button.callback('Забрать', `take_${gameId}`)
            ])
        });
        
        fs.appendFileSync('msg_dump.log', JSON.stringify(msg, null, 2) + "\n"); const fileId = msg.animation?.file_id || msg.document?.file_id;
        if (!fileIdCache['polet'] && fileId) {
            fileIdCache['polet'] = fileId;
        }
    } catch (err: any) {
        let retryAfter = 0;
        if (err.response && err.response.error_code === 429) {
            retryAfter = err.response.parameters?.retry_after || 2;
        } else {
            console.error("Error sending animation", err.message || err); fs.appendFileSync('bot_errors.log', new Date().toISOString() + " - " + (err.message || err) + "\n");
        }
        game.isTextFallback = true;
        try {
            if (retryAfter > 0) {
                await new Promise(resolve => setTimeout(resolve, Math.min(retryAfter, 5) * 1000));
            }
            msg = await ctx.reply(`Коэффициент: 1.00x`, Markup.inlineKeyboard([
                Markup.button.callback('Забрать', `take_${gameId}`)
            ]));
        } catch (e: any) {
            user.balance += bet;
            await saveUser(ctx.from.id, user);
            delete activeGames[gameId];
            return ctx.reply('Ошибка запуска игры').catch(() => {});
        }
    }
    
    game.messageId = msg.message_id;
    game.pauseVisualsUntil = 0;
    
    const interval = setInterval(async () => {
        if (!activeGames[gameId] || activeGames[gameId].status !== 'running') {
            clearInterval(interval);
            return;
        }
        
        let multiplier = game.currentMultiplier;
        
        multiplier += 0.20;
        multiplier = Math.round(multiplier * 100) / 100;
        
        if (multiplier >= crashPoint) {
            multiplier = crashPoint;
            game.status = 'crashed';
        }
        
        game.currentMultiplier = multiplier;
        
        if (game.status === 'crashed') {
            clearInterval(interval);
            // Leave game in memory for a few seconds so late clicks get a clear alert
            setTimeout(() => { delete activeGames[gameId]; }, 10000);
            try {
                await bot.telegram.deleteMessage(game.chatId, game.messageId!);
            } catch (e) {}
            
            try {
                let loseSource = fileIdCache['lose'] || (fs.existsSync('lose.gif') ? { source: 'lose.gif' } : { url: 'https://media.giphy.com/media/l41lZxzroU33typuU/giphy.gif' });
                if (game.isTextFallback) {
                    await bot.telegram.sendMessage(game.chatId, `Краш на ${multiplier.toFixed(2)}x\nВы проиграли`);
                } else {
                    const loseMsg = await bot.telegram.sendAnimation(game.chatId, loseSource, { caption: `Краш на ${multiplier.toFixed(2)}x\nВы проиграли` });
                    const loseFileId = loseMsg.animation?.file_id || loseMsg.document?.file_id;
                    if (!fileIdCache['lose'] && loseFileId) {
                        fileIdCache['lose'] = loseFileId;
                    }
                }
            } catch (e) {
                await bot.telegram.sendMessage(game.chatId, `Краш на ${multiplier.toFixed(2)}x\nВы проиграли`).catch(() => {});
            }
        } else {
            const now = Date.now();
            if (!game.pauseVisualsUntil || now >= game.pauseVisualsUntil) {
                try {
                    if (game.isTextFallback) {
                        await bot.telegram.editMessageText(game.chatId, game.messageId, undefined, `Коэффициент: ${multiplier.toFixed(2)}x`, 
                            Markup.inlineKeyboard([
                                Markup.button.callback('Забрать', `take_${gameId}`)
                            ])
                        );
                    } else {
                        await bot.telegram.editMessageCaption(game.chatId, game.messageId, undefined, `Коэффициент: ${multiplier.toFixed(2)}x`, 
                            Markup.inlineKeyboard([
                                Markup.button.callback('Забрать', `take_${gameId}`)
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
        }
    }, 3000);
    
    game.interval = interval;
});

bot.action(/take_(.+)/, async (ctx) => {
    const gameId = ctx.match[1];
    const game = activeGames[gameId];
    
    if (!game) {
        try { await ctx.answerCbQuery('Раунд уже закончен!', { show_alert: true }); } catch (e) {}
        return;
    }
    
    if (game.userId !== ctx.from.id) {
        try { await ctx.answerCbQuery('Это не ваша ставка!', { show_alert: true }); } catch (e) {}
        return;
    }
    
    if (game.status === 'crashed') {
        try { await ctx.answerCbQuery('Ракета уже взорвалась! Вы не успели', { show_alert: true }); } catch (e) {}
        return;
    }
    
    if (game.status !== 'running') {
        try { await ctx.answerCbQuery('Раунд уже закончен!'); } catch (e) {}
        return;
    }
    
    // Process win
    game.status = 'won';
    const winAmount = Math.floor(game.bet * game.currentMultiplier);
    
    const user = await getUser(game.userId);
    user.balance += winAmount;
    await saveUser(game.userId, user);
    
    try { await ctx.answerCbQuery(`Вы забрали ${winAmount} CRASH!`); } catch (e) {}
    
    if (game.interval) {
        clearInterval(game.interval);
    }
    delete activeGames[gameId];

    try {
        await bot.telegram.deleteMessage(game.chatId, game.messageId!);
    } catch (e) {}

    try {
        let winSource = fileIdCache['win'] || (fs.existsSync('win.gif') ? { source: 'win.gif' } : { url: 'https://media.giphy.com/media/l41lZxzroU33typuU/giphy.gif' });
        if (game.isTextFallback) {
            await bot.telegram.sendMessage(game.chatId, `Вы забрали выигрыш!\n\nКоэффициент: ${game.currentMultiplier.toFixed(2)}x\nВыигрыш: ${winAmount} CRASH`);
        } else {
            const winMsg = await bot.telegram.sendAnimation(game.chatId, winSource, {
                caption: `Вы забрали выигрыш!\n\nКоэффициент: ${game.currentMultiplier.toFixed(2)}x\nВыигрыш: ${winAmount} CRASH`
            });
            const winFileId = winMsg.animation?.file_id || winMsg.document?.file_id;
            if (!fileIdCache['win'] && winFileId) {
                fileIdCache['win'] = winFileId;
            }
        }
    } catch(e) {
        await bot.telegram.sendMessage(game.chatId, `Вы забрали выигрыш!\n\nКоэффициент: ${game.currentMultiplier.toFixed(2)}x\nВыигрыш: ${winAmount} CRASH`).catch(() => {});
    }
});

// Applet / Server code
async function startServer() {
  const app = express();
  const PORT = 3000;

  // Simple ping endpoint
  
app.get('/api/test-upload', async (req, res) => {
    try {
        let errs = [];
        let source = { source: 'polet.gif' };
        try {
            await bot.telegram.sendAnimation('123456789', source);
        } catch (e) {
            errs.push(e.message);
        }
        res.json({ errors: errs });
    } catch(e) {
        res.status(500).json({error: e.message});
    }
});

  

  

  

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
  
  // Start bot
  // bot.launch({ dropPendingUpdates: true }).then(() => {
  //     console.log('Telegram bot is running!');
  // }).catch(err => {
  //     console.error('Failed to start telegram bot', err);
  // });
}

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

startServer();
