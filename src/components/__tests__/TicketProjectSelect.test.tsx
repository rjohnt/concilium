import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TicketProjectSelect } from "../TicketProjectSelect";
import type { Project } from "@/lib/types";

const project: Project = {
  id: "PRJ-001",
  name: "Concilium",
  repoUrl: "https://github.com/example/concilium.git",
  defaultBranch: "main",
  sandboxProvider: "local",
  createPr: true,
  createdAt: "2026-06-11T00:00:00.000Z",
};

function jsonResponse(payload: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
}

describe("TicketProjectSelect", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("lists projects from /api/projects with a no-project default", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ projects: [project] }));

    render(<TicketProjectSelect value={null} onChange={() => {}} />);

    expect(fetchMock).toHaveBeenCalledWith("/api/projects");
    await waitFor(() =>
      expect(screen.getByRole("option", { name: "Concilium" })).toBeInTheDocument()
    );
    expect(screen.getByLabelText("Ticket project")).toHaveValue("");
    expect(screen.getByRole("option", { name: "No project" })).toBeInTheDocument();
  });

  it("assigns a project via onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    fetchMock.mockResolvedValueOnce(jsonResponse({ projects: [project] }));

    render(<TicketProjectSelect value={null} onChange={onChange} />);
    await waitFor(() =>
      expect(screen.getByRole("option", { name: "Concilium" })).toBeInTheDocument()
    );

    await user.selectOptions(screen.getByLabelText("Ticket project"), "PRJ-001");
    expect(onChange).toHaveBeenCalledWith("PRJ-001");
  });

  it("clears the assignment with the no-project option", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    fetchMock.mockResolvedValueOnce(jsonResponse({ projects: [project] }));

    render(<TicketProjectSelect value="PRJ-001" onChange={onChange} />);
    await waitFor(() =>
      expect(screen.getByLabelText("Ticket project")).toHaveValue("PRJ-001")
    );

    await user.selectOptions(screen.getByLabelText("Ticket project"), "");
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("explains the repo behavior for the assigned project", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ projects: [project] }));

    render(<TicketProjectSelect value="PRJ-001" onChange={() => {}} />);

    await waitFor(() =>
      expect(
        screen.getByText(/Builds clone https:\/\/github\.com\/example\/concilium\.git/)
      ).toBeInTheDocument()
    );
  });

  it("shows a load error when the project list cannot be fetched", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "boom" }, 500));

    render(<TicketProjectSelect value={null} onChange={() => {}} />);

    await waitFor(() =>
      expect(screen.getByText("Couldn't load projects.")).toBeInTheDocument()
    );
  });
});
