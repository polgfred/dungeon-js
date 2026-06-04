import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';

import helpHtmlContent from '../assets/help.html?raw';
import type { Player, Room } from '../dungeon/model.js';
import type { EncounterSave, PlayerSave } from '../dungeon/serialization.js';
import type { EventKind, PromptOption } from '../dungeon/types.js';
import { CommandButton, type Command } from './CommandButton.js';
import { Dialog, DialogContent, DialogTitle } from './Dialog.js';
import type {
  EventLine,
  GameplayModel,
  GameplayProps,
} from './GameplayModel.js';
import { useGameplayModel } from './GameplayModel.js';
import { GLYPH_PATHS, type GlyphId } from './glyphPaths.js';
import styles from './Gameplay.module.css';
import { Tooltip } from './Tooltip.js';
import { useMediaQuery } from './useMediaQuery.js';
import { Feature } from '../dungeon/constants.js';

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.copyIcon}>
      <path d="M16 1H6C4.9 1 4 1.9 4 3v12h2V3h10V1zm3 4H10c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h9c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16h-9V7h9v14z" />
    </svg>
  );
}

// hidden sprite of <symbol> defs, mounted once
function GlyphDefs() {
  return (
    <svg
      width={0}
      height={0}
      aria-hidden="true"
      style={{ position: 'absolute' }}
    >
      <defs>
        {Object.entries(GLYPH_PATHS).map(([id, d]) => (
          <symbol key={id} id={`glyph-${id}`} viewBox="0 0 8 8">
            <path d={d} fill="currentColor" shapeRendering="crispEdges" />
          </symbol>
        ))}
      </defs>
    </svg>
  );
}

function GlyphIcon({ id }: { id: GlyphId }) {
  return (
    <svg className={styles.mapGlyph} viewBox="0 0 8 8" aria-hidden="true">
      <use href={`#glyph-${id}`} />
    </svg>
  );
}

function MapGrid({
  rows,
  playerX,
  playerY,
  rowOffset = 0,
  colOffset = 0,
  showTooltips = true,
}: {
  rows: Room[][];
  playerX: number;
  playerY: number;
  rowOffset?: number;
  colOffset?: number;
  showTooltips?: boolean;
}) {
  return (
    <div className={styles.mapGridOuter}>
      {rows.map((row, rowIndex) => (
        <div key={`row-${rowIndex}`} className={styles.mapGridRow}>
          {row.map((cell, colIndex) => {
            const isPlayerCell =
              rowOffset + rowIndex === playerY &&
              colOffset + colIndex === playerX;
            const { id, tooltip, className } = mapGlyph(cell);
            const cellBox = (
              <div
                className={clsx(
                  styles.mapCell,
                  className,
                  isPlayerCell && styles.mapCellPlayer,
                  !cell.seen && styles.mapCellDim
                )}
              >
                {id && <GlyphIcon id={id} />}
              </div>
            );
            return showTooltips ? (
              <Tooltip key={`${rowIndex}-${colIndex}`} title={tooltip}>
                {cellBox}
              </Tooltip>
            ) : (
              <div key={`${rowIndex}-${colIndex}`}>{cellBox}</div>
            );
          })}
        </div>
      ))}
    </div>
  );
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
  mapGrid: Room[][];
  playerX: number;
  playerY: number;
  movementCommandList: Command[];
  verticalCommandList: Command[];
  buttonLayout?: 'inline' | 'stacked' | 'compact';
}) {
  return (
    <div className={clsx('ui-panel', styles.panel)}>
      <div className={styles.mapPanelLayout}>
        <MapGrid rows={mapGrid} playerX={playerX} playerY={playerY} />
        <div className={styles.mapControls}>
          <div className={styles.mapDpad}>
            <div />
            <CommandButton
              command={movementCommandList[0]}
              onTrigger={onTrigger}
              layout={buttonLayout}
            />
            <div />
            <CommandButton
              command={movementCommandList[1]}
              onTrigger={onTrigger}
              layout={buttonLayout}
            />
            <div className={styles.mapDpadCenter} />
            <CommandButton
              command={movementCommandList[2]}
              onTrigger={onTrigger}
              layout={buttonLayout}
            />
            <div />
            <CommandButton
              command={movementCommandList[3]}
              onTrigger={onTrigger}
              layout={buttonLayout}
            />
            <div />
          </div>
          <div className={styles.mapVerticals}>
            {verticalCommandList.map((command) => (
              <CommandButton
                key={command.id}
                command={command}
                onTrigger={onTrigger}
                layout={buttonLayout}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
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
  windowSize = 5,
}: {
  onTrigger: (command: Command) => void;
  mapGrid: Room[][];
  playerX: number;
  playerY: number;
  movementCommandList: Command[];
  verticalCommandList: Command[];
  buttonLayout?: 'inline' | 'stacked' | 'compact';
  windowSize?: number;
}) {
  const totalRows = mapGrid.length;
  const totalCols = mapGrid[0]?.length ?? 0;
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
  const visibleRows = mapGrid
    .slice(rowStart, rowStart + safeWindowSize)
    .map((row) => row.slice(colStart, colStart + safeWindowSize));

  return (
    <div className={clsx('ui-panel', styles.panel)}>
      <div className={styles.mobileMapLayout}>
        <div className={styles.mobileMapGridWrap}>
          <MapGrid
            rows={visibleRows}
            playerX={playerX}
            playerY={playerY}
            rowOffset={rowStart}
            colOffset={colStart}
            showTooltips={false}
          />
        </div>
        <div className={styles.mobileMapControls}>
          <div className={styles.mobileMapDpad}>
            <CommandButton
              command={movementCommandList[0]}
              onTrigger={onTrigger}
              layout={buttonLayout}
            />
            <div className={styles.mobileMapDpadRow}>
              <CommandButton
                command={movementCommandList[1]}
                onTrigger={onTrigger}
                layout={buttonLayout}
              />
              <CommandButton
                command={movementCommandList[2]}
                onTrigger={onTrigger}
                layout={buttonLayout}
              />
            </div>
            <CommandButton
              command={movementCommandList[3]}
              onTrigger={onTrigger}
              layout={buttonLayout}
            />
          </div>
          <div className={styles.mobileMapVerticals}>
            {verticalCommandList.map((command) => (
              <CommandButton
                key={command.id}
                command={command}
                onTrigger={onTrigger}
                layout={buttonLayout}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const eventKindClass: Partial<Record<EventKind, string>> = {
  LOOT: styles.eventLoot,
  COMBAT: styles.eventCombat,
  ERROR: styles.eventError,
};

function EventFeedPanel({ turnEvents }: { turnEvents: EventLine[][] }) {
  const eventFeedRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = eventFeedRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [turnEvents]);

  return (
    <div className={styles.eventFeedContainer}>
      <div ref={eventFeedRef} className={styles.eventFeedScroller}>
        <div className={styles.eventFeedSpacer} />
        {turnEvents.length === 0 ? (
          <p className={clsx('txt-caption', 'ui-tip')}>
            You see nothing special.
          </p>
        ) : (
          turnEvents.map((group, groupIndex) => {
            const isLatest = groupIndex === turnEvents.length - 1;
            return (
              <div key={`turn-${groupIndex}`} className={styles.subtleBox}>
                <div className={styles.eventEntries}>
                  {group.map((entry, index) => (
                    <p
                      key={`${entry.text}-${index}`}
                      className={clsx(
                        styles.eventEntry,
                        isLatest && eventKindClass[entry.kind],
                        !isLatest && styles.eventEntryStale
                      )}
                    >
                      {entry.text}
                    </p>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
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
    <div className={clsx('ui-panel', styles.panel, styles.compactReadout)}>
      <div className={styles.compactReadoutGroup}>
        <p className={styles.label}>Mode</p>
        <p>{encounterMode ? 'Encounter' : 'Explore'}</p>
      </div>
      <div className={styles.compactReadoutGroup}>
        <p className={styles.label}>Status</p>
        <p>
          ST {player.str} · DX {player.dex} · IQ {player.iq}
        </p>
        <p>
          HP {player.hp} / {player.mhp} · Gold {player.gold}
        </p>
        <p>
          Floor {player.z + 1} · Room {player.y + 1},{player.x + 1}
        </p>
      </div>
    </div>
  );
}

function MobileEventBubble({
  lastEventLines,
}: {
  lastEventLines: EventLine[];
}) {
  return (
    <div className={clsx('ui-panel', styles.panel, styles.mobileEventOuter)}>
      <div className={styles.mobileEventInner}>
        {lastEventLines.length === 0 ? (
          <p className={clsx('txt-caption', 'ui-tip')}>
            You see nothing special.
          </p>
        ) : (
          lastEventLines.map((entry, index) => (
            <p
              key={`${entry.text}-${index}`}
              className={clsx(styles.eventEntry, eventKindClass[entry.kind])}
            >
              {entry.text}
            </p>
          ))
        )}
      </div>
    </div>
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

function statusMarkerTooltip(title: string) {
  return (
    <Tooltip title={title}>
      <span aria-label={title} className={styles.statusMarker}>
        *
      </span>
    </Tooltip>
  );
}

function StatsPanel({
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
    <div className={clsx('ui-panel', styles.panel)}>
      <div className={styles.statsPanel}>
        <div className={styles.statsGroup}>
          <p className={styles.label}>Mode</p>
          <p>{encounterMode ? 'Encounter' : 'Explore'}</p>
        </div>
        <div className={styles.statsGroup}>
          <p className={styles.label}>Stats</p>
          <p>ST {player.str}</p>
          <p>DX {player.dex}</p>
          <p>IQ {player.iq}</p>
          <p className={clsx(player.hp < 10 && styles.hpLow)}>
            HP {player.hp} / {player.mhp}
          </p>
        </div>
        <div className={styles.statsGroup}>
          <p className={styles.label}>Inventory</p>
          <p>Gold: {player.gold}</p>
          <p>
            Weapon: {player.weaponName}
            {player.weaponBroken
              ? statusMarkerTooltip('Weapon is broken')
              : null}
          </p>
          <p>
            Armour: {player.armorName}
            {player.armorTier === 0
              ? statusMarkerTooltip('Armour is destroyed')
              : player.armorDamaged
                ? statusMarkerTooltip('Armour is damaged')
                : null}
          </p>
          <p>Flares: {player.flares}</p>
          <p>Treasures: {player.treasuresFound.size}</p>
        </div>
        <div className={styles.statsGroup}>
          <p className={styles.label}>Location</p>
          <p>
            Floor {player.z + 1} · Room {player.y + 1},{player.x + 1}
          </p>
        </div>
        <div className={styles.statsBottom}>
          <div className={styles.statsCommands}>
            {readoutCommands.map((command) => (
              <CommandButton
                key={command.id}
                command={command}
                onTrigger={handleReadoutTrigger}
                layout="inline"
              />
            ))}
          </div>
          {lastSavedAt && (
            <p className={styles.statsSavedAt}>Saved {lastSavedAt}</p>
          )}
          {saveError && <p className={styles.statsSaveError}>{saveError}</p>}
        </div>
      </div>
    </div>
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
  const titleClass = clsx(
    titleVariant === 'compact' ? 'ui-panel-title-compact' : 'ui-panel-title',
    titleVariant === 'compact'
      ? styles.commandTitleCompact
      : styles.commandTitle
  );

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
      <div className={clsx('ui-panel', styles.panel, styles.commandPanel)}>
        <div className={styles.commandSection}>
          <p className={titleClass}>{promptText || 'Choose'}</p>
          <div className={styles.commandButtons}>
            {commands.map((command) => (
              <CommandButton
                key={command.id}
                command={command}
                onTrigger={onTrigger}
                layout={buttonLayout}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const list = encounterMode ? encounterCommandList : roomCommandList;
  const title = encounterMode ? 'Encounter Commands:' : 'Explore Commands:';
  const visible = enabledOnly
    ? list.filter((command) => !command.disabled)
    : list;

  return (
    <div className={clsx('ui-panel', styles.panel, styles.commandPanel)}>
      <div className={styles.commandSection}>
        <p className={titleClass}>{title}</p>
        <div className={styles.commandButtons}>
          {visible.map((command) => (
            <CommandButton
              key={command.id}
              command={command}
              onTrigger={onTrigger}
              layout={buttonLayout}
            />
          ))}
        </div>
      </div>
    </div>
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
    <div className={clsx('ui-panel', styles.panel)}>
      <div className={styles.statsPanel}>
        <div className={styles.statsGroup}>
          <p className={styles.label}>Mode</p>
          <p>{encounterMode ? 'Encounter' : 'Explore'}</p>
        </div>
        <div className={styles.statsGroup}>
          <p className={styles.label}>Stats</p>
          <p>ST {player.str}</p>
          <p>DX {player.dex}</p>
          <p>IQ {player.iq}</p>
          <p className={clsx(player.hp < 10 && styles.hpLow)}>
            HP {player.hp} / {player.mhp}
          </p>
        </div>
        <div className={styles.statsGroup}>
          <p className={styles.label}>Inventory</p>
          <p>Gold: {player.gold}</p>
          <p>
            Weapon: {player.weaponName}
            {player.weaponBroken
              ? statusMarkerTooltip('Weapon is broken')
              : null}
          </p>
          <p>
            Armour: {player.armorName}
            {player.armorTier === 0
              ? statusMarkerTooltip('Armour is destroyed')
              : player.armorDamaged
                ? statusMarkerTooltip('Armour is damaged')
                : null}
          </p>
          <p>Flares: {player.flares}</p>
          <p>Treasures: {player.treasuresFound.size}</p>
        </div>
        <div className={styles.statsGroup}>
          <p className={styles.label}>Location</p>
          <p>
            Floor {player.z + 1} · Room {player.y + 1},{player.x + 1}
          </p>
        </div>
        <span className={clsx('txt-caption', 'ui-tip')}>
          Tip: press the letter keys shown on each command.
        </span>
        <div className={styles.statsSpacer} />
        <div className={styles.statsBottom}>
          <div className={styles.statsCommands}>
            {readoutCommands.map((command) => (
              <CommandButton
                key={command.id}
                command={command}
                onTrigger={handleReadoutTrigger}
                layout="inline"
              />
            ))}
          </div>
          {lastSavedAt && (
            <p className={styles.statsSavedAt}>Saved {lastSavedAt}</p>
          )}
          {saveError && <p className={styles.statsSaveError}>{saveError}</p>}
        </div>
      </div>
    </div>
  );
}

function HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} className={styles.helpDialog}>
      <DialogTitle onClose={onClose}>Dungeon of Doom</DialogTitle>
      <DialogContent dividers>
        <div
          className={styles.helpContent}
          dangerouslySetInnerHTML={{ __html: helpHtmlContent }}
        />
      </DialogContent>
    </Dialog>
  );
}

function MobileHelpPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className={clsx('ui-panel', styles.panel, styles.mobileHelpPanel)}>
      <div className={styles.mobileHelpHeader}>
        <p className={styles.mobileHelpHeading}>Help</p>
        <span
          role="button"
          tabIndex={0}
          aria-label="Close help"
          onClick={onClose}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') onClose();
          }}
          className={styles.mobileHelpClose}
        >
          Close
        </span>
      </div>
      <div
        className={clsx(styles.mobileHelpContent, styles.helpContent)}
        dangerouslySetInnerHTML={{ __html: helpHtmlContent }}
      />
    </div>
  );
}

type MapGlyph = {
  id?: GlyphId;
  tooltip: string;
  className?: string;
};

function mapGlyph(room: Room): MapGlyph {
  if (!room.seen) return { id: 'DOT', tooltip: 'Unknown' };
  if (room.monsterLevel > 0)
    return {
      id: 'MONSTER',
      tooltip: 'Monster',
      className: styles.mapGlyphDanger,
    };
  if (room.treasureId)
    return {
      id: 'GEM',
      tooltip: 'Treasure',
      className: styles.mapGlyphTreasure,
    };
  switch (room.feature) {
    case Feature.EMPTY:
      return { tooltip: 'Empty' };
    case Feature.MIRROR:
      return { id: 'MIRROR', tooltip: 'Mirror' };
    case Feature.SCROLL:
      return { id: 'SCROLL', tooltip: 'Scroll' };
    case Feature.CHEST:
      return { id: 'CHEST', tooltip: 'Chest' };
    case Feature.FLARES:
      return { id: 'FLAME', tooltip: 'Flares' };
    case Feature.POTION:
      return { id: 'FLASK', tooltip: 'Potion' };
    case Feature.VENDOR:
      return { id: 'VENDOR', tooltip: 'Vendor' };
    case Feature.THIEF:
      return {
        id: 'THIEF',
        tooltip: 'Thief',
        className: styles.mapGlyphDanger,
      };
    case Feature.WARP:
      return {
        id: 'WARP',
        tooltip: 'Warp',
        className: styles.mapGlyphDanger,
      };
    case Feature.STAIRS_UP:
      return { id: 'STAIRS_UP', tooltip: 'Stairs Up' };
    case Feature.STAIRS_DOWN:
      return { id: 'STAIRS_DOWN', tooltip: 'Stairs Down' };
    case Feature.EXIT:
      return {
        id: 'EXIT',
        tooltip: 'Exit',
        className: styles.mapGlyphTreasure,
      };
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
      <div className={styles.mobileShell}>
        {mobileView === 'play' ? (
          <div className={styles.mobilePlayShell}>
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
          </div>
        ) : mobileView === 'stats' ? (
          <div className={styles.mobileStatsShell}>
            <StatsPanel
              encounterMode={model.isEncounter}
              onBack={model.onBack}
              player={model.player}
              onSave={model.handleSave}
              lastSavedAt={model.lastSavedAt}
              saveError={model.saveError}
            />
          </div>
        ) : (
          <div className={styles.mobileHelpShell}>
            <MobileHelpPanel onClose={() => setMobileView('play')} />
          </div>
        )}
      </div>
      <div className={styles.mobileNav}>
        <button
          type="button"
          className={clsx(
            'btn',
            mobileView === 'play' ? 'btn-contained' : 'btn-outlined'
          )}
          onClick={() => setMobileView('play')}
        >
          Play
        </button>
        <button
          type="button"
          className={clsx(
            'btn',
            mobileView === 'stats' ? 'btn-contained' : 'btn-outlined'
          )}
          onClick={() => setMobileView('stats')}
        >
          Stats
        </button>
        <button
          type="button"
          className={clsx(
            'btn',
            mobileView === 'help' ? 'btn-contained' : 'btn-outlined'
          )}
          onClick={() => setMobileView('help')}
        >
          Help
        </button>
      </div>
    </>
  );
}

function GameplayDesktop({ model }: { model: GameplayModel }) {
  return (
    <div className={styles.desktopGrid}>
      <div className={styles.desktopLeft}>
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
      </div>

      <PlayerReadoutPanel
        encounterMode={model.isEncounter}
        onBack={model.onBack}
        player={model.player}
        onSave={model.handleSave}
        lastSavedAt={model.lastSavedAt}
        saveError={model.saveError}
      />
    </div>
  );
}

function DebugDialog({
  open,
  onClose,
  snapshot,
}: {
  open: boolean;
  onClose: () => void;
  snapshot: { player: PlayerSave; encounter: EncounterSave | null } | null;
}) {
  if (!snapshot) {
    return null;
  }

  const copyToClipboard = (text: string) => {
    if (navigator?.clipboard?.writeText) {
      void navigator.clipboard.writeText(text);
    }
  };

  const playerJson = JSON.stringify(snapshot.player, null, 2);
  const encounterJson = snapshot.encounter
    ? JSON.stringify(snapshot.encounter, null, 2)
    : 'No active encounter.';
  const buildInfo = [
    `Commit: ${import.meta.env.COMMIT_SHA}`,
    `Built (UTC): ${import.meta.env.COMMIT_UTC}`,
  ].join('\n');

  return (
    <Dialog open={open} onClose={onClose} className={styles.debugDialog}>
      <DialogTitle id="debug-dialog-title">Debug Snapshot</DialogTitle>
      <DialogContent dividers>
        <div className={styles.commandSection}>
          <div className={styles.statsGroup}>
            <span className={clsx('txt-overline', styles.label)}>Build</span>
            <pre className={styles.debugBlock}>{buildInfo}</pre>
          </div>
          <div className={styles.statsGroup}>
            <div className={styles.statsCommands}>
              <span className={clsx('txt-overline', styles.label)}>Player</span>
              <Tooltip title="Copy player JSON">
                <button
                  type="button"
                  aria-label="Copy player JSON"
                  className="btn-icon"
                  onClick={() => copyToClipboard(playerJson)}
                >
                  <CopyIcon />
                </button>
              </Tooltip>
            </div>
            <pre className={styles.debugBlock}>{playerJson}</pre>
          </div>
          <div className={styles.statsGroup}>
            <div className={styles.statsCommands}>
              <span className={clsx('txt-overline', styles.label)}>
                Encounter
              </span>
              <Tooltip title="Copy encounter JSON">
                <button
                  type="button"
                  aria-label="Copy encounter JSON"
                  className="btn-icon"
                  onClick={() => copyToClipboard(encounterJson)}
                >
                  <CopyIcon />
                </button>
              </Tooltip>
            </div>
            <pre className={styles.debugBlock}>{encounterJson}</pre>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Gameplay(props: GameplayProps) {
  const isMobile = useMediaQuery('(max-width: 899px)');
  const model = useGameplayModel(props);

  return (
    <div className={styles.root}>
      <GlyphDefs />
      {isMobile ? (
        <GameplayMobile model={model} />
      ) : (
        <GameplayDesktop model={model} />
      )}
      <DebugDialog
        open={model.debugOpen}
        onClose={() => model.setDebugOpen(false)}
        snapshot={model.debugSnapshot}
      />
      {!isMobile && (
        <HelpDialog
          open={model.helpOpen}
          onClose={() => model.setHelpOpen(false)}
        />
      )}
    </div>
  );
}
