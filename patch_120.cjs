const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
    /\/\/ Если меньше 1\.20, то это моментальный краш на 1\.00\n\s*if \(crashPoint < 1\.20\) \{\n\s*crashPoint = 1\.00;\n\s*\}/,
    `// Если краш выпадает на 1.20 или меньше, делаем моментальный краш на 1.00
    if (crashPoint <= 1.20) {
        crashPoint = 1.00;
    }`
);

fs.writeFileSync('server.ts', code);
