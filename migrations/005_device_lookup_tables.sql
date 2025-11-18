-- Create device lookup tables
CREATE TABLE device_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(brand_id, name)
);

CREATE INDEX idx_models_brand ON models(brand_id);

-- Insert device types
INSERT INTO device_types (name, display_order) VALUES
  ('Phone', 1),
  ('Tablet', 2),
  ('Laptop', 3),
  ('Desktop', 4),
  ('Chromebook', 5),
  ('Gaming Console', 6),
  ('Smartwatch', 7),
  ('TV', 8),
  ('Monitor', 9),
  ('Smart Home Device', 10),
  ('Audio Device', 11),
  ('Accessory', 12),
  ('Other', 99);

-- Insert brands
INSERT INTO brands (name, display_order) VALUES
  ('Apple', 1),
  ('Samsung', 2),
  ('Google', 3),
  ('Microsoft', 4),
  ('Dell', 5),
  ('HP', 6),
  ('Lenovo', 7),
  ('Asus', 8),
  ('Acer', 9),
  ('Sony', 10),
  ('Nintendo', 11),
  ('LG', 12),
  ('Motorola', 13),
  ('OnePlus', 14),
  ('TCL', 15),
  ('Garmin', 16),
  ('MSI', 17),
  ('Alienware', 18),
  ('Razer', 19),
  ('Xiaomi', 20),
  ('Huawei', 21),
  ('Oppo', 22),
  ('Vivo', 23),
  ('Realme', 24),
  ('Nothing', 25),
  ('Fairphone', 26),
  ('Toshiba', 27),
  ('Panasonic', 28),
  ('Sharp', 29),
  ('Hisense', 30),
  ('Vizio', 31),
  ('Roku', 32),
  ('Amazon', 33),
  ('Bose', 34),
  ('JBL', 35),
  ('Sennheiser', 36),
  ('Beats', 37),
  ('AirPods', 38),
  ('Logitech', 39),
  ('Corsair', 40),
  ('HyperX', 41),
  ('SteelSeries', 42),
  ('Other', 99);

-- Get brand IDs for model insertion
DO $$
DECLARE
  apple_id UUID;
  samsung_id UUID;
  google_id UUID;
  microsoft_id UUID;
  dell_id UUID;
  hp_id UUID;
  lenovo_id UUID;
  asus_id UUID;
  acer_id UUID;
  sony_id UUID;
  nintendo_id UUID;
  lg_id UUID;
  motorola_id UUID;
  oneplus_id UUID;
  tcl_id UUID;
  garmin_id UUID;
  msi_id UUID;
  alienware_id UUID;
  razer_id UUID;
  xiaomi_id UUID;
  huawei_id UUID;
  oppo_id UUID;
  vivo_id UUID;
  realme_id UUID;
  nothing_id UUID;
  fairphone_id UUID;
  toshiba_id UUID;
  panasonic_id UUID;
  sharp_id UUID;
  hisense_id UUID;
  vizio_id UUID;
  roku_id UUID;
  amazon_id UUID;
  bose_id UUID;
  jbl_id UUID;
  sennheiser_id UUID;
  beats_id UUID;
  airpods_id UUID;
  logitech_id UUID;
  corsair_id UUID;
  hyperx_id UUID;
  steelseries_id UUID;
BEGIN
  SELECT id INTO apple_id FROM brands WHERE name = 'Apple';
  SELECT id INTO samsung_id FROM brands WHERE name = 'Samsung';
  SELECT id INTO google_id FROM brands WHERE name = 'Google';
  SELECT id INTO microsoft_id FROM brands WHERE name = 'Microsoft';
  SELECT id INTO dell_id FROM brands WHERE name = 'Dell';
  SELECT id INTO hp_id FROM brands WHERE name = 'HP';
  SELECT id INTO lenovo_id FROM brands WHERE name = 'Lenovo';
  SELECT id INTO asus_id FROM brands WHERE name = 'Asus';
  SELECT id INTO acer_id FROM brands WHERE name = 'Acer';
  SELECT id INTO sony_id FROM brands WHERE name = 'Sony';
  SELECT id INTO nintendo_id FROM brands WHERE name = 'Nintendo';
  SELECT id INTO lg_id FROM brands WHERE name = 'LG';
  SELECT id INTO motorola_id FROM brands WHERE name = 'Motorola';
  SELECT id INTO oneplus_id FROM brands WHERE name = 'OnePlus';
  SELECT id INTO tcl_id FROM brands WHERE name = 'TCL';
  SELECT id INTO garmin_id FROM brands WHERE name = 'Garmin';
  SELECT id INTO msi_id FROM brands WHERE name = 'MSI';
  SELECT id INTO alienware_id FROM brands WHERE name = 'Alienware';
  SELECT id INTO razer_id FROM brands WHERE name = 'Razer';
  SELECT id INTO xiaomi_id FROM brands WHERE name = 'Xiaomi';
  SELECT id INTO huawei_id FROM brands WHERE name = 'Huawei';
  SELECT id INTO oppo_id FROM brands WHERE name = 'Oppo';
  SELECT id INTO vivo_id FROM brands WHERE name = 'Vivo';
  SELECT id INTO realme_id FROM brands WHERE name = 'Realme';
  SELECT id INTO nothing_id FROM brands WHERE name = 'Nothing';
  SELECT id INTO fairphone_id FROM brands WHERE name = 'Fairphone';
  SELECT id INTO toshiba_id FROM brands WHERE name = 'Toshiba';
  SELECT id INTO panasonic_id FROM brands WHERE name = 'Panasonic';
  SELECT id INTO sharp_id FROM brands WHERE name = 'Sharp';
  SELECT id INTO hisense_id FROM brands WHERE name = 'Hisense';
  SELECT id INTO vizio_id FROM brands WHERE name = 'Vizio';
  SELECT id INTO roku_id FROM brands WHERE name = 'Roku';
  SELECT id INTO amazon_id FROM brands WHERE name = 'Amazon';
  SELECT id INTO bose_id FROM brands WHERE name = 'Bose';
  SELECT id INTO jbl_id FROM brands WHERE name = 'JBL';
  SELECT id INTO sennheiser_id FROM brands WHERE name = 'Sennheiser';
  SELECT id INTO beats_id FROM brands WHERE name = 'Beats';
  SELECT id INTO airpods_id FROM brands WHERE name = 'AirPods';
  SELECT id INTO logitech_id FROM brands WHERE name = 'Logitech';
  SELECT id INTO corsair_id FROM brands WHERE name = 'Corsair';
  SELECT id INTO hyperx_id FROM brands WHERE name = 'HyperX';
  SELECT id INTO steelseries_id FROM brands WHERE name = 'SteelSeries';

  -- Apple Models
  INSERT INTO models (brand_id, name, display_order) VALUES
    (apple_id, 'iPhone 15 Pro Max', 1),
    (apple_id, 'iPhone 15 Pro', 2),
    (apple_id, 'iPhone 15 Plus', 3),
    (apple_id, 'iPhone 15', 4),
    (apple_id, 'iPhone 14 Pro Max', 5),
    (apple_id, 'iPhone 14 Pro', 6),
    (apple_id, 'iPhone 14 Plus', 7),
    (apple_id, 'iPhone 14', 8),
    (apple_id, 'iPhone 13 Pro Max', 9),
    (apple_id, 'iPhone 13 Pro', 10),
    (apple_id, 'iPhone 13 mini', 11),
    (apple_id, 'iPhone 13', 12),
    (apple_id, 'iPhone 12 Pro Max', 13),
    (apple_id, 'iPhone 12 Pro', 14),
    (apple_id, 'iPhone 12 mini', 15),
    (apple_id, 'iPhone 12', 16),
    (apple_id, 'iPhone 11 Pro Max', 17),
    (apple_id, 'iPhone 11 Pro', 18),
    (apple_id, 'iPhone 11', 19),
    (apple_id, 'iPhone XS Max', 20),
    (apple_id, 'iPhone XS', 21),
    (apple_id, 'iPhone XR', 22),
    (apple_id, 'iPhone X', 23),
    (apple_id, 'iPhone 8 Plus', 24),
    (apple_id, 'iPhone 8', 25),
    (apple_id, 'iPhone SE (2022)', 26),
    (apple_id, 'iPhone SE (2020)', 27),
    (apple_id, 'iPad Pro 12.9" (2024)', 28),
    (apple_id, 'iPad Pro 11" (2024)', 29),
    (apple_id, 'iPad Pro 12.9" (2022)', 30),
    (apple_id, 'iPad Pro 11" (2022)', 31),
    (apple_id, 'iPad Air (2024)', 32),
    (apple_id, 'iPad Air (2022)', 33),
    (apple_id, 'iPad (2022)', 34),
    (apple_id, 'iPad (2021)', 35),
    (apple_id, 'iPad mini (2021)', 36),
    (apple_id, 'MacBook Pro 16"', 37),
    (apple_id, 'MacBook Pro 14"', 38),
    (apple_id, 'MacBook Pro 13"', 39),
    (apple_id, 'MacBook Air 15"', 40),
    (apple_id, 'MacBook Air 13"', 41),
    (apple_id, 'iMac 24"', 42),
    (apple_id, 'iMac 27"', 43),
    (apple_id, 'Mac Studio', 44),
    (apple_id, 'Mac mini', 45),
    (apple_id, 'Mac Pro', 46),
    (apple_id, 'Apple Watch Ultra 2', 47),
    (apple_id, 'Apple Watch Series 9', 48),
    (apple_id, 'Apple Watch Series 8', 49),
    (apple_id, 'Apple Watch SE', 50),
    (apple_id, 'AirPods Pro (2nd gen)', 51),
    (apple_id, 'AirPods Pro', 52),
    (apple_id, 'AirPods (3rd gen)', 53),
    (apple_id, 'AirPods (2nd gen)', 54),
    (apple_id, 'AirPods Max', 55);

  -- Samsung Models
  INSERT INTO models (brand_id, name, display_order) VALUES
    (samsung_id, 'Galaxy S24 Ultra', 1),
    (samsung_id, 'Galaxy S24+', 2),
    (samsung_id, 'Galaxy S24', 3),
    (samsung_id, 'Galaxy S23 Ultra', 4),
    (samsung_id, 'Galaxy S23+', 5),
    (samsung_id, 'Galaxy S23', 6),
    (samsung_id, 'Galaxy S22 Ultra', 7),
    (samsung_id, 'Galaxy S22+', 8),
    (samsung_id, 'Galaxy S22', 9),
    (samsung_id, 'Galaxy S21 Ultra', 10),
    (samsung_id, 'Galaxy S21+', 11),
    (samsung_id, 'Galaxy S21', 12),
    (samsung_id, 'Galaxy Note 20 Ultra', 13),
    (samsung_id, 'Galaxy Note 20', 14),
    (samsung_id, 'Galaxy Z Fold 5', 15),
    (samsung_id, 'Galaxy Z Fold 4', 16),
    (samsung_id, 'Galaxy Z Flip 5', 17),
    (samsung_id, 'Galaxy Z Flip 4', 18),
    (samsung_id, 'Galaxy A54', 19),
    (samsung_id, 'Galaxy A53', 20),
    (samsung_id, 'Galaxy A34', 21),
    (samsung_id, 'Galaxy Tab S9 Ultra', 22),
    (samsung_id, 'Galaxy Tab S9+', 23),
    (samsung_id, 'Galaxy Tab S9', 24),
    (samsung_id, 'Galaxy Tab S8 Ultra', 25),
    (samsung_id, 'Galaxy Tab S8+', 26),
    (samsung_id, 'Galaxy Tab S8', 27),
    (samsung_id, 'Galaxy Tab A9+', 28),
    (samsung_id, 'Galaxy Tab A9', 29),
    (samsung_id, 'Galaxy Book3 Ultra', 30),
    (samsung_id, 'Galaxy Book3 Pro 360', 31),
    (samsung_id, 'Galaxy Book3 Pro', 32),
    (samsung_id, 'Galaxy Watch6 Classic', 33),
    (samsung_id, 'Galaxy Watch6', 34),
    (samsung_id, 'Galaxy Watch5 Pro', 35),
    (samsung_id, 'Galaxy Watch5', 36),
    (samsung_id, 'Galaxy Buds2 Pro', 37),
    (samsung_id, 'Galaxy Buds2', 38),
    (samsung_id, 'Galaxy Buds FE', 39);

  -- Google Models
  INSERT INTO models (brand_id, name, display_order) VALUES
    (google_id, 'Pixel 8 Pro', 1),
    (google_id, 'Pixel 8', 2),
    (google_id, 'Pixel 7a', 3),
    (google_id, 'Pixel 7 Pro', 4),
    (google_id, 'Pixel 7', 5),
    (google_id, 'Pixel 6a', 6),
    (google_id, 'Pixel 6 Pro', 7),
    (google_id, 'Pixel 6', 8),
    (google_id, 'Pixel 5a', 9),
    (google_id, 'Pixel 5', 10),
    (google_id, 'Pixel 4a', 11),
    (google_id, 'Pixel Fold', 12),
    (google_id, 'Pixel Tablet', 13),
    (google_id, 'Pixelbook Go', 14),
    (google_id, 'Pixelbook', 15),
    (google_id, 'Chromebook Pixel', 16),
    (google_id, 'Pixel Watch 2', 17),
    (google_id, 'Pixel Watch', 18),
    (google_id, 'Pixel Buds Pro', 19),
    (google_id, 'Pixel Buds A-Series', 20);

  -- Microsoft Models
  INSERT INTO models (brand_id, name, display_order) VALUES
    (microsoft_id, 'Surface Pro 9', 1),
    (microsoft_id, 'Surface Pro 8', 2),
    (microsoft_id, 'Surface Pro 7+', 3),
    (microsoft_id, 'Surface Laptop 5', 4),
    (microsoft_id, 'Surface Laptop 4', 5),
    (microsoft_id, 'Surface Laptop Studio 2', 6),
    (microsoft_id, 'Surface Laptop Studio', 7),
    (microsoft_id, 'Surface Book 3', 8),
    (microsoft_id, 'Surface Go 3', 9),
    (microsoft_id, 'Surface Duo 2', 10),
    (microsoft_id, 'Surface Duo', 11),
    (microsoft_id, 'Xbox Series X', 12),
    (microsoft_id, 'Xbox Series S', 13),
    (microsoft_id, 'Xbox One X', 14),
    (microsoft_id, 'Xbox One S', 15);

  -- Dell Models
  INSERT INTO models (brand_id, name, display_order) VALUES
    (dell_id, 'XPS 13 Plus', 1),
    (dell_id, 'XPS 13', 2),
    (dell_id, 'XPS 15', 3),
    (dell_id, 'XPS 17', 4),
    (dell_id, 'Latitude 9440', 5),
    (dell_id, 'Latitude 7440', 6),
    (dell_id, 'Latitude 5440', 7),
    (dell_id, 'Inspiron 16 Plus', 8),
    (dell_id, 'Inspiron 15', 9),
    (dell_id, 'Inspiron 14', 10),
    (dell_id, 'Alienware m18', 11),
    (dell_id, 'Alienware m16', 12),
    (dell_id, 'Alienware x16', 13),
    (dell_id, 'Alienware x14', 14),
    (dell_id, 'OptiPlex 7010', 15),
    (dell_id, 'OptiPlex 5000', 16),
    (dell_id, 'Precision 7780', 17),
    (dell_id, 'Precision 5680', 18);

  -- HP Models
  INSERT INTO models (brand_id, name, display_order) VALUES
    (hp_id, 'Spectre x360 14', 1),
    (hp_id, 'Spectre x360 16', 2),
    (hp_id, 'Envy x360 15', 3),
    (hp_id, 'Envy 16', 4),
    (hp_id, 'Pavilion Plus 14', 5),
    (hp_id, 'Pavilion 15', 6),
    (hp_id, 'EliteBook 840 G10', 7),
    (hp_id, 'EliteBook 1040 G10', 8),
    (hp_id, 'ProBook 440 G10', 9),
    (hp_id, 'ZBook Studio G10', 10),
    (hp_id, 'ZBook Firefly G10', 11),
    (hp_id, 'OMEN 17', 12),
    (hp_id, 'OMEN 16', 13),
    (hp_id, 'Victus 16', 14),
    (hp_id, 'EliteDesk 800 G9', 15),
    (hp_id, 'ProDesk 600 G9', 16);

  -- Lenovo Models
  INSERT INTO models (brand_id, name, display_order) VALUES
    (lenovo_id, 'ThinkPad X1 Carbon Gen 11', 1),
    (lenovo_id, 'ThinkPad X1 Yoga Gen 8', 2),
    (lenovo_id, 'ThinkPad X1 Extreme Gen 5', 3),
    (lenovo_id, 'ThinkPad T14 Gen 4', 4),
    (lenovo_id, 'ThinkPad P16 Gen 2', 5),
    (lenovo_id, 'Yoga 9i Gen 8', 6),
    (lenovo_id, 'Yoga 7i Gen 8', 7),
    (lenovo_id, 'IdeaPad Slim 5i', 8),
    (lenovo_id, 'IdeaPad Gaming 3', 9),
    (lenovo_id, 'Legion Pro 7i', 10),
    (lenovo_id, 'Legion Slim 7i', 11),
    (lenovo_id, 'Legion 5 Pro', 12),
    (lenovo_id, 'ThinkCentre M90q', 13),
    (lenovo_id, 'Tab P12 Pro', 14),
    (lenovo_id, 'Tab P11', 15);

  -- Asus Models
  INSERT INTO models (brand_id, name, display_order) VALUES
    (asus_id, 'ROG Zephyrus G16', 1),
    (asus_id, 'ROG Strix G18', 2),
    (asus_id, 'ROG Flow Z13', 3),
    (asus_id, 'Zenbook Pro 16X', 4),
    (asus_id, 'Zenbook 14 OLED', 5),
    (asus_id, 'VivoBook S15', 6),
    (asus_id, 'VivoBook Pro 15', 7),
    (asus_id, 'TUF Gaming A16', 8),
    (asus_id, 'TUF Gaming F15', 9),
    (asus_id, 'ROG Phone 7', 10),
    (asus_id, 'ZenFone 10', 11),
    (asus_id, 'ROG Ally', 12);

  -- Acer Models
  INSERT INTO models (brand_id, name, display_order) VALUES
    (acer_id, 'Predator Helios 18', 1),
    (acer_id, 'Predator Helios 16', 2),
    (acer_id, 'Predator Triton 17 X', 3),
    (acer_id, 'Nitro 17', 4),
    (acer_id, 'Nitro 5', 5),
    (acer_id, 'Swift X 14', 6),
    (acer_id, 'Swift Go 14', 7),
    (acer_id, 'Aspire 5', 8),
    (acer_id, 'Aspire 3', 9),
    (acer_id, 'Chromebook Spin 714', 10),
    (acer_id, 'Chromebook 516 GE', 11);

  -- Sony Models
  INSERT INTO models (brand_id, name, display_order) VALUES
    (sony_id, 'Xperia 1 V', 1),
    (sony_id, 'Xperia 5 V', 2),
    (sony_id, 'Xperia 10 V', 3),
    (sony_id, 'Xperia Pro-I', 4),
    (sony_id, 'PlayStation 5', 5),
    (sony_id, 'PlayStation 5 Digital Edition', 6),
    (sony_id, 'PlayStation 4 Pro', 7),
    (sony_id, 'PlayStation 4', 8),
    (sony_id, 'WH-1000XM5', 9),
    (sony_id, 'WH-1000XM4', 10),
    (sony_id, 'WF-1000XM5', 11),
    (sony_id, 'WF-1000XM4', 12),
    (sony_id, 'Bravia XR A95L', 13),
    (sony_id, 'Bravia XR A90J', 14);

  -- Nintendo Models
  INSERT INTO models (brand_id, name, display_order) VALUES
    (nintendo_id, 'Nintendo Switch OLED', 1),
    (nintendo_id, 'Nintendo Switch', 2),
    (nintendo_id, 'Nintendo Switch Lite', 3);

  -- LG Models
  INSERT INTO models (brand_id, name, display_order) VALUES
    (lg_id, 'Gram 17', 1),
    (lg_id, 'Gram 16', 2),
    (lg_id, 'Gram 15', 3),
    (lg_id, 'Gram 14', 4),
    (lg_id, 'UltraGear 27GP950', 5),
    (lg_id, 'C3 OLED TV', 6),
    (lg_id, 'G3 OLED TV', 7),
    (lg_id, 'Wing', 8),
    (lg_id, 'V60 ThinQ', 9);

  -- Motorola Models
  INSERT INTO models (brand_id, name, display_order) VALUES
    (motorola_id, 'Moto Edge 40 Pro', 1),
    (motorola_id, 'Moto Edge 40', 2),
    (motorola_id, 'Moto G84', 3),
    (motorola_id, 'Moto G73', 4),
    (motorola_id, 'Moto G54', 5),
    (motorola_id, 'Razr 40 Ultra', 6),
    (motorola_id, 'Razr 40', 7),
    (motorola_id, 'ThinkPhone', 8);

  -- OnePlus Models
  INSERT INTO models (brand_id, name, display_order) VALUES
    (oneplus_id, 'OnePlus 12', 1),
    (oneplus_id, 'OnePlus 11', 2),
    (oneplus_id, 'OnePlus 10 Pro', 3),
    (oneplus_id, 'OnePlus 10T', 4),
    (oneplus_id, 'OnePlus 9 Pro', 5),
    (oneplus_id, 'OnePlus 9', 6),
    (oneplus_id, 'OnePlus Nord 3', 7),
    (oneplus_id, 'OnePlus Nord CE 3', 8),
    (oneplus_id, 'OnePlus Pad', 9),
    (oneplus_id, 'OnePlus Buds Pro 2', 10);

  -- TCL Models
  INSERT INTO models (brand_id, name, display_order) VALUES
    (tcl_id, '20 Pro 5G', 1),
    (tcl_id, '20 SE', 2),
    (tcl_id, '30 XE 5G', 3),
    (tcl_id, '6-Series TV', 4),
    (tcl_id, '5-Series TV', 5);

  -- Garmin Models
  INSERT INTO models (brand_id, name, display_order) VALUES
    (garmin_id, 'Fenix 7 Pro', 1),
    (garmin_id, 'Fenix 7', 2),
    (garmin_id, 'Forerunner 965', 3),
    (garmin_id, 'Forerunner 265', 4),
    (garmin_id, 'Venu 3', 5),
    (garmin_id, 'Venu 2 Plus', 6),
    (garmin_id, 'Epix Pro', 7),
    (garmin_id, 'Tactix 7', 8);

  -- MSI Models
  INSERT INTO models (brand_id, name, display_order) VALUES
    (msi_id, 'Raider GE78 HX', 1),
    (msi_id, 'Titan GT77 HX', 2),
    (msi_id, 'Stealth 16 Studio', 3),
    (msi_id, 'Stealth 14 Studio', 4),
    (msi_id, 'Vector GP68 HX', 5),
    (msi_id, 'Katana 15', 6),
    (msi_id, 'Crosshair 16 HX', 7);

  -- Alienware Models (separate from Dell)
  INSERT INTO models (brand_id, name, display_order) VALUES
    (alienware_id, 'm18 R2', 1),
    (alienware_id, 'm16 R2', 2),
    (alienware_id, 'x16 R2', 3),
    (alienware_id, 'x14 R2', 4),
    (alienware_id, 'Aurora R16', 5),
    (alienware_id, 'Aurora R15', 6);

  -- Razer Models
  INSERT INTO models (brand_id, name, display_order) VALUES
    (razer_id, 'Blade 18', 1),
    (razer_id, 'Blade 16', 2),
    (razer_id, 'Blade 15', 3),
    (razer_id, 'Blade 14', 4),
    (razer_id, 'Blade Stealth 13', 5),
    (razer_id, 'DeathAdder V3 Pro', 6),
    (razer_id, 'BlackWidow V4 Pro', 7),
    (razer_id, 'Kraken V3 Pro', 8);

  -- Xiaomi Models
  INSERT INTO models (brand_id, name, display_order) VALUES
    (xiaomi_id, 'Xiaomi 14 Ultra', 1),
    (xiaomi_id, 'Xiaomi 14 Pro', 2),
    (xiaomi_id, 'Xiaomi 14', 3),
    (xiaomi_id, 'Xiaomi 13 Ultra', 4),
    (xiaomi_id, 'Xiaomi 13 Pro', 5),
    (xiaomi_id, 'Redmi Note 13 Pro', 6),
    (xiaomi_id, 'Redmi Note 12', 7),
    (xiaomi_id, 'POCO F5 Pro', 8),
    (xiaomi_id, 'POCO X5 Pro', 9),
    (xiaomi_id, 'Mi Pad 6', 10);

  -- Huawei Models
  INSERT INTO models (brand_id, name, display_order) VALUES
    (huawei_id, 'P60 Pro', 1),
    (huawei_id, 'P60', 2),
    (huawei_id, 'Mate 60 Pro', 3),
    (huawei_id, 'Mate 50 Pro', 4),
    (huawei_id, 'Nova 11', 5),
    (huawei_id, 'MatePad Pro 12.6', 6),
    (huawei_id, 'Watch GT 4', 7);

  -- Oppo Models
  INSERT INTO models (brand_id, name, display_order) VALUES
    (oppo_id, 'Find X6 Pro', 1),
    (oppo_id, 'Find X5 Pro', 2),
    (oppo_id, 'Reno 10 Pro', 3),
    (oppo_id, 'Reno 9', 4),
    (oppo_id, 'A78', 5);

  -- Vivo Models
  INSERT INTO models (brand_id, name, display_order) VALUES
    (vivo_id, 'X100 Pro', 1),
    (vivo_id, 'X90 Pro', 2),
    (vivo_id, 'V29 Pro', 3),
    (vivo_id, 'V27', 4),
    (vivo_id, 'Y100', 5);

  -- Realme Models
  INSERT INTO models (brand_id, name, display_order) VALUES
    (realme_id, 'GT 5 Pro', 1),
    (realme_id, 'GT 5', 2),
    (realme_id, '11 Pro+', 3),
    (realme_id, '11 Pro', 4),
    (realme_id, '10 Pro', 5);

  -- Nothing Models
  INSERT INTO models (brand_id, name, display_order) VALUES
    (nothing_id, 'Phone (2)', 1),
    (nothing_id, 'Phone (1)', 2),
    (nothing_id, 'Ear (2)', 3),
    (nothing_id, 'Ear (1)', 4);

  -- Fairphone Models
  INSERT INTO models (brand_id, name, display_order) VALUES
    (fairphone_id, 'Fairphone 5', 1),
    (fairphone_id, 'Fairphone 4', 2);

  -- Toshiba Models
  INSERT INTO models (brand_id, name, display_order) VALUES
    (toshiba_id, 'Dynabook Portégé X40', 1),
    (toshiba_id, 'Dynabook Tecra A50', 2),
    (toshiba_id, 'Satellite Pro C50', 3);

  -- Panasonic Models
  INSERT INTO models (brand_id, name, display_order) VALUES
    (panasonic_id, 'Toughbook 40', 1),
    (panasonic_id, 'Toughbook 33', 2),
    (panasonic_id, 'Toughbook G2', 3);

  -- Sharp Models
  INSERT INTO models (brand_id, name, display_order) VALUES
    (sharp_id, 'Aquos R8s pro', 1),
    (sharp_id, 'Aquos R7', 2),
    (sharp_id, 'Aquos sense7', 3);

  -- Hisense Models
  INSERT INTO models (brand_id, name, display_order) VALUES
    (hisense_id, 'U8K TV', 1),
    (hisense_id, 'U7K TV', 2),
    (hisense_id, 'A9H TV', 3);

  -- Vizio Models
  INSERT INTO models (brand_id, name, display_order) VALUES
    (vizio_id, 'M-Series Quantum X', 1),
    (vizio_id, 'P-Series Quantum X', 2),
    (vizio_id, 'V-Series', 3);

  -- Roku Models
  INSERT INTO models (brand_id, name, display_order) VALUES
    (roku_id, 'Roku TV Plus Series', 1),
    (roku_id, 'Roku Streaming Stick 4K+', 2),
    (roku_id, 'Roku Ultra', 3);

  -- Amazon Models
  INSERT INTO models (brand_id, name, display_order) VALUES
    (amazon_id, 'Fire TV Omni QLED', 1),
    (amazon_id, 'Fire TV 4-Series', 2),
    (amazon_id, 'Fire HD 10', 3),
    (amazon_id, 'Fire HD 8', 4),
    (amazon_id, 'Echo Show 15', 5),
    (amazon_id, 'Echo Show 10', 6),
    (amazon_id, 'Echo Dot', 7),
    (amazon_id, 'Kindle Paperwhite', 8),
    (amazon_id, 'Kindle Oasis', 9);

  -- Bose Models
  INSERT INTO models (brand_id, name, display_order) VALUES
    (bose_id, 'QuietComfort Ultra', 1),
    (bose_id, 'QuietComfort 45', 2),
    (bose_id, 'QuietComfort Earbuds II', 3),
    (bose_id, 'SoundLink Flex', 4),
    (bose_id, 'Soundbar 900', 5);

  -- JBL Models
  INSERT INTO models (brand_id, name, display_order) VALUES
    (jbl_id, 'Live Pro 2', 1),
    (jbl_id, 'Tour Pro 2', 2),
    (jbl_id, 'Flip 6', 3),
    (jbl_id, 'Charge 5', 4),
    (jbl_id, 'Xtreme 3', 5);

  -- Sennheiser Models
  INSERT INTO models (brand_id, name, display_order) VALUES
    (sennheiser_id, 'Momentum 4', 1),
    (sennheiser_id, 'Momentum True Wireless 3', 2),
    (sennheiser_id, 'HD 660S2', 3),
    (sennheiser_id, 'HD 800 S', 4);

  -- Beats Models
  INSERT INTO models (brand_id, name, display_order) VALUES
    (beats_id, 'Studio Pro', 1),
    (beats_id, 'Fit Pro', 2),
    (beats_id, 'Studio Buds+', 3),
    (beats_id, 'Powerbeats Pro', 4);

  -- AirPods Models (separate brand entry)
  INSERT INTO models (brand_id, name, display_order) VALUES
    (airpods_id, 'AirPods Pro (2nd gen)', 1),
    (airpods_id, 'AirPods Pro', 2),
    (airpods_id, 'AirPods (3rd gen)', 3),
    (airpods_id, 'AirPods (2nd gen)', 4),
    (airpods_id, 'AirPods Max', 5);

  -- Logitech Models
  INSERT INTO models (brand_id, name, display_order) VALUES
    (logitech_id, 'MX Master 3S', 1),
    (logitech_id, 'MX Keys Mini', 2),
    (logitech_id, 'G Pro X Superlight 2', 3),
    (logitech_id, 'G915 TKL', 4),
    (logitech_id, 'Zone Vibe 100', 5);

  -- Corsair Models
  INSERT INTO models (brand_id, name, display_order) VALUES
    (corsair_id, 'K70 RGB TKL', 1),
    (corsair_id, 'K65 RGB Mini', 2),
    (corsair_id, 'Darkstar Wireless', 3),
    (corsair_id, 'Virtuoso RGB Wireless', 4);

  -- HyperX Models
  INSERT INTO models (brand_id, name, display_order) VALUES
    (hyperx_id, 'Cloud III', 1),
    (hyperx_id, 'Cloud Alpha Wireless', 2),
    (hyperx_id, 'Alloy Elite 2', 3),
    (hyperx_id, 'Pulsefire Haste 2', 4);

  -- SteelSeries Models
  INSERT INTO models (brand_id, name, display_order) VALUES
    (steelseries_id, 'Arctis Nova Pro', 1),
    (steelseries_id, 'Arctis 7P+', 2),
    (steelseries_id, 'Apex Pro TKL', 3),
    (steelseries_id, 'Aerox 5 Wireless', 4);

END $$;

