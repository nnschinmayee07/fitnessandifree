-- Add South Indian and North Indian meals to the meals table
-- This provides diverse Indian cuisine options for meal recommendations

-- South Indian Meals (Breakfast)
INSERT INTO meals (id, name, description, cuisine_type, meal_slot, calories, protein_g, carbs_g, fat_g, ingredients) VALUES
('south_indian_breakfast_1', 'Idli with Sambar', 'Steamed rice cakes with lentil stew', 'South Indian', 'breakfast', 280, 12, 52, 4, ARRAY['rice', 'urad dal', 'lentils', 'vegetables', 'tamarind', 'spices']),
('south_indian_breakfast_2', 'Masala Dosa', 'Crispy rice crepe with spiced potato filling', 'South Indian', 'breakfast', 320, 8, 58, 8, ARRAY['rice', 'urad dal', 'potatoes', 'onions', 'mustard seeds', 'curry leaves']),
('south_indian_breakfast_3', 'Upma', 'Savory semolina porridge with vegetables', 'South Indian', 'breakfast', 240, 6, 44, 6, ARRAY['semolina', 'vegetables', 'mustard seeds', 'curry leaves', 'cashews']),
('south_indian_breakfast_4', 'Pongal', 'Rice and lentil porridge with spices', 'South Indian', 'breakfast', 300, 10, 54, 6, ARRAY['rice', 'moong dal', 'black pepper', 'cumin', 'ghee', 'cashews']),
('south_indian_breakfast_5', 'Medu Vada', 'Crispy lentil donuts with chutney', 'South Indian', 'breakfast', 260, 10, 38, 8, ARRAY['urad dal', 'onions', 'curry leaves', 'coconut chutney']),

-- South Indian Meals (Lunch)
('south_indian_lunch_1', 'Sambar Rice', 'Rice with tangy lentil and vegetable stew', 'South Indian', 'lunch', 420, 14, 76, 8, ARRAY['rice', 'toor dal', 'vegetables', 'tamarind', 'sambar powder']),
('south_indian_lunch_2', 'Curd Rice', 'Cooling rice with yogurt and tempering', 'South Indian', 'lunch', 340, 12, 62, 6, ARRAY['rice', 'yogurt', 'mustard seeds', 'curry leaves', 'cucumber']),
('south_indian_lunch_3', 'Bisi Bele Bath', 'Spicy rice and lentil mixture', 'South Indian', 'lunch', 450, 16, 78, 10, ARRAY['rice', 'toor dal', 'vegetables', 'tamarind', 'bisi bele bath powder']),
('south_indian_lunch_4', 'Lemon Rice', 'Tangy rice with peanuts and spices', 'South Indian', 'lunch', 380, 8, 72, 8, ARRAY['rice', 'lemon', 'peanuts', 'mustard seeds', 'curry leaves', 'turmeric']),
('south_indian_lunch_5', 'Rasam Rice', 'Rice with spicy tangy soup', 'South Indian', 'lunch', 360, 10, 70, 4, ARRAY['rice', 'toor dal', 'tamarind', 'tomatoes', 'rasam powder', 'curry leaves']),

-- South Indian Meals (Dinner)
('south_indian_dinner_1', 'Vegetable Korma with Roti', 'Mixed vegetables in coconut gravy with flatbread', 'South Indian', 'dinner', 480, 14, 68, 16, ARRAY['mixed vegetables', 'coconut', 'cashews', 'whole wheat flour', 'spices']),
('south_indian_dinner_2', 'Appam with Stew', 'Rice pancakes with vegetable coconut stew', 'South Indian', 'dinner', 420, 12, 64, 12, ARRAY['rice', 'coconut milk', 'vegetables', 'potatoes', 'carrots']),
('south_indian_dinner_3', 'Pesarattu', 'Green gram dosa with ginger chutney', 'South Indian', 'dinner', 340, 16, 56, 6, ARRAY['green gram', 'ginger', 'green chilies', 'rice', 'onions']),
('south_indian_dinner_4', 'Avial with Rice', 'Mixed vegetables in coconut and yogurt gravy', 'South Indian', 'dinner', 440, 12, 74, 10, ARRAY['rice', 'mixed vegetables', 'coconut', 'yogurt', 'curry leaves']),
('south_indian_dinner_5', 'Kootu with Rice', 'Lentils and vegetables in coconut gravy', 'South Indian', 'dinner', 460, 18, 76, 8, ARRAY['rice', 'toor dal', 'vegetables', 'coconut', 'spices']),

-- South Indian Snacks
('south_indian_snack_1', 'Sundal', 'Spiced chickpea snack', 'South Indian', 'snack', 180, 8, 28, 4, ARRAY['chickpeas', 'coconut', 'mustard seeds', 'curry leaves', 'lemon']),
('south_indian_snack_2', 'Murukku', 'Crispy rice flour spirals', 'South Indian', 'snack', 220, 4, 32, 8, ARRAY['rice flour', 'urad dal flour', 'butter', 'cumin', 'sesame seeds']),
('south_indian_snack_3', 'Banana Chips', 'Crispy fried banana slices', 'South Indian', 'snack', 200, 2, 28, 10, ARRAY['raw bananas', 'turmeric', 'salt', 'coconut oil']),
('south_indian_snack_4', 'Masala Pori', 'Spiced puffed rice snack', 'South Indian', 'snack', 160, 4, 32, 2, ARRAY['puffed rice', 'peanuts', 'curry leaves', 'onions', 'spices']),
('south_indian_snack_5', 'Bonda', 'Deep fried potato dumplings', 'South Indian', 'snack', 240, 6, 36, 8, ARRAY['potatoes', 'gram flour', 'onions', 'green chilies', 'curry leaves']),

-- North Indian Meals (Breakfast)
('north_indian_breakfast_1', 'Aloo Paratha', 'Stuffed potato flatbread with yogurt', 'North Indian', 'breakfast', 380, 10, 58, 12, ARRAY['whole wheat flour', 'potatoes', 'yogurt', 'butter', 'spices']),
('north_indian_breakfast_2', 'Poha', 'Flattened rice with vegetables and peanuts', 'North Indian', 'breakfast', 280, 6, 52, 6, ARRAY['flattened rice', 'onions', 'potatoes', 'peanuts', 'curry leaves']),
('north_indian_breakfast_3', 'Chole Bhature', 'Spiced chickpeas with fried bread', 'North Indian', 'breakfast', 520, 18, 72, 16, ARRAY['chickpeas', 'flour', 'tomatoes', 'onions', 'spices']),
('north_indian_breakfast_4', 'Puri Bhaji', 'Fried bread with spiced potato curry', 'North Indian', 'breakfast', 460, 12, 68, 14, ARRAY['whole wheat flour', 'potatoes', 'tomatoes', 'onions', 'spices']),
('north_indian_breakfast_5', 'Paneer Paratha', 'Cottage cheese stuffed flatbread', 'North Indian', 'breakfast', 420, 16, 54, 14, ARRAY['whole wheat flour', 'paneer', 'onions', 'green chilies', 'butter']),

-- North Indian Meals (Lunch)
('north_indian_lunch_1', 'Dal Tadka with Rice', 'Yellow lentils with spiced tempering', 'North Indian', 'lunch', 440, 16, 76, 8, ARRAY['rice', 'toor dal', 'tomatoes', 'onions', 'ghee', 'spices']),
('north_indian_lunch_2', 'Rajma Chawal', 'Kidney beans curry with rice', 'North Indian', 'lunch', 480, 18, 82, 8, ARRAY['rice', 'kidney beans', 'tomatoes', 'onions', 'ginger', 'garlic']),
('north_indian_lunch_3', 'Kadhi Chawal', 'Yogurt curry with rice', 'North Indian', 'lunch', 420, 14, 72, 10, ARRAY['rice', 'yogurt', 'gram flour', 'vegetables', 'curry leaves', 'spices']),
('north_indian_lunch_4', 'Palak Paneer with Roti', 'Spinach and cottage cheese curry with flatbread', 'North Indian', 'lunch', 460, 20, 52, 18, ARRAY['spinach', 'paneer', 'whole wheat flour', 'cream', 'spices']),
('north_indian_lunch_5', 'Chana Masala with Rice', 'Spiced chickpea curry with rice', 'North Indian', 'lunch', 450, 16, 78, 8, ARRAY['rice', 'chickpeas', 'tomatoes', 'onions', 'garam masala']),

-- North Indian Meals (Dinner)
('north_indian_dinner_1', 'Dal Makhani with Naan', 'Creamy black lentils with flatbread', 'North Indian', 'dinner', 540, 20, 68, 18, ARRAY['black lentils', 'kidney beans', 'butter', 'cream', 'flour', 'spices']),
('north_indian_dinner_2', 'Butter Chicken with Rice', 'Chicken in creamy tomato gravy with rice', 'North Indian', 'dinner', 620, 38, 62, 24, ARRAY['rice', 'chicken', 'tomatoes', 'cream', 'butter', 'spices']),
('north_indian_dinner_3', 'Paneer Tikka Masala with Naan', 'Grilled cottage cheese in spiced gravy', 'North Indian', 'dinner', 580, 24, 64, 22, ARRAY['paneer', 'yogurt', 'tomatoes', 'cream', 'flour', 'spices']),
('north_indian_dinner_4', 'Aloo Gobi with Roti', 'Potato and cauliflower curry with flatbread', 'North Indian', 'dinner', 420, 12, 68, 10, ARRAY['potatoes', 'cauliflower', 'whole wheat flour', 'tomatoes', 'spices']),
('north_indian_dinner_5', 'Kadai Paneer with Paratha', 'Cottage cheese in bell pepper gravy', 'North Indian', 'dinner', 520, 22, 58, 20, ARRAY['paneer', 'bell peppers', 'whole wheat flour', 'tomatoes', 'butter']),

-- North Indian Snacks
('north_indian_snack_1', 'Samosa', 'Crispy pastry with spiced potato filling', 'North Indian', 'snack', 260, 6, 36, 10, ARRAY['flour', 'potatoes', 'peas', 'spices', 'oil']),
('north_indian_snack_2', 'Pakora', 'Mixed vegetable fritters', 'North Indian', 'snack', 220, 6, 28, 10, ARRAY['gram flour', 'mixed vegetables', 'onions', 'spices', 'oil']),
('north_indian_snack_3', 'Chaat', 'Tangy chickpea snack with chutneys', 'North Indian', 'snack', 240, 8, 38, 6, ARRAY['chickpeas', 'potatoes', 'yogurt', 'tamarind chutney', 'sev']),
('north_indian_snack_4', 'Paneer Tikka', 'Grilled cottage cheese cubes', 'North Indian', 'snack', 280, 18, 12, 18, ARRAY['paneer', 'yogurt', 'bell peppers', 'onions', 'spices']),
('north_indian_snack_5', 'Dahi Bhalla', 'Lentil dumplings in yogurt', 'North Indian', 'snack', 200, 8, 28, 6, ARRAY['urad dal', 'yogurt', 'tamarind chutney', 'cumin', 'chili powder']);

-- Update the check constraint to include Indian cuisines
ALTER TABLE meals DROP CONSTRAINT IF EXISTS check_meal_cuisine_type;
ALTER TABLE meals ADD CONSTRAINT check_meal_cuisine_type 
CHECK (cuisine_type IN ('American', 'Italian', 'Mexican', 'Asian', 'Mediterranean', 'South Indian', 'North Indian'));
