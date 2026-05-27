"use client";

import { useToast } from "@/lib/toast-context";
import { notFound } from "next/navigation";

export default function ToastDemoPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  const { toast } = useToast();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card">
        <h2 className="text-xl font-bold text-white mb-4">Toast Demo</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => toast("Operation completed successfully!", "success")}
            className="btn-primary"
          >
            Success Toast
          </button>
          <button
            onClick={() => toast("Something went wrong!", "error")}
            className="bg-cardinal hover:bg-cardinal/90 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Error Toast
          </button>
          <button
            onClick={() => toast("Here's some information for you.", "info")}
            className="bg-blue-steel hover:bg-blue-steel/90 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Info Toast
          </button>
        </div>
      </div>
    </div>
  );
}
