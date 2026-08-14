const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldLine = "        if (ctx.message && (ctx.message as any).text && ((ctx.message as any).text.startsWith('краш') || (ctx.message as any).text.toLowerCase() === 'баланс' || (ctx.message as any).text.toLowerCase().startsWith('перевести')) {";
const newLine = "        if (ctx.message && (ctx.message as any).text && ((ctx.message as any).text.startsWith('краш') || (ctx.message as any).text.toLowerCase() === 'баланс' || (ctx.message as any).text.toLowerCase().startsWith('перевести'))) {";

code = code.replace(oldLine, newLine);
fs.writeFileSync('server.ts', code);
