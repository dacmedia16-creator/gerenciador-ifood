
-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- stores
CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  platform TEXT,
  city TEXT,
  neighborhood TEXT,
  rating NUMERIC(3,2),
  promised_delivery_time INTEGER,
  delivery_fee NUMERIC(10,2),
  monthly_revenue NUMERIC(12,2),
  monthly_orders INTEGER,
  average_ticket NUMERIC(10,2),
  cancellation_rate NUMERIC(5,2),
  opening_hours TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stores_all_own" ON public.stores FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_stores_user ON public.stores(user_id);

-- security definer helper
CREATE OR REPLACE FUNCTION public.has_store_access(_store_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.stores WHERE id = _store_id AND user_id = auth.uid()
  )
$$;

-- generic store-scoped tables
CREATE TABLE public.metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  period_start DATE,
  period_end DATE,
  revenue NUMERIC(12,2),
  orders INTEGER,
  average_ticket NUMERIC(10,2),
  average_delivery_time INTEGER,
  cancellation_rate NUMERIC(5,2),
  rating NUMERIC(3,2),
  coupon_cost NUMERIC(12,2),
  ads_cost NUMERIC(12,2),
  estimated_profit NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "metrics_all_own" ON public.metrics FOR ALL USING (public.has_store_access(store_id)) WITH CHECK (public.has_store_access(store_id));
CREATE INDEX idx_metrics_store ON public.metrics(store_id);

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  sale_price NUMERIC(10,2),
  food_cost NUMERIC(10,2),
  packaging_cost NUMERIC(10,2),
  platform_fee_percent NUMERIC(5,2),
  coupon_impact NUMERIC(10,2),
  sales_quantity INTEGER DEFAULT 0,
  complaints_count INTEGER DEFAULT 0,
  has_photo BOOLEAN DEFAULT false,
  photo_quality_score INTEGER,
  estimated_margin NUMERIC(5,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_all_own" ON public.products FOR ALL USING (public.has_store_access(store_id)) WITH CHECK (public.has_store_access(store_id));
CREATE INDEX idx_products_store ON public.products(store_id);

CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  rating NUMERIC(3,2),
  comment TEXT,
  sentiment TEXT,
  detected_topics TEXT[],
  order_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_all_own" ON public.reviews FOR ALL USING (public.has_store_access(store_id)) WITH CHECK (public.has_store_access(store_id));
CREATE INDEX idx_reviews_store ON public.reviews(store_id);

CREATE TABLE public.competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rating NUMERIC(3,2),
  delivery_time INTEGER,
  delivery_fee NUMERIC(10,2),
  price_range TEXT,
  photo_quality TEXT,
  has_combos BOOLEAN DEFAULT false,
  has_coupons BOOLEAN DEFAULT false,
  positioning_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "competitors_all_own" ON public.competitors FOR ALL USING (public.has_store_access(store_id)) WITH CHECK (public.has_store_access(store_id));
CREATE INDEX idx_competitors_store ON public.competitors(store_id);

CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  campaign_type TEXT,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  cost NUMERIC(12,2),
  revenue_generated NUMERIC(12,2),
  new_customers INTEGER,
  period_start DATE,
  period_end DATE,
  estimated_roi NUMERIC(8,2),
  margin_impact NUMERIC(8,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaigns_all_own" ON public.campaigns FOR ALL USING (public.has_store_access(store_id)) WITH CHECK (public.has_store_access(store_id));
CREATE INDEX idx_campaigns_store ON public.campaigns(store_id);

CREATE TABLE public.diagnostics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  area TEXT NOT NULL,
  problem TEXT,
  evidence TEXT,
  probable_cause TEXT,
  business_impact TEXT,
  recommended_solution TEXT,
  priority TEXT,
  practical_action TEXT,
  suggested_deadline TEXT,
  severity TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.diagnostics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "diagnostics_all_own" ON public.diagnostics FOR ALL USING (public.has_store_access(store_id)) WITH CHECK (public.has_store_access(store_id));
CREATE INDEX idx_diagnostics_store ON public.diagnostics(store_id);

CREATE TABLE public.action_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  diagnostic_id UUID REFERENCES public.diagnostics(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  area TEXT,
  priority TEXT,
  impact TEXT,
  effort TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  responsible TEXT,
  due_date DATE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.action_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "action_plans_all_own" ON public.action_plans FOR ALL USING (public.has_store_access(store_id)) WITH CHECK (public.has_store_access(store_id));
CREATE INDEX idx_action_plans_store ON public.action_plans(store_id);

CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  title TEXT,
  executive_summary TEXT,
  general_score INTEGER,
  key_problems JSONB,
  opportunities JSONB,
  recommendations JSONB,
  report_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_all_own" ON public.reports FOR ALL USING (public.has_store_access(store_id)) WITH CHECK (public.has_store_access(store_id));
CREATE INDEX idx_reports_store ON public.reports(store_id);

-- profile autocreate trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), NEW.email)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at touch
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_stores_updated BEFORE UPDATE ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('reports', 'reports', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "reports_select_own" ON storage.objects FOR SELECT
USING (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "reports_insert_own" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "reports_delete_own" ON storage.objects FOR DELETE
USING (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]);
