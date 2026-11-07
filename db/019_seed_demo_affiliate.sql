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
  '6e6577776173682d64656d6f2d32303236:4a499b6a1fe3aaaa36fd06c2cd3e27e4f8e715c12ee904fd4a549acef8b3e3af1bfdd678d3b5f29ed88d52b30c71192fc74f1213c866893bb8d128309899e237'
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  contact = EXCLUDED.contact,
  channel = EXCLUDED.channel,
  status = 'approved',
  access_secret_hash = EXCLUDED.access_secret_hash;
