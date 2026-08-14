const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
    /console\.error\("Error sending animation", err\.message \|\| err\);/g,
    `console.error("Error sending animation", err.message || err); fs.appendFileSync('bot_errors.log', new Date().toISOString() + " - " + (err.message || err) + "\\n");`
);

fs.writeFileSync('server.ts', code);
