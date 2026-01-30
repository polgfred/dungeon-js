import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { alpha, type Theme, useTheme } from '@mui/material/styles';
import { useEffect, useRef, useState } from 'react';

import helpHtmlContent from '../assets/help.html?raw';
import type { Player } from '../dungeon/model.js';
import type { PromptOption } from '../dungeon/types.js';
import { CommandButton, type Command } from './CommandButton.js';
import type { GameplayModel, GameplayProps } from './GameplayModel.js';
import { useGameplayModel } from './GameplayModel.js';

const helpContentSx = {
  '& h1': { marginTop: 0, opacity: 0.75 },
  '& h2, & h3': { opacity: 0.75 },
  '& h1, & h2, & h3': {
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  '& li': { marginBottom: 0.5 },
  '& ul li::marker': { content: '"- "' },
};

const panelStyle = (theme: Theme) => ({
  background: alpha(theme.palette.background.paper, 0.9),
  border: `1px solid ${alpha(theme.palette.primary.light, 0.5)}`,
  boxShadow: `0 0 28px ${alpha(theme.palette.primary.dark, 0.4)}`,
  borderRadius: 2,
  padding: { xs: 2, md: 3 },
});

const subtleBoxStyle = (theme: Theme) => ({
  padding: 1.5,
  borderRadius: 2,
  border: `1px solid ${alpha(theme.palette.primary.light, 0.35)}`,
  background: alpha(theme.palette.primary.dark, 0.18),
});

function MapGrid({
  rows,
  playerX,
  playerY,
  rowOffset = 0,
  colOffset = 0,
  showTooltips = true,
  mapCellWidth = 42,
}: {
  rows: string[][];
  playerX: number;
  playerY: number;
  rowOffset?: number;
  colOffset?: number;
  showTooltips?: boolean;
  mapCellWidth?: number;
}) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateRows: `repeat(${rows.length}, 1fr)`,
        gap: 0.5,
        width: 'fit-content',
        maxWidth: '100%',
        alignContent: 'center',
        justifyItems: 'center',
        justifyContent: 'center',
      }}
    >
      {rows.map((row, rowIndex) => (
        <Box
          key={`row-${rowIndex}`}
          sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(${row.length}, minmax(0, ${mapCellWidth}px))`,
            gap: 0.5,
            width: 'fit-content',
            maxWidth: '100%',
          }}
        >
          {row.map((cell, colIndex) => {
            const isPlayerCell =
              rowOffset + rowIndex === playerY &&
              colOffset + colIndex === playerX;
            const cellBox = (
              <Box
                sx={(theme) => ({
                  borderRadius: 0.5,
                  border: isPlayerCell
                    ? `2px solid ${alpha(theme.palette.primary.light, 0.9)}`
                    : `1px solid ${alpha(theme.palette.primary.light, 0.35)}`,
                  background: isPlayerCell
                    ? alpha(theme.palette.primary.dark, 0.32)
                    : alpha(theme.palette.primary.dark, 0.26),
                  display: 'grid',
                  placeItems: 'center',
                  width: mapCellWidth,
                  fontSize: 14,
                  color:
                    cell === '·'
                      ? alpha(theme.palette.text.primary, 0.35)
                      : theme.palette.text.primary,
                  transition: 'background-color 150ms ease',
                  '&:hover': {
                    background: alpha(theme.palette.primary.light, 0.18),
                  },
                })}
              >
                {cell}
              </Box>
            );
            return showTooltips ? (
              <Tooltip
                key={`${rowIndex}-${colIndex}`}
                title={mapTooltip(cell)}
                arrow
                placement="top"
              >
                {cellBox}
              </Tooltip>
            ) : (
              <Box key={`${rowIndex}-${colIndex}`}>{cellBox}</Box>
            );
          })}
        </Box>
      ))}
    </Box>
  );
}

function mapMatrixFromGrid(mapGrid: string[]): string[][] {
  const defaultRow = '? ? ? ? ? ? ?'.split(' ');
  return mapGrid.length > 0
    ? mapGrid.map((row) => row.split(' '))
    : Array.from({ length: 7 }, () => [...defaultRow]);
}

function MapPanel({
  onTrigger,
  mapGrid,
  playerX,
  playerY,
  movementCommandList,
  verticalCommandList,
  buttonLayout = 'stacked',
}: {
  onTrigger: (command: Command) => void;
  mapGrid: string[];
  playerX: number;
  playerY: number;
  movementCommandList: Command[];
  verticalCommandList: Command[];
  buttonLayout?: 'inline' | 'stacked' | 'compact';
}) {
  const mapMatrix = mapMatrixFromGrid(mapGrid);
  const mapGridView = (
    <MapGrid rows={mapMatrix} playerX={playerX} playerY={playerY} />
  );

  return (
    <Box className="ui-panel" sx={(theme) => panelStyle(theme)}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) auto' },
          columnGap: 10,
          rowGap: 2,
          paddingX: { xs: 0, md: 5 },
          width: '100%',
          height: '100%',
          alignItems: 'center',
        }}
      >
        {mapGridView}

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
              gridTemplateColumns: 'repeat(3, 1fr)',
              gridTemplateRows: 'repeat(3, 1fr)',
            }}
          >
            <Box />
            <CommandButton
              command={movementCommandList[0]}
              onTrigger={onTrigger}
              layout={buttonLayout}
            />
            <Box />
            <CommandButton
              command={movementCommandList[1]}
              onTrigger={onTrigger}
              layout={buttonLayout}
            />
            <Box
              sx={{
                borderRadius: 1,
                border: '1px dashed rgba(255,255,255,0.2)',
                minHeight: 40,
              }}
            />
            <CommandButton
              command={movementCommandList[2]}
              onTrigger={onTrigger}
              layout={buttonLayout}
            />
            <Box />
            <CommandButton
              command={movementCommandList[3]}
              onTrigger={onTrigger}
              layout={buttonLayout}
            />
            <Box />
          </Box>
          <Stack
            spacing={0.5}
            direction="row"
            flexWrap="wrap"
            justifyContent="center"
          >
            {verticalCommandList.map((command) => (
              <CommandButton
                key={command.id}
                command={command}
                onTrigger={onTrigger}
                layout={buttonLayout}
              />
            ))}
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}

function MobileMapPanel({
  onTrigger,
  mapGrid,
  playerX,
  playerY,
  movementCommandList,
  verticalCommandList,
  buttonLayout = 'compact',
  windowSize = 3,
}: {
  onTrigger: (command: Command) => void;
  mapGrid: string[];
  playerX: number;
  playerY: number;
  movementCommandList: Command[];
  verticalCommandList: Command[];
  buttonLayout?: 'inline' | 'stacked' | 'compact';
  windowSize?: number;
}) {
  const mapMatrix = mapMatrixFromGrid(mapGrid);
  const totalRows = mapMatrix.length;
  const totalCols = mapMatrix[0]?.length ?? 0;
  const safeWindowSize = Math.min(
    Math.max(windowSize, 1),
    totalRows,
    totalCols
  );
  const halfWindow = Math.floor(safeWindowSize / 2);
  const rowStart = Math.max(
    0,
    Math.min(playerY - halfWindow, totalRows - safeWindowSize)
  );
  const colStart = Math.max(
    0,
    Math.min(playerX - halfWindow, totalCols - safeWindowSize)
  );
  const visibleRows = mapMatrix
    .slice(rowStart, rowStart + safeWindowSize)
    .map((row) => row.slice(colStart, colStart + safeWindowSize));
  const mapCellWidth = safeWindowSize <= 3 ? 48 : 42;

  return (
    <Box className="ui-panel" sx={(theme) => panelStyle(theme)}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'auto auto',
          gap: 2,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'auto auto auto',
            gridTemplateRows: 'auto auto auto',
            gap: 0.5,
            alignItems: 'center',
            justifyItems: 'center',
          }}
        >
          <Box />
          <CommandButton
            command={movementCommandList[0]}
            onTrigger={onTrigger}
            layout={buttonLayout}
          />
          <Box />
          <CommandButton
            command={movementCommandList[1]}
            onTrigger={onTrigger}
            layout={buttonLayout}
          />
          <MapGrid
            rows={visibleRows}
            playerX={playerX}
            playerY={playerY}
            rowOffset={rowStart}
            colOffset={colStart}
            showTooltips={false}
            mapCellWidth={mapCellWidth}
          />
          <CommandButton
            command={movementCommandList[2]}
            onTrigger={onTrigger}
            layout={buttonLayout}
          />
          <Box />
          <CommandButton
            command={movementCommandList[3]}
            onTrigger={onTrigger}
            layout={buttonLayout}
          />
          <Box />
        </Box>
        <Stack spacing={0.75} justifyContent="center">
          {verticalCommandList.map((command) => (
            <CommandButton
              key={command.id}
              command={command}
              onTrigger={onTrigger}
              layout={buttonLayout}
            />
          ))}
        </Stack>
      </Box>
    </Box>
  );
}

function EventFeedPanel({ turnEvents }: { turnEvents: string[][] }) {
  const eventFeedRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = eventFeedRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [turnEvents]);

  return (
    <Box
      sx={(theme) => ({
        position: 'relative',
        height: 220,
        overflow: 'hidden',
      })}
    >
      <Stack
        ref={eventFeedRef}
        spacing={1.5}
        sx={{
          height: '100%',
          overflowY: 'auto',
          position: 'relative',
          zIndex: 0,
        }}
      >
        <Box sx={{ minHeight: 180, flexShrink: 0 }} />
        {turnEvents.length === 0 ? (
          <Typography className="ui-tip">You see nothing special.</Typography>
        ) : (
          turnEvents.map((group, groupIndex) => {
            const isLatest = groupIndex === turnEvents.length - 1;
            return (
              <Box key={`turn-${groupIndex}`} sx={subtleBoxStyle}>
                <Stack spacing={0.5}>
                  {group.map((entry, index) => (
                    <Typography
                      key={`${entry}-${index}`}
                      sx={{
                        color: isLatest ? 'text.primary' : 'text.disabled',
                        opacity: isLatest ? 1 : 0.7,
                      }}
                    >
                      {entry}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            );
          })
        )}
      </Stack>
    </Box>
  );
}

function CompactReadoutPanel({
  encounterMode,
  player,
}: {
  encounterMode: boolean;
  player: Player;
}) {
  return (
    <Box
      className="ui-panel"
      sx={(theme) => ({
        ...panelStyle(theme),
        '& .MuiTypography-root': {
          fontSize: 13,
        },
        '& .MuiTypography-caption': {
          fontSize: 12,
        },
      })}
    >
      <Stack spacing={1.5}>
        <Stack spacing={0.4}>
          <Typography sx={{ opacity: 0.75 }}>Mode</Typography>
          <Typography>{encounterMode ? 'Encounter' : 'Explore'}</Typography>
        </Stack>
        <Stack spacing={0.4}>
          <Typography sx={{ opacity: 0.75 }}>Status</Typography>
          <Typography>
            ST {player.str} · DX {player.dex} · IQ {player.iq}
          </Typography>
          <Typography>
            HP {player.hp} / {player.mhp} · Gold {player.gold}
          </Typography>
          <Typography>
            Floor {player.z + 1} · Room {player.y + 1},{player.x + 1}
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}

function MobileEventBubble({ lastEventLines }: { lastEventLines: string[] }) {
  return (
    <Box
      className="ui-panel"
      sx={(theme) => ({
        ...panelStyle(theme),
        padding: 0,
        background: alpha(theme.palette.primary.dark, 0.28),
        flex: 1,
        minHeight: 0,
        '& .MuiTypography-root': {
          fontSize: 13,
        },
      })}
    >
      <Box
        sx={(theme) => ({
          padding: 1.25,
          borderRadius: 1.5,
          border: `1px solid ${alpha(theme.palette.primary.light, 0.3)}`,
          background: alpha(theme.palette.primary.dark, 0.38),
          height: '100%',
          overflowY: 'auto',
        })}
      >
        {lastEventLines.length === 0 ? (
          <Typography className="ui-tip">You see nothing special.</Typography>
        ) : (
          lastEventLines.map((entry, index) => (
            <Typography key={`${entry}-${index}`}>{entry}</Typography>
          ))
        )}
      </Box>
    </Box>
  );
}

const readoutCommands: Command[] = [
  { id: 'readout-save', key: 'Shift+S', label: 'Save Game', disabled: false },
  { id: 'readout-quit', key: 'Shift+Q', label: 'Quit', disabled: false },
];

function triggerReadoutCommand(
  command: Command,
  handlers: { onSave: () => void; onBack: () => void }
) {
  if (command.id === 'readout-save') {
    handlers.onSave();
  } else if (command.id === 'readout-quit') {
    handlers.onBack();
  }
}

function StatsPanel({
  encounterMode,
  onBack,
  player,
  onSave,
  lastSavedAt,
  saveError,
}: {
  encounterMode: boolean;
  onBack: () => void;
  player: Player;
  onSave: () => void;
  lastSavedAt: string | null;
  saveError: string | null;
}) {
  const handleReadoutTrigger = (command: Command) =>
    triggerReadoutCommand(command, { onSave, onBack });

  return (
    <Box className="ui-panel" sx={(theme) => panelStyle(theme)}>
      <Stack spacing={2}>
        <Stack spacing={0.5}>
          <Typography sx={{ opacity: 0.75 }}>Mode</Typography>
          <Typography>{encounterMode ? 'Encounter' : 'Explore'}</Typography>
        </Stack>
        <Stack spacing={0.5}>
          <Typography sx={{ opacity: 0.75 }}>Stats</Typography>
          <Typography>ST {player.str}</Typography>
          <Typography>DX {player.dex}</Typography>
          <Typography>IQ {player.iq}</Typography>
          <Typography
            sx={(theme) => ({
              color:
                player.hp < 10
                  ? theme.palette.error.light
                  : theme.palette.text.primary,
            })}
          >
            HP {player.hp} / {player.mhp}
          </Typography>
        </Stack>
        <Stack spacing={0.5}>
          <Typography sx={{ opacity: 0.75 }}>Inventory</Typography>
          <Typography>Gold: {player.gold}</Typography>
          <Typography>Weapon: {player.weaponName}</Typography>
          <Typography>
            Armor: {player.armorName}
            {player.armorDamaged ? '*' : ''}
          </Typography>
          <Typography>Flares: {player.flares}</Typography>
          <Typography>Treasures: {player.treasuresFound.size}</Typography>
        </Stack>
        <Stack spacing={0.5}>
          <Typography sx={{ opacity: 0.75 }}>Location</Typography>
          <Typography>
            Floor {player.z + 1} · Room {player.y + 1},{player.x + 1}
          </Typography>
        </Stack>
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {readoutCommands.map((command) => (
              <CommandButton
                key={command.id}
                command={command}
                onTrigger={handleReadoutTrigger}
                layout="inline"
              />
            ))}
          </Stack>
          {lastSavedAt && (
            <Typography variant="caption">Saved {lastSavedAt}</Typography>
          )}
          {saveError && (
            <Typography variant="caption" color="error">
              {saveError}
            </Typography>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}

function CommandBarPanel({
  encounterMode,
  onTrigger,
  promptOptions,
  promptText,
  promptHasCancel,
  encounterCommandList,
  roomCommandList,
  buttonLayout = 'inline',
  titleVariant = 'default',
  enabledOnly = false,
}: {
  encounterMode: boolean;
  onTrigger: (command: Command) => void;
  promptOptions: PromptOption[] | null;
  promptText: string | null;
  promptHasCancel: boolean;
  encounterCommandList: Command[];
  roomCommandList: Command[];
  buttonLayout?: 'inline' | 'stacked' | 'compact';
  titleVariant?: 'default' | 'compact';
  enabledOnly?: boolean;
}) {
  const titleSx =
    titleVariant === 'compact'
      ? {
          letterSpacing: 1.4,
          textTransform: 'uppercase',
          opacity: 0.6,
          fontSize: 12,
        }
      : { letterSpacing: 2, textTransform: 'uppercase' };
  if (promptOptions && promptOptions.length > 0) {
    const commands = promptOptions.map((option) => ({
      id: `prompt-${option.key}`,
      key: option.key,
      label: option.label,
      disabled: option.disabled,
    }));
    if (promptHasCancel) {
      commands.push({
        id: 'prompt-cancel',
        key: 'Esc',
        label: 'Cancel',
        disabled: false,
      });
    }
    return (
      <Box
        className="ui-panel"
        sx={(theme) => ({
          ...panelStyle(theme),
          paddingY: { xs: 1.5, md: 2 },
        })}
      >
        <Stack spacing={2}>
          <Typography sx={titleSx}>{promptText || 'Choose'}</Typography>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.75,
            }}
          >
            {commands.map((command) => (
              <CommandButton
                key={command.id}
                command={command}
                onTrigger={onTrigger}
                layout={buttonLayout}
              />
            ))}
          </Box>
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      className="ui-panel"
      sx={(theme) => ({
        ...panelStyle(theme),
        paddingY: { xs: 1.5, md: 2 },
      })}
    >
      {encounterMode ? (
        <Stack spacing={2}>
          <Typography sx={titleSx}>Encounter Commands</Typography>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.75,
            }}
          >
            {(enabledOnly
              ? encounterCommandList.filter((command) => !command.disabled)
              : encounterCommandList
            ).map((command) => (
              <CommandButton
                key={command.id}
                command={command}
                onTrigger={onTrigger}
                layout={buttonLayout}
              />
            ))}
          </Box>
        </Stack>
      ) : (
        <Stack spacing={2}>
          <Typography sx={titleSx}>Explore Commands</Typography>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.75,
            }}
          >
            {(enabledOnly
              ? roomCommandList.filter((command) => !command.disabled)
              : roomCommandList
            ).map((command) => (
              <CommandButton
                key={command.id}
                command={command}
                onTrigger={onTrigger}
                layout={buttonLayout}
              />
            ))}
          </Box>
        </Stack>
      )}
    </Box>
  );
}

function PlayerReadoutPanel({
  encounterMode,
  player,
  onBack,
  onSave,
  lastSavedAt,
  saveError,
}: {
  encounterMode: boolean;
  player: Player;
  onBack: () => void;
  onSave: () => void;
  lastSavedAt: string | null;
  saveError: string | null;
}) {
  const handleReadoutTrigger = (command: Command) =>
    triggerReadoutCommand(command, { onSave, onBack });

  return (
    <Box className="ui-panel" sx={(theme) => panelStyle(theme)}>
      <Stack spacing={2} sx={{ height: '100%' }}>
        <Stack spacing={0.5}>
          <Typography sx={{ opacity: 0.75 }}>Mode</Typography>
          <Typography>{encounterMode ? 'Encounter' : 'Explore'}</Typography>
        </Stack>
        <Stack spacing={0.5}>
          <Typography sx={{ opacity: 0.75 }}>Stats</Typography>
          <Typography>ST {player.str}</Typography>
          <Typography>DX {player.dex}</Typography>
          <Typography>IQ {player.iq}</Typography>
          <Typography
            sx={(theme) => ({
              color:
                player.hp < 10
                  ? theme.palette.error.light
                  : theme.palette.text.primary,
            })}
          >
            HP {player.hp} / {player.mhp}
          </Typography>
        </Stack>
        <Stack spacing={0.5}>
          <Typography sx={{ opacity: 0.75 }}>Inventory</Typography>
          <Typography>Gold: {player.gold}</Typography>
          <Typography>Weapon: {player.weaponName}</Typography>
          <Typography>
            Armor: {player.armorName}
            {player.armorDamaged ? '*' : ''}
          </Typography>
          <Typography>Flares: {player.flares}</Typography>
          <Typography>Treasures: {player.treasuresFound.size}</Typography>
        </Stack>
        <Stack spacing={0.5}>
          <Typography sx={{ opacity: 0.75 }}>Location</Typography>
          <Typography>
            Floor {player.z + 1} · Room {player.y + 1},{player.x + 1}
          </Typography>
        </Stack>
        <Typography variant="caption" className="ui-tip">
          Tip: press the letter keys shown on each command.
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {readoutCommands.map((command) => (
              <CommandButton
                key={command.id}
                command={command}
                onTrigger={handleReadoutTrigger}
                layout="inline"
              />
            ))}
          </Stack>
          {lastSavedAt && (
            <Typography variant="caption">Saved {lastSavedAt}</Typography>
          )}
          {saveError && (
            <Typography variant="caption" color="error">
              {saveError}
            </Typography>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}

function HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            height: '80vh',
            maxHeight: '80vh',
          },
        },
      }}
      sx={(theme) => ({
        '& .MuiDialog-paper': {
          background: alpha(theme.palette.background.paper, 0.96),
          color: theme.palette.text.primary,
          border: `1px solid ${alpha(theme.palette.primary.light, 0.25)}`,
        },
      })}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography component="span" variant="inherit">
          Dungeon of Doom
        </Typography>
        <Typography
          aria-label="Close help"
          variant="inherit"
          onClick={onClose}
          sx={{
            cursor: 'pointer',
          }}
        >
          X
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Box
          sx={{
            ...helpContentSx,
          }}
          dangerouslySetInnerHTML={{ __html: helpHtmlContent }}
        />
      </DialogContent>
    </Dialog>
  );
}

function MobileHelpPanel({ onClose }: { onClose: () => void }) {
  return (
    <Box
      className="ui-panel"
      sx={(theme) => ({
        ...panelStyle(theme),
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      })}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingX: 1.5,
          paddingY: 1,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Typography sx={{ letterSpacing: 1.2, textTransform: 'uppercase' }}>
          Help
        </Typography>
        <Typography
          aria-label="Close help"
          onClick={onClose}
          sx={{ cursor: 'pointer', opacity: 0.75 }}
        >
          Close
        </Typography>
      </Box>
      <Box
        sx={{
          padding: 1.5,
          overflowY: 'auto',
          fontSize: 13,
          lineHeight: 1.5,
          '& *': {
            fontSize: 'inherit',
          },
          ...helpContentSx,
        }}
        dangerouslySetInnerHTML={{ __html: helpHtmlContent }}
      />
    </Box>
  );
}

function mapTooltip(cell: string): string {
  switch (cell) {
    case '*':
      return 'You';
    case '•':
    case '·':
      return 'Unknown';
    case '-':
      return 'Empty';
    case 'M':
      return 'Monster';
    case 'T':
      return 'Treasure';
    case 'm':
      return 'Mirror';
    case 's':
      return 'Scroll';
    case 'c':
      return 'Chest';
    case 'f':
      return 'Flares';
    case 'p':
      return 'Potion';
    case 'v':
      return 'Vendor';
    case 't':
      return 'Thief';
    case 'w':
      return 'Warp';
    case 'U':
      return 'Stairs Up';
    case 'D':
      return 'Stairs Down';
    case 'X':
      return 'Exit';
    default:
      return '';
  }
}

function GameplayMobile({ model }: { model: GameplayModel }) {
  const [mobileView, setMobileView] = useState<'play' | 'stats' | 'help'>(
    'play'
  );
  const mobileRoomCommands = model.roomCommandList.filter(
    (command) => command.id !== 'help'
  );
  const mobileEncounterCommands = model.encounterCommandList.filter(
    (command) => command.id !== 'help'
  );

  return (
    <>
      <Stack
        spacing={2}
        sx={{
          minHeight: 'calc(100dvh - 96px)',
          '& .MuiTypography-root': {
            fontSize: 13,
          },
          '& .MuiTypography-caption': {
            fontSize: 11,
          },
        }}
      >
        {mobileView === 'play' ? (
          <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
            <MobileMapPanel
              onTrigger={model.handleTrigger}
              mapGrid={model.mapGrid}
              playerX={model.player.x}
              playerY={model.player.y}
              movementCommandList={model.movementCommandList}
              verticalCommandList={model.verticalCommandList}
            />
            <CommandBarPanel
              encounterMode={model.isEncounter}
              onTrigger={model.handleTrigger}
              promptOptions={model.effectivePromptOptions}
              promptText={model.effectivePromptText}
              promptHasCancel={model.effectivePromptHasCancel}
              encounterCommandList={mobileEncounterCommands}
              roomCommandList={mobileRoomCommands}
              buttonLayout="inline"
              titleVariant="compact"
              enabledOnly
            />
            <CompactReadoutPanel
              encounterMode={model.isEncounter}
              player={model.player}
            />
            <MobileEventBubble lastEventLines={model.lastEventLines} />
          </Stack>
        ) : mobileView === 'stats' ? (
          <Stack spacing={2} sx={{ flex: 1 }}>
            <StatsPanel
              encounterMode={model.isEncounter}
              onBack={model.onBack}
              player={model.player}
              onSave={model.handleSave}
              lastSavedAt={model.lastSavedAt}
              saveError={model.saveError}
            />
          </Stack>
        ) : (
          <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
            <MobileHelpPanel onClose={() => setMobileView('play')} />
          </Stack>
        )}
      </Stack>
      <Box
        sx={(theme) => ({
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 20,
          padding: 1,
          borderTop: `1px solid ${alpha(theme.palette.primary.light, 0.4)}`,
          background: alpha(theme.palette.background.paper, 0.92),
          backdropFilter: 'blur(8px)',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 1,
        })}
      >
        <Button
          variant={mobileView === 'play' ? 'contained' : 'outlined'}
          onClick={() => setMobileView('play')}
        >
          Play
        </Button>
        <Button
          variant={mobileView === 'stats' ? 'contained' : 'outlined'}
          onClick={() => setMobileView('stats')}
        >
          Stats
        </Button>
        <Button
          variant={mobileView === 'help' ? 'contained' : 'outlined'}
          onClick={() => setMobileView('help')}
        >
          Help
        </Button>
      </Box>
    </>
  );
}

function GameplayDesktop({ model }: { model: GameplayModel }) {
  return (
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
      <Stack
        spacing={3}
        sx={{ height: '100%', justifyContent: 'space-between' }}
      >
        <MapPanel
          onTrigger={model.handleTrigger}
          mapGrid={model.mapGrid}
          playerX={model.player.x}
          playerY={model.player.y}
          movementCommandList={model.movementCommandList}
          verticalCommandList={model.verticalCommandList}
        />
        <EventFeedPanel turnEvents={model.turnEvents} />
        <CommandBarPanel
          encounterMode={model.isEncounter}
          onTrigger={model.handleTrigger}
          promptOptions={model.effectivePromptOptions}
          promptText={model.effectivePromptText}
          promptHasCancel={model.effectivePromptHasCancel}
          encounterCommandList={model.encounterCommandList}
          roomCommandList={model.roomCommandList}
        />
      </Stack>

      <PlayerReadoutPanel
        encounterMode={model.isEncounter}
        onBack={model.onBack}
        player={model.player}
        onSave={model.handleSave}
        lastSavedAt={model.lastSavedAt}
        saveError={model.saveError}
      />
    </Box>
  );
}

export default function Gameplay(props: GameplayProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const model = useGameplayModel(props);

  return (
    <Box
      sx={{
        maxWidth: 1280,
        margin: '0 auto',
        display: 'grid',
        gap: 3,
        containerType: 'inline-size',
        paddingBottom: { xs: 10, md: 0 },
        '@keyframes boot': {
          from: { opacity: 0, transform: 'translateY(14px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        animation: 'boot 650ms ease-out',
      }}
    >
      {isMobile ? (
        <GameplayMobile model={model} />
      ) : (
        <GameplayDesktop model={model} />
      )}
      {!isMobile && (
        <HelpDialog
          open={model.helpOpen}
          onClose={() => model.setHelpOpen(false)}
        />
      )}
    </Box>
  );
}
