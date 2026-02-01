// AstroPalm - UI Update Functions

import { state } from './state.js';
import { $ } from './utils.js';

export function updateAuthUI(loggedIn) {
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

export function updateProfileUI() {
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

export function updatePremiumUI() {
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

export function routeTo(route) {
  document.querySelectorAll(".tab").forEach(t => {
    t.classList.toggle("active", t.dataset.route === route);
  });
  document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
  $(`view-${route}`).classList.remove("hidden");
}
