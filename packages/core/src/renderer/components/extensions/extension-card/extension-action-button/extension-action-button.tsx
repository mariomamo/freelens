import { Spinner } from "@freelensapp/spinner";
import React from "react";
import styles from "./extension-action-button.module.scss";
import { useExtensionActionButton } from "./use-extension-action-button.hook";

export type ExtensionActionState = "install" | "uninstall" | "installing" | "uninstalling" | "update" | "updating";

export interface ExtensionActionButtonProps {
  state: ExtensionActionState;
  onClick: () => void;
}

export const ExtensionActionButton: React.FC<ExtensionActionButtonProps> = ({ state, onClick }) => {
  const { label, variantClass, isSpinnerState } = useExtensionActionButton({ state });

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isSpinnerState}
      className={`${styles.button} ${variantClass} ${isSpinnerState ? styles.spinnerOnly : ""}`}
    >
      {isSpinnerState ? <Spinner className={styles.spinner} /> : label}
    </button>
  );
};
