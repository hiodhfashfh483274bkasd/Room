const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(
    'const firestore = getFirestore(firebaseApp);',
    'const firestore = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);'
);
fs.writeFileSync('server.ts', code);
