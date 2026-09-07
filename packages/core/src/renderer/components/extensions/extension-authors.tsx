import { Icon } from "@freelensapp/icon";
import React, { Fragment, useCallback, useState } from "react";
import { authorKey, avatarClassFor, fullNameOf, initialsOf } from "./extension-author-helpers";
import styles from "./extension-authors.module.scss";
import { ExtensionCollaboratorsPopover } from "./extension-collaborators-popover";

import type { MarketplaceExtensionAuthor } from "./marketplace-extensions/marketplace-extensions.injectable";

export interface ExtensionAuthorsProps {
  authors: MarketplaceExtensionAuthor[];
  disabled?: boolean;
}

const AuthorItem: React.FC<{ author: MarketplaceExtensionAuthor; disabled?: boolean }> = ({ author, disabled }) => (
  <span className={styles.authorItem}>
    <span
      className={`${styles.avatar} ${styles[avatarClassFor(author.name)]} ${disabled ? styles.avatarDisabled : ""}`}
    >
      {initialsOf(author)}
    </span>
    <span className={`${styles.authorName} ${disabled ? styles.nameDisabled : ""}`}>{fullNameOf(author)}</span>
  </span>
);

export const ExtensionAuthors: React.FC<ExtensionAuthorsProps> = ({ authors, disabled }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const handleDismiss = useCallback(() => setIsPopoverOpen(false), []);
  const handleToggle = useCallback(() => setIsPopoverOpen((open) => !open), []);

  if (authors.length === 0) return null;

  const visible = authors.slice(0, 2);
  const remaining = authors.length - visible.length;

  return (
    <div className={styles.row}>
      <span className={styles.prefix}>by</span>
      {visible.map((a, index) => (
        <Fragment key={authorKey(a)}>
          <AuthorItem author={a} disabled={disabled} />
          {(index < visible.length - 1 || remaining > 0) && <span className={styles.separator}>,</span>}
        </Fragment>
      ))}
      {remaining > 0 && (
        <span className={styles.triggerWrapper}>
          <button
            type="button"
            className={`${styles.trigger} ${isPopoverOpen ? styles.open : ""}`}
            onClick={handleToggle}
            onMouseDown={(event) => event.stopPropagation()}
            aria-haspopup="dialog"
            aria-expanded={isPopoverOpen}
            data-testid="collaborators-trigger"
          >
            +{remaining} others
            <Icon material="expand_more" className={styles.chevron} />
          </button>
          {isPopoverOpen && (
            <ExtensionCollaboratorsPopover authors={authors} onDismiss={handleDismiss} disabled={disabled} />
          )}
        </span>
      )}
    </div>
  );
};
