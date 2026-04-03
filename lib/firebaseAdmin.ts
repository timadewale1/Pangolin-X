import admin from "firebase-admin";

function initializeFirebaseAdmin() {
  if (admin.apps.length) return true;

  try {
    const serviceAccountKey = process.env.SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
      console.warn("[firebase-admin] SERVICE_ACCOUNT_KEY not configured");
      return false;
    }

    const serviceAccount = JSON.parse(serviceAccountKey);
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log("[firebase-admin] Initialized successfully");
    return true;
  } catch (error) {
    console.error("[firebase-admin] Failed to initialize", error);
    return false;
  }
}

const adminReady = initializeFirebaseAdmin();

export const adminDB = adminReady ? admin.firestore() : null;
export const adminAuth = adminReady ? admin.auth() : null;
export { admin };
