// Path: urolens-mobile/src/db/models/FieldDetection.ts
import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export interface Detection {
  id: string;
  particleType: string;
  confidence: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Device-only cache of one field's AI boxes (SDD Module 2 proposal, Section
 * 8: "boxes read from the local field_detections table, so a field shows
 * its boxes offline"). Never synced — boxes are never sent on /sync/pull,
 * only on the field capture response and GET /fields/{field_id}.
 */
export default class FieldDetection extends Model {
  static table = 'field_detections';

  // References ResultField's local WatermelonDB id, not server_id, so this
  // row is linkable even for a field still waiting on its first upload.
  @field('field_id') fieldId!: string;
  @field('detections_json') detectionsJson!: string;
  @field('image_width') imageWidth!: number;
  @field('image_height') imageHeight!: number;

  // Computed getter — parses the AI boxes safely
  get detections(): Detection[] {
    try {
      return JSON.parse(this.detectionsJson) as Detection[];
    } catch {
      return [];
    }
  }
}
