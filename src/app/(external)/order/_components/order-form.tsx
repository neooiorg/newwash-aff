"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import Image from "next/image";

import { cn } from "cn";
import { Check, ChevronDown, ChevronRight, Clock3, MapPin, Minus, Phone, Plus, Shirt, Sparkles, X } from "lucide-react";
import { Toaster as SileoToaster, sileo } from "sileo";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { BookingService, ServiceCategory } from "@/lib/booking-services";
import { getLaundryServiceIcon } from "@/lib/laundry-service-icons";

import { dateChoices, formatVnd, localDateKey, timeSlots } from "./booking-options";
import WizardExpandable, { type WizardNavigateContext, type WizardStep } from "./wizard-expandable";

type OrderFormProps = { affiliateCode: string; embedded: boolean; preview?: boolean; hostOrigin: string };

function OrderSuccess({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  function showOrder() {
    sileo.info({
      title: "Mã đơn của bạn",
      description: `${orderId} · Cửa hàng sẽ liên hệ với bạn để xác nhận.`,
      position: "top-center",
      duration: 4200,
    });
  }

  return (
    <ScrollArea className="min-h-0 flex-1 overflow-hidden">
      <section className="relative mx-auto flex min-h-[calc(88dvh-1.5rem)] w-full max-w-lg flex-col items-center justify-center overflow-hidden px-6 py-10 text-center sm:px-10 sm:py-14">
        <div className="relative mb-7 flex size-48 items-center justify-center sm:size-56">
          <span className="absolute inset-x-5 top-7 bottom-3 -rotate-6 rounded-[40%_60%_52%_48%] bg-yellow-100" />
          <Sparkles aria-hidden="true" className="absolute top-8 right-2 size-7 text-yellow-400 sm:right-0 sm:size-8" />
          <Sparkles aria-hidden="true" className="absolute bottom-8 left-0 size-6 text-yellow-400 sm:-left-1" />
          <Image
            alt="Máy giặt và khăn sạch"
            className="relative size-44 object-contain drop-shadow-xl sm:size-52"
            height={224}
            priority
            src="/laundry-icons/booking-header.png"
            width={224}
          />
          <span className="absolute top-5 right-5 flex size-14 items-center justify-center rounded-full border-4 border-white bg-green-500 text-white shadow-lg sm:right-3 sm:size-16">
            <Check aria-hidden="true" className="size-8 stroke-[3] sm:size-9" />
          </span>
        </div>

        <div className="flex max-w-md flex-col items-center gap-3">
          <DrawerTitle className="text-balance text-3xl font-extrabold tracking-tight text-zinc-950 sm:text-4xl">
            Đặt giặt ủi thành công!
          </DrawerTitle>
          <DrawerDescription className="max-w-sm text-pretty text-base leading-relaxed text-zinc-500 sm:text-lg">
            Đơn giặt ủi của bạn đã được ghi nhận. Chúng tôi sẽ liên hệ sớm để xác nhận.
          </DrawerDescription>
        </div>

        <div className="mt-9 flex w-full max-w-md flex-col gap-3">
          <Button
            type="button"
            size="lg"
            onClick={onClose}
            className="h-13 rounded-full bg-yellow-400 font-bold text-zinc-950 shadow-md hover:bg-yellow-300"
          >
            Về trang chủ
          </Button>
          <Button
            type="button"
            size="lg"
            variant="outline"
            onClick={showOrder}
            className="h-13 rounded-full font-semibold"
          >
            Xem đơn hàng
          </Button>
        </div>
      </section>
    </ScrollArea>
  );
}

function EmbeddedOpenSync({
  enabled,
  hostOrigin,
  onOpen,
}: {
  enabled: boolean;
  hostOrigin: string;
  onOpen: () => void;
}) {
  useEffect(() => {
    if (!enabled || !hostOrigin) return;
    function receive(event: MessageEvent) {
      if (event.source !== window.parent || event.origin !== hostOrigin) return;
      if (event.data?.type === "newwash:open") onOpen();
    }
    window.addEventListener("message", receive);
    window.parent.postMessage({ type: "newwash:ready" }, hostOrigin);
    return () => window.removeEventListener("message", receive);
  }, [enabled, hostOrigin, onOpen]);

  return null;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function deliveryOffsetDays(durationHours: number) {
  return Math.max(0, Math.ceil((durationHours - 4) / 24));
}

function formatShortDate(value: string) {
  if (!value) return "Chưa chọn";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "Chưa chọn";
  return new Intl.DateTimeFormat("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" }).format(date);
}

function DatePicker({
  label,
  value,
  onChange,
  days,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  days: ReturnType<typeof dateChoices>;
}) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <ScrollArea className="w-full pb-3">
        <ToggleGroup
          type="single"
          value={value}
          onValueChange={(next) => {
            if (next) onChange(next);
          }}
          variant="outline"
          className="flex w-max min-w-full justify-start gap-2"
          aria-label={label}
        >
          {days.map((day) => (
            <ToggleGroupItem
              key={day.value}
              value={day.value}
              className="h-16 min-w-16 flex-col gap-0.5 px-2 tabular-nums data-[state=on]:border-yellow-400 data-[state=on]:bg-yellow-400 data-[state=on]:text-zinc-950"
            >
              <span className="text-xs font-normal">{day.weekday}</span>
              <span className="text-base font-semibold">
                {day.day}/{day.month}
              </span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </Field>
  );
}

export function OrderForm({ affiliateCode, embedded, preview = false, hostOrigin }: OrderFormProps) {
  const [activeStep, setActiveStep] = useState("service");
  const formRef = useRef<HTMLFormElement>(null);
  const [services, setServices] = useState<BookingService[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState("");
  const [today, setToday] = useState<Date | null>(null);
  const [category, setCategory] = useState<ServiceCategory>("laundry");
  const [serviceCode, setServiceCode] = useState("");
  const [quantityKg, setQuantityKg] = useState(0);
  const [pickupAddress, setPickupAddress] = useState("");
  const [sameDeliveryAddress, setSameDeliveryAddress] = useState(true);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("13:00");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("17:00");
  const [phone, setPhone] = useState("");
  const [customer, setCustomer] = useState("");
  const [notes, setNotes] = useState("");
  const [coupon, setCoupon] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [submittedId, setSubmittedId] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(preview && !embedded);
  const [compactViewport, setCompactViewport] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const submissionRequestId = useRef("");

  const keepFocusedControlVisible = useCallback((target: Element | null) => {
    if (!(target instanceof HTMLElement)) return;
    if (!target.matches("input, textarea, [contenteditable='true']")) return;
    const viewport = scrollAreaRef.current?.querySelector<HTMLElement>("[data-slot='scroll-area-viewport']");
    if (!viewport) return;

    const targetRect = target.getBoundingClientRect();
    const viewportRect = viewport.getBoundingClientRect();
    const topClearance = 16;
    const bottomClearance = 104;
    if (targetRect.bottom > viewportRect.bottom - bottomClearance) {
      viewport.scrollBy({ top: targetRect.bottom - viewportRect.bottom + bottomClearance, behavior: "smooth" });
    } else if (targetRect.top < viewportRect.top + topClearance) {
      viewport.scrollBy({ top: targetRect.top - viewportRect.top - topClearance, behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    let focusTimer: ReturnType<typeof setTimeout> | undefined;
    function syncViewport() {
      window.scrollTo(0, 0);
      const height = window.visualViewport?.height ?? window.innerHeight;
      setCompactViewport(window.innerWidth < 640 && height < 640);
      clearTimeout(focusTimer);
      focusTimer = setTimeout(() => keepFocusedControlVisible(document.activeElement), 80);
    }

    syncViewport();
    window.addEventListener("resize", syncViewport, { passive: true });
    window.addEventListener("scroll", syncViewport, { passive: true });
    window.visualViewport?.addEventListener("resize", syncViewport, { passive: true });
    window.visualViewport?.addEventListener("scroll", syncViewport, { passive: true });
    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener("resize", syncViewport);
      window.removeEventListener("scroll", syncViewport);
      window.visualViewport?.removeEventListener("resize", syncViewport);
      window.visualViewport?.removeEventListener("scroll", syncViewport);
    };
  }, [keepFocusedControlVisible]);

  const showOrderError = useCallback((message: string) => {
    setError(message);
    sileo.warning({
      title: "Chưa thể đặt đơn",
      description: message,
      position: "top-center",
      duration: 4200,
    });
  }, []);

  useEffect(() => {
    if (!embedded) return;
    const previousHtmlBackground = document.documentElement.style.background;
    const previousHtmlHeight = document.documentElement.style.height;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousHtmlOverscroll = document.documentElement.style.overscrollBehavior;
    const previousBodyBackground = document.body.style.background;
    const previousBodyHeight = document.body.style.height;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyOverscroll = document.body.style.overscrollBehavior;
    document.documentElement.style.background = "transparent";
    document.documentElement.style.height = "100%";
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";
    document.body.style.background = "transparent";
    document.body.style.height = "100%";
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    window.scrollTo(0, 0);
    return () => {
      document.documentElement.style.background = previousHtmlBackground;
      document.documentElement.style.height = previousHtmlHeight;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.documentElement.style.overscrollBehavior = previousHtmlOverscroll;
      document.body.style.background = previousBodyBackground;
      document.body.style.height = previousBodyHeight;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.overscrollBehavior = previousBodyOverscroll;
    };
  }, [embedded]);

  useEffect(() => {
    const now = new Date();
    setToday(now);
    setPickupDate(localDateKey(now));
    setDeliveryDate(localDateKey(addDays(now, 1)));
  }, []);

  useEffect(() => {
    let active = true;
    let socket: WebSocket | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let retryDelay = 1000;
    async function loadServices() {
      try {
        const response = await fetch("/api/booking-services", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Không tải được danh sách dịch vụ.");
        if (active) {
          setServices(data.services);
          setServiceCode((current) => {
            if (current && data.services.some((item: BookingService) => item.code === current)) return current;
            const firstService = data.services.find((item: BookingService) => item.category === "laundry");
            if (!firstService) return "";
            setCategory(firstService.category);
            setQuantityKg(firstService.pricePerKg === null ? 0 : firstService.minKg);
            return firstService.code;
          });
          setServicesError("");
        }
      } catch (cause) {
        if (active) setServicesError(cause instanceof Error ? cause.message : "Không tải được dịch vụ.");
      } finally {
        if (active) setServicesLoading(false);
      }
    }
    function connect() {
      if (!active) return;
      const configured = process.env.NEXT_PUBLIC_REALTIME_URL;
      const base =
        configured || `${location.protocol === "https:" ? "wss" : "ws"}://${location.hostname}:3002/realtime`;
      const url = new URL(base, location.href);
      url.pathname = "/services";
      url.search = "";
      socket = new WebSocket(url);
      socket.addEventListener("open", () => {
        retryDelay = 1000;
      });
      socket.addEventListener("message", (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "ready" || (message.type === "invalidate" && message.table === "newwash_services")) {
            void loadServices();
          }
        } catch {
          /* Ignore malformed messages. */
        }
      });
      socket.addEventListener("close", () => {
        if (!active) return;
        retry = setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 30_000);
      });
      socket.addEventListener("error", () => socket?.close());
    }
    function onVisible() {
      if (document.visibilityState === "visible") void loadServices();
    }
    document.addEventListener("visibilitychange", onVisible);
    void loadServices();
    connect();
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisible);
      clearTimeout(retry);
      socket?.close();
    };
  }, []);

  const service = services.find((item) => item.code === serviceCode);
  const total = service?.pricePerKg !== null && service && quantityKg > 0 ? service.pricePerKg * quantityKg : 0;
  const days = useMemo(() => (today ? dateChoices(today, 14) : []), [today]);

  function chooseService(code: string) {
    const next = services.find((item) => item.code === code);
    setServiceCode(code);
    setQuantityKg(next?.pricePerKg !== null && next ? Math.max(quantityKg, next.minKg) : 0);
    if (today && next) {
      const selectedPickup = pickupDate ? new Date(`${pickupDate}T12:00:00`) : today;
      setDeliveryDate(localDateKey(addDays(selectedPickup, deliveryOffsetDays(next.durationHours))));
    }
    setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (preview) return;
    if (!service) {
      showOrderError("Vui lòng chọn dịch vụ giặt ủi.");
      setActiveStep("service");
      return;
    }
    if (service.pricePerKg !== null && quantityKg < service.minKg) {
      showOrderError(`Dịch vụ này yêu cầu tối thiểu ${service.minKg} kg.`);
      setActiveStep("service");
      return;
    }
    if (!pickupAddress.trim() || (!sameDeliveryAddress && !deliveryAddress.trim())) {
      showOrderError("Vui lòng nhập địa chỉ nhận và giao đồ.");
      setActiveStep("address");
      return;
    }
    const pickupAt = new Date(`${pickupDate}T${pickupTime}:00`);
    const deliveryAt = new Date(`${deliveryDate}T${deliveryTime}:00`);
    const minimumHours = service.durationHours;
    if (
      !pickupDate ||
      !deliveryDate ||
      Number.isNaN(pickupAt.getTime()) ||
      Number.isNaN(deliveryAt.getTime()) ||
      deliveryAt.getTime() - pickupAt.getTime() < minimumHours * 3_600_000
    ) {
      showOrderError(`Thời gian giao đồ cần cách giờ nhận ít nhất ${minimumHours} giờ.`);
      setActiveStep("schedule");
      return;
    }
    if (!/^0\d{9}$/.test(phone.replace(/[\s.-]/g, ""))) {
      showOrderError("Vui lòng nhập số điện thoại Việt Nam gồm 10 chữ số.");
      setActiveStep("contact");
      return;
    }
    const requestId = submissionRequestId.current || crypto.randomUUID();
    submissionRequestId.current = requestId;
    setSaving(true);
    try {
      const response = await fetch("/api/orders/direct", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requestId,
          affiliateCode,
          customer: customer.trim(),
          phone: phone.replace(/[\s.-]/g, ""),
          service: service.label,
          serviceCode: service.code,
          category,
          quantityKg,
          pickupAddress: pickupAddress.trim(),
          deliveryAddress: sameDeliveryAddress ? pickupAddress.trim() : deliveryAddress.trim(),
          pickupDate,
          pickupTime,
          deliveryDate,
          deliveryTime,
          notes: notes.trim(),
          coupon: coupon.trim(),
          estimatedTotal: service.pricePerKg !== null ? total : null,
          hostOrigin,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không gửi được đơn.");
      setSubmittedId(String(result.orderId));
    } catch (cause) {
      showOrderError(cause instanceof Error ? cause.message : "Không gửi được đơn. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  const handleDrawerOpenChange = useCallback(
    (open: boolean) => {
      setDrawerOpen(open);
      if (!open) {
        sileo.clear("top-center");
        if (embedded && hostOrigin) window.parent.postMessage({ type: "newwash:close" }, hostOrigin);
      }
    },
    [embedded, hostOrigin],
  );

  function stepError(stepId: string): string {
    if (stepId === "service") {
      if (!service) return "Vui lòng chọn dịch vụ giặt ủi.";
      if (service.pricePerKg !== null && quantityKg < service.minKg)
        return `Dịch vụ này yêu cầu tối thiểu ${service.minKg} kg.`;
    }
    if (stepId === "address" && (!pickupAddress.trim() || (!sameDeliveryAddress && !deliveryAddress.trim())))
      return "Vui lòng nhập địa chỉ nhận và giao đồ.";
    if (stepId === "schedule") {
      const pickupAt = new Date(`${pickupDate}T${pickupTime}:00`);
      const deliveryAt = new Date(`${deliveryDate}T${deliveryTime}:00`);
      if (
        !pickupDate ||
        !deliveryDate ||
        Number.isNaN(pickupAt.getTime()) ||
        Number.isNaN(deliveryAt.getTime()) ||
        deliveryAt.getTime() - pickupAt.getTime() < (service?.durationHours ?? 24) * 3_600_000
      )
        return `Thời gian giao đồ cần cách giờ nhận ít nhất ${service?.durationHours ?? 24} giờ.`;
    }
    if (stepId === "contact" && !/^0\d{9}$/.test(phone.replace(/[\s.-]/g, "")))
      return "Vui lòng nhập số điện thoại Việt Nam gồm 10 chữ số.";
    return "";
  }

  const stepOrder = ["service", "address", "schedule", "contact"];
  function canNavigateToStep(context: WizardNavigateContext) {
    if (context.toIndex <= context.fromIndex) return true;
    return stepOrder.slice(context.fromIndex, context.toIndex).every((stepId) => !stepError(stepId));
  }

  function onNavigateBlocked(context: WizardNavigateContext) {
    const invalid = stepOrder.slice(context.fromIndex, context.toIndex).find((stepId) => stepError(stepId));
    if (invalid) {
      showOrderError(stepError(invalid));
    }
  }

  const steps: WizardStep[] = [
    {
      id: "service",
      label: "Dịch vụ",
      title: "Chọn dịch vụ",
      icon: Shirt,
      content: (
        <div id="service-section" className="flex flex-col gap-4">
          {servicesLoading && <p className="text-sm text-muted-foreground">Đang tải dịch vụ...</p>}
          {servicesError && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{servicesError}</AlertDescription>
            </Alert>
          )}
          <ToggleGroup
            type="single"
            value={category}
            onValueChange={(value) => {
              if (value !== "laundry" && value !== "other") return;
              setCategory(value);
              setServiceCode("");
              setQuantityKg(0);
            }}
            variant="outline"
            className="grid w-full grid-cols-2 gap-2 rounded-2xl bg-muted/60 p-1"
          >
            <ToggleGroupItem
              value="laundry"
              disabled={!services.some((item) => item.category === "laundry")}
              className="h-12 w-full gap-2 rounded-xl border-transparent font-semibold data-[state=on]:border-yellow-400 data-[state=on]:bg-yellow-400 data-[state=on]:text-zinc-950"
            >
              <Image
                alt=""
                aria-hidden="true"
                className="size-8 object-contain"
                height={40}
                src="/laundry-icons/washer-lightning.png"
                width={40}
              />
              Giặt theo kg
            </ToggleGroupItem>
            <ToggleGroupItem
              value="other"
              disabled={!services.some((item) => item.category === "other")}
              className="h-12 w-full gap-2 rounded-xl border-transparent font-semibold data-[state=on]:border-yellow-400 data-[state=on]:bg-yellow-400 data-[state=on]:text-zinc-950"
            >
              <Image
                alt=""
                aria-hidden="true"
                className="size-8 object-contain"
                height={40}
                src="/laundry-icons/hangers.png"
                width={40}
              />
              Chuyên biệt
            </ToggleGroupItem>
          </ToggleGroup>
          <ToggleGroup
            type="single"
            value={serviceCode}
            onValueChange={(value) => {
              if (value) chooseService(value);
            }}
            variant="outline"
            className="grid w-full grid-cols-1 gap-3"
          >
            {services
              .filter((item) => item.category === category)
              .map((item) => (
                <ToggleGroupItem
                  key={item.code}
                  value={item.code}
                  className="h-auto min-h-28 w-full items-center justify-between gap-3 overflow-hidden rounded-2xl border-zinc-200 bg-white px-3 py-3 text-left text-zinc-950 shadow-sm transition-colors data-[state=on]:border-yellow-300 data-[state=on]:bg-yellow-50 sm:min-h-24"
                >
                  <span className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
                    <Image
                      alt=""
                      aria-hidden="true"
                      className="size-16 shrink-0 object-contain sm:size-18"
                      height={80}
                      src={getLaundryServiceIcon(item.iconKey, item.code).src}
                      width={80}
                    />
                    <span className="flex min-w-0 flex-1 flex-col items-start gap-1 overflow-hidden">
                      <span className="font-semibold leading-tight sm:text-base">{item.label}</span>
                      <span className="line-clamp-2 max-w-full text-xs font-normal leading-4 text-zinc-500 sm:text-sm">
                        {item.code === "special"
                          ? "Ghi chú thêm về cách giặt, loại đồ, v.v."
                          : `Trả đồ sau ${item.duration}`}
                        {item.note ? ` · ${item.note}` : ""}
                      </span>
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="max-w-20 text-right font-bold text-xs tabular-nums sm:max-w-none sm:text-lg">
                      {item.pricePerKg !== null ? `${formatVnd(item.pricePerKg)}/kg` : "Báo giá"}
                    </span>
                    {item.code === "special" ? (
                      <ChevronRight aria-hidden="true" className="size-6 text-foreground" />
                    ) : (
                      <span
                        className={cn(
                          "flex size-6 items-center justify-center rounded-full border-2",
                          serviceCode === item.code ? "border-yellow-400 bg-yellow-400" : "border-zinc-200 bg-white",
                        )}
                      >
                        {serviceCode === item.code ? (
                          <span aria-hidden="true" className="size-3 rounded-full bg-zinc-950" />
                        ) : null}
                      </span>
                    )}
                  </span>
                </ToggleGroupItem>
              ))}
          </ToggleGroup>
          {service?.pricePerKg !== null && service && (
            <FieldGroup className="gap-3 border-t pt-4">
              <Field orientation="horizontal" className="justify-between">
                <FieldContent>
                  <FieldLabel>Khối lượng ước tính</FieldLabel>
                  <FieldDescription>Tối thiểu {service.minKg} kg</FieldDescription>
                </FieldContent>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Giảm khối lượng"
                    disabled={quantityKg <= service.minKg}
                    onClick={() => setQuantityKg(Math.max(service.minKg, quantityKg - 1))}
                  >
                    <Minus />
                  </Button>
                  <span className="min-w-8 text-center font-medium tabular-nums">{quantityKg} kg</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Tăng khối lượng"
                    onClick={() => setQuantityKg(quantityKg + 1)}
                  >
                    <Plus />
                  </Button>
                </div>
              </Field>
            </FieldGroup>
          )}
        </div>
      ),
    },
    {
      id: "address",
      label: "Địa chỉ",
      title: "Địa chỉ nhận đồ",
      icon: MapPin,
      content: (
        <div id="address-section" className="flex flex-col gap-5">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="pickup-address">Địa chỉ nhận đồ</FieldLabel>
              <Input
                id="pickup-address"
                value={pickupAddress}
                onChange={(event) => setPickupAddress(event.target.value)}
                placeholder="Số nhà, đường, phường, quận"
                autoComplete="street-address"
              />
            </Field>
            <Field orientation="horizontal">
              <Checkbox
                id="same-address"
                checked={sameDeliveryAddress}
                onCheckedChange={(checked) => setSameDeliveryAddress(checked === true)}
              />
              <FieldContent>
                <FieldLabel htmlFor="same-address">Giao lại cùng địa chỉ</FieldLabel>
              </FieldContent>
            </Field>
            {!sameDeliveryAddress && (
              <Field>
                <FieldLabel htmlFor="delivery-address">Địa chỉ giao đồ *</FieldLabel>
                <Input
                  id="delivery-address"
                  value={deliveryAddress}
                  onChange={(event) => setDeliveryAddress(event.target.value)}
                  placeholder="Số nhà, đường, phường, quận"
                />
              </Field>
            )}
          </FieldGroup>
        </div>
      ),
    },
    {
      id: "schedule",
      label: "Thời gian",
      title: "Chọn thời gian nhận đồ",
      icon: Clock3,
      content: (
        <div id="schedule-section" className="flex flex-col gap-4">
          <FieldGroup>
            <DatePicker
              label="Ngày nhận đồ"
              value={pickupDate}
              onChange={(value) => {
                setPickupDate(value);
                if (service) {
                  const selectedDate = new Date(`${value}T12:00:00`);
                  setDeliveryDate(localDateKey(addDays(selectedDate, deliveryOffsetDays(service.durationHours))));
                }
              }}
              days={days}
            />
            <Field>
              <FieldLabel htmlFor="pickup-time">Giờ nhận đồ</FieldLabel>
              <Select value={pickupTime} onValueChange={setPickupTime}>
                <SelectTrigger id="pickup-time" className="w-full">
                  <SelectValue placeholder="Chọn giờ nhận đồ" />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-64">
                  <SelectGroup>
                    {timeSlots.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <p className="text-sm text-muted-foreground">
              Dự kiến giao: {formatShortDate(deliveryDate)}, {deliveryTime}
            </p>
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="ghost" className="px-0 text-muted-foreground">
                  Đổi thời gian giao
                  <ChevronDown data-icon="inline-end" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="flex flex-col gap-4 pt-2">
                <DatePicker label="Ngày giao đồ" value={deliveryDate} onChange={setDeliveryDate} days={days} />
                <Field>
                  <FieldLabel htmlFor="delivery-time">Giờ giao đồ</FieldLabel>
                  <Select value={deliveryTime} onValueChange={setDeliveryTime}>
                    <SelectTrigger id="delivery-time" className="w-full">
                      <SelectValue placeholder="Chọn giờ giao đồ" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="max-h-64">
                      <SelectGroup>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </CollapsibleContent>
            </Collapsible>
          </FieldGroup>
        </div>
      ),
    },
    {
      id: "contact",
      label: "Liên hệ",
      title: "Thông tin liên hệ",
      icon: Phone,
      content: (
        <div id="contact-section" className="flex flex-col gap-5">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="phone">Số điện thoại</FieldLabel>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="09xx xxx xxx"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="customer">Tên (tùy chọn)</FieldLabel>
              <Input
                id="customer"
                autoComplete="name"
                value={customer}
                onChange={(event) => setCustomer(event.target.value)}
                placeholder="Tên của bạn"
              />
            </Field>
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="ghost" className="px-0 text-muted-foreground">
                  Thêm ghi chú hoặc mã giảm giá
                  <ChevronDown data-icon="inline-end" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="flex flex-col gap-4 pt-2">
                <Field>
                  <FieldLabel htmlFor="notes">Ghi chú</FieldLabel>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Hướng dẫn nhận đồ"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="coupon">Mã giảm giá</FieldLabel>
                  <Input
                    id="coupon"
                    value={coupon}
                    onChange={(event) => setCoupon(event.target.value)}
                    placeholder="Nhập mã"
                  />
                </Field>
              </CollapsibleContent>
            </Collapsible>
          </FieldGroup>
        </div>
      ),
    },
  ];

  const activeStepIndex = Math.max(0, stepOrder.indexOf(activeStep));
  return (
    <>
      {/* The embed host already tracks visualViewport; disable Vaul's second keyboard resize inside that iframe. */}
      <Drawer fixed={!embedded} repositionInputs={!embedded} open={drawerOpen} onOpenChange={handleDrawerOpenChange}>
        <EmbeddedOpenSync enabled={embedded} hostOrigin={hostOrigin} onOpen={() => handleDrawerOpenChange(true)} />
        {!embedded ? (
          <div className="flex min-h-dvh items-end justify-end bg-transparent p-4 sm:p-6">
            <DrawerTrigger asChild>
              <Button
                type="button"
                size="lg"
                className="rounded-full bg-yellow-400 px-6 font-semibold text-zinc-950 shadow-xl hover:bg-yellow-300"
              >
                Đặt lịch giặt ủi
              </Button>
            </DrawerTrigger>
          </div>
        ) : null}
        <DrawerContent
          className={cn(
            "light overflow-hidden rounded-t-3xl bg-white text-zinc-950 sm:bottom-6 sm:mx-auto sm:max-w-3xl sm:rounded-3xl sm:border sm:shadow-2xl",
            compactViewport ? "h-[calc(100dvh-0.25rem)] max-h-[calc(100dvh-0.25rem)]!" : "h-[88dvh] max-h-[88dvh]!",
          )}
          onInteractOutside={(event) => {
            const target = event.detail.originalEvent.target;
            if (target instanceof Element && target.closest("[data-sileo-viewport]")) event.preventDefault();
          }}
        >
          {submittedId ? (
            <OrderSuccess orderId={submittedId} onClose={() => handleDrawerOpenChange(false)} />
          ) : (
            <>
              <DrawerHeader className="sticky top-0 z-20 w-full shrink-0 bg-white px-5 pt-3 pb-4 text-left sm:px-6 sm:pb-5">
                <div className="flex items-center justify-between gap-2 pr-10">
                  <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                    <Image
                      alt=""
                      aria-hidden="true"
                      className="size-12 shrink-0 object-contain sm:size-16"
                      height={72}
                      priority
                      src="/laundry-icons/booking-header.png"
                      width={72}
                    />
                    <div className="min-w-0">
                      <DrawerTitle className="whitespace-nowrap text-lg font-bold tracking-tight sm:text-2xl">
                        Thông tin đặt giặt ủi
                      </DrawerTitle>
                      <DrawerDescription className="mt-0.5 text-sm leading-tight text-zinc-500 sm:mt-1 sm:text-base">
                        Chọn dịch vụ, địa chỉ và thời gian nhận đồ.
                      </DrawerDescription>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-yellow-100 px-2.5 py-1 font-bold text-sm text-amber-600 tabular-nums sm:px-3 sm:py-1.5 sm:text-base">
                    {activeStepIndex + 1}/{stepOrder.length}
                  </span>
                </div>
                <DrawerClose asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-0 right-3 size-11 rounded-full sm:right-6 sm:size-9"
                    aria-label="Đóng biểu mẫu"
                  >
                    <X />
                  </Button>
                </DrawerClose>
              </DrawerHeader>
              <ScrollArea
                ref={scrollAreaRef}
                className="min-h-0 flex-1 overflow-hidden [&_[data-slot=scroll-area-viewport]]:scroll-pb-28"
              >
                <main className="w-full min-w-0 max-w-full overflow-x-hidden bg-white text-zinc-950">
                  <div className="flex w-full min-w-0 flex-col gap-4 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:gap-5 sm:px-6 sm:pt-5 sm:pb-8">
                    <form
                      ref={formRef}
                      id="newwash-order-form"
                      noValidate
                      onSubmit={submit}
                      onFocusCapture={(event) => {
                        const target = event.target;
                        window.scrollTo(0, 0);
                        setTimeout(() => {
                          window.scrollTo(0, 0);
                          keepFocusedControlVisible(target);
                        }, 80);
                      }}
                      className="flex min-w-0 max-w-full flex-col gap-4"
                    >
                      <p className="sr-only" aria-live="assertive">
                        {error}
                      </p>
                      <WizardExpandable
                        steps={steps}
                        expanded
                        animateInitialOpen={false}
                        activeStep={activeStep}
                        onActiveStepChange={(value) => {
                          if (value) {
                            setActiveStep(value);
                            setError("");
                          }
                        }}
                        canNavigateToStep={canNavigateToStep}
                        onNavigateBlocked={onNavigateBlocked}
                        onComplete={() => {
                          const contactError = stepError("contact");
                          if (contactError) {
                            showOrderError(contactError);
                            document.getElementById("phone")?.focus();
                            return;
                          }
                          formRef.current?.requestSubmit();
                        }}
                        backLabel="Quay lại"
                        nextLabel="Tiếp tục"
                        completeLabel={saving ? "Đang gửi..." : preview ? "Bản xem trước" : "Đặt ngay"}
                        canGoNext={
                          !saving &&
                          !servicesLoading &&
                          !servicesError &&
                          services.length > 0 &&
                          (!preview || activeStep !== "contact")
                        }
                        className="max-w-none px-0 sm:max-w-none"
                      />
                      {preview && (
                        <p className="text-center text-xs text-muted-foreground">
                          Đây là bản xem trước; đơn hàng sẽ không được gửi.
                        </p>
                      )}
                    </form>
                  </div>
                </main>
              </ScrollArea>
            </>
          )}
        </DrawerContent>
      </Drawer>
      <SileoToaster
        position="top-center"
        theme="light"
        offset={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
        options={{
          duration: 4200,
          fill: "white",
          styles: {
            title: "text-foreground!",
            description: "text-muted-foreground!",
            badge: "bg-yellow-400! text-zinc-950!",
          },
        }}
      />
    </>
  );
}
