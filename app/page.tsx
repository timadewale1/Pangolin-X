// app/page.tsx
"use client";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";
import LanguageButton from "@/components/LanguageButton";
import { FaCloudSun, FaLeaf, FaGlobe, FaMobileAlt } from "react-icons/fa";

export default function Home() {
  const { t, lang, setLang } = useLanguage();

  const heroImg = "https://images.unsplash.com/photo-1620200423727-8127f75d7f53?q=80&w=600&auto=format&fit=crop";
  const howImg = "https://images.unsplash.com/photo-1744230673231-865d54a0aba4?q=80&w=600&auto=format&fit=crop";
  const featuresImg = "https://images.unsplash.com/photo-1630260667842-830a17d12ec9?q=80&w=600&auto=format&fit=crop";

  return (
    <div>
      <nav className="bg-white shadow-md sticky top-0 z-40">
        <div className="container mx-auto px-6 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Image src="/Pangolin-x.png" alt="Pangolin-x logo" width={48} height={48} priority />
            {/* <span className="text-2xl font-bold text-green-700">Pangolin-x</span> */}
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <a href="#features" className="text-gray-700 hover:text-green-600">{t("features")}</a>
            <a href="#how-it-works" className="text-gray-700 hover:text-green-600">{t("howItWorks")}</a>
            <a href="#contact" className="text-gray-700 hover:text-green-600">Contact</a>

            {/* language select small (keeps in sync) */}
            {/* <select
              value={lang}
              onChange={(e) =>
                setLang(
                  e.target.value as "en" | "ha" | "ig" | "yo" | "pg"
                )
              }
              className="ml-4 rounded-full border px-3 py-1"
            >
              <option value="en">English</option>
              <option value="ha">Hausa</option>
              <option value="ig">Igbo</option>
              <option value="yo">Yoruba</option>
              <option value="pg">Pidgin</option>
            </select> */}

            {/* single language button - only one in the UI */}
            <LanguageButton />
          </div>

          <div className="flex items-center gap-3">
            <Link href="/signup">
              <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full text-sm font-medium">{t("getStarted")}</button>
            </Link>
            <Link href="/login">
              <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full text-sm font-medium">Login </button>
            </Link>

            {/* on mobile show button */}
            <div className="md:hidden">
              <LanguageButton />
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="relative" style={{ backgroundImage: `url(${heroImg})`, backgroundSize: "cover", backgroundPosition: "center" }}>
        <div className="absolute inset-0 bg-[#255b2f88]"></div> {/* green overlay */}
        <div className="container mx-auto px-6 py-24 md:py-36 relative z-10 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">{t("title")}</h1>
          <p className="text-lg md:text-xl mb-8 text-white">{t("subtitle")}</p>
          <div className="flex justify-center gap-4">
            <Link href="/check-weather">
              <button className="bg-white text-green-700 px-8 py-3 rounded-full text-lg font-semibold">{t("checkWeather")}</button>
            </Link>
          </div>
        </div>
      </header>

      {/* How it works (translations used) */}
      <main className="bg-white">
        <section className="py-16" id="how-it-works">
          <div className="container mx-auto px-6">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">{t("howItWorks")}</h2>
              <p className="text-gray-600 max-w-2xl mx-auto mb-4">{t("howItWorksDesc")}</p>
              <div className="relative w-full h-64 md:h-96">
                <Image src={howImg} alt="How Pangolin-x works" fill className="object-cover rounded-xl" />
              </div>
            </div>
        
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center px-6">
                <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FaGlobe className="text-green-600" size={28} />
                </div>
                <h3 className="text-xl font-semibold mb-3">{t("how_step1")}</h3>
                <p className="text-gray-600">{t("how_step1_desc")}</p>
              </div>

              <div className="text-center px-6">
                <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FaCloudSun className="text-green-600" size={28} />
                </div>
                <h3 className="text-xl font-semibold mb-3">{t("how_step2")}</h3>
                <p className="text-gray-600">{t("how_step2_desc")}</p>
              </div>

              <div className="text-center px-6">
                <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FaLeaf className="text-green-600" size={28} />
                </div>
                <h3 className="text-xl font-semibold mb-3">{t("how_step3")}</h3>
                <p className="text-gray-600">{t("how_step3_desc")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-16 bg-gray-50">
          
          <div className="container mx-auto px-6">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">{t("features")}</h2>
              <p className="text-gray-600 max-w-2xl mx-auto mb-4">{t("featuresSub")}</p>
              <div className="relative w-full h-64 md:h-96">
                <Image src={featuresImg} alt="" fill className="object-cover rounded-xl" />
              </div>

            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="bg-white p-8 rounded-xl shadow-md feature-card">
                <FaCloudSun className="text-green-600 mb-4" size={28}/>
                <h3 className="text-xl font-semibold mb-3">{t("features_local_weather")}</h3>
                <p className="text-gray-600">{t("features_local_weather_desc")}</p>
              </div>

              <div className="bg-white p-8 rounded-xl shadow-md feature-card">
                <FaLeaf className="text-green-600 mb-4" size={28}/>
                <h3 className="text-xl font-semibold mb-3">{t("features_ai_advisor")}</h3>
                <p className="text-gray-600">{t("features_ai_advisor_desc")}</p>
              </div>

              <div className="bg-white p-8 rounded-xl shadow-md feature-card">
                <FaGlobe className="text-green-600 mb-4" size={28}/>
                <h3 className="text-xl font-semibold mb-3">{t("features_multi_language")}</h3>
                <p className="text-gray-600">{t("features_multi_language_desc")}</p>
              </div>

              <div className="bg-white p-8 rounded-xl shadow-md feature-card">
                <FaMobileAlt className="text-green-600 mb-4" size={28}/>
                <h3 className="text-xl font-semibold mb-3">{t("features_mobile")}</h3>
                <p className="text-gray-600">{t("features_mobile_desc")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section id="cta" className="py-16 gradient-bg text-white">
          <div className="container mx-auto px-6 text-center">
            <h2 className="text-3xl font-bold mb-6">{t("ctaTitle")}</h2>
            <p className="text-xl mb-10 max-w-2xl mx-auto">{t("ctaSub")}</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/signup">
                <button className="bg-white text-green-700 px-8 py-3 rounded-full text-lg font-semibold">{t("signUp")}</button>
              </Link>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-16 bg-white">
          <div className="container mx-auto px-6">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">{t("pricing_title")}</h2>
              <p className="text-gray-600 max-w-2xl mx-auto mb-4">{t("pricing_subtitle")}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="p-8 rounded-xl border shadow-sm text-center">
                <div className="text-sm text-gray-500">{t("pricing_monthly_label")}</div>
                <div className="text-3xl font-bold text-green-700 mt-2">₦1,500</div>
                <div className="text-sm text-gray-600 mt-2">{t("pricing_monthly_period")}</div>
                <ul className="text-left mt-4 space-y-2 text-gray-700">
                  <li>• {t("pricing_feature_ai")}</li>
                  <li>• {t("pricing_feature_weather")}</li>
                  <li>• {t("pricing_feature_alerts")}</li>
                </ul>
                <div className="mt-6">
                  <a href="/signup" className="inline-block bg-green-600 text-white px-6 py-2 rounded">{t("pricing_signup_monthly")}</a>
                </div>
              </div>

              <div className="p-8 rounded-xl border shadow-sm text-center">
                <div className="text-sm text-gray-500">{t("pricing_yearly_label")}</div>
                <div className="text-3xl font-bold text-green-700 mt-2">₦15,000</div>
                <div className="text-sm text-gray-600 mt-2">{t("pricing_yearly_period")}</div>
                <ul className="text-left mt-4 space-y-2 text-gray-700">
                  <li>• {t("pricing_feature_all")}</li>
                  <li>• {t("pricing_feature_priority_support")}</li>
                  <li>• {t("pricing_feature_best_value")}</li>
                </ul>
                <div className="mt-6">
                  <a href="/signup" className="inline-block bg-green-600 text-white px-6 py-2 rounded">{t("pricing_signup_yearly")}</a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* <section id="contact" className="py-12 bg-white">
          <div className="container mx-auto px-6">
            <h3 className="font-semibold mb-2">Contact</h3>
            <p className="text-sm text-gray-600">hello@pangolinx.ng · +234 800 000 0000 · Lagos, Nigeria</p>
          </div>
        </section> */}
      </main>

      <footer className="bg-gray-800 text-white py-12">
        <div className="container mx-auto px-6 grid md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-3">Pangolin-x</h3>
            <p className="text-gray-400">Climate Smart weather and AI advisory for Nigerian farmers.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Quick Links</h4>
            <ul className="text-gray-400 space-y-1">
              <li><a href="#how-it-works">How It Works</a></li>
              <li><a href="#features">Features</a></li>
              <li><a href="/signup">Sign Up</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Contact Us</h4>
            <p className="text-gray-400">pangolin.xapp@gmail.com</p>
            <p className="text-gray-400">contact@pangolin-x.com</p>
            <p className="text-gray-400">+234 806 193 5246</p>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-12 pt-8 text-center text-gray-400">
          <p>© 2025 Pangolin-x. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
}
