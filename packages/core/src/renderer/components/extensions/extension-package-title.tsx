import { withInjectables } from "@ogre-tools/injectable-react";
import React from "react";
import openLinkInBrowserInjectable from "../../../common/utils/open-link-in-browser.injectable";
import styles from "./extension-package-title.module.scss";

import type { OpenLinkInBrowser } from "../../../common/utils/open-link-in-browser.injectable";

export interface ExtensionPackageTitleProps {
  name: string;
  repository?: string;
}

interface Dependencies {
  openLinkInBrowser: OpenLinkInBrowser;
}

const splitName = (name: string): { scope: string; pkgName: string } => {
  const idx = name.indexOf("/");
  if (idx < 0) {
    return { scope: "", pkgName: name };
  }
  return { scope: name.slice(0, idx + 1), pkgName: name.slice(idx + 1) };
};

const NonInjectedExtensionPackageTitle = ({
  name,
  repository,
  openLinkInBrowser,
}: ExtensionPackageTitleProps & Dependencies) => {
  const { scope, pkgName } = splitName(name);

  return (
    <h3 className={styles.title}>
      {scope && <span className={styles.scope}>{scope}</span>}
      {repository ? (
        <button
          type="button"
          className={styles.link}
          onClick={() => void openLinkInBrowser(repository)}
          data-testid="extension-package-title-link"
        >
          {pkgName}
        </button>
      ) : (
        <span className={styles.pkgName}>{pkgName}</span>
      )}
    </h3>
  );
};

export const ExtensionPackageTitle = withInjectables<Dependencies, ExtensionPackageTitleProps>(
  NonInjectedExtensionPackageTitle,
  {
    getProps: (di, props) => ({
      ...props,
      openLinkInBrowser: di.inject(openLinkInBrowserInjectable),
    }),
  },
);
