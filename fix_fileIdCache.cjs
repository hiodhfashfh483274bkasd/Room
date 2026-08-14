const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

if (!code.includes('const fileIdCache')) {
    code = code.replace(
        "const activeGames: Record<string, {",
        "const fileIdCache: Record<string, string> = {};\nconst activeGames: Record<string, {"
    );
    fs.writeFileSync('server.ts', code);
}
