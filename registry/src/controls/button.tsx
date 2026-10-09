/* Adapted from mickadesign/fluid-functionalism registry/base/button.tsx
 * at bf9ece46728035afef54feef6ac67e1f413cc0b0 (MIT).
 * Interface uses Base UI directly, with one semantic CSS implementation
 * and the generated ui.button namespace.
 */
import { Button as BaseButton } from "@base-ui/react/button";
import { forwardRef, type ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "ghost";
export type ButtonSize = "default" | "compact" | "icon" | "icon-compact";

export type ButtonProps = Omit<BaseButton.Props, "children" | "size"> & {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  active?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant = "primary",
    size = "default",
    loading = false,
    active = false,
    leadingIcon,
    trailingIcon,
    disabled,
    children,
    ...props
  },
  ref,
) {
  const iconOnly = size === "icon" || size === "icon-compact";

  return (
    <BaseButton
      {...props}
      ref={ref}
      className={(state) =>
        [
          "ui-button",
          typeof className === "function" ? className(state) : className,
        ]
          .filter(Boolean)
          .join(" ")
      }
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-ui="button"
      data-size={size}
      data-variant={variant}
      data-active={active ? "" : undefined}
      data-loading={loading ? "" : undefined}
      data-has-leading-icon={leadingIcon && !iconOnly ? "" : undefined}
      data-has-trailing-icon={trailingIcon && !iconOnly ? "" : undefined}
    >
      <span data-ui-part="content">
        {!iconOnly && leadingIcon && (
          <span data-ui-part="leading-icon" aria-hidden="true">
            {leadingIcon}
          </span>
        )}
        <span data-ui-part="label">{children}</span>
        {!iconOnly && trailingIcon && (
          <span data-ui-part="trailing-icon" aria-hidden="true">
            {trailingIcon}
          </span>
        )}
      </span>
      {loading && (
        <span data-ui-part="spinner" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M 12 12 C 14 8.5 19 8.5 19 12 C 19 15.5 14 15.5 12 12 C 10 8.5 5 8.5 5 12 C 5 15.5 10 15.5 12 12 Z"
              stroke="currentColor"
              strokeWidth="1.125"
              strokeLinecap="round"
              pathLength="100"
            />
          </svg>
        </span>
      )}
    </BaseButton>
  );
});
