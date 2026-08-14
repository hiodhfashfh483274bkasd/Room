const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Remove the one at the bottom
code = code.replace(/app\.get\('\/api\/test-upload'[\s\S]*?res\.status\(500\)\.json\(\{error: e\.message\}\);\n\s*\}\n\}\);\n/g, '');

// Insert it at the top
const topInject = `
app.get('/api/test-upload', async (req, res) => {
    try {
        let errs = [];
        let source = { source: 'fly.gif' };
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
`;

code = code.replace('app.get("/api/health"', topInject + '\n  app.get("/api/health"');
fs.writeFileSync('server.ts', code);
