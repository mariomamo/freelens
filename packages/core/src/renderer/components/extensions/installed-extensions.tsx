/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import { Spinner } from "@freelensapp/spinner";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React, { useMemo, useState } from "react";
import extensionDiscoveryInjectable from "../../../extensions/extension-discovery/extension-discovery.injectable";
import extensionInstallationStateStoreInjectable from "../../../extensions/extension-installation-state-store/extension-installation-state-store.injectable";
import confirmUninstallExtensionInjectable from "./confirm-uninstall-extension.injectable";
import disableExtensionInjectable from "./disable-extension.injectable";
import enableExtensionInjectable from "./enable-extension.injectable";
import { ExtensionCard } from "./extension-card";
import layoutStyles from "./extensions.module.scss";
import styles from "./installed-extensions.module.scss";
import { SearchBar } from "./search-bar";
import userExtensionsInjectable from "./user-extensions/user-extensions.injectable";

import type { InstalledExtension } from "@freelensapp/legacy-extensions";

import type { IComputedValue } from "mobx";

import type { ExtensionDiscovery } from "../../../extensions/extension-discovery/extension-discovery";
import type { ExtensionInstallationStateStore } from "../../../extensions/extension-installation-state-store/extension-installation-state-store";
import type { ConfirmUninstallExtension } from "./confirm-uninstall-extension.injectable";
import type { DisableExtension } from "./disable-extension.injectable";
import type { EnableExtension } from "./enable-extension.injectable";

interface Dependencies {
  extensionDiscovery: ExtensionDiscovery;
  extensionInstallationStateStore: ExtensionInstallationStateStore;
  userExtensions: IComputedValue<InstalledExtension[]>;
  enableExtension: EnableExtension;
  disableExtension: DisableExtension;
  confirmUninstallExtension: ConfirmUninstallExtension;
}

const NonInjectedInstalledExtensions = observer(
  ({
    extensionDiscovery,
    extensionInstallationStateStore,
    userExtensions,
    confirmUninstallExtension,
    enableExtension,
    disableExtension,
  }: Dependencies) => {
    const [searchQuery, setSearchQuery] = useState("");
    const extensions = userExtensions.get();

    const filteredExtensions = useMemo(() => {
      const lowerCaseQuery = searchQuery.toLowerCase();

      return extensions.filter(
        (ext) =>
          ext.manifest.name.toLowerCase().includes(lowerCaseQuery) ||
          (ext.manifest.description && ext.manifest.description.toLowerCase().includes(lowerCaseQuery)),
      );
    }, [extensions, searchQuery]);

    if (!extensionDiscovery.isLoaded) {
      return (
        <div>
          <Spinner center />
        </div>
      );
    }

    if (extensions.length === 0) {
      return (
        <div className="flex column h-full items-center justify-center">
          <Icon material="extension" className={styles.noItemsIcon} />
          <h3 className="font-medium text-3xl mt-5 mb-2">There are no extensions installed.</h3>
          <p>Please use the form above to install or drag a tarball file here.</p>
        </div>
      );
    }

    return (
      <section data-testid="extensions-table">
        <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search..." />
        <div className={layoutStyles.grid}>
          {filteredExtensions.map((extension) => {
            const { id, isEnabled } = extension;
            const isUninstalling = extensionInstallationStateStore.isExtensionUninstalling(id);

            return (
              <ExtensionCard
                key={extension.id}
                variant="installed"
                extension={extension}
                isUninstalling={isUninstalling}
                isDisabled={isEnabled === false}
                onUninstall={() => confirmUninstallExtension(extension)}
                onDisable={() => disableExtension(id)}
                onEnable={() => enableExtension(id)}
              />
            );
          })}
        </div>
      </section>
    );
  },
);

export const InstalledExtensions = withInjectables<Dependencies>(NonInjectedInstalledExtensions, {
  getProps: (di) => ({
    extensionDiscovery: di.inject(extensionDiscoveryInjectable),
    extensionInstallationStateStore: di.inject(extensionInstallationStateStoreInjectable),
    userExtensions: di.inject(userExtensionsInjectable),
    enableExtension: di.inject(enableExtensionInjectable),
    disableExtension: di.inject(disableExtensionInjectable),
    confirmUninstallExtension: di.inject(confirmUninstallExtensionInjectable),
  }),
});
