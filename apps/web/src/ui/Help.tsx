import clsx from 'clsx';

import styles from './Help.module.css';
import { navigate } from './useRoute.js';

export default function Help() {
  return (
    <div className={styles.root}>
      <div className={styles.titleFrame}>
        <div
          className={styles.titleImage}
          role="img"
          aria-label="Dungeon of Doom title screen"
        />
      </div>

      <article className={styles.sheet}>
        <p className={styles.subtitle}>
          An Adventure for the Bold, the Doomed, and Their Companions
        </p>

        <p className={styles.lede}>
          Beneath the world lies the DUNGEON of DOOM, and in its dark are hidden
          ten treasures of unspeakable worth. Many have gone seeking them. The
          dungeon still waits for those who are worthy.
        </p>

        <section className={styles.section}>
          <h2 className={styles.heading}>Thy Quest</h2>
          <p>
            Enter together. Recover all ten treasures. Climb back to the light
            and step out of the dungeon's mouth —{' '}
            <em>every last one of you.</em> The quest is won only when all ten
            treasures are found <em>and</em> every adventurer has escaped. Leave
            a treasure in the dark and the exit will not have you. Leave a
            companion in the dark and you have not won at all.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>The Price</h2>
          <p>
            The dungeon is not fair, and was never meant to be. Should even one
            of you fail, the quest falls with them — there is no coming back for
            the dead, and no triumph without them. Most parties do not climb
            out. This is not a flaw in the dungeon. This <em>is</em> the
            dungeon.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>How You Ascend</h2>
          <p>
            There are no turns to wait for, and no clock to race.{' '}
            <em>The dungeon does nothing until one of you acts</em> — so move as
            one or scatter to the corners, hurry or hold still. You may stop and
            take counsel for as long as you please; nothing creeps closer while
            you talk.
          </p>
          <p>
            One map is drawn between you — where any of you treads, the way is
            lit for all. Yet the map will not tell you who stands bleeding, who
            has a beast at their throat, or who has strayed too far to call back.
            So speak to one another. A dungeon is best survived out loud.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>What You May Do</h2>
          <ul className={styles.verbs}>
            <li>
              <strong>Walk</strong> the halls in any direction.
            </li>
            <li>
              <strong>Look</strong> about you, and consult what map you have
              earned.
            </li>
            <li>
              <strong>Carry and spend</strong> what you find — light, and other
              aids. The dark is deep and your supplies are not. Spend wisely.
            </li>
            <li>
              <strong>Stand and fight</strong> what bars your way.
            </li>
            <li>
              <strong>Gaze</strong> into any mirror you find. The glass shows
              each gazer a vision — though not the same vision to every gazer,
              nor always a true one.
            </li>
            <li>
              <strong>Take the exit</strong> when your work is done — and wait
              there for your companions.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>A Word Before You Go</h2>
          <p>
            Not everything in the dark wishes you well, and not everything that{' '}
            <em>offers</em> to help is honest. Some of what you find will be a
            gift, and some will be a grin. The rest you must learn in the dark,
            as every soul before you has done.
          </p>
          <p>Go in together. Come up together. Or do not come up at all.</p>
        </section>

        <p className={styles.hail}>THE DUNGEON AWAITS YOU...</p>
      </article>

      <div className={styles.actions}>
        <button
          type="button"
          className={clsx('btn', 'btn-outlined')}
          onClick={() => navigate('/')}
        >
          Back
        </button>
      </div>
    </div>
  );
}
