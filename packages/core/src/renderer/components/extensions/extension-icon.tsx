import { Icon } from "@freelensapp/icon";
import React from "react";
import styles from "./extension-icon.module.scss";

export interface ExtensionIconProps {
  disabled?: boolean;
}

export const ExtensionIcon: React.FC<ExtensionIconProps> = ({ disabled }) => (
  <div className={`${styles.icon} ${disabled ? styles.disabled : ""}`}>
    <Icon material="extension" />
  </div>
);
