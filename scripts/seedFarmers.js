/**
 * Seed script for Firestore with dummy farmer data
 * Run with: node scripts/seedFarmers.js
 * 
 * This script:
 * - Creates 80 dummy farmers across multiple Nigerian states
 * - Distributes them with realistic data (name, email, crops, stages)
 * - Assigns coordinates based on their location
 * - Creates Firebase auth accounts
 */

const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

// Read .env file and parse SERVICE_ACCOUNT_KEY
const envPath = path.join(__dirname, "../.env");
const envContent = fs.readFileSync(envPath, "utf8");

// Extract SERVICE_ACCOUNT_KEY from env file
let serviceAccountKey;
const serviceAccountMatch = envContent.match(
  /SERVICE_ACCOUNT_KEY=(.+?)(?:\n|$)/s
);
if (serviceAccountMatch) {
  try {
    serviceAccountKey = JSON.parse(serviceAccountMatch[1]);
  } catch (e) {
    console.error("Failed to parse SERVICE_ACCOUNT_KEY from .env");
    process.exit(1);
  }
} else {
  console.error("SERVICE_ACCOUNT_KEY not found in .env");
  process.exit(1);
}

// Handle escaped newlines in private key
if (serviceAccountKey.private_key) {
  serviceAccountKey.private_key = serviceAccountKey.private_key.replace(
    /\\n/g,
    "\n"
  );
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccountKey),
  projectId: serviceAccountKey.project_id,
});

const db = admin.firestore();
const auth = admin.auth();

// Nigerian states with their coordinates
const STATES_DATA = {
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

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomItems(arr, count) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, arr.length));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getCoordinates(state, stateData) {
  const offset = Math.random();
  return {
    lat: stateData.lat + (Math.random() - 0.5) * 2,
    lon: stateData.lon + (Math.random() - 0.5) * 2,
  };
}

async function seedFarmers() {
  try {
    console.log("🌱 Starting farmer seeding...\n");

    let farmerCount = 0;
    const farmers = [];

    // Define unequal distribution (more realistic)
    const stateDistribution = {
      Kano: 20,
      Delta: 18,
      FCT: 17,
      Nasarawa: 12,
      Kogi: 8,
      Niger: 5,
    };

    for (const [state, count] of Object.entries(stateDistribution)) {
      const stateData = STATES_DATA[state];

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
        const cropStatus = selectedCrops.reduce((acc, crop) => {
          const daysPlanted = randomInt(10, 180);
          const plantedDate = new Date(Date.now() - daysPlanted * 24 * 60 * 60 * 1000);
          acc[crop] = {
            stage: getRandomItem(CROP_STAGES),
            plantedAt: plantedDate.toISOString().split("T")[0],
          };
          return acc;
        }, {});

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
          createdAt: new Date(Date.now() - randomInt(30, 365) * 24 * 60 * 60 * 1000),
          language: "en",
          acceptedTerms: true,
          acceptedPrivacy: true,
        };

        farmers.push({ uid: `dummy_farmer_${farmerCount}`, data: farmerData });
      }
    }

    console.log(`📊 Generated ${farmers.length} farmer records\n`);

    // Create Firebase auth accounts and Firestore documents
    let successCount = 0;
    let errorCount = 0;

    for (const farmer of farmers) {
      try {
        // Create auth account with dummy password
        const dummyPassword = "Dummy@123456";

        try {
          await auth.createUser({
            uid: farmer.uid,
            email: farmer.data.email,
            password: dummyPassword,
            displayName: farmer.data.name,
          });
        } catch (authError) {
          // User might already exist, continue
          if (authError.code !== "auth/uid-already-exists") {
            console.error(`  ⚠️  Auth error for ${farmer.data.email}:`, authError.message);
          }
        }

        // Create Firestore document
        await db
          .collection("farmers")
          .doc(farmer.uid)
          .set(farmer.data);

        successCount++;

        if (successCount % 10 === 0) {
          console.log(`✅ Seeded ${successCount} farmers...`);
        }
      } catch (error) {
        errorCount++;
        console.error(
          `❌ Error seeding farmer ${farmer.data.email}:`,
          error.message
        );
      }
    }

    console.log(`\n✨ Seeding completed!`);
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📍 States: ${Object.keys(STATES_DATA).length}`);
    console.log(`🌾 Total crops: ${CROPS.length}`);
    console.log(
      `\n💡 Tip: Login with any email like "farmer1@pangolin.test" and password "Dummy@123456"`
    );

    process.exit(0);
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

seedFarmers();
