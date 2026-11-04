"use client";

import { Slot } from "radix-ui";
import { AnimatePresence, motion } from "motion/react";
import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import useMeasure from "react-use-measure";
import { Drawer } from "vaul";
import { cn } from "cn";

export type ViewComponent = ComponentType<Record<string, unknown>>;
export interface ViewsRegistry {
  [viewName: string]: ViewComponent;
}

interface FamilyDrawerContextValue {
  isOpen: boolean;
  view: string;
  setView: (view: string) => void;
  opacityDuration: number;
  elementRef: ReturnType<typeof useMeasure>[0];
  bounds: ReturnType<typeof useMeasure>[1];
  views: ViewsRegistry | undefined;
}

const FamilyDrawerContext = createContext<FamilyDrawerContextValue | undefined>(undefined);

export function useFamilyDrawer() {
  const context = useContext(FamilyDrawerContext);
  if (!context) throw new Error("FamilyDrawer components must be used within FamilyDrawerRoot");
  return context;
}

interface FamilyDrawerRootProps {
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultView?: string;
  onViewChange?: (view: string) => void;
  views?: ViewsRegistry;
}

export function FamilyDrawerRoot({
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  defaultView = "default",
  onViewChange,
  views: customViews,
}: FamilyDrawerRootProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [view, setView] = useState(defaultView);
  const [elementRef, bounds] = useMeasure();
  const previousHeightRef = useRef(0);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  const opacityDuration = useMemo(() => {
    const currentHeight = bounds.height;
    const previousHeight = previousHeightRef.current;
    if (!previousHeight) {
      previousHeightRef.current = currentHeight;
      return 0.15;
    }
    previousHeightRef.current = currentHeight;
    return Math.min(Math.max(Math.abs(currentHeight - previousHeight) / 500, 0.15), 0.27);
  }, [bounds.height]);

  const views = customViews && Object.keys(customViews).length > 0 ? customViews : undefined;
  const contextValue = useMemo<FamilyDrawerContextValue>(
    () => ({
      isOpen,
      view,
      setView: (nextView) => {
        setView(nextView);
        onViewChange?.(nextView);
      },
      opacityDuration,
      elementRef,
      bounds,
      views,
    }),
    [bounds, elementRef, isOpen, onViewChange, opacityDuration, view, views],
  );

  return (
    <FamilyDrawerContext.Provider value={contextValue}>
      <Drawer.Root open={isOpen} onOpenChange={setIsOpen} repositionInputs={false}>
        {children}
      </Drawer.Root>
    </FamilyDrawerContext.Provider>
  );
}

export function FamilyDrawerTrigger({
  children,
  asChild = false,
  className,
}: {
  children: ReactNode;
  asChild?: boolean;
  className?: string;
}) {
  if (asChild) {
    return (
      <Drawer.Trigger asChild>
        <Slot>{children}</Slot>
      </Drawer.Trigger>
    );
  }
  return (
    <Drawer.Trigger asChild>
      <button
        className={cn(
          "fixed top-1/2 left-1/2 h-11 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full border bg-background px-4 py-2 font-medium text-foreground transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
        type="button"
      >
        {children}
      </button>
    </Drawer.Trigger>
  );
}

export function FamilyDrawerPortal({ children }: { children: ReactNode }) {
  return <Drawer.Portal>{children}</Drawer.Portal>;
}

export function FamilyDrawerOverlay({ className, onClick }: { className?: string; onClick?: () => void }) {
  const { setView } = useFamilyDrawer();
  return (
    <Drawer.Overlay
      className={cn("fixed inset-0 z-50 bg-zinc-950/45 backdrop-blur-[2px]", className)}
      onClick={onClick || (() => setView("default"))}
    />
  );
}

export function FamilyDrawerContent({ children, className }: { children: ReactNode; className?: string }) {
  const { bounds } = useFamilyDrawer();
  return (
    <Drawer.Content
      asChild
      className={cn(
        "fixed inset-x-2 bottom-2 z-50 mx-auto w-auto max-w-3xl overflow-hidden rounded-[28px] border bg-background shadow-2xl outline-none sm:inset-x-4 sm:bottom-4",
        className,
      )}
    >
      <motion.div
        animate={{ height: bounds.height }}
        transition={{ duration: 0.27, ease: [0.25, 1, 0.5, 1] }}
      >
        {children}
      </motion.div>
    </Drawer.Content>
  );
}

export function FamilyDrawerAnimatedWrapper({ children, className }: { children: ReactNode; className?: string }) {
  const { elementRef } = useFamilyDrawer();
  return (
    <div ref={elementRef} className={cn("antialiased", className)}>
      {children}
    </div>
  );
}

export function FamilyDrawerAnimatedContent({ children }: { children: ReactNode }) {
  const { view, opacityDuration } = useFamilyDrawer();
  return (
    <AnimatePresence initial={false} mode="popLayout" custom={view}>
      <motion.div
        key={view}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: opacityDuration, ease: [0.26, 0.08, 0.25, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function FamilyDrawerClose({ className }: { className?: string }) {
  return (
    <Drawer.Close asChild>
      <button
        data-vaul-no-drag=""
        type="button"
        aria-label="Đóng biểu mẫu"
        className={cn(
          "absolute top-5 right-5 z-20 flex size-9 cursor-pointer items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M10.5 1.5 1.5 10.5M10.5 10.5 1.5 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </Drawer.Close>
  );
}

export function FamilyDrawerTitle({ className, ...props }: React.ComponentProps<typeof Drawer.Title>) {
  return <Drawer.Title className={cn("text-xl font-semibold text-foreground", className)} {...props} />;
}

export function FamilyDrawerDescription({ className, ...props }: React.ComponentProps<typeof Drawer.Description>) {
  return <Drawer.Description className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

