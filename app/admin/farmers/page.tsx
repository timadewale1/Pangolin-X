"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast, ToastContainer } from "react-toastify";
import { Search, ChevronLeft, ChevronRight, Eye, Trash2 } from "lucide-react";

interface Farmer {
  id: string;
  name: string;
  email: string;
  state: string;
  lga: string;
  crops: string[];
  phone?: string;
  createdAt?: string;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function FarmersPage() {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [cropFilter, setCropFilter] = useState("");
  const [states, setStates] = useState<string[]>([]);
  const [crops, setCrops] = useState<string[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchFarmers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, stateFilter, cropFilter]);

  async function fetchFarmers() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });

      if (stateFilter) params.append("state", stateFilter);
      if (cropFilter) params.append("crop", cropFilter);

      const response = await fetch(`/api/admin/farmers?${params}`);

      if (!response.ok) {
        throw new Error("Failed to fetch farmers");
      }

      const data = await response.json();
      setFarmers(data.farmers);
      setPagination(data.pagination);

      // Extract unique states and crops
      if (page === 1) {
        const uniqueStates = [...new Set(data.farmers.map((f: Farmer) => f.state))] as string[];
        const uniqueCrops = [
          ...new Set(
            data.farmers.flatMap((f: Farmer) => f.crops || [])
          ),
        ] as string[];
        setStates(uniqueStates.sort());
        setCrops(uniqueCrops.sort());
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteFarmer(farmerId: string) {
    if (!confirm("Are you sure you want to delete this farmer?")) return;

    setDeleting(farmerId);
    try {
      const response = await fetch(
        `/api/admin/farmers/${farmerId}/delete`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete farmer");
      }

      toast.success("Farmer deleted successfully");
      fetchFarmers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message);
    } finally {
      setDeleting(null);
    }
  }

  const filteredFarmers = farmers.filter((farmer) =>
    farmer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    farmer.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <ToastContainer />

      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Farmers Management</h1>
        <button
          onClick={() => {
            setPage(1);
            fetchFarmers();
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search (Name/Email)
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search farmers..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by State
            </label>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={stateFilter}
              onChange={(e) => {
                setStateFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All States</option>
              {states.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Crop
            </label>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={cropFilter}
              onChange={(e) => {
                setCropFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Crops</option>
              {crops.map((crop) => (
                <option key={crop} value={crop}>
                  {crop.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Farmers Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-gray-600">
            Loading farmers...
          </div>
        ) : filteredFarmers.length === 0 ? (
          <div className="p-6 text-center text-gray-600">
            No farmers found
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">
                      State/LGA
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">
                      Crops
                    </th>
                    <th className="px-6 py-3 text-center font-semibold text-gray-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFarmers.map((farmer) => (
                    <tr key={farmer.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-900">{farmer.name}</td>
                      <td className="px-6 py-4 text-gray-700 text-xs">
                        {farmer.email}
                      </td>
                      <td className="px-6 py-4 text-gray-700 text-sm">
                        {farmer.state}
                        {farmer.lga && ` / ${farmer.lga}`}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {farmer.crops && farmer.crops.length > 0 ? (
                            farmer.crops.slice(0, 3).map((crop) => (
                              <span
                                key={crop}
                                className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded"
                              >
                                {crop.replace(/_/g, " ")}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-500 text-xs">
                              No crops
                            </span>
                          )}
                          {farmer.crops && farmer.crops.length > 3 && (
                            <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                              +{farmer.crops.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex gap-2 justify-center">
                          <Link
                            href={`/admin/farmers/${farmer.id}`}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                          >
                            <Eye size={18} />
                          </Link>
                          <button
                            onClick={() => handleDeleteFarmer(farmer.id)}
                            disabled={deleting === farmer.id}
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50"
                          >
                            <Trash2
                              size={18}
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && (
              <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  Page {pagination.page} of {pagination.totalPages} (
                  {pagination.total} total farmers)
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="p-2 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={() =>
                      setPage(Math.min(pagination.totalPages, page + 1))
                    }
                    disabled={page === pagination.totalPages}
                    className="p-2 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
