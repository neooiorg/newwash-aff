export const laundryServiceIcons = [
  { key: "washer-lightning", label: "Máy giặt và tia sét", src: "/laundry-icons/washer-lightning.png" },
  { key: "washer-clock", label: "Máy giặt và đồng hồ", src: "/laundry-icons/washer-clock.png" },
  { key: "basket-crown", label: "Giỏ đồ và vương miện", src: "/laundry-icons/basket-crown.png" },
  { key: "basket-sparkles", label: "Giỏ đồ lấp lánh", src: "/laundry-icons/basket-sparkles.png" },
  { key: "hangers", label: "Móc treo đồ", src: "/laundry-icons/hangers.png" },
] as const;

export type LaundryServiceIconKey = (typeof laundryServiceIcons)[number]["key"];

const iconByKey = new Map(laundryServiceIcons.map((icon) => [icon.key, icon]));

const fallbackByCode: Record<string, LaundryServiceIconKey> = {
  standard: "washer-lightning",
  express: "washer-clock",
  priority: "basket-crown",
  special: "basket-sparkles",
  bedding: "basket-sparkles",
  "dry-clean": "hangers",
};

export function getLaundryServiceIcon(iconKey: string, serviceCode = "") {
  return (
    iconByKey.get(iconKey as LaundryServiceIconKey) ??
    iconByKey.get(fallbackByCode[serviceCode] ?? "basket-sparkles") ??
    laundryServiceIcons[0]
  );
}
