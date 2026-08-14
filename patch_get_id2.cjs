const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const inject = `
app.get('/api/do-upload2', async (req, res) => {
    try {
        const { collection, getDocs, limit, query } = await import('firebase/firestore');
        const q = query(collection(firestore, 'users'), limit(1));
        const snap = await getDocs(q);
        const chatId = snap.docs[0].id;
        
        let m1 = await bot.telegram.sendAnimation(chatId, { source: 'fly.gif' });
        res.json({ m1 });
    } catch(e) {
        res.status(500).json({error: e.message});
    }
});
`;

code = code.replace('app.get("/api/health"', inject + '\n  app.get("/api/health"');
fs.writeFileSync('server.ts', code);
