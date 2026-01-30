import { Button, Stack, Typography } from '@mui/material';

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
  const stacked = layout === 'stacked';
  const compact = layout === 'compact';
  const arrowKeys: Record<string, string> = {
    N: '\uE01C',
    S: '\uE01D',
    W: '\uE01E',
    E: '\uE01F',
  };
  const displayKey = command.key.startsWith('Shift+')
    ? `\uE01C${command.key.slice(6)}`
    : command.key in arrowKeys
      ? arrowKeys[command.key]
    : command.key === 'Esc'
      ? `\uE11B`
      : command.key;
  return (
    <Button
      variant="outlined"
      onClick={() => onTrigger(command)}
      color="primary"
      size={stacked || compact ? 'small' : 'medium'}
      disabled={Boolean(command.disabled)}
      sx={{
        textTransform: 'none',
        letterSpacing: compact ? 1.2 : stacked ? 0.8 : 0.6,
        paddingY: compact ? 0.6 : stacked ? 0.6 : 1,
        paddingX: compact ? 1.2 : stacked ? 1.5 : 2,
        minWidth: compact ? 44 : stacked ? 72 : 0,
      }}
    >
      {compact ? (
        <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
          {displayKey}
        </Typography>
      ) : stacked ? (
        <Stack spacing={0.2} alignItems="center">
          <Typography sx={{ fontSize: 11 }}>{command.label}</Typography>
          <Typography variant="caption" sx={{ opacity: 0.6, fontSize: 10 }}>
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
              fontSize: 13,
              lineHeight: 1.2,
              flex: 1,
            }}
          >
            {command.label}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.6 }}>
            {displayKey}
          </Typography>
        </Stack>
      )}
    </Button>
  );
}
