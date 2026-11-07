UPDATE newwash_services
SET category = 'laundry',
    label = 'Giặt sấy phổ thông',
    english = 'Standard wash & dry',
    duration_label = '24 giờ',
    duration_hours = 24,
    price_per_kg = 12500,
    min_kg = 3,
    note = 'Dưới 3 kg: 39.000đ/lần · Trên 10 kg: 10.500đ/kg',
    icon_key = 'washer-lightning',
    active = true,
    sort_order = 10,
    updated_at = now()
WHERE code = 'standard';

UPDATE newwash_services
SET category = 'laundry',
    label = 'Giặt sấy lấy nhanh',
    english = 'Express wash & dry',
    duration_label = '3,5 giờ',
    duration_hours = 4,
    price_per_kg = 25000,
    min_kg = 3,
    note = 'Dưới 3 kg: 79.000đ/lần',
    icon_key = 'washer-clock',
    active = true,
    sort_order = 20,
    updated_at = now()
WHERE code = 'express';

UPDATE newwash_services
SET category = 'laundry',
    label = 'Giặt ủi quần áo',
    english = 'Wash, dry & iron',
    duration_label = '24 giờ',
    duration_hours = 24,
    price_per_kg = 29000,
    min_kg = 3,
    note = 'Dưới 3 kg: 95.000đ/lần · Mỗi kg ủi 2 món cơ bản',
    icon_key = 'basket-crown',
    active = true,
    sort_order = 30,
    updated_at = now()
WHERE code = 'priority';

UPDATE newwash_services
SET category = 'other',
    label = 'Ga mền & topper',
    english = 'Bedding & topper',
    duration_label = 'Báo khi nhận đồ',
    duration_hours = 48,
    price_per_kg = NULL,
    min_kg = 0,
    note = 'Ga mền: 22.000–35.000đ/kg · Topper: 35.000–50.000đ/kg',
    icon_key = 'basket-sparkles',
    active = true,
    sort_order = 40,
    updated_at = now()
WHERE code = 'special';

UPDATE newwash_services
SET category = 'other',
    label = 'Gấu bông, thảm & rèm',
    english = 'Plush, rugs & curtains',
    duration_label = 'Báo khi nhận đồ',
    duration_hours = 48,
    price_per_kg = NULL,
    min_kg = 0,
    note = 'Gấu bông từ 30.000đ/kg · Thảm, rèm báo giá theo loại và kích thước',
    icon_key = 'basket-sparkles',
    active = true,
    sort_order = 50,
    updated_at = now()
WHERE code = 'bedding';

UPDATE newwash_services
SET category = 'other',
    label = 'Nón, balo & vali',
    english = 'Hats, backpacks & luggage',
    duration_label = 'Báo khi nhận đồ',
    duration_hours = 48,
    price_per_kg = NULL,
    min_kg = 0,
    note = 'Nón từ 39.000đ · Balo từ 69.000đ · Vali từ 70.000đ',
    icon_key = 'hangers',
    active = true,
    sort_order = 60,
    updated_at = now()
WHERE code = 'dry-clean';
