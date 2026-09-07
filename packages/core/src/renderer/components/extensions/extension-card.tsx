/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import React from "react";
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
  isUninstalling?: boolean;
  isDisabled?: boolean;
  onInstall: () => void;
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

const deriveCtaState = (props: ExtensionCardProps): ExtensionActionState => {
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
  const ctaHandler = isMarketplace
    ? props.installedExtension
      ? props.onUninstall
      : props.onInstall
    : props.onUninstall;

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
          <ExtensionPackageTitle name={name} />
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
