// AstroPalm MVP (HTML5) — entertainment demo
// Notes:
// - Palm "AI" here is simulated. Replace analyzePalmDemo() with a real backend call if desired.
// - Premium paywalls are toggled locally (no real payments in this MVP).

const state = {
  premium: false,
  credits: 10,
  profile: {
    displayName: "Guest",
    saved: [] // {type, title, createdAt, payload}
  },
  palm: {
    file: null,
    dataUrl: null
  }
};

const SIGNS = [
  "aries","taurus","gemini","cancer","leo","virgo",
  "libra","scorpio","sagittarius","capricorn","aquarius","pisces"
];

function $(id) { return document.getElementById(id); }

function formatNow() {
  const d = new Date();
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function setPremium(on) {
  state.premium = on;
  $("premiumState").textContent = on ? "ON" : "OFF";

  // show/hide paywalls + premium panes messaging
  $("palmPaywall").style.display = on ? "none" : "block";
  $("horoPaywall").style.display = on ? "none" : "block";
  $("compatPaywall").style.display = on ? "none" : "block";

  if (!on) {
    $("horoPremium").textContent = "Premium is off.";
  }
}

function saveReading(type, title, payload) {
  state.profile.saved.unshift({
    type, title,
    createdAt: formatNow(),
    payload
  });
  renderSaved();
}

function renderSaved() {
  const saved = state.profile.saved;
  if (!saved.length) {
    $("savedReadings").classList.add("muted");
    $("savedReadings").textContent = "None yet.";
    return;
  }
  $("savedReadings").classList.remove("muted");
  $("savedReadings").textContent = saved
    .slice(0, 12)
    .map((x, i) => `${i+1}. [${x.type}] ${x.title} — ${x.createdAt}`)
    .join("\n");
}

function routeTo(route) {
  document.querySelectorAll(".tab").forEach(t => {
    t.classList.toggle("active", t.dataset.route === route);
  });
  document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
  $(`view-${route}`).classList.remove("hidden");
}

// ---------- Palm scan demo ----------
function drawOverlayDemo(imgEl) {
  const canvas = $("palmOverlay");
  const rect = imgEl.getBoundingClientRect();
  // match canvas to displayed size
  canvas.width = Math.max(1, Math.floor(rect.width));
  canvas.height = Math.max(1, Math.floor(rect.height));
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0,0,canvas.width,canvas.height);

  // draw semi-random lines to mimic "life/heart/head" line overlays
  // purely cosmetic
  const w = canvas.width, h = canvas.height;

  ctx.globalAlpha = 0.9;
  ctx.lineWidth = Math.max(2, Math.floor(Math.min(w,h) * 0.01));
  ctx.strokeStyle = "rgba(139,92,246,0.85)";

  const lines = [
    // "Heart line"
    [[w*0.18,h*0.35],[w*0.45,h*0.28],[w*0.76,h*0.34]],
    // "Head line"
    [[w*0.22,h*0.48],[w*0.50,h*0.52],[w*0.82,h*0.56]],
    // "Life line"
    [[w*0.35,h*0.30],[w*0.26,h*0.55],[w*0.38,h*0.82]],
  ];

  for (const pts of lines) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    ctx.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1]);
    ctx.stroke();
  }

  // labels
  ctx.font = `${Math.max(12, Math.floor(Math.min(w,h)*0.045))}px system-ui`;
  ctx.fillStyle = "rgba(242,244,255,0.9)";
  ctx.fillText("Heart", w*0.70, h*0.30);
  ctx.fillText("Head",  w*0.74, h*0.58);
  ctx.fillText("Life",  w*0.22, h*0.80);

  ctx.globalAlpha = 1;
}

function analyzePalmDemo() {
  // Simulated "AI" — do NOT represent as real palmistry accuracy
  const traits = [
    "steady energy","quick intuition","resilient mindset","creative problem-solving",
    "strong boundaries","empathetic presence","adaptable spirit","focused ambition"
  ];
  const challenges = [
    "overthinking","taking on too much","people-pleasing","impatience with slow progress",
    "being too self-critical","avoiding rest","mixed signals in relationships"
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
    heart: Math.floor(55 + Math.random()*40),
    head:  Math.floor(55 + Math.random()*40),
    life:  Math.floor(55 + Math.random()*40)
  };

  const base =
`Palm Reading (Entertainment)
• Heart line: ${lineScores.heart}/100 — emotional style leans toward ${pick(["warm","guarded","direct","idealistic"])}.
• Head line: ${lineScores.head}/100 — mental approach feels ${pick(["analytical","vision-driven","practical","curious"])}.
• Life line: ${lineScores.life}/100 — overall drive looks ${pick(["steady","bursty","consistent","restless"])}.

Strong signal: ${pick(traits)}
Watch-out: ${pick(challenges)}
Guidance: ${pick(guidance)}
`;

  if (!state.premium) {
    return base + "\n(Unlock Premium for deeper detail + 'year-ahead' themes.)";
  }

  const premiumAdd =
`\nPremium Deep-Dive
• Relationship vibe: ${pick(["loyal but selective","intense and sincere","playful and open","calm and committed"])}
• Career tendency: ${pick(["independent builder","team catalyst","strategic planner","creative finisher"])}
• Next 30 days: ${pick([
  "A new opportunity appears through a casual conversation.",
  "Clearing clutter (digital or physical) boosts focus dramatically.",
  "A relationship improves when you state needs plainly.",
  "Momentum rises after you protect your sleep and routines."
])}
Lucky cue: ${pick(["moonlight walks","fresh starts on Mondays","journaling","water/sea time","a short solo trip"])}
`;

  return base + premiumAdd;
}

// ---------- Horoscope demo ----------
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

  const free =
`${title}
Theme: ${pick(themes[focus])}
Today's nudge: ${pick(actions)}.
`;

  const premium =
`Premium add-on
Deeper message: Your best results come from consistency over intensity — keep it simple and repeatable.
Lucky cue: ${pick(["number 4","number 9","a purple accent","a late afternoon decision","a short voice note"])}
Avoid: ${pick(["impulse spending","doom scrolling","mixed signals","rushing the first draft"])}
`;

  return { title, free, premium };
}

// ---------- Compatibility demo ----------
function compatDemo(a, b, mode) {
  // deterministic-ish seed from strings
  const seed = (a + "|" + b + "|" + mode).split("")
    .reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7);

  const score = 45 + (seed % 56); // 45..100
  const strengths = [
    "shared humor","emotional balance","mutual ambition","easy communication",
    "strong loyalty","creative chemistry","growth mindset","grounded teamwork"
  ];
  const frictions = [
    "different pacing","stubborn moments","misread signals","avoidance of conflict",
    "control vs freedom","mixed priorities","overthinking small stuff"
  ];
  const pickFromSeed = (arr, n) => arr[(seed + n*97) % arr.length];

  const title = `${cap(a)} + ${cap(b)} (${cap(mode)})`;
  const text =
`${title}
Score: ${score}/100

What works: ${pickFromSeed(strengths,1)} and ${pickFromSeed(strengths,2)}.
Watch for: ${pickFromSeed(frictions,1)}.
Best move: Pick one shared goal this week and keep it measurable.
`;

  const premium =
`Premium expanded report
• Communication style: One prefers direct clarity; the other prefers gentle pacing — agree on a "check-in" rhythm.
• Conflict tip: Name the feeling first, then the request.
• Growth potential: High if you respect differences and avoid scorekeeping.
`;

  return { title, score, text, premium };
}

// ---------- Live experts (UI demo) ----------
const EXPERTS = [
  { name: "Mina", specialties: "Palmistry • Love readings", rate: 2.49, status: "online" },
  { name: "Arjun", specialties: "Birth charts • Compatibility", rate: 3.99, status: "online" },
  { name: "Selene", specialties: "Career astrology • Timing", rate: 4.99, status: "busy" },
  { name: "Kai", specialties: "Quick palm scan • Energy", rate: 1.99, status: "online" }
];

function renderExperts() {
  const wrap = $("expertList");
  wrap.innerHTML = "";

  for (const ex of EXPERTS) {
    const div = document.createElement("div");
    div.className = "expert";

    const badgeClass = ex.status === "online" ? "badge online" : "badge busy";
    const badgeText = ex.status === "online" ? "Online" : "Busy";

    div.innerHTML = `
      <div class="expertTop">
        <div>
          <div style="font-weight:800">${ex.name}</div>
          <div class="tiny muted">${ex.specialties}</div>
        </div>
        <div class="${badgeClass}">${badgeText}</div>
      </div>
      <div class="row" style="margin:0">
        <div class="tiny muted">$${ex.rate.toFixed(2)}/min</div>
        <div style="flex:1"></div>
        <button class="primary" ${ex.status !== "online" ? "disabled" : ""} data-call="${ex.name}">
          Start Session
        </button>
      </div>
    `;
    wrap.appendChild(div);
  }

  wrap.querySelectorAll("button[data-call]").forEach(btn => {
    btn.addEventListener("click", () => startSession(btn.dataset.call));
  });
}

function startSession(expertName) {
  // Simple credit burn simulation (1 minute)
  if (state.credits <= 0) {
    alert("You have no credits. Add credits to start a session.");
    return;
  }
  state.credits -= 1;
  $("creditBalance").textContent = String(state.credits);
  alert(`Connecting to ${expertName}...\n(Demo) 1 credit used for 1 minute.`);
}

// ---------- Utilities ----------
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ---------- Init ----------
function initSignSelects() {
  const a = $("compatA"), b = $("compatB");
  for (const sign of SIGNS) {
    const o1 = document.createElement("option");
    o1.value = sign; o1.textContent = cap(sign);
    const o2 = document.createElement("option");
    o2.value = sign; o2.textContent = cap(sign);
    a.appendChild(o1); b.appendChild(o2);
  }
  b.value = "libra";
}

function bindNav() {
  document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => routeTo(btn.dataset.route));
  });
}

function bindPremium() {
  $("btnPremium").addEventListener("click", () => setPremium(!state.premium));

  $("btnUnlockPalm").addEventListener("click", () => setPremium(true));
  $("btnUnlockHoro").addEventListener("click", () => setPremium(true));
  $("btnUnlockCompat").addEventListener("click", () => setPremium(true));
}

function bindPalm() {
  $("palmInput").addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    state.palm.file = file;
    const reader = new FileReader();
    reader.onload = () => {
      state.palm.dataUrl = String(reader.result);
      $("palmPreview").src = state.palm.dataUrl;
      // wait for layout then overlay
      setTimeout(() => drawOverlayDemo($("palmPreview")), 50);
    };
    reader.readAsDataURL(file);
  });

  $("btnAnalyzePalm").addEventListener("click", () => {
    if (!state.palm.dataUrl) {
      alert("Please upload a palm image first.");
      return;
    }
    const result = analyzePalmDemo();
    $("palmResult").classList.remove("muted");
    $("palmResult").textContent = result;

    saveReading("Palm", "Palm scan reading", { result });
  });

  // redraw overlay on resize
  window.addEventListener("resize", () => {
    const img = $("palmPreview");
    if (img && img.src) drawOverlayDemo(img);
  });
}

function bindHoroscope() {
  $("btnGetHoroscope").addEventListener("click", () => {
    const sign = $("signSelect").value;
    const focus = $("focusSelect").value;
    const { title, free, premium } = horoscopeDemo(sign, focus);

    $("horoFree").classList.remove("muted");
    $("horoFree").textContent = free;

    if (state.premium) {
      $("horoPremium").classList.remove("muted");
      $("horoPremium").textContent = premium;
    } else {
      $("horoPremium").classList.add("muted");
      $("horoPremium").textContent = "Premium is off.";
    }

    saveReading("Horoscope", title, { sign, focus, free, premium: state.premium ? premium : null });
  });
}

function bindCompat() {
  $("btnCompat").addEventListener("click", () => {
    const a = $("compatA").value;
    const b = $("compatB").value;
    const mode = $("compatMode").value;

    const { title, score, text, premium } = compatDemo(a,b,mode);

    $("compatBar").style.width = `${score}%`;
    $("compatScore").classList.remove("muted");
    $("compatScore").textContent = `${score}%`;

    $("compatText").classList.remove("muted");
    $("compatText").textContent = state.premium ? (text + "\n" + premium) : text;

    saveReading("Compatibility", title, { a,b,mode,score, text: state.premium ? (text + "\n" + premium) : text });
  });
}

function bindLive() {
  $("btnAddCredits").addEventListener("click", () => {
    state.credits += 10;
    $("creditBalance").textContent = String(state.credits);
    alert("Credits added! (Demo)");
  });
}

function bindProfile() {
  $("displayName").value = state.profile.displayName;
  $("btnSaveProfile").addEventListener("click", () => {
    state.profile.displayName = $("displayName").value.trim() || "Guest";
    alert("Saved.");
  });
}

function boot() {
  bindNav();
  bindPremium();
  initSignSelects();
  bindPalm();
  bindHoroscope();
  bindCompat();
  bindLive();
  bindProfile();
  renderExperts();
  renderSaved();
  setPremium(false);
  routeTo("palm");
}

boot();
