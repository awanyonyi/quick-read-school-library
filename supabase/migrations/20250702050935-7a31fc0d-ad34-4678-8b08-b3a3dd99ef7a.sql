
-- First, let's see what categories currently exist and update them
-- We'll add a check constraint to ensure only valid categories are allowed
ALTER TABLE public.books 
DROP CONSTRAINT IF EXISTS books_category_check;

ALTER TABLE public.books 
ADD CONSTRAINT books_category_check 
CHECK (category IN ('Science', 'Language', 'Technicals and Applied', 'Humanities', 'Maths'));

-- Update any existing books with old categories to map them to the new ones
-- This is a best-effort mapping based on common categorizations
UPDATE public.books 
SET category = CASE 
    WHEN category ILIKE '%science%' OR category ILIKE '%chemistry%' OR category ILIKE '%biology%' OR category ILIKE '%physics%' THEN 'Science'
    WHEN category ILIKE '%language%' OR category ILIKE '%literature%' OR category ILIKE '%english%' THEN 'Language'
    WHEN category ILIKE '%computer%' OR category ILIKE '%technical%' OR category ILIKE '%engineering%' OR category ILIKE '%technology%' THEN 'Technicals and Applied'
    WHEN category ILIKE '%math%' OR category ILIKE '%mathematics%' OR category ILIKE '%algebra%' OR category ILIKE '%calculus%' THEN 'Maths'
    WHEN category ILIKE '%history%' OR category ILIKE '%philosophy%' OR category ILIKE '%social%' OR category ILIKE '%humanities%' THEN 'Humanities'
    ELSE 'Science' -- Default fallback for any unmatched categories
END
WHERE category NOT IN ('Science', 'Language', 'Technicals and Applied', 'Humanities', 'Maths');
