import { withTooltip } from "@freelensapp/tooltip";
import React, { useEffect, useRef, useState } from "react";
import { authorKey, avatarClassFor, fullNameOf, initialsOf } from "./extension-author-helpers";
import styles from "./extension-collaborators-popover.module.scss";

import type { MarketplaceExtensionAuthor } from "./marketplace-extensions/marketplace-extensions.injectable";

export interface ExtensionCollaboratorsPopoverProps {
  authors: MarketplaceExtensionAuthor[];
  onDismiss: () => void;
  disabled?: boolean;
}

const TooltipableName = withTooltip(({ className, children, ...elemProps }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span className={className} {...elemProps}>
    {children}
  </span>
));

const AuthorName: React.FC<{ name: string }> = ({ name }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [needsTooltip, setNeedsTooltip] = useState(false);

  useEffect(() => {
    const el = ref.current;

    if (el) {
      setNeedsTooltip(el.scrollWidth > el.clientWidth);
    }
  }, [name]);

  if (needsTooltip) {
    return (
      <TooltipableName tooltip={name} className={styles.authorName}>
        {name}
      </TooltipableName>
    );
  }

  return (
    <span ref={ref} className={styles.authorName}>
      {name}
    </span>
  );
};

export const ExtensionCollaboratorsPopover: React.FC<ExtensionCollaboratorsPopoverProps> = ({
  authors,
  onDismiss,
  disabled,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (popoverRef.current && target && !popoverRef.current.contains(target)) {
        onDismiss();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [onDismiss]);

  return (
    <div
      ref={popoverRef}
      className={`${styles.popover} ${disabled ? styles.disabled : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Collaborators"
      data-testid="collaborators-popover"
    >
      {disabled && <div className={styles.disabledVeil} />}
      <div className={styles.list}>
        {authors.map((a) => (
          <div key={authorKey(a)} className={styles.row}>
            <span className={`${styles.avatar} ${styles[avatarClassFor(a.name)]}`}>{initialsOf(a)}</span>
            <AuthorName name={fullNameOf(a)} />
          </div>
        ))}
      </div>
    </div>
  );
};
