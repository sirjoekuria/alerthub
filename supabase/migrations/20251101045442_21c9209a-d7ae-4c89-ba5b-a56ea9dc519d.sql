-- Fix function search path
DROP FUNCTION IF EXISTS generate_receipt_number();

CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  receipt_num TEXT;
BEGIN
  receipt_num := 'RCP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN receipt_num;
END;
$$;