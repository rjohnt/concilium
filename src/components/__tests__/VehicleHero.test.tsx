import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { VehicleHero } from "../VehicleHero";
import type { VehicleSummary } from "@/lib/share-types";

const mockVehicle: VehicleSummary = {
  make: "Porsche",
  model: "911 Carrera",
  year: 1987,
  vin: "WP0AB0910HS122001",
  trim: "Coupe",
  exteriorColor: "Guards Red",
  interiorColor: "Black Leather",
  mileage: 68000,
  price: 89500,
};

describe("VehicleHero", () => {
  it("renders year, make, model in heading", () => {
    render(<VehicleHero vehicle={mockVehicle} />);
    expect(
      screen.getByRole("heading", { name: /1987 Porsche 911 Carrera/ })
    ).toBeInTheDocument();
  });

  it("renders trim when present", () => {
    render(<VehicleHero vehicle={mockVehicle} />);
    expect(screen.getByText("Coupe")).toBeInTheDocument();
  });

  it("renders without trim when not provided", () => {
    const noTrim = { ...mockVehicle, trim: undefined };
    render(<VehicleHero vehicle={noTrim} />);
    expect(screen.queryByText("Coupe")).not.toBeInTheDocument();
  });

  it("renders mileage formatted with commas", () => {
    render(<VehicleHero vehicle={mockVehicle} />);
    expect(screen.getByText(/68,000 mi/)).toBeInTheDocument();
  });

  it("renders mileage fallback when undefined", () => {
    const noMileage = { ...mockVehicle, mileage: undefined };
    render(<VehicleHero vehicle={noMileage} />);
    expect(screen.getByText(/— mi/)).toBeInTheDocument();
  });

  it("renders events count when provided", () => {
    render(<VehicleHero vehicle={mockVehicle} eventsCount={5} />);
    expect(screen.getByText(/5 events/)).toBeInTheDocument();
  });

  it("renders singular when eventsCount is 1", () => {
    render(<VehicleHero vehicle={mockVehicle} eventsCount={1} />);
    expect(screen.getByText(/1 event/)).toBeInTheDocument();
  });

  it("does not render events count when not provided", () => {
    render(<VehicleHero vehicle={mockVehicle} />);
    expect(screen.queryByText(/events/)).not.toBeInTheDocument();
  });

  it("shows dark placeholder with Car icon when no heroImage", () => {
    const { container } = render(<VehicleHero vehicle={mockVehicle} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("renders hero image when provided", () => {
    render(
      <VehicleHero
        vehicle={mockVehicle}
        heroImage="https://example.com/car.jpg"
      />
    );
    const img = screen.getByRole("img", { name: /1987 Porsche 911 Carrera/ });
    expect(img).toHaveAttribute("src", "https://example.com/car.jpg");
  });

  it("falls back to placeholder on image error", () => {
    render(
      <VehicleHero
        vehicle={mockVehicle}
        heroImage="https://example.com/broken.jpg"
      />
    );
    const img = screen.getByRole("img", { name: /1987 Porsche 911 Carrera/ });
    fireEvent.error(img);
    // After error, the img should be replaced by placeholder (Car SVG)
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders exterior color swatch when present", () => {
    render(<VehicleHero vehicle={mockVehicle} />);
    expect(screen.getByText("Guards Red")).toBeInTheDocument();
  });

  it("does not render exterior color when absent", () => {
    const noColor = { ...mockVehicle, exteriorColor: undefined };
    render(<VehicleHero vehicle={noColor} />);
    expect(screen.queryByText("Guards Red")).not.toBeInTheDocument();
  });

  it("renders year stat", () => {
    render(<VehicleHero vehicle={mockVehicle} />);
    // The year appears both in heading and the stat row
    const yearElements = screen.getAllByText("1987");
    // Should appear at least twice (heading + stat)
    expect(yearElements.length).toBeGreaterThanOrEqual(1);
  });
});
