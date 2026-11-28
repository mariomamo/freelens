/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Chart as ChartJS } from "chart.js";
import { computed, observable, runInAction } from "mobx";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import activeThemeInjectable from "../../../themes/active.injectable";
import { renderFor } from "../../test-utils/renderFor";
import { StatusChart } from "../status-chart";

import type { ChartTypeRegistry, TooltipItem, TooltipOptions } from "chart.js";

import type { LensTheme } from "../../../themes/lens-theme";
import type { DiRender } from "../../test-utils/renderFor";
import type { StatusCardStatus } from "../status-card";

// The Chart.js chart that the ring drew on its canvas.
function chartOf(container: HTMLElement) {
  const canvas = container.querySelector("canvas");
  const chart = canvas ? ChartJS.getChart(canvas) : undefined;

  if (!chart) {
    throw new Error("The canvas has no Chart.js chart");
  }

  return chart;
}

// The values of the dataset: the grey ring of no items first, and then a value for each status.
const valuesOf = (container: HTMLElement) => chartOf(container).data.datasets[0].data;

const colorsOf = (container: HTMLElement) => chartOf(container).data.datasets[0].backgroundColor;

const legendEntries = (container: HTMLElement) =>
  Array.from(container.querySelectorAll(".StatusChart-legendItem")).map((item) =>
    item.closest(".StatusChart-legendEntry"),
  );

// The tooltip options as the ring gave them, not resolved by Chart.js.
const tooltipOf = (container: HTMLElement) =>
  chartOf(container).config.options?.plugins?.tooltip as Partial<TooltipOptions<keyof ChartTypeRegistry>>;

// What the tooltip gets for the value at an index of the dataset.
const tooltipItem = (container: HTMLElement, dataIndex: number) => {
  const chart = chartOf(container);
  const dataset = chart.data.datasets[0];

  return {
    chart,
    dataset,
    datasetIndex: 0,
    dataIndex,
    raw: dataset.data[dataIndex],
    parsed: dataset.data[dataIndex],
  } as unknown as TooltipItem<keyof ChartTypeRegistry>;
};

const status = (label: string, count: number, color = "rgb(1, 2, 3)"): StatusCardStatus => ({ label, count, color });

const running = (count: number) => status("Running", count, "rgb(0, 128, 0)");
const pending = (count: number) => status("Pending", count, "rgb(255, 165, 0)");
const failed = (count: number) => status("Failed", count, "rgb(255, 0, 0)");

const statuses = [running(2), pending(1), failed(1)];

const theme = (pieChartDefaultColor: string) =>
  ({ type: "dark", colors: { pieChartDefaultColor, contentColor: "#000000" } }) as unknown as LensTheme;

describe("StatusChart", () => {
  let render: DiRender;
  const activeTheme = observable.box(theme("#30353a"), { deep: false });

  beforeEach(() => {
    const di = getDiForUnitTesting();

    runInAction(() => activeTheme.set(theme("#30353a")));
    di.override(activeThemeInjectable, () => computed(() => activeTheme.get()));
    render = renderFor(di);
  });

  afterEach(() => {
    document.documentElement.style.removeProperty("--colorOk");
  });

  it("has the public class of the chart, and the class it is given", () => {
    render(<StatusChart title="Pods" statuses={statuses} className="Custom" data-testid="ring" />);

    expect(screen.getByTestId("ring")).toHaveClass("StatusChart", "Custom");
  });

  it.each([
    { name: "a plain title", onClick: undefined },
    { name: "a title that is a button", onClick: () => {} },
  ])("gives every part with $name a class that starts with the name of the chart", ({ onClick }) => {
    // The parts of the `PieChart` are the chart's own.
    const { container } = render(<StatusChart title="Pods" statuses={statuses} onClick={onClick} />);
    const parts = Array.from(container.querySelectorAll(".StatusChart *")).filter((part) => !part.closest(".Chart"));

    expect(parts.length).toBeGreaterThan(0);
    expect(parts.filter((part) => !Array.from(part.classList).some((name) => name.startsWith("StatusChart-")))).toEqual(
      [],
    );
  });

  describe("title", () => {
    it("has the total in parentheses, the sum of the counts when it is not given", () => {
      render(<StatusChart title="Pods" statuses={statuses} data-testid="ring" />);

      expect(screen.getByTestId("ring-title")).toHaveTextContent("Pods (4)");
    });

    it("has the total it is given", () => {
      render(<StatusChart title="Pods" total={39} statuses={statuses} data-testid="ring" />);

      expect(screen.getByTestId("ring-title")).toHaveTextContent("Pods (39)");
    });

    it("is a button that calls onClick, and the ring is not", async () => {
      const onClick = vi.fn();

      render(<StatusChart title="Pods" statuses={statuses} onClick={onClick} data-testid="ring" />);

      expect(screen.getAllByRole("button")).toEqual([screen.getByTestId("ring-title")]);

      await userEvent.click(screen.getByRole("button", { name: "Pods (4)" }));

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("is no button without onClick", () => {
      render(<StatusChart title="Pods" statuses={statuses} data-testid="ring" />);

      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(screen.getByRole("region", { name: "Pods" })).toBe(screen.getByTestId("ring"));
    });
  });

  describe("ring", () => {
    it("has a value for each status, after the grey ring of no items", () => {
      const { container } = render(<StatusChart title="Pods" statuses={statuses} />);

      expect(valuesOf(container)).toEqual([0, 2, 1, 1]);
    });

    it.each([
      { name: "with a count of 0", next: [running(3), pending(0), failed(1)] },
      { name: "out of the list", next: [running(3), failed(1)] },
    ])("keeps the index of a status when a status before it is given $name", ({ next }) => {
      const { container, rerender } = render(<StatusChart title="Pods" statuses={statuses} />);
      const dataset = chartOf(container).data.datasets[0];

      rerender(<StatusChart title="Pods" statuses={next} />);

      expect(chartOf(container).data.datasets[0] === dataset, "the chart has the same dataset object").toBe(true);
      expect(valuesOf(container)).toEqual([0, 3, 0, 1]);
    });

    it("keeps the color of a status that is left out of the list", () => {
      const { container, rerender } = render(<StatusChart title="Pods" statuses={statuses} />);

      rerender(<StatusChart title="Pods" statuses={[running(3), failed(1)]} />);

      expect(colorsOf(container)).toEqual(["#30353a", "rgb(0, 128, 0)", "rgb(255, 165, 0)", "rgb(255, 0, 0)"]);
    });

    it("puts a status it gets for the first time after the statuses it has", () => {
      const { container, rerender } = render(<StatusChart title="Pods" statuses={[running(2), failed(1)]} />);

      rerender(<StatusChart title="Pods" statuses={statuses} />);

      expect(valuesOf(container)).toEqual([0, 2, 1, 1]);
      expect(legendEntries(container).map((entry) => entry?.textContent)).toEqual([
        "Running: 2",
        "Failed: 1",
        "Pending: 1",
      ]);
    });

    it("turns the ring grey in the same dataset when no status has items, and back", () => {
      const { container, rerender } = render(<StatusChart title="Pods" statuses={statuses} />);
      const dataset = chartOf(container).data.datasets[0];

      rerender(<StatusChart title="Pods" statuses={[running(0)]} />);

      expect(chartOf(container).data.datasets[0] === dataset, "the chart has the same dataset object").toBe(true);
      expect(valuesOf(container)).toEqual([1, 0, 0, 0]);

      rerender(<StatusChart title="Pods" statuses={[pending(1)]} />);

      expect(chartOf(container).data.datasets[0] === dataset, "the chart has the same dataset object").toBe(true);
      expect(valuesOf(container)).toEqual([0, 0, 1, 0]);
    });

    it("draws the grey ring alone when there are no statuses", () => {
      const { container } = render(<StatusChart title="Pods" statuses={[]} />);

      expect(valuesOf(container)).toEqual([1]);
      expect(legendEntries(container)).toEqual([]);
    });
  });

  describe("colors", () => {
    it("draws the colors of CSS variables as the values they resolve to", () => {
      document.documentElement.style.setProperty("--colorOk", "#4caf50");

      const { container } = render(<StatusChart title="Pods" statuses={[status("Running", 2, "var(--colorOk)")]} />);

      expect(colorsOf(container)).toEqual(["#30353a", "rgb(76, 175, 80)"]);
    });

    it("keeps the CSS color in the legend, which the browser resolves itself", () => {
      render(<StatusChart title="Pods" statuses={[status("Running", 2, "var(--colorOk)")]} data-testid="ring" />);

      const swatch = screen.getByTestId("ring-status-running").querySelector<HTMLElement>(".StatusChart-swatch");

      expect(swatch?.style.backgroundColor).toBe("var(--colorOk)");
    });

    it("resolves the colors again when the active theme changes", () => {
      document.documentElement.style.setProperty("--colorOk", "#4caf50");

      const { container } = render(<StatusChart title="Pods" statuses={[status("Running", 2, "var(--colorOk)")]} />);

      act(() => {
        // The host applies the variables of a theme as soon as it is active, before the chart renders again.
        document.documentElement.style.setProperty("--colorOk", "#00ff00");
        runInAction(() => activeTheme.set(theme("#efefef")));
      });

      expect(colorsOf(container)).toEqual(["#efefef", "rgb(0, 255, 0)"]);
    });

    it("resolves the color of a status it gets later", () => {
      document.documentElement.style.setProperty("--colorOk", "#4caf50");

      const { container, rerender } = render(<StatusChart title="Pods" statuses={[pending(1)]} />);

      rerender(<StatusChart title="Pods" statuses={[pending(1), status("Running", 2, "var(--colorOk)")]} />);

      expect(colorsOf(container)).toEqual(["#30353a", "rgb(255, 165, 0)", "rgb(76, 175, 80)"]);
    });
  });

  describe("legend", () => {
    it("lists the statuses with items, each with its label and count", () => {
      render(<StatusChart title="Pods" statuses={[running(2), pending(1), failed(0)]} data-testid="ring" />);

      expect(screen.getAllByTestId(/^ring-status-/).map((entry) => entry.textContent)).toEqual([
        "Running: 2",
        "Pending: 1",
      ]);
    });

    it("is the chart's own rather than the legend of `PieChart`", () => {
      render(<StatusChart title="Pods" statuses={statuses} data-testid="ring" />);

      expect(screen.getByTestId("ring").querySelector(".legend")).toBeNull();
    });

    it("keeps the element of an entry when its count changes", () => {
      const { rerender } = render(<StatusChart title="Pods" statuses={statuses} data-testid="ring" />);
      const entry = screen.getByTestId("ring-status-running");

      rerender(<StatusChart title="Pods" statuses={[running(3), pending(1), failed(1)]} data-testid="ring" />);

      expect(screen.getByTestId("ring-status-running")).toBe(entry);
      expect(entry).toHaveTextContent("Running: 3");
    });

    it.each([
      { name: "reaches zero", next: [running(2), pending(0), failed(1)] },
      { name: "leaves the list", next: [running(2), failed(1)] },
    ])("collapses the entry of a status that $name, out of the chart and without a test id", ({ next }) => {
      const { container, rerender } = render(<StatusChart title="Pods" statuses={statuses} data-testid="ring" />);
      const item = screen.getByTestId("ring-status-pending");
      const entry = legendEntries(container)[1];

      rerender(<StatusChart title="Pods" statuses={next} data-testid="ring" />);

      expect(legendEntries(container)[1]).toBe(entry);
      expect(entry).toContainElement(item);
      expect(entry).toHaveAttribute("data-collapsed", "true");
      expect(entry).toHaveAttribute("aria-hidden", "true");
      expect(entry).toHaveAttribute("inert");
      expect(item).not.toHaveAttribute("data-testid");
      expect(screen.queryByTestId("ring-status-pending")).not.toBeInTheDocument();
    });

    it("shows the last count of the status in the entry while it closes", () => {
      const { container, rerender } = render(<StatusChart title="Pods" statuses={statuses} />);

      rerender(<StatusChart title="Pods" statuses={[running(2), failed(1)]} />);

      expect(legendEntries(container)[1]).toHaveTextContent("Pending: 1");
    });

    it("opens the same entry again when the status gets items back", () => {
      const { container, rerender } = render(<StatusChart title="Pods" statuses={statuses} data-testid="ring" />);
      const item = screen.getByTestId("ring-status-pending");

      rerender(<StatusChart title="Pods" statuses={[running(2), failed(1)]} data-testid="ring" />);
      rerender(<StatusChart title="Pods" statuses={[running(2), pending(4), failed(1)]} data-testid="ring" />);

      expect(screen.getByTestId("ring-status-pending")).toBe(item);
      expect(item).toHaveTextContent("Pending: 4");
      expect(legendEntries(container)[1]).not.toHaveAttribute("data-collapsed");
      expect(legendEntries(container)[1]).not.toHaveAttribute("aria-hidden");
      expect(legendEntries(container)[1]).not.toHaveAttribute("inert");
    });

    it("collapses every entry when no status has items", () => {
      const { container, rerender } = render(<StatusChart title="Pods" statuses={statuses} data-testid="ring" />);

      rerender(<StatusChart title="Pods" statuses={[]} data-testid="ring" />);

      expect(legendEntries(container)).toHaveLength(3);
      expect(legendEntries(container).every((entry) => entry?.hasAttribute("data-collapsed"))).toBe(true);
      expect(screen.queryAllByTestId(/^ring-status-/)).toEqual([]);
    });
  });

  describe("without statuses", () => {
    const emptyEntry = () => screen.getByText("None here").closest(".StatusChart-legendEntry");

    it("shows the empty text when there are no items", () => {
      render(<StatusChart title="Pods" statuses={[]} emptyText="None here" data-testid="ring" />);

      expect(screen.getByTestId("ring-empty")).toHaveTextContent("None here");
      expect(screen.getByTestId("ring-title")).toHaveTextContent("Pods (0)");
    });

    it("says None by default", () => {
      render(<StatusChart title="Pods" statuses={[]} data-testid="ring" />);

      expect(screen.getByTestId("ring-empty")).toHaveTextContent("None");
    });

    it("shows the no-status text when there are items without a status", () => {
      render(<StatusChart title="Pods" total={3} statuses={[]} noStatusText="Not reported" data-testid="ring" />);

      expect(screen.getByTestId("ring-empty")).toHaveTextContent("Not reported");
    });

    it("says No status reported by default", () => {
      render(<StatusChart title="Pods" total={3} statuses={[running(0)]} data-testid="ring" />);

      expect(screen.getByTestId("ring-empty")).toHaveTextContent("No status reported");
    });

    it("closes the empty text when a status gets items, keeping its text while it closes", () => {
      const { rerender } = render(<StatusChart title="Pods" statuses={[]} emptyText="None here" data-testid="ring" />);
      const entry = emptyEntry();

      rerender(<StatusChart title="Pods" statuses={statuses} emptyText="None here" data-testid="ring" />);

      expect(emptyEntry()).toBe(entry);
      expect(entry).toHaveAttribute("data-collapsed", "true");
      expect(entry).toHaveAttribute("aria-hidden", "true");
      expect(screen.queryByTestId("ring-empty")).not.toBeInTheDocument();
      expect(screen.getByTestId("ring-status-running")).toBeInTheDocument();
    });

    it("has no empty text while a status has items", () => {
      render(<StatusChart title="Pods" statuses={statuses} data-testid="ring" />);

      expect(screen.queryByTestId("ring-empty")).not.toBeInTheDocument();
    });
  });

  describe("tooltip", () => {
    it("skips an arc without items", () => {
      const { container } = render(<StatusChart title="Pods" statuses={[running(2), pending(0), failed(1)]} />);
      const { filter } = tooltipOf(container);

      expect(filter?.(tooltipItem(container, 0), 0, [], {} as never)).toBe(false);
      expect(filter?.(tooltipItem(container, 1), 0, [], {} as never)).toBe(true);
      expect(filter?.(tooltipItem(container, 2), 0, [], {} as never)).toBe(false);
      expect(filter?.(tooltipItem(container, 3), 0, [], {} as never)).toBe(true);
    });

    it("names the status by its label and its share", () => {
      const { container } = render(<StatusChart title="Pods" statuses={statuses} />);
      const label = tooltipOf(container).callbacks?.label as unknown as (
        item: TooltipItem<keyof ChartTypeRegistry>,
      ) => string;

      expect(label(tooltipItem(container, 1))).toBe("Running: 50%");
      expect(label(tooltipItem(container, 2))).toBe("Pending: 25%");
    });

    it("names the grey ring when no status has items", () => {
      const { container } = render(<StatusChart title="Pods" statuses={[running(0)]} />);
      const { filter, callbacks } = tooltipOf(container);
      const label = callbacks?.label as unknown as (item: TooltipItem<keyof ChartTypeRegistry>) => string;

      expect(filter?.(tooltipItem(container, 0), 0, [], {} as never)).toBe(true);
      expect(label(tooltipItem(container, 0))).toBe("Empty: 100%");
    });
  });

  describe("with reduced motion", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    const stubReducedMotion = (matches: boolean) =>
      vi.stubGlobal(
        "matchMedia",
        vi.fn((query: string) => ({ matches: matches && query === "(prefers-reduced-motion: reduce)" })),
      );

    it("turns the animation of the ring off", () => {
      stubReducedMotion(true);

      const { container } = render(<StatusChart title="Pods" statuses={statuses} />);

      expect(chartOf(container).config.options?.animation).toBe(false);
    });

    it("keeps the animation of the ring without it", () => {
      stubReducedMotion(false);

      const { container } = render(<StatusChart title="Pods" statuses={statuses} />);

      expect(chartOf(container).config.options?.animation).not.toBe(false);
    });
  });
});
