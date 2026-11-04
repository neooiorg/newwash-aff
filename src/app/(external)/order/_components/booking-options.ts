export function formatVnd(amount: number) {
  return `${new Intl.NumberFormat("vi-VN").format(amount)}đ`;
}

export function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dateChoices(start: Date, count = 7) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start);
    date.setDate(date.getDate() + index);
    return {
      value: localDateKey(date),
      weekday: new Intl.DateTimeFormat("vi-VN", { weekday: "short" }).format(date),
      day: date.getDate(),
      month: date.getMonth() + 1,
    };
  });
}

export const timeSlots = Array.from({ length: 13 }, (_, index) => `${String(index + 8).padStart(2, "0")}:00`);
