"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Eye, EyeOff, KeyRound, Mail, Sprout, X } from "lucide-react";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const inputStyle = "mt-2 block w-full rounded-xl border border-[#d9e1d7] bg-white px-4 py-3 text-[#183127] outline-none transition placeholder:text-[#91a097] focus:border-[#4f7b55] focus:ring-4 focus:ring-[#4f7b55]/10";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [fpEmail, setFpEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      toast.success("Welcome back. Opening your farm overview…");
      router.push("/dashboard");
    } catch {
      toast.error("We could not sign you in. Check your email and password, then try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function sendReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await sendPasswordResetEmail(auth, fpEmail.trim());
      toast.success("Password reset instructions have been sent to your email.");
      setShowForgot(false);
    } catch {
      toast.error("We could not send a reset email. Check the address and try again.");
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f7f3] px-5 py-6 sm:px-8 sm:py-10">
      <ToastContainer position="top-center" />
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden rounded-[28px] border border-[#e1e7de] bg-white shadow-[0_24px_80px_rgba(24,49,39,.10)] lg:grid-cols-[.95fr_1.05fr]">
        <section className="relative hidden overflow-hidden bg-[#183127] p-10 text-white lg:flex lg:flex-col">
          <Image src="https://images.unsplash.com/photo-1464226184884-fa280b87c399?q=85&w=1200&auto=format&fit=crop" alt="Farmer walking through a green field" fill priority className="object-cover opacity-45" />
          <div className="absolute inset-0 bg-[#183127]/65" />
          <div className="relative flex items-center gap-3"><Image src="/Pangolin-x.png" alt="Pangolin-X" width={46} height={46} /><span className="text-lg font-extrabold">Pangolin-X</span></div>
          <div className="relative mt-auto max-w-md">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold"><Sprout className="h-3.5 w-3.5" /> Your farm, clearly understood</span>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-[-.04em]">Make every farm day count.</h1>
            <p className="mt-4 max-w-sm text-base leading-7 text-white/75">Weather, crop progress, practical advice and farm risks—kept together in one calm, useful place.</p>
            <div className="mt-8 grid grid-cols-3 gap-2 rounded-2xl border border-white/15 bg-[#10261a]/45 p-3 text-center text-xs backdrop-blur-sm"><div><p className="font-extrabold text-white">Local</p><p className="mt-1 text-white/55">weather</p></div><div className="border-x border-white/15"><p className="font-extrabold text-white">Farm</p><p className="mt-1 text-white/55">guidance</p></div><div><p className="font-extrabold text-white">Early</p><p className="mt-1 text-white/55">risk alerts</p></div></div>
          </div>
        </section>

        <section className="flex flex-col p-6 sm:p-10 lg:p-14">
          <div className="flex items-center justify-between lg:hidden"><Link href="/" className="flex items-center gap-2 font-extrabold text-[#183127]"><Image src="/Pangolin-x.png" alt="Pangolin-X" width={40} height={40} /> Pangolin-X</Link><Link href="/" className="text-sm font-semibold text-[#4f7b55]">Back home</Link></div>
          <div className="my-auto max-w-md">
            <p className="mt-12 text-sm font-bold uppercase tracking-[.14em] text-[#4f7b55] lg:mt-0">Welcome back</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-[-.04em] text-[#183127]">Sign in to your farm.</h2>
            <p className="mt-3 text-[15px] leading-6 text-[#617067]">Use the email and password you created when you joined Pangolin-X.</p>
            <form onSubmit={login} className="mt-8 space-y-5">
              <label className="block text-sm font-bold text-[#34473a]">Email address<div className="relative"><Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#718178]" /><input type="email" required autoComplete="email" className={`${inputStyle} pl-11`} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></div></label>
              <label className="block text-sm font-bold text-[#34473a]">Password<div className="relative"><KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#718178]" /><input type={showPassword ? "text" : "password"} required autoComplete="current-password" className={`${inputStyle} pl-11 pr-12`} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[#617067] hover:bg-[#edf2e8]">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></label>
              <div className="flex justify-end"><button type="button" className="text-sm font-bold text-[#3f6b47] hover:text-[#183127]" onClick={() => setShowForgot(true)}>Forgot your password?</button></div>
              <button disabled={isSubmitting} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#28533b] px-5 py-3.5 text-[15px] font-bold text-white transition hover:bg-[#183127] disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? "Signing you in…" : "Sign in"}<ArrowRight className="h-4 w-4" /></button>
            </form>
            <p className="mt-4 text-center text-xs leading-5 text-[#718178]">Your account is protected. We never share your farm information without permission.</p>
            <p className="mt-7 text-center text-sm text-[#617067]">New to Pangolin-X? <Link href="/signup" className="font-bold text-[#3f6b47] hover:text-[#183127]">Create your farm account</Link></p>
          </div>
        </section>
      </div>

      {showForgot && <div className="fixed inset-0 z-50 grid place-items-center bg-[#12251b]/45 p-5"><div role="dialog" aria-modal="true" aria-labelledby="reset-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><h3 id="reset-title" className="text-xl font-extrabold text-[#183127]">Reset your password</h3><p className="mt-2 text-sm leading-6 text-[#617067]">Enter the email linked to your Pangolin-X account.</p></div><button type="button" onClick={() => setShowForgot(false)} aria-label="Close" className="rounded-lg p-2 text-[#617067] hover:bg-[#edf2e8]"><X className="h-5 w-5" /></button></div><form onSubmit={sendReset} className="mt-5 space-y-4"><input type="email" required className={inputStyle} value={fpEmail} onChange={(event) => setFpEmail(event.target.value)} placeholder="you@example.com" /><button className="w-full rounded-xl bg-[#28533b] px-4 py-3 font-bold text-white hover:bg-[#183127]">Send reset instructions</button></form></div></div>}
    </main>
  );
}
