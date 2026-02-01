// AstroPalm - Configuration
// Replace these with your actual keys before deploying

export const CONFIG = {
  // Supabase Configuration
  SUPABASE_URL: 'https://YOUR_PROJECT_ID.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',

  // Stripe Configuration
  STRIPE_PUBLISHABLE_KEY: 'pk_test_YOUR_STRIPE_PUBLISHABLE_KEY',

  // Product/Price IDs from Stripe Dashboard
  STRIPE_PRICES: {
    PREMIUM_MONTHLY: 'price_monthly_premium',
    PALM_UNLOCK: 'price_palm_unlock',
    HOROSCOPE_UNLOCK: 'price_horoscope_unlock',
    COMPAT_UNLOCK: 'price_compat_unlock'
  },

  // Backend API URL
  API_URL: '/api'
};
