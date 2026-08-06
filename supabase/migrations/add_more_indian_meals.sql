-- Add 60 more Indian meals (30 South Indian + 30 North Indian)
-- This expands the variety of Indian cuisine options for meal recommendations

-- Additional South Indian Meals (30 meals)

-- South Indian Breakfast (5 more)
INSERT INTO meals (id, name, description, cuisine_type, meal_slot, calories, protein_g, carbs_g, fat_g, ingredients) VALUES
('south_indian_breakfast_6', 'Rava Idli', 'Steamed semolina cakes with chutney', 'South Indian', 'breakfast', 260, 8, 48, 4, ARRAY['semolina', 'yogurt', 'cashews', 'mustard seeds', 'curry leaves', 'ginger']),
('south_indian_breakfast_7', 'Uttapam', 'Thick rice pancake with vegetable toppings', 'South Indian', 'breakfast', 300, 10, 54, 6, ARRAY['rice', 'urad dal', 'onions', 'tomatoes', 'green chilies', 'coriander']),
('south_indian_breakfast_8', 'Rava Dosa', 'Crispy semolina crepe with minimal fermentation', 'South Indian', 'breakfast', 280, 7, 52, 5, ARRAY['semolina', 'rice flour', 'onions', 'green chilies', 'cumin seeds']),
('south_indian_breakfast_9', 'Set Dosa', 'Soft and fluffy dosa served in sets', 'South Indian', 'breakfast', 290, 9, 50, 6, ARRAY['rice', 'urad dal', 'fenugreek seeds', 'salt', 'oil']),
('south_indian_breakfast_10', 'Pesarattu with Upma', 'Green gram dosa stuffed with upma', 'South Indian', 'breakfast', 340, 14, 58, 7, ARRAY['green gram', 'semolina', 'onions', 'ginger', 'green chilies', 'curry leaves']),

-- South Indian Lunch (10 more)
('south_indian_lunch_6', 'Puliyodarai', 'Tangy tamarind rice with peanuts', 'South Indian', 'lunch', 400, 9, 74, 9, ARRAY['rice', 'tamarind', 'peanuts', 'sesame seeds', 'fenugreek', 'curry leaves']),
('south_indian_lunch_7', 'Tomato Rice', 'Spicy tomato flavored rice', 'South Indian', 'lunch', 380, 8, 70, 8, ARRAY['rice', 'tomatoes', 'onions', 'peanuts', 'curry leaves', 'spices']),
('south_indian_lunch_8', 'Coconut Rice', 'Fragrant rice with fresh coconut', 'South Indian', 'lunch', 420, 7, 76, 12, ARRAY['rice', 'coconut', 'cashews', 'curry leaves', 'mustard seeds', 'urad dal']),
('south_indian_lunch_9', 'Vangi Bath', 'Spicy eggplant rice', 'South Indian', 'lunch', 440, 10, 78, 10, ARRAY['rice', 'eggplant', 'peanuts', 'tamarind', 'vangi bath powder', 'curry leaves']),
('south_indian_lunch_10', 'Vegetable Biryani', 'Aromatic rice with mixed vegetables', 'South Indian', 'lunch', 480, 12, 82, 12, ARRAY['rice', 'mixed vegetables', 'yogurt', 'mint', 'biryani masala', 'fried onions']),
('south_indian_lunch_11', 'Mor Kuzhambu with Rice', 'Yogurt-based curry with vegetables', 'South Indian', 'lunch', 360, 11, 68, 7, ARRAY['rice', 'yogurt', 'vegetables', 'coconut', 'curry leaves', 'spices']),
('south_indian_lunch_12', 'Thayir Sadam', 'Traditional curd rice with tempering', 'South Indian', 'lunch', 320, 10, 60, 5, ARRAY['rice', 'yogurt', 'milk', 'ginger', 'curry leaves', 'pomegranate']),
('south_indian_lunch_13', 'Puli Sadam', 'Tamarind rice with roasted spices', 'South Indian', 'lunch', 390, 8, 72, 9, ARRAY['rice', 'tamarind', 'peanuts', 'chana dal', 'sesame seeds', 'curry leaves']),
('south_indian_lunch_14', 'Kara Bath', 'Spicy semolina with vegetables', 'South Indian', 'lunch', 350, 9, 64, 8, ARRAY['semolina', 'vegetables', 'cashews', 'ghee', 'curry leaves', 'spices']),
('south_indian_lunch_15', 'Ven Pongal', 'Savory rice and lentil porridge', 'South Indian', 'lunch', 380, 12, 68, 8, ARRAY['rice', 'moong dal', 'black pepper', 'cumin', 'ghee', 'cashews']),

-- South Indian Dinner (10 more)
('south_indian_dinner_6', 'Malabar Parotta with Kurma', 'Layered flatbread with vegetable stew', 'South Indian', 'dinner', 520, 14, 72, 18, ARRAY['flour', 'mixed vegetables', 'coconut milk', 'cashews', 'spices']),
('south_indian_dinner_7', 'Dosa with Potato Masala', 'Crispy crepe with spiced potato filling', 'South Indian', 'dinner', 380, 10, 66, 8, ARRAY['rice', 'urad dal', 'potatoes', 'onions', 'mustard seeds', 'curry leaves']),
('south_indian_dinner_8', 'Idiyappam with Stew', 'String hoppers with coconut milk curry', 'South Indian', 'dinner', 400, 10, 70, 10, ARRAY['rice flour', 'coconut milk', 'vegetables', 'potatoes', 'carrots']),
('south_indian_dinner_9', 'Adai with Aviyal', 'Protein-rich lentil pancake with mixed vegetable curry', 'South Indian', 'dinner', 460, 18, 68, 12, ARRAY['mixed dals', 'rice', 'mixed vegetables', 'coconut', 'yogurt']),
('south_indian_dinner_10', 'Kal Dosa with Chutney', 'Soft fermented crepe with coconut chutney', 'South Indian', 'dinner', 320, 9, 58, 6, ARRAY['rice', 'urad dal', 'coconut', 'green chilies', 'ginger']),
('south_indian_dinner_11', 'Puttu with Kadala Curry', 'Steamed rice cylinders with black chickpea curry', 'South Indian', 'dinner', 440, 16, 74, 8, ARRAY['rice flour', 'coconut', 'black chickpeas', 'onions', 'spices']),
('south_indian_dinner_12', 'Neer Dosa with Chicken Curry', 'Lacy rice crepe with chicken curry', 'South Indian', 'dinner', 520, 32, 58, 18, ARRAY['rice', 'chicken', 'coconut', 'onions', 'tomatoes', 'spices']),
('south_indian_dinner_13', 'Ragi Dosa with Sambar', 'Finger millet crepe with lentil stew', 'South Indian', 'dinner', 340, 12, 60, 6, ARRAY['ragi flour', 'rice', 'lentils', 'vegetables', 'tamarind']),
('south_indian_dinner_14', 'Paniyaram with Chutney', 'Savory rice dumplings with coconut chutney', 'South Indian', 'dinner', 300, 8, 54, 7, ARRAY['rice', 'urad dal', 'onions', 'coconut', 'green chilies']),
('south_indian_dinner_15', 'Oothappam', 'Thick savory pancake with toppings', 'South Indian', 'dinner', 340, 10, 60, 8, ARRAY['rice', 'urad dal', 'onions', 'tomatoes', 'green chilies', 'coriander']),

-- South Indian Snacks (5 more)
('south_indian_snack_6', 'Ribbon Pakoda', 'Crispy ribbon-shaped savory snack', 'South Indian', 'snack', 240, 5, 34, 10, ARRAY['rice flour', 'gram flour', 'butter', 'cumin', 'sesame seeds']),
('south_indian_snack_7', 'Thattai', 'Crispy fried rice crackers', 'South Indian', 'snack', 220, 4, 32, 9, ARRAY['rice flour', 'urad dal flour', 'peanuts', 'curry leaves', 'spices']),
('south_indian_snack_8', 'Masala Vadai', 'Spicy lentil fritters', 'South Indian', 'snack', 200, 8, 26, 7, ARRAY['chana dal', 'onions', 'green chilies', 'ginger', 'curry leaves']),
('south_indian_snack_9', 'Seedai', 'Crunchy rice flour balls', 'South Indian', 'snack', 180, 3, 28, 7, ARRAY['rice flour', 'urad dal flour', 'butter', 'sesame seeds', 'cumin']),
('south_indian_snack_10', 'Kara Sev', 'Spicy chickpea flour noodles', 'South Indian', 'snack', 210, 5, 30, 8, ARRAY['gram flour', 'rice flour', 'chili powder', 'asafoetida', 'oil']);

-- Additional North Indian Meals (30 meals)

-- North Indian Breakfast (5 more)
INSERT INTO meals (id, name, description, cuisine_type, meal_slot, calories, protein_g, carbs_g, fat_g, ingredients) VALUES
('north_indian_breakfast_6', 'Masala Omelette with Paratha', 'Spiced omelette with flatbread', 'North Indian', 'breakfast', 420, 18, 48, 16, ARRAY['eggs', 'whole wheat flour', 'onions', 'tomatoes', 'green chilies', 'butter']),
('north_indian_breakfast_7', 'Moong Dal Chilla', 'Savory lentil pancakes', 'North Indian', 'breakfast', 280, 14, 44, 6, ARRAY['moong dal', 'onions', 'tomatoes', 'green chilies', 'ginger', 'coriander']),
('north_indian_breakfast_8', 'Besan Chilla', 'Gram flour savory pancakes', 'North Indian', 'breakfast', 260, 12, 38, 7, ARRAY['gram flour', 'onions', 'tomatoes', 'green chilies', 'spices']),
('north_indian_breakfast_9', 'Stuffed Paneer Paratha', 'Cottage cheese stuffed flatbread', 'North Indian', 'breakfast', 440, 18, 56, 16, ARRAY['whole wheat flour', 'paneer', 'onions', 'green chilies', 'butter', 'spices']),
('north_indian_breakfast_10', 'Methi Thepla', 'Fenugreek flatbread', 'North Indian', 'breakfast', 300, 9, 52, 7, ARRAY['whole wheat flour', 'fenugreek leaves', 'yogurt', 'spices', 'oil']),

-- North Indian Lunch (10 more)
('north_indian_lunch_6', 'Dal Fry with Rice', 'Tempered yellow lentils with rice', 'North Indian', 'lunch', 420, 15, 74, 7, ARRAY['rice', 'toor dal', 'tomatoes', 'onions', 'ghee', 'spices']),
('north_indian_lunch_7', 'Aloo Matar with Roti', 'Potato and peas curry with flatbread', 'North Indian', 'lunch', 400, 11, 72, 8, ARRAY['potatoes', 'green peas', 'whole wheat flour', 'tomatoes', 'spices']),
('north_indian_lunch_8', 'Bhindi Masala with Rice', 'Spiced okra with rice', 'North Indian', 'lunch', 380, 10, 70, 8, ARRAY['rice', 'okra', 'onions', 'tomatoes', 'spices']),
('north_indian_lunch_9', 'Mixed Dal with Roti', 'Three lentil mix with flatbread', 'North Indian', 'lunch', 440, 18, 72, 9, ARRAY['mixed lentils', 'whole wheat flour', 'tomatoes', 'onions', 'ghee']),
('north_indian_lunch_10', 'Baingan Bharta with Roti', 'Roasted eggplant mash with flatbread', 'North Indian', 'lunch', 380, 10, 66, 10, ARRAY['eggplant', 'whole wheat flour', 'onions', 'tomatoes', 'spices']),
('north_indian_lunch_11', 'Aloo Palak with Rice', 'Potato and spinach curry with rice', 'North Indian', 'lunch', 420, 12, 76, 8, ARRAY['rice', 'potatoes', 'spinach', 'onions', 'tomatoes', 'spices']),
('north_indian_lunch_12', 'Methi Malai Matar with Roti', 'Fenugreek and peas in cream with flatbread', 'North Indian', 'lunch', 460, 14, 62, 16, ARRAY['fenugreek leaves', 'green peas', 'cream', 'whole wheat flour', 'spices']),
('north_indian_lunch_13', 'Soya Chaap with Rice', 'Soya chunks in spicy gravy with rice', 'North Indian', 'lunch', 480, 22, 72, 10, ARRAY['rice', 'soya chunks', 'tomatoes', 'onions', 'cream', 'spices']),
('north_indian_lunch_14', 'Mushroom Matar with Roti', 'Mushroom and peas curry with flatbread', 'North Indian', 'lunch', 380, 14, 64, 10, ARRAY['mushrooms', 'green peas', 'whole wheat flour', 'tomatoes', 'spices']),
('north_indian_lunch_15', 'Lauki Kofta Curry with Rice', 'Bottle gourd dumplings in curry with rice', 'North Indian', 'lunch', 460, 13, 74, 12, ARRAY['rice', 'bottle gourd', 'gram flour', 'tomatoes', 'cream', 'spices']),

-- North Indian Dinner (10 more)
('north_indian_dinner_6', 'Paneer Butter Masala with Naan', 'Cottage cheese in buttery tomato gravy', 'North Indian', 'dinner', 580, 24, 62, 24, ARRAY['paneer', 'tomatoes', 'butter', 'cream', 'flour', 'spices']),
('north_indian_dinner_7', 'Chicken Curry with Rice', 'Home-style chicken curry with rice', 'North Indian', 'dinner', 560, 36, 64, 18, ARRAY['rice', 'chicken', 'onions', 'tomatoes', 'yogurt', 'spices']),
('north_indian_dinner_8', 'Mutton Rogan Josh with Rice', 'Aromatic lamb curry with rice', 'North Indian', 'dinner', 640, 38, 58, 28, ARRAY['rice', 'mutton', 'yogurt', 'onions', 'tomatoes', 'spices']),
('north_indian_dinner_9', 'Palak Chicken with Roti', 'Chicken cooked with spinach and flatbread', 'North Indian', 'dinner', 520, 38, 52, 20, ARRAY['chicken', 'spinach', 'whole wheat flour', 'cream', 'spices']),
('north_indian_dinner_10', 'Egg Curry with Rice', 'Boiled eggs in spicy gravy with rice', 'North Indian', 'dinner', 480, 22, 68, 14, ARRAY['rice', 'eggs', 'onions', 'tomatoes', 'coconut milk', 'spices']),
('north_indian_dinner_11', 'Malai Kofta with Naan', 'Vegetable dumplings in creamy gravy', 'North Indian', 'dinner', 560, 16, 66, 24, ARRAY['potatoes', 'paneer', 'flour', 'tomatoes', 'cream', 'cashews']),
('north_indian_dinner_12', 'Chicken Biryani', 'Aromatic rice with spiced chicken', 'North Indian', 'dinner', 620, 36, 72, 20, ARRAY['rice', 'chicken', 'yogurt', 'mint', 'biryani masala', 'fried onions']),
('north_indian_dinner_13', 'Keema Matar with Roti', 'Minced meat with peas and flatbread', 'North Indian', 'dinner', 560, 34, 58, 22, ARRAY['minced meat', 'green peas', 'whole wheat flour', 'tomatoes', 'spices']),
('north_indian_dinner_14', 'Fish Curry with Rice', 'Bengali-style fish curry with rice', 'North Indian', 'dinner', 520, 32, 64, 16, ARRAY['rice', 'fish', 'mustard oil', 'onions', 'tomatoes', 'spices']),
('north_indian_dinner_15', 'Shahi Paneer with Naan', 'Royal cottage cheese in rich gravy', 'North Indian', 'dinner', 600, 26, 64, 26, ARRAY['paneer', 'flour', 'tomatoes', 'cream', 'cashew paste', 'spices']),

-- North Indian Snacks (5 more)
('north_indian_snack_6', 'Aloo Tikki', 'Crispy potato cutlets', 'North Indian', 'snack', 240, 6, 38, 8, ARRAY['potatoes', 'gram flour', 'bread crumbs', 'spices', 'oil']),
('north_indian_snack_7', 'Bread Pakora', 'Deep-fried bread with potato filling', 'North Indian', 'snack', 280, 8, 42, 10, ARRAY['bread', 'potatoes', 'gram flour', 'spices', 'oil']),
('north_indian_snack_8', 'Corn Chaat', 'Spiced corn kernel snack', 'North Indian', 'snack', 200, 6, 36, 4, ARRAY['corn', 'onions', 'tomatoes', 'lemon', 'chaat masala', 'coriander']),
('north_indian_snack_9', 'Pani Puri', 'Crispy shells with spicy water', 'North Indian', 'snack', 180, 4, 32, 4, ARRAY['semolina shells', 'chickpeas', 'potatoes', 'tamarind water', 'mint water']),
('north_indian_snack_10', 'Bhel Puri', 'Puffed rice mixture with chutneys', 'North Indian', 'snack', 220, 5, 40, 5, ARRAY['puffed rice', 'sev', 'onions', 'tomatoes', 'tamarind chutney', 'mint chutney']);
