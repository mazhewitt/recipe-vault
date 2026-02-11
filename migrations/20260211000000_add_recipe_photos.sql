-- Add photo support to recipes
-- Migration: 20260211000000_add_recipe_photos

ALTER TABLE recipes ADD COLUMN photo_filename TEXT;
