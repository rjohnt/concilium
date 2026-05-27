import Link from "next/link";
import { ArrowLeft, FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="card flex flex-col items-center justify-center py-24 text-center">
        <div className="w-20 h-20 rounded-2xl bg-elevated flex items-center justify-center mb-6">
          <FileQuestion size={36} className="text-ink-muted" />
        </div>
        <h2 className="text-2xl font-bold text-ink-primary mb-3">
          Page Not Found
        </h2>
        <p className="text-ink-secondary max-w-md mb-8 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Check the URL or return to the dashboard.
        </p>
        <Link href="/" className="btn-primary">
          <ArrowLeft size={18} />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
