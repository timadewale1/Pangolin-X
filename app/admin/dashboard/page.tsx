"use client";

import { useState, useEffect } from "react";
import { Users, Sprout, MapPin, TrendingUp } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";

interface Stats {
  totalFarmers: number;
  farmersByState: Record<string, number>;
  farmersByCrop: Record<string, number>;
  cropCounts: Record<string, number>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const response = await fetch("/api/admin/dashboard/stats");

      if (!response.ok) {
        throw new Error("Failed to fetch stats");
      }

      const data = await response.json();
      setStats(data.stats);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-600">Failed to load statistics</div>
      </div>
    );
  }

  const topStates = Object.entries(stats.farmersByState)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const topCrops = Object.entries(stats.farmersByCrop)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <ToastContainer />

      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <button
          onClick={fetchStats}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Refresh
        </button>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Farmers</p>
              <p className="text-4xl font-bold text-gray-900">
                {stats.totalFarmers}
              </p>
            </div>
            <Users size={48} className="text-blue-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total States</p>
              <p className="text-4xl font-bold text-gray-900">
                {Object.keys(stats.farmersByState).length}
              </p>
            </div>
            <MapPin size={48} className="text-green-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Crops Tracked</p>
              <p className="text-4xl font-bold text-gray-900">
                {Object.keys(stats.farmersByCrop).length}
              </p>
            </div>
            <Sprout size={48} className="text-amber-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Avg Farmers/State</p>
              <p className="text-4xl font-bold text-gray-900">
                {stats.totalFarmers > 0
                  ? (
                      stats.totalFarmers /
                      Object.keys(stats.farmersByState).length
                    ).toFixed(1)
                  : 0}
              </p>
            </div>
            <TrendingUp size={48} className="text-purple-500 opacity-20" />
          </div>
        </div>
      </div>

      {/* Top States and Crops */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">
            Top 5 States
          </h2>
          <div className="space-y-3">
            {topStates.map(([state, count]) => (
              <div key={state} className="flex justify-between items-center">
                <span className="text-gray-700">{state}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${(count / Math.max(...topStates.map((s) => s[1]))) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="font-semibold text-gray-900 w-10 text-right">
                    {count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">
            Top 5 Crops
          </h2>
          <div className="space-y-3">
            {topCrops.map(([crop, count]) => (
              <div key={crop} className="flex justify-between items-center">
                <span className="text-gray-700 capitalize">
                  {crop.replace(/_/g, " ")}
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{
                        width: `${(count / Math.max(...topCrops.map((c) => c[1]))) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="font-semibold text-gray-900 w-10 text-right">
                    {count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* All States Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">
          All States Breakdown
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">
                  State
                </th>
                <th className="px-6 py-3 text-right font-semibold text-gray-900">
                  Farmers
                </th>
                <th className="px-6 py-3 text-right font-semibold text-gray-900">
                  Percentage
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(stats.farmersByState)
                .sort((a, b) => b[1] - a[1])
                .map(([state, count]) => (
                  <tr key={state} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-3 text-gray-900">{state}</td>
                    <td className="px-6 py-3 text-right text-gray-900">
                      {count}
                    </td>
                    <td className="px-6 py-3 text-right text-gray-600">
                      {(
                        (count / stats.totalFarmers) *
                        100
                      ).toFixed(1)}
                      %
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
