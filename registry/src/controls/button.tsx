import { Button as BaseButton } from "@base-ui/react/button";

export type ButtonProps = BaseButton.Props & {
  size?: "small" | "medium";
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({
  className,
  size = "medium",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <BaseButton
      {...props}
      className={(state) =>
        [
          "ui-button",
          typeof className === "function" ? className(state) : className,
        ]
          .filter(Boolean)
          .join(" ")
      }
      data-size={size}
      data-ui="button"
      data-variant={variant}
    />
  );
}
