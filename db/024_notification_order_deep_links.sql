UPDATE newwash_notifications
SET href = '/dashboard/affiliates/orders/' || (metadata ->> 'orderId')
WHERE recipient_scope = 'admin'
  AND type IN ('order_created', 'order_completed', 'order_status')
  AND metadata ? 'orderId'
  AND nullif(metadata ->> 'orderId', '') IS NOT NULL
  AND href = '/dashboard/affiliates/orders';

UPDATE newwash_notifications
SET href = '/affiliate/portal/orders'
WHERE recipient_scope = 'affiliate'
  AND type IN ('order_created', 'commission_earned', 'order_status')
  AND href = '/affiliate/portal';
