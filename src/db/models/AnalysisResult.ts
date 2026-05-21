import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';
import { SmartDiagnosisDTO } from '@app-types/domain';

export default class AnalysisResult extends Model {
  static table = 'analysis_results';

  @field('server_id')              serverId!: string | null;
  @field('specimen_id')            specimenId!: string;
  @field('ai_findings_json')       aiFindingsJson!: string;
  @field('flagged_anomalies_json') flaggedAnomaliesJson!: string | null;
  @field('smart_diagnosis_json')   smartDiagnosisJson!: string | null;
  @field('status')                 status!: string;
  @field('image_id')               imageId!: string | null;
  @field('synced_at')              syncedAt!: string | null;

  get aiFindings(): Record<string, number> {
    try {
      return JSON.parse(this.aiFindingsJson);
    } catch {
      return {};
    }
  }

  get smartDiagnosis(): SmartDiagnosisDTO | null {
    try {
      return this.smartDiagnosisJson ? JSON.parse(this.smartDiagnosisJson) : null;
    } catch {
      return null;
    }
  }
}
