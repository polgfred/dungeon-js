# Dungeon of Doom v2 — Planning Notes (Historical)

> **⚠️ Historical document.** These are the *original* v2 planning notes, written before any v2 code existed. They are preserved here as a record of how the design was reasoned out — **not** as a current spec. Since they were written, v2 was actually built, and several decisions below were **reversed or superseded**. The most consequential: **v2 pivoted from turn-based to free-action (anyone acts anytime) on 2026-06-10.** That single change invalidates much of the turn-based reasoning below.
>
> **Provenance.** Synthesizes two sources: (1) a multiplayer / Durable Objects design thread from session `799cfb1b` (the v2 concept); (2) the v1 design-philosophy session `af0506f7` (2026-05-29) — loss-stakes, the lying mirror, negative-space/EV design, systemic emergence, restraint.
>
> **Outcome tags** (added retroactively to mark what actually happened):
> - ✅ **KEPT** — survived into the real build.
> - ❌ **REVERSED** — a position taken here that was later decided *against*.
> - 🔄 **SUPERSEDED** — overtaken by the free-action pivot; no longer applicable as framed.
> - ❓ **STILL OPEN** — never resolved; carried forward.
>
> The *original* in-chat tags (**[decided]/[leaning]/[open]/[inferred]**) are left in place as the historical record of confidence *at the time*. The ▸ **Verdict** lines are the retroactive truth.

---

## 1. Premise & scope

- **v1 stays as-is:** fully client-side, browser-only, no backend, honor-system difficulty. The "don't add a server" stance applies to **v1**.
- **v2 is a separate, future game** built without the 1987 constraints. It is allowed a backend. The leading concept:
  > **"DofD v2 could be multiplayer where you take turns in a dungeon backed by Durable Objects."** *(original idea, verbatim)*
- v2 is the umbrella for *any* future-game direction; cooperative multiplayer-on-DO is the front-runner, not a foregone conclusion.

▸ **Verdict: ✅ KEPT** (premise) / 🔄 **SUPERSEDED** (the "take turns" half). v2 is indeed a separate, backend-having, co-op multiplayer-on-DO game. But "take turns" was abandoned — see §2.

## 2. The leading concept: cooperative multiplayer on Cloudflare Durable Objects

A shared, turn-based dungeon crawl for a small party, refereed by a single authoritative server actor. **[decided]** that it's **co-op**, not competitive (see §4).

▸ **Verdict: ✅ KEPT** that it's co-op, party-based, server-refereed on DOs. **🔄 SUPERSEDED** that it's *turn-based*. **The 2026-06-10 pivot made v2 free-action: anyone can act at any time**, refereed by the authoritative DO. The engine was refactored accordingly (`Game.players` map, vitality tracked on the room, global treasures, per-player observed-tile map memory).

## 3. Why Durable Objects fit (architecture rationale)

Turn-based is close to the textbook case for DOs (in a way realtime action games are *not*):

- **One dungeon = one DO instance** — a single-threaded, globally-addressable actor that is the sole authority on the shared map and who's standing where. Messages process serially, so there are **no races to reason about**.
- **`idFromName(roomCode)`** maps a shareable room code straight to an instance — the "room/lobby" primitive is free.
- **WebSocket Hibernation API** — evicts the DO from memory while keeping sockets alive, so you're not billed for idle wall-clock.
- **Transactional, colocated storage** — dungeon state survives eviction and player disconnects for free; reconnection becomes trivial.
- **Server-authoritative RNG** lives in the DO, so no client can peek or cheat the dungeon.

▸ **Verdict: ✅ KEPT** — DOs were the right call and v2 runs on them. **One caveat 🔄 SUPERSEDED:** the *hibernation* argument was premised on "idle for *minutes* between turns." Free-action means activity comes in bursts, not slow turns, so the "pure upside, this is the one idle genre" framing is weaker than written — hibernation still helps between sessions, just not the way the turn-based pitch claimed. The serial-message / single-authority and `idFromName` points are exactly as valuable as stated. The **[inferred]** "engine moves into the DO as the authoritative core, clients become filtered views" came true (✅) — and see the [[reference_map_wire_integrity]] decision: the server resolves the map to *observed tiles* and never ships unexplored room data.

## 4. Design decisions so far (co-op rules)

- **[decided] Cooperative campaign.** Win condition: **everyone lives, the party collects all treasures together, and all players reach the exit.** — ▸ ✅ **KEPT — verified in `engine.ts`.** All 10 treasures (a single global `treasuresFound` set) gate the exit action itself — no one can leave until they're all found — and `Mode.VICTORY` fires only when `allExited()` is true (the last player steps out). Death is instant party-fail, so "everyone lives" is structural.
- **[decided] One player acts at a time** (round-robin, per-player turns) — *not* simultaneous-declare. Watching a teammate move is half the game. — ▸ ❌ **REVERSED.** This is the headline casualty of the free-action pivot. There is no turn order; anyone acts anytime.
- **[decided] Players spread out** across the dungeon rather than moving as a single blob. — ▸ ✅ **KEPT** (and reinforced: teams now *start scattered* on the first floor).
- **[leaning] A rescue window on death** rather than instant party-fail: a downed player, a ticking clock, the agonizing go-back-or-abandon choice. — ▸ ❌ **REVERSED / decided against. The death model is instant party-fail.** The rescue-window idea was attractive but not adopted; "everyone must live" is enforced immediately on any death.

### Why this *protects* the soul (the key insight)
If each player has an independent chance of death and the rule is "everyone must live," **party-wipe probability compounds with party size**: three players at ~20% each ≈ **~49% wipe**. That reproduces v1's "lose ~half the time" feel **emergently** — the dungeon doesn't get harder; *more friends is the difficulty knob*. Same emergent-from-constraint move as the mirror endgame.

▸ **Verdict: ✅ KEPT — and *strengthened* by the instant-party-fail decision above.** With no rescue window, the compounding-death math holds at full force. See also [[project_depth_coop_pressure]]: depth = 5+2n and the monster floor clamped at z≥7 (the [8,10] band) deliberately force ganging up on deep floors. *More friends is the difficulty knob* is now load-bearing and built.

### The central tension to design around
Co-op normally makes a game *easier* — but "everyone must live" means *more bodies to keep alive through the same meat grinder*. The good version is where both are true at once:
- **Fan out to win** (cover more dungeon, grab treasures faster) **vs. stay close to survive.**
- **Convergence moments** — when the spread-out party must physically regroup — are where the squeeze is felt.

▸ **Verdict: ✅ KEPT in spirit**, with one premise gone: the original "stay close so the *rescue mechanic* can reach you" rationale died with the rescue window (❌). The fan-out-vs-converge tension now lives in *combat survival* — deep-floor monsters force the party to gang up (see [[project_depth_coop_pressure]]) — rather than in body-recovery.

## 5. The information / secrecy principle (load-bearing)

**[decided]** Do **not** build any mechanic whose entire value is hiding information *between players*. Players will be on Discord/voice — fog-of-war-as-secrecy is dead on arrival. Don't fight what you can't enforce.

Instead, invest in what **survives an open voice channel**:
- **Physical / temporal constraints** — *position* and *timing* don't transmit.
- **Against-the-game constraints** — server RNG, and especially the lying mirror: a secret the game keeps from *everyone, including the holder*.

**Consequence — per-player maps are a *rendering* concern, not a secrecy/anti-cheat feature.** The DO holds one authoritative map; each client gets a view filtered to its own explored set.

▸ **Verdict: ✅ KEPT — fully.** This principle survived intact and shaped real architecture. Per-player maps as rendering-only is now implemented and documented in [[reference_map_wire_integrity]]: the server ships only observed tiles, which also closes the old v1 map-hack — *not* as anti-cheat machinery, just by never sending unearned data.

### The mirror in co-op
PvP bluffing is gone, but the **gamble-against-the-game survives** — *one mirror, it lies once, the whole party stares at it — do we trust it?*

▸ **Verdict: ❌ REVERSED (the "one shared mirror, hand it off" framing).** This was a turn-based-era invention that didn't survive. **Mirrors work exactly as in v1: a mirror reports a vision — lie or truth — to the individual looker, then disappears.** It is a per-looker encounter item, *not* a single shared key item the party passes around. The deeper principle still holds (✅): the mirror's lie is hidden from *everyone including the looker*, so an open voice channel can't leak what nobody knows — that's still the one robust form of hidden info. See [[reference_mirror_endgame_design]] and [[reference_map_wire_integrity]] (the mirror's coordinate hint is IQ-gated and more often a lie than truth below IQ 17, so it isn't a real leak).

## 6. Open questions / next decisions — *resolutions*

- ~~**[open]** Finalize the death model.~~ → ▸ **RESOLVED: instant party-fail** (rescue window decided against; see §4).
- ~~**[open]** Turn resolution detail (immediate vs once-per-round).~~ → ▸ **🔄 MOOT.** Free-action: there are no turns to resolve.
- ~~**[open]** Party size range and difficulty scaling.~~ → ▸ **RESOLVED: depth = 5+2n**, monster floor clamped at z≥7 ([8,10] band); party size *is* the difficulty knob ([[project_depth_coop_pressure]]).
- ~~**[open]** Shared vs individual resources.~~ → ▸ **RESOLVED: treasures are shared/global; everything else (flares, spells, consumables) is per-player.** The mirror is *not* a pooled key item — it's a per-looker encounter (§5.1).
- ~~**[open]** Combat assist in multiplayer.~~ → ▸ **RESOLVED in spirit:** ganging up on deep-floor monsters is the intended survival play; with free-action there's no turn-economy cost to gate it.
- **[open]** Campaign persistence — suspend/resume across sessions via DO storage? AFK policy? → ▸ ❓ **STILL OPEN** (not captured in memory; verify against current code before relying on this).
- ~~**[open]** Player identity.~~ → ▸ **RESOLVED: anonymous + room code.** Lobby onboarding is "Start a game / Enter a code," with home and `/play/<code>` routes; the lobby is a phase of `/play` ([[project_dungeon_v2_lobby_onboarding]]).
- ~~**[open]** How much of `engine.ts` runs server-side, and the protocol shape.~~ → ▸ **RESOLVED in broad strokes:** the engine is server-authoritative inside the DO and was refactored for multiplayer; clients are filtered views. Exact wire protocol details live in code, not here.

## 7. Inherited design philosophy (guardrails carried from v1)

▸ **Verdict: ✅ KEPT — all of it.** These remain the active guardrails (full detail in agent memory):

- **The loss-stakes soul is sacred** — you lose ~half the time, and that's the point. v2's compounding-death is the expression of it. ([[feedback_dungeon_soul_loss_stakes]])
- **Negative-space / EV-marginal design** — most interactions should be bad ideas most of the time.
- **Systemic emergence > authored content** — the best mechanics are *found* latent in constraints (the lying mirror), not designed up front. ([[feedback_restraint_all_the_way_down]])
- **Restraint is the generative method** — don't pitch shiny new mechanics; use what's already true.
- **Period-correct aesthetic** — the *world* stays strict 1987 Atari 8-bit; the *frame* may be knowingly modern but never beyond believable. ([[feedback_period_correct_authenticity]])

## 8. Next steps (as written then) — *status*

1. ~~Decide the **rescue-window vs instant-fail** death model.~~ → ▸ **DONE: instant-fail.**
2. ~~Run `/shaping` or `/brainstorm` to shape the concept.~~ → ▸ Superseded by the free-action pivot and direct implementation.
3. ~~Spike the thinnest possible DO turn loop.~~ → ▸ **DONE / superseded** — v2 was built on DOs (free-action, not the turn loop described).

---

*This document is closed for new planning. For current v2 state, see the codebase and agent memory ([[project_dungeon_v2]], [[project_depth_coop_pressure]], [[reference_map_wire_integrity]], [[project_dungeon_v2_lobby_onboarding]]).*
