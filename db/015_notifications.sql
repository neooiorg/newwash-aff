CREATE TABLE IF NOT EXISTS newwash_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_scope text NOT NULL CHECK (recipient_scope IN ('admin', 'affiliate')),
  affiliate_id uuid REFERENCES newwash_affiliates(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (length(type) BETWEEN 1 AND 50),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  message text NOT NULL CHECK (length(message) BETWEEN 1 AND 500),
  href text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (recipient_scope = 'admin' AND affiliate_id IS NULL)
    OR (recipient_scope = 'affiliate' AND affiliate_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS newwash_notifications_admin_date_idx
  ON newwash_notifications (created_at DESC)
  WHERE recipient_scope = 'admin';

CREATE INDEX IF NOT EXISTS newwash_notifications_affiliate_date_idx
  ON newwash_notifications (affiliate_id, created_at DESC)
  WHERE recipient_scope = 'affiliate';

CREATE OR REPLACE FUNCTION newwash_notify_change() RETURNS trigger AS $$
DECLARE
  row_data jsonb;
BEGIN
  row_data := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  PERFORM pg_notify(
    'newwash_changes',
    json_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'id', row_data ->> 'id',
      'affiliateId', row_data ->> 'affiliate_id'
    )::text
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

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
      '/dashboard/affiliates/orders',
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
        '/affiliate/portal',
        jsonb_build_object('orderId', NEW.id)
      );
    END IF;
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'Hoàn tất' THEN
      INSERT INTO newwash_notifications (recipient_scope, type, title, message, href, metadata)
      VALUES (
        'admin',
        'order_completed',
        'Đơn hàng đã hoàn tất',
        display_code || ' · ' || display_customer || amount_label,
        '/dashboard/affiliates/orders',
        jsonb_build_object('orderId', NEW.id, 'status', NEW.status)
      );

      IF NEW.affiliate_id IS NOT NULL THEN
        SELECT CASE
          WHEN NEW.order_amount IS NULL OR NEW.order_amount = 0 THEN 'Hoa hồng sẽ được cập nhật khi có doanh thu.'
          ELSE trim(to_char(NEW.order_amount * commission_rate_bps / 10000.0, 'FM999G999G999G999')) || 'đ hoa hồng đã được ghi nhận.'
        END
        INTO commission_label
        FROM newwash_affiliates
        WHERE id = NEW.affiliate_id;

        INSERT INTO newwash_notifications (recipient_scope, affiliate_id, type, title, message, href, metadata)
        VALUES (
          'affiliate',
          NEW.affiliate_id,
          'commission_earned',
          'Hoa hồng vừa được ghi nhận',
          display_code || ' · ' || coalesce(commission_label, 'Đơn hàng đã hoàn tất.'),
          '/affiliate/portal',
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
        '/dashboard/affiliates/orders',
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
          '/affiliate/portal',
          jsonb_build_object('orderId', NEW.id, 'status', NEW.status)
        );
      END IF;
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS newwash_orders_notifications ON newwash_orders;
CREATE TRIGGER newwash_orders_notifications
  AFTER INSERT OR UPDATE OF status ON newwash_orders
  FOR EACH ROW EXECUTE FUNCTION newwash_create_order_notifications();

CREATE OR REPLACE FUNCTION newwash_create_click_notifications() RETURNS trigger AS $$
DECLARE
  affiliate_name text;
  affiliate_code text;
BEGIN
  SELECT name, code
  INTO affiliate_name, affiliate_code
  FROM newwash_affiliates
  WHERE id = NEW.affiliate_id;

  INSERT INTO newwash_notifications (recipient_scope, type, title, message, href, metadata)
  VALUES (
    'admin',
    'affiliate_click',
    'Có lượt nhấp affiliate mới',
    coalesce(affiliate_name, 'Affiliate') || ' · ' || coalesce(affiliate_code, 'Chưa có mã'),
    '/dashboard/affiliates',
    jsonb_build_object('clickId', NEW.id, 'affiliateId', NEW.affiliate_id)
  );

  INSERT INTO newwash_notifications (recipient_scope, affiliate_id, type, title, message, href, metadata)
  VALUES (
    'affiliate',
    NEW.affiliate_id,
    'affiliate_click',
    'Có lượt nhấp mới',
    'Một khách vừa mở liên kết affiliate của bạn.',
    '/affiliate/portal',
    jsonb_build_object('clickId', NEW.id)
  );

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS newwash_affiliate_clicks_notifications ON newwash_affiliate_clicks;
CREATE TRIGGER newwash_affiliate_clicks_notifications
  AFTER INSERT ON newwash_affiliate_clicks
  FOR EACH ROW EXECUTE FUNCTION newwash_create_click_notifications();

CREATE OR REPLACE FUNCTION newwash_create_withdrawal_notifications() RETURNS trigger AS $$
DECLARE
  affiliate_name text;
  amount_label text;
BEGIN
  SELECT name INTO affiliate_name FROM newwash_affiliates WHERE id = NEW.affiliate_id;
  amount_label := trim(to_char(NEW.amount, 'FM999G999G999G999')) || 'đ';

  IF TG_OP = 'INSERT' THEN
    INSERT INTO newwash_notifications (recipient_scope, type, title, message, href, metadata)
    VALUES (
      'admin',
      'withdrawal_created',
      'Có yêu cầu rút tiền mới',
      coalesce(affiliate_name, 'Affiliate') || ' yêu cầu rút ' || amount_label,
      '/dashboard/affiliates/payouts',
      jsonb_build_object('withdrawalId', NEW.id)
    );
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO newwash_notifications (recipient_scope, affiliate_id, type, title, message, href, metadata)
    VALUES (
      'affiliate',
      NEW.affiliate_id,
      'withdrawal_status',
      CASE
        WHEN NEW.status = 'approved' THEN 'Yêu cầu rút tiền đã được duyệt'
        WHEN NEW.status = 'paid' THEN 'Hoa hồng đã được chuyển khoản'
        ELSE 'Yêu cầu rút tiền bị từ chối'
      END,
      amount_label || CASE
        WHEN NEW.status = 'approved' THEN ' đang chờ chuyển khoản.'
        WHEN NEW.status = 'paid' THEN ' đã được thanh toán.'
        ELSE ' chưa được chấp nhận.'
      END,
      '/affiliate/portal/withdrawals',
      jsonb_build_object('withdrawalId', NEW.id, 'status', NEW.status)
    );
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS newwash_withdrawals_notifications ON newwash_withdrawals;
CREATE TRIGGER newwash_withdrawals_notifications
  AFTER INSERT OR UPDATE OF status ON newwash_withdrawals
  FOR EACH ROW EXECUTE FUNCTION newwash_create_withdrawal_notifications();

DROP TRIGGER IF EXISTS newwash_notifications_realtime ON newwash_notifications;
CREATE TRIGGER newwash_notifications_realtime
  AFTER INSERT OR UPDATE OR DELETE ON newwash_notifications
  FOR EACH ROW EXECUTE FUNCTION newwash_notify_change();
