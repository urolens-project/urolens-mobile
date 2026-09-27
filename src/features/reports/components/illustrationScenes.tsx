import { StyleSheet } from 'react-native';

import { Icon } from '@components/Icon';

import { Badge, Dot, Droplet, Paper } from './illustrationParts';

// One scene per report category, composed from the shared building blocks in
// illustrationParts.tsx. Rendered by ReportIllustration.tsx. Positions below are
// hand-placed illustration coordinates (not layout spacing) — left as literal
// numbers, same as the computed geometry in illustrationParts.tsx's styles.

export interface SceneProps {
  color: string;
  blob: string;
}

/**
 * @description Report awaiting a supervisor: the sheet with an hourglass.
 * @param color - Category accent color.
 * @param blob - Secondary droplet color.
 */
export function PendingScene({ color, blob }: SceneProps): React.JSX.Element {
  return (
    <>
      <Paper accent={color} />
      <Badge icon="timer-sand" color={color} iconSize={24} position="bottomRight" />
      <Droplet size={12} color={blob} style={styles.pendingDropletLg} />
      <Droplet size={8} color={color} style={styles.pendingDropletSm} />
    </>
  );
}

/**
 * @description Report approved: the sheet with an approval seal.
 * @param color - Category accent color.
 */
export function ApprovedScene({ color }: Pick<SceneProps, 'color'>): React.JSX.Element {
  return (
    <>
      <Paper accent={color} />
      <Badge icon="check-decagram" color={color} iconSize={32} position="bottomRight" />
      <Icon
        family="material-community"
        name="star-four-points"
        size={16}
        color={color}
        style={styles.approvedStarLg}
      />
      <Icon
        family="material-community"
        name="star-four-points"
        size={10}
        color={color}
        style={styles.approvedStarSm}
      />
    </>
  );
}

/**
 * @description Report released: the sheet with a paper plane flying off it.
 * @param color - Category accent color.
 */
export function ReleasedScene({ color }: Pick<SceneProps, 'color'>): React.JSX.Element {
  return (
    <>
      <Paper accent={color} />
      <Badge
        icon="send"
        color={color}
        iconSize={22}
        position="topRight"
        style={styles.releasedBadgeTilt}
      />
      <Dot size={5} color={color} style={styles.releasedDotLg} />
      <Dot size={4} color={color} style={styles.releasedDotMd} />
      <Dot size={3} color={color} style={styles.releasedDotSm} />
    </>
  );
}

/**
 * @description Specimen rejected: a test tube with a cross, and the sample spilling.
 * @param color - Category accent color.
 * @param blob - Secondary droplet color.
 */
export function RejectedScene({ color, blob }: SceneProps): React.JSX.Element {
  return (
    <>
      <Icon family="material-community" name="test-tube" size={78} color={color} style={styles.tube} />
      <Badge icon="close-circle" color={color} iconSize={30} position="bottomRight" />
      <Droplet size={11} color={color} style={styles.rejectedDropletLg} />
      <Droplet size={7} color={blob} style={styles.rejectedDropletSm} />
    </>
  );
}

const styles = StyleSheet.create({
  tube: {
    position: 'absolute',
    top: 14,
    left: 24,
    transform: [{ rotate: '22deg' }],
  },
  pendingDropletLg: { position: 'absolute', top: 8, right: 16 },
  pendingDropletSm: { position: 'absolute', top: 30, right: 3, opacity: 0.5 },
  approvedStarLg: { position: 'absolute', top: 6, right: 12, opacity: 0.8 },
  approvedStarSm: { position: 'absolute', top: 30, right: 2, opacity: 0.55 },
  releasedBadgeTilt: { transform: [{ rotate: '-22deg' }] },
  releasedDotLg: { position: 'absolute', top: 44, right: 44, opacity: 0.6 },
  releasedDotMd: { position: 'absolute', top: 53, right: 36, opacity: 0.45 },
  releasedDotSm: { position: 'absolute', top: 60, right: 30, opacity: 0.3 },
  rejectedDropletLg: { position: 'absolute', top: 88, left: 22 },
  rejectedDropletSm: { position: 'absolute', top: 100, left: 40 },
});
