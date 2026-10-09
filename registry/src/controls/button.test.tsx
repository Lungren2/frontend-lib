import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ui } from "../index";

describe("ui.button", () => {
  it("uses Fluid Functionalism's canonical size and variant vocabulary", () => {
    render(
      <>
        <ui.button size="compact" variant="secondary">Save</ui.button>
        <ui.button variant="tertiary">Options</ui.button>
      </>,
    );
    const save = screen.getByRole("button", { name: "Save" });
    expect(save.tagName).toBe("BUTTON");
    expect(save).toHaveAttribute("data-ui", "button");
    expect(save).toHaveAttribute("data-size", "compact");
    expect(save).toHaveAttribute("data-variant", "secondary");
    expect(screen.getByRole("button", { name: "Options" })).toHaveAttribute(
      "data-variant",
      "tertiary",
    );
  });

  it("preserves click behavior and prevents disabled interaction", () => {
    const enabled = vi.fn();
    const disabled = vi.fn();
    render(
      <>
        <ui.button onClick={enabled}>Enabled</ui.button>
        <ui.button disabled onClick={disabled}>Disabled</ui.button>
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Enabled" }));
    fireEvent.click(screen.getByRole("button", { name: "Disabled" }));
    expect(enabled).toHaveBeenCalledOnce();
    expect(disabled).not.toHaveBeenCalled();
  });

  it("preserves its label but blocks interaction while loading", () => {
    const onClick = vi.fn();
    render(<ui.button loading onClick={onClick}>Saving</ui.button>);
    const button = screen.getByRole("button", { name: "Saving" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveAttribute("data-loading");
    expect(button.querySelector('[data-ui-part="spinner"]')).not.toBeNull();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("exposes the forced active state and native render prop", () => {
    render(<ui.button active variant="ghost">Selected</ui.button>);
    const button = screen.getByRole("button", { name: "Selected" });
    expect(button).toHaveAttribute("data-active");
    expect(button).toHaveAttribute("data-variant", "ghost");
  });

  it("accepts icon slots without forcing an icon dependency", () => {
    render(
      <ui.button leadingIcon={<svg data-testid="leading-icon" />} size="default">
        Open
      </ui.button>,
    );
    expect(screen.getByTestId("leading-icon")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open" })).toHaveAttribute(
      "data-has-leading-icon",
    );
  });
});
