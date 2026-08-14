const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/fly\.gif/g, 'polet.gif');
code = code.replace(/fileIdCache\['fly'\]/g, "fileIdCache['polet']");

fs.writeFileSync('server.ts', code);
