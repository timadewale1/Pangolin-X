import { db } from "../lib/firebase";
import { doc, setDoc } from "firebase/firestore";

// Sample soil type data for major agricultural LGAs
// This is example data - replace with actual soil surveys
const soilData = {
  // Kano State
  "kano|dambatta": {
    type: "Sandy Loam",
    description: "Well-drained sandy loam soil suitable for cereals and vegetables",
    traits: {
      texture: "sandy" as const,
      drainage: "good" as const,
      pH: 6.5
    },
    nutrients: {
      nitrogen: "medium" as const,
      phosphorus: "low" as const,
      potassium: "medium" as const
    }
  },
  "kano|kura": {
    type: "Clay Loam",
    description: "Heavy clay loam soil with high water retention",
    traits: {
      texture: "clay" as const,
      drainage: "moderate" as const,
      pH: 7.2
    },
    nutrients: {
      nitrogen: "high" as const,
      phosphorus: "medium" as const,
      potassium: "high" as const
    }
  },

  // Ogun State
  "ogun|obafemi owode": {
    type: "Forest Soil",
    description: "Rich forest soil with high organic content",
    traits: {
      texture: "loam" as const,
      drainage: "good" as const,
      pH: 6.8
    },
    nutrients: {
      nitrogen: "high" as const,
      phosphorus: "high" as const,
      potassium: "medium" as const
    }
  },

  // Kaduna State
  "kaduna|zaria": {
    type: "Northern Guinea Savanna Soil",
    description: "Typical savanna soil suitable for grains and legumes",
    traits: {
      texture: "sandy" as const,
      drainage: "good" as const,
      pH: 6.3
    },
    nutrients: {
      nitrogen: "low" as const,
      phosphorus: "medium" as const,
      potassium: "medium" as const
    }
  },

  // Add more LGAs here...
};

async function initSoilData() {
  console.log('Starting soil data initialization...');
  
  for (const [key, data] of Object.entries(soilData)) {
    try {
      const ref = doc(db, 'soilTypes', key);
      await setDoc(ref, data);
      console.log(`Added soil data for ${key}`);
    } catch (err) {
      console.error(`Failed to add soil data for ${key}:`, err);
    }
  }

  console.log('Soil data initialization complete.');
}

// Run the initialization
initSoilData().catch(console.error);