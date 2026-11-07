INSERT INTO newwash_affiliates (
  name,
  contact,
  channel,
  code,
  status,
  access_secret_hash
)
VALUES (
  'Nguyễn Minh Anh',
  'minhanh.demo@newwash.local',
  'Tài khoản demo',
  'MINHANHDEMO',
  'approved',
  '6e6577776173682d706173732d32303236:8332e9b7c64372b2b4c5f490541a18a5d12a5c1b538b82d60b343cc1b0cb87d26ef039d581adbbe7bfde4416fedcfe00da299423d8513c0df5f9cd5adeef0008'
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  contact = EXCLUDED.contact,
  channel = EXCLUDED.channel,
  status = 'approved',
  access_secret_hash = EXCLUDED.access_secret_hash;
