import admin from "firebase-admin";

if (!admin.apps.length) {
  try {
    const serviceAccountKey = process.env.SERVICE_ACCOUNT_KEY;

    if (!serviceAccountKey) {
      throw new Error("Missing SERVICE_ACCOUNT_KEY environment variable");
    }

    const serviceAccount = JSON.parse(serviceAccountKey);

    // ✅ Convert escaped newlines to actual newlines
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log("[firebase-admin] ✅ Initialized successfully");
  } catch (error) {
    console.error("🔥 Failed to init firebase-admin:", error);
  }
}

// Export for usage in any server route
export const adminDB = admin.firestore();
export const adminAuth = admin.auth();
export { admin };
