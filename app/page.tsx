"use client";

import { useEffect, useRef, useState, type MouseEventHandler, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { Manrope } from "next/font/google";
import { useLanguage } from "@/context/LanguageContext";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useInView,
  useReducedMotion,
} from "framer-motion";
import LanguageButton from "@/components/LanguageButton";
import {
  FiLayers,
  FiTrendingUp,
  FiCpu,
  FiCloud,
  FiActivity,
  FiAlertTriangle,
  FiClock,
  FiSmartphone,
  FiUser,
  FiUsers,
  FiShield,
  FiFlag,
  FiChevronDown,
  FiArrowRight,
  FiMenu,
  FiX,
  FiCheck,
  FiGrid,
  FiEyeOff,
  FiFileText,
} from "react-icons/fi";

const manrope = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

/* ---------- Design tokens ----------
   ink          #14231A  primary text / dark sections
   green        #16A34A  bg tint #EFFBF2   — primary accent
   forest       #3F6212  bg tint #F1F5E9   — deep olive green
   soil         #8B5E34  bg tint #F6EFE5   — soil brown
   sand         #A9825E  bg tint #F8F3EA   — light clay/sand brown
   line         #E7E9E4
   All accents are greens or earth browns — no blue, pink, or orange in the palette.
------------------------------------- */

const img = {
  fields: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1600&auto=format&fit=crop",
  aerial: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1600&auto=format&fit=crop",
  weather: "https://images.unsplash.com/photo-1630260667842-830a17d12ec9?q=80&w=1400&auto=format&fit=crop",
  crop: "https://images.unsplash.com/photo-1725972281307-bc3da61c7575?q=80&w=1400&auto=format&fit=crop",
};

export default function Home() {
  const { lang } = useLanguage();
  return (
    <div key={lang} className={`${manrope.className} bg-white text-[#14231A] overflow-x-hidden`}>
      <GlobalStyles />
      <Nav />
      <Hero />
      <TheChallenge />
      <Introducing />
      <Features />
      <HowItWorks />
      <WhoItsFor />
      <EnvironmentalIntelligence />
      <AIAdvisory />
      <WhyChoose />
      <Pricing />
      <Vision />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
}

/* ============================= SHARED MOTION HELPERS ============================= */

type Direction = "up" | "down" | "left" | "right" | "scale";

const directionOffsets: Record<Direction, { opacity: number; y?: number; x?: number; scale?: number }> = {
  up: { opacity: 0, y: 32 },
  down: { opacity: 0, y: -32 },
  left: { opacity: 0, x: -48 },
  right: { opacity: 0, x: 48 },
  scale: { opacity: 0, scale: 0.9 },
};

function FadeIn({
  children,
  delay = 0,
  dir = "up",
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  dir?: Direction;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? {} : directionOffsets[dir]}
      whileInView={{ opacity: 1, y: 0, x: 0, scale: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Float({
  children,
  className = "",
  duration = 7,
  distance = 14,
}: {
  children?: ReactNode;
  className?: string;
  duration?: number;
  distance?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      animate={reduce ? {} : { y: [0, -distance, 0] }}
      transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}

function Counter({
  value,
  suffix = "",
  duration = 1.4,
  className = "",
}: {
  value: number;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState<number>(reduce ? value : 0);

  useEffect(() => {
    if (!isInView || reduce) return;
    let start: number | undefined;
    let raf = 0;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - (start ?? ts)) / (duration * 1000), 1);
      setDisplay(Math.floor(progress * value));
      if (progress < 1) raf = window.requestAnimationFrame(step);
      else setDisplay(value);
    };
    raf = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(raf);
  }, [duration, isInView, reduce, value]);

  return (
    <span ref={ref} className={className}>
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}

function CheckItem({
  children,
  tone = "#16A34A",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        className="mt-0.5 flex items-center justify-center w-5 h-5 rounded-full shrink-0"
        style={{ backgroundColor: `${tone}22`, color: tone }}
      >
        <FiCheck size={12} strokeWidth={3} />
      </span>
      <span>{children}</span>
    </li>
  );
}

function GlobalStyles() {
  return (
    <style jsx global>{`
      @keyframes kenburns {
        0% { transform: scale(1); }
        100% { transform: scale(1.09); }
      }
      .kenburns {
        animation: kenburns 18s ease-in-out infinite alternate;
      }
      :focus-visible {
        outline: 2px solid #16a34a;
        outline-offset: 2px;
        border-radius: 4px;
      }
      @media (prefers-reduced-motion: reduce) {
        .kenburns { animation: none !important; }
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
          scroll-behavior: auto !important;
        }
      }
    `}</style>
  );
}

/* ============================= NAV ============================= */

function NavLink({
  href,
  children,
  light,
  onClick,
}: {
  href: string;
  children: ReactNode;
  light: boolean;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={`relative group text-[15px] font-medium transition-colors ${
        light ? "text-white/90 hover:text-white" : "text-[#14231A]/70 hover:text-[#14231A]"
      }`}
    >
      {children}
      <span
        className={`absolute left-0 -bottom-1.5 h-[1.5px] w-0 group-hover:w-full transition-all duration-300 ${
          light ? "bg-white" : "bg-[#16A34A]"
        }`}
      />
    </a>
  );
}

function Nav() {
  const { t } = useLanguage();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const light = !scrolled && !menuOpen;

  const links = [
    { href: "#platform", label: t("features") },
    { href: "#how-it-works", label: t("howItWorks") },
    { href: "#who-its-for", label: t("who_its_for") },
    { href: "#pricing", label: t("pricing_title") },
    { href: "#faq", label: t("faq") },
  ];

  return (
    <>
      <nav
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled || menuOpen
            ? "bg-white/90 backdrop-blur-md border-b border-[#E7E9E4] shadow-[0_1px_0_rgba(0,0,0,0.03)]"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Image src="/Pangolin-x.png" alt="Pangolin-X" width={56} height={56} priority className="drop-shadow-sm z-10" />

          <div className="hidden md:flex items-center gap-8">
            {links.map((l) => (
              <NavLink key={l.href} href={l.href} light={light}>{l.label}</NavLink>
            ))}
            <LanguageButton />
          </div>

          <div className="hidden md:flex items-center gap-2">
            <Link href="/login">
              <button
                className={`px-4 py-2 text-[15px] font-medium transition-colors ${
                  light ? "text-white/90 hover:text-white" : "text-[#14231A] hover:text-[#16A34A]"
                }`}
              >
                {t("login")}
              </button>
            </Link>
            <Link href="/signup">
              <button className="inline-flex items-center gap-2 bg-[#16A34A] hover:bg-[#0F7A38] text-white px-5 py-2.5 rounded-full text-[15px] font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-green-900/20 hover:scale-[1.03] active:scale-[0.98]">
                {t("getStarted")}
              </button>
            </Link>
          </div>

          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className={`md:hidden relative z-10 w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
              light ? "text-white" : "text-[#14231A]"
            }`}
          >
            {menuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-40 bg-white flex flex-col pt-24 px-8 md:hidden"
          >
            <div className="flex flex-col gap-1">
              {links.map((l, i) => (
                <motion.a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 * i, duration: 0.35 }}
                  className="text-2xl font-semibold py-3 border-b border-[#E7E9E4] text-[#14231A]"
                >
                  {l.label}
                </motion.a>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.35 }}
              className="mt-8 flex flex-col gap-3"
            >
              <Link href="/login" onClick={() => setMenuOpen(false)}>
                <button className="w-full text-center py-3.5 rounded-full border border-[#E7E9E4] text-[16px] font-semibold">
                  {t("login")}
                </button>
              </Link>
              <Link href="/signup" onClick={() => setMenuOpen(false)}>
                <button className="w-full text-center py-3.5 rounded-full bg-[#16A34A] text-white text-[16px] font-semibold">
                  {t("getStarted")}
                </button>
              </Link>
              <div className="pt-2">
                <LanguageButton />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ============================= HERO ============================= */

function Hero() {
  const { t } = useLanguage();
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, 160]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.6]);

  return (
    <section ref={ref} className="relative isolate min-h-screen md:h-[92vh] w-full overflow-hidden flex flex-col">
      <motion.div style={{ y }} className="absolute inset-0 z-0">
        <Image
          src={img.fields}
          alt="Farmland monitored by Pangolin-X"
          fill
          priority
          sizes="100vw"
          className="object-cover kenburns"
        />
        <motion.div
          style={{ opacity: overlayOpacity }}
          className="absolute inset-0 bg-gradient-to-b from-[#0B160D]/25 via-[#0B160D]/55 to-[#0B160D]/85"
        />
      </motion.div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center pt-24 pb-10">
        <motion.h1
          initial={reduce ? {} : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-[38px] leading-[1.08] md:text-[68px] md:leading-[1.03] font-extrabold tracking-tight text-white max-w-4xl"
        >
          {t("title")}
        </motion.h1>

        <motion.p
          initial={reduce ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 text-base md:text-xl text-white/80 max-w-xl leading-relaxed"
        >
          {t("subtitle")}
        </motion.p>

        <motion.div
          initial={reduce ? {} : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="mt-9 flex items-center justify-center gap-4"
        >
          <Link href="/signup">
            <button className="inline-flex items-center gap-2 bg-[#16A34A] hover:bg-[#0F7A38] text-white px-7 py-3.5 rounded-full text-[16px] font-semibold transition-all duration-200 hover:shadow-xl hover:shadow-green-900/30 hover:scale-[1.03] active:scale-[0.98]">
              {t("getStarted")}
              <FiArrowRight size={16} />
            </button>
          </Link>
          <a
            href="#how-it-works"
            className="text-[16px] font-semibold text-white inline-flex items-center gap-1.5 border-b border-white/0 hover:border-white/60 transition-all"
          >
            {t("howItWorks")} <span aria-hidden>→</span>
          </a>
        </motion.div>
      </div>

      <motion.div
        initial={reduce ? {} : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.5 }}
        className="relative z-10 border-t border-white/15 bg-black/25 backdrop-blur-[2px]"
      >
        <div className="container mx-auto px-6 grid grid-cols-2 md:grid-cols-4 divide-x divide-white/15">
          {[
            { n: 36, suffix: "", l: t("states_covered") },
            { n: 12400, suffix: "+", l: t("farmers_onboarded") },
            { n: 98, suffix: "%", l: t("forecast_accuracy") },
          ].map((s) => (
            <div key={s.l} className="px-4 py-4 md:py-5 text-center">
              <p className="text-lg md:text-2xl font-extrabold text-white">
                <Counter value={s.n} suffix={s.suffix} />
              </p>
              <p className="text-[10px] md:text-xs text-white/60 mt-1">{s.l}</p>
            </div>
          ))}
          <div className="px-4 py-4 md:py-5 text-center">
            <p className="text-lg md:text-2xl font-extrabold text-white">24/7</p>
            <p className="text-[10px] md:text-xs text-white/60 mt-1">{t("features_ai_advisor")}</p>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

/* ============================= THE CHALLENGE (redone) ============================= */

function TheChallenge() {
  const { t } = useLanguage();
  const problems = [
    { icon: FiGrid, title: "Fragmented tools", desc: "Weather apps, advisory hotlines, and paper records that don't talk to each other.", bg: "#F1F5E9", tone: "#3F6212" },
    { icon: FiClock, title: "Delayed guidance", desc: "By the time advice reaches a farmer, the window to act on it has often closed.", bg: "#F6EFE5", tone: "#8B5E34" },
    { icon: FiEyeOff, title: "Invisible risk", desc: "Environmental stress builds gradually — by the time it's visible, yield is already affected.", bg: "#F8F3EA", tone: "#A9825E" },
    { icon: FiFileText, title: "Manual record-keeping", desc: "Crop history lives in notebooks, not in a system anyone can act on.", bg: "#EFFBF2", tone: "#16A34A" },
  ];
  const problemText = [
    { title: t("features_local_weather"), desc: t("features_local_weather_desc") },
    { title: t("forecast_advisory"), desc: t("forecast_ops_desc") },
    { title: t("fragility_tab"), desc: t("structured_scoring") },
    { title: t("history_tab"), desc: t("home_record_copy") },
  ];

  return (
    <section className="bg-white py-24 md:py-32">
      <div className="container mx-auto px-6">
        <FadeIn dir="up" className="max-w-2xl mx-auto text-center mb-16">
          <span className="text-sm font-semibold text-[#16A34A] uppercase tracking-wide">{t("home_challenge")}</span>
          <h2 className="mt-3 text-[32px] md:text-[46px] font-extrabold tracking-tight leading-[1.1]">
            {t("home_challenge_title")}
          </h2>
          <p className="mt-4 text-lg text-[#14231A]/60">
            {t("home_challenge_copy")}
          </p>
        </FadeIn>

        <div className="max-w-5xl mx-auto grid sm:grid-cols-2 gap-5">
          {problems.map((p, i) => (
            <FadeIn key={problemText[i].title} dir={i % 2 === 0 ? "left" : "right"} delay={Math.floor(i / 2) * 0.1}>
              <div
                className="h-full rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl"
                style={{ backgroundColor: p.bg }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center bg-white"
                  style={{ color: p.tone }}
                >
                  <p.icon size={22} strokeWidth={1.8} />
                </div>
                <h3 className="text-xl font-bold mt-5">{problemText[i].title}</h3>
                <p className="text-[15px] text-[#14231A]/65 mt-2 leading-relaxed">{problemText[i].desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================= INTRODUCING ============================= */

function Introducing() {
  const { t } = useLanguage();
  return (
    <section id="platform" className="relative bg-[#EFFBF2] py-24 md:py-32 overflow-hidden">
      <Float className="absolute -top-10 -right-10 w-72 h-72 rounded-full bg-[#16A34A]/10 blur-3xl" duration={9} />
      <Float className="absolute bottom-0 -left-16 w-64 h-64 rounded-full bg-[#8B5E34]/10 blur-3xl" duration={11} distance={20} />

      <div className="container mx-auto px-6 relative">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 md:gap-16 items-center">
          <FadeIn dir="left">
            <h2 className="text-[32px] md:text-[44px] font-extrabold leading-[1.1] tracking-tight">
              {t("home_platform_title")}
              <br />
              {t("home_platform_title_end")}
            </h2>
            <p className="mt-6 text-lg text-[#14231A]/60 leading-relaxed max-w-md">
              {t("home_platform_copy")}
            </p>
            <p className="hidden">
              Pangolin-X isn&apos;t a weather app. It connects crop management,
              weather intelligence, environmental monitoring, and AI advisory
              into a single system — so decisions are based on current
              conditions, not guesswork.
            </p>
            <p className="mt-4 text-lg text-[#14231A]/60 leading-relaxed max-w-md">
              {t("home_platform_copy_two")}
            </p>
            <p className="hidden">
              Weather is one input among several. What matters is what the
              platform does with it.
            </p>
          </FadeIn>

          <FadeIn dir="right" delay={0.1}>
            <div className="relative rounded-[24px] overflow-hidden h-[320px] md:h-[420px] shadow-xl shadow-green-950/10 group">
              <Image
                src={img.aerial}
                alt={t("home_alt_aerial")}
                fill
                unoptimized
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

/* ============================= FEATURES ============================= */

function Features() {
  const { t } = useLanguage();
  const features = [
    { icon: FiLayers, title: t("crops_tab"), desc: t("cropAdviceDesc"), bg: "#EFFBF2", tone: "#16A34A" },
    { icon: FiTrendingUp, title: t("growth_stage"), desc: t("crop_route_subtitle"), bg: "#F6EFE5", tone: "#8B5E34" },
    { icon: FiCpu, title: t("features_ai_advisor"), desc: t("features_ai_advisor_desc"), bg: "#F1F5E9", tone: "#3F6212" },
    { icon: FiCloud, title: t("features_local_weather"), desc: t("features_local_weather_desc"), bg: "#F8F3EA", tone: "#A9825E" },
    { icon: FiActivity, title: t("soil_summary"), desc: t("soil_generic_desc"), bg: "#F6EFE5", tone: "#8B5E34" },
    { icon: FiAlertTriangle, title: t("fragility_tab"), desc: t("pricing_feature_alerts"), bg: "#F8F3EA", tone: "#A9825E" },
    { icon: FiClock, title: t("history_tab"), desc: t("features_ai_advisor_desc"), bg: "#EFFBF2", tone: "#16A34A" },
    { icon: FiSmartphone, title: t("features_multi_language"), desc: t("features_multi_language_desc"), bg: "#F1F5E9", tone: "#3F6212" },
  ];

  return (
    <section className="bg-white py-24 md:py-32">
      <div className="container mx-auto px-6">
        <FadeIn dir="up" className="max-w-2xl mx-auto text-center mb-16">
          <h2 className="text-[32px] md:text-[44px] font-extrabold tracking-tight leading-[1.1]">
            {t("features")}
          </h2>
          <p className="mt-4 text-lg text-[#14231A]/60">
            {t("featuresSub")}
          </p>
        </FadeIn>

        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f, i) => (
            <FadeIn key={f.title} dir={i % 2 === 0 ? "left" : "right"} delay={Math.floor(i / 2) * 0.06}>
              <div
                className="group h-full rounded-2xl p-7 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl"
                style={{ backgroundColor: f.bg }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center bg-white transition-transform duration-300 group-hover:scale-110"
                  style={{ color: f.tone }}
                >
                  <f.icon size={20} strokeWidth={1.8} />
                </div>
                <h3 className="text-[16px] font-semibold mt-5">{f.title}</h3>
                <p className="text-[14px] text-[#14231A]/60 mt-2 leading-relaxed">{f.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================= HOW IT WORKS ============================= */

function HowItWorks() {
  const { t } = useLanguage();
  const steps = [
    { n: "01", title: t("how_step1"), desc: t("how_step1_desc"), bg: "#EFFBF2", tone: "#16A34A" },
    { n: "02", title: t("how_step2"), desc: t("how_step2_desc"), bg: "#F6EFE5", tone: "#8B5E34" },
    { n: "03", title: t("how_step3"), desc: t("how_step3_desc"), bg: "#F1F5E9", tone: "#3F6212" },
  ];

  return (
    <section id="how-it-works" className="bg-white py-24 md:py-32">
      <div className="container mx-auto px-6">
        <FadeIn dir="up" className="max-w-2xl mx-auto text-center mb-16">
          <h2 className="text-[32px] md:text-[44px] font-extrabold tracking-tight leading-[1.1]">
            {t("howItWorks")}
          </h2>
        </FadeIn>

        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <FadeIn key={s.n} dir="scale" delay={i * 0.12}>
              <div className="h-full rounded-2xl p-9 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl" style={{ backgroundColor: s.bg }}>
                <span
                  className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white text-sm font-bold"
                  style={{ color: s.tone }}
                >
                  {s.n}
                </span>
                <h3 className="text-xl font-bold mt-5">{s.title}</h3>
                <p className="text-[15px] text-[#14231A]/60 mt-2 leading-relaxed">{s.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================= WHO IT'S FOR ============================= */

function WhoItsFor() {
  const { t } = useLanguage();
  const groups = [
    { icon: FiUser, title: "Farmers", desc: "Manage crops and get guidance built around your specific farm.", bg: "#EFFBF2", tone: "#16A34A" },
    { icon: FiUsers, title: "Cooperatives & agribusinesses", desc: "Coordinate advisory across many farms from one place.", bg: "#F6EFE5", tone: "#8B5E34" },
    { icon: FiShield, title: "NGOs", desc: "Monitor engagement and outcomes across a farming programme.", bg: "#F1F5E9", tone: "#3F6212" },
    { icon: FiFlag, title: "Government agencies", desc: "Oversee agricultural initiatives with real operational data.", bg: "#F8F3EA", tone: "#A9825E" },
  ];
  const groupText = [
    { title: t("home_farmers"), desc: t("home_farmers_copy") },
    { title: t("home_groups"), desc: t("home_groups_copy") },
    { title: t("home_ngos"), desc: t("home_ngos_copy") },
    { title: t("home_agencies"), desc: t("home_agencies_copy") },
  ];

  return (
    <section id="who-its-for" className="bg-[#F7F8F6] py-24 md:py-32">
      <div className="container mx-auto px-6">
        <FadeIn dir="up" className="max-w-2xl mx-auto text-center mb-16">
          <h2 className="text-[32px] md:text-[44px] font-extrabold tracking-tight leading-[1.1]">
            {t("home_ecosystem_title")}
          </h2>
          <p className="mt-4 text-lg text-[#14231A]/60">
            {t("home_ecosystem_copy")}
          </p>
        </FadeIn>

        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {groups.map((g, i) => (
            <FadeIn key={groupText[i].title} dir={i % 2 === 0 ? "left" : "right"} delay={Math.floor(i / 2) * 0.08}>
              <div className="group h-full rounded-2xl p-7 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl" style={{ backgroundColor: g.bg }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-white transition-transform duration-300 group-hover:scale-110" style={{ color: g.tone }}>
                  <g.icon size={20} strokeWidth={1.8} />
                </div>
                <h3 className="text-[16px] font-semibold mt-5">{groupText[i].title}</h3>
                <p className="text-[14px] text-[#14231A]/60 mt-2 leading-relaxed">{groupText[i].desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================= ENVIRONMENTAL & WEATHER INTELLIGENCE ============================= */

function EnvironmentalIntelligence() {
  const { t } = useLanguage();
  return (
    <section className="bg-[#F1F5E9] py-24 md:py-32">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 md:gap-16 items-center">
          <FadeIn dir="left" className="order-2 md:order-1">
            <div className="relative rounded-[24px] overflow-hidden h-[320px] md:h-[420px] shadow-xl shadow-emerald-950/10 group">
              <Image
                src={img.weather}
                alt={t("home_alt_weather")}
                fill
                unoptimized
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
          </FadeIn>

          <FadeIn dir="right" delay={0.1} className="order-1 md:order-2">
            <h2 className="text-[32px] md:text-[44px] font-extrabold leading-[1.1] tracking-tight">
              {t("home_environment_title")}
            </h2>
            <p className="mt-6 text-lg text-[#14231A]/60 leading-relaxed max-w-md">
              {t("home_environment_copy")}
            </p>
            <p className="hidden">
              Pangolin-X tracks hyper-local weather alongside environmental
              fragility signals — rainfall variability, temperature stress,
              and soil-moisture trends — so risk is visible while there&apos;s
              still time to respond.
            </p>
            <ul className="mt-6 space-y-3 text-[15px] text-[#14231A]/70">
              <CheckItem tone="#3F6212">{t("features_local_weather")}</CheckItem>
              <CheckItem tone="#3F6212">{t("fragility_tab")}</CheckItem>
              <CheckItem tone="#3F6212">{t("history_tab")}</CheckItem>
            </ul>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

/* ============================= AI ADVISORY ============================= */

function AIAdvisory() {
  const { t } = useLanguage();
  return (
    <section className="bg-[#F6EFE5] py-24 md:py-32">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 md:gap-16 items-center">
          <FadeIn dir="left">
            <h2 className="text-[32px] md:text-[44px] font-extrabold leading-[1.1] tracking-tight">
              {t("home_advisory_title")}
            </h2>
            <p className="mt-6 text-lg text-[#14231A]/60 leading-relaxed max-w-md">
              {t("home_advisory_copy")}
            </p>
            <p className="hidden">
              Recommendations are generated from your crop type, growth
              stage, location, and current conditions — not generic advice.
              Every recommendation is logged, so guidance improves the longer
              you use it.
            </p>
            <ul className="mt-6 space-y-3 text-[15px] text-[#14231A]/70">
              <CheckItem tone="#8B5E34">{t("features_ai_advisor")}</CheckItem>
              <CheckItem tone="#8B5E34">{t("features_multi_language")}</CheckItem>
              <CheckItem tone="#8B5E34">{t("history_tab")}</CheckItem>
            </ul>
          </FadeIn>

          <FadeIn dir="right" delay={0.1}>
            <div className="relative rounded-[24px] overflow-hidden h-[320px] md:h-[420px] shadow-xl shadow-stone-950/10 group">
              <Image
                src={img.crop}
                alt={t("home_alt_crop")}
                fill
                unoptimized
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

/* ============================= WHY CHOOSE ============================= */

function WhyChoose() {
  const { t } = useLanguage();
  const localizedRows = [
    { label: t("home_compare_coverage"), old: t("home_compare_old_weather"), pgx: t("home_compare_coverage_pgx") },
    { label: t("home_compare_guidance"), old: t("home_compare_old_generic"), pgx: t("home_compare_guidance_pgx") },
    { label: t("home_compare_records"), old: t("home_compare_old_records"), pgx: t("home_compare_records_pgx") },
    { label: t("home_compare_oversight"), old: t("home_compare_old_oversight"), pgx: t("home_compare_oversight_pgx") },
    { label: t("home_compare_access"), old: t("home_compare_old_access"), pgx: t("home_compare_access_pgx") },
  ];

  return (
    <section className="bg-white py-24 md:py-32">
      <div className="container mx-auto px-6">
        <FadeIn dir="up" className="max-w-2xl mx-auto text-center mb-16">
          <h2 className="text-[32px] md:text-[44px] font-extrabold tracking-tight leading-[1.1]">
            {t("home_why_title")}
          </h2>
          <p className="mt-4 text-lg text-[#14231A]/60">
            {t("home_why_copy")}
          </p>
        </FadeIn>

        <FadeIn dir="scale" delay={0.1} className="max-w-4xl mx-auto rounded-[24px] border border-[#E7E9E4] overflow-hidden bg-[#F7F8F6] shadow-sm">
          <div className="grid grid-cols-[1fr_1.2fr_1.2fr] text-[13px] font-semibold text-[#14231A]/40 uppercase tracking-wide px-6 md:px-8 py-4 border-b border-[#E7E9E4] bg-white">
            <span></span>
            <span>{t("home_typical_tools")}</span>
            <span className="text-[#16A34A]">Pangolin-X</span>
          </div>
          {localizedRows.map((r) => (
            <div
              key={r.label}
              className="grid grid-cols-[1fr_1.2fr_1.2fr] px-6 md:px-8 py-5 border-b border-[#E7E9E4] last:border-0 text-[14px] md:text-[15px] bg-white transition-colors hover:bg-[#EFFBF2]/50"
            >
              <span className="font-semibold pr-2">{r.label}</span>
              <span className="text-[#14231A]/45 pr-2">{r.old}</span>
              <span className="text-[#16A34A] font-medium">{r.pgx}</span>
            </div>
          ))}
        </FadeIn>
      </div>
    </section>
  );
}

/* ============================= PRICING ============================= */

function Pricing() {
  const { t } = useLanguage();
  return (
    <section id="pricing" className="bg-[#F7F8F6] py-24 md:py-32">
      <div className="container mx-auto px-6">
        <FadeIn dir="up" className="max-w-2xl mx-auto text-center mb-16">
          <h2 className="text-[32px] md:text-[44px] font-extrabold tracking-tight leading-[1.1]">
            {t("pricing_title")}
          </h2>
          <p className="mt-4 text-lg text-[#14231A]/60">
            {t("pricing_subtitle")}
          </p>
        </FadeIn>

        <div className="max-w-3xl mx-auto grid sm:grid-cols-2 gap-6">
          <FadeIn dir="left">
            <div className="h-full bg-white border border-[#E7E9E4] rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl">
              <p className="text-sm text-[#14231A]/50 font-medium">{t("pricing_monthly_label")}</p>
              <p className="text-4xl font-extrabold mt-2">₦1,500</p>
              <p className="text-sm text-[#14231A]/50 mt-1">{t("pricing_monthly_period")}</p>
              <ul className="mt-6 space-y-2.5 text-[14px]">
                <CheckItem tone="#14231A">{t("pricing_feature_ai")}</CheckItem>
                <CheckItem tone="#14231A">{t("pricing_feature_weather")}</CheckItem>
                <CheckItem tone="#14231A">{t("pricing_feature_alerts")}</CheckItem>
              </ul>
              <Link href="/signup">
                <button className="mt-8 w-full bg-[#14231A] hover:bg-black text-white px-6 py-3 rounded-full text-[15px] font-semibold transition-all duration-200 hover:scale-[1.02]">
                  {t("pricing_signup_monthly")}
                </button>
              </Link>
            </div>
          </FadeIn>

          <FadeIn dir="right" delay={0.1}>
            <div className="h-full bg-[#EFFBF2] border-2 border-[#16A34A] rounded-2xl p-8 relative transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl">
              <span className="absolute -top-3 left-8 bg-[#16A34A] text-white text-xs font-semibold px-3 py-1 rounded-full">
                {t("pricing_feature_best_value")}
              </span>
              <p className="text-sm text-[#14231A]/50 font-medium">{t("pricing_yearly_label")}</p>
              <p className="text-4xl font-extrabold mt-2">₦15,000</p>
              <p className="text-sm text-[#14231A]/50 mt-1">{t("pricing_yearly_period")}</p>
              <ul className="mt-6 space-y-2.5 text-[14px]">
                <CheckItem>{t("pricing_feature_all")}</CheckItem>
                <CheckItem>{t("pricing_feature_priority_support")}</CheckItem>
                <CheckItem>{t("history_tab")}</CheckItem>
              </ul>
              <Link href="/signup">
                <button className="mt-8 w-full bg-[#16A34A] hover:bg-[#0F7A38] text-white px-6 py-3 rounded-full text-[15px] font-semibold transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-green-900/20">
                  {t("pricing_signup_yearly")}
                </button>
              </Link>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

/* ============================= VISION ============================= */

function Vision() {
  const { t } = useLanguage();
  return (
    <section className="relative bg-gradient-to-br from-[#14231A] via-[#0F1C13] to-[#0B160D] text-white py-24 md:py-36 overflow-hidden">
      <Float className="absolute top-10 right-10 w-80 h-80 rounded-full bg-[#16A34A]/10 blur-3xl" duration={10} distance={18} />
      <Float className="absolute -bottom-10 left-0 w-72 h-72 rounded-full bg-[#8B5E34]/10 blur-3xl" duration={12} distance={22} />

      <div className="container mx-auto px-6 relative">
        <FadeIn dir="scale" className="max-w-3xl mx-auto text-center">
          <p className="text-[26px] md:text-[38px] leading-[1.3] md:leading-[1.35] font-medium">
            {t("home_vision")}
          </p>
          <p className="hidden">
            Agriculture doesn&apos;t lack effort. It lacks infrastructure that
            turns information into action. Pangolin-X is built to be that
            infrastructure — one farm, one cooperative, one programme at a
            time.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}

/* ============================= FAQ ============================= */

function FAQ() {
  const { t } = useLanguage();
  const localizedItems = [
    { q: t("home_faq_one_q"), a: t("home_faq_one_a") },
    { q: t("home_faq_two_q"), a: t("home_faq_two_a") },
    { q: t("home_faq_three_q"), a: t("home_faq_three_a") },
    { q: t("home_faq_four_q"), a: t("home_faq_four_a") },
    { q: t("home_faq_five_q"), a: t("home_faq_five_a") },
  ];

  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="bg-white py-24 md:py-32">
      <div className="container mx-auto px-6">
        <FadeIn dir="up" className="max-w-2xl mx-auto text-center mb-16">
          <h2 className="text-[32px] md:text-[44px] font-extrabold tracking-tight leading-[1.1]">
            {t("faq")}
          </h2>
        </FadeIn>

        <FadeIn dir="up" delay={0.1} className="max-w-2xl mx-auto rounded-[24px] border border-[#E7E9E4] bg-[#F7F8F6] overflow-hidden shadow-sm">
          {localizedItems.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q} className="border-b border-[#E7E9E4] last:border-0">
                <button
                  onClick={() => setOpen((current) => (current === i ? null : i))}
                  className="w-full flex items-center justify-between gap-6 px-6 md:px-8 py-6 text-left transition-colors hover:bg-white"
                  aria-expanded={isOpen}
                >
                  <span className="text-[16px] md:text-[17px] font-semibold">{item.q}</span>
                  <FiChevronDown
                    size={18}
                    className={`shrink-0 transition-transform duration-300 text-[#16A34A] ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                <motion.div
                  initial={false}
                  animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden bg-white"
                >
                  <p className="text-[15px] text-[#14231A]/60 leading-relaxed px-6 md:px-8 pb-6 pr-10">{item.a}</p>
                </motion.div>
              </div>
            );
          })}
        </FadeIn>
      </div>
    </section>
  );
}

/* ============================= FINAL CTA ============================= */

function FinalCTA() {
  const { t } = useLanguage();
  return (
    <section className="relative bg-gradient-to-br from-[#16A34A] to-[#0F7A38] py-28 md:py-36 overflow-hidden">
      <Float className="absolute -top-16 -left-10 w-72 h-72 rounded-full bg-white/10 blur-3xl" duration={9} />
      <Float className="absolute -bottom-20 right-0 w-80 h-80 rounded-full bg-[#14231A]/15 blur-3xl" duration={11} distance={18} />

      <div className="container mx-auto px-6 relative">
        <FadeIn dir="scale" className="max-w-2xl mx-auto text-center">
          <h2 className="text-[32px] md:text-[46px] font-extrabold tracking-tight leading-[1.1] text-white">
            {t("ctaTitle")}
          </h2>
          <p className="mt-4 text-lg text-white/80">
            {t("ctaSub")}
          </p>
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup">
              <button className="inline-flex items-center gap-2 bg-white text-[#0F7A38] px-7 py-3.5 rounded-full text-[16px] font-semibold transition-all duration-200 hover:shadow-xl hover:shadow-black/20 hover:scale-[1.03] active:scale-[0.98]">
                {t("getStarted")} <FiArrowRight size={16} />
              </button>
            </Link>
            <a href="#contact" className="text-[16px] font-semibold text-white border-b border-white/0 hover:border-white/60 transition-all">
              Talk to our team →
            </a>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* ============================= FOOTER ============================= */

function Footer() {
  const { t } = useLanguage();
  return (
    <footer id="contact" className="bg-[#14231A] text-white py-16">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-12">
          <div className="md:col-span-1">
            <div className="flex items-center gap-3">
              <Image src="/Pangolin-x.png" alt="Pangolin-X" width={52} height={52} />
              <h3 className="text-xl font-bold">Pangolin-X</h3>
            </div>
            <p className="text-white/50 text-sm mt-4 leading-relaxed">
              Agricultural intelligence for farmers, cooperatives, and the
              programmes that support them.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white/40 uppercase tracking-wide mb-4">{t("home_platform")}</h4>
            <ul className="text-white/60 text-sm space-y-2.5">
              <li><a href="#platform" className="hover:text-white transition-colors">{t("overview_tab")}</a></li>
              <li><a href="#how-it-works" className="hover:text-white transition-colors">{t("howItWorks")}</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">{t("pricing_title")}</a></li>
              <li><Link href="/signup" className="hover:text-white transition-colors">{t("signUp")}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white/40 uppercase tracking-wide mb-4">{t("home_legal")}</h4>
            <ul className="text-white/60 text-sm space-y-2.5">
              <li><a href="/legal/terms" className="hover:text-white transition-colors">{t("home_terms")}</a></li>
              <li><a href="/legal/privacy" className="hover:text-white transition-colors">{t("home_privacy")}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white/40 uppercase tracking-wide mb-4">{t("home_contact")}</h4>
            <ul className="text-white/60 text-sm space-y-2.5">
              <li>contact@pangolin-x.com</li>
              <li>+234 806 193 5246</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-14 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-white/40 text-sm">
          <p>{t("home_rights")}</p>
        </div>
      </div>
    </footer>
  );
}
