import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ui } from "../index";

describe("ui.button", () => {
  it("renders a native button with design-system attributes", () => {
    render(
      <ui.button size="small" variant="secondary">
        Save
      </ui.button>,
    );

    const button = screen.getByRole("button", { name: "Save" });

    expect(button.tagName).toBe("BUTTON");
    expect(button).toHaveAttribute("data-ui", "button");
    expect(button).toHaveAttribute("data-size", "small");
    expect(button).toHaveAttribute("data-variant", "secondary");
  });

  it("preserves button behavior", () => {
    const handleClick = vi.fn();

    render(<ui.button onClick={handleClick}>Save</ui.button>);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(handleClick).toHaveBeenCalledOnce();
  });

  it("prevents interaction when disabled", () => {
    const handleClick = vi.fn();

    render(
      <ui.button disabled onClick={handleClick}>
        Save
      </ui.button>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(handleClick).not.toHaveBeenCalled();
  });
});
