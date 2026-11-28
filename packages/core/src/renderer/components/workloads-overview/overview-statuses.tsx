/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./overview-statuses.scss";

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { formatKubeApiResource } from "../../../common/rbac";
import overviewStyleInjectable from "../../../features/user-preferences/common/overview-style.injectable";
import namespaceStoreInjectable from "../namespaces/store.injectable";
import { StatusChart } from "../overview-cards";
import { toTestId, toWorkloadStatusProps, WorkloadStatusCards } from "./workload-status-cards";
import workloadsInjectable from "./workloads/workloads.injectable";

import type { IComputedValue } from "mobx";

import type { OverviewStylePreference } from "../../../features/user-preferences/common/preferences-helpers";
import type { NamespaceStore } from "../namespaces/store";
import type { NamespaceScope } from "./workload-status-cards";
import type { Workload } from "./workloads/workload-injection-token";

export interface OverviewStatusesProps {}

interface Dependencies {
  workloads: IComputedValue<Workload[]>;
  overviewStyle: IComputedValue<OverviewStylePreference>;
  namespaceStore: NamespaceStore;
}

// The workloads are counted in the context namespaces of the namespace store, and the namespace
// filter labels them "All namespaces" by the same rule.
const getNamespaceScope = (namespaceStore: NamespaceStore): NamespaceScope => {
  const namespaces = namespaceStore.contextNamespaces;

  if (namespaceStore.areAllSelectedImplicitly || namespaces.length === 0) {
    return "all";
  }

  return namespaces.length === 1 ? "one" : "several";
};

interface WorkloadStatusChartProps {
  workload: Workload;
  namespaceScope: NamespaceScope;
}

/** The ring of one kind of workload, from the props its status card has. */
const WorkloadStatusChart = observer(({ workload, namespaceScope }: WorkloadStatusChartProps) => (
  <StatusChart
    {...toWorkloadStatusProps(workload, namespaceScope)}
    data-testid={`workload-overview-status-chart-${toTestId(workload.title)}`}
  />
));

const NonInjectedOverviewStatuses = observer(
  ({ workloads, overviewStyle, namespaceStore }: Dependencies & OverviewStatusesProps) => {
    const namespaceScope = getNamespaceScope(namespaceStore);

    if (overviewStyle.get() === "cards") {
      return <WorkloadStatusCards workloads={workloads.get()} namespaceScope={namespaceScope} />;
    }

    // The rings share one panel, which tells the Charts style apart from the Cards.
    return (
      <div className="OverviewStatuses">
        <div className="workloads">
          {workloads.get().map((workload) => (
            <WorkloadStatusChart
              key={formatKubeApiResource(workload.resource)}
              workload={workload}
              namespaceScope={namespaceScope}
            />
          ))}
        </div>
      </div>
    );
  },
);

export const OverviewStatuses = withInjectables<Dependencies, OverviewStatusesProps>(NonInjectedOverviewStatuses, {
  getProps: (di, props) => ({
    workloads: di.inject(workloadsInjectable),
    overviewStyle: di.inject(overviewStyleInjectable),
    namespaceStore: di.inject(namespaceStoreInjectable),
    ...props,
  }),
});
