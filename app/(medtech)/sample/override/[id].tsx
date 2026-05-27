import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import { OverrideEntryForm } from '@features/manual-override/components/OverrideEntryForm';

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
  safe: { flex: 1, backgroundColor: '#F7F6F3' },
});
