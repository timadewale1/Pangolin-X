// app/login/page.tsx
"use client";
import { useState, type FormEvent } from "react";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [fpEmail, setFpEmail] = useState("");
  const router = useRouter();

  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("Login successful");
      router.push("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message || "Login failed");
    }
  }
  async function sendReset(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      await sendPasswordResetEmail(auth, fpEmail);
      toast.success(`Password reset email sent to ${fpEmail}`);
      setShowForgot(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message || "Reset failed");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <ToastContainer />
      <div className="max-w-md w-full bg-white p-6 rounded shadow">
        <h2 className="text-2xl font-semibold mb-4">Log in to your account</h2>
        <form onSubmit={login} className="space-y-3">
          <div>
            <label className="text-sm">Email</label>
            <input className="w-full border p-2 rounded mt-1" value={email} onChange={(e)=>setEmail(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Password</label>
            <input type="password" className="w-full border p-2 rounded mt-1" value={password} onChange={(e)=>setPassword(e.target.value)} />
          </div>
          <div className="flex justify-between items-center">
            <button className="bg-green-600 text-white px-4 py-2 rounded">Login</button>
            <button type="button" className="text-sm text-gray-600" onClick={()=>setShowForgot(true)}>Forgot password?</button>
          </div>
        </form>
        <p className="text-sm mt-4">Don&#39;t have an account? <a href="/signup" className="text-green-600">Create one</a></p>
      </div>

      {/* forgot password modal */}
      {showForgot && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 modal-root">
          <div className="bg-white p-6 rounded w-full max-w-md">
            <h3 className="text-lg font-semibold mb-2">Reset Password</h3>
            <p className="text-sm text-gray-600 mb-4">Enter the email associated with your account to receive a reset link.</p>
            <form onSubmit={sendReset} className="space-y-3">
              <input type="email" className="w-full border p-2 rounded" value={fpEmail} onChange={(e)=>setFpEmail(e.target.value)} placeholder="you@example.com" />
              <div className="flex justify-end gap-2">
                <button type="button" className="px-3 py-2 border rounded" onClick={()=>setShowForgot(false)}>Cancel</button>
                <button className="px-3 py-2 bg-green-600 text-white rounded">Send reset email</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
