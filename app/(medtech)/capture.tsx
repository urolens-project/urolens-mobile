import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// app/(medtech)/capture.tsx
/**
 * T2.7 — Image Capture Route
 *
 * This is a thin Expo Router screen. All logic lives in ImageCaptureScreen.
 *
 * Expected query params (from expo-router useLocalSearchParams):
 *   specimenId       — UUID of the specimen being analysed (required)
 *   existingImageId  — UUID of a previously uploaded image (present on retake only)
 *
 * Navigation in:
 *   sample/[id].tsx → "Begin Analysis" button → router.push('/(medtech)/capture', { specimenId })
 *   sample/[id].tsx → "Retake" on result review → router.push with existingImageId
 *
 * Navigation out (from ImageCaptureScreen):
 *   Success → router.replace('/(medtech)/sample/[id]', { id: specimenId, resultId })
 *   Back    → router.back()
 */
 
import { ImageCaptureScreen } from '@features/image-retake/components/ImageCaptureScreen';
 
export default function CaptureRoute() {
  return <ImageCaptureScreen />;
}