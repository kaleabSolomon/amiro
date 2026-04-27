"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { AnimatePresence, motion } from "motion/react";
import { createContext, type ReactNode, useContext, useState } from "react";

import { cn } from "@/lib/utils";

// ─── Shared open state ────────────────────────────────────────────────────────
const OpenCtx = createContext(false);

// ─── Provider ─────────────────────────────────────────────────────────────────
/**
 * Wrap a group of tooltips (or the whole app) with this to share delay config.
 * Defaults: 300 ms open delay, 150 ms close delay.
 */
function CustomTooltipProvider({
  delay = 300,
  closeDelay = 150,
  ...props
}: TooltipPrimitive.Provider.Props) {
  return (
    <TooltipPrimitive.Provider
      delay={delay}
      closeDelay={closeDelay}
      {...props}
    />
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
/**
 * Wrap a trigger + content pair.
 *
 * ```tsx
 * <CustomTooltip>
 *   <CustomTooltipTrigger>hover me</CustomTooltipTrigger>
 *   <CustomTooltipContent>tooltip text</CustomTooltipContent>
 * </CustomTooltip>
 * ```
 */
function CustomTooltip({ children, ...props }: TooltipPrimitive.Root.Props) {
  const [open, setOpen] = useState(false);

  return (
    <OpenCtx.Provider value={open}>
      <TooltipPrimitive.Root onOpenChange={setOpen} {...props}>
        {children}
      </TooltipPrimitive.Root>
    </OpenCtx.Provider>
  );
}

// ─── Trigger ──────────────────────────────────────────────────────────────────
/** Wrap any element — it will show the tooltip on hover/focus. */
function CustomTooltipTrigger({
  children,
  className,
  ...props
}: TooltipPrimitive.Trigger.Props) {
  return (
    <TooltipPrimitive.Trigger
      data-slot="custom-tooltip-trigger"
      className={cn("cursor-default", className)}
      {...props}
    >
      {children}
    </TooltipPrimitive.Trigger>
  );
}

// ─── Side helpers ─────────────────────────────────────────────────────────────
type Side = "top" | "bottom" | "left" | "right";

/** Initial translate offset so the tooltip slides in from the right direction */
const enterOffset: Record<Side, { x: number; y: number }> = {
  top: { x: 0, y: 8 },
  bottom: { x: 0, y: -8 },
  left: { x: 8, y: 0 },
  right: { x: -8, y: 0 },
};

/** Arrow classes driven by the positioner's actual data-side attribute */
const arrowClasses = [
  // top → arrow peeks out of the bottom edge, pointing down
  "group-data-[side=top]/positioner:bottom-0",
  "group-data-[side=top]/positioner:left-1/2",
  "group-data-[side=top]/positioner:-translate-x-1/2",
  "group-data-[side=top]/positioner:translate-y-[calc(50%+1px)]",
  // bottom → arrow peeks out of the top edge, pointing up
  "group-data-[side=bottom]/positioner:top-0",
  "group-data-[side=bottom]/positioner:left-1/2",
  "group-data-[side=bottom]/positioner:-translate-x-1/2",
  "group-data-[side=bottom]/positioner:-translate-y-[calc(50%+1px)]",
  "group-data-[side=bottom]/positioner:rotate-180",
  // left → arrow peeks out of the right edge, pointing left
  "group-data-[side=left]/positioner:right-0",
  "group-data-[side=left]/positioner:top-1/2",
  "group-data-[side=left]/positioner:-translate-y-1/2",
  "group-data-[side=left]/positioner:translate-x-[calc(50%+1px)]",
  "group-data-[side=left]/positioner:-rotate-90",
  // right → arrow peeks out of the left edge, pointing right
  "group-data-[side=right]/positioner:left-0",
  "group-data-[side=right]/positioner:top-1/2",
  "group-data-[side=right]/positioner:-translate-y-1/2",
  "group-data-[side=right]/positioner:-translate-x-[calc(50%+1px)]",
  "group-data-[side=right]/positioner:rotate-90",
].join(" ");

// ─── Content ──────────────────────────────────────────────────────────────────
interface CustomTooltipContentProps
  extends Omit<TooltipPrimitive.Popup.Props, "children"> {
  /** Tooltip label / content */
  children: ReactNode;
  side?: Side;
  sideOffset?: number;
  align?: TooltipPrimitive.Positioner.Props["align"];
  alignOffset?: number;
  /** Show the directional arrow. Default true. */
  showArrow?: boolean;
  className?: string;
}

function CustomTooltipContent({
  children,
  className,
  side = "top",
  sideOffset = 8,
  align = "center",
  alignOffset = 0,
  showArrow = true,
  ...props
}: CustomTooltipContentProps) {
  const isOpen = useContext(OpenCtx);
  const { x, y } = enterOffset[side];

  return (
    <TooltipPrimitive.Portal>
      {/* z-[9999] ensures the tooltip floats above modals, drawers, navbars */}
      <TooltipPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        style={{ zIndex: 9999 }}
        className="group/positioner"
      >
        <TooltipPrimitive.Popup data-slot="custom-tooltip-content" {...props}>
          {/* AnimatePresence lives INSIDE the always-mounted Popup so
              base-ui still manages ARIA; we animate purely visually. */}
          <AnimatePresence mode="wait">
            {isOpen && (
              <motion.div
                key="tooltip"
                initial={{ opacity: 0, x, y, scale: 0.9, filter: "blur(4px)" }}
                animate={{
                  opacity: 1,
                  x: 0,
                  y: 0,
                  scale: 1,
                  filter: "blur(0px)",
                }}
                exit={{ opacity: 0, x, y, scale: 0.9, filter: "blur(4px)" }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 30,
                  mass: 0.5,
                }}
                className={cn(
                  // Layout
                  "relative w-fit max-w-xs select-none",
                  "rounded-lg px-3 py-1.5",
                  "whitespace-nowrap font-medium text-xs leading-snug",
                  // Colors — popover token already swaps in dark mode
                  "bg-popover text-popover-foreground",
                  // Border + shadow
                  "border border-border/60",
                  "shadow-black/10 shadow-md dark:shadow-black/35",
                  // Subtle inset ring (polished glass look)
                  "ring-1 ring-white/10 ring-inset dark:ring-white/5",
                  // Frosted glass
                  "backdrop-blur-md",
                  className,
                )}
              >
                {/* Gradient shimmer on top edge */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-2 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-primary/40 to-transparent"
                />

                {children}

                {/* Directional arrow — position driven by positioner's data-side */}
                {showArrow && (
                  <span
                    aria-hidden
                    className={cn(
                      "pointer-events-none absolute size-[9px]",
                      arrowClasses,
                    )}
                  >
                    <span
                      className={cn(
                        "absolute inset-0 rotate-45 rounded-[2px]",
                        "border border-border/60 bg-popover",
                      )}
                    />
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

// ─── Exports ──────────────────────────────────────────────────────────────────
export {
  CustomTooltip,
  CustomTooltipTrigger,
  CustomTooltipContent,
  CustomTooltipProvider,
};
