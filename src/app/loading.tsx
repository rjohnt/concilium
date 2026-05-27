import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="card flex flex-col items-center justify-center py-24 text-center">
        <Loader2 size={36} className="text-gold animate-spin mb-4" />
        <p className="text-ink-secondary">Loading...</p>
      </div>
    </div>
  );
}
