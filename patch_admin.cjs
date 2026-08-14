const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/100000 CRASH/g, '9999999999 CRASH');

fs.writeFileSync('server.ts', code);
