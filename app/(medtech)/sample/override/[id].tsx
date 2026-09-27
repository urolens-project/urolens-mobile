import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';

import { colors } from '@src/theme';

import { OverrideEntryForm } from '@features/manual-override/components/OverrideEntryForm';

/**
 * @description Route entry for /sample/override/:id. Reads override params and renders
 * the manual-override feature's entry form.
 */
export default function OverrideScreen(): React.JSX.Element {
  const { id, parameter, originalValue, specimenId } = useLocalSearchParams<{
    id: string;
    parameter: string;
    originalValue: string;
    specimenId: string;
  }>();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <OverrideEntryForm
          resultId={id}
          specimenId={specimenId ?? ''}
          parameter={parameter}
          originalAiValue={Number(originalValue ?? '0')}
        />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
});
