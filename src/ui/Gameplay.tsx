import { Box, Button, Stack, Typography } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import { useCallback, useEffect, useMemo, useState } from 'react';

type Command = {
  id: string;
  key: string;
  label: string;
};

const panelStyle = (theme: Theme) => ({
  background: alpha(theme.palette.background.paper, 0.9),
  border: `1px solid ${alpha(theme.palette.primary.light, 0.5)}`,
  boxShadow: `0 0 28px ${alpha(theme.palette.primary.dark, 0.4)}`,
  borderRadius: 2,
  padding: { xs: 2, md: 3 },
});

const movementCommands = [
  { id: 'move-north', key: 'N', label: 'North' },
  { id: 'move-west', key: 'W', label: 'West' },
  { id: 'move-east', key: 'E', label: 'East' },
  { id: 'move-south', key: 'S', label: 'South' },
];

const verticalCommands = [
  { id: 'move-up', key: 'U', label: 'Up' },
  { id: 'move-down', key: 'D', label: 'Down' },
  { id: 'exit', key: 'X', label: 'Exit' },
];

const roomCommands = [
  { id: 'map', key: 'M', label: 'Map' },
  { id: 'flare', key: 'F', label: 'Flare' },
  { id: 'look', key: 'L', label: 'Look' },
  { id: 'open', key: 'O', label: 'Open Chest' },
  { id: 'read', key: 'R', label: 'Read Scroll' },
  { id: 'potion', key: 'P', label: 'Drink Potion' },
  { id: 'buy', key: 'B', label: 'Buy' },
  { id: 'help', key: 'H', label: 'Help' },
];

const encounterCommands = [
  { id: 'fight', key: 'F', label: 'Fight' },
  { id: 'run', key: 'R', label: 'Run' },
  { id: 'spell', key: 'S', label: 'Spell' },
];

function CommandButton({
  command,
  onTrigger,
  compact = false,
}: {
  command: Command;
  onTrigger: (command: Command) => void;
  compact?: boolean;
}) {
  return (
    <Button
      variant="outlined"
      onClick={() => onTrigger(command)}
      color="primary"
      size={compact ? 'small' : 'medium'}
      sx={{
        textTransform: 'none',
        letterSpacing: 0.8,
        paddingY: compact ? 0.6 : 1.2,
        minWidth: compact ? 72 : undefined,
      }}
    >
      <Stack spacing={0.2} alignItems="center">
        <Typography sx={{ fontSize: compact ? 11 : 13 }}>
          {command.label}
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.6, fontSize: 10 }}>
          {command.key}
        </Typography>
      </Stack>
    </Button>
  );
}

export default function Gameplay({ onBack }: { onBack: () => void }) {
  const [encounterMode, setEncounterMode] = useState(false);
  const sampleMap = [
    '*0?M?0T',
    '0m0s0c0',
    '?0f0p0?',
    '0v0t0w0',
    '?0U0D0?',
    '0?0?0?0',
    '00?X?00',
  ];

  const activeCommands = useMemo(
    () =>
      encounterMode
        ? encounterCommands
        : [...movementCommands, ...verticalCommands, ...roomCommands],
    [encounterMode]
  );

  const commandMap = useMemo(() => {
    const map = new Map<string, Command>();
    activeCommands.forEach((command) =>
      map.set(command.key.toLowerCase(), command)
    );
    return map;
  }, [activeCommands]);

  const handleTrigger = useCallback((_command: Command) => {}, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const key = event.key.toLowerCase();
      const command = commandMap.get(key);
      if (!command) return;
      event.preventDefault();
      handleTrigger(command);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandMap, handleTrigger]);

  return (
    <Box
      sx={{
        maxWidth: 1280,
        margin: '0 auto',
        display: 'grid',
        gap: 3,
        containerType: 'inline-size',
        '@keyframes boot': {
          from: { opacity: 0, transform: 'translateY(14px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        animation: 'boot 650ms ease-out',
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: '1fr',
          alignItems: 'stretch',
          '@container (min-width: 1280px)': {
            gridTemplateColumns: '2fr 1fr',
          },
        }}
      >
        <Stack spacing={3} sx={{ height: '100%', justifyContent: 'space-between' }}>
          <Box sx={(theme) => panelStyle(theme)}>
            <Stack spacing={2}>
              <Typography variant="h5" sx={{ letterSpacing: 2 }}>
                Dungeon View
              </Typography>
              <Box
                sx={(theme) => ({
                  border: `1px solid ${alpha(
                    theme.palette.primary.light,
                    0.4
                  )}`,
                  borderRadius: 2,
                  padding: 2,
                  background: alpha(theme.palette.primary.dark, 0.35),
                  minHeight: 260,
                })}
              >
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: '1fr auto' },
                    gap: 2,
                    width: '100%',
                    height: '100%',
                    alignItems: 'center',
                  }}
                >
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateRows: `repeat(${sampleMap.length}, 1fr)`,
                      gap: 0.5,
                      width: '100%',
                      alignContent: 'center',
                      justifyItems: 'center',
                    }}
                  >
                    {sampleMap.map((row, rowIndex) => (
                      <Box
                        key={`row-${rowIndex}`}
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: `repeat(${row.length}, 1fr)`,
                          gap: 0.5,
                          width: '100%',
                          maxWidth: 360,
                        }}
                      >
                        {row.split('').map((cell, colIndex) => (
                          <Box
                            key={`${rowIndex}-${colIndex}`}
                            sx={(theme) => ({
                              borderRadius: 0.5,
                              border: `1px solid ${alpha(
                                theme.palette.primary.light,
                                0.35
                              )}`,
                              background: alpha(
                                theme.palette.primary.dark,
                                0.2
                              ),
                              display: 'grid',
                              placeItems: 'center',
                              height: 28,
                              fontSize: 14,
                              color:
                                cell === '*'
                                  ? theme.palette.primary.light
                                  : theme.palette.text.primary,
                            })}
                          >
                            {cell}
                          </Box>
                        ))}
                      </Box>
                    ))}
                  </Box>

                  <Box
                    sx={{
                      display: 'grid',
                      gap: 1,
                      justifyItems: 'center',
                      minWidth: 120,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'grid',
                        gap: 0.5,
                        gridTemplateColumns: 'repeat(3, minmax(44px, 1fr))',
                        gridTemplateRows: 'repeat(3, 1fr)',
                      }}
                    >
                      <Box />
                      <CommandButton
                        command={movementCommands[0]}
                        onTrigger={handleTrigger}
                        compact
                      />
                      <Box />
                      <CommandButton
                        command={movementCommands[1]}
                        onTrigger={handleTrigger}
                        compact
                      />
                      <Box
                        sx={{
                          borderRadius: 1,
                          border: '1px dashed rgba(255,255,255,0.2)',
                          minHeight: 40,
                        }}
                      />
                      <CommandButton
                        command={movementCommands[2]}
                        onTrigger={handleTrigger}
                        compact
                      />
                      <Box />
                      <CommandButton
                        command={movementCommands[3]}
                        onTrigger={handleTrigger}
                        compact
                      />
                      <Box />
                    </Box>
                    <Stack
                      spacing={0.5}
                      direction="row"
                      flexWrap="wrap"
                      justifyContent="center"
                    >
                      {verticalCommands.map((command) => (
                        <CommandButton
                          key={command.id}
                          command={command}
                          onTrigger={handleTrigger}
                          compact
                        />
                      ))}
                    </Stack>
                  </Box>
                </Box>
              </Box>
              <Box
                sx={(theme) => ({
                  border: `1px solid ${alpha(
                    theme.palette.primary.light,
                    0.35
                  )}`,
                  borderRadius: 2,
                  padding: 2,
                  background: alpha(theme.palette.primary.dark, 0.25),
                })}
              >
                <Typography
                  sx={{ letterSpacing: 2, textTransform: 'uppercase' }}
                >
                  Event Feed
                </Typography>
                <Typography sx={{ marginTop: 1 }}>
                  There is a chest here.
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Box
            sx={(theme) => ({
              ...panelStyle(theme),
              paddingY: { xs: 1.5, md: 2 },
            })}
          >
            {encounterMode ? (
              <Stack spacing={2}>
                <Typography
                  sx={{ letterSpacing: 2, textTransform: 'uppercase' }}
                >
                  Encounter Commands
                </Typography>
                <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
                  {encounterCommands.map((command) => (
                    <CommandButton
                      key={command.id}
                      command={command}
                      onTrigger={handleTrigger}
                      compact
                    />
                  ))}
                </Stack>
              </Stack>
            ) : (
              <Stack spacing={2}>
                <Typography
                  sx={{ letterSpacing: 2, textTransform: 'uppercase' }}
                >
                  Command Bar
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gap: 0.75,
                    gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                  }}
                >
                  {roomCommands.map((command) => (
                    <CommandButton
                      key={command.id}
                      command={command}
                      onTrigger={handleTrigger}
                      compact
                    />
                  ))}
                </Box>
              </Stack>
            )}
          </Box>
        </Stack>

        <Box sx={(theme) => panelStyle(theme)}>
          <Stack spacing={2}>
            <Typography sx={{ letterSpacing: 2, textTransform: 'uppercase' }}>
              Player Readout
            </Typography>
            <Stack spacing={0.5}>
              <Typography sx={{ opacity: 0.7 }}>Mode</Typography>
              <Typography>
                {encounterMode ? 'Encounter engagement' : 'Exploration'}
              </Typography>
            </Stack>
            <Stack spacing={1}>
              <Typography sx={{ opacity: 0.7 }}>Stats</Typography>
              <Typography>ST 12</Typography>
              <Typography>DX 13</Typography>
              <Typography>IQ 11</Typography>
              <Typography>HP 18</Typography>
            </Stack>
            <Stack spacing={1}>
              <Typography sx={{ opacity: 0.7 }}>Inventory</Typography>
              <Typography>Gold: 42</Typography>
              <Typography>Weapon: Axe</Typography>
              <Typography>Armor: Chain</Typography>
              <Typography>Flares: 2</Typography>
            </Stack>
            <Stack spacing={1}>
              <Typography sx={{ opacity: 0.7 }}>Location</Typography>
              <Typography>Floor 3 · Room 4,2</Typography>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button
                variant="outlined"
                onClick={() => setEncounterMode((prev) => !prev)}
                color="primary"
              >
                {encounterMode ? 'End Encounter' : 'Enter Encounter'}
              </Button>
              <Button variant="outlined" onClick={onBack} color="primary">
                Back to Setup
              </Button>
            </Stack>
            <Typography sx={{ opacity: 0.6 }}>
              Tip: press the letter keys shown on each command.
            </Typography>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
