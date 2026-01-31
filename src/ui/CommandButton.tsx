import { Button, Stack, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';

export type Command = {
  id: string;
  key: string;
  label: string;
  disabled: boolean;
  primary?: boolean;
};

type CommandButtonProps = {
  command: Command;
  onTrigger: (command: Command) => void;
  /**
   * Layout variants:
   * - inline: label + key hint on one row.
   * - stacked: label above key hint (used for nav pad).
   * - compact: key-only button (used for tight grids).
   *
   * Responsive behavior:
   * - inline on mobile becomes "inlineCompact" (reduced sizing).
   *
   * Mixing:
   * - Layout is chosen by the caller; this component only adapts sizing.
   */
  layout?: 'inline' | 'stacked' | 'compact';
};

export function CommandButton({
  command,
  onTrigger,
  layout = 'inline',
}: CommandButtonProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const stacked = layout === 'stacked';
  const compact = layout === 'compact';
  const inlineCompact = layout === 'inline' && isMobile;
  const arrowKeys: Record<string, string> = {
    N: '\uE01C',
    S: '\uE01D',
    W: '\uE01E',
    E: '\uE01F',
  };
  const displayKey = command.key.startsWith('Shift+')
    ? `\uE01C${command.key.slice(6)}`
    : command.id.startsWith('move-') && command.key in arrowKeys
      ? arrowKeys[command.key]
      : command.key === 'Esc'
        ? `\uE11B`
        : command.key;
  const isNav = command.id.startsWith('move-') || command.id === 'exit';
  const showKeyHint = !isMobile || compact;
  const layoutClass = compact
    ? 'ui-cmd-compact'
    : stacked
      ? 'ui-cmd-stacked'
      : inlineCompact
        ? 'ui-cmd-inline-compact'
        : 'ui-cmd-inline';
  return (
    <Button
      variant={command.primary ? 'contained' : 'outlined'}
      onClick={() => onTrigger(command)}
      color="primary"
      size={stacked || compact || inlineCompact ? 'small' : 'medium'}
      disabled={Boolean(command.disabled)}
      className={[isNav ? 'ui-nav-button' : '', layoutClass]
        .filter(Boolean)
        .join(' ')}
      sx={{
        textTransform: 'none',
      }}
    >
      {compact ? (
        <Typography
          sx={{
            fontSize: isNav ? 'var(--cmd-nav-key-size, 12px)' : 'inherit',
            fontWeight: 600,
          }}
        >
          {displayKey}
        </Typography>
      ) : stacked ? (
        <Stack spacing={0.2} alignItems="center">
          <Typography
            sx={{
              fontSize: isNav ? 'var(--cmd-nav-label-size, 11px)' : 'inherit',
            }}
          >
            {command.label}
          </Typography>
          {showKeyHint && (
            <Typography
              variant="caption"
              className={isNav ? 'ui-tip-compact-nav' : 'ui-tip-compact'}
            >
              {displayKey}
            </Typography>
          )}
        </Stack>
      ) : (
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ width: '100%' }}
        >
          <Typography
            sx={{
              fontSize: inlineCompact
                ? isNav
                  ? 'var(--cmd-nav-label-size, 12px)'
                  : 'inherit'
                : isNav
                  ? 'var(--cmd-nav-label-size, 13px)'
                  : 'inherit',
              lineHeight: 1.2,
              flex: 1,
            }}
          >
            {command.label}
          </Typography>
          {showKeyHint && (
            <Typography
              variant="caption"
              className={isNav ? 'ui-tip-compact-nav' : 'ui-tip-compact'}
            >
              {displayKey}
            </Typography>
          )}
        </Stack>
      )}
    </Button>
  );
}
