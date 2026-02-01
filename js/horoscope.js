// AstroPalm - Horoscope Module

import { state, supabase } from './state.js';
import { $, showToast, cap } from './utils.js';
import { loadSavedReadings } from './auth.js';

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

export async function getHoroscope() {
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
