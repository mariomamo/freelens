import { Icon } from "@freelensapp/icon";
import React from "react";
import styles from "./extension-status-badge.module.scss";

export type ExtensionStatusBadgeVariant = "official" | "community";

export interface ExtensionStatusBadgeProps {
  variant: ExtensionStatusBadgeVariant;
}

export const ExtensionStatusBadge: React.FC<ExtensionStatusBadgeProps> = ({ variant }) => {
  if (variant === "community") return null;
  return <Icon material="verified" small className={styles.verifiedIcon} />;
};
