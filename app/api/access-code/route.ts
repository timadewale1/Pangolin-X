
import { NextResponse } from "next/server";
import admin from "firebase-admin";

if (!admin.apps.length) {
  try {
    const keyRaw = process.env.SERVICE_ACCOUNT_KEY;
    if (!keyRaw) throw new Error('Missing SERVICE_ACCOUNT_KEY env variable');
    
    // Handle the key whether it comes as a JSON string or already parsed object
    type ServiceAccountLike = {
      private_key?: string;
      [key: string]: unknown;
    };
    let serviceAccount: ServiceAccountLike;
    if (typeof keyRaw === 'string') {
      try {
        serviceAccount = JSON.parse(keyRaw) as ServiceAccountLike;
      } catch (e) {
        console.error('Failed to parse SERVICE_ACCOUNT_KEY:', e);
        throw new Error('Invalid SERVICE_ACCOUNT_KEY format');
      }
    } else {
      serviceAccount = keyRaw as ServiceAccountLike;
    }

    // Ensure private_key exists and handle newlines
    if (!serviceAccount.private_key) {
      throw new Error('Missing private_key in service account');
    }

    // Convert literal '\n' strings to actual newlines and ensure proper PEM format
    if (typeof serviceAccount.private_key === 'string') {
      let privateKey = serviceAccount.private_key;
      
      // Replace escaped newlines with actual newlines
      privateKey = privateKey.replace(/\\n/g, '\n');
      
      // Ensure proper PEM format with newlines after header and before footer
      if (!privateKey.includes('\n')) {
        privateKey = privateKey
          .replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n')
          .replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----');
      }
      
      serviceAccount.private_key = privateKey;
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as unknown as admin.ServiceAccount),
    });
  } catch (err) {
    console.error("Failed to initialize firebase-admin:", err);
    throw err; // Re-throw to prevent silently failing
  }
}


const db = admin.firestore();

const VALID_CODE = "PANGOLIN-X";
const DEFAULT_MAX_USES = 50;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code } = body;

    if (!code || code !== VALID_CODE) {
      return NextResponse.json({ valid: false, message: "Invalid code" }, { status: 400 });
    }

    const codeRef = db.collection("access_codes").doc(VALID_CODE);
    let docSnap;
    try {
      docSnap = await codeRef.get();
    } catch (err) {
      console.error("Admin Firestore read error:", err);
      return NextResponse.json({ valid: false, message: "Database error (read)" }, { status: 500 });
    }

    const data = docSnap.exists ? docSnap.data() : {};
    const usageCount = data?.uses ?? 0;
    const maxUses = data?.maxUses ?? DEFAULT_MAX_USES;

    if (usageCount >= maxUses) {
      return NextResponse.json({ valid: false, message: "Code has expired" }, { status: 400 });
    }

    // Return validity and counts but DO NOT increment here; consumption happens on successful signup
    return NextResponse.json({ valid: true, uses: usageCount, maxUses });
  } catch (err) {
    console.error("Access code admin check failed:", err);
    return NextResponse.json({ valid: false, message: "Server error" }, { status: 500 });
  }
}