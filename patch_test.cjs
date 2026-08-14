const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const inject = `
app.get('/api/test-upload', async (req, res) => {
    try {
        let errs = [];
        let source = { source: 'fly.gif' };
        try {
            // we don't have a chat id, so we just send to a dummy and catch the specific error
            await bot.telegram.sendAnimation('123456789', source);
        } catch (e) {
            errs.push(e.message);
        }
        res.json({ errors: errs });
    } catch(e) {
        res.status(500).json({error: e.message});
    }
});
`;

code = code.replace("app.listen(PORT", inject + "\n  app.listen(PORT");
fs.writeFileSync('server.ts', code);
