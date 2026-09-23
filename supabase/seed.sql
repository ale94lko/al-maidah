-- Demo restaurant seed for local `supabase db reset` / linked projects.
-- restaurant_owners is omitted: owners are created on sign-up (MVP-04).

begin;

insert into public.restaurants (id, name, slug, trn, currency)
values (
  '11111111-1111-4111-8111-111111111111',
  'Al-Maidah Demo',
  'demo',
  '100000000000003',
  'AED'
);

insert into public.tables (id, restaurant_id, table_number, label)
values
  ('22222222-2222-4222-8222-222222222201', '11111111-1111-4111-8111-111111111111', 1, 'Patio 1'),
  ('22222222-2222-4222-8222-222222222202', '11111111-1111-4111-8111-111111111111', 2, 'Patio 2'),
  ('22222222-2222-4222-8222-222222222203', '11111111-1111-4111-8111-111111111111', 3, 'Indoor 3'),
  ('22222222-2222-4222-8222-222222222204', '11111111-1111-4111-8111-111111111111', 4, 'Indoor 4');

insert into public.categories (id, restaurant_id, name_en, name_ar, sort_order)
values
  ('33333333-3333-4333-8333-333333333301', '11111111-1111-4111-8111-111111111111', 'Starters', 'مقبلات', 10),
  ('33333333-3333-4333-8333-333333333302', '11111111-1111-4111-8111-111111111111', 'Mains', 'أطباق رئيسية', 20),
  ('33333333-3333-4333-8333-333333333303', '11111111-1111-4111-8111-111111111111', 'Drinks', 'مشروبات', 30);

insert into public.menu_items (
  id,
  restaurant_id,
  category_id,
  name_en,
  name_ar,
  description_en,
  description_ar,
  price,
  cost_price,
  photo_url,
  is_available,
  is_vegetarian,
  allergens,
  sort_order
)
values
  (
    '44444444-4444-4444-8444-444444444401',
    '11111111-1111-4111-8111-111111111111',
    '33333333-3333-4333-8333-333333333301',
    'Hummus',
    'حمص',
    'Creamy chickpea dip with olive oil.',
    'حمص كريمي بزيت الزيتون.',
    18.00,
    6.50,
    'https://images.unsplash.com/photo-1577805947697-89e18249d767?auto=format&fit=crop&w=640&h=480&q=80',
    true,
    true,
    array['sesame'],
    10
  ),
  (
    '44444444-4444-4444-8444-444444444402',
    '11111111-1111-4111-8111-111111111111',
    '33333333-3333-4333-8333-333333333301',
    'Fattoush',
    'فتوش',
    'Crisp salad with toasted bread and sumac.',
    'سلطة مقرمشة مع خبز محمص وسماق.',
    22.00,
    8.00,
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=640&h=480&q=80',
    true,
    true,
    array['gluten'],
    20
  ),
  (
    '44444444-4444-4444-8444-444444444403',
    '11111111-1111-4111-8111-111111111111',
    '33333333-3333-4333-8333-333333333302',
    'Chicken Shawarma Plate',
    'صحن شاورما دجاج',
    'Marinated chicken with rice, pickles, and garlic sauce.',
    'دجاج متبل مع أرز ومخلل وصلصة ثوم.',
    42.00,
    18.00,
    'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=640&h=480&q=80',
    true,
    false,
    array['dairy', 'gluten'],
    10
  ),
  (
    '44444444-4444-4444-8444-444444444404',
    '11111111-1111-4111-8111-111111111111',
    '33333333-3333-4333-8333-333333333302',
    'Grilled Mixed Grill',
    'مشاوي مشكلة',
    'Lamb kofta, shish tawook, and kebab.',
    'كفتة لحم وشيش طاووق وكباب.',
    68.00,
    28.00,
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=640&h=480&q=80',
    false,
    false,
    '{}',
    20
  ),
  (
    '44444444-4444-4444-8444-444444444405',
    '11111111-1111-4111-8111-111111111111',
    '33333333-3333-4333-8333-333333333303',
    'Fresh Lemon Mint',
    'ليمون بالنعناع',
    'Chilled lemon juice with mint.',
    'عصير ليمون منعش بالنعناع.',
    16.00,
    4.00,
    'https://images.unsplash.com/photo-1621263764928-df1444c5e859?auto=format&fit=crop&w=640&h=480&q=80',
    true,
    true,
    '{}',
    10
  ),
  (
    '44444444-4444-4444-8444-444444444406',
    '11111111-1111-4111-8111-111111111111',
    '33333333-3333-4333-8333-333333333303',
    'Arabic Coffee',
    'قهوة عربية',
    'Lightly roasted cardamom coffee.',
    'قهوة محمصة خفيفة بالهيل.',
    12.00,
    3.00,
    'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=640&h=480&q=80',
    true,
    true,
    '{}',
    20
  );

insert into public.modifier_groups (
  id,
  restaurant_id,
  menu_item_id,
  name_en,
  name_ar,
  is_required,
  min_select,
  max_select,
  sort_order
)
values
  (
    '55555555-5555-4555-8555-555555555501',
    '11111111-1111-4111-8111-111111111111',
    '44444444-4444-4444-8444-444444444403',
    'Size',
    'الحجم',
    true,
    1,
    1,
    10
  ),
  (
    '55555555-5555-4555-8555-555555555502',
    '11111111-1111-4111-8111-111111111111',
    '44444444-4444-4444-8444-444444444403',
    'Extras',
    'إضافات',
    false,
    0,
    3,
    20
  );

insert into public.modifier_options (
  id,
  restaurant_id,
  modifier_group_id,
  name_en,
  name_ar,
  price_extra,
  sort_order
)
values
  (
    '66666666-6666-4666-8666-666666666601',
    '11111111-1111-4111-8111-111111111111',
    '55555555-5555-4555-8555-555555555501',
    'Regular',
    'عادي',
    0.00,
    10
  ),
  (
    '66666666-6666-4666-8666-666666666602',
    '11111111-1111-4111-8111-111111111111',
    '55555555-5555-4555-8555-555555555501',
    'Large',
    'كبير',
    8.00,
    20
  ),
  (
    '66666666-6666-4666-8666-666666666603',
    '11111111-1111-4111-8111-111111111111',
    '55555555-5555-4555-8555-555555555502',
    'Extra garlic sauce',
    'صلصة ثوم إضافية',
    3.00,
    10
  ),
  (
    '66666666-6666-4666-8666-666666666604',
    '11111111-1111-4111-8111-111111111111',
    '55555555-5555-4555-8555-555555555502',
    'Extra pickles',
    'مخلل إضافي',
    2.00,
    20
  ),
  (
    '66666666-6666-4666-8666-666666666605',
    '11111111-1111-4111-8111-111111111111',
    '55555555-5555-4555-8555-555555555502',
    'Add fries',
    'إضافة بطاطس',
    6.00,
    30
  );

commit;
