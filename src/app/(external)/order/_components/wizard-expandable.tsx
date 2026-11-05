"use client";

import React, {
  createContext,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { useControllableState } from "@radix-ui/react-use-controllable-state";
import { cn } from "cn";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

/** SKILL-DESIGN: standard 3-layer surface + transition-shadow */
const toolbarShellClass = cn("bg-transparent");

/** SKILL-DESIGN: lighter 2-layer for nested well */
const toolbarInnerWellClass = cn("shadow-none");

const springTransition = {
  type: "spring" as const,
  bounce: 0,
  duration: 0.25,
};

function scheduleAfterLayout(fn: () => void) {
  requestAnimationFrame(() => {
    requestAnimationFrame(fn);
  });
}

export interface WizardStep {
  id: string;
  title: string;
  label?: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }> | React.ReactElement<{ className?: string }>;
  content: React.ReactNode;
}

export interface WizardNavigateContext {
  fromStepId: string | null;
  toStepId: string;
  fromIndex: number;
  toIndex: number;
}

type StepNavigationResult = { ok: true } | { ok: false; context: WizardNavigateContext };

function evaluateStepNavigation({
  steps,
  fromId,
  toId,
  canNavigateToStep,
  skipValidationForBackward,
}: {
  steps: WizardStep[];
  fromId: string | null;
  toId: string;
  canNavigateToStep: ((context: WizardNavigateContext) => boolean) | undefined;
  skipValidationForBackward: boolean;
}): StepNavigationResult {
  if (!fromId || fromId === toId) {
    return { ok: true };
  }

  const toIndex = steps.findIndex((s) => s.id === toId);
  const fromIndex = steps.findIndex((s) => s.id === fromId);
  if (toIndex < 0 || fromIndex < 0) {
    return { ok: true };
  }

  if (!canNavigateToStep) {
    return { ok: true };
  }

  const goingBackward = toIndex < fromIndex;
  if (skipValidationForBackward && goingBackward) {
    return { ok: true };
  }

  const context: WizardNavigateContext = {
    fromStepId: fromId,
    toStepId: toId,
    fromIndex,
    toIndex,
  };

  if (!canNavigateToStep(context)) {
    return { ok: false, context };
  }

  return { ok: true };
}

export interface WizardExpandableContextValue {
  activeStepId: string | null;
  activeIndex: number;
  totalSteps: number;
  isLastStep: boolean;
  canGoBack: boolean;
  /** False when forward navigation / complete is blocked by validation or flags. */
  canGoNext: boolean;
  goNext: () => void;
  goBack: () => void;
  complete: () => void;
}

const WizardExpandableContext = createContext<WizardExpandableContextValue | null>(null);

export function useWizardExpandable(): WizardExpandableContextValue {
  const ctx = useContext(WizardExpandableContext);
  if (!ctx) {
    throw new Error("useWizardExpandable must be used within WizardExpandable");
  }
  return ctx;
}

export interface WizardExpandableProps {
  steps: WizardStep[];
  badgeText?: string;

  className?: string;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  activeStep?: string | null;
  onActiveStepChange?: (stepId: string | null) => void;

  /**
   * Return false to block moving from the current step to `toStepId`.
   * Not called when opening the first step (`fromStepId` is null), closing the wizard,
   * or when `skipValidationForBackward` is true and the target step is before the current one.
   */
  canNavigateToStep?: (context: WizardNavigateContext) => boolean;
  /**
   * When true, navigating to an earlier step does not call `canNavigateToStep`.
   * @default true
   */
  skipValidationForBackward?: boolean;
  /** Called when navigation was blocked by `canNavigateToStep` returning false. */
  onNavigateBlocked?: (context: WizardNavigateContext) => void;

  /**
   * When `false`, disables Next and the Complete action. When `undefined`, only
   * `canNavigateToStep` gates forward moves (and Complete stays enabled unless you set this).
   */
  canGoNext?: boolean;
  /** @default true */
  showNavigation?: boolean;
  backLabel?: string;
  nextLabel?: string;
  completeLabel?: string;
  /** Called when the user activates Complete on the last step. */
  onComplete?: () => void;
  /** Skip the height reveal when the wizard is already expanded on first paint. */
  animateInitialOpen?: boolean;
}

const WizardExpandableInner = React.memo<WizardExpandableProps>(function WizardExpandableInner({
  steps,
  badgeText,

  className,
  expanded: controlledExpanded,
  onExpandedChange,
  activeStep: controlledActiveStep,
  onActiveStepChange,
  canNavigateToStep,
  skipValidationForBackward = true,
  onNavigateBlocked,
  canGoNext: canGoNextProp,
  showNavigation = true,
  backLabel = "Back",
  nextLabel = "Next",
  completeLabel = "Finish",
  onComplete,
  animateInitialOpen = true,
}) {
  const reduceMotion = useReducedMotion();
  const baseId = useId();
  const panelId = `${baseId}-panel`;
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const [active, setActive] = useControllableState<string | null>({
    prop: controlledActiveStep,
    defaultProp: null,
    onChange: onActiveStepChange,
  });

  const [isOpen, setIsOpen] = useControllableState({
    prop: controlledExpanded,
    defaultProp: false,
    onChange: onExpandedChange,
  });

  const [previousIndex, setPreviousIndex] = useState<number | null>(null);
  const [contentRef, contentBounds] = useMeasure();
  const menuContainerRef = useRef<HTMLElement | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const heightContent = contentBounds.height;

  const scrollBehavior: ScrollBehavior = reduceMotion ? "auto" : "smooth";

  const motionTransition = useMemo(() => (reduceMotion ? { duration: 0.01 } : springTransition), [reduceMotion]);

  const handleClickOutside = useCallback(() => {
    setIsOpen(false);
    setActive(null);
  }, [setIsOpen, setActive]);

  useClickOutside(ref, handleClickOutside);

  const scrollButtonIntoView = useCallback(
    (currentIndex: number, priorIndex: number | null, behavior: ScrollBehavior) => {
      if (!menuContainerRef.current) {
        return;
      }

      const isMovingForward = priorIndex !== null && currentIndex > priorIndex;
      const isMovingBackward = priorIndex !== null && currentIndex < priorIndex;

      let targetIndex = currentIndex;

      if (isMovingForward) {
        const nextIndex = currentIndex + 1;
        if (nextIndex < steps.length) {
          targetIndex = nextIndex;
        }
      } else if (isMovingBackward) {
        const prevIndex = currentIndex - 1;
        if (prevIndex >= 0) {
          targetIndex = prevIndex;
        }
      }

      const viewport = menuContainerRef.current.querySelector(
        '[data-slot="scroll-area-viewport"]',
      ) as HTMLElement | null;

      const targetButton = menuContainerRef.current.querySelector(
        `[data-step-index="${targetIndex}"]`,
      ) as HTMLElement | null;

      if (viewport && targetButton) {
        scrollElementToCenterInViewport(viewport, targetButton, behavior);
      }
    },
    [steps.length],
  );

  const openStep = useCallback(
    (item: string, priorIndex: number | null) => {
      const currentIndex = steps.findIndex((step) => step.id === item);
      setActive(item);
      setIsOpen(true);

      if (currentIndex >= 0) {
        scheduleAfterLayout(() => {
          scrollButtonIntoView(currentIndex, priorIndex, scrollBehavior);
        });
        setPreviousIndex(currentIndex);
      }
    },
    [steps, setActive, setIsOpen, scrollButtonIntoView, scrollBehavior],
  );

  const tryNavigateToStep = useCallback(
    (item: string, priorIndex: number | null): boolean => {
      const result = evaluateStepNavigation({
        steps,
        fromId: active,
        toId: item,
        canNavigateToStep,
        skipValidationForBackward,
      });
      if (result.ok === false) {
        onNavigateBlocked?.(result.context);
        return false;
      }
      openStep(item, priorIndex);
      return true;
    },
    [active, canNavigateToStep, onNavigateBlocked, openStep, skipValidationForBackward, steps],
  );

  const activeIndex = useMemo(() => (active ? steps.findIndex((s) => s.id === active) : -1), [active, steps]);

  const isLastStep = activeIndex >= 0 && activeIndex === steps.length - 1;
  const nextStepId = activeIndex >= 0 && activeIndex < steps.length - 1 ? steps[activeIndex + 1]?.id : undefined;
  const prevStepId = activeIndex > 0 ? steps[activeIndex - 1]?.id : undefined;

  const forwardNavOk = useMemo(() => {
    if (!nextStepId || active === null) {
      return true;
    }
    return evaluateStepNavigation({
      steps,
      fromId: active,
      toId: nextStepId,
      canNavigateToStep,
      skipValidationForBackward,
    }).ok;
  }, [active, canNavigateToStep, nextStepId, skipValidationForBackward, steps]);

  const nextDisabled = !forwardNavOk || canGoNextProp === false;
  const completeDisabled = canGoNextProp === false;
  const canGoBack = isOpen && active !== null && activeIndex > 0;

  const effectiveCanGoNext = isLastStep ? canGoNextProp !== false : forwardNavOk && canGoNextProp !== false;

  const handleWizardBack = useCallback(() => {
    if (!prevStepId) {
      return;
    }
    const moved = tryNavigateToStep(prevStepId, previousIndex);
    if (moved) {
      queueMicrotask(() => tabRefs.current[activeIndex - 1]?.focus());
    }
  }, [activeIndex, previousIndex, prevStepId, tryNavigateToStep]);

  const handleWizardNext = useCallback(() => {
    if (!nextStepId || isLastStep) {
      return;
    }
    const moved = tryNavigateToStep(nextStepId, previousIndex);
    if (moved) {
      queueMicrotask(() => tabRefs.current[activeIndex + 1]?.focus());
    }
  }, [activeIndex, isLastStep, nextStepId, previousIndex, tryNavigateToStep]);

  const handleWizardComplete = useCallback(() => {
    if (completeDisabled) {
      return;
    }
    onComplete?.();
  }, [completeDisabled, onComplete]);

  const handleNavClick = useCallback(
    (item: string) => {
      if (active === item && isOpen) {
        setIsOpen(false);
        setActive(null);
        return;
      }

      tryNavigateToStep(item, previousIndex);
    },
    [active, isOpen, previousIndex, setActive, setIsOpen, tryNavigateToStep],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      const root = ref.current;
      if (!root?.contains(document.activeElement)) {
        return;
      }
      event.preventDefault();
      setIsOpen(false);
      setActive(null);
      tabRefs.current[0]?.focus();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, setActive, setIsOpen]);

  const handleTabKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      const { key } = event;
      let nextIndex: number | undefined;

      if (key === "ArrowRight" || key === "ArrowLeft") {
        event.preventDefault();
        const delta = key === "ArrowRight" ? 1 : -1;
        nextIndex = (index + delta + steps.length) % steps.length;
      } else if (key === "Home") {
        event.preventDefault();
        nextIndex = 0;
      } else if (key === "End") {
        event.preventDefault();
        nextIndex = steps.length - 1;
      }

      if (nextIndex === undefined) {
        return;
      }

      const nextId = steps[nextIndex]?.id;
      if (!nextId) {
        return;
      }

      const moved = tryNavigateToStep(nextId, previousIndex);
      if (!moved) {
        return;
      }

      if (key === "ArrowRight" || key === "ArrowLeft") {
        queueMicrotask(() => tabRefs.current[nextIndex]?.focus());
      } else {
        tabRefs.current[nextIndex]?.focus();
      }
    },
    [previousIndex, steps, tryNavigateToStep],
  );

  const renderContent = useCallback(() => {
    if (!active) {
      return null;
    }

    const step = steps.find((s) => s.id === active);
    if (!step) {
      return null;
    }

    const titleId = `${baseId}-title-${step.id}`;
    const listVariants = {
      initial: {},
      animate: {
        transition: {
          staggerChildren: reduceMotion ? 0 : 0.06,
          delayChildren: reduceMotion ? 0 : 0.02,
        },
      },
      exit: {
        transition: { staggerChildren: 0.03, staggerDirection: -1 as const },
      },
    };

    const itemVariants = {
      initial: reduceMotion ? { opacity: 0.001 } : { opacity: 0, y: 8, filter: "blur(4px)" },
      animate: {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        transition: {
          duration: reduceMotion ? 0.01 : 0.22,
          ease: [0.23, 1, 0.32, 1] as const,
        },
      },
      exit: reduceMotion
        ? {
            opacity: 0,
            transition: { duration: 0.1, ease: [0.23, 1, 0.32, 1] as const },
          }
        : {
            opacity: 0,
            y: -10,
            filter: "blur(4px)",
            transition: { duration: 0.16, ease: [0.4, 0, 1, 1] as const },
          },
    };

    return (
      <motion.div
        animate="animate"
        aria-labelledby={`${baseId}-tab-${step.id}`}
        className="flex flex-col gap-4 pb-20 sm:pb-2"
        exit="exit"
        id={panelId}
        initial="initial"
        key={step.id}
        role="tabpanel"
        variants={listVariants}
      >
        <div className="flex flex-col gap-2">
          <motion.h3 className="text-balance font-medium text-foreground text-lg" id={titleId} variants={itemVariants}>
            {step.title}
          </motion.h3>
          {step.description ? (
            <motion.p className="text-pretty text-muted-foreground text-sm" variants={itemVariants}>
              {step.description}
            </motion.p>
          ) : null}
        </div>
        <motion.div variants={itemVariants}>{step.content}</motion.div>
        {showNavigation ? (
          <motion.div
            className="sticky bottom-0 z-10 -mx-3 border-border border-t bg-background px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:static sm:mx-0 sm:px-0 sm:pt-4 sm:pb-0"
            variants={itemVariants}
          >
            <fieldset aria-label="Wizard navigation" className="flex min-w-0 gap-2 sm:gap-3">
              <Button
                className="min-h-11 flex-1 sm:min-h-10"
                disabled={!canGoBack}
                onClick={handleWizardBack}
                type="button"
                variant="outline"
              >
                {backLabel}
              </Button>
              {isLastStep ? (
                <Button
                  className="min-h-11 flex-1 bg-yellow-400 text-zinc-950 hover:bg-yellow-300 sm:min-h-10"
                  disabled={completeDisabled}
                  onClick={handleWizardComplete}
                  type="button"
                >
                  {completeLabel}
                </Button>
              ) : (
                <Button
                  className="min-h-11 flex-1 bg-yellow-400 text-zinc-950 hover:bg-yellow-300 sm:min-h-10"
                  disabled={nextDisabled}
                  onClick={handleWizardNext}
                  type="button"
                >
                  {nextLabel}
                </Button>
              )}
            </fieldset>
          </motion.div>
        ) : null}
      </motion.div>
    );
  }, [
    active,
    backLabel,
    baseId,
    canGoBack,
    completeDisabled,
    completeLabel,
    handleWizardBack,
    handleWizardComplete,
    handleWizardNext,
    isLastStep,
    nextDisabled,
    nextLabel,
    panelId,
    reduceMotion,
    showNavigation,
    steps,
  ]);

  const wizardContextValue = useMemo<WizardExpandableContextValue>(
    () => ({
      activeStepId: active,
      activeIndex,
      totalSteps: steps.length,
      isLastStep,
      canGoBack,
      canGoNext: effectiveCanGoNext,
      goNext: handleWizardNext,
      goBack: handleWizardBack,
      complete: handleWizardComplete,
    }),
    [
      active,
      activeIndex,
      canGoBack,
      effectiveCanGoNext,
      handleWizardBack,
      handleWizardComplete,
      handleWizardNext,
      isLastStep,
      steps.length,
    ],
  );

  const navigationButtons = useMemo(
    () =>
      steps.map((step, index) => ({
        id: step.id,
        label: step.label ?? step.title,
        step: (index + 1).toString(),
        onClick: () => handleNavClick(step.id),
        isActive: active === step.id,
        isFirst: index === 0,
        isLast: index === steps.length - 1,
      })),
    [steps, active, handleNavClick],
  );

  return (
    <WizardExpandableContext.Provider value={wizardContextValue}>
      <div
        className={cn(
          "mx-auto flex w-full min-w-0 max-w-sm flex-col gap-2 overflow-hidden px-2 sm:max-w-lg sm:px-0",
          className,
        )}
      >
        {badgeText && (
          <Badge className="border-border bg-muted text-muted-foreground" variant="outline">
            {badgeText}
          </Badge>
        )}

        <MotionConfig transition={motionTransition}>
          <div
            className={cn(
              "w-full overflow-hidden rounded-[calc(var(--radius)+var(--toolbar-gutter))] antialiased",
              toolbarShellClass,
            )}
            ref={ref}
            style={{ "--toolbar-gutter": "0.5rem" } as React.CSSProperties}
          >
            <div className="min-w-0">
              <div className={cn("relative z-10", isOpen ? "border-border/60 border-b" : "")}>
                <div
                  className="min-w-0 max-w-full overflow-hidden"
                  ref={(element) => {
                    if (element) {
                      menuContainerRef.current = element;
                    }
                  }}
                >
                  <ScrollArea className="w-full overflow-y-hidden pb-2 [&_[data-orientation=vertical]]:hidden [&_[data-slot=scroll-area-viewport]]:overflow-y-hidden!">
                    <div
                      aria-label="Wizard steps"
                      className="flex w-max min-w-full touch-pan-x items-center p-px"
                      role="tablist"
                    >
                      {navigationButtons.map((button, index) => {
                        const tabFocusIndex = active === null ? index === 0 : button.isActive;

                        return (
                          <button
                            aria-controls={panelId}
                            aria-selected={button.isActive}
                            className={cn(
                              "relative flex min-h-12 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2 py-2 text-muted-foreground text-sm outline-none transition-[color,background-color,transform] duration-150 ease-out sm:min-h-0 sm:gap-2 sm:px-5 sm:py-3",
                              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                              "active:scale-[0.98]",
                              button.isActive
                                ? "bg-yellow-50 font-semibold text-foreground"
                                : "hover:bg-muted/60 active:bg-muted/70",
                            )}
                            data-step-index={index}
                            id={`${baseId}-tab-${button.id}`}
                            key={button.id}
                            onClick={button.onClick}
                            onKeyDown={(e) => handleTabKeyDown(e, index)}
                            ref={(el) => {
                              tabRefs.current[index] = el;
                            }}
                            role="tab"
                            tabIndex={tabFocusIndex ? 0 : -1}
                            type="button"
                          >
                            <div
                              className={cn(
                                "flex size-5 shrink-0 items-center justify-center rounded-full font-bold text-[10px] tabular-nums leading-none shadow-[0px_1px_1px_0px_hsla(0,0%,0%,0.02)_inset,0px_1px_1px_0px_hsla(0,0%,0%,0.02)_inset,0px_0px_0px_1px_rgba(255,255,255,0.25)] transition-colors duration-200 ease-out sm:size-5 dark:shadow-[0px_1px_1px_0px_hsla(0,0%,100%,0.02)_inset,0px_1px_1px_0px_rgba(255,255,255,0.05)_inset,0px_0px_0px_1px_hsla(0,0%,100%,0.05)_inset,0px_0px_1px_0px_rgba(0,0,0,0.25)]",
                                button.isActive
                                  ? "bg-yellow-400 text-zinc-950 ring-1 ring-yellow-400/30"
                                  : "bg-muted/50 text-muted-foreground",
                              )}
                            >
                              {button.step}
                            </div>
                            <span className="font-medium text-foreground text-xs sm:text-sm">{button.label}</span>
                            {button.isActive ? (
                              <span
                                aria-hidden="true"
                                className="absolute -bottom-2 left-2 right-2 h-1 rounded-full bg-yellow-300"
                              />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </div>
              </div>

              <div className="overflow-hidden">
                <AnimatePresence initial={false} mode="wait">
                  {isOpen && active ? (
                    <motion.div
                      animate={animateInitialOpen ? { height: heightContent || 0 } : { height: "auto" }}
                      exit={{ height: 0 }}
                      initial={animateInitialOpen ? { height: 0 } : false}
                      key="expanded-content"
                      transition={motionTransition}
                    >
                      <div className="px-0 pt-0 pb-2 sm:px-(--toolbar-gutter)" ref={contentRef}>
                        <div
                          className={cn(
                            "rounded-t-none rounded-b-(--radius) bg-transparent px-1 pt-4 pb-1 sm:px-3",
                            toolbarInnerWellClass,
                          )}
                        >
                          <AnimatePresence initial={false} mode="wait">
                            {renderContent()}
                          </AnimatePresence>
                        </div>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </MotionConfig>
      </div>
    </WizardExpandableContext.Provider>
  );
});

WizardExpandableInner.displayName = "WizardExpandableInner";

// ________________________ HOOKS ________________________
interface Bounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

function useMeasure(): [(node: HTMLElement | null) => void, Bounds, () => void] {
  const [bounds, setBounds] = useState<Bounds>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });

  const [node, setNode] = useState<HTMLElement | null>(null);
  const observer = useRef<ResizeObserver | null>(null);

  const disconnect = useCallback(() => {
    if (observer.current) {
      observer.current.disconnect();
    }
  }, []);

  const ref = useCallback((node: HTMLElement | null) => {
    setNode(node);
  }, []);

  useEffect(() => {
    if (!node) {
      return;
    }

    if (observer.current) {
      observer.current.disconnect();
    }

    observer.current = new ResizeObserver(([entry]) => {
      if (!entry) {
        return;
      }
      const borderBox = entry.borderBoxSize?.[0];
      if (borderBox) {
        setBounds({
          left: 0,
          top: 0,
          width: borderBox.inlineSize,
          height: borderBox.blockSize,
        });
        return;
      }
      const rect = entry.contentRect;
      if (!rect) {
        return;
      }
      const { left, top, width, height } = rect;
      setBounds({ left, top, width, height });
    });

    observer.current.observe(node);

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [node]);

  return [ref, bounds, disconnect];
}

function useClickOutside<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T | null>,
  handler: (event: MouseEvent | TouchEvent) => void,
) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      const el = ref?.current;
      if (!el || el.contains((event?.target as Node) || null)) {
        return;
      }

      handler(event);
    };

    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);

    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]);
}

function scrollElementToCenterInViewport(
  viewport: HTMLElement,
  target: HTMLElement,
  behavior: ScrollBehavior = "smooth",
) {
  const viewportRect = viewport.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const targetCenter = targetRect.left + targetRect.width / 2;
  const viewportCenter = viewportRect.left + viewportRect.width / 2;
  const delta = targetCenter - viewportCenter;
  const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
  const nextLeft = Math.max(0, Math.min(maxScroll, viewport.scrollLeft + delta));
  viewport.scrollTo({ left: nextLeft, behavior });
}

export default function WizardExpandable(props: WizardExpandableProps) {
  return <WizardExpandableInner {...props} />;
}
