const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const inject = `
app.get('/api/do-upload', async (req, res) => {
    try {
        const { collection, getDocs, limit, query } = await import('firebase/firestore');
        const q = query(collection(firestore, 'users'), limit(1));
        const snap = await getDocs(q);
        if (snap.empty) {
            return res.json({ error: "no users" });
        }
        const chatId = snap.docs[0].id;
        
        let ids = {};
        
        const m1 = await bot.telegram.sendAnimation(chatId, { source: 'fly.gif' });
        ids.fly = m1.animation.file_id;
        
        const m2 = await bot.telegram.sendAnimation(chatId, { source: 'win.gif' });
        ids.win = m2.animation.file_id;
        
        const m3 = await bot.telegram.sendAnimation(chatId, { source: 'lose.gif' });
        ids.lose = m3.animation.file_id;
        
        res.json({ ids });
    } catch(e) {
        res.status(500).json({error: e.message});
    }
});
`;

code = code.replace('app.get("/api/health"', inject + '\n  app.get("/api/health"');
fs.writeFileSync('server.ts', code);
