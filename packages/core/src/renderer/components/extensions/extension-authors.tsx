import { Icon } from "@freelensapp/icon";
import { withInjectables } from "@ogre-tools/injectable-react";
import React, { Fragment, useCallback, useEffect, useRef, useState } from "react";
import openLinkInBrowserInjectable from "../../../common/utils/open-link-in-browser.injectable";
import { authorKey, avatarClassFor, fullNameOf, initialsOf, toHttpUrl } from "./extension-author-helpers";
import styles from "./extension-authors.module.scss";
import { ExtensionCollaboratorsPopover } from "./extension-collaborators-popover";
import { GithubIcon } from "./github-icon";

import type { OpenLinkInBrowser } from "../../../common/utils/open-link-in-browser.injectable";
import type { MarketplaceExtensionAuthor } from "./marketplace-extensions/marketplace-extensions.injectable";

export interface ExtensionAuthorsProps {
  authors: MarketplaceExtensionAuthor[];
  disabled?: boolean;
}

interface Dependencies {
  openLinkInBrowser: OpenLinkInBrowser;
}

const hasLinks = (author: MarketplaceExtensionAuthor): boolean => Boolean(author.github || author.website);

const AuthorLinksTooltip: React.FC<{ author: MarketplaceExtensionAuthor; openLinkInBrowser: OpenLinkInBrowser }> = ({
  author,
  openLinkInBrowser,
}) => {
  if (!hasLinks(author)) return null;

  return (
    <div className={styles.authorTooltip} data-testid="author-links-tooltip">
      {author.github && (
        <button
          type="button"
          className={styles.tooltipRow}
          onClick={() => void openLinkInBrowser(toHttpUrl(author.github!))}
        >
          <GithubIcon className={styles.tooltipIcon} />
          <span>github</span>
        </button>
      )}
      {author.website && (
        <button
          type="button"
          className={styles.tooltipRow}
          onClick={() => void openLinkInBrowser(toHttpUrl(author.website!))}
        >
          <Icon material="language" className={styles.tooltipIcon} />
          <span>website</span>
        </button>
      )}
    </div>
  );
};

const AuthorItem: React.FC<{
  author: MarketplaceExtensionAuthor;
  disabled?: boolean;
  openLinkInBrowser: OpenLinkInBrowser;
}> = ({ author, disabled, openLinkInBrowser }) => {
  const [isHovered, setIsHovered] = useState(false);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => clearTimeout(hideTimeoutRef.current);
  }, []);

  const handleMouseEnter = () => {
    clearTimeout(hideTimeoutRef.current);

    if (!disabled && hasLinks(author)) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    // keep the tooltip open briefly so the mouse has time to reach it
    hideTimeoutRef.current = setTimeout(() => setIsHovered(false), 60);
  };

  return (
    <span
      className={styles.authorItem}
      data-testid="author-item"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span
        className={`${styles.avatar} ${styles[avatarClassFor(author.name)]} ${disabled ? styles.avatarDisabled : ""}`}
      >
        {initialsOf(author)}
      </span>
      <span className={`${styles.authorName} ${disabled ? styles.nameDisabled : ""}`}>{fullNameOf(author)}</span>
      {isHovered && <AuthorLinksTooltip author={author} openLinkInBrowser={openLinkInBrowser} />}
    </span>
  );
};

const NonInjectedExtensionAuthors = ({
  authors,
  disabled,
  openLinkInBrowser,
}: ExtensionAuthorsProps & Dependencies) => {
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
          <AuthorItem author={a} disabled={disabled} openLinkInBrowser={openLinkInBrowser} />
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

export const ExtensionAuthors = withInjectables<Dependencies, ExtensionAuthorsProps>(NonInjectedExtensionAuthors, {
  getProps: (di, props) => ({
    ...props,
    openLinkInBrowser: di.inject(openLinkInBrowserInjectable),
  }),
});
