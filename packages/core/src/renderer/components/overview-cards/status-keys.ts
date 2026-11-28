/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// What `StatusCard` and `StatusChart` share about their statuses: how a status is followed from one render to
// the next, whether it has items, and the test ids of its parts.

import type { StatusCardStatus } from "./status-card";

/**
 * The key of each status: its label, so that the parts of a status keep their elements while the statuses before
 * them come and go. The labels of one component are meant to be distinct; a repeated one gets the number of its
 * occurrence, so that its keys stay unique.
 */
export const keysOf = (statuses: readonly StatusCardStatus[]) => {
  const seen = new Map<string, number>();

  return statuses.map(({ label }) => {
    const occurrence = seen.get(label) ?? 0;

    seen.set(label, occurrence + 1);

    return occurrence === 0 ? label : `${label}\n${occurrence}`;
  });
};

/** Whether a status has items, and so is shown. */
export const isShown = (status: StatusCardStatus) => Number.isFinite(status.count) && status.count > 0;

export const sumOf = (statuses: readonly StatusCardStatus[]) => statuses.reduce((sum, status) => sum + status.count, 0);

export const toTestId = (label: string) => label.toLowerCase().replace(/\s+/g, "-");

export const partTestId = (testId: string | undefined, part: string) => (testId ? `${testId}-${part}` : undefined);
