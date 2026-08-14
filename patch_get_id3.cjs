const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const inject = `
app.get('/api/do-upload3', async (req, res) => {
    try {
        const { collection, getDocs, limit, query } = await import('firebase/firestore');
        const q = query(collection(firestore, 'users'), limit(1));
        const snap = await getDocs(q);
        const chatId = snap.docs[0].id;
        
        let m2 = await bot.telegram.sendAnimation(chatId, { source: 'win.gif' });
        let m3 = await bot.telegram.sendAnimation(chatId, { source: 'lose.gif' });
        res.json({ win: m2.document?.file_id || m2.animation?.file_id, lose: m3.document?.file_id || m3.animation?.file_id });
    } catch(e) {
        res.status(500).json({error: e.message});
    }
});
`;

code = code.replace('app.get("/api/health"', inject + '\n  app.get("/api/health"');
fs.writeFileSync('server.ts', code);
