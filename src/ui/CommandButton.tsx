import { Button, Stack, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';

export type Command = {
  id: string;
  key: string;
  label: string;
  disabled: boolean;
};

type CommandButtonProps = {
  command: Command;
  onTrigger: (command: Command) => void;
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
  const layoutClass = compact
    ? 'ui-cmd-compact'
    : stacked
      ? 'ui-cmd-stacked'
      : inlineCompact
        ? 'ui-cmd-inline-compact'
        : 'ui-cmd-inline';
  const minWidth = isNav
    ? 'var(--cmd-nav-min-w, 64px)'
    : compact
      ? 'var(--cmd-min-w-compact, 44px)'
      : stacked
        ? 'var(--cmd-min-w-stacked, 72px)'
        : inlineCompact
          ? 'var(--cmd-min-w-inline-compact, 0)'
          : 'var(--cmd-min-w, 0)';
  return (
    <Button
      variant="outlined"
      onClick={() => onTrigger(command)}
      color="primary"
      size={stacked || compact || inlineCompact ? 'small' : 'medium'}
      disabled={Boolean(command.disabled)}
      className={[isNav ? 'ui-nav-button' : '', layoutClass]
        .filter(Boolean)
        .join(' ')}
      sx={{
        textTransform: 'none',
        letterSpacing: compact ? 1.2 : stacked ? 0.8 : inlineCompact ? 0.5 : 0.6,
        paddingY: compact
          ? 'var(--cmd-pad-y-compact, 4.8px)'
          : stacked
            ? 'var(--cmd-pad-y-stacked, 4.8px)'
            : inlineCompact
              ? 'var(--cmd-pad-y-inline-compact, 4.8px)'
              : 'var(--cmd-pad-y, 8px)',
        paddingX: compact
          ? 'var(--cmd-pad-x-compact, 9.6px)'
          : stacked
            ? 'var(--cmd-pad-x-stacked, 12px)'
            : inlineCompact
              ? 'var(--cmd-pad-x-inline-compact, 11.2px)'
              : 'var(--cmd-pad-x, 16px)',
        minWidth,
      }}
    >
      {compact ? (
        <Typography
          sx={{
            fontSize: 'var(--cmd-label-size-compact, 12px)',
            fontWeight: 600,
          }}
        >
          {displayKey}
        </Typography>
      ) : stacked ? (
        <Stack spacing={0.2} alignItems="center">
          <Typography sx={{ fontSize: 'var(--cmd-label-size-stacked, 11px)' }}>
            {command.label}
          </Typography>
          <Typography variant="caption" className="ui-tip-compact">
            {displayKey}
          </Typography>
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
                ? 'var(--cmd-label-size-inline-compact, 12px)'
                : 'var(--cmd-label-size-inline, 13px)',
              lineHeight: 1.2,
              flex: 1,
            }}
          >
            {command.label}
          </Typography>
          <Typography
            variant="caption"
            className="ui-tip-compact"
          >
            {displayKey}
          </Typography>
        </Stack>
      )}
    </Button>
  );
}
