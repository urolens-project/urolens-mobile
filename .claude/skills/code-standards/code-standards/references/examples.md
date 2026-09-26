# Code Standards — Worked Examples

Reference implementations for the rules in `SKILL.md`. Names like `sample` are illustrative. Match the real DTOs in `src/types/api.ts` when writing actual code.

## Contents
1. Theme tokens — `src/theme/index.ts`
2. Icon wrapper — `src/components/Icon.tsx`
3. `useAsyncAction` — `src/hooks/useAsyncAction.ts`
4. API module — `src/features/<f>/api/<f>Api.ts`
5. Mapper — `src/features/<f>/mappers/<name>.mapper.ts`
6. Constants — `src/features/<f>/constants/<name>.constant.ts`
7. zustand store with selector hooks
8. Feature hook — `src/features/<f>/hooks/useXxx.ts`
9. Screen component
10. Thin route file

---

## 1. Theme tokens

```ts
// src/theme/index.ts
export const colors = {
  navy900: '#1E3A5F',
  slate700: '#374151',
  slate400: '#9CA3AF',
  white: '#FFFFFF',
  warning800: '#7C4A0A',
  overlay: 'rgba(0,0,0,0.4)',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 40 } as const;

export const radius = { sm: 4, md: 8, lg: 16 } as const;

export const typography = {
  caption: { fontSize: 12 },
  body: { fontSize: 13 },
  label: { fontSize: 14, fontWeight: '600' },
  title: { fontSize: 16, fontWeight: '600' },
  heading: { fontSize: 18, fontWeight: '600' },
} as const;
```

## 2. Icon wrapper

```tsx
// src/components/Icon.tsx
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { colors } from '@src/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

/**
 * @description Single entry point for icons so the icon set can be swapped or extended in one place.
 * @param name - Ionicons glyph name.
 * @param size - Pixel size, defaults to 20.
 * @param color - Defaults to the primary text color.
 */
export function Icon({ name, size = 20, color = colors.slate700 }: IconProps): React.JSX.Element {
  return <Ionicons name={name} size={size} color={color} />;
}
```

## 3. `useAsyncAction` (replaces `withLoading`)

```ts
// src/hooks/useAsyncAction.ts
import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseAsyncActionResult<TArgs extends unknown[], TResult> {
  run: (...args: TArgs) => Promise<TResult | undefined>;
  isLoading: boolean;
  error: Error | null;
}

/**
 * @description Wraps an async action so callers never toggle loading state by hand.
 * Aborts the previous in-flight call when a new one starts, and logs and exposes errors.
 * @param tag - Log prefix identifying the caller, e.g. 'Queue'.
 * @param action - Async function receiving an AbortSignal as its first argument.
 */
export function useAsyncAction<TArgs extends unknown[], TResult>(
  tag: string,
  action: (signal: AbortSignal, ...args: TArgs) => Promise<TResult>,
): UseAsyncActionResult<TArgs, TResult> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const run = useCallback(
    async (...args: TArgs): Promise<TResult | undefined> => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      setIsLoading(true);
      setError(null);
      try {
        return await action(controller.signal, ...args);
      } catch (err: unknown) {
        if (controller.signal.aborted) return undefined;
        console.error(`[${tag}]`, err);
        setError(err instanceof Error ? err : new Error(String(err)));
        return undefined;
      } finally {
        if (controllerRef.current === controller) setIsLoading(false);
      }
    },
    [tag, action],
  );

  return { run, isLoading, error };
}
```

## 4. API module

```ts
// src/features/sample/api/sampleApi.ts
import apiClient from '@lib/apiClient';
import type { SampleDetailDto, SampleListDto } from '@app-types/api';

export const sampleApi = {
  /**
   * @description Fetches one sample with its AI findings for the review screen.
   * @param id - Server sample id.
   * @param signal - Aborts the request when the screen unmounts or refetches.
   */
  async getById(id: string, signal?: AbortSignal): Promise<SampleDetailDto> {
    const response = await apiClient.get<SampleDetailDto>(`/samples/${id}`, { signal });
    return response.data;
  },

  /**
   * @description Paginated sample list, newest first by default.
   * @param params - Sort and page params, e.g. `{ sortBy: 'createdAt', sortOrder: 'desc', page: 1 }`.
   * @param signal - Abort signal.
   */
  async list(params: SampleListParams, signal?: AbortSignal): Promise<SampleListDto> {
    const response = await apiClient.get<SampleListDto>('/samples', { params, signal });
    return response.data;
  },
};

export interface SampleListParams {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  page: number;
}
```

## 5. Mapper (replaces `mapDataToUi()`)

```ts
// src/features/sample/mappers/sample.mapper.ts
import type { SampleDetailDto } from '@app-types/api';

import type { SampleUi } from '../types';

/**
 * @description Converts the API's snake_case sample payload into the camelCase UI model.
 * This is the only place snake_case fields may be read.
 * @param dto - Raw sample detail response.
 */
export function mapSampleToUi(dto: SampleDetailDto): SampleUi {
  return {
    id: dto.id,
    sampleUid: dto.sample_uid,
    aiFindings: dto.ai_findings ?? [],
    smartDiagnosis: dto.smart_diagnosis ?? null,
    receivedAt: new Date(dto.received_at),
  };
}
```

## 6. Constants

```ts
// src/features/specimen-rejection/constants/rejectionReason.constant.ts
import type { RejectionReasonOption } from '../types';

export const REJECTION_REASONS: RejectionReasonOption[] = [
  { value: 'INSUFFICIENT_VOLUME', label: 'Insufficient volume' },
  { value: 'CONTAMINATED', label: 'Contaminated' },
  { value: 'MISLABELED', label: 'Mislabeled' },
];

export const MAX_RETAKE_ATTEMPTS = 3;
```

## 7. zustand store with selector hooks (replaces `_private` + `asReadonly()`)

```ts
// src/lib/auth/authStore.ts
import { create } from 'zustand';

import type { UserRole } from '@app-types/enums';

interface AuthState {
  userId: string | null;
  role: UserRole | null;
  setAuthenticated: (userId: string, role: UserRole) => void;
  clearAuth: () => void;
}

// Not exported: components must go through the hooks below.
const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  role: null,
  setAuthenticated: (userId, role) => set({ userId, role }),
  clearAuth: () => set({ userId: null, role: null }),
}));

/** @description Read-only: current user's role. */
export const useAuthRole = (): UserRole | null => useAuthStore((s) => s.role);

/** @description Read-only: whether a user is signed in. */
export const useIsAuthenticated = (): boolean => useAuthStore((s) => s.userId !== null);

/** @description Write actions, stable across renders. */
export const useAuthActions = (): Pick<AuthState, 'setAuthenticated' | 'clearAuth'> => ({
  setAuthenticated: useAuthStore((s) => s.setAuthenticated),
  clearAuth: useAuthStore((s) => s.clearAuth),
});

/** @description Non-React access for interceptors and sync code only. */
export const authStoreApi = {
  clearAuth: (): void => useAuthStore.getState().clearAuth(),
};
```

## 8. Feature hook

```ts
// src/features/sample/hooks/useSampleDetail.ts
import { useCallback, useEffect, useState } from 'react';

import { useAsyncAction } from '@hooks/useAsyncAction';

import { sampleApi } from '../api/sampleApi';
import { mapSampleToUi } from '../mappers/sample.mapper';
import type { SampleUi } from '../types';

export interface UseSampleDetailResult {
  sample: SampleUi | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * @description Loads one sample for the review screen and exposes a manual refresh.
 * @param id - Server sample id from the route.
 */
export function useSampleDetail(id: string): UseSampleDetailResult {
  const [sample, setSample] = useState<SampleUi | null>(null);

  const fetchSample = useCallback(
    async (signal: AbortSignal): Promise<void> => {
      const dto = await sampleApi.getById(id, signal);
      setSample(mapSampleToUi(dto));
    },
    [id],
  );
  const { run, isLoading, error } = useAsyncAction('SampleDetail', fetchSample);

  useEffect(() => {
    void run();
  }, [run]);

  const refresh = useCallback(async (): Promise<void> => {
    await run();
  }, [run]);

  return { sample, isLoading, error, refresh };
}
```

## 9. Screen component

```tsx
// src/features/sample/components/SampleDetailScreen.tsx
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { colors, radius, spacing, typography } from '@src/theme';

import { EmptyState } from '@components/EmptyState';
import { Icon } from '@components/Icon';
import { LoadingOverlay } from '@components/LoadingOverlay';

import { useSampleDetail } from '../hooks/useSampleDetail';

export interface SampleDetailScreenProps {
  sampleId: string;
  onConfirmed?: (sampleId: string) => void;
}

/**
 * @description Review screen for a single sample: shows AI findings and lets the medtech confirm.
 * @param sampleId - Server sample id.
 * @param onConfirmed - Called after a successful confirmation.
 */
export function SampleDetailScreen({
  sampleId,
  onConfirmed,
}: SampleDetailScreenProps): React.JSX.Element {
  // 1. Stores / router / services
  const router = useRouter();
  const { isOnline } = useNetworkStatus();
  const { sample, isLoading, error } = useSampleDetail(sampleId);

  // 3. State & derived
  const [isExpanded, setIsExpanded] = useState(false);
  const findingCount = useMemo((): number => sample?.aiFindings.length ?? 0, [sample]);

  // 6. Handlers
  const handleToggle = useCallback((): void => setIsExpanded((prev) => !prev), []);
  const handleConfirm = useCallback((): void => {
    onConfirmed?.(sampleId);
    router.back();
  }, [onConfirmed, sampleId, router]);

  // Early returns
  if (isLoading) return <LoadingOverlay />;
  if (error) return <EmptyState title="Couldn't load sample" subtitle={error.message} />;
  if (!sample) return <EmptyState title="Sample not found" subtitle="It may have been removed." />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable style={styles.header} onPress={handleToggle}>
        <Text style={styles.title}>{sample.sampleUid}</Text>
        <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} />
      </Pressable>

      {isExpanded && <Text style={styles.subtitle}>{findingCount} AI findings</Text>}

      <Pressable
        style={[styles.button, !isOnline && styles.buttonDisabled]}
        disabled={!isOnline}
        onPress={handleConfirm}
      >
        <Text style={styles.buttonText}>Confirm result</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { ...typography.title, color: colors.slate700 },
  subtitle: { ...typography.body, color: colors.slate400 },
  button: {
    backgroundColor: colors.navy900,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { ...typography.label, color: colors.white },
});
```

## 10. Thin route file

```tsx
// app/(medtech)/sample/[id].tsx
import { useLocalSearchParams } from 'expo-router';

import { SampleDetailScreen } from '@features/sample/components/SampleDetailScreen';

/**
 * @description Route entry for /sample/:id. Reads params and renders the feature screen only.
 */
export default function SampleRoute(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SampleDetailScreen sampleId={id} />;
}
```
