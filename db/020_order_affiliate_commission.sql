ALTER TABLE newwash_orders
  ADD COLUMN IF NOT EXISTS affiliate_commission_amount bigint;

ALTER TABLE newwash_orders
  DROP CONSTRAINT IF EXISTS newwash_orders_affiliate_commission_amount_check;

ALTER TABLE newwash_orders
  ADD CONSTRAINT newwash_orders_affiliate_commission_amount_check
  CHECK (affiliate_commission_amount IS NULL OR affiliate_commission_amount >= 0);

UPDATE newwash_orders o
SET affiliate_commission_amount = floor(o.order_amount * a.commission_rate_bps / 10000.0)
FROM newwash_affiliates a
WHERE o.affiliate_id = a.id
  AND o.status = 'Hoàn tất giao'
  AND o.order_amount IS NOT NULL
  AND o.affiliate_commission_amount IS NULL;

UPDATE newwash_notifications
SET href = '/affiliate/portal/orders'
WHERE recipient_scope = 'affiliate'
  AND type IN ('order_created', 'order_status', 'commission_earned');

CREATE OR REPLACE FUNCTION newwash_create_order_notifications() RETURNS trigger AS $$
DECLARE
  display_code text;
  display_customer text;
  amount_label text;
  commission_label text;
BEGIN
  display_code := 'NW-' || upper(left(NEW.id::text, 8));
  display_customer := coalesce(nullif(NEW.customer, ''), 'Khách hàng');
  amount_label := CASE
    WHEN NEW.order_amount IS NULL OR NEW.order_amount = 0 THEN ''
    ELSE ' · ' || trim(to_char(NEW.order_amount, 'FM999G999G999G999')) || 'đ'
  END;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO newwash_notifications (recipient_scope, type, title, message, href, metadata)
    VALUES (
      'admin',
      'order_created',
      'Có đơn giặt ủi mới',
      display_code || ' · ' || display_customer || ' · ' || NEW.service || amount_label,
      '/dashboard/affiliates/orders/' || NEW.id::text,
      jsonb_build_object('orderId', NEW.id)
    );

    IF NEW.affiliate_id IS NOT NULL THEN
      INSERT INTO newwash_notifications (recipient_scope, affiliate_id, type, title, message, href, metadata)
      VALUES (
        'affiliate',
        NEW.affiliate_id,
        'order_created',
        'Bạn vừa ghi nhận một đơn mới',
        display_code || ' · ' || NEW.service || amount_label,
        '/affiliate/portal/orders',
        jsonb_build_object('orderId', NEW.id)
      );
    END IF;
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'Hoàn tất giao' THEN
      INSERT INTO newwash_notifications (recipient_scope, type, title, message, href, metadata)
      VALUES (
        'admin',
        'order_completed',
        'Đơn hàng đã giao thành công',
        display_code || ' · ' || display_customer || amount_label,
        '/dashboard/affiliates/orders/' || NEW.id::text,
        jsonb_build_object('orderId', NEW.id, 'status', NEW.status)
      );

      IF NEW.affiliate_id IS NOT NULL THEN
        commission_label := CASE
          WHEN NEW.affiliate_commission_amount IS NULL THEN 'Hoa hồng đang chờ quản trị viên xác nhận.'
          ELSE trim(to_char(NEW.affiliate_commission_amount, 'FM999G999G999G999')) || 'đ hoa hồng đã được ghi nhận.'
        END;

        INSERT INTO newwash_notifications (recipient_scope, affiliate_id, type, title, message, href, metadata)
        VALUES (
          'affiliate',
          NEW.affiliate_id,
          'commission_earned',
          'Hoa hồng vừa được ghi nhận',
          display_code || ' · ' || commission_label,
          '/affiliate/portal/orders',
          jsonb_build_object('orderId', NEW.id, 'status', NEW.status)
        );
      END IF;
    ELSE
      INSERT INTO newwash_notifications (recipient_scope, type, title, message, href, metadata)
      VALUES (
        'admin',
        'order_status',
        'Đơn hàng đổi trạng thái',
        display_code || ' chuyển sang “' || NEW.status || '”',
        '/dashboard/affiliates/orders/' || NEW.id::text,
        jsonb_build_object('orderId', NEW.id, 'status', NEW.status)
      );

      IF NEW.affiliate_id IS NOT NULL THEN
        INSERT INTO newwash_notifications (recipient_scope, affiliate_id, type, title, message, href, metadata)
        VALUES (
          'affiliate',
          NEW.affiliate_id,
          'order_status',
          'Đơn affiliate đã cập nhật',
          display_code || ' chuyển sang “' || NEW.status || '”',
          '/affiliate/portal/orders',
          jsonb_build_object('orderId', NEW.id, 'status', NEW.status)
        );
      END IF;
    END IF;
  ELSIF NEW.affiliate_commission_amount IS DISTINCT FROM OLD.affiliate_commission_amount
    AND NEW.status = 'Hoàn tất giao'
    AND NEW.affiliate_id IS NOT NULL THEN
    INSERT INTO newwash_notifications (recipient_scope, affiliate_id, type, title, message, href, metadata)
    VALUES (
      'affiliate',
      NEW.affiliate_id,
      'commission_earned',
      'Hoa hồng vừa được cập nhật',
      display_code || ' · ' || trim(to_char(NEW.affiliate_commission_amount, 'FM999G999G999G999')) || 'đ',
      '/affiliate/portal/orders',
      jsonb_build_object('orderId', NEW.id, 'status', NEW.status)
    );
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS newwash_orders_notifications ON newwash_orders;
CREATE TRIGGER newwash_orders_notifications
  AFTER INSERT OR UPDATE OF status, affiliate_commission_amount ON newwash_orders
  FOR EACH ROW EXECUTE FUNCTION newwash_create_order_notifications();
