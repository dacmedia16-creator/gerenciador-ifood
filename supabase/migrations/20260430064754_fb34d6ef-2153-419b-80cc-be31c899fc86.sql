
CREATE TABLE public.prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  city text,
  neighborhood text,
  platform text,
  category text,
  rating numeric,
  reviews_count integer,
  delivery_time integer,
  delivery_fee numeric,
  price_range text,
  has_photos boolean DEFAULT true,
  has_combos boolean DEFAULT false,
  has_coupons boolean DEFAULT false,
  generic_names boolean DEFAULT false,
  notes text,
  potential_score integer,
  potential_level text,
  main_gap text,
  status text NOT NULL DEFAULT 'novo',
  contacted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY prospects_all_own ON public.prospects
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER prospects_touch BEFORE UPDATE ON public.prospects
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
