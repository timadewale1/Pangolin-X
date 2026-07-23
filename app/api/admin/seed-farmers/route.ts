import { NextRequest, NextResponse } from "next/server";
import { adminDB, adminAuth } from "@/lib/firebaseAdmin";

/**
 * Admin endpoint to seed Firestore with 80 dummy farmers
 * This should only be accessible with admin token
 * POST /api/admin/seed-farmers
 */

const STATES_DATA: Record<
  string,
  { lgas: string[]; lat: number; lon: number }
> = {
  Niger: {
    lgas: [
      "Bida",
      "Gbako",
      "Katcha",
      "Lapai",
      "Lavun",
      "Magama",
      "Moya",
      "Suleja",
      "Wushishi",
    ],
    lat: 9.6,
    lon: 6.51,
  },
  Kano: {
    lgas: [
      "Ajingi",
      "Bagwai",
      "Bebeji",
      "Bichi",
      "Dambatta",
      "Gaya",
      "Gezawa",
      "Gwale",
    ],
    lat: 12.0023,
    lon: 8.6753,
  },
  Delta: {
    lgas: [
      "Aniocha North",
      "Aniocha South",
      "Bomadi",
      "Ethiope East",
      "Isoko North",
      "Sapele",
      "Uvwie",
      "Warri South",
    ],
    lat: 5.5317,
    lon: 5.7246,
  },
  FCT: {
    lgas: [
      "Abaji",
      "Bwari",
      "Gwagwalada",
      "Kuje",
      "Kwali",
      "Municipal Area Council",
    ],
    lat: 9.0765,
    lon: 7.3986,
  },
  Kogi: {
    lgas: [
      "Adavi",
      "Ajaokuta",
      "Ankpa",
      "Bassa",
      "Dekina",
      "Ibaji",
      "Idah",
      "Ijumu",
      "Lokoja",
    ],
    lat: 7.7833,
    lon: 6.6833,
  },
  Nasarawa: {
    lgas: [
      "Akwanga",
      "Awe",
      "Doma",
      "Karu",
      "Keana",
      "Keffi",
      "Lafia",
      "Nasarawa",
      "Wamba",
    ],
    lat: 8.8465,
    lon: 8.5404,
  },
};

const CROPS = [
  "maize",
  "rice",
  "cassava",
  "yam",
  "cowpea",
  "groundnut",
  "soybean",
  "millet",
  "sorghum",
  "tomato",
  "pepper",
  "onion",
  "cabbage",
  "okra",
  "sweet_potato",
  "sugarcane",
];

const CROP_STAGES = [
  "Seedling",
  "Vegetative",
  "Flowering",
  "Fruiting",
  "Reproductive",
  "Ripening",
  "Maturity",
];

const FIRST_NAMES = [
  "Chioma",
  "Yusuf",
  "Amara",
  "Kunle",
  "Zainab",
  "Emeka",
  "Fatima",
  "Adebayo",
  "Nkechi",
  "Hassan",
  "Ngozi",
  "Ibrahim",
  "Folake",
  "Musa",
  "Blessing",
  "Ahmed",
  "Uju",
  "Bola",
  "Jumoke",
  "Tunde",
  "Adeola",
  "Aisha",
  "Segun",
  "Chinyere",
  "Okoro",
  "Sade",
  "Obinna",
  "Amarachi",
  "Rauf",
  "Victoria",
];

const LAST_NAMES = [
  "Okonkwo",
  "Adeyemi",
  "Musa",
  "Okafor",
  "Ibrahim",
  "Dairo",
  "Mensah",
  "Eze",
  "Hassan",
  "Shola",
  "Akinfenwa",
  "Nwosu",
  "Ahmed",
  "Okoro",
  "Ayuba",
  "Lamidi",
  "Anyanwu",
  "Habibu",
  "Osunlana",
  "Bello",
];

const TITLES = ["Mr", "Mrs", "Ms", "Dr", "Engr"];

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomItems<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, arr.length));
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getCoordinates(
  state: string,
  stateData: (typeof STATES_DATA)[keyof typeof STATES_DATA]
) {
  return {
    lat: stateData.lat + (Math.random() - 0.5) * 2,
    lon: stateData.lon + (Math.random() - 0.5) * 2,
  };
}

export async function POST(req: NextRequest) {
  try {
    // Verify admin token
    const token = req.cookies.get("admin_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!adminDB || !adminAuth) {
      return NextResponse.json(
        { error: "Firebase admin not configured" },
        { status: 500 }
      );
    }

    // Define unequal distribution (more realistic)
    const stateDistribution: Record<string, number> = {
      Kano: 20,
      Delta: 18,
      FCT: 17,
      Nasarawa: 12,
      Kogi: 8,
      Niger: 5,
    };

    const farmers: Array<{
      uid: string;
      data: Record<string, unknown>;
    }> = [];
    let farmerCount = 0;

    // Generate farmer data
    for (const [state, count] of Object.entries(stateDistribution)) {
      const stateData = STATES_DATA[state as keyof typeof STATES_DATA];

      for (let i = 0; i < count; i++) {
        farmerCount++;

        const firstName = getRandomItem(FIRST_NAMES);
        const lastName = getRandomItem(LAST_NAMES);
        const name = `${firstName} ${lastName}`;
        const email = `farmer${farmerCount}@pangolin.test`;
        const phone = `+234${randomInt(70, 99)}${randomInt(10000000, 99999999)}`;
        const title = getRandomItem(TITLES);
        const lga = getRandomItem(stateData.lgas);
        const coords = getCoordinates(state, stateData);

        const selectedCrops = getRandomItems(CROPS, randomInt(1, 4));
        const cropStatus: Record<string, { stage: string; plantedAt: string }> =
          {};

        selectedCrops.forEach((crop) => {
          const daysPlanted = randomInt(10, 180);
          const plantedDate = new Date(
            Date.now() - daysPlanted * 24 * 60 * 60 * 1000
          );
          cropStatus[crop] = {
            stage: getRandomItem(CROP_STAGES),
            plantedAt: plantedDate.toISOString().split("T")[0],
          };
        });

        const farmerData = {
          name,
          email,
          phone,
          state,
          lga,
          crops: selectedCrops,
          cropStatus,
          title,
          lat: coords.lat,
          lon: coords.lon,
          createdAt: new Date(
            Date.now() - randomInt(30, 365) * 24 * 60 * 60 * 1000
          ),
          language: "en",
          acceptedTerms: true,
          acceptedPrivacy: true,
        };

        farmers.push({
          uid: `dummy_farmer_${String(farmerCount).padStart(3, "0")}`,
          data: farmerData,
        });
      }
    }

    // Create auth accounts and Firestore documents
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const farmer of farmers) {
      try {
        const dummyPassword = "Dummy@123456";

        try {
          await adminAuth.createUser({
            uid: farmer.uid,
            email: farmer.data.email as string,
            password: dummyPassword,
            displayName: farmer.data.name as string,
          });
        } catch (authError: unknown) {
          if (authError instanceof Error && 'code' in authError && authError.code !== "auth/uid-already-exists") {
            console.error(
              `Auth error for ${farmer.data.email}:`,
              authError instanceof Error ? authError.message : String(authError)
            );
          }
        }

        await adminDB.collection("farmers").doc(farmer.uid).set(farmer.data);
        successCount++;
      } catch (error: unknown) {
        errorCount++;
        errors.push(`${farmer.data.email}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Seeding completed",
      stats: {
        totalGenerated: farmers.length,
        successful: successCount,
        failed: errorCount,
        states: Object.keys(stateDistribution).length,
        crops: CROPS.length,
      },
      errors: errors.slice(0, 10), // Return first 10 errors
    });
  } catch (error: unknown) {
    console.error("Seeding error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Seeding failed" },
      { status: 500 }
    );
  }
}
