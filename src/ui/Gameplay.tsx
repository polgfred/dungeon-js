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
  { id: 'examine', key: 'X', label: 'Examine' },
];

const roomCommands = [
  { id: 'look', key: 'L', label: 'Look' },
  { id: 'open', key: 'O', label: 'Open' },
  { id: 'grab', key: 'G', label: 'Grab' },
  { id: 'search', key: 'R', label: 'Search' },
  { id: 'talk', key: 'T', label: 'Talk' },
  { id: 'map', key: 'M', label: 'Map' },
];

const encounterCommands = [
  { id: 'fight', key: 'F', label: 'Fight' },
  { id: 'retreat', key: 'R', label: 'Retreat' },
  { id: 'spell', key: 'S', label: 'Spell' },
];

function CommandButton({
  command,
  onTrigger,
}: {
  command: Command;
  onTrigger: (command: Command) => void;
}) {
  return (
    <Button
      variant="outlined"
      onClick={() => onTrigger(command)}
      color="primary"
      sx={{
        textTransform: 'none',
        letterSpacing: 1,
        paddingY: 1.2,
      }}
    >
      <Stack spacing={0.2}>
        <Typography sx={{ fontSize: 13 }}>{command.label}</Typography>
        <Typography variant="caption" sx={{ opacity: 0.6 }}>
          {command.key}
        </Typography>
      </Stack>
    </Button>
  );
}

export default function Gameplay({
  onBack,
}: {
  onBack: () => void;
}) {
  const [encounterMode, setEncounterMode] = useState(false);
  const [lastAction, setLastAction] = useState('Awaiting command.');
  const [log, setLog] = useState<string[]>([]);

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

  const handleTrigger = useCallback((command: Command) => {
    const entry = `${command.label} [${command.key}]`;
    setLastAction(entry);
    setLog((prev) => [entry, ...prev].slice(0, 6));
  }, []);

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
        sx={(theme) => ({
          ...panelStyle(theme),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingY: 1.5,
        })}
      >
        <Typography sx={{ letterSpacing: 3, textTransform: 'uppercase' }}>
          Dungeon Operations
        </Typography>
        <Typography sx={{ color: 'text.secondary', opacity: 0.8 }}>
          {encounterMode ? 'ENCOUNTER' : 'EXPLORATION'}
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: '1fr',
          '@container (min-width: 1280px)': {
            gridTemplateColumns: '2fr 1fr',
          },
        }}
      >
        <Stack spacing={3}>
          <Box sx={(theme) => panelStyle(theme)}>
            <Stack spacing={2}>
              <Typography variant="h5" sx={{ letterSpacing: 2 }}>
                Dungeon View
              </Typography>
              <Typography sx={{ opacity: 0.75, maxWidth: 620 }}>
                The torchlight trembles against stone walls. A chill draft
                slips from a corridor to the east while a stairwell descends
                into shadow.
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
                  minHeight: 180,
                  display: 'grid',
                  placeItems: 'center',
                })}
              >
                <Typography sx={{ opacity: 0.6, letterSpacing: 1 }}>
                  Tactical map feed imminent.
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Box sx={(theme) => panelStyle(theme)}>
            {encounterMode ? (
              <Stack spacing={2}>
                <Typography sx={{ letterSpacing: 2, textTransform: 'uppercase' }}>
                  Encounter Commands
                </Typography>
                <Stack
                  direction="row"
                  spacing={2}
                  useFlexGap
                  flexWrap="wrap"
                >
                  {encounterCommands.map((command) => (
                    <CommandButton
                      key={command.id}
                      command={command}
                      onTrigger={handleTrigger}
                    />
                  ))}
                </Stack>
              </Stack>
            ) : (
              <Stack spacing={2}>
                <Typography sx={{ letterSpacing: 2, textTransform: 'uppercase' }}>
                  Command Bar
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gap: 2,
                    gridTemplateColumns: {
                      xs: '1fr',
                      md: 'auto auto 1fr',
                    },
                    alignItems: 'start',
                  }}
                >
                  <Box
                    sx={{
                      display: 'grid',
                      gap: 1,
                      gridTemplateColumns: 'repeat(3, minmax(64px, 1fr))',
                      gridTemplateRows: 'repeat(3, 1fr)',
                    }}
                  >
                    <Box />
                    <CommandButton
                      command={movementCommands[0]}
                      onTrigger={handleTrigger}
                    />
                    <Box />
                    <CommandButton
                      command={movementCommands[1]}
                      onTrigger={handleTrigger}
                    />
                    <Box
                      sx={{
                        borderRadius: 1,
                        border: '1px dashed rgba(255,255,255,0.2)',
                        minHeight: 54,
                      }}
                    />
                    <CommandButton
                      command={movementCommands[2]}
                      onTrigger={handleTrigger}
                    />
                    <Box />
                    <CommandButton
                      command={movementCommands[3]}
                      onTrigger={handleTrigger}
                    />
                    <Box />
                  </Box>

                  <Stack spacing={1}>
                    {verticalCommands.map((command) => (
                      <CommandButton
                        key={command.id}
                        command={command}
                        onTrigger={handleTrigger}
                      />
                    ))}
                  </Stack>

                  <Box
                    sx={{
                      display: 'grid',
                      gap: 1.5,
                      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                    }}
                  >
                    {roomCommands.map((command) => (
                      <CommandButton
                        key={command.id}
                        command={command}
                        onTrigger={handleTrigger}
                      />
                    ))}
                  </Box>
                </Box>
              </Stack>
            )}
          </Box>
        </Stack>

        <Box sx={(theme) => panelStyle(theme)}>
          <Stack spacing={2}>
            <Typography sx={{ letterSpacing: 2, textTransform: 'uppercase' }}>
              Field Readout
            </Typography>
            <Stack spacing={0.5}>
              <Typography sx={{ opacity: 0.7 }}>Mode</Typography>
              <Typography>
                {encounterMode ? 'Encounter engagement' : 'Exploration'}
              </Typography>
            </Stack>
            <Stack spacing={0.5}>
              <Typography sx={{ opacity: 0.7 }}>Last Command</Typography>
              <Typography>{lastAction}</Typography>
            </Stack>
            <Stack spacing={1}>
              <Typography sx={{ opacity: 0.7 }}>Recent Log</Typography>
              {log.length === 0 && (
                <Typography sx={{ opacity: 0.6 }}>
                  No commands issued yet.
                </Typography>
              )}
              {log.map((entry, index) => (
                <Typography key={`${entry}-${index}`}>{entry}</Typography>
              ))}
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
