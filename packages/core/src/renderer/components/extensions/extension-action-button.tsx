import { Spinner } from "@freelensapp/spinner";
import React from "react";
import styles from "./extension-action-button.module.scss";

export type ExtensionActionState = "install" | "uninstall" | "installing" | "uninstalling" | "update" | "updating";

export interface ExtensionActionButtonProps {
  state: ExtensionActionState;
  onClick: () => void;
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

export const ExtensionActionButton: React.FC<ExtensionActionButtonProps> = ({ state, onClick }) => {
  const isSpinnerState = state === "installing" || state === "uninstalling" || state === "updating";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isSpinnerState}
      className={`${styles.button} ${variantClassFor(state)} ${isSpinnerState ? styles.spinnerOnly : ""}`}
    >
      {isSpinnerState ? <Spinner className={styles.spinner} /> : labelFor(state)}
    </button>
  );
};
