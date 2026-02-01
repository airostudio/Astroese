// AstroPalm — Full-featured web app with Supabase + Stripe + Mobile Camera
// Entertainment purposes only

// ========== CONFIGURATION ==========
const CONFIG = {
  SUPABASE_URL: 'https://YOUR_PROJECT_ID.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',
  STRIPE_PUBLISHABLE_KEY: 'pk_test_YOUR_STRIPE_PUBLISHABLE_KEY',
  API_URL: '/api',
  STRIPE_PRICES: {
    PREMIUM_MONTHLY: 'price_monthly_premium',
    PALM_UNLOCK: 'price_palm_unlock',
    HOROSCOPE_UNLOCK: 'price_horoscope_unlock',
    COMPAT_UNLOCK: 'price_compat_unlock'
  }
};

// ========== STATE ==========
const state = {
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

const SIGNS = [
  "aries","taurus","gemini","cancer","leo","virgo",
  "libra","scorpio","sagittarius","capricorn","aquarius","pisces"
];

// ========== SUPABASE CLIENT ==========
let supabase = null;
let stripe = null;

function initSupabase() {
  if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
    supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    return true;
  }
  console.warn('Supabase not loaded - running in demo mode');
  return false;
}

function initStripe() {
  if (typeof window.Stripe !== 'undefined') {
    stripe = window.Stripe(CONFIG.STRIPE_PUBLISHABLE_KEY);
    return true;
  }
  console.warn('Stripe not loaded - running in demo mode');
  return false;
}

// ========== UTILITIES ==========
function $(id) { return document.getElementById(id); }

function formatNow() {
  return new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function showToast(message, type = 'info') {
  const container = $('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function showLoading(text = 'Loading...') {
  $('loadingText').textContent = text;
  $('loadingOverlay').classList.remove('hidden');
}

function hideLoading() {
  $('loadingOverlay').classList.add('hidden');
}

// ========== AUTH FUNCTIONS ==========
async function checkAuth() {
  if (!supabase) {
    updateAuthUI(false);
    return;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      state.user = session.user;
      await loadProfile();
      updateAuthUI(true);
    } else {
      updateAuthUI(false);
    }
  } catch (err) {
    console.error('Auth check error:', err);
    updateAuthUI(false);
  }
}

async function signIn(email, password) {
  if (!supabase) {
    showToast('Demo mode - sign in simulated', 'info');
    state.user = { email, id: 'demo-user' };
    state.profile = { display_name: 'Demo User', is_premium: false };
    updateAuthUI(true);
    closeModal('authModal');
    return;
  }

  showLoading('Signing in...');
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    state.user = data.user;
    await loadProfile();
    updateAuthUI(true);
    closeModal('authModal');
    showToast('Welcome back!', 'success');
  } catch (err) {
    $('signInError').textContent = err.message;
    $('signInError').classList.remove('hidden');
  } finally {
    hideLoading();
  }
}

async function signUp(email, password, displayName, zodiacSign) {
  if (!supabase) {
    showToast('Demo mode - sign up simulated', 'info');
    state.user = { email, id: 'demo-user' };
    state.profile = { display_name: displayName, is_premium: false, zodiac_sign: zodiacSign };
    updateAuthUI(true);
    closeModal('authModal');
    return;
  }

  showLoading('Creating account...');
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName, zodiac_sign: zodiacSign }
      }
    });
    if (error) throw error;

    state.user = data.user;
    await loadProfile();
    updateAuthUI(true);
    closeModal('authModal');
    showToast('Account created! Welcome to AstroPalm', 'success');
  } catch (err) {
    $('signUpError').textContent = err.message;
    $('signUpError').classList.remove('hidden');
  } finally {
    hideLoading();
  }
}

async function signOut() {
  if (supabase) {
    await supabase.auth.signOut();
  }
  state.user = null;
  state.profile = null;
  state.premium = false;
  state.savedReadings = [];
  updateAuthUI(false);
  showToast('Signed out', 'info');
}

async function loadProfile() {
  if (!supabase || !state.user) return;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', state.user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (data) {
      state.profile = data;
      state.premium = data.is_premium || false;
    }

    await loadSavedReadings();
  } catch (err) {
    console.error('Load profile error:', err);
  }
}

async function loadSavedReadings() {
  if (!supabase || !state.user) return;

  try {
    const [palmRes, horoRes, compatRes] = await Promise.all([
      supabase.from('palm_scans').select('*').eq('user_id', state.user.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('horoscope_readings').select('*').eq('user_id', state.user.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('compat_reports').select('*').eq('user_id', state.user.id).order('created_at', { ascending: false }).limit(10)
    ]);

    state.savedReadings = [
      ...(palmRes.data || []).map(r => ({ type: 'Palm', ...r })),
      ...(horoRes.data || []).map(r => ({ type: 'Horoscope', ...r })),
      ...(compatRes.data || []).map(r => ({ type: 'Compatibility', ...r }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    renderSavedReadings();
  } catch (err) {
    console.error('Load readings error:', err);
  }
}

async function saveProfile() {
  const displayName = $('displayName').value.trim() || 'Guest';
  const zodiacSign = $('profileSign').value;

  if (!supabase || !state.user) {
    state.profile = { ...state.profile, display_name: displayName, zodiac_sign: zodiacSign };
    updateProfileUI();
    showToast('Profile saved (demo mode)', 'success');
    return;
  }

  showLoading('Saving...');
  try {
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: state.user.id,
        display_name: displayName,
        zodiac_sign: zodiacSign,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
    state.profile = { ...state.profile, display_name: displayName, zodiac_sign: zodiacSign };
    updateProfileUI();
    showToast('Profile saved!', 'success');
  } catch (err) {
    showToast('Failed to save profile', 'error');
  } finally {
    hideLoading();
  }
}

function updateAuthUI(loggedIn) {
  if (loggedIn && state.user) {
    $('authText').textContent = state.profile?.display_name || state.user.email?.split('@')[0] || 'Account';
    $('authIcon').textContent = '👤';
    $('profileLoggedIn').classList.remove('hidden');
    $('profileLoggedOut').classList.add('hidden');
    updateProfileUI();
    updatePremiumUI();
  } else {
    $('authText').textContent = 'Sign In';
    $('authIcon').textContent = '👤';
    $('profileLoggedIn').classList.add('hidden');
    $('profileLoggedOut').classList.remove('hidden');
  }
}

function updateProfileUI() {
  if (state.profile) {
    $('profileName').textContent = state.profile.display_name || 'Guest';
    $('profileEmail').textContent = state.user?.email || '';
    $('displayName').value = state.profile.display_name || '';
    $('profileSign').value = state.profile.zodiac_sign || '';

    if (state.profile.zodiac_sign) {
      $('signSelect').value = state.profile.zodiac_sign;
    }
  }

  // Update stats
  const palmScans = state.savedReadings.filter(r => r.type === 'Palm').length;
  const readings = state.savedReadings.length;
  $('statScans').textContent = palmScans;
  $('statReadings').textContent = readings;
}

function updatePremiumUI() {
  const isPremium = state.premium;
  $('premiumIcon').textContent = isPremium ? '⭐' : '☆';
  $('premiumState').textContent = isPremium ? 'Premium' : 'Free';
  $('btnPremium').classList.toggle('premium-active', isPremium);

  // Update paywalls visibility
  $('palmPaywall').style.display = isPremium ? 'none' : 'block';
  $('horoPaywall').style.display = isPremium ? 'none' : 'block';
  $('compatPaywall').style.display = isPremium ? 'none' : 'block';

  // Update subscription card
  const subCard = $('subscriptionStatus');
  if (isPremium) {
    subCard.classList.add('premium');
    subCard.querySelector('.subIcon').textContent = '⭐';
    subCard.querySelector('.subTitle').textContent = 'Premium Plan';
    subCard.querySelector('.subDesc').textContent = 'Full access to all features';
    $('btnUpgrade').textContent = 'Manage';
  } else {
    subCard.classList.remove('premium');
    subCard.querySelector('.subIcon').textContent = '☆';
    subCard.querySelector('.subTitle').textContent = 'Free Plan';
    subCard.querySelector('.subDesc').textContent = 'Limited features';
    $('btnUpgrade').textContent = 'Upgrade';
  }

  // Update horoscope premium text
  if (!isPremium) {
    $('horoPremium').textContent = 'Upgrade to unlock premium readings.';
  }
}

// ========== MODAL FUNCTIONS ==========
function openModal(modalId) {
  $(modalId).classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
  $(modalId).classList.add('hidden');
  document.body.style.overflow = '';

  // Clean up camera if closing camera modal
  if (modalId === 'cameraModal') {
    stopCamera();
  }
}

// ========== CAMERA FUNCTIONS ==========
async function openCamera() {
  openModal('cameraModal');
  await startCamera();
}

async function startCamera() {
  try {
    if (state.camera.stream) {
      state.camera.stream.getTracks().forEach(track => track.stop());
    }

    const constraints = {
      video: {
        facingMode: state.camera.facingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    };

    state.camera.stream = await navigator.mediaDevices.getUserMedia(constraints);
    const video = $('cameraVideo');
    video.srcObject = state.camera.stream;

    // Reset UI
    $('capturedImage').classList.add('hidden');
    $('cameraVideo').classList.remove('hidden');
    $('palmGuide').classList.remove('hidden');
    $('retakePhoto').classList.add('hidden');
    $('usePhoto').classList.add('hidden');
    $('captureBtn').classList.remove('hidden');
  } catch (err) {
    console.error('Camera error:', err);
    showToast('Could not access camera. Please check permissions.', 'error');
    closeModal('cameraModal');
  }
}

function stopCamera() {
  if (state.camera.stream) {
    state.camera.stream.getTracks().forEach(track => track.stop());
    state.camera.stream = null;
  }
}

function switchCamera() {
  state.camera.facingMode = state.camera.facingMode === 'environment' ? 'user' : 'environment';
  startCamera();
}

function capturePhoto() {
  const video = $('cameraVideo');
  const canvas = $('cameraCanvas');
  const ctx = canvas.getContext('2d');

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  // Mirror if front camera
  if (state.camera.facingMode === 'user') {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }

  ctx.drawImage(video, 0, 0);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
  state.palm.dataUrl = dataUrl;

  // Show captured image
  $('capturedImage').src = dataUrl;
  $('capturedImage').classList.remove('hidden');
  $('cameraVideo').classList.add('hidden');
  $('palmGuide').classList.add('hidden');

  // Update buttons
  $('captureBtn').classList.add('hidden');
  $('retakePhoto').classList.remove('hidden');
  $('usePhoto').classList.remove('hidden');
}

function retakePhoto() {
  $('capturedImage').classList.add('hidden');
  $('cameraVideo').classList.remove('hidden');
  $('palmGuide').classList.remove('hidden');
  $('captureBtn').classList.remove('hidden');
  $('retakePhoto').classList.add('hidden');
  $('usePhoto').classList.add('hidden');
  state.palm.dataUrl = null;
}

function usePhoto() {
  if (!state.palm.dataUrl) return;

  // Show in preview
  $('palmPreview').src = state.palm.dataUrl;
  $('palmPreview').classList.remove('hidden');
  $('previewPlaceholder').classList.add('hidden');
  $('btnAnalyzePalm').classList.remove('hidden');

  // Draw overlay
  setTimeout(() => drawOverlayDemo($('palmPreview')), 50);

  closeModal('cameraModal');
  showToast('Palm photo captured!', 'success');
}

// ========== PAYMENT FUNCTIONS ==========
function showPaymentModal(type) {
  const options = getPaymentOptions(type);
  const optionsHtml = options.map(opt => `
    <button class="paymentOption ${opt.recommended ? 'recommended' : ''}" data-price="${opt.priceId}" data-type="${opt.type}">
      <div class="optionIcon">${opt.icon}</div>
      <div class="optionInfo">
        <div class="optionTitle">${opt.title}${opt.recommended ? '<span class="optionBadge">Best Value</span>' : ''}</div>
        <div class="optionDesc">${opt.desc}</div>
      </div>
      <div class="optionPrice">${opt.price}</div>
    </button>
  `).join('');

  $('paymentOptions').innerHTML = optionsHtml;
  $('paymentTitle').textContent = type === 'subscription' ? 'Upgrade to Premium' : 'Unlock Feature';
  $('paymentDesc').textContent = type === 'subscription'
    ? 'Get unlimited access to all premium features'
    : 'One-time purchase to unlock this feature';

  // Bind click handlers
  $('paymentOptions').querySelectorAll('.paymentOption').forEach(btn => {
    btn.addEventListener('click', () => handlePayment(btn.dataset.priceId, btn.dataset.type));
  });

  openModal('paymentModal');
}

function getPaymentOptions(type) {
  switch (type) {
    case 'subscription':
      return [
        {
          icon: '⭐',
          title: 'Premium Monthly',
          desc: 'Unlimited premium readings + palm scans',
          price: '$7.99/mo',
          priceId: CONFIG.STRIPE_PRICES.PREMIUM_MONTHLY,
          type: 'subscription',
          recommended: true
        }
      ];
    case 'palm':
      return [
        { icon: '✋', title: 'Premium Palm Reading', desc: 'Deeper analysis + year ahead', price: '$2.99', priceId: CONFIG.STRIPE_PRICES.PALM_UNLOCK, type: 'one_time' },
        { icon: '⭐', title: 'Go Premium', desc: 'Unlimited everything', price: '$7.99/mo', priceId: CONFIG.STRIPE_PRICES.PREMIUM_MONTHLY, type: 'subscription', recommended: true }
      ];
    case 'horoscope':
      return [
        { icon: '✨', title: 'Premium Horoscope', desc: 'Deeper insights + lucky cues', price: '$1.99', priceId: CONFIG.STRIPE_PRICES.HOROSCOPE_UNLOCK, type: 'one_time' },
        { icon: '⭐', title: 'Go Premium', desc: 'Unlimited everything', price: '$7.99/mo', priceId: CONFIG.STRIPE_PRICES.PREMIUM_MONTHLY, type: 'subscription', recommended: true }
      ];
    case 'compat':
      return [
        { icon: '💕', title: 'Premium Report', desc: 'Expanded relationship analysis', price: '$4.99', priceId: CONFIG.STRIPE_PRICES.COMPAT_UNLOCK, type: 'one_time' },
        { icon: '⭐', title: 'Go Premium', desc: 'Unlimited everything', price: '$7.99/mo', priceId: CONFIG.STRIPE_PRICES.PREMIUM_MONTHLY, type: 'subscription', recommended: true }
      ];
    default:
      return [];
  }
}

async function handlePayment(priceId, type) {
  if (!stripe) {
    // Demo mode - simulate payment
    showToast('Demo mode - payment simulated', 'info');
    if (type === 'subscription') {
      state.premium = true;
      updatePremiumUI();
    }
    closeModal('paymentModal');
    return;
  }

  $('paymentLoading').classList.remove('hidden');
  $('paymentOptions').classList.add('hidden');
  $('paymentError').classList.add('hidden');

  try {
    // Call your backend to create a Stripe checkout session
    const response = await fetch(`${CONFIG.API_URL}/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priceId,
        type,
        userId: state.user?.id,
        successUrl: window.location.href + '?payment=success',
        cancelUrl: window.location.href + '?payment=cancelled'
      })
    });

    const { sessionId, error } = await response.json();
    if (error) throw new Error(error);

    // Redirect to Stripe checkout
    const { error: stripeError } = await stripe.redirectToCheckout({ sessionId });
    if (stripeError) throw stripeError;
  } catch (err) {
    $('paymentError').textContent = err.message || 'Payment failed. Please try again.';
    $('paymentError').classList.remove('hidden');
    $('paymentLoading').classList.add('hidden');
    $('paymentOptions').classList.remove('hidden');
  }
}

// ========== PALM SCAN FUNCTIONS ==========
function drawOverlayDemo(imgEl) {
  const canvas = $("palmOverlay");
  const rect = imgEl.getBoundingClientRect();
  canvas.width = Math.max(1, Math.floor(rect.width));
  canvas.height = Math.max(1, Math.floor(rect.height));
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const w = canvas.width, h = canvas.height;

  ctx.globalAlpha = 0.9;
  ctx.lineWidth = Math.max(2, Math.floor(Math.min(w, h) * 0.01));
  ctx.strokeStyle = "rgba(139,92,246,0.85)";

  const lines = [
    [[w*0.18, h*0.35], [w*0.45, h*0.28], [w*0.76, h*0.34]],
    [[w*0.22, h*0.48], [w*0.50, h*0.52], [w*0.82, h*0.56]],
    [[w*0.35, h*0.30], [w*0.26, h*0.55], [w*0.38, h*0.82]],
  ];

  for (const pts of lines) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    ctx.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1]);
    ctx.stroke();
  }

  ctx.font = `${Math.max(12, Math.floor(Math.min(w, h) * 0.045))}px system-ui`;
  ctx.fillStyle = "rgba(242,244,255,0.9)";
  ctx.fillText("Heart", w*0.70, h*0.30);
  ctx.fillText("Head", w*0.74, h*0.58);
  ctx.fillText("Life", w*0.22, h*0.80);

  ctx.globalAlpha = 1;
}

function analyzePalmDemo() {
  const traits = [
    "steady energy", "quick intuition", "resilient mindset", "creative problem-solving",
    "strong boundaries", "empathetic presence", "adaptable spirit", "focused ambition"
  ];
  const challenges = [
    "overthinking", "taking on too much", "people-pleasing", "impatience with slow progress",
    "being too self-critical", "avoiding rest", "mixed signals in relationships"
  ];
  const guidance = [
    "Pick one priority and finish it before starting another.",
    "Say yes slower — your time is valuable.",
    "Balance logic with intuition when decisions feel stuck.",
    "A small daily routine will compound fast this month.",
    "Communicate clearly: what you want, what you won't do, and why."
  ];

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const lineScores = {
    heart: Math.floor(55 + Math.random() * 40),
    head: Math.floor(55 + Math.random() * 40),
    life: Math.floor(55 + Math.random() * 40)
  };

  const base = `Palm Reading (Entertainment)
• Heart line: ${lineScores.heart}/100 — emotional style leans toward ${pick(["warm", "guarded", "direct", "idealistic"])}.
• Head line: ${lineScores.head}/100 — mental approach feels ${pick(["analytical", "vision-driven", "practical", "curious"])}.
• Life line: ${lineScores.life}/100 — overall drive looks ${pick(["steady", "bursty", "consistent", "restless"])}.

Strong signal: ${pick(traits)}
Watch-out: ${pick(challenges)}
Guidance: ${pick(guidance)}
`;

  if (!state.premium) {
    return base + "\n(Unlock Premium for deeper detail + 'year-ahead' themes.)";
  }

  const premiumAdd = `
Premium Deep-Dive
• Relationship vibe: ${pick(["loyal but selective", "intense and sincere", "playful and open", "calm and committed"])}
• Career tendency: ${pick(["independent builder", "team catalyst", "strategic planner", "creative finisher"])}
• Next 30 days: ${pick([
    "A new opportunity appears through a casual conversation.",
    "Clearing clutter (digital or physical) boosts focus dramatically.",
    "A relationship improves when you state needs plainly.",
    "Momentum rises after you protect your sleep and routines."
  ])}
Lucky cue: ${pick(["moonlight walks", "fresh starts on Mondays", "journaling", "water/sea time", "a short solo trip"])}
`;

  return base + premiumAdd;
}

async function analyzePalm() {
  if (!state.palm.dataUrl) {
    showToast('Please capture or upload a palm photo first', 'error');
    return;
  }

  showLoading('Analyzing your palm...');

  // Simulate analysis delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  const result = analyzePalmDemo();
  $('palmResult').classList.remove('muted');
  $('palmResult').textContent = result;

  // Save to database
  await savePalmReading(result);

  hideLoading();
  showToast('Palm reading complete!', 'success');
}

async function savePalmReading(result) {
  if (!supabase || !state.user) {
    // Local save for demo
    state.savedReadings.unshift({
      type: 'Palm',
      result_json: { result },
      created_at: new Date().toISOString()
    });
    renderSavedReadings();
    return;
  }

  try {
    // Upload image to Supabase Storage
    let imageUrl = null;
    if (state.palm.dataUrl) {
      const fileName = `${state.user.id}/${Date.now()}.jpg`;
      const base64Data = state.palm.dataUrl.split(',')[1];
      const { data, error } = await supabase.storage
        .from('palm-images')
        .upload(fileName, decode(base64Data), {
          contentType: 'image/jpeg'
        });
      if (!error) {
        imageUrl = data.path;
      }
    }

    // Save reading
    await supabase.from('palm_scans').insert({
      user_id: state.user.id,
      image_url: imageUrl,
      result_json: { result },
      is_premium_reading: state.premium
    });

    await loadSavedReadings();
  } catch (err) {
    console.error('Save palm reading error:', err);
  }
}

// Base64 decode helper
function decode(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// ========== HOROSCOPE FUNCTIONS ==========
function horoscopeDemo(sign, focus) {
  const themes = {
    general: ["momentum", "clarity", "reset", "confidence", "patience", "unexpected help"],
    love: ["honesty", "warmth", "boundaries", "magnetism", "reconnection", "new spark"],
    career: ["focus", "recognition", "strategy", "networking", "skill-building", "smart risk"],
    wellbeing: ["rest", "routine", "hydration", "movement", "mindset", "quiet time"]
  };
  const actions = [
    "send the message you've been delaying",
    "clear one small task completely",
    "say no to one draining commitment",
    "choose the simplest option",
    "ask for help earlier",
    "take a 20-minute walk and reset"
  ];
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const title = `${cap(sign)} — ${cap(focus)} — ${new Date().toLocaleDateString()}`;

  const free = `${title}
Theme: ${pick(themes[focus])}
Today's nudge: ${pick(actions)}.
`;

  const premium = `Premium add-on
Deeper message: Your best results come from consistency over intensity — keep it simple and repeatable.
Lucky cue: ${pick(["number 4", "number 9", "a purple accent", "a late afternoon decision", "a short voice note"])}
Avoid: ${pick(["impulse spending", "doom scrolling", "mixed signals", "rushing the first draft"])}
`;

  return { title, free, premium };
}

async function getHoroscope() {
  const sign = $('signSelect').value;
  const focus = $('focusSelect').value;
  const { title, free, premium } = horoscopeDemo(sign, focus);

  $('horoFree').classList.remove('muted');
  $('horoFree').textContent = free;

  if (state.premium) {
    $('horoPremium').classList.remove('muted');
    $('horoPremium').textContent = premium;
  } else {
    $('horoPremium').classList.add('muted');
    $('horoPremium').textContent = 'Upgrade to unlock premium readings.';
  }

  // Save to database
  await saveHoroscopeReading(sign, focus, free, state.premium ? premium : null);
  showToast('Horoscope generated!', 'success');
}

async function saveHoroscopeReading(sign, focus, freeText, premiumText) {
  if (!supabase || !state.user) {
    state.savedReadings.unshift({
      type: 'Horoscope',
      zodiac_sign: sign,
      focus,
      free_text: freeText,
      premium_text: premiumText,
      created_at: new Date().toISOString()
    });
    renderSavedReadings();
    return;
  }

  try {
    await supabase.from('horoscope_readings').insert({
      user_id: state.user.id,
      zodiac_sign: sign,
      focus,
      free_text: freeText,
      premium_text: premiumText
    });
    await loadSavedReadings();
  } catch (err) {
    console.error('Save horoscope error:', err);
  }
}

// ========== COMPATIBILITY FUNCTIONS ==========
function compatDemo(a, b, mode) {
  const seed = (a + "|" + b + "|" + mode).split("")
    .reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7);

  const score = 45 + (seed % 56);
  const strengths = [
    "shared humor", "emotional balance", "mutual ambition", "easy communication",
    "strong loyalty", "creative chemistry", "growth mindset", "grounded teamwork"
  ];
  const frictions = [
    "different pacing", "stubborn moments", "misread signals", "avoidance of conflict",
    "control vs freedom", "mixed priorities", "overthinking small stuff"
  ];
  const pickFromSeed = (arr, n) => arr[(seed + n * 97) % arr.length];

  const title = `${cap(a)} + ${cap(b)} (${cap(mode)})`;
  const text = `${title}
Score: ${score}/100

What works: ${pickFromSeed(strengths, 1)} and ${pickFromSeed(strengths, 2)}.
Watch for: ${pickFromSeed(frictions, 1)}.
Best move: Pick one shared goal this week and keep it measurable.
`;

  const premium = `Premium expanded report
• Communication style: One prefers direct clarity; the other prefers gentle pacing — agree on a "check-in" rhythm.
• Conflict tip: Name the feeling first, then the request.
• Growth potential: High if you respect differences and avoid scorekeeping.
`;

  return { title, score, text, premium };
}

async function checkCompatibility() {
  const a = $('compatA').value;
  const b = $('compatB').value;
  const mode = $('compatMode').value;

  const { title, score, text, premium } = compatDemo(a, b, mode);

  $('compatBar').style.width = `${score}%`;
  $('compatScore').classList.remove('muted');
  $('compatScore').textContent = `${score}%`;

  $('compatText').classList.remove('muted');
  const fullText = state.premium ? (text + "\n" + premium) : text;
  $('compatText').textContent = fullText;

  // Save to database
  await saveCompatReport(a, b, mode, score, fullText);
  showToast('Compatibility checked!', 'success');
}

async function saveCompatReport(signA, signB, mode, score, text) {
  if (!supabase || !state.user) {
    state.savedReadings.unshift({
      type: 'Compatibility',
      sign_a: signA,
      sign_b: signB,
      mode,
      score,
      result_json: { text },
      created_at: new Date().toISOString()
    });
    renderSavedReadings();
    return;
  }

  try {
    await supabase.from('compat_reports').insert({
      user_id: state.user.id,
      sign_a: signA,
      sign_b: signB,
      mode,
      score,
      result_json: { text }
    });
    await loadSavedReadings();
  } catch (err) {
    console.error('Save compat error:', err);
  }
}

// ========== SAVED READINGS ==========
function renderSavedReadings() {
  const saved = state.savedReadings;
  if (!saved.length) {
    $('savedReadings').classList.add('muted');
    $('savedReadings').textContent = 'No readings yet.';
    return;
  }
  $('savedReadings').classList.remove('muted');
  $('savedReadings').textContent = saved
    .slice(0, 10)
    .map((x, i) => {
      const date = new Date(x.created_at).toLocaleDateString();
      let title = x.type;
      if (x.type === 'Horoscope') title += ` (${cap(x.zodiac_sign || '')})`;
      if (x.type === 'Compatibility') title += ` (${cap(x.sign_a || '')} + ${cap(x.sign_b || '')})`;
      return `${i + 1}. ${title} — ${date}`;
    })
    .join("\n");
}

// ========== NAVIGATION ==========
function routeTo(route) {
  document.querySelectorAll(".tab").forEach(t => {
    t.classList.toggle("active", t.dataset.route === route);
  });
  document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
  $(`view-${route}`).classList.remove("hidden");
}

// ========== INITIALIZATION ==========
function initSignSelects() {
  const a = $("compatA"), b = $("compatB");
  for (const sign of SIGNS) {
    const o1 = document.createElement("option");
    o1.value = sign;
    o1.textContent = cap(sign);
    const o2 = document.createElement("option");
    o2.value = sign;
    o2.textContent = cap(sign);
    a.appendChild(o1);
    b.appendChild(o2);
  }
  b.value = "libra";
}

function bindEvents() {
  // Navigation
  document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => routeTo(btn.dataset.route));
  });

  // Auth
  $('btnAuth').addEventListener('click', () => {
    if (state.user) {
      routeTo('profile');
    } else {
      openModal('authModal');
    }
  });

  $('closeAuthModal').addEventListener('click', () => closeModal('authModal'));
  $('authModal').querySelector('.modalBackdrop').addEventListener('click', () => closeModal('authModal'));

  // Auth tabs
  document.querySelectorAll('.authTab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.authTab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      $('signInForm').classList.toggle('hidden', tab.dataset.auth !== 'signin');
      $('signUpForm').classList.toggle('hidden', tab.dataset.auth !== 'signup');
    });
  });

  // Sign in form
  $('signInForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('signInError').classList.add('hidden');
    await signIn($('signInEmail').value, $('signInPassword').value);
  });

  // Sign up form
  $('signUpForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('signUpError').classList.add('hidden');
    await signUp(
      $('signUpEmail').value,
      $('signUpPassword').value,
      $('signUpName').value,
      $('signUpSign').value
    );
  });

  $('continueAsGuest').addEventListener('click', () => closeModal('authModal'));
  $('btnProfileSignIn').addEventListener('click', () => openModal('authModal'));
  $('btnSignOut').addEventListener('click', signOut);
  $('btnSaveProfile').addEventListener('click', saveProfile);

  // Premium
  $('btnPremium').addEventListener('click', () => {
    if (!state.premium) {
      showPaymentModal('subscription');
    }
  });
  $('btnUpgrade').addEventListener('click', () => showPaymentModal('subscription'));
  $('btnUnlockPalm').addEventListener('click', () => showPaymentModal('palm'));
  $('btnUnlockHoro').addEventListener('click', () => showPaymentModal('horoscope'));
  $('btnUnlockCompat').addEventListener('click', () => showPaymentModal('compat'));

  // Payment modal
  $('closePaymentModal').addEventListener('click', () => closeModal('paymentModal'));
  $('paymentModal').querySelector('.modalBackdrop').addEventListener('click', () => closeModal('paymentModal'));

  // Camera
  $('btnOpenCamera').addEventListener('click', openCamera);
  $('closeCameraModal').addEventListener('click', () => closeModal('cameraModal'));
  $('switchCamera').addEventListener('click', switchCamera);
  $('captureBtn').addEventListener('click', capturePhoto);
  $('retakePhoto').addEventListener('click', retakePhoto);
  $('usePhoto').addEventListener('click', usePhoto);

  // Palm input (file upload)
  $('palmInput').addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    state.palm.file = file;
    const reader = new FileReader();
    reader.onload = () => {
      state.palm.dataUrl = String(reader.result);
      $('palmPreview').src = state.palm.dataUrl;
      $('palmPreview').classList.remove('hidden');
      $('previewPlaceholder').classList.add('hidden');
      $('btnAnalyzePalm').classList.remove('hidden');
      setTimeout(() => drawOverlayDemo($('palmPreview')), 50);
    };
    reader.readAsDataURL(file);
  });

  $('btnAnalyzePalm').addEventListener('click', analyzePalm);

  // Horoscope
  $('btnGetHoroscope').addEventListener('click', getHoroscope);

  // Compatibility
  $('btnCompat').addEventListener('click', checkCompatibility);

  // Resize handler for palm overlay
  window.addEventListener('resize', () => {
    const img = $('palmPreview');
    if (img && img.src && !img.classList.contains('hidden')) {
      drawOverlayDemo(img);
    }
  });
}

async function boot() {
  initSupabase();
  initStripe();
  initSignSelects();
  bindEvents();

  await checkAuth();
  updatePremiumUI();
  routeTo('palm');

  // Check for payment success/cancel in URL
  const params = new URLSearchParams(window.location.search);
  if (params.get('payment') === 'success') {
    showToast('Payment successful! Refreshing...', 'success');
    await loadProfile();
    updatePremiumUI();
    window.history.replaceState({}, '', window.location.pathname);
  } else if (params.get('payment') === 'cancelled') {
    showToast('Payment cancelled', 'info');
    window.history.replaceState({}, '', window.location.pathname);
  }
}

// Start the app
boot();
