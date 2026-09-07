/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import React from "react";
import { gt } from "semver";
import { ExtensionActionButton, type ExtensionActionState } from "./extension-action-button";
import { ExtensionAuthors } from "./extension-authors";
import styles from "./extension-card.module.scss";
import { ExtensionCardMenu } from "./extension-card-menu";
import { ExtensionIcon } from "./extension-icon";
import { ExtensionPackageTitle } from "./extension-package-title";
import { ExtensionStatusBadge } from "./extension-status-badge";
import { ExtensionVersionPill } from "./extension-version-pill";

import type { InstalledExtension } from "@freelensapp/legacy-extensions";

import type { MarketplaceExtension } from "./marketplace-extensions/marketplace-extensions.injectable";

interface MarketplaceCardProps {
  variant: "marketplace";
  extension: MarketplaceExtension;
  installedExtension?: InstalledExtension;
  isInstalling?: boolean;
  isUpdating?: boolean;
  isUninstalling?: boolean;
  isDisabled?: boolean;
  onInstall: () => void;
  onUpdate: () => void;
  onUninstall: () => void;
  onDisable: () => void;
  onEnable: () => void;
}

interface InstalledCardProps {
  variant: "installed";
  extension: InstalledExtension;
  isInstalling?: boolean;
  isUninstalling?: boolean;
  isDisabled?: boolean;
  onUninstall: () => void;
  onDisable: () => void;
  onEnable: () => void;
}

export type ExtensionCardProps = MarketplaceCardProps | InstalledCardProps;

const hasNewerVersion = (marketplaceVersion: string, installedVersion: string): boolean =>
  gt(marketplaceVersion, installedVersion);

const deriveCtaState = (props: ExtensionCardProps): ExtensionActionState => {
  // The update flow uninstalls the old version before installing the new one,
  // so keep the "updating" state even when the extension is temporarily gone.
  if (props.variant === "marketplace" && props.isUpdating) return "updating";

  if (props.variant === "marketplace" && props.installedExtension) {
    const updateAvailable = hasNewerVersion(props.extension.version, props.installedExtension.manifest.version);

    if (updateAvailable) {
      return props.isInstalling ? "updating" : "update";
    }
  }

  if (props.isInstalling) return "installing";
  if (props.isUninstalling) return "uninstalling";
  if (props.variant === "installed") return "uninstall";
  if (props.installedExtension) return "uninstall";
  return "install";
};

const deriveCardTestId = (props: ExtensionCardProps): string =>
  props.variant === "installed" || (props.variant === "marketplace" && props.installedExtension)
    ? "installed-extension-card"
    : "marketplace-extension-card";

export const ExtensionCard: React.FC<ExtensionCardProps> = (props) => {
  const isMarketplace = props.variant === "marketplace";
  const isDisabled = props.isDisabled === true;
  const installedExtension = isMarketplace ? props.installedExtension : props.extension;

  const name = isMarketplace ? props.extension.name : props.extension.manifest.name;
  const version = isMarketplace ? props.extension.version : props.extension.manifest.version;
  const description = isMarketplace
    ? props.extension.description
    : props.extension.manifest.description || "No description available";
  const status = isMarketplace ? props.extension.status : "official";
  const authors = isMarketplace ? (props.extension.authors ?? []) : [];

  const ctaState = deriveCtaState(props);
  let ctaHandler: () => void;

  if (isMarketplace && (ctaState === "update" || ctaState === "updating")) {
    ctaHandler = props.onUpdate;
  } else if (isMarketplace) {
    ctaHandler = props.installedExtension ? props.onUninstall : props.onInstall;
  } else {
    ctaHandler = props.onUninstall;
  }

  return (
    <div className={`${styles.card} ${isDisabled ? styles.disabled : ""}`} data-testid={deriveCardTestId(props)}>
      {isDisabled && <div className={styles.disabledOverlay} />}
      <div className={styles.iconColumn}>
        <ExtensionIcon disabled={isDisabled} />
        <ExtensionVersionPill version={version} />
      </div>

      <div className={styles.metadata}>
        <div className={styles.headerRow}>
          <ExtensionStatusBadge variant={status} />
          <ExtensionPackageTitle name={name} repository={isMarketplace ? props.extension.repository : undefined} />
        </div>
        <div className={styles.metaRow}>
          <ExtensionAuthors authors={authors} disabled={isDisabled} />
        </div>
        <p className={`${styles.description} ${isDisabled ? styles.textDisabled : ""}`}>{description}</p>
      </div>

      <div className={`${styles.footer} ${isDisabled ? styles.footerLifted : ""}`}>
        <div className={styles.footerTop}>
          {isDisabled && <span className={styles.statusDisabled}>DISABLED</span>}
          {installedExtension && (
            <ExtensionCardMenu
              id={installedExtension.id}
              isEnabled={installedExtension.isEnabled}
              onDisable={props.onDisable}
              onEnable={props.onEnable}
              onUninstall={props.onUninstall}
            />
          )}
        </div>
        <div className={styles.ctaArea}>
          <ExtensionActionButton state={ctaState} onClick={ctaHandler} />
        </div>
      </div>
    </div>
  );
};
