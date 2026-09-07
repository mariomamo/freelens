import "@testing-library/jest-dom";
import { fireEvent, screen, within } from "@testing-library/react";
import React from "react";
import openLinkInBrowserInjectable from "../../../../common/utils/open-link-in-browser.injectable";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import { renderFor } from "../../test-utils/renderFor";
import { ExtensionCollaboratorsPopover } from "../extension-collaborators-popover";

import type { MarketplaceExtensionAuthor } from "../marketplace-extensions/marketplace-extensions.injectable";

const authors: MarketplaceExtensionAuthor[] = [
  { name: "Alice", surname: "Adams" },
  { name: "Bob", surname: "Brown" },
  { name: "Carol" },
  { name: "Dave", surname: "Davis" },
];

describe("ExtensionCollaboratorsPopover", () => {
  let di: ReturnType<typeof getDiForUnitTesting>;
  let render: ReturnType<typeof renderFor>;
  let openLinkInBrowser: jest.Mock;

  beforeEach(() => {
    di = getDiForUnitTesting();
    render = renderFor(di);
    openLinkInBrowser = jest.fn();
    di.override(openLinkInBrowserInjectable, () => openLinkInBrowser);
  });

  it("renders all authors", () => {
    const onDismiss = jest.fn();
    render(<ExtensionCollaboratorsPopover authors={authors} onDismiss={onDismiss} />);
    expect(screen.getByText("Alice Adams")).toBeInTheDocument();
    expect(screen.getByText("Bob Brown")).toBeInTheDocument();
    expect(screen.getByText("Carol")).toBeInTheDocument();
    expect(screen.getByText("Dave Davis")).toBeInTheDocument();
  });

  it("calls onDismiss when Escape is pressed", () => {
    const onDismiss = jest.fn();
    render(<ExtensionCollaboratorsPopover authors={authors} onDismiss={onDismiss} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("calls onDismiss when clicking outside the popover", () => {
    const onDismiss = jest.fn();
    render(
      <div>
        <div data-testid="outside">outside</div>
        <ExtensionCollaboratorsPopover authors={authors} onDismiss={onDismiss} />
      </div>,
    );
    fireEvent.mouseDown(screen.getByTestId("outside"));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("does not call onDismiss when clicking inside the popover", () => {
    const onDismiss = jest.fn();
    render(<ExtensionCollaboratorsPopover authors={authors} onDismiss={onDismiss} />);
    fireEvent.mouseDown(screen.getByText("Alice Adams"));
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("renders github and website icons per author only when present", () => {
    const authorsWithLinks: MarketplaceExtensionAuthor[] = [
      { name: "Alice", github: "https://github.com/alice", website: "www.alice.dev" },
      { name: "Bob", website: "www.bob.dev" },
      { name: "Carol" },
    ];
    render(<ExtensionCollaboratorsPopover authors={authorsWithLinks} onDismiss={jest.fn()} />);

    const popover = screen.getByTestId("collaborators-popover");
    expect(within(popover).getAllByRole("button", { name: /github/i })).toHaveLength(1);
    expect(within(popover).getAllByRole("button", { name: /website/i })).toHaveLength(2);
  });

  it("opens the github link when the github icon is clicked", () => {
    const authorsWithLinks: MarketplaceExtensionAuthor[] = [{ name: "Alice", github: "github.com/alice" }];
    render(<ExtensionCollaboratorsPopover authors={authorsWithLinks} onDismiss={jest.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /github/i }));

    expect(openLinkInBrowser).toHaveBeenCalledWith("https://github.com/alice");
  });

  it("opens the website link when the website icon is clicked", () => {
    const authorsWithLinks: MarketplaceExtensionAuthor[] = [{ name: "Alice", website: "www.alice.dev" }];
    render(<ExtensionCollaboratorsPopover authors={authorsWithLinks} onDismiss={jest.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /website/i }));

    expect(openLinkInBrowser).toHaveBeenCalledWith("https://www.alice.dev");
  });
});
