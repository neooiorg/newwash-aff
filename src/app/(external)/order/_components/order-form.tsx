"use client";

import { Check, CheckCircle2, ChevronDown, Clock3, MapPin, Minus, Phone, Plus, Shirt, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { cn } from "cn";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import type { BookingService, ServiceCategory } from "@/lib/booking-services";

import WizardExpandable, { type WizardNavigateContext, type WizardStep } from "./wizard-expandable";
import { dateChoices, formatVnd, localDateKey, timeSlots } from "./booking-options";

type OrderFormProps = { affiliateCode: string; embedded: boolean; preview?: boolean; hostOrigin: string };

function FormCloseAction({ onClose }: { onClose: () => void }) {
  return (
    <Button type="button" onClick={onClose} className="mt-2">
      Đóng
    </Button>
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
  const [whiteWashFee, setWhiteWashFee] = useState(0);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState("");
  const [today, setToday] = useState<Date | null>(null);
  const [category, setCategory] = useState<ServiceCategory>("laundry");
  const [serviceCode, setServiceCode] = useState("");
  const [quantityKg, setQuantityKg] = useState(0);
  const [washWhitesSeparately, setWashWhitesSeparately] = useState(false);
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
  const pendingRequest = useRef("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!embedded) return;
    const previousHtmlBackground = document.documentElement.style.background;
    const previousBodyBackground = document.body.style.background;
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    return () => {
      document.documentElement.style.background = previousHtmlBackground;
      document.body.style.background = previousBodyBackground;
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
          setWhiteWashFee(data.whiteWashFee);
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
          if (
            message.type === "ready" ||
            (message.type === "invalidate" && ["newwash_services", "newwash_settings"].includes(message.table))
          ) {
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

  useEffect(() => {
    function receive(event: MessageEvent) {
      if (!embedded || !hostOrigin || event.source !== window.parent || event.origin !== hostOrigin) return;
      if (event.data?.type !== "newwash:order-result" || event.data.requestId !== pendingRequest.current) return;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      pendingRequest.current = "";
      setSaving(false);
      if (event.data.error) setError(String(event.data.error));
      else setSubmittedId(String(event.data.orderId));
    }
    window.addEventListener("message", receive);
    return () => {
      window.removeEventListener("message", receive);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [embedded, hostOrigin]);

  const service = services.find((item) => item.code === serviceCode);
  const total =
    service?.pricePerKg !== null && service && quantityKg > 0
      ? service.pricePerKg * quantityKg + (washWhitesSeparately ? whiteWashFee : 0)
      : 0;
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

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (preview) return;
    if (!service) {
      setError("Vui lòng chọn dịch vụ giặt ủi.");
      setActiveStep("service");
      return;
    }
    if (service.pricePerKg !== null && quantityKg < service.minKg) {
      setError(`Dịch vụ này yêu cầu tối thiểu ${service.minKg} kg.`);
      setActiveStep("service");
      return;
    }
    if (!pickupAddress.trim() || (!sameDeliveryAddress && !deliveryAddress.trim())) {
      setError("Vui lòng nhập địa chỉ nhận và giao đồ.");
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
      setError(`Thời gian giao đồ cần cách giờ nhận ít nhất ${minimumHours} giờ.`);
      setActiveStep("schedule");
      return;
    }
    if (!/^0\d{9}$/.test(phone.replace(/[\s.-]/g, ""))) {
      setError("Vui lòng nhập số điện thoại Việt Nam gồm 10 chữ số.");
      setActiveStep("contact");
      return;
    }
    if (!embedded || !hostOrigin) {
      setError("Vui lòng đặt đơn qua popup trên website cửa hàng.");
      return;
    }
    const requestId = crypto.randomUUID();
    pendingRequest.current = requestId;
    setSaving(true);
    window.parent.postMessage(
      {
        type: "newwash:order-submit",
        requestId,
        order: {
          customer: customer.trim(),
          phone: phone.trim(),
          address: pickupAddress.trim(),
          service: service.label,
          partnerCode: affiliateCode,
          serviceCode: service.code,
          category,
          quantityKg,
          washWhitesSeparately,
          pickupDate,
          pickupTime,
          deliveryDate,
          deliveryTime,
          deliveryAddress: sameDeliveryAddress ? pickupAddress.trim() : deliveryAddress.trim(),
          notes: notes.trim(),
          coupon: coupon.trim(),
          estimatedTotal: service.pricePerKg !== null ? total : null,
        },
      },
      hostOrigin,
    );
    timeoutRef.current = setTimeout(() => {
      if (pendingRequest.current === requestId) {
        pendingRequest.current = "";
        setSaving(false);
        setError("Website chưa phản hồi. Vui lòng thử lại.");
      }
    }, 15_000);
  }

  const handleDrawerOpenChange = useCallback(
    (open: boolean) => {
      setDrawerOpen(open);
      if (!open && embedded && hostOrigin) window.parent.postMessage({ type: "newwash:close" }, hostOrigin);
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
      setError(stepError(invalid));
      document.getElementById(`${invalid}-section`)?.scrollIntoView({ block: "center", behavior: "smooth" });
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
            className="grid w-full grid-cols-2 rounded-lg bg-muted p-1"
          >
            <ToggleGroupItem
              value="laundry"
              disabled={!services.some((item) => item.category === "laundry")}
              className="h-9 w-full border-transparent data-[state=on]:border-yellow-400 data-[state=on]:bg-yellow-400 data-[state=on]:text-zinc-950"
            >
              Giặt theo kg
            </ToggleGroupItem>
            <ToggleGroupItem
              value="other"
              disabled={!services.some((item) => item.category === "other")}
              className="h-9 w-full border-transparent data-[state=on]:border-yellow-400 data-[state=on]:bg-yellow-400 data-[state=on]:text-zinc-950"
            >
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
            className="grid w-full grid-cols-1 gap-2"
          >
            {services
              .filter((item) => item.category === category)
              .map((item) => (
                <ToggleGroupItem
                  key={item.code}
                  value={item.code}
                  className="h-auto min-h-20 w-full items-center justify-between gap-4 whitespace-normal bg-background px-4 py-3 text-left transition-colors data-[state=on]:border-yellow-400 data-[state=on]:bg-yellow-400/10"
                >
                  <span className="flex min-w-0 flex-col items-start gap-1">
                    <span className="font-medium leading-tight">{item.label}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {item.duration}
                      {item.note ? ` · ${item.note}` : ""}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="font-semibold tabular-nums">
                      {item.pricePerKg !== null ? `${formatVnd(item.pricePerKg)}/kg` : "Báo giá"}
                    </span>
                    <span
                      className={cn(
                        "flex size-5 items-center justify-center rounded-full border",
                        serviceCode === item.code
                          ? "border-yellow-400 bg-yellow-400 text-zinc-950"
                          : "border-border text-transparent",
                      )}
                    >
                      <Check aria-hidden="true" />
                    </span>
                  </span>
                </ToggleGroupItem>
              ))}
          </ToggleGroup>
          {service && (
            <FieldGroup className="gap-3 border-t pt-4">
              {service.pricePerKg !== null && (
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
              )}
              <Field orientation="horizontal">
                <Checkbox
                  id="wash-whites"
                  checked={washWhitesSeparately}
                  onCheckedChange={(checked) => setWashWhitesSeparately(checked === true)}
                />
                <FieldContent>
                  <FieldLabel htmlFor="wash-whites">Giặt riêng đồ trắng</FieldLabel>
                  <FieldDescription>Phụ phí {formatVnd(whiteWashFee)}</FieldDescription>
                </FieldContent>
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
    <Drawer open={drawerOpen} onOpenChange={handleDrawerOpenChange}>
      <EmbeddedOpenSync enabled={embedded} hostOrigin={hostOrigin} onOpen={() => handleDrawerOpenChange(true)} />
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
      <DrawerContent className="h-[80dvh] max-h-[80dvh] overflow-hidden sm:mx-auto sm:max-w-3xl">
        <DrawerHeader className="relative border-b px-4 pt-2 pb-5 text-left sm:px-8">
          <div className="flex items-start justify-between gap-4 pr-12">
            <div>
              <DrawerTitle>Thông tin đặt giặt ủi</DrawerTitle>
              <DrawerDescription className="mt-1">Chọn dịch vụ, địa chỉ và thời gian nhận đồ.</DrawerDescription>
            </div>
            <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
              {activeStepIndex + 1}/{stepOrder.length}
            </span>
          </div>
          <DrawerClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-0 right-4 rounded-full sm:right-8"
              aria-label="Đóng biểu mẫu"
            >
              <X />
            </Button>
          </DrawerClose>
        </DrawerHeader>
        <ScrollArea className="min-h-0 flex-1 overflow-hidden">
          <main className="bg-background text-foreground">
            <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 pt-5 pb-8 sm:px-8">
              {submittedId ? (
                <Card className="border-border bg-background text-foreground">
                  <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                    <span className="flex size-14 items-center justify-center rounded-full bg-yellow-400 text-zinc-950">
                      <CheckCircle2 aria-hidden="true" />
                    </span>
                    <h2 className="text-xl font-semibold">Đã gửi đơn thành công</h2>
                    <p className="max-w-sm text-sm text-muted-foreground">
                      Website cửa hàng đã tiếp nhận đơn {submittedId}. Cửa hàng sẽ liên hệ với bạn.
                    </p>
                    <FormCloseAction onClose={() => handleDrawerOpenChange(false)} />
                  </CardContent>
                </Card>
              ) : (
                <form
                  ref={formRef}
                  id="newwash-order-form"
                  noValidate
                  onSubmit={submit}
                  className="flex flex-col gap-4"
                >
                  {error && (
                    <Alert variant="destructive" role="alert">
                      <AlertTitle>Chưa thể đặt đơn</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
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
                        setError(contactError);
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
              )}
            </div>
          </main>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
