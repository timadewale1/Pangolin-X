"use client";
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Lang = "en" | "ha" | "ig" | "yo" | "pg";
type Translations = Record<string, string>;

const translations: Record<Lang, Record<string, string>> = {
  en: {
    title: "Smart Weather and AI Advisory for Nigerian Farmers",
    subtitle: "Stay ahead of the weather. Get real-time forecasts and AI-driven agricultural advice for your local government area.",
    howItWorks: "How Pangolin-x Works",
    howItWorksDesc: "Pangolin-x connects farmers to local weather intelligence and expert AI farming advice.",
    features: "Powerful Features",
    featuresSub: "Everything you need for smarter farming decisions",
    ctaTitle: "Join Thousands of Nigerian Farmers",
    ctaSub: "Make smarter decisions with Pangolin-x's weather intelligence and AI advisory",
    getStarted: "Get Started",
    checkWeather: "Check Weather",
    getAIAdvice: "Get AI Advice",
    signUpFree: "Sign Up Free",
    checkYourWeather: "Check Your Weather",
    features_local_weather: "Local Weather Forecast",
    features_ai_advisor: "AI Crop Advisor",
    features_multi_language: "Multi-Language",
    features_mobile: "Mobile Friendly",
    testimonials: "What Farmers Say"
  },
  ha: {
    title: "Hankali Kan Yanayi Ga Manoma Na Najeriya",
    subtitle: "Ku kasance gaba da yanayi. Sami hasashen yanayi na ainihi da shawarwarin noma na AI don yankin karamar hukumar ku.",
    howItWorks: "Yadda Pangolin-x ke Aiki",
    howItWorksDesc: "Pangolin-x yana haɗa manoma zuwa hankalin yanayi na gida da ƙwararrun shawarwarin noma na AI.",
    features: "Fasaloli masu ƙarfi",
    featuresSub: "Duk abin da kuke buƙata don yanke shawara mai kyau na noma",
    ctaTitle: "Shiga Dubban Manoma na Najeriya",
    ctaSub: "Yi shawarwari mai kyau tare da hankalin yanayi na Pangolin-x da shawarwarin AI",
    getStarted: "Fara",
    checkWeather: "Duba Yanayi",
    getAIAdvice: "Sami Shawara AI",
    signUpFree: "Yi Rijista Kyauta",
    checkYourWeather: "Duba Yanayin ka",
    features_local_weather: "Hasashen Yanayi na Yanki",
    features_ai_advisor: "Mai Ba da Shawarwari na AI",
    features_multi_language: "Harsuna Da Yawa",
    features_mobile: "Daidaitacce ta Wayar hannu",
    testimonials: "Abin da Manoma suka Faɗa"
  },
  ig: {
    title: "Amami Ọtụtụ Maka Ndị Ọrụ Ugbo Na Naịjíríà",
    subtitle: "Nọ n’ihu ihu igwe. Nweta amụma ihu igwe n’oge na ndụ na ndụmọdụ ọrụ ugbo sitere na AI maka mpaghara gị.",
    howItWorks: "Otu Pangolin-x Si Arụ Ọrụ",
    howItWorksDesc: "Pangolin-x na-ejikọ ndị ọrụ ugbo na amamihe ihu igwe ebe obibi na ndụmọdụ AI.",
    features: "Atụmatụ Ike",
    featuresSub: "Ihe niile ịchọrọ maka mkpebi ọrụ ugbo ziri ezi",
    ctaTitle: "Soro Puku Ndị Ọrụ Ugbo Na Naịjíríà",
    ctaSub: "Mee mkpebi amamihe na Pangolin-x",
    getStarted: "Malite",
    checkWeather: "Lelee Ihu Igwe",
    getAIAdvice: "Nweta Ntuziaka AI",
    signUpFree: "Deba aha n'efu",
    checkYourWeather: "Lelee ihu igwe gị",
    features_local_weather: "Amụma Ihu Igwe Ebe",
    features_ai_advisor: "Onye Nduzi Mkpụrụ",
    features_multi_language: "Asụsụ Dị Iche",
    features_mobile: "Na-arụ Ọrụ Na Mobile",
    testimonials: "Ihe Ndị Ọrụ Ugbo Na-ekwu"
  },
  yo: {
    title: "Oju-ojo ọlọgbọn fun awọn agbe Naijiria",
    subtitle: "Maa ṣàkóso oju-ọjọ. Gba awọn asọtẹlẹ akoko gidi ati imọran oko AI fun agbegbe rẹ.",
    howItWorks: "Bí Pangolin-x Ṣe N ṣiṣẹ",
    howItWorksDesc: "Pangolin-x so awọn agbe pọ mọ imọ oju-ọjọ agbegbe ati imọran iṣẹ-ogbin AI.",
    features: "Awọn ẹya Agbara",
    featuresSub: "Gbogbo ohun ti o nilo fun ipinnu oko to dara",
    ctaTitle: "Darapọ mọ Ẹgbẹẹgbẹrun Awọn agbe Naijiria",
    ctaSub: "Ṣe ipinnu ọlọgbọn pẹlu Pangolin-x",
    getStarted: "Bẹrẹ",
    checkWeather: "Ṣayẹwo Oju-ojo",
    getAIAdvice: "Gba Imọran AI",
    signUpFree: "Forukọsilẹ Free",
    checkYourWeather: "Ṣayẹwo oju-ọjọ rẹ",
    features_local_weather: "Asọtẹlẹ Oju-Ojo Agbegbe",
    features_ai_advisor: "Oludamọran Oko AI",
    features_multi_language: "Ọpọlọpọ Ede",
    features_mobile: "Ore foonu alagbeka",
    testimonials: "Ohun ti Awọn Agbe sọ"
  },
  pg: {
    title: "Smart weather wey go help Naija farmers",
    subtitle: "Make you dey ahead of weather. Get correct forecasts and AI farming advice for your LG area.",
    howItWorks: "How Pangolin-x Dey Work",
    howItWorksDesc: "Pangolin-x dey connect farmers to local weather sense and AI farming advice.",
    features: "Strong Features",
    featuresSub: "Everything wey you need to make better farm decisions",
    ctaTitle: "Join Thousands of Naija Farmers",
    ctaSub: "Make better decisions with Pangolin-x",
    getStarted: "Start",
    checkWeather: "Check Weather",
    getAIAdvice: "Get AI Advice",
    signUpFree: "Sign Up Free",
    checkYourWeather: "Check Your Weather",
    features_local_weather: "Local Weather Forecast",
    features_ai_advisor: "AI Crop Advisor",
    features_multi_language: "Multi-Language",
    features_mobile: "Mobile Friendly",
    testimonials: "Wetins Farmers Talk"
  }
};

type LanguageContextType = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = (typeof window !== "undefined" && localStorage.getItem("pangolin_lang")) as Lang | null;
    if (stored && ["en","ha","ig","yo","pg"].includes(stored)) setLangState(stored);
    // else show modal elsewhere on first load
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("pangolin_lang", lang);
    }
  }, [lang]);

  const setLang = (l: Lang) => setLangState(l);
  const t = (key: string) => translations[lang][key] ?? key;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLang = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used within LanguageProvider");
  return ctx;
};
