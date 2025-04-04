/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./line-progress.scss";
import React from "react";
import type { StrictReactNode } from "@freelensapp/utilities";
import { cssNames } from "@freelensapp/utilities";
import { withTooltip } from "@freelensapp/tooltip";

export interface LineProgressProps extends React.HTMLProps<HTMLDivElement> {
  value: number;
  min?: number;
  max?: number;
  className?: any;
  precise?: number;
  children?: StrictReactNode;
}

function valuePercent({ value, min, max, precise }: Required<Pick<LineProgressProps, "value" | "min" | "max" | "precise">>) {
  return Math.min(100, value / (max - min) * 100).toFixed(precise);
}

export const LineProgress = withTooltip(({
  className,
  min = 0,
  max = 100,
  value,
  precise = 2,
  children,
  ...props
}: LineProgressProps) => (
  <div className={cssNames("LineProgress", className)} {...props}>
    <div
      className="line"
      style={{
        width: `${valuePercent({ min, max, value, precise })}%`,
      }}
    />
    {children}
  </div>
));
