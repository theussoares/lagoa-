---
target: landing page apps/site
total_score: 25
max_score: 36
na_heuristics: 7
p0_count: 0
p1_count: 3
target_identity: "file:/Users/matheus.soares/Documents/lagoa-/.claude/worktrees/lagoa-landing-page-a211a8/apps/site/app/pages/index.vue"
target_fingerprint: "sha256:206b598e06cba695bfa0d5044c5579c145b5417035c98325669135380c3bb89d"
target_path: /Users/matheus.soares/Documents/lagoa-/.claude/worktrees/lagoa-landing-page-a211a8/apps/site/app/pages/index.vue
timestamp: 2026-10-03T04-29-41Z
slug: apps-site-app-pages-index-vue
---
# Critique: apps/site landing page (merchant)
Score 25/36 (7 n/a, 10 scored 3). P1: no trust anchor (no person/number/what happens next); mockups hand-drawn, real ui components (LaunchReceipt, RedemptionStub, ChallengeCard, CheckInPoster, RewardSeal) and red reward stamp never shown; prod links baked to localhost / empty WhatsApp number at generate.
P2: mobile hero has no product above fold + receipt touches edge; fake primary buttons in mockups; redundant IA (Values repeats How/Network, 9 eyebrows, 13 screens on mobile); no mobile nav; hero h1->h3 heading skip; redeem code silent to SR; logo link 32px tall; h1 hidden by .rise (LCP); ~195KB gzip JS for static page; no og:image/favicon/robots/canonical; SlotRow wraps 9+1 at 1280.
P3: new-tab not announced; toast region label in English; dark-mode Bonus band same color as body; 3 different CTA labels.
Detector: CLI clean; overlay 17 (8 gray-on-color false positive >=4.71:1, 9 kicker-above-heading design call).
