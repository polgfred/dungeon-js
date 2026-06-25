# The Dungeon of Doom — Instruction Sheet (draft)

> Working draft for iteration. **Part 1** is the player-facing sheet (in the game's voice). **Part 2** is designer's notes — the include/withhold reasoning and the gray-area ledger. Part 2 is _not_ shown to players.

---

## Part 1 — The Sheet

> # THE DUNGEON OF DOOM
>
> _An Adventure for the Bold, the Doomed, and Their Companions_
>
> Beneath the world lies the DUNGEON of DOOM, and in its dark are hidden ten treasures of unspeakable worth. Many have gone seeking them. The dungeon is still waiting.
>
> ### THY QUEST
>
> Enter together. Recover all ten treasures. Climb back to the light and step out of the dungeon's mouth — **every last one of you.** The quest is won only when all ten treasures are found _and_ every adventurer has escaped. Leave a treasure in the dark and the exit will not have you. Leave a companion in the dark and you have not won at all.
>
> ### THE PRICE
>
> The dungeon is not fair, and was never meant to be. Should even one of you fall, the quest falls with them — there is no coming back for the dead, and no triumph without them. Most parties do not climb out. This is not a flaw in the dungeon. This _is_ the dungeon.
>
> ### HOW YOU ASCEND
>
> There are no turns to wait for, and no clock to race. **The dungeon does nothing until one of you does something** — so move as one or scatter to the corners, hurry or hold still. You may stop and take counsel for as long as you please; nothing creeps closer while you talk.
>
> You each carry your own memory of the dark — what one of you has walked, another has not seen. So speak to one another. A dungeon is best survived out loud.
>
> ### WHAT YOU MAY DO
>
> - **Walk** the halls in any direction.
> - **Look** about you, and consult what map you have earned.
> - **Carry and spend** what you find — light, and other aids. The dark is deep and your supplies are not. Spend wisely.
> - **Stand and fight** what bars your way.
> - **Gaze** into any mirror you find. The glass shows each gazer a vision — though not the same vision to every gazer, nor always a true one.
> - **Take the exit** when your work is done — and wait there for your companions.
>
> ### A WORD BEFORE YOU GO
>
> Not everything in the dark wishes you well, and not everything that _offers_ to help is honest. Some of what you find will be a gift, and some will be a grin. We will tell you no more than this: the rest you must learn in the dark, as every soul before you has. That learning is the whole of the game.
>
> Go in together. Come up together. Or do not come up at all.
>
> **ALL HAIL THE VICTOR.**

---

## Part 2 — Designer's notes (not player-facing)

### The line we're drawing

**Give:** rules, stakes, tone. **Withhold:** texture and discovery. The dodge is _in-voice_ (set a suspicious posture without handing over facts), never absent — the sheet should wink that depth exists, not pretend the dungeon is shallow.

- **Given:** win condition (all treasures + everyone out), death = whole-party loss, no-turns/no-clock freedom, per-player maps + "talk to each other," the basic verbs, the cruel period voice. None of this is discoverable joy — it's the premise, and players need the stakes _going in_ for their choices to weigh anything. Telling them the dungeon _waits_ is essential, or they play tense and never use the deliberation the design hands them.
- **Withheld:** the EV-marginal soul (chests bite, potions lie, most temptations are bad bets); the mirror's lying and its IQ correlation; every emergent co-op tactic (casting your champion, your mirror-reader, your scout-as-eyes, escorting the weak to the door); the compounding-death knob (more players = harder). Naming any of these caps the thing the whole design works _not_ to cap.

### Gray-area ledger

**The mirror / IQ correlation — the hard case.** We don't want to state "the mirror gets more accurate the smarter you are" — but a player is unlikely to _infer_ the correlation unaided. The reason it's near-undiscoverable solo: it's probabilistic (P(truth) = iq/50), so a single look is pure noise, and a solo player only ever has _one_ IQ — no variation to correlate against. They'd just conclude "mirrors are unreliable" and never attribute it to wits.

**Co-op is the discovery mechanism.** The variation a solo player lacks is exactly what a party _has_ — different members, different IQs, side by side. When the sharp one's visions keep panning out and the dim one's keep being lies, the party _notices the pattern_ ("the glass likes Greg") and surfaces it through table-talk — the precise information-sharing the game is built to produce. So the answer isn't to state it; it's to make the leap _available_ and let co-op do the rest. Three non-stating levers:

1. **Theme the stat (cheapest, manual-side).** If IQ is themed as clarity / wits / perception in character creation and flavor, a player primed that "wits = seeing truly" will form the hypothesis "maybe my fool can't read the glass" when lied to. Theming makes the inference reachable without naming it.
2. **Hint that the _looker_ matters (manual-side). — ADOPTED.** The sheet now reads _"The glass shows each gazer a vision — though not the same vision to every gazer, nor always a true one."_ Points at the variable (the looker) without naming the trait or its direction; invites "let's try different people," which surfaces the correlation through play.
3. **In-the-moment sensory cue (engine-side, optional).** Let vision "cloudiness" scale with IQ — the dim looker gets murky/garbled glimpses more often, the sharp one clear ones. Points the player at _the person_ viscerally, not just the outcome. (Engine already uses a "the mirror is cloudy" vision in the lie branch — this would be making that frequency IQ-dependent. Bigger change than wording; flagged as a lever, not a decision.)

   _Recommendation:_ do (1) for free, and adopt (2) unless it reads as too much; treat (3) as a fallback only if playtests show parties still miss the correlation.

**Detectability check (verified against engine).** Is the IQ gap "different enough to notice"? Numbers:

- _Sample size — fine._ Mirrors are ~7% of rooms (`rng.random() > 0.3`, then roll 1 of 1–10 = `MIRROR`). At FLOOR_SIZE=7 → 49 rooms/floor × ~9 floors (depth = 5+2n, 2 players) ≈ **~30 mirrors/run**. Abundant even split across a party.
- _Spread — real but all-low._ IQ ranges 1–18 (capped, `model.ts`); realistic builds ≈ 6 (dump-IQ dwarf) to 18 (max-IQ elf). P(truth) = iq/50 → **12% vs 36%**, a 3× gap. But even maxed it's minority-truth: the contrast is between two _flavors of unreliable_, and people read gradients in rare-positive events poorly. Risk isn't missing the gap — it's writing off _all_ mirrors before parsing it.
- _What saves it — casting._ The gap only pops at the tails (a genuinely dim + a genuinely sharp character compared side by side); the IQ-10-vs-14 middle is noise. Co-op specialization manufactures exactly those tail-spread builds (bruiser + thinker), so the correlation is legible _because_ parties specialize — self-supporting, nothing to add. See [[project_coop_role_specialization]].
- _If it ever fails playtest:_ the fix is NOT raising truth rates (betrays the lying-mirror soul, [[reference_mirror_endgame_design]]) — it's widening the slope or theming IQ harder.

**Race stat-biases — the hint that's _given_ (data shown), inference withheld.** Unlike the mirror, this hint can't be hidden — `rollBaseStats` biases are visible at creation (Dwarf strong/dim/tough, Elf smart/deft/frail, Halfling nimble, Human generalist = Tolkien archetypes). That's deliberate and good: it's the _seed_ of the discovery ladder. The game outsources the tutorial to shared fantasy literacy — priors come from Tolkien, the stat block confirms them, the player draws the inference "bring a variety." We give the _data_ and the _flavor_; we never state the _implication_ (diverse races → balanced party → specialization pays). Sits at the opposite end of the spectrum from the mirror (maximally visible vs maximally hidden), and the visible end is what makes the hidden end discoverable. **DECIDED — no races blurb in the sheet.** Subtlety ceiling is the collective nouns already present ("companions" / "together" / "every last one of you"); they establish the unit is a _party of distinct people_ and let the player infer "varied company" themselves. Anything describing races or tendencies over-tells. ("company" is an optional one-word swap if a more assembled-band feel is wanted; "companions" already does ~95% of it.)

**Party composition / "balance the party, not the character" — withheld.** In co-op the optimization unit shifts from character to party, and we don't say so. A well-rounded character is the _tempting-but-wrong_ play (negative-space recursed to party comp): four generalists = nobody sees the mirror tell truth (no IQ tail-spread), nobody can tank deep floors, casting buys nothing. The winning move is deliberately lopsided characters so the _party_ is balanced. Discovered socially by friction in the lobby and early floors — cooperation begins at character creation. The sheet's "you are not equally suited" temptation is left entirely to play; do **not** add a "recommended party" hint. See [[project_coop_role_specialization]].

**Other calls already made:**

- _Compounding death (more players = harder):_ withheld entirely — players should feel it the third time a friend gets them all killed, not read it on the box.
- _EV-traps (chests/potions):_ withheld; covered only by the posture-setting "not everything that offers help is honest." Posture is tone (fair to give); which-things-lie are facts (discovery).
