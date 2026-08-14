const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: "ai-studio-crashtelegrambot-a31de2fc-673e-420b-9b2f-4b03f746492b"
});

const db = admin.firestore();

async function run() {
    const users = await db.collection('users').limit(1).get();
    if (!users.empty) {
        console.log("Chat ID:", users.docs[0].id);
    } else {
        console.log("No users found");
    }
}
run();
