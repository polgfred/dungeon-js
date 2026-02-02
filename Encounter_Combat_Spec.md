# Encounter Combat Spec (Derived from current code)

This document captures the current encounter fight loop behavior and damage ranges as implemented in the TypeScript source. It is intended for test design and regression checks.

Source of truth:

- `src/dungeon/encounter.ts`
- `src/dungeon/model.ts`
- `src/dungeon/generation.ts`
- `src/dungeon/rng.ts`
- `src/dungeon/constants.ts`

---

## 1) Encounter lifecycle

### Start

- Encounter begins when `EncounterSession.start()` is called.
- Monster is loaded from the current room:
  - `monsterLevel = room.monsterLevel`
  - `monsterName = MONSTER_NAMES[level - 1]`
- Monster vitality (HP) is set:
  - `vitality = 3 * level + randint(0, 3)`
- Player state resets at encounter start:
  - `player.fatigued = false`
  - `player.tempArmorBonus = 0`

### Resume

- `EncounterSession.resume()` restores encounter state from `EncounterSave` and retains `awaitingSpell`.

### Prompt

- Normal prompt: `F/R/S> `
- If awaiting spell input: `?> `

### Commands

- `F`: Fight round
- `R`: Run attempt
- `S`: Enter spell selection
- Other inputs: error event "I don't understand that."

---

## 2) Fight round (command `F`)

### 2.1 Player attack check

- Attack score:
  ```
  attackScore = 20 + 5 * (11 - level) + player.dex + 3 * player.weaponTier
  ```
- Roll: `randint(1, 100)`
- If `roll > attackScore`: miss
  - Combat event: "The <monster> evades your blow!"
- Else: hit
  - Damage:
    ```
    damage = max(player.weaponTier + floor(player.str / 3)
                 + randint(0, 4) - 2, 1)
    ```
  - Monster vitality reduced by `damage`
  - Combat event: "You hit the <monster>!"
  - If `vitality <= 0`: go to **Monster death**
  - Weapon break check after a successful hit:
    - If `rng.random() < 0.05` and `player.weaponTier > 0`:
      - `player.weaponTier = 0`
      - `player.weaponName = '(None)'`
      - Info event: "Your weapon breaks with the impact!"

### 2.2 Monster attack (if monster still alive)

- See **Monster attack** section below.

---

## 3) Monster attack

### 3.1 Dodge check

- Dodge score:
  ```
  dodgeScore = 20 + 5 * (11 - level) + 2 * player.dex
  ```
- Roll: `randint(1, 100)`
- If `roll <= dodgeScore`: dodge
  - Combat event: "You deftly dodge the blow!"
  - No damage

### 3.2 Damage (if not dodged)

- Effective armor:
  ```
  armor = player.armorTier + player.tempArmorBonus
  ```
- Damage:
  ```
  damage = max(randint(0, level - 1) + floor(2.5 + level / 3) - armor, 0)
  ```
- Player HP reduced by `damage`
- Combat event: "The <monster> hits you!"
- If `player.hp <= 0`:
  - Info event: "YOU HAVE DIED."
  - Encounter ends (`done: true`)

---

## 4) Run attempt (command `R`)

- If `player.fatigued`:
  - Info event: "You are quite fatigued after your previous efforts."
  - No further action (no monster attack)
- Else:
  - If `rng.random() < 0.4`:
    - Success:
      - Two info events (flee + monster no longer following)
      - Encounter ends: `done: true`
      - Relocation flags: `relocate: true`, `relocateAnyFloor: false`, `enterRoom: true`
      - Player reset: `fatigued=false`, `tempArmorBonus=0`
  - Else:
    - Failure:
      - Info event: "Although you run your hardest, your efforts to escape are made in vain."
      - `player.fatigued = true`
      - No monster attack

---

## 5) Spells (command `S` then choice)

### 5.1 Spell availability

- Spells: Protection (P), Fireball (F), Lightning (L), Weaken (W), Teleport (T)
- Preconditions to cast:
  - `player.iq >= 12`
  - `player.spells[spell] > 0`
- If IQ too low:
  - Info event: "You have insufficient intelligence."
- If no charges:
  - Info event: "You know not that spell."

### 5.2 Spell effects

#### Protection (P)

- `player.tempArmorBonus += 3`
- Info event: armor/clothes glow
- Then **Monster attack**

#### Fireball (F)

- Damage:
  ```
  damage = randint(1, 5) + floor(player.iq / 3)
  ```
- Monster vitality reduced by damage
- Combat event: "A glowing ball of fire..."
- If monster alive: **Monster attack**

#### Lightning (L)

- Damage:
  ```
  damage = randint(1, 10) + floor(player.iq / 2)
  ```
- Monster vitality reduced by damage
- Combat event: "The <monster> is thunderstruck!"
- If monster alive: **Monster attack**

#### Weaken (W)

- `vitality = floor(vitality / 2)`
- Combat event: "A green mist envelops... half his vitality."
- If monster alive: **Monster attack**

#### Teleport (T)

- Info event: teleport flavor text
- Encounter ends: `done: true`
- Relocation flags: `relocate: true`, `relocateAnyFloor: false`, `enterRoom: true`
- Player reset: `fatigued=false`, `tempArmorBonus=0`
- No monster attack

---

## 6) Monster death

When monster vitality reaches 0 or less:

- Combat event: "The foul <monster> expires."
- 30% chance of final desperate attack (`rng.random() > 0.7`):
  - Combat event: "As he dies, though, he launches one final desperate attack."
  - Monster makes **Monster attack**.
  - If player dies, encounter ends immediately without loot.

### Loot

- If room has treasure:
  - Award treasure if not already found.
  - `room.treasureId` reset to 0.
- Else:
  - Gold: `gold = 5 * monsterLevel + randint(0, 20)`
  - Loot event: "You find <gold> gold piece(s)."

### Cleanup

- `room.monsterLevel = 0`
- `monsterLevel = 0`, `monsterName = ''`, `vitality = 0`
- Player reset: `fatigued=false`, `tempArmorBonus=0`
- Encounter ends: `done: true`

---

## 7) Ranges and bounds (from current code)

### Monster level

- Level range: `1..10`
  - Generation: `minLevel = floor + 1`, `maxLevel = min(10, minLevel + 5)`

### Monster vitality

- `vitality = 3*level + randint(0,3)`
- Range: `3L .. 3L + 3`

### Player stats (general)

- Starting stats from race roll + allocation (5 points) are capped at 18 for ST/DX/IQ.
- MHP (max HP) can increase via potions and is not capped at 18.
- `applyAttributeChange` clamps ST/DX/IQ to `[1..18]`, MHP to `>=1`, and HP to `[1..MHP]`.

### Player hit chance

- `attackScore = 20 + 5*(11 - L) + dex + 3*weaponTier`
- Roll: `1..100`, hit if `roll <= attackScore`
- If `dex ∈ [1..18]`, `weaponTier ∈ [0..3]`, then:
  - At L=10: `25 + dex + 3*wt` → min 26, max 97
  - At L=1: `70 + dex + 3*wt` → min 71, max 97

### Player damage (weapon attack)

- `damage = max(weaponTier + floor(str/3) + randint(0,4) - 2, 1)`
- Minimum: `1` always
- Maximum: `weaponTier + floor(str/3) + 2`
  - With `str=18`, `weaponTier=3`, max = `3 + 6 + 2 = 11`

### Monster hit chance

- `dodgeScore = 20 + 5*(11 - L) + 2*dex`
- Roll: `1..100`, dodge if `roll <= dodgeScore`
- With `dex ∈ [1..18]`:
  - At L=10: `25 + 2*dex` → 27..61
  - At L=1: `70 + 2*dex` → 72..106

### Monster damage

- `damage = max(randint(0, L-1) + 3 - armor, 0)`
- Minimum: `max(floor(2.5 + L/3) - armor, 0)`
- Maximum: `max((L - 1) + floor(2.5 + L/3) - armor, 0)`
- `armor = armorTier + tempArmorBonus` (Protection adds +3 per cast)

### Spell damage

- Fireball: `randint(1,5) + floor(iq/3)`
- Lightning: `randint(1,10) + floor(iq/2)`
- Weaken: `floor(vitality / 2)`
- Protection: no direct damage (armor buff)
- Teleport: no damage (encounter ends)
