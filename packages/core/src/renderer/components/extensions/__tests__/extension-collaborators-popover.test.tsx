import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { ExtensionCollaboratorsPopover } from "../extension-collaborators-popover";

import type { MarketplaceExtensionAuthor } from "../marketplace-extensions/marketplace-extensions.injectable";

const authors: MarketplaceExtensionAuthor[] = [
  { name: "Alice", surname: "Adams" },
  { name: "Bob", surname: "Brown" },
  { name: "Carol" },
  { name: "Dave", surname: "Davis" },
];

describe("ExtensionCollaboratorsPopover", () => {
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
});
