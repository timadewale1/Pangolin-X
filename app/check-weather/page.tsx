// app/check-weather/page.tsx
"use client";

import { useMemo, useState } from "react";
import { NIGERIA_STATES_LGAS } from "@/lib/nigeriaData";
import Loader from "@/components/Loader";
import { ArrowLeft, Cloud, Droplet, Thermometer } from "lucide-react";
import { motion } from "framer-motion";

type WeatherCurrent = {
  temp: number | null;
  feels_like: number | null;
  humidity: number | null;
  condition: string | null;
  icon: string | null;
};

type Weather = {
  location: string;
  current: WeatherCurrent;
  raw: unknown;
};

export default function CheckWeather() {
  const [stateQuery, setStateQuery] = useState("");
  const [lgaQuery, setLgaQuery] = useState("");
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedLga, setSelectedLga] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [geoTrying, setGeoTrying] = useState(false);

  // states array
  const states = useMemo(() => Object.keys(NIGERIA_STATES_LGAS), []);
  const filteredStates = states.filter((s) => s.toLowerCase().includes(stateQuery.toLowerCase()));
  const lgasForState = selectedState ? NIGERIA_STATES_LGAS[selectedState] || [] : [];
  const filteredLGAs = lgaQuery ? lgasForState.filter((l) => l.toLowerCase().includes(lgaQuery.toLowerCase())) : lgasForState;

  // improved geolocation: try highAccuracy, reverse geocode and set selected state/LGA when matched
  async function detectAndSet() {
    if (!("geolocation" in navigator)) return alert("Geolocation not supported");
    setGeoTrying(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        // try bigdatacloud first
        try {
          const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
          const j = await res.json();
          let princ = j.principalSubdivision;
          if (princ && princ.startsWith("Federal Capital Territory")) princ = "FCT";
          if (princ === "Abuja") princ = "FCT";
          if (princ === "Nassarawa") princ = "Nasarawa";
          const loc = j.locality || j.city || j.county || "";
          if (princ && NIGERIA_STATES_LGAS[princ]) {
            setSelectedState(princ);
            // try match LGA
            const lgas = NIGERIA_STATES_LGAS[princ] || [];
            const matched = lgas.find((x) => x.toLowerCase() === loc.toLowerCase()) || lgas.find((x) => loc && x.toLowerCase().includes(loc.toLowerCase()));
            if (matched) setSelectedLga(matched);
            setGeoTrying(false);
            return;
          }
        } catch {
          // fallback to nominatim
        }
        // fallback Nominatim
        try {
          const res2 = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
          const j2 = await res2.json();
          const add = j2.address || {};
          let st = add.state || add.region || "";
          if (st.startsWith("Federal Capital Territory")) st = "FCT";
          if (st === "Abuja") st = "FCT";
          if (st === "Nassarawa") st = "Nasarawa";
          const county = add.county || add.city || add.town || "";
          if (st && NIGERIA_STATES_LGAS[st]) {
            setSelectedState(st);
            const lgas = NIGERIA_STATES_LGAS[st] || [];
            const matched = lgas.find((x) => x.toLowerCase() === county.toLowerCase()) || lgas.find((x) => county && x.toLowerCase().includes(county.toLowerCase()));
            if (matched) setSelectedLga(matched);
          } else {
            alert("Location found but not matched to a Nigerian state in dataset. Please select manually.");
          }
        } catch (e) {
          console.warn(e);
        } finally {
          setGeoTrying(false);
        }
      },
      (err) => {
        console.warn(err);
        setGeoTrying(false);
        alert("Unable to detect location. Check permissions.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  async function fetchBySelection() {
    if (!selectedState || !selectedLga) return alert("Select state and LGA first");
    setLoading(true);
    setWeather(null);

    // forward-geocode to get lat/lon using Nominatim (free)
    try {
      const q = encodeURIComponent(`${selectedLga}, ${selectedState}, Nigeria`);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`);
      const arr = await res.json();
      if (!arr || arr.length === 0) {
        alert("Couldn't geocode that LGA. Try another or use geolocation.");
        setLoading(false);
        return;
      }
      const lat = parseFloat(arr[0].lat);
      const lon = parseFloat(arr[0].lon);

      // post to your existing /api/weather which expects {lat, lon}
      const r = await fetch("/api/weather", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lon }),
      });
      const json = await r.json();
      if (json?.error) {
        alert(json.error || "Weather fetch error");
        setLoading(false);
        return;
      }

      // your /api/weather returns OpenWeather OneCall data; map to simpler shape for UI
      const formattedCurrent = {
        temp: json.current?.temp ?? json?.main?.temp ?? null,
        feels_like: json.current?.feels_like ?? json?.main?.feels_like ?? null,
        humidity: json.current?.humidity ?? json?.main?.humidity ?? null,
        condition:
          (json.current?.weather?.[0]?.description) ||
          (json?.weather?.[0]?.description) ||
          null,
        icon: (json.current?.weather?.[0]?.icon) || (json?.weather?.[0]?.icon) || null,
      };

      setWeather({
        location: `${selectedLga}, ${selectedState}`,
        current: formattedCurrent,
        raw: json,
      });
    } catch (err) {
      console.error("fetch weather error", err);
      alert("Failed to fetch weather");
    } finally {
      setLoading(false);
    }
  }

  // Back button helper
  const goBack = () => window.history.back();

  return (
    <div className="min-h-screen relative">
      <div id="vanta-bg" className="absolute inset-0 -z-10" />
      {loading && <Loader />}

      <div className="p-6 max-w-3xl mx-auto">
        <button onClick={goBack} className="flex items-center gap-2 text-green-300 mb-4">
          <ArrowLeft /> Back
        </button>

        <h1 className="text-3xl font-bold text-center text-white mb-6">Check Weather</h1>

        {/* Geolocation quick button */}
        <div className="flex gap-2 mb-4">
          <button onClick={detectAndSet} disabled={geoTrying} className="px-4 py-2 bg-green-600 text-white rounded">
            {geoTrying ? "Detecting..." : "Use my location"}
          </button>
          <button onClick={() => { setSelectedState(""); setSelectedLga(""); }} className="px-4 py-2 border rounded text-white">
            Reset
          </button>
        </div>

        {/* State selector */}
        <div className="mb-4">
          <input
            placeholder={selectedState ? `Selected: ${selectedState}` : "Search state..."}
            className="w-full p-2 rounded text-white border-2 border-white/10"
            value={stateQuery}
            onChange={(e) => setStateQuery(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto">
            {filteredStates.map((s) => (
              <button
                key={s}
                onClick={() => { setSelectedState(s); setSelectedLga(""); setStateQuery(""); }}
                className={`p-2 rounded text-left ${selectedState === s ? "bg-green-50 text-black border border-green-600" : "bg-white/20 text-white border border-white/10"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* LGA selector */}
        {selectedState && (
          <div className="mb-4">
            <input
              placeholder={selectedLga ? `Selected: ${selectedLga}` : "Search LGA..."}
              className="w-full p-2 rounded text-white  border-2"
              value={lgaQuery}
              onChange={(e) => setLgaQuery(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto">
              {filteredLGAs.map((l) => (
                <button
                  key={l}
                  onClick={() => { setSelectedLga(l); setLgaQuery(""); }}
                  className={`p-2 rounded text-left ${selectedLga === l ? "bg-green-50 text-black border border-green-600" : "bg-white/20 text-white border border-white/10"}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <button onClick={fetchBySelection} disabled={!selectedState || !selectedLga || loading} className="w-full bg-green-600 hover:bg-green-700 text-white p-2 rounded font-semibold">
            Get Weather
          </button>
        </div>

        {/* Weather result */}
        {weather && weather.current && (
          <motion.div className="mt-6 p-4 rounded-xl bg-white/95 text-black shadow-lg" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-lg font-bold text-green-700">Current weather in {weather.location}</h2>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="flex items-center gap-2 p-3 border rounded">
                <Thermometer className="text-green-600" />
                <div>
                  <div className="text-sm text-gray-600">Temperature</div>
                  <div className="font-semibold">{weather.current.temp ?? "N/A"}°C</div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 border rounded">
                <Droplet className="text-blue-600" />
                <div>
                  <div className="text-sm text-gray-600">Humidity</div>
                  <div className="font-semibold">{weather.current.humidity ?? "N/A"}%</div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 border rounded">
                <Cloud className="text-gray-700" />
                <div>
                  <div className="text-sm text-gray-600">Condition</div>
                  <div className="font-semibold capitalize">{weather.current.condition ?? "N/A"}</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
