import clsx from 'clsx';

import titleImage from '../assets/DofDTitle.png';
import styles from './TitleScreen.module.css';

type TitleScreenProps = {
  onStart?: () => void;
  hasSave?: boolean;
  onContinue?: () => void;
  continueError?: string | null;
};

export default function TitleScreen({
  onStart,
  hasSave = false,
  onContinue,
  continueError = null,
}: TitleScreenProps) {
  const handleStart = () => {
    if (!onStart) return;
    onStart();
  };

  const handleContinue = () => {
    if (!onContinue) return;
    onContinue();
  };

  return (
    <div className={styles.root}>
      <div className={styles.titleFrame}>
        <img
          className={styles.titleImage}
          src={titleImage}
          alt="Dungeon of Doom title screen"
        />
      </div>
      <div className={styles.intro}>
        <p className={styles.introText}>
          Now, brave adventurer: prepare to choose thy race, arm thyself, and
          descend into the dungeon.
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            className={clsx('btn', 'btn-contained', styles.actionButton)}
            onClick={handleStart}
          >
            Begin Setup
          </button>
          {hasSave && (
            <button
              type="button"
              className={clsx('btn', 'btn-outlined', styles.actionButton)}
              onClick={handleContinue}
            >
              Continue Quest
            </button>
          )}
        </div>
        {continueError && <p className={styles.error}>{continueError}</p>}
      </div>
      <div className={styles.credits}>
        <p>
          Dungeon of Doom was created by Fred Polgardy and Eric Phillips between
          Christmas 1987 and New Years 1988. It was written in BASIC on an Atari
          800XL.
        </p>
        <p>
          The original game engine was ported to Python and TypeScript in
          conversation with OpenAI's GPT-5.2-Codex.
        </p>
        <p>
          I have attempted to preserve the language and visual style of the game
          while updating to a more modern experience. Enjoy!
        </p>
      </div>
    </div>
  );
}
