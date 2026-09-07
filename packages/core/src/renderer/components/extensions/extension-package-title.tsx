import React from "react";
import styles from "./extension-package-title.module.scss";

export interface ExtensionPackageTitleProps {
  name: string;
}

const splitName = (name: string): { scope: string; pkgName: string } => {
  const idx = name.indexOf("/");
  if (idx < 0) {
    return { scope: "", pkgName: name };
  }
  return { scope: name.slice(0, idx + 1), pkgName: name.slice(idx + 1) };
};

export const ExtensionPackageTitle: React.FC<ExtensionPackageTitleProps> = ({ name }) => {
  const { scope, pkgName } = splitName(name);
  return (
    <h3 className={styles.title}>
      {scope && <span className={styles.scope}>{scope}</span>}
      <span className={styles.pkgName}>{pkgName}</span>
    </h3>
  );
};
