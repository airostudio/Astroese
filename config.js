// AstroPalm Configuration
// Replace these with your actual keys before deploying

const CONFIG = {
  // Supabase Configuration
  // Get these from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
  SUPABASE_URL: 'https://YOUR_PROJECT_ID.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',

  // Stripe Configuration
  // Get this from: https://dashboard.stripe.com/apikeys
  STRIPE_PUBLISHABLE_KEY: 'pk_test_YOUR_STRIPE_PUBLISHABLE_KEY',

  // Product/Price IDs from Stripe Dashboard
  STRIPE_PRICES: {
    PREMIUM_MONTHLY: 'price_monthly_premium',      // $7.99/month subscription
    PALM_UNLOCK: 'price_palm_unlock',              // $2.99 one-time
    HOROSCOPE_UNLOCK: 'price_horoscope_unlock',    // $1.99 one-time
    COMPAT_UNLOCK: 'price_compat_unlock',          // $4.99 one-time
    CREDITS_10: 'price_credits_10'                 // $10 for 10 credits
  },

  // Backend API URL (for Stripe payment processing)
  // You'll need a server endpoint to create Stripe sessions
  API_URL: '/api'
};

// Supabase Database Schema (run this in Supabase SQL Editor):
/*
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  display_name TEXT DEFAULT 'Guest',
  zodiac_sign TEXT,
  credits INTEGER DEFAULT 10,
  is_premium BOOLEAN DEFAULT FALSE,
  premium_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Palm scans table
CREATE TABLE public.palm_scans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT,
  result_json JSONB,
  is_premium_reading BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Horoscope readings table
CREATE TABLE public.horoscope_readings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  zodiac_sign TEXT NOT NULL,
  focus TEXT NOT NULL,
  free_text TEXT,
  premium_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Compatibility reports table
CREATE TABLE public.compat_reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  sign_a TEXT NOT NULL,
  sign_b TEXT NOT NULL,
  mode TEXT NOT NULL,
  score INTEGER,
  result_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchases table
CREATE TABLE public.purchases (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_session_id TEXT,
  product_type TEXT NOT NULL,
  amount_cents INTEGER,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.palm_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horoscope_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compat_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- Users can only see/edit their own data
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own palm scans" ON public.palm_scans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own palm scans" ON public.palm_scans FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own horoscope readings" ON public.horoscope_readings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own horoscope readings" ON public.horoscope_readings FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own compat reports" ON public.compat_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own compat reports" ON public.compat_reports FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own purchases" ON public.purchases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own purchases" ON public.purchases FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', 'Guest'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Supabase Storage bucket for palm images
-- Run this in SQL or create via Dashboard:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('palm-images', 'palm-images', true);
*/

export default CONFIG;
