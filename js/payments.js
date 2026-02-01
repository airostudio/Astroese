// AstroPalm - Payments Module

import { CONFIG } from './config.js';
import { state, stripe } from './state.js';
import { $, showToast, openModal, closeModal } from './utils.js';
import { updatePremiumUI } from './ui.js';

export function showPaymentModal(type) {
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
    btn.addEventListener('click', () => handlePayment(btn.dataset.price, btn.dataset.type));
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
