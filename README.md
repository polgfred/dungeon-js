# Dungeon of Doom

Dungeon of Doom is a small, turn-based dungeon crawler. You explore a 7-floor maze, fight monsters, collect treasures, and decide when to press deeper or retreat.

## What to Expect

- Rooms may contain features, monsters, or treasure.
- Monsters trigger an encounter where you can fight, run, or cast spells.
- Scrolls grant spell charges. Spells can protect you, deal damage, weaken foes, or teleport you.
- Vendors sell better gear, scrolls, and potions.
- Flares reveal nearby rooms on your current floor.

## How to Play

1. Start the game and choose a seed, race, and starting gear.
2. Explore rooms, gather treasures, and survive encounters.
3. Find all 10 treasures, reach the exit on floor 7, and use `X` to win.

## Controls

Commands are single letters and are case-insensitive.

Movement:

- `N` `S` `E` `W` move
- `U` stairs up (only in a stairs-up room)
- `D` stairs down (only in a stairs-down room)

World:

- `M` map of the current floor
- `F` flare (reveals nearby rooms)
- `X` exit (only in the exit room)

Interaction:

- `L` look in mirror
- `O` open chest
- `R` read scroll
- `P` drink potion
- `B` buy from vendor

Info:

- `?` help

Encounter-only:

- `F` fight
- `R` run
- `S` cast spell (choose from the spell list)

## Monsters

Monsters increase in difficulty as you progress toward the exit of the dungeon.

- Skeleton (easiest)
- Goblin
- Kobold
- Orc
- Troll
- Werewolf
- Banshee
- Hellhound
- Chimaera
- Dragon (hardest)

## Map Legend

When exploring, the map uses:

- `·` unknown
- `-` empty
- `M` monster
- `T` treasure
- `m` mirror
- `s` scroll
- `c` chest
- `f` flares
- `p` potion
- `v` vendor
- `t` thief
- `w` warp
- `U` stairs up
- `D` stairs down
- `X` exit
