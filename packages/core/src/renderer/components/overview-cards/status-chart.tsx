/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./status-chart.scss";

import { cssNames } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { useLayoutEffect, useRef, useState } from "react";
import activeThemeInjectable from "../../themes/active.injectable";
import { PieChart } from "../chart";
import { isShown, keysOf, partTestId, sumOf, toTestId } from "./status-keys";

import type { ChartTypeRegistry, TooltipItem } from "chart.js";
import type { IComputedValue } from "mobx";
import type { ReactNode } from "react";

import type { LensTheme } from "../../themes/lens-theme";
import type { PieChartData } from "../chart";
import type { StatusCardProps, StatusCardStatus } from "./status-card";

/**
 * The props of a `StatusChart`, which are the props of a `StatusCard`, so that the same data renders either. The
 * `tone` of a status is accepted, and the ring does not show it.
 */
export type StatusChartProps = StatusCardProps;

interface Dependencies {
  activeTheme: IComputedValue<LensTheme>;
}

type PieChartDataSet = NonNullable<PieChartData["datasets"]>[number];

const prefersReducedMotion = () =>
  typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** A status of the ring: an arc of its dataset and an entry of its legend. */
interface RingStatus {
  key: string;
  /** The status as the legend shows it: the one given, or for an entry that is closing, the last one with items. */
  status: StatusCardStatus;
  /** The color of the arc: the one given, or the last one for a status that is no longer given. */
  color: string;
  /** The number of items of the status, 0 when it has none or is no longer given. */
  count: number;
  /** Whether the status has items. The entry of a status without items is collapsed, and not part of the chart. */
  shown: boolean;
}

interface RingMemory {
  /** The keys of the statuses the ring has got, in the order it first got them. */
  keys: readonly string[];
  /** The last status of each key, with items if it ever had them. */
  last: Map<string, StatusCardStatus>;
  /** The empty text the chart showed last, which it keeps showing while the text closes. */
  emptyText?: string;
}

/**
 * The statuses of the ring, in the order of its dataset and its legend: every status it has got, in the order it
 * first got them, with the statuses it gets for the first time after them. A status keeps its place in the
 * dataset while the statuses before it come and go, whether they are given with a count of 0 or left out of the
 * list, so that Chart.js animates the arc of each status to its new size, and to no width when it has no items,
 * rather than the arc of one status into the arc of another. It keeps its entry of the legend in the same way,
 * which closes rather than leaves when the status has no items.
 *
 * The memory is written while rendering. Rendering the same statuses again gives the same result, so a render that
 * React repeats or discards leaves the memory as a render that it keeps would.
 */
const useRingStatuses = (givenStatuses: readonly StatusCardStatus[]) => {
  const memory = useRef<RingMemory>({ keys: [], last: new Map() }).current;
  const givenKeys = keysOf(givenStatuses);
  const given = new Map(givenKeys.map((key, index) => [key, givenStatuses[index]]));
  const added = givenKeys.filter((key) => !memory.keys.includes(key));

  if (added.length > 0) {
    memory.keys = [...memory.keys, ...added];
  }

  const statuses = memory.keys.map((key): RingStatus => {
    const status = given.get(key);

    if (status && isShown(status)) {
      memory.last.set(key, status);

      return { key, status, color: status.color, count: status.count, shown: true };
    }

    if (status && !memory.last.has(key)) {
      memory.last.set(key, { ...status, count: 0 });
    }

    // Every key the memory has was given once, and has its last status since.
    const last = memory.last.get(key) as StatusCardStatus;

    return { key, status: last, color: status?.color ?? last.color, count: 0, shown: false };
  });

  return { statuses, memory };
};

/**
 * The colors of the statuses as the canvas can draw them. A color is a CSS color, such as `var(--colorOk)`, which
 * Chart.js cannot resolve: the probe, a hidden element of the chart, takes each color in turn, and its computed
 * color is what the ring draws. The colors are resolved again when they or the active theme change, which changes
 * the values of the variables of the theme, before the browser paints.
 *
 * Until the first colors are resolved, after the chart is in the document, the result is undefined.
 */
const useResolvedColors = (colors: readonly string[], theme: LensTheme) => {
  const probe = useRef<HTMLSpanElement>(null);
  const [resolved, setResolved] = useState<ReadonlyMap<string, string>>();
  // The colors by their value, as the array is a new one on every render; a CSS color has no line break.
  const signature = [...new Set(colors)].join("\n");

  useLayoutEffect(() => {
    const element = probe.current;

    if (!element) {
      return;
    }

    const next = new Map<string, string>();

    for (const color of signature ? signature.split("\n") : []) {
      element.style.color = "";
      element.style.color = color;
      next.set(color, element.style.color ? getComputedStyle(element).color : color);
    }

    element.style.color = "";

    setResolved((previous) =>
      previous?.size === next.size && [...next].every(([color, value]) => previous.get(color) === value)
        ? previous
        : next,
    );
    // The theme is not read here: a change of it changes the values of the variables the colors may use.
  }, [signature, theme]);

  return { probe, resolved };
};

/**
 * The tooltip of the ring: the label and the share of the status under the cursor, and never of a status without
 * items, whose arc has no width. `PieChart` takes the options it is given over its own key by key, so the ring
 * gives the whole tooltip, with what `PieChart` has, rather than the filter alone.
 */
const tooltipOptions = {
  mode: "index",
  position: "cursor",
  callbacks: {
    title: () => "",
    label: (context: TooltipItem<keyof ChartTypeRegistry>) => {
      const { data = [], tooltipLabels } = context.dataset as unknown as PieChartDataSet;
      const values = data as number[];
      const total = values.reduce((sum, value) => sum + value, 0);
      const percent = total > 0 ? `${Math.round((values[context.dataIndex] / total) * 100)}%` : "N/A";

      return tooltipLabels?.[context.dataIndex]?.(percent) ?? "";
    },
  },
  filter: (context: TooltipItem<keyof ChartTypeRegistry>) => Number(context.raw) > 0,
} as const;

interface LegendEntryProps {
  open: boolean;
  children: ReactNode;
}

/**
 * An entry of the legend, which opens and closes by its height. Closed, it is not part of the chart: hidden from
 * screen readers, with nothing in it that can be focused.
 */
const LegendEntry = ({ open, children }: LegendEntryProps) => (
  <div
    className="StatusChart-legendEntry"
    data-collapsed={!open || undefined}
    aria-hidden={!open || undefined}
    inert={!open || undefined}
  >
    <div className="StatusChart-legendContent">{children}</div>
  </div>
);

const NonInjectedStatusChart = observer(
  ({
    activeTheme,
    title,
    total: givenTotal,
    statuses: givenStatuses,
    emptyText = "None",
    noStatusText = "No status reported",
    onClick,
    className,
    "data-testid": testId,
  }: Dependencies & StatusChartProps) => {
    const theme = activeTheme.get();
    const { statuses, memory } = useRingStatuses(givenStatuses);
    const counted = sumOf(givenStatuses.filter(isShown));
    const total = givenTotal ?? counted;
    const hasStatuses = statuses.some(({ shown }) => shown);
    const { probe, resolved } = useResolvedColors(
      statuses.map(({ color }) => color),
      theme,
    );

    if (!hasStatuses) {
      memory.emptyText = total > 0 ? noStatusText : emptyText;
    }

    // One dataset for the statuses and the grey ring of no items, which is its first value: 1 when no status has
    // items and 0 otherwise. The ring then turns grey, and back, with the same animation as any other change.
    const chartData: PieChartData = {
      datasets: [
        {
          label: "Status",
          data: [hasStatuses ? 0 : 1, ...statuses.map(({ count }) => count)],
          backgroundColor: [
            theme.colors.pieChartDefaultColor,
            ...statuses.map(({ color }) => resolved?.get(color) ?? "transparent"),
          ],
          tooltipLabels: [
            (percent: string) => `Empty: ${percent}`,
            ...statuses.map(
              ({ status }) =>
                (percent: string) =>
                  `${status.label}: ${percent}`,
            ),
          ],
        },
      ],
    };

    const heading = `${title} (${total})`;

    return (
      <section className={cssNames("StatusChart", className)} aria-label={title} data-testid={testId}>
        <div className="StatusChart-header">
          {onClick ? (
            <button
              type="button"
              className="StatusChart-title"
              onClick={onClick}
              data-testid={partTestId(testId, "title")}
            >
              {heading}
            </button>
          ) : (
            <span className="StatusChart-title" data-testid={partTestId(testId, "title")}>
              {heading}
            </span>
          )}
        </div>
        <div className="StatusChart-body">
          <span className="StatusChart-probe" ref={probe} hidden />
          {resolved && (
            <PieChart
              className="StatusChart-ring"
              data={chartData}
              showLegend={false}
              options={{
                // An object rather than no key, as `Chart` merges the options of an update into those it has: the
                // animation comes back when reduced motion no longer matches.
                animation: prefersReducedMotion() ? false : {},
                elements: {
                  arc: {
                    borderWidth: 0,
                  },
                },
                plugins: {
                  tooltip: tooltipOptions,
                },
              }}
              data-testid={partTestId(testId, "ring")}
            />
          )}
          <div className="StatusChart-legend">
            {statuses.map(({ key, status, shown }) => (
              <LegendEntry key={key} open={shown}>
                <span
                  className="StatusChart-legendItem"
                  data-testid={shown ? partTestId(testId, `status-${toTestId(status.label)}`) : undefined}
                >
                  <span className="StatusChart-swatch" style={{ backgroundColor: status.color }} aria-hidden="true" />
                  <span className="StatusChart-label">{`${status.label}: ${status.count}`}</span>
                </span>
              </LegendEntry>
            ))}
            <LegendEntry open={!hasStatuses}>
              <span className="StatusChart-empty" data-testid={hasStatuses ? undefined : partTestId(testId, "empty")}>
                {memory.emptyText}
              </span>
            </LegendEntry>
          </div>
        </div>
      </section>
    );
  },
);

/**
 * The number of items of one kind and their statuses as a ring chart, as the overviews show them with the Charts
 * style: the title with the total, a ring of the statuses and a legend with each status and its count. It takes the
 * props of a `StatusCard`, so that the same data renders as the one or the other by the style the user chose. The
 * ring does not show the `tone` of the statuses. It has no panel of its own.
 *
 * A change of the statuses is animated: the arc of a status grows and shrinks, to no width when the status has no
 * items, and its entry of the legend opens when the status gets items and closes when it loses them or drops out of
 * the list. Nothing moves with reduced motion.
 */
export const StatusChart = withInjectables<Dependencies, StatusChartProps>(NonInjectedStatusChart, {
  getProps: (di, props) => ({
    ...props,
    activeTheme: di.inject(activeThemeInjectable),
  }),
});
