// AstroPalm - Application State

export const state = {
  user: null,
  profile: null,
  premium: false,
  palm: {
    file: null,
    dataUrl: null
  },
  camera: {
    stream: null,
    facingMode: 'environment'
  },
  savedReadings: []
};

// Supabase and Stripe clients
export let supabase = null;
export let stripe = null;

export function setSupabase(client) {
  supabase = client;
}

export function setStripe(client) {
  stripe = client;
}
