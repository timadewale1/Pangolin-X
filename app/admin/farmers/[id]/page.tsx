"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { toast, ToastContainer } from "react-toastify";
import { ArrowLeft, Trash2 } from "lucide-react";

interface Farmer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  state: string;
  lga: string;
  crops: string[];
  title?: string;
  createdAt?: string;
  lat?: number;
  lon?: number;
}

interface Advisory {
  id: string;
  advice?: string;
  advisory?: string;
  title?: string;
  createdAt?: string;
  crops?: string[];
}

interface FragilityAdvisory {
  id: string;
  header: string;
  sections?: Array<{
    title: string;
    summary: string;
    severity: "low" | "moderate" | "high";
  }>;
  createdAt?: string;
}

export default function FarmerDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const farmerId = params.id as string;

  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [advisories, setAdvisories] = useState<Advisory[]>([]);
  const [fragilityAdvisories, setFragilityAdvisories] = useState<
    FragilityAdvisory[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchFarmerDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmerId]);

  async function fetchFarmerDetails() {
    try {
      const response = await fetch(`/api/admin/farmers/${farmerId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch farmer details");
      }

      const data = await response.json();
      setFarmer(data.farmer);
      setAdvisories(data.advisories);
      setFragilityAdvisories(data.fragilityAdvisories);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message);
      router.push("/admin/farmers");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (
      !confirm(
        "Are you sure you want to delete this farmer and all their data?"
      )
    )
      return;

    setDeleting(true);
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
      router.push("/admin/farmers");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-600">Loading farmer details...</div>
      </div>
    );
  }

  if (!farmer) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-600">Farmer not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ToastContainer />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/farmers"
            className="p-2 hover:bg-gray-100 rounded transition"
          >
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{farmer.name}</h1>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
        >
          <Trash2 size={18} />
          {deleting ? "Deleting..." : "Delete Farmer"}
        </button>
      </div>

      {/* Farmer Info Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">
          Personal Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-600">Name</p>
            <p className="text-lg font-medium text-gray-900">{farmer.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Email</p>
            <p className="text-lg font-medium text-gray-900">{farmer.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Phone</p>
            <p className="text-lg font-medium text-gray-900">
              {farmer.phone || "N/A"}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Title</p>
            <p className="text-lg font-medium text-gray-900">
              {farmer.title || "N/A"}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">State</p>
            <p className="text-lg font-medium text-gray-900">{farmer.state}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">LGA</p>
            <p className="text-lg font-medium text-gray-900">{farmer.lga}</p>
          </div>
          {farmer.lat && farmer.lon && (
            <>
              <div>
                <p className="text-sm text-gray-600">Latitude</p>
                <p className="text-lg font-medium text-gray-900">
                  {farmer.lat.toFixed(4)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Longitude</p>
                <p className="text-lg font-medium text-gray-900">
                  {farmer.lon.toFixed(4)}
                </p>
              </div>
            </>
          )}
          <div>
            <p className="text-sm text-gray-600">Registered Date</p>
            <p className="text-lg font-medium text-gray-900">
              {farmer.createdAt
                ? new Date(farmer.createdAt).toLocaleDateString()
                : "N/A"}
            </p>
          </div>
        </div>

        {/* Crops */}
        <div className="mt-6 pt-6 border-t">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Crops</h3>
          <div className="flex flex-wrap gap-2">
            {farmer.crops && farmer.crops.length > 0 ? (
              farmer.crops.map((crop) => (
                <span
                  key={crop}
                  className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium"
                >
                  {crop.replace(/_/g, " ")}
                </span>
              ))
            ) : (
              <span className="text-gray-500">No crops registered</span>
            )}
          </div>
        </div>
      </div>

      {/* Advisories */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">
          Recent Advisories ({advisories.length})
        </h2>
        {advisories.length === 0 ? (
          <p className="text-gray-600">No advisories yet</p>
        ) : (
          <div className="space-y-4">
            {advisories.map((advisory) => (
              <div
                key={advisory.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {advisory.title || "Advisory"}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {advisory.advice || advisory.advisory}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                    {advisory.createdAt
                      ? new Date(advisory.createdAt).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
                {advisory.crops && advisory.crops.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {advisory.crops.map((crop) => (
                      <span
                        key={crop}
                        className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                      >
                        {crop.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fragility Advisories */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">
          Fragility Advisories ({fragilityAdvisories.length})
        </h2>
        {fragilityAdvisories.length === 0 ? (
          <p className="text-gray-600">No fragility advisories yet</p>
        ) : (
          <div className="space-y-4">
            {fragilityAdvisories.map((advisory) => (
              <div
                key={advisory.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
              >
                <h3 className="font-semibold text-gray-900">
                  {advisory.header}
                </h3>
                {advisory.sections && advisory.sections.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {advisory.sections.map((section, idx) => (
                      <div key={idx} className="border-l-4 border-gray-200 pl-3">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900">
                            {section.title}
                          </h4>
                          <span
                            className={`text-xs px-2 py-1 rounded font-medium ${
                              section.severity === "high"
                                ? "bg-red-100 text-red-800"
                                : section.severity === "moderate"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-green-100 text-green-800"
                            }`}
                          >
                            {section.severity}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {section.summary}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                <span className="text-xs text-gray-500 mt-3 block">
                  {advisory.createdAt
                    ? new Date(advisory.createdAt).toLocaleDateString()
                    : "N/A"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
