/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { PascalCase } from "@freelensapp/type-fest";

// The statuses of the workloads and their colors. The overview shows them with a `StatusCard` or a `StatusChart`
// per kind of workload, from the props `toWorkloadStatusProps` of `./workload-status-cards` gives.

export type LowercaseOrPascalCase<T extends string> = Lowercase<T> | PascalCase<T>;

export type WorkloadStatus = Partial<Record<LowercaseOrPascalCase<keyof typeof statusBackgroundColorMapping>, number>>;

export const statusBackgroundColorMapping = {
  running: "colorOk",
  scheduled: "colorOk",
  pending: "colorWarning",
  suspended: "colorWarning",
  evicted: "colorError",
  succeeded: "colorSuccess",
  failed: "colorError",
  terminating: "colorTerminated",
  finalizing: "colorTerminated",
  terminated: "colorTerminated",
  unknown: "colorVague",
  complete: "colorSuccess",
} as const;
