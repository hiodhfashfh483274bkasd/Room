const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Hardcode the fileIdCache
code = code.replace(
    "const fileIdCache: Record<string, string> = {};",
    `const fileIdCache: Record<string, string> = {
    'fly': 'BQACAgIAAxkDAAM8an5B7T6SQo6OEnKHT6N4P8OCQvoAAkepAAIMAAHwSzLPW0PMIA4dPQQ',
    'win': 'BQACAgIAAxkDAAM9an5CDf2D7kVoiarlB7N8V2YBn8AAAkipAAIMAAHwS8dY3LdByxdgPQQ',
    'lose': 'BQACAgIAAxkDAAM-an5CDVP2GQVhmI_4ZXP84OXAU8kAAkmpAAIMAAHwS_fKB-WCQt8hPQQ'
};`
);

// Fix msg.animation.file_id to account for msg.document.file_id
code = code.replace(
    /if \(\!fileIdCache\['fly'\] && msg\.animation && msg\.animation\.file_id\) \{/g,
    `const fileId = msg.animation?.file_id || msg.document?.file_id;
        if (!fileIdCache['fly'] && fileId) {`
);
code = code.replace(
    /fileIdCache\['fly'\] = msg\.animation\.file_id;/g,
    `fileIdCache['fly'] = fileId;`
);

// Fix for lose
code = code.replace(
    /if \(\!fileIdCache\['lose'\] && loseMsg\.animation && loseMsg\.animation\.file_id\) \{/g,
    `const loseFileId = loseMsg.animation?.file_id || loseMsg.document?.file_id;
                    if (!fileIdCache['lose'] && loseFileId) {`
);
code = code.replace(
    /fileIdCache\['lose'\] = loseMsg\.animation\.file_id;/g,
    `fileIdCache['lose'] = loseFileId;`
);

// Fix for win
code = code.replace(
    /if \(\!fileIdCache\['win'\] && winMsg\.animation && winMsg\.animation\.file_id\) \{/g,
    `const winFileId = winMsg.animation?.file_id || winMsg.document?.file_id;
            if (!fileIdCache['win'] && winFileId) {`
);
code = code.replace(
    /fileIdCache\['win'\] = winMsg\.animation\.file_id;/g,
    `fileIdCache['win'] = winFileId;`
);

// Remove the temp api routes
code = code.replace(/app\.get\('\/api\/do-upload[\s\S]*?res\.status\(500\)\.json\(\{error: e\.message\}\);\n\s*\}\n\}\);\n/g, '');

fs.writeFileSync('server.ts', code);
