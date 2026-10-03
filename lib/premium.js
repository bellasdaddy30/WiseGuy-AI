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
  pro: {
    id:      'pro',
    label:   'Pro',
    price:   '$8',
    period:  '/mo',
    description: 'Unlock the full experience.',
    cta:     'Upgrade to Pro',
    color:   'var(--accent)',
    highlight: true,
  },
};

// Personas available on the free tier. Pro unlocks everything.
export const FREE_PERSONAS = new Set([
  'smartass', 'unfiltered', 'roast_master', 'hype_man',
  'street_smart', 'conspiracy_nut', 'professional',
  'coach', 'therapist', 'philosopher',
]);

// TTS providers available on the free tier.
export const FREE_TTS = new Set(['browser', 'google']);

// Conversation history limit per tier.
export const HISTORY_LIMIT = { free: 10, pro: 50 };

export function isPersonaFree(id)   { return FREE_PERSONAS.has(id); }
export function isPersonaPro(id)    { return !FREE_PERSONAS.has(id); }
export function isTtsFree(id)       { return FREE_TTS.has(id); }
export function isTtsPro(id)        { return !FREE_TTS.has(id); }

// Feature list shown on the pricing page.
export const PLAN_FEATURES = {
  free: [
    '10 core personas',
    'Browser & Google TTS',
    '10 saved conversations',
    'All AI models',
    'Conversation history',
    'Voice input',
  ],
  pro: [
    'All 15 personas (Comedian, Pirate, Evil Genius, Girlfriend, Boyfriend)',
    'ElevenLabs, OpenAI & Orpheus TTS',
    '50 saved conversations',
    'All AI models',
    'Full voice library access',
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
