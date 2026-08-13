import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { Telegraf, Markup } from 'telegraf';
import fs from 'fs';

// Database setup
const DB_FILE = 'database.json';
let db: { users: Record<string, { balance: number, lastBonus: number }> } = { users: {} };

if (fs.existsSync(DB_FILE)) {
    try {
        db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    } catch (e) {
        console.error('Error loading db', e);
    }
}

function saveDb() {
    fs.writeFileSync(DB_FILE, JSON.stringify(db));
}

function getUser(id: number) {
    const idStr = id.toString();
    if (!db.users[idStr]) {
        db.users[idStr] = { balance: 0, lastBonus: 0 };
        saveDb();
    }
    return db.users[idStr];
}

const bot = new Telegraf('8936333009:AAG3aLkX_DQx21Bs_plmucmsvl81REbU_3k');

// Game state
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
}> = {};

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
            Markup.button.callback('Выдать себе 100000 CRASH', 'admin_add_balance')
        ])
    );
});

bot.action('admin_add_balance', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) {
        return ctx.answerCbQuery('Отказано в доступе', { show_alert: true });
    }
    
    const user = getUser(ctx.from.id);
    user.balance += 100000;
    saveDb();
    
    try { await ctx.answerCbQuery('Успешно'); } catch (e) {}
    await ctx.editMessageText(`Админ панель\nВаш баланс: ${user.balance} CRASH`, 
        Markup.inlineKeyboard([
            Markup.button.callback('Выдать себе 100000 CRASH', 'admin_add_balance')
        ])
    ).catch(() => {});
});

// Filter to only allow groups
bot.use((ctx, next) => {
    if (ctx.chat && (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup')) {
        return next();
    } else {
        if (ctx.message && (ctx.message as any).text && ((ctx.message as any).text.startsWith('краш') || (ctx.message as any).text.toLowerCase() === 'б')) {
            ctx.reply('❌ Этот бот работает только в групповых чатах.');
        }
    }
});

bot.hears(/^б$/i, (ctx) => {
    const user = getUser(ctx.from.id);
    const now = Date.now();
    const canClaimBonus = now - user.lastBonus >= 24 * 60 * 60 * 1000;
    
    let text = `Ваш баланс: ${user.balance} CRASH`;
    let markup = undefined;
    
    if (canClaimBonus) {
        markup = Markup.inlineKeyboard([
            Markup.button.callback('🎁 Бонус', 'claim_bonus')
        ]);
    }
    
    ctx.reply(text, markup);
});

bot.action('claim_bonus', async (ctx) => {
    const user = getUser(ctx.from.id);
    const now = Date.now();
    
    if (now - user.lastBonus >= 24 * 60 * 60 * 1000) {
        user.balance += 3000;
        user.lastBonus = now;
        saveDb();
        
        ctx.editMessageText(`Бонус успешно получен, ваш новый баланс: ${user.balance} CRASH`).catch(() => {});
        try { await ctx.answerCbQuery('Вы получили 3000 CRASH бонуса!'); } catch (e) {}
    } else {
        try { await ctx.answerCbQuery('Бонус пока недоступен.', { show_alert: true }); } catch (e) {}
        ctx.editMessageText(`Ваш баланс: ${user.balance} CRASH`).catch(() => {});
    }
});

bot.hears(/^п\s+(\d+)$/i, (ctx) => {
    const message = ctx.message;
    if (!message || !('reply_to_message' in message) || !message.reply_to_message) {
        return ctx.reply('⚠️ Команда работает только в ответ на сообщение игрока, которому вы хотите перевести средства.');
    }
    
    const amount = parseInt(ctx.match[1], 10);
    if (isNaN(amount) || amount <= 0) {
        return ctx.reply('⚠️ Сумма перевода должна быть больше нуля.');
    }
    
    const senderId = ctx.from.id;
    const receiver = message.reply_to_message.from;
    
    if (!receiver) return;
    
    const receiverId = receiver.id;
    
    if (senderId === receiverId) {
        return ctx.reply('Вы не можете перевести средства самому себе');
    }
    
    // Bots usually shouldn't receive funds (unless intended), but let's allow it or just ignore if it's the bot itself
    if (receiver.is_bot) {
        return ctx.reply('Вы не можете перевести средства боту');
    }
    
    const senderUser = getUser(senderId);
    
    if (senderUser.balance < amount) {
        return ctx.reply('❌ Недостаточно средств для перевода.');
    }
    
    const receiverUser = getUser(receiverId);
    
    senderUser.balance -= amount;
    receiverUser.balance += amount;
    saveDb();
    
    const senderName = ctx.from.first_name || 'Игрок';
    const receiverName = receiver.first_name || 'Игрок';
    
    return ctx.reply(`${senderName} перевел ${amount} CRASH для ${receiverName}`);
});

async function safeEditMessage(chatId: number, messageId: number, text: string, markup?: any) {
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
}

bot.hears(/^краш\s+(\d+)$/i, async (ctx) => {
    const hasActiveGame = Object.values(activeGames).some(g => g.userId === ctx.from.id && g.status === 'running');
    if (hasActiveGame) {
        return ctx.reply('Игра уже запущена');
    }

    const betStr = ctx.match[1];
    const bet = parseInt(betStr, 10);
    if (isNaN(bet) || bet <= 0) {
        return ctx.reply('⚠️ Ставка должна быть больше нуля.');
    }
    
    const user = getUser(ctx.from.id);
    if (user.balance < bet) {
        return ctx.reply('❌ Недостаточно средств на балансе.');
    }
    
    // Deduct bet
    user.balance -= bet;
    saveDb();
    
    // Calculate crash point
    let crashPoint = 1.00;
    
    const r = Math.random();
    
    // 8% chance of instant crash at 1.00x (полный провал сразу)
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
    }
    
    // Округляем до ближайшего шага в 0.20 (чтобы было визуально 1.00, 1.20, 1.40 и т.д.)
    crashPoint = Math.floor((crashPoint + 0.001) / 0.2) * 0.2;
    crashPoint = Math.round(crashPoint * 100) / 100;
    
    // Если меньше 1.20, то это моментальный краш на 1.00
    if (crashPoint < 1.20) {
        crashPoint = 1.00;
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
        // Ипользуем URL всегда, чтобы избежать бага с отправкой как документ и ускорить отправку
        let rocketSource = { url: 'https://media.tenor.com/2mC1qI3VwF8AAAAC/rocket-space.gif' };
        
        msg = await ctx.replyWithAnimation(rocketSource, {
            caption: `Коэффициент: 1.00x`,
            ...Markup.inlineKeyboard([
                Markup.button.callback('Забрать', `take_${gameId}`)
            ])
        });
    } catch (err) {
        console.error("Error sending animation", err);
        // Refund if error
        user.balance += bet;
        saveDb();
        delete activeGames[gameId];
        return ctx.reply('⚠️ Ошибка запуска игры. Убедитесь, что у бота есть права на отправку медиа.');
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
            await safeEditMessage(game.chatId, game.messageId, `💥 Краш на ${multiplier.toFixed(2)}x\nВы проиграли`);
        } else {
            const now = Date.now();
            if (!game.pauseVisualsUntil || now >= game.pauseVisualsUntil) {
                try {
                    await bot.telegram.editMessageCaption(game.chatId, game.messageId, undefined, `Коэффициент: ${multiplier.toFixed(2)}x`, 
                        Markup.inlineKeyboard([
                            Markup.button.callback('Забрать', `take_${gameId}`)
                        ])
                    );
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
        try { await ctx.answerCbQuery('💥 Ракета уже взорвалась! Вы не успели.', { show_alert: true }); } catch (e) {}
        return;
    }
    
    if (game.status !== 'running') {
        try { await ctx.answerCbQuery('Раунд уже закончен!'); } catch (e) {}
        return;
    }
    
    // Process win
    game.status = 'won';
    const winAmount = Math.floor(game.bet * game.currentMultiplier);
    
    const user = getUser(game.userId);
    user.balance += winAmount;
    saveDb();
    
    try { await ctx.answerCbQuery(`Вы забрали ${winAmount} CRASH!`); } catch (e) {}
    
    if (game.interval) {
        clearInterval(game.interval);
    }
    delete activeGames[gameId];

    await safeEditMessage(game.chatId, game.messageId, `✅ Вы забрали выигрыш!\n\nКоэффициент: ${game.currentMultiplier.toFixed(2)}x\nВыигрыш: ${winAmount} CRASH`);
});

// Applet / Server code
async function startServer() {
  const app = express();
  const PORT = 3000;

  // Simple ping endpoint
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
  bot.launch({ dropPendingUpdates: true }).then(() => {
      console.log('Telegram bot is running!');
  }).catch(err => {
      console.error('Failed to start telegram bot', err);
  });
}

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

startServer();
