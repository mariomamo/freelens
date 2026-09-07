import "@testing-library/jest-dom";
import { fireEvent, screen, within } from "@testing-library/react";
import React from "react";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import { renderFor } from "../../test-utils/renderFor";
import { ExtensionAuthors } from "../extension-authors";

import type { MarketplaceExtensionAuthor } from "../marketplace-extensions/marketplace-extensions.injectable";

describe("ExtensionAuthors", () => {
  let di: ReturnType<typeof getDiForUnitTesting>;
  let render: ReturnType<typeof renderFor>;

  beforeEach(() => {
    di = getDiForUnitTesting();
    render = renderFor(di);
  });

  it("renders nothing when authors is empty", () => {
    const { container } = render(<ExtensionAuthors authors={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders initials and full name when author has surname", () => {
    const authors: MarketplaceExtensionAuthor[] = [{ name: "Alex", surname: "Ionescu" }];
    render(<ExtensionAuthors authors={authors} />);
    expect(screen.getByText("AI")).toBeInTheDocument();
    expect(screen.getByText(/Alex Ionescu/)).toBeInTheDocument();
  });

  it("falls back to single initial when surname is missing", () => {
    const authors: MarketplaceExtensionAuthor[] = [{ name: "Maria" }];
    render(<ExtensionAuthors authors={authors} />);
    expect(screen.getByText("M")).toBeInTheDocument();
    expect(screen.getByText("Maria")).toBeInTheDocument();
  });

  it("shows at most two authors and a '+N others' trigger when more than two are present", () => {
    const authors: MarketplaceExtensionAuthor[] = [
      { name: "Alex", surname: "Ionescu" },
      { name: "Maria", surname: "Rossi" },
      { name: "John", surname: "Smith" },
      { name: "Jane", surname: "Doe" },
    ];
    render(<ExtensionAuthors authors={authors} />);
    expect(screen.getByText(/Alex Ionescu/)).toBeInTheDocument();
    expect(screen.getByText(/Maria Rossi/)).toBeInTheDocument();
    expect(screen.queryByText(/John Smith/)).not.toBeInTheDocument();
    expect(screen.getByTestId("collaborators-trigger")).toHaveTextContent("+2 others");
  });

  it("opens the popover when the trigger is clicked", () => {
    const authors: MarketplaceExtensionAuthor[] = [{ name: "Alex" }, { name: "Maria" }, { name: "John" }];
    render(<ExtensionAuthors authors={authors} />);
    fireEvent.click(screen.getByTestId("collaborators-trigger"));
    const popover = screen.getByTestId("collaborators-popover");
    expect(popover).toBeInTheDocument();
    expect(within(popover).getByText("Alex")).toBeInTheDocument();
    expect(within(popover).getByText("John")).toBeInTheDocument();
  });

  it("does not render a trigger when authors.length <= 2", () => {
    const authors: MarketplaceExtensionAuthor[] = [{ name: "Alex" }, { name: "Maria" }];
    render(<ExtensionAuthors authors={authors} />);
    expect(screen.queryByTestId("collaborators-trigger")).not.toBeInTheDocument();
  });

  it("sets aria-haspopup and aria-expanded on the trigger button", () => {
    const authors: MarketplaceExtensionAuthor[] = [{ name: "Alex" }, { name: "Maria" }, { name: "John" }];
    render(<ExtensionAuthors authors={authors} />);
    const trigger = screen.getByTestId("collaborators-trigger");
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });
});
