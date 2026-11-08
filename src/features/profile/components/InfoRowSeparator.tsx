import { StyleSheet, View } from 'react-native';

import { spacing } from '@src/theme';

/**
 * @description Thin divider between two InfoRows inside a Profile card, indented to
 * align under the row's text rather than its icon.
 */
export function InfoRowSeparator(): React.JSX.Element {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  separator: {
    height: 0.5,
    backgroundColor: 'rgba(0,0,0,0.07)',
    marginLeft: spacing.jumbo,
  },
});
