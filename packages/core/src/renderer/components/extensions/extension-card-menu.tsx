import { Icon } from "@freelensapp/icon";
import React from "react";
import { MenuActions, MenuItem } from "../menu";

export interface ExtensionCardMenuProps {
  id: string;
  isEnabled: boolean;
  onDisable: () => void;
  onEnable: () => void;
}

export const ExtensionCardMenu: React.FC<ExtensionCardMenuProps> = ({ id, isEnabled, onDisable, onEnable }) => (
  <MenuActions id={`extension-card-menu-${id}`} usePortal toolbar={false}>
    {isEnabled ? (
      <MenuItem onClick={onDisable}>
        <Icon material="unpublished" />
        <span className="title">Disable</span>
      </MenuItem>
    ) : (
      <MenuItem onClick={onEnable}>
        <Icon material="check_circle" />
        <span className="title">Enable</span>
      </MenuItem>
    )}
  </MenuActions>
);
