-- Seed restaurants
INSERT INTO restaurants (name, slug, logo_url, brand_color) VALUES
  ('McDonald''s', 'mcdonalds', '/restaurants/mcdonalds.png', '#DA291C'),
  ('Wendy''s', 'wendys', '/restaurants/wendys.png', '#E2203A'),
  ('Chipotle', 'chipotle', '/restaurants/chipotle.png', '#A81612'),
  ('Starbucks', 'starbucks', '/restaurants/starbucks.png', '#00704A'),
  ('Taco Bell', 'tacobell', '/restaurants/tacobell.png', '#702082');

-- Seed food items
-- McDonald's
INSERT INTO food_items (restaurant_id, name, description, image_url, base_price_cents, fan_price_cents, sort_order) VALUES
  ((SELECT id FROM restaurants WHERE slug = 'mcdonalds'), 'Big Mac', 'Two all-beef patties, special sauce, lettuce, cheese', '/food/bigmac.png', 700, 840, 1),
  ((SELECT id FROM restaurants WHERE slug = 'mcdonalds'), '10pc McNuggets', 'Crispy chicken nuggets with your choice of sauce', '/food/mcnuggets.png', 600, 720, 2),
  ((SELECT id FROM restaurants WHERE slug = 'mcdonalds'), 'McFlurry', 'Creamy vanilla soft serve with mix-ins', '/food/mcflurry.png', 500, 600, 3);

-- Wendy's
INSERT INTO food_items (restaurant_id, name, description, image_url, base_price_cents, fan_price_cents, sort_order) VALUES
  ((SELECT id FROM restaurants WHERE slug = 'wendys'), 'Dave''s Single', 'Fresh, never frozen beef with toppings', '/food/davessingle.png', 700, 840, 1),
  ((SELECT id FROM restaurants WHERE slug = 'wendys'), 'Spicy Chicken Wrap', 'Spicy chicken breast with lettuce and sauce', '/food/spicywrap.png', 500, 600, 2),
  ((SELECT id FROM restaurants WHERE slug = 'wendys'), 'Frosty', 'Thick, creamy, chocolate or vanilla', '/food/frosty.png', 400, 480, 3);

-- Chipotle
INSERT INTO food_items (restaurant_id, name, description, image_url, base_price_cents, fan_price_cents, sort_order) VALUES
  ((SELECT id FROM restaurants WHERE slug = 'chipotle'), 'Burrito Bowl', 'Your choice of protein, rice, beans, and toppings', '/food/burritobowl.png', 1100, 1320, 1),
  ((SELECT id FROM restaurants WHERE slug = 'chipotle'), 'Burrito', 'Everything wrapped in a warm flour tortilla', '/food/burrito.png', 1100, 1320, 2),
  ((SELECT id FROM restaurants WHERE slug = 'chipotle'), 'Chips & Guac', 'Freshly fried chips with hand-mashed guacamole', '/food/chipsguac.png', 600, 720, 3);

-- Starbucks
INSERT INTO food_items (restaurant_id, name, description, image_url, base_price_cents, fan_price_cents, sort_order) VALUES
  ((SELECT id FROM restaurants WHERE slug = 'starbucks'), 'Iced Latte', 'Espresso with cold milk poured over ice', '/food/icedlatte.png', 600, 720, 1),
  ((SELECT id FROM restaurants WHERE slug = 'starbucks'), 'Frappuccino', 'Blended coffee drink topped with whipped cream', '/food/frappuccino.png', 700, 840, 2),
  ((SELECT id FROM restaurants WHERE slug = 'starbucks'), 'Cake Pop', 'Bite-sized treats on a stick', '/food/cakepop.png', 400, 480, 3);

-- Taco Bell
INSERT INTO food_items (restaurant_id, name, description, image_url, base_price_cents, fan_price_cents, sort_order) VALUES
  ((SELECT id FROM restaurants WHERE slug = 'tacobell'), 'Crunchwrap Supreme', 'Seasoned beef, nacho cheese, sour cream in a grilled wrap', '/food/crunchwrap.png', 600, 720, 1),
  ((SELECT id FROM restaurants WHERE slug = 'tacobell'), 'Cheesy Gordita Crunch', 'A hard shell taco wrapped in flatbread with cheese', '/food/gordita.png', 500, 600, 2),
  ((SELECT id FROM restaurants WHERE slug = 'tacobell'), 'Baja Blast', 'The iconic tropical lime freeze', '/food/bajablast.png', 300, 360, 3);
