// ── Tier definitions ──────────────────────────────────────────────────────────
// Architecture only. No real billing here — this is where Stripe/billing plugs in.
// When a user upgrades, set session.user.plan = 'pro' server-side and
// useIsPremium() below will pick it up automatically.

export const PLANS = {
  free: {
    id:    'free',
    label: 'Free',
    price: '$0',
    period: '',
    description: 'Everything you need to get started.',
    cta:   'Current plan',
    color: 'var(--text-muted)',
  },
  companion: {
    id:          'companion',
    label:       'Companion Pack',
    price:       '$3',
    period:      '/mo',
    description: 'Add Girlfriend & Boyfriend personas. No full Pro required.',
    cta:         'Get Companion Pack',
    color:       '#e879a0',
    addon:       true,
  },
  pro: {
    id:      'pro',
    label:   'Pro',
    price:   '$8',
    period:  '/mo',
    description: 'Unlock the full experience — includes Companion Pack.',
    cta:     'Upgrade to Pro',
    color:   'var(--accent)',
    highlight: true,
  },
};

// Personas available on the free tier. Pro unlocks everything.
// Free (5): the product's identity + core utility — enough to show the value.
// Pro (10): entertainment, niche, and companion personas — the reason to upgrade.
export const FREE_PERSONAS = new Set([
  'wiseguy',       // flagship / default — always free
  'unfiltered',    // the differentiator — shows what the app can do
  'professional',  // work utility — hooks enterprise/productivity users
  'therapist',     // emotional utility — high retention
  'coach',         // motivational utility — broad appeal
]);

// Companion Pack add-on: Girlfriend + Boyfriend personas.
// Available standalone ($3/mo) or included in Pro.
export const COMPANION_PERSONAS = new Set(['girlfriend', 'boyfriend']);

// TTS providers available on the free tier.
export const FREE_TTS = new Set(['browser', 'google']);

// Voices that spend the owner's paid credits or shared quota. The server
// refuses these without the admin cookie (lib/adminAuth.js).
export const ADMIN_TTS = new Set(['elevenlabs', 'openai', 'orpheus']);

// Conversation history limit per tier.
export const HISTORY_LIMIT = { free: 10, pro: 50 };

export function isPersonaFree(id)       { return FREE_PERSONAS.has(id); }
export function isPersonaPro(id)        { return !FREE_PERSONAS.has(id) && !COMPANION_PERSONAS.has(id); }
export function isPersonaCompanion(id)  { return COMPANION_PERSONAS.has(id); }
export function isTtsFree(id)           { return FREE_TTS.has(id); }
export function isTtsPro(id)            { return !FREE_TTS.has(id); }
export function isTtsAdminOnly(id)      { return ADMIN_TTS.has(id); }

// Feature list shown on the pricing page.
export const PLAN_FEATURES = {
  free: [
    '5 core personas (WiseGuy, Unfiltered, Professional, Therapist, Coach)',
    'Browser & Google TTS',
    '10 saved conversations',
    'All AI models',
    'Voice input',
  ],
  companion: [
    'Girlfriend persona — warm, attentive, playful',
    'Boyfriend persona — confident, supportive, direct',
    'Works on Free or Pro — no full upgrade required',
    'Full voice support included',
  ],
  pro: [
    'All 15 personas — Roast Master, Hype Man, Philosopher, Conspiracy Nut, Comedian, Pirate, Evil Genius + more',
    'Companion Pack included (Girlfriend & Boyfriend)',
    '50 saved conversations',
    'Persistent memory across sessions',
    'Conversation sync across devices (coming soon)',
    'Custom persona builder (coming soon)',
    'Priority features & early access',
  ],
};

// ── Premium check ─────────────────────────────────────────────────────────────
// Client-side hook. Returns true when the current user has a Pro plan.
//
// Right now this always returns true — the full app is unlocked during
// development. When real billing is wired up:
//   1. On sign-in, fetch the user's subscription status from your DB.
//   2. Store it in the Auth.js session: session.user.plan = 'pro' | 'free'.
//   3. Pass it through SessionProvider so useSession() can read it here.
//   4. Replace `return true` below with `return session?.user?.plan === 'pro'`.
//
// Gate components should call this hook and show <PremiumGate> when false.
export function useIsPremium() {
  // TODO: replace with real subscription check when billing is live.
  // const { data: session } = useSession();
  // return session?.user?.plan === 'pro';
  return true; // dev mode — full access
}
