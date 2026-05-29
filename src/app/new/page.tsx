"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTicket } from "@/lib/store";
import { PRIORITY_LABELS, PRIORITY_COLORS, PriorityLevel, PREDEFINED_TAGS, Tag } from "@/lib/types";
import { TagChip } from "@/components/TagChip";
import { ArrowLeft } from "lucide-react";
import { useUnsavedChangesWarning } from "@/hooks/useUnsavedChangesWarning";
import { useToast } from "@/components/Toast";

export default function NewTicketPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<PriorityLevel>(2);
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [titleTouched, setTitleTouched] = useState(false);
  const [descTouched, setDescTouched] = useState(false);

  // ── Unsaved changes detection ──────────────────────────────────────
  const hasUnsaved = title.trim().length > 0 || description.trim().length > 0;
  useUnsavedChangesWarning(hasUnsaved);

  // ── Derived validation ──────────────────────────────────────────────
  const titleLen = title.length;
  const descLen = description.length;

  const titleCounterColor =
    titleLen < 180
      ? "text-ink-muted"
      : titleLen <= 200
        ? "text-gold font-medium"
        : "text-cardinal font-medium";
  const descCounterColor =
    descLen < 4500
      ? "text-ink-muted"
      : descLen <= 5000
        ? "text-gold font-medium"
        : "text-cardinal font-medium";

  const titleError: string | null = !titleTouched
    ? null
    : !title.trim()
      ? "Title is required"
      : titleLen > 200
        ? "Title too long"
        : null;

  const descError: string | null = !descTouched
    ? null
    : !description.trim()
      ? "Description is required"
      : descLen > 5000
        ? "Description must be 5,000 characters or fewer"
        : null;

  const hasError = titleError !== null || descError !== null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Touch both fields so validation surfaces on submit
    setTitleTouched(true);
    setDescTouched(true);

    if (!title.trim() || !description.trim()) return;
    if (titleLen > 200 || descLen > 5000) return;

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
    addToast({
      variant: "success",
      title: "Ticket created",
      description: `"${ticket.title}" has been created.`,
    });
    router.push(`/ticket/${ticket.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <button
        type="button"
        onClick={() => {
          if (hasUnsaved && !window.confirm("You have unsaved changes. Are you sure you want to leave?")) {
            return;
          }
          router.push("/");
        }}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 mb-6 transition-colors bg-transparent border-none cursor-pointer"
      >
        <ArrowLeft size={14} />
        Back to Dashboard
      </button>

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
              onBlur={() => setTitleTouched(true)}
              maxLength={200}
              placeholder="What needs to be built?"
              aria-describedby="title-counter title-error"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              autoFocus
            />
            <div className="min-h-[20px] mt-1">
              <p
                id="title-counter"
                className={`text-xs ${titleCounterColor}`}
                aria-live="off"
              >
                {titleLen}/200
              </p>
              {titleError && (
                <p id="title-error" className="text-xs text-cardinal" role="alert">
                  {titleError}
                </p>
              )}
            </div>
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
              onBlur={() => setDescTouched(true)}
              maxLength={5000}
              placeholder="Describe the feature, bug, or task in detail..."
              rows={6}
              aria-describedby="desc-counter desc-error"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
            />
            <div className="min-h-[20px] mt-1">
              <p
                id="desc-counter"
                className={`text-xs ${descCounterColor}`}
                aria-live="off"
              >
                {descLen}/5000
              </p>
              {descError && (
                <p id="desc-error" className="text-xs text-cardinal" role="alert">
                  {descError}
                </p>
              )}
            </div>
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

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Tags <span className="text-gray-600">(optional)</span>
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
            <p className="text-xs text-gray-500">
              After creation, stakeholders (Engineer, Designer, PO, QA) will
              weigh in.
            </p>
            <button
              type="submit"
              disabled={!title.trim() || !description.trim() || submitting || hasError}
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
