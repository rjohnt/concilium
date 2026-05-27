"use client";

import { useState, useEffect } from "react";
import { Search, Loader2, Car, AlertCircle, Clock, ArrowRight } from "lucide-react";

interface VinResult {
  Make: string;
  Model: string;
  ModelYear: string;
  VehicleType: string;
  BodyClass: string;
  FuelTypePrimary: string;
  EngineCylinders: string;
  EngineDisplacementL: string;
  TransmissionStyle: string;
  DriveType: string;
  PlantCity: string;
  PlantState: string;
  PlantCountry: string;
  ManufacturerName: string;
  Trim: string;
  Series: string;
  ErrorCode: string;
  ErrorText: string;
}

const EMPTY_RESULT: VinResult = {
  Make: "", Model: "", ModelYear: "", VehicleType: "", BodyClass: "",
  FuelTypePrimary: "", EngineCylinders: "", EngineDisplacementL: "",
  TransmissionStyle: "", DriveType: "", PlantCity: "", PlantState: "",
  PlantCountry: "", ManufacturerName: "", Trim: "", Series: "",
  ErrorCode: "", ErrorText: "",
};

interface RecentLookup {
  vin: string;
  timestamp: number;
  make: string;
  model: string;
  year: string;
}

function isValidVin(vin: string): boolean {
  return /^[A-HJ-NPR-Z0-9]{17}$/i.test(vin);
}

// Fields to display in a readable format
const DISPLAY_FIELDS: { key: keyof VinResult; label: string }[] = [
  { key: "Make", label: "Make" },
  { key: "Model", label: "Model" },
  { key: "ModelYear", label: "Year" },
  { key: "Trim", label: "Trim" },
  { key: "Series", label: "Series" },
  { key: "VehicleType", label: "Vehicle Type" },
  { key: "BodyClass", label: "Body" },
  { key: "FuelTypePrimary", label: "Fuel Type" },
  { key: "EngineCylinders", label: "Engine Cylinders" },
  { key: "EngineDisplacementL", label: "Displacement (L)" },
  { key: "TransmissionStyle", label: "Transmission" },
  { key: "DriveType", label: "Drive Type" },
  { key: "ManufacturerName", label: "Manufacturer" },
  { key: "PlantCity", label: "Plant City" },
  { key: "PlantState", label: "Plant State" },
  { key: "PlantCountry", label: "Plant Country" },
];

export default function VinDecoderPage() {
  const [vin, setVin] = useState("");
  const [result, setResult] = useState<VinResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentLookups, setRecentLookups] = useState<RecentLookup[]>([]);

  // Load recent lookups from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("concilium-vin-recent");
      if (stored) {
        setRecentLookups(JSON.parse(stored));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  function addRecentLookup(vin: string, data: VinResult) {
    const entry: RecentLookup = {
      vin: vin.toUpperCase(),
      timestamp: Date.now(),
      make: data.Make || "Unknown",
      model: data.Model || "Unknown",
      year: data.ModelYear || "—",
    };
    const updated = [entry, ...recentLookups.filter((r) => r.vin !== entry.vin)].slice(0, 5);
    setRecentLookups(updated);
    try {
      localStorage.setItem("concilium-vin-recent", JSON.stringify(updated));
    } catch {
      // Ignore localStorage errors
    }
  }

  async function handleDecode(e: React.FormEvent) {
    e.preventDefault();
    const cleanVin = vin.trim().toUpperCase();

    if (!cleanVin) {
      setError("Please enter a VIN.");
      return;
    }

    if (!isValidVin(cleanVin)) {
      setError("Invalid VIN. Must be 17 alphanumeric characters (no I, O, or Q).");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(cleanVin)}?format=json`
      );

      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }

      const data = await response.json();
      const decoded = data.Results?.[0];

      if (!decoded) {
        throw new Error("No results returned from the API.");
      }

      if (decoded.ErrorCode && decoded.ErrorCode !== "0") {
        throw new Error(decoded.ErrorText || "VIN decoding error.");
      }

      setResult(decoded);
      addRecentLookup(cleanVin, decoded);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to decode VIN.");
    } finally {
      setLoading(false);
    }
  }

  function handleRecentClick(recentVin: string) {
    setVin(recentVin);
    setResult(null);
    setError(null);
  }

  function clearResults() {
    setResult(null);
    setError(null);
    setVin("");
  }

  const hasResult = result && result.Make;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-brand-600/20 flex items-center justify-center">
            <Car size={22} className="text-brand-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">VIN Decoder</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Decode any 17-character Vehicle Identification Number using the NHTSA database
            </p>
          </div>
        </div>
      </div>

      {/* Input form */}
      <div className="card mb-8">
        <form onSubmit={handleDecode} className="flex gap-3">
          <input
            type="text"
            value={vin}
            onChange={(e) => {
              setVin(e.target.value.toUpperCase());
              setError(null);
            }}
            placeholder="Enter VIN (e.g., 1HGCM82633A004352)"
            maxLength={17}
            autoComplete="off"
            className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 font-mono text-lg tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
          />
          <button
            type="submit"
            disabled={loading}
            className="btn-primary px-6 py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Decoding…
              </>
            ) : (
              <>
                <Search size={20} />
                Decode
              </>
            )}
          </button>
        </form>
        {error && (
          <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-red-900/20 border border-red-800 text-red-400 text-sm">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="card animate-pulse">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[...Array(9)].map((_, i) => (
              <div key={i}>
                <div className="h-3 bg-gray-800 rounded w-20 mb-2" />
                <div className="h-5 bg-gray-800 rounded w-28" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {!loading && hasResult && (
        <div className="card mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-white">
                {result.ModelYear} {result.Make} {result.Model}
              </h3>
              {result.Trim && (
                <p className="text-sm text-gray-400 mt-1">{result.Trim}</p>
              )}
            </div>
            <button onClick={clearResults} className="btn-ghost text-sm">
              Clear
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
            {DISPLAY_FIELDS.map(({ key, label }) => {
              const value = result[key];
              if (!value || value === "Not Applicable") return null;
              return (
                <div key={key}>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
                  <p className="text-sm font-medium text-gray-200">{value}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty result state (decoded but no make/model) */}
      {!loading && result && !hasResult && !error && (
        <div className="card text-center py-12">
          <AlertCircle size={40} className="text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">No Results</h3>
          <p className="text-sm text-gray-500">
            The VIN was not found in the NHTSA database. It may be invalid or from an unsupported manufacturer.
          </p>
        </div>
      )}

      {/* Recent lookups */}
      {recentLookups.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} className="text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Recent Lookups
            </h3>
          </div>
          <div className="space-y-1">
            {recentLookups.map((entry, i) => (
              <button
                key={`${entry.vin}-${i}`}
                onClick={() => handleRecentClick(entry.vin)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-gray-800 transition-colors text-left group"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-brand-400 group-hover:text-brand-300">
                    {entry.vin}
                  </span>
                  <ArrowRight size={14} className="text-gray-600 group-hover:text-gray-400" />
                </div>
                <span className="text-xs text-gray-500">
                  {entry.year} {entry.make} {entry.model}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state: no results and no recent lookups */}
      {!loading && !hasResult && !error && recentLookups.length === 0 && (
        <div className="card text-center py-16">
          <Car size={48} className="text-gray-700 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">
            Enter a VIN to decode
          </h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Enter any 17-character Vehicle Identification Number above to retrieve
            detailed vehicle information from the NHTSA database.
          </p>
        </div>
      )}
    </div>
  );
}
