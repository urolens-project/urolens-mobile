import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import { OverrideEntryForm } from '@features/manual-override/components/OverrideEntryForm';

export default function OverrideScreen(): React.JSX.Element {
  const { id, parameter, originalValue } = useLocalSearchParams<{
    id: string;
    parameter: string;
    originalValue: string;
  }>();

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Override Parameter',
          headerBackTitle: 'Result',
        }}
      />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <OverrideEntryForm
          resultId={id}
          parameter={parameter}
          originalAiValue={Number(originalValue ?? '0')}
        />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F3F4F6' },
});
