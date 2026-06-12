import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectSettingsPanel } from "../ProjectSettingsPanel";
import type { Project } from "@/lib/types";

const existingProject: Project = {
  id: "PRJ-001",
  name: "Concilium",
  repoUrl: "https://github.com/example/concilium.git",
  defaultBranch: "main",
  sandboxProvider: "local",
  createPr: false,
  createdAt: "2026-06-11T00:00:00.000Z",
};

function jsonResponse(payload: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
}

describe("ProjectSettingsPanel", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("renders nothing when closed", () => {
    const { container } = render(<ProjectSettingsPanel isOpen={false} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("loads the existing project into the form when opened", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ projects: [existingProject] }));

    render(<ProjectSettingsPanel isOpen onClose={() => {}} />);

    expect(screen.getByText("Project Settings")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByLabelText("Repository URL")).toHaveValue(
        "https://github.com/example/concilium.git"
      )
    );
    expect(screen.getByLabelText("Project name")).toHaveValue("Concilium");
    expect(screen.getByLabelText("Default branch")).toHaveValue("main");
    expect(screen.getByLabelText("Sandbox provider")).toHaveValue("local");
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    expect(fetchMock).toHaveBeenCalledWith("/api/projects");
  });

  it("saves edits to an existing project via PATCH", async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ projects: [existingProject] }))
      .mockResolvedValueOnce(
        jsonResponse({
          project: {
            ...existingProject,
            repoUrl: "https://github.com/example/other.git",
            defaultBranch: "develop",
            sandboxProvider: "docker",
            createPr: true,
          },
        })
      );

    render(<ProjectSettingsPanel isOpen onClose={() => {}} />);
    await waitFor(() => expect(screen.getByLabelText("Repository URL")).toHaveValue(existingProject.repoUrl));

    const repoInput = screen.getByLabelText("Repository URL");
    await user.clear(repoInput);
    await user.type(repoInput, "https://github.com/example/other.git");

    const branchInput = screen.getByLabelText("Default branch");
    await user.clear(branchInput);
    await user.type(branchInput, "develop");

    await user.selectOptions(screen.getByLabelText("Sandbox provider"), "docker");
    await user.click(screen.getByRole("switch"));
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.getByText("Saved")).toBeInTheDocument());

    const [url, options] = fetchMock.mock.calls[1];
    expect(url).toBe("/api/projects?id=PRJ-001");
    expect(options.method).toBe("PATCH");
    expect(JSON.parse(options.body)).toEqual({
      name: "Concilium",
      repoUrl: "https://github.com/example/other.git",
      defaultBranch: "develop",
      sandboxProvider: "docker",
      createPr: true,
    });
  });

  it("creates the project via POST when none exists yet", async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ projects: [] }))
      .mockResolvedValueOnce(jsonResponse({ project: { ...existingProject, name: "New Project", repoUrl: null } }));

    render(<ProjectSettingsPanel isOpen onClose={() => {}} />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument()
    );

    await user.type(screen.getByLabelText("Project name"), "New Project");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [url, options] = fetchMock.mock.calls[1];
    expect(url).toBe("/api/projects");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({
      name: "New Project",
      repoUrl: null,
      defaultBranch: "main",
      sandboxProvider: "local",
      createPr: false,
    });
  });

  it("requires a project name before saving", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(jsonResponse({ projects: [] }));

    render(<ProjectSettingsPanel isOpen onClose={() => {}} />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument()
    );

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Project name is required.");
    // Only the initial load call — no save request
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("surfaces API errors", async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ projects: [existingProject] }))
      .mockResolvedValueOnce(jsonResponse({ error: "Too many requests" }, 429));

    render(<ProjectSettingsPanel isOpen onClose={() => {}} />);
    await waitFor(() => expect(screen.getByLabelText("Project name")).toHaveValue("Concilium"));

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Too many requests");
  });
});
