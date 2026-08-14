const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Imports
code = `import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';\n` + code;

// Replace DB setup
const oldDbSetup = `// Database setup
const DB_FILE = 'database.json';
let db: { users: Record<string, { balance: number, lastBonus: number }> } = { users: {} };

if (fs.existsSync(DB_FILE)) {
    try {
        db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    } catch (e) {
        console.error('Error loading db', e);
    }
}

function saveDb() {
    fs.writeFileSync(DB_FILE, JSON.stringify(db));
}

function getUser(id: number) {
    const idStr = id.toString();
    if (!db.users[idStr]) {
        db.users[idStr] = { balance: 0, lastBonus: 0 };
        saveDb();
    }
    return db.users[idStr];
}`;

const newDbSetup = `// Firebase DB setup
const configStr = fs.readFileSync('firebase-applet-config.json', 'utf-8');
const firebaseConfig = JSON.parse(configStr);
const firebaseApp = initializeApp(firebaseConfig);
const firestore = getFirestore(firebaseApp);

async function getUser(id: number) {
    const idStr = id.toString();
    const docRef = doc(firestore, 'users', idStr);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docSnap.data() as { balance: number, lastBonus: number };
    } else {
        const newUser = { balance: 0, lastBonus: 0 };
        await setDoc(docRef, newUser);
        return newUser;
    }
}

async function saveUser(id: number, userData: { balance: number, lastBonus: number }) {
    const idStr = id.toString();
    const docRef = doc(firestore, 'users', idStr);
    await setDoc(docRef, userData);
}`;

code = code.replace(oldDbSetup, newDbSetup);

// Replace usages
// admin
code = code.replace(
    /const user = getUser\(ctx\.from\.id\);\s+user\.balance \+= 100000;\s+saveDb\(\);/,
    "const user = await getUser(ctx.from.id);\n    user.balance += 100000;\n    await saveUser(ctx.from.id, user);"
);

// balance
code = code.replace(
    /bot\.hears\(\/\^баланс\$\/i, \(ctx\) => \{/g,
    "bot.hears(/^баланс$/i, async (ctx) => {"
);
code = code.replace(
    /const user = getUser\(ctx\.from\.id\);/g,
    "const user = await getUser(ctx.from.id);"
);

// claim_bonus
code = code.replace(
    /user\.balance \+= 3000;\s+user\.lastBonus = now;\s+saveDb\(\);/g,
    "user.balance += 3000;\n        user.lastBonus = now;\n        await saveUser(ctx.from.id, user);"
);

// transfer
code = code.replace(
    /bot\.hears\(\/\^перевести\\s\+\(\\d\+\)\$\/i, \(ctx\) => \{/g,
    "bot.hears(/^перевести\\s+(\\d+)$/i, async (ctx) => {"
);
code = code.replace(
    /const senderUser = getUser\(senderId\);/g,
    "const senderUser = await getUser(senderId);"
);
code = code.replace(
    /const receiverUser = getUser\(receiverId\);/g,
    "const receiverUser = await getUser(receiverId);"
);
code = code.replace(
    /senderUser\.balance -= amount;\s+receiverUser\.balance \+= amount;\s+saveDb\(\);/,
    "senderUser.balance -= amount;\n    receiverUser.balance += amount;\n    await saveUser(senderId, senderUser);\n    await saveUser(receiverId, receiverUser);"
);

// crash start
code = code.replace(
    /user\.balance -= bet;\s+saveDb\(\);/g,
    "user.balance -= bet;\n    await saveUser(ctx.from.id, user);"
);

// crash fallback catch
code = code.replace(
    /user\.balance \+= bet;\s+saveDb\(\);/g,
    "user.balance += bet;\n            await saveUser(ctx.from.id, user);"
);

// take
code = code.replace(
    /const user = getUser\(game\.userId\);\s+user\.balance \+= winAmount;\s+saveDb\(\);/g,
    "const user = await getUser(game.userId);\n    user.balance += winAmount;\n    await saveUser(game.userId, user);"
);

fs.writeFileSync('server.ts', code);
