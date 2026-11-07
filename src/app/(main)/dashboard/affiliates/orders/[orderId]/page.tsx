import { OrderDetail } from "./_components/order-detail";

export const metadata = { title: "Chi tiết đơn hàng | NewWash Aff" };

export default async function Page({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  return <OrderDetail orderId={orderId} />;
}
