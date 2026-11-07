DROP TRIGGER IF EXISTS newwash_orders_notifications ON newwash_orders;

ALTER TABLE newwash_orders
  DROP CONSTRAINT IF EXISTS newwash_orders_status_check;

UPDATE newwash_orders
SET status = 'Hoàn tất giao'
WHERE status = 'Hoàn tất';

UPDATE newwash_orders
SET order_amount = NULL
WHERE status <> 'Hoàn tất giao';

ALTER TABLE newwash_orders
  ADD CONSTRAINT newwash_orders_status_check
  CHECK (status IN ('Mới', 'Đang xử lý', 'Hoàn tất giao', 'Đã hủy'));

CREATE TRIGGER newwash_orders_notifications
  AFTER INSERT OR UPDATE OF status ON newwash_orders
  FOR EACH ROW EXECUTE FUNCTION newwash_create_order_notifications();
