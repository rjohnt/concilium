"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTicket } from "@/lib/store";
import { PRIORITY_LABELS, PRIORITY_COLORS, PriorityLevel } from "@/lib/types";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewTicketPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<PriorityLevel>(2);
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setSubmitting(true);
    const ticket = createTicket(
      title.trim(),
      description.trim(),
      priority,
      dueDate || undefined
    );

    // Navigate to the new ticket
    router.push(`/ticket/${ticket.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 mb-6 transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Dashboard
      </Link>

      <div className="card">
        <h2 className="text-xl font-bold text-white mb-1">New Ticket</h2>
        <p className="text-sm text-gray-400 mb-6">
          Create a ticket for the multiplayer stakeholder review flow.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-300 mb-1.5"
            >
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be built?"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              autoFocus
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-300 mb-1.5"
            >
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the feature, bug, or task in detail..."
              rows={6}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label
              htmlFor="priority"
              className="block text-sm font-medium text-gray-300 mb-1.5"
            >
              Priority
            </label>
            <div className="flex gap-2">
              {([0, 1, 2, 3, 4] as PriorityLevel[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    priority === p
                      ? `${PRIORITY_COLORS[p]} ring-1 ring-offset-1 ring-offset-gray-900`
                      : "border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-600"
                  } ${p === 4 && priority !== 4 ? "opacity-50" : ""}`}
                >
                  {PRIORITY_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="dueDate"
              className="block text-sm font-medium text-gray-300 mb-1.5"
            >
              Due Date <span className="text-gray-600">(optional)</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent [color-scheme:dark]"
              />
              {dueDate && (
                <button
                  type="button"
                  onClick={() => setDueDate("")}
                  className="px-3 py-3 text-sm text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-gray-500">
              After creation, stakeholders (Engineer, Designer, PO, QA) will
              weigh in.
            </p>
            <button
              type="submit"
              disabled={!title.trim() || !description.trim() || submitting}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Creating..." : "Create Ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
