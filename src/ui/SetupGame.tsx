import {
  Box,
  Button,
  ButtonBase,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { alpha, type Theme } from "@mui/material/styles";
import { useMemo, useState } from "react";

import {
  ARMOR_NAMES,
  ARMOR_PRICES,
  WEAPON_NAMES,
  WEAPON_PRICES,
  Race,
} from "../dungeon/constants.js";
import { Player } from "../dungeon/model.js";
import { defaultRandomSource } from "../dungeon/rng.js";

type AllocationKey = "STR" | "DEX" | "IQ";
type AllocationState = Record<AllocationKey, number>;
type SetupStage = "race" | "allocate" | "shop" | "ready";

const raceOptions = [
  { value: Race.HUMAN, label: "Human", tagline: "Balanced and adaptable." },
  { value: Race.DWARF, label: "Dwarf", tagline: "Stout and resilient." },
  { value: Race.ELF, label: "Elf", tagline: "Quick and arcane." },
  { value: Race.HALFLING, label: "Halfling", tagline: "Steady and lucky." },
];

const panelStyle = (theme: Theme) => ({
  background: alpha(theme.palette.background.paper, 0.9),
  border: `1px solid ${alpha(theme.palette.primary.light, 0.5)}`,
  boxShadow: `0 0 28px ${alpha(theme.palette.primary.dark, 0.4)}`,
  borderRadius: 2,
  padding: { xs: 2, md: 3 },
});

export default function SetupGame({
  onComplete,
  onBack,
}: {
  onComplete: () => void;
  onBack: () => void;
}) {
  const rng = useMemo(() => defaultRandomSource, []);
  const [stage, setStage] = useState<SetupStage>("race");
  const [race, setRace] = useState<Race | null>(null);
  const [baseStats, setBaseStats] = useState<{
    str: number;
    dex: number;
    iq: number;
    hp: number;
  } | null>(null);
  const [allocations, setAllocations] = useState<AllocationState>({
    STR: 0,
    DEX: 0,
    IQ: 0,
  });
  const [gold, setGold] = useState<number | null>(null);
  const [weaponTier, setWeaponTier] = useState(1);
  const [armorTier, setArmorTier] = useState(1);
  const [flares, setFlares] = useState(0);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);

  const totalAllocated = allocations.STR + allocations.DEX + allocations.IQ;
  const remainingPoints = 5 - totalAllocated;
  const weaponCost = WEAPON_PRICES[weaponTier];
  const armorCost = ARMOR_PRICES[armorTier];
  const goldPool = gold ?? 0;
  const totalCost = weaponCost + armorCost + flares;
  const maxFlares = Math.max(0, goldPool - weaponCost - armorCost);

  const derivedStats = baseStats
    ? {
        STR: Math.min(18, baseStats.str + allocations.STR),
        DEX: Math.min(18, baseStats.dex + allocations.DEX),
        IQ: Math.min(18, baseStats.iq + allocations.IQ),
        HP: baseStats.hp,
      }
    : null;

  const handleRaceSelect = (value: Race) => {
    setRace(value);
    const [str, dex, iq, hp] = Player.rollBaseStats(rng, value);
    setBaseStats({ str, dex, iq, hp });
    setAllocations({ STR: 0, DEX: 0, IQ: 0 });
    setSetupError(null);
  };

  const handleAdjust = (key: AllocationKey, delta: number) => {
    setAllocations((prev) => {
      const next = Math.max(0, prev[key] + delta);
      return { ...prev, [key]: next };
    });
  };

  const handleAdvanceToShop = () => {
    if (remainingPoints === 0) {
      setStage("shop");
      if (gold === null) {
        setGold(rng.randint(50, 60));
      }
    }
  };

  const handleFinish = () => {
    if (!race || !baseStats || gold === null) return;
    setSetupError(null);
    try {
      const created = Player.create({
        rng,
        race,
        allocations,
        weaponTier,
        armorTier,
        flareCount: flares,
      });
      setPlayer(created);
      setStage("ready");
    } catch (error) {
      setSetupError(error instanceof Error ? error.message : "Setup failed.");
    }
  };

  return (
    <Box
      sx={{
        maxWidth: 1280,
        margin: "0 auto",
        display: "grid",
        gap: 3,
        "@keyframes boot": {
          from: { opacity: 0, transform: "translateY(14px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        animation: "boot 650ms ease-out",
      }}
    >
      <Box
        sx={(theme) => ({
          ...panelStyle(theme),
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingY: 1.5,
        })}
      >
        <Typography sx={{ letterSpacing: 3, textTransform: "uppercase" }}>
          Dungeon OS // Player Boot
        </Typography>
        <Typography sx={{ color: "text.secondary", opacity: 0.8 }}>
          {stage.toUpperCase()}
        </Typography>
      </Box>

      <Box
        sx={{
          display: "grid",
          gap: 3,
          gridTemplateColumns: { xs: "1fr", lg: "2fr 1fr" },
        }}
      >
        <Box sx={(theme) => panelStyle(theme)}>
          {stage === "race" && (
            <Stack spacing={3}>
              <Typography variant="h5" sx={{ letterSpacing: 2 }}>
                Choose Your Lineage
              </Typography>
              <Typography sx={{ opacity: 0.75 }}>
                Base stats are rolled on selection. Confirm to lock it in.
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gap: 2,
                  gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                }}
              >
                {raceOptions.map((option) => {
                  const active = race === option.value;
                  return (
                    <ButtonBase
                      key={option.label}
                      onClick={() => handleRaceSelect(option.value)}
                      sx={(theme) => ({
                        borderRadius: 2,
                        padding: 2,
                        textAlign: "left",
                        border: active
                          ? `1px solid ${alpha(
                              theme.palette.primary.light,
                              0.9,
                            )}`
                          : `1px solid ${alpha(
                              theme.palette.primary.light,
                              0.5,
                            )}`,
                        background: active
                          ? alpha(theme.palette.primary.main, 0.35)
                          : alpha(theme.palette.primary.dark, 0.35),
                        boxShadow: active
                          ? `0 0 20px ${alpha(
                              theme.palette.primary.light,
                              0.45,
                            )}`
                          : "none",
                        display: "flex",
                        flexDirection: "column",
                        gap: 1,
                      })}
                    >
                      <Typography sx={{ letterSpacing: 2 }}>
                        {option.label}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.7 }}>
                        {option.tagline}
                      </Typography>
                    </ButtonBase>
                  );
                })}
              </Box>
              {baseStats && (
                <Box
                  sx={(theme) => ({
                    border: `1px solid ${alpha(
                      theme.palette.primary.light,
                      0.45,
                    )}`,
                    borderRadius: 2,
                    padding: 2,
                    background: alpha(theme.palette.primary.dark, 0.35),
                  })}
                >
                  <Typography sx={{ opacity: 0.7 }}>Rolled Stats</Typography>
                  <Typography sx={{ letterSpacing: 1.5 }}>
                    STR {baseStats.str} · DEX {baseStats.dex} · IQ{" "}
                    {baseStats.iq} · HP {baseStats.hp}
                  </Typography>
                </Box>
              )}
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <Button variant="outlined" onClick={onBack} color="primary">
                  Back
                </Button>
                <Button
                  variant="contained"
                  disabled={!race || !baseStats}
                  onClick={() => setStage("allocate")}
                  color="primary"
                >
                  Confirm Race
                </Button>
              </Stack>
            </Stack>
          )}

          {stage === "allocate" && (
            <Stack spacing={3}>
              <Typography variant="h5" sx={{ letterSpacing: 2 }}>
                Allocate 5 Points
              </Typography>
              <Typography sx={{ opacity: 0.75 }}>
                Distribute points across STR, DEX, and IQ. Each caps at 18.
              </Typography>
              <Stack spacing={2}>
                {(["STR", "DEX", "IQ"] as AllocationKey[]).map((key) => {
                  const baseValue = baseStats
                    ? baseStats[
                        key === "STR" ? "str" : key === "DEX" ? "dex" : "iq"
                      ]
                    : 0;
                  const totalValue = Math.min(18, baseValue + allocations[key]);
                  return (
                    <Box
                      key={key}
                      sx={(theme) => ({
                        display: "grid",
                        gridTemplateColumns: "80px 1fr auto",
                        gap: 2,
                        alignItems: "center",
                        border: `1px solid ${alpha(
                          theme.palette.primary.light,
                          0.45,
                        )}`,
                        borderRadius: 2,
                        padding: 2,
                        background: alpha(theme.palette.primary.dark, 0.35),
                      })}
                    >
                      <Typography sx={{ letterSpacing: 2 }}>{key}</Typography>
                      <Box>
                        <Typography sx={{ opacity: 0.7 }}>
                          Base {baseValue} + {allocations[key]} → {totalValue}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <Button
                          variant="outlined"
                          onClick={() => handleAdjust(key, -1)}
                          disabled={allocations[key] === 0}
                          color="primary"
                        >
                          -
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={() => handleAdjust(key, 1)}
                          disabled={remainingPoints <= 0 || totalValue >= 18}
                          color="primary"
                        >
                          +
                        </Button>
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
              <Typography sx={{ color: "text.secondary" }}>
                Points remaining: {remainingPoints}
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <Button
                  variant="outlined"
                  onClick={() => setStage("race")}
                  color="primary"
                >
                  Back
                </Button>
                <Button
                  variant="contained"
                  disabled={remainingPoints !== 0}
                  onClick={handleAdvanceToShop}
                  color="primary"
                >
                  Lock Allocation
                </Button>
              </Stack>
            </Stack>
          )}

          {stage === "shop" && (
            <Stack spacing={3}>
              <Typography variant="h5" sx={{ letterSpacing: 2 }}>
                Outfit for the Descent
              </Typography>
              <Typography sx={{ opacity: 0.75 }}>
                Spend your starting gold. Remaining gold is kept.
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Typography sx={{ marginBottom: 1, letterSpacing: 1 }}>
                    Weapon Tier
                  </Typography>
                  <ToggleButtonGroup
                    exclusive
                    value={weaponTier}
                    onChange={(_, value) => value && setWeaponTier(value)}
                    sx={(theme) => ({
                      "& .MuiToggleButton-root": {
                        borderColor: alpha(theme.palette.primary.light, 0.5),
                        color: theme.palette.text.primary,
                        textTransform: "none",
                        letterSpacing: 1,
                      },
                      "& .MuiToggleButton-root.Mui-selected": {
                        background: alpha(theme.palette.primary.main, 0.35),
                        color: theme.palette.text.primary,
                      },
                    })}
                  >
                    {[1, 2, 3].map((tier) => (
                      <ToggleButton key={tier} value={tier}>
                        {WEAPON_NAMES[tier]} ({WEAPON_PRICES[tier]}g)
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </Box>
                <Box>
                  <Typography sx={{ marginBottom: 1, letterSpacing: 1 }}>
                    Armor Tier
                  </Typography>
                  <ToggleButtonGroup
                    exclusive
                    value={armorTier}
                    onChange={(_, value) => value && setArmorTier(value)}
                    sx={(theme) => ({
                      "& .MuiToggleButton-root": {
                        borderColor: alpha(theme.palette.primary.light, 0.5),
                        color: theme.palette.text.primary,
                        textTransform: "none",
                        letterSpacing: 1,
                      },
                      "& .MuiToggleButton-root.Mui-selected": {
                        background: alpha(theme.palette.primary.main, 0.35),
                        color: theme.palette.text.primary,
                      },
                    })}
                  >
                    {[1, 2, 3].map((tier) => (
                      <ToggleButton key={tier} value={tier}>
                        {ARMOR_NAMES[tier]} ({ARMOR_PRICES[tier]}g)
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </Box>
                <Box>
                  <Typography sx={{ marginBottom: 1, letterSpacing: 1 }}>
                    Flares
                  </Typography>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Button
                      variant="outlined"
                      onClick={() => setFlares((prev) => Math.max(0, prev - 1))}
                      disabled={flares === 0}
                      color="primary"
                    >
                      -
                    </Button>
                    <Typography sx={{ minWidth: 40, textAlign: "center" }}>
                      {flares}
                    </Typography>
                    <Button
                      variant="outlined"
                      onClick={() =>
                        setFlares((prev) => Math.min(maxFlares, prev + 1))
                      }
                      disabled={flares >= maxFlares}
                      color="primary"
                    >
                      +
                    </Button>
                    <Typography sx={{ opacity: 0.65 }}>
                      Max {maxFlares}
                    </Typography>
                  </Stack>
                </Box>
              </Stack>
              {setupError && (
                <Typography sx={{ color: "error.light" }}>
                  {setupError}
                </Typography>
              )}
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <Button
                  variant="outlined"
                  onClick={() => setStage("allocate")}
                  color="primary"
                >
                  Back
                </Button>
                <Button
                  variant="contained"
                  disabled={gold === null || totalCost > gold}
                  onClick={handleFinish}
                  color="primary"
                >
                  Finalize Loadout
                </Button>
              </Stack>
            </Stack>
          )}

          {stage === "ready" && player && (
            <Stack spacing={2}>
              <Typography variant="h5" sx={{ letterSpacing: 2 }}>
                Boot Sequence Complete
              </Typography>
              <Typography sx={{ opacity: 0.75 }}>
                Systems online. Awaiting descent command.
              </Typography>
              <Stack spacing={1}>
                <Typography>Weapon: {player.weaponName}</Typography>
                <Typography>Armor: {player.armorName}</Typography>
                <Typography>Flares: {player.flares}</Typography>
                <Typography>Gold Remaining: {player.gold}</Typography>
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <Button
                  variant="outlined"
                  onClick={() => setStage("race")}
                  color="primary"
                >
                  Reset Setup
                </Button>
                <Button
                  variant="contained"
                  onClick={onComplete}
                  color="primary"
                >
                  Enter Dungeon
                </Button>
              </Stack>
            </Stack>
          )}
        </Box>

        <Box sx={(theme) => panelStyle(theme)}>
          <Stack spacing={2}>
            <Typography sx={{ letterSpacing: 2, textTransform: "uppercase" }}>
              Status Readout
            </Typography>
            <Stack spacing={1}>
              <Typography sx={{ opacity: 0.7 }}>Race</Typography>
              <Typography>
                {race
                  ? raceOptions.find((option) => option.value === race)?.label
                  : "Unassigned"}
              </Typography>
            </Stack>
            <Stack spacing={1}>
              <Typography sx={{ opacity: 0.7 }}>Stats</Typography>
              <Typography>
                STR {derivedStats ? derivedStats.STR : "--"}
              </Typography>
              <Typography>
                DEX {derivedStats ? derivedStats.DEX : "--"}
              </Typography>
              <Typography>
                IQ {derivedStats ? derivedStats.IQ : "--"}
              </Typography>
              <Typography>
                HP {derivedStats ? derivedStats.HP : "--"}
              </Typography>
            </Stack>
            <Stack spacing={1}>
              <Typography sx={{ opacity: 0.7 }}>Supplies</Typography>
              <Typography>Gold: {gold !== null ? gold : "--"}</Typography>
              <Typography>
                Weapon: {WEAPON_NAMES[weaponTier]} ({weaponCost}g)
              </Typography>
              <Typography>
                Armor: {ARMOR_NAMES[armorTier]} ({armorCost}g)
              </Typography>
              <Typography>Flares: {flares}</Typography>
              <Typography sx={{ color: "text.secondary" }}>
                Remaining: {gold !== null ? gold - totalCost : "--"}
              </Typography>
            </Stack>
          </Stack>
        </Box>
      </Box>

      <Box sx={(theme) => panelStyle(theme)}>
        <Stack spacing={2}>
          <Typography sx={{ letterSpacing: 2, textTransform: "uppercase" }}>
            Mission Log
          </Typography>
          <Box
            sx={{
              display: "grid",
              gap: 1,
              gridTemplateColumns: "1fr 1fr",
              fontSize: 14,
              opacity: 0.8,
            }}
          >
            <Typography>Event Queue</Typography>
            <Typography>Awaiting input...</Typography>
            <Typography>Telemetry</Typography>
            <Typography>Standby</Typography>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}
