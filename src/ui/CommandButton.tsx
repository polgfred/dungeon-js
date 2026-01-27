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
  layout?: 'inline' | 'stacked';
};

export function CommandButton({
  command,
  onTrigger,
  layout = 'inline',
}: CommandButtonProps) {
  const stacked = layout === 'stacked';
  return (
    <Button
      variant="outlined"
      onClick={() => onTrigger(command)}
      color="primary"
      size={stacked ? 'small' : 'medium'}
      disabled={Boolean(command.disabled)}
      sx={{
        textTransform: 'none',
        letterSpacing: stacked ? 0.8 : 0.6,
        paddingY: stacked ? 0.6 : 1,
        paddingX: stacked ? 1.5 : 2,
        minWidth: stacked ? 72 : 0,
      }}
    >
      {stacked ? (
        <Stack spacing={0.2} alignItems="center">
          <Typography sx={{ fontSize: 11 }}>{command.label}</Typography>
          <Typography variant="caption" sx={{ opacity: 0.6, fontSize: 10 }}>
            {command.key}
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
            {command.key}
          </Typography>
        </Stack>
      )}
    </Button>
  );
}
