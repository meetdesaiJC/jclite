import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import {
  IconChevronDown,
  IconChevronUp,
  IconClose,
  IconSearch,
} from "@/components/Icon";
import noResultsIllustration from "./assets/no-results.svg";

/** Decorative checkbox for menu rows (rows are the interactive control). */
function MenuCheckbox({
  checked,
  indeterminate,
  disabled,
}: {
  checked?: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
}) {
  const active = checked || indeterminate;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-solid",
        disabled
          ? "border-line bg-control-disabled-bg"
          : active
            ? "border-brand bg-brand"
            : "border-control-border bg-white"
      )}
    >
      {checked && !indeterminate && (
        <svg
          width={10}
          height={10}
          viewBox="0 0 16 16"
          fill="none"
          className="text-white"
        >
          <path
            d="M3.5 8.5L6.5 11.5L12.5 4.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {indeterminate && (
        <svg
          width={10}
          height={10}
          viewBox="0 0 16 16"
          fill="none"
          className="text-white"
        >
          <path
            d="M3.5 8H12.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      )}
    </span>
  );
}

/**
 * Dropdown — synced from Figma "Design System 2.0 / Dropdown" (node 3464:126126).
 *
 * Figma exposes:
 *   Type            → `variant` ("border" | "borderless")
 *   Selection Type  → `multiple` (single vs multi-select)
 *   State           → hover / open / disabled via CSS + `disabled` / `open`
 *   Filled          → derived from whether a value is selected
 *   Prefix          → `prefix` slot (e.g. "USD")
 *   Left Icon       → `leftIcon` slot
 *   Search          → `searchable` (menu search field)
 *
 * A dropdown menu lets people pick one or many choices from a list — used in
 * forms and for filtering / sorting UI.
 */

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export type DropdownListItem =
  | ({ type?: "option" } & DropdownOption)
  | { type: "heading"; label: string }
  | { type: "separator" };

function isOption(
  item: DropdownListItem
): item is { type?: "option" } & DropdownOption {
  return !item.type || item.type === "option";
}

/* ------------------------------------------------------------------ */
/* Trigger                                                             */
/* ------------------------------------------------------------------ */

const triggerVariants = cva(
  "relative flex w-full items-center gap-2 overflow-hidden rounded-[4px] text-left text-paragraph-md outline-none transition-colors " +
    "disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        border:
          "h-10 border border-solid bg-white " +
          "border-line hover:border-control-border " +
          "data-[open=true]:border-brand " +
          "disabled:border-line disabled:hover:border-line",
        borderless:
          "h-10 " +
          "hover:bg-surface-hover data-[open=true]:bg-surface-hover " +
          "disabled:hover:bg-transparent",
      },
      hasPrefix: {
        true: "pr-3",
        false: "px-3",
      },
    },
    defaultVariants: {
      variant: "border",
      hasPrefix: false,
    },
  }
);

/* ------------------------------------------------------------------ */
/* Menu item                                                           */
/* ------------------------------------------------------------------ */

const itemVariants = cva(
  "flex w-full items-center gap-2 px-3 py-2 text-left text-paragraph-md outline-none transition-colors",
  {
    variants: {
      state: {
        default: "text-foreground hover:bg-surface-hover",
        highlighted: "bg-surface-hover text-foreground",
        selected: "bg-brand-subtle text-foreground",
        disabled: "cursor-not-allowed text-disabled-fg",
      },
    },
    defaultVariants: { state: "default" },
  }
);

/* ------------------------------------------------------------------ */
/* Props                                                               */
/* ------------------------------------------------------------------ */

export interface DropdownProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "prefix"> {
  /** Bordered field (default) or borderless text trigger. */
  variant?: "border" | "borderless";
  /** Allow selecting multiple values (tags + checkboxes). */
  multiple?: boolean;
  /** Controlled open state. */
  open?: boolean;
  /** Uncontrolled initial open state. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Controlled value — string for single, string[] for multi. */
  value?: string | string[];
  /** Uncontrolled initial value. */
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  /** Options / headings / separators for the menu. */
  options: DropdownListItem[];
  /** Placeholder when nothing is selected. */
  placeholder?: string;
  /** Field label above the trigger. */
  label?: React.ReactNode;
  /** Optional icon after the label (e.g. info). */
  labelIcon?: React.ReactNode;
  /** Leading icon inside the trigger. */
  leftIcon?: React.ReactNode;
  /** Leading prefix segment (e.g. "USD") with a divider. */
  prefix?: React.ReactNode;
  disabled?: boolean;
  /** Show a search field at the top of the menu. Default `true`. */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Empty-state title when search yields no matches. */
  emptyTitle?: string;
  emptyDescription?: string;
  /** Max tags shown before "+N more". Default `2`. */
  maxVisibleTags?: number;
  /** Label for the multi-select "Select all" row. */
  selectAllLabel?: string;
  /** className for the trigger button. */
  triggerClassName?: string;
  /** className for the dropdown panel. */
  menuClassName?: string;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function normalizeMulti(value: string | string[] | undefined): string[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function optionList(items: DropdownListItem[]): DropdownOption[] {
  return items.filter(isOption);
}

/* ------------------------------------------------------------------ */
/* Tag chip (multi-select trigger)                                     */
/* ------------------------------------------------------------------ */

function Tag({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full min-w-0 items-center truncate rounded-[4px] bg-muted px-2 py-0.5 text-paragraph-md text-gray-700",
        className
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export const Dropdown = React.forwardRef<HTMLDivElement, DropdownProps>(
  (
    {
      className,
      triggerClassName,
      menuClassName,
      variant = "border",
      multiple = false,
      open: openProp,
      defaultOpen = false,
      onOpenChange,
      value: valueProp,
      defaultValue,
      onValueChange,
      options,
      placeholder = "Select…",
      label,
      labelIcon,
      leftIcon,
      prefix,
      disabled = false,
      searchable = true,
      searchPlaceholder = "Search placeholder value",
      emptyTitle = "No Results Found",
      emptyDescription = "Try searching with another keyword",
      maxVisibleTags = 2,
      selectAllLabel = "Select all",
      ...props
    },
    ref
  ) => {
    const isOpenControlled = openProp !== undefined;
    const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
    const open = isOpenControlled ? openProp : internalOpen;

    const isValueControlled = valueProp !== undefined;
    const [internalValue, setInternalValue] = React.useState<string | string[]>(
      () =>
        defaultValue ??
        (multiple ? ([] as string[]) : ("" as string))
    );
    const value = isValueControlled ? valueProp! : internalValue;

    const [query, setQuery] = React.useState("");
    const [highlight, setHighlight] = React.useState(-1);

    const rootRef = React.useRef<HTMLDivElement>(null);
    const listRef = React.useRef<HTMLDivElement>(null);
    const searchRef = React.useRef<HTMLInputElement>(null);
    const listboxId = React.useId();

    React.useImperativeHandle(ref, () => rootRef.current as HTMLDivElement);

    const setOpen = React.useCallback(
      (next: boolean) => {
        if (!isOpenControlled) setInternalOpen(next);
        onOpenChange?.(next);
        if (!next) {
          setQuery("");
          setHighlight(-1);
        }
      },
      [isOpenControlled, onOpenChange]
    );

    const setValue = React.useCallback(
      (next: string | string[]) => {
        if (!isValueControlled) setInternalValue(next);
        onValueChange?.(next);
      },
      [isValueControlled, onValueChange]
    );

    const optionsOnly = React.useMemo(() => optionList(options), [options]);
    const selectedValues = multiple
      ? normalizeMulti(value)
      : value
        ? [String(value)]
        : [];
    const selectedSet = React.useMemo(
      () => new Set(selectedValues),
      [selectedValues]
    );

    const filteredItems = React.useMemo(() => {
      const q = query.trim().toLowerCase();
      if (!q) return options;
      return options.filter((item) => {
        if (!isOption(item)) return true;
        return item.label.toLowerCase().includes(q);
      });
    }, [options, query]);

    const filteredOptions = React.useMemo(
      () => optionList(filteredItems),
      [filteredItems]
    );

    const enabledOptions = React.useMemo(
      () => filteredOptions.filter((o) => !o.disabled),
      [filteredOptions]
    );

    const filled = selectedValues.length > 0;
    const allSelected =
      multiple &&
      optionsOnly.length > 0 &&
      optionsOnly.every((o) => o.disabled || selectedSet.has(o.value));
    const someSelected =
      multiple && selectedValues.length > 0 && !allSelected;

    // Click outside → close
    React.useEffect(() => {
      if (!open) return;
      const onPointerDown = (event: MouseEvent) => {
        if (!rootRef.current?.contains(event.target as Node)) {
          setOpen(false);
        }
      };
      document.addEventListener("mousedown", onPointerDown);
      return () => document.removeEventListener("mousedown", onPointerDown);
    }, [open, setOpen]);

    // Focus search on open
    React.useEffect(() => {
      if (open && searchable) {
        requestAnimationFrame(() => searchRef.current?.focus());
      }
    }, [open, searchable]);

    const selectSingle = (option: DropdownOption) => {
      if (option.disabled) return;
      setValue(option.value);
      setOpen(false);
    };

    const toggleMulti = (option: DropdownOption) => {
      if (option.disabled) return;
      const next = selectedSet.has(option.value)
        ? selectedValues.filter((v) => v !== option.value)
        : [...selectedValues, option.value];
      setValue(next);
    };

    const toggleSelectAll = () => {
      if (allSelected) {
        setValue([]);
      } else {
        setValue(optionsOnly.filter((o) => !o.disabled).map((o) => o.value));
      }
    };

    const onTriggerKeyDown = (event: React.KeyboardEvent) => {
      if (disabled) return;
      if (
        event.key === "ArrowDown" ||
        event.key === "Enter" ||
        event.key === " "
      ) {
        event.preventDefault();
        if (!open) {
          setOpen(true);
          setHighlight(0);
        } else if (event.key === "Enter" || event.key === " ") {
          const opt = enabledOptions[highlight];
          if (opt) {
            multiple ? toggleMulti(opt) : selectSingle(opt);
          }
        }
      } else if (event.key === "Escape" && open) {
        event.preventDefault();
        setOpen(false);
      }
    };

    const onMenuKeyDown = (event: React.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlight((i) =>
          enabledOptions.length === 0
            ? -1
            : Math.min(i + 1, enabledOptions.length - 1)
        );
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlight((i) =>
          enabledOptions.length === 0 ? -1 : Math.max(i - 1, 0)
        );
      } else if (event.key === "Enter") {
        event.preventDefault();
        const opt = enabledOptions[highlight];
        if (!opt) return;
        multiple ? toggleMulti(opt) : selectSingle(opt);
      }
    };

    // Keep highlighted row in view
    React.useEffect(() => {
      if (highlight < 0 || !listRef.current) return;
      const node = listRef.current.querySelector<HTMLElement>(
        `[data-option-index="${highlight}"]`
      );
      node?.scrollIntoView({ block: "nearest" });
    }, [highlight]);

    const selectedLabels = selectedValues
      .map((v) => optionsOnly.find((o) => o.value === v)?.label ?? v)
      .filter(Boolean);

    const visibleTags = selectedLabels.slice(0, maxVisibleTags);
    const overflowCount = Math.max(
      0,
      selectedLabels.length - maxVisibleTags
    );

    const displayValue = !multiple
      ? (optionsOnly.find((o) => o.value === value)?.label ?? "")
      : "";

    const hasResults = filteredOptions.length > 0;
    let optionIndex = -1;

    const triggerTextClass = cn(
      filled
        ? variant === "borderless"
          ? "text-brand"
          : disabled
            ? "text-disabled-fg"
            : "text-foreground"
        : "text-disabled-fg",
      disabled && "text-disabled-fg"
    );

    return (
      <div
        ref={rootRef}
        className={cn("relative flex w-full flex-col gap-2", className)}
        {...props}
      >
        {label != null && label !== "" && (
          <div className="flex items-center gap-1">
            <span
              className={cn(
                "text-label-md text-foreground",
                disabled && "text-disabled-fg"
              )}
            >
              {label}
            </span>
            {labelIcon && (
              <span
                className={cn(
                  "inline-flex size-5 shrink-0 items-center justify-center text-foreground [&_svg]:size-5",
                  disabled && "text-disabled-fg"
                )}
              >
                {labelIcon}
              </span>
            )}
          </div>
        )}

        <div className="relative w-full">
          <button
            type="button"
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={open ? listboxId : undefined}
            data-open={open ? "true" : "false"}
            onClick={() => !disabled && setOpen(!open)}
            onKeyDown={onTriggerKeyDown}
            className={cn(
              triggerVariants({ variant, hasPrefix: Boolean(prefix) }),
              triggerClassName
            )}
          >
            {prefix != null && (
              <span
                className={cn(
                  "flex h-full shrink-0 items-center border-r border-line px-3",
                  disabled
                    ? "bg-muted text-disabled-fg"
                    : "bg-surface-hover text-foreground"
                )}
              >
                {prefix}
              </span>
            )}

            {leftIcon && (
              <span
                className={cn(
                  "inline-flex size-5 shrink-0 items-center justify-center text-foreground [&_svg]:size-5",
                  disabled && "text-disabled-fg",
                  prefix && "ml-3"
                )}
              >
                {leftIcon}
              </span>
            )}

            <span
              className={cn(
                "flex min-w-0 flex-1 items-center gap-2",
                prefix && !leftIcon && "pl-3",
                multiple && filled && disabled && "opacity-50"
              )}
            >
              {multiple && filled ? (
                <>
                  {visibleTags.map((tag) => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                  {overflowCount > 0 && (
                    <Tag className="shrink-0">+{overflowCount} more</Tag>
                  )}
                </>
              ) : (
                <span className={cn("truncate", triggerTextClass)}>
                  {filled ? displayValue : placeholder}
                </span>
              )}
            </span>

            <span
              className={cn(
                "inline-flex size-5 shrink-0 items-center justify-center",
                disabled ? "text-disabled-fg" : "text-foreground"
              )}
            >
              {open ? (
                <IconChevronUp size={20} className="size-5" aria-hidden="true" />
              ) : (
                <IconChevronDown
                  size={20}
                  className="size-5"
                  aria-hidden="true"
                />
              )}
            </span>
          </button>

          {open && (
            <div
              id={listboxId}
              role="listbox"
              aria-multiselectable={multiple || undefined}
              tabIndex={-1}
              onKeyDown={onMenuKeyDown}
              className={cn(
                "absolute top-[calc(100%+8px)] left-0 z-50 flex w-full flex-col overflow-hidden rounded-[4px] border border-line bg-white shadow-400",
                menuClassName
              )}
            >
            {searchable && (
              <div className="shrink-0 border-b border-line px-3 py-2">
                <div className="flex items-center gap-2 rounded-[4px] border border-line bg-white px-3 py-2">
                  <IconSearch
                    size={20}
                    className="size-5 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <input
                    ref={searchRef}
                    type="search"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setHighlight(0);
                    }}
                    placeholder={searchPlaceholder}
                    aria-label="Search options"
                    className="min-w-0 flex-1 bg-transparent text-paragraph-sm text-foreground outline-none placeholder:text-disabled-fg"
                  />
                  {query && (
                    <button
                      type="button"
                      aria-label="Clear search"
                      onClick={() => {
                        setQuery("");
                        searchRef.current?.focus();
                      }}
                      className="inline-flex size-5 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
                    >
                      <IconClose size={20} className="size-5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {!hasResults ? (
              <div className="flex flex-col items-center justify-center gap-2 px-4 py-8">
                <img
                  src={noResultsIllustration}
                  alt=""
                  width={80}
                  height={80}
                  className="size-20"
                  aria-hidden="true"
                />
                <div className="flex w-full flex-col items-center gap-1 px-2 text-center">
                  <p className="text-label-md-semi text-foreground">
                    {emptyTitle}
                  </p>
                  <p className="max-w-[240px] text-paragraph-sm text-muted-foreground">
                    {emptyDescription}
                  </p>
                </div>
              </div>
            ) : (
              <div
                ref={listRef}
                className="max-h-[216px] overflow-y-auto overscroll-contain py-0"
              >
                {multiple && (
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-surface-hover"
                  >
                    <MenuCheckbox
                      checked={allSelected}
                      indeterminate={someSelected}
                    />
                    <span className="text-label-md text-foreground">
                      {selectAllLabel}
                    </span>
                  </button>
                )}

                {filteredItems.map((item, index) => {
                  if (item.type === "separator") {
                    return (
                      <div
                        key={`sep-${index}`}
                        role="separator"
                        className="mx-2 my-0.5 border-t border-line"
                      />
                    );
                  }
                  if (item.type === "heading") {
                    return (
                      <div
                        key={`heading-${index}-${item.label}`}
                        className="px-3.5 py-2 text-label-sm text-muted-foreground"
                      >
                        {item.label}
                      </div>
                    );
                  }

                  optionIndex += 1;
                  const currentIndex = optionIndex;
                  const selected = selectedSet.has(item.value);
                  const isDisabled = Boolean(item.disabled);
                  const isHighlighted =
                    !isDisabled && highlight === currentIndex;

                  let state: "default" | "highlighted" | "selected" | "disabled" =
                    "default";
                  if (isDisabled) state = "disabled";
                  else if (!multiple && selected) state = "selected";
                  else if (isHighlighted) state = "highlighted";

                  return (
                    <button
                      key={item.value}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      aria-disabled={isDisabled || undefined}
                      disabled={isDisabled}
                      data-option-index={currentIndex}
                      onMouseEnter={() =>
                        !isDisabled && setHighlight(currentIndex)
                      }
                      onClick={() =>
                        multiple ? toggleMulti(item) : selectSingle(item)
                      }
                      className={itemVariants({ state })}
                    >
                      {multiple && (
                        <MenuCheckbox
                          checked={selected}
                          disabled={isDisabled}
                        />
                      )}
                      {item.icon && (
                        <span
                          className={cn(
                            "inline-flex size-5 shrink-0 items-center justify-center [&_svg]:size-5",
                            isDisabled
                              ? "text-disabled-fg"
                              : "text-foreground"
                          )}
                        >
                          {item.icon}
                        </span>
                      )}
                      <span className="min-w-0 flex-1 truncate">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          )}
        </div>
      </div>
    );
  }
);
Dropdown.displayName = "Dropdown";

export { triggerVariants, itemVariants };
