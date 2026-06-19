"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast, ToastContainer } from "react-toastify";
import { BarChart3, Users, LogOut, Menu, X } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [adminEmail, setAdminEmail] = useState("");

  useEffect(() => {
    // Get admin email from localStorage (set during login)
    const email = localStorage.getItem("adminEmail");
    if (email) setAdminEmail(email);
  }, []);

  async function handleLogout() {
    try {
      const response = await fetch("/api/admin/auth/logout", {
        method: "POST",
      });

      if (response.ok) {
        localStorage.removeItem("adminEmail");
        localStorage.removeItem("admin_token");
        toast.success("Logged out successfully");
        router.push("/admin/login");
      }
    } catch (err: unknown) {
      console.error("Logout error:", err);
      toast.error("Logout failed");
    }
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <ToastContainer />

      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } bg-gray-900 text-white transition-all duration-300 flex flex-col`}
      >
        <div className="p-4 flex items-center justify-between">
          {sidebarOpen && <h1 className="text-xl font-bold">Pangolin Admin</h1>}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hover:bg-gray-800 p-1 rounded"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-2">
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 transition"
          >
            <BarChart3 size={20} />
            {sidebarOpen && <span>Dashboard</span>}
          </Link>

          <Link
            href="/admin/farmers"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 transition"
          >
            <Users size={20} />
            {sidebarOpen && <span>Farmers</span>}
          </Link>
        </nav>

        <div className="px-2 py-4 border-t border-gray-700">
          <div className="mb-4">
            {sidebarOpen && (
              <p className="text-xs text-gray-400 truncate">{adminEmail}</p>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition text-sm"
          >
            <LogOut size={18} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
