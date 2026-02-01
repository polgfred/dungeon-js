# Encounter Combat Test Plan

This plan targets the encounter fight loop behavior described in `Encounter_Combat_Spec.md`. It is designed for deterministic RNG-based tests and covers success/failure paths, damage ranges, and state transitions.

---

## 1) Test harness requirements

- Inject a deterministic `RandomSource` into `EncounterSession.start()` / `.resume()`.
- Provide helpers to:
  - Create a `Player` with explicit stats (ST/DX/IQ/HP/MHP), weapon/armor tiers, spell charges.
  - Create a `Room` with `monsterLevel` and `treasureId`.
  - Seed or scripted RNG responses for `randint()` and `random()`.
- Assertions for:
  - Returned events (`Event.kind`, text)
  - Encounter flags (`done`, `relocate`, `relocateAnyFloor`, `enterRoom`)
  - Player state changes (HP, tempArmorBonus, fatigued, weaponTier, spells)
  - Room state changes (monsterLevel, treasureId)

---

## 2) Deterministic RNG strategy

Use a scripted RNG with queued outputs:
- `random()` consumes from a queue of floats.
- `randint(min,max)` consumes a queue of integers and clamps/validates expected range.

Suggested pattern:
- Define tests with explicit RNG sequences to force specific branches.
- Validate that RNG consumption order matches expectations.

---

## 3) Core fight loop tests

### 3.1 Player miss and monster attacks
- Setup: level 5 monster, player with moderate dex, weaponTier 2.
- RNG: attack roll > attackScore to force miss; then monster attack roll > dodgeScore to force hit; damage roll set to known value.
- Assert:
  - "evades your blow" event
  - Monster attack event present
  - Player HP reduced by expected damage
  - Encounter not done (unless damage >= HP)

### 3.2 Player hit, monster survives, monster attacks
- RNG: player attack roll <= attackScore; damage roll that leaves vitality > 0; monster attack roll set to hit.
- Assert:
  - "You hit" event
  - vitality reduced correctly
  - Monster attack event and HP reduction

### 3.3 Player hit and kills monster
- RNG: player hit; damage roll sufficient to drop vitality <= 0.
- Assert:
  - "expires" event
  - Loot/treasure event depending on room.treasureId
  - Encounter done
  - Player fatigue/tempArmor reset
  - Room monsterLevel reset to 0

### 3.4 Weapon breaks on hit
- RNG: player hit; `random()` < 0.05 to trigger break.
- Assert:
  - weaponTier becomes 0, weaponName `(None)`
  - break event emitted

### 3.5 Monster dodge
- RNG: monster attack roll <= dodgeScore
- Assert:
  - "You deftly dodge the blow!"
  - no HP loss

### 3.6 Player death from monster attack
- RNG: monster attack roll > dodgeScore; damage >= current HP
- Assert:
  - "YOU HAVE DIED." event
  - Encounter done

---

## 4) Run attempt tests

### 4.1 Run success
- Setup: player.fatigued = false
- RNG: `random() < 0.4`
- Assert:
  - two flee info events
  - done=true, relocate=true, enterRoom=true
  - player.fatigued reset to false

### 4.2 Run failure
- Setup: player.fatigued = false
- RNG: `random() >= 0.4`
- Assert:
  - fail info event
  - player.fatigued = true
  - no monster attack

### 4.3 Run blocked by fatigue
- Setup: player.fatigued = true
- Assert:
  - "quite fatigued" event
  - no RNG consumed
  - no monster attack

---

## 5) Spell tests

### 5.1 Spell preconditions
- IQ too low (<12): any spell choice returns "insufficient intelligence"
- No charges: any spell choice returns "know not that spell"
- Assert: spell charges do not decrement on failed cast

### 5.2 Protection (P)
- Setup: player.tempArmorBonus = 0, armorTier known
- Cast P
- Assert:
  - tempArmorBonus += 3
  - monster attacks after protection
  - damage reduced by armor

### 5.3 Fireball (F)
- RNG: randint(1,5) fixed
- Assert:
  - damage = roll + floor(iq/3)
  - vitality reduced
  - monster attack occurs if monster alive

### 5.4 Lightning (L)
- RNG: randint(1,10) fixed
- Assert:
  - damage = roll + floor(iq/2)
  - vitality reduced
  - monster attack occurs if monster alive

### 5.5 Weaken (W)
- Setup: vitality known
- Cast W
- Assert:
  - vitality == floor(original/2)
  - monster attack occurs if monster alive

### 5.6 Teleport (T)
- Assert:
  - done=true, relocate=true, enterRoom=true
  - monsterLevel cleared, vitality=0
  - player fatigue/tempArmor reset
  - no monster attack

---

## 6) Monster death edge cases

### 6.1 Death triggers final attack (30%)
- RNG: `random() > 0.7` on death check
- Assert:
  - final attack event emitted
  - monster attack executes

### 6.2 Final attack kills player
- Setup: low player HP
- Assert:
  - death event
  - encounter ends without loot

### 6.3 Final attack does not kill player
- Assert:
  - loot/treasure awarded normally
  - encounter ends

---

## 7) Loot and treasure tests

### 7.1 Treasure present and not found
- Setup: room.treasureId = N, player.treasuresFound does not include N
- Assert:
  - loot event for treasure
  - treasure added to player.treasuresFound
  - room.treasureId reset to 0

### 7.2 Treasure already found
- Setup: room.treasureId = N, player.treasuresFound includes N
- Assert:
  - no treasure loot event
  - room.treasureId reset to 0

### 7.3 Gold drop
- Setup: room.treasureId = 0
- RNG: gold roll fixed
- Assert:
  - gold increase = 5*level + roll
  - loot event with correct pluralization

---

## 8) Range/property tests (lightweight)

### 8.1 Player damage range
- Iterate over representative str (1, 6, 12, 18) and weaponTier (0..3)
- Validate damage min >= 1 and max matches formula

### 8.2 Monster damage range
- Iterate over level (1, 5, 10) and armor (0..6)
- Validate damage min and max match formula:
  - `min = max(floor(2.5 + L/3) - armor, 0)`
  - `max = max((L - 1) + floor(2.5 + L/3) - armor, 0)`

### 8.3 Attack/dodge thresholds
- Validate that extreme dex/level combinations produce expected outcomes:
  - For very high dodgeScore (>=100), monster always misses
  - For low attackScore, player can miss even with low roll values

---

## 9) Serialization/Resume sanity

- Create encounter, serialize via `toSave()`, resume via `EncounterSession.resume()`.
- Assert:
  - restored monsterLevel/name/vitality/awaitingSpell
  - combat continues consistently from saved state

---

## 10) Suggested file layout (if you want it implemented)

- `src/dungeon/__tests__/encounter.test.ts` (or your existing test folder)
- `test/helpers/rng.ts` for scripted RNG
- `test/helpers/factories.ts` for Player/Room fixtures
