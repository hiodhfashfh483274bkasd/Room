const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
    "bot.launch({ dropPendingUpdates: true }).then(() => {\n      console.log('Telegram bot is running!');\n  }).catch(err => {\n      console.error('Failed to start telegram bot', err);\n  });",
    "// bot.launch({ dropPendingUpdates: true }).then(() => {\n  //     console.log('Telegram bot is running!');\n  // }).catch(err => {\n  //     console.error('Failed to start telegram bot', err);\n  // });"
);

fs.writeFileSync('server.ts', code);
