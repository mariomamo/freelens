/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import type { TerminalDependencies } from "./terminal";
import { Terminal } from "./terminal";
import type { TabId } from "../dock/store";
import type { TerminalApi } from "../../../api/terminal-api";
import terminalSpawningPoolInjectable from "./terminal-spawning-pool.injectable";
import isMacInjectable from "../../../../common/vars/is-mac.injectable";
import openLinkInBrowserInjectable from "../../../../common/utils/open-link-in-browser.injectable";
import xtermColorThemeInjectable from "../../../themes/terminal-colors.injectable";
import { loggerInjectionToken } from "@freelensapp/logger";
import terminalConfigInjectable from "../../../../features/user-preferences/common/terminal-config.injectable";
import terminalCopyOnSelectInjectable from "../../../../features/user-preferences/common/terminal-copy-on-select.injectable";
import { terminalFontInjectionToken } from "../../../../features/terminal/renderer/fonts/token";

export type CreateTerminal = (tabId: TabId, api: TerminalApi) => Terminal;

const createTerminalInjectable = getInjectable({
  id: "create-terminal",
  instantiate: (di): CreateTerminal => {
    const dependencies: TerminalDependencies = {
      spawningPool: di.inject(terminalSpawningPoolInjectable),
      terminalConfig: di.inject(terminalConfigInjectable),
      terminalCopyOnSelect: di.inject(terminalCopyOnSelectInjectable),
      terminalFonts: di.injectMany(terminalFontInjectionToken),
      isMac: di.inject(isMacInjectable),
      openLinkInBrowser: di.inject(openLinkInBrowserInjectable),
      xtermColorTheme: di.inject(xtermColorThemeInjectable),
      logger: di.inject(loggerInjectionToken),
    };

    return (tabId, api) => new Terminal(dependencies, { tabId, api });
  },
});

export default createTerminalInjectable;
