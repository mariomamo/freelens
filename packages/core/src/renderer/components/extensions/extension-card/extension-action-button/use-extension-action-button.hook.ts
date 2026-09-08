/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import styles from "./extension-action-button.module.scss";

import type { ExtensionActionState } from "./extension-action-button";

export interface UseExtensionActionButtonArgs {
  state: ExtensionActionState;
}

export interface UseExtensionActionButtonResult {
  label: string;
  variantClass: string;
  isSpinnerState: boolean;
}

const labelFor = (state: ExtensionActionState): string => {
  switch (state) {
    case "install":
    case "installing":
      return "Install";
    case "uninstall":
    case "uninstalling":
      return "Uninstall";
    case "update":
    case "updating":
      return "Update";
  }
};

const variantClassFor = (state: ExtensionActionState): string => {
  switch (state) {
    case "install":
    case "installing":
      return styles.install;
    case "update":
    case "updating":
      return styles.update;
    case "uninstall":
    case "uninstalling":
      return styles.uninstall;
  }
};

export const useExtensionActionButton = ({ state }: UseExtensionActionButtonArgs): UseExtensionActionButtonResult => {
  const label = labelFor(state);
  const variantClass = variantClassFor(state);
  const isSpinnerState = state === "installing" || state === "uninstalling" || state === "updating";

  return { label, variantClass, isSpinnerState };
};
