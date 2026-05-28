"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTicket } from "@/lib/store";
import { PRIORITY_LABELS, PRIORITY_COLORS, PriorityLevel, PREDEFINED_TAGS, Tag } from "@/lib/types";
import { TagChip } from "@/components/TagChip";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewTicketPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<PriorityLevel>(2);
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setSubmitting(true);
    const tags: Tag[] = PREDEFINED_TAGS.filter((t) => selectedTagIds.includes(t.id));
    const ticket = createTicket(
      title.trim(),
      description.trim(),
      priority,
      dueDate || undefined,
      tags
    );

    // Navigate to the new ticket
    router.push(`/ticket/${ticket.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink-primary mb-6 transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Dashboard
      </Link>

      <div className="card">
        <h2 className="text-xl font-bold text-ink-primary mb-1">New Ticket</h2>
        <p className="text-sm text-ink-secondary mb-6">
          Create a ticket for the multiplayer stakeholder review flow.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-ink-secondary mb-1.5"
            >
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be built?"
              className="w-full bg-elevated border border-border-visible rounded-lg px-4 py-3 text-sm text-ink-primary placeholder-ink-muted focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              autoFocus
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-ink-secondary mb-1.5"
            >
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the feature, bug, or task in detail..."
              rows={6}
              className="w-full bg-elevated border border-border-visible rounded-lg px-4 py-3 text-sm text-ink-primary placeholder-ink-muted focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label
              htmlFor="priority"
              className="block text-sm font-medium text-ink-secondary mb-1.5"
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
                      ? `${PRIORITY_COLORS[p]} ring-1 ring-offset-1 ring-offset-raised`
                      : "border-border-visible/30 text-ink-muted hover:text-ink-primary hover:border-border-visible"
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
              className="block text-sm font-medium text-ink-secondary mb-1.5"
            >
              Due Date <span className="text-ink-muted">(optional)</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-elevated border border-border-visible rounded-lg px-4 py-3 text-sm text-ink-primary placeholder-ink-muted focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
              {dueDate && (
                <button
                  type="button"
                  onClick={() => setDueDate("")}
                  className="px-3 py-3 text-sm text-ink-muted hover:text-ink-primary transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-1.5">
              Tags <span className="text-ink-muted">(optional)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {PREDEFINED_TAGS.map((tag) => (
                <TagChip
                  key={tag.id}
                  tag={tag}
                  mode="toggle"
                  selected={selectedTagIds.includes(tag.id)}
                  onToggle={(id) =>
                    setSelectedTagIds((prev) =>
                      prev.includes(id)
                        ? prev.filter((t) => t !== id)
                        : [...prev, id]
                    )
                  }
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-ink-muted">
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
