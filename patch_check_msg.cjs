const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
    /if \(\!fileIdCache\['fly'\] && msg\.animation && msg\.animation\.file_id\) \{/g,
    `fs.appendFileSync('msg_dump.log', JSON.stringify(msg, null, 2) + "\\n"); if (!fileIdCache['fly'] && msg.animation && msg.animation.file_id) {`
);

fs.writeFileSync('server.ts', code);
