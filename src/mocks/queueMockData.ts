import type { QueueItem } from '../features/queue/types';

function t(h: number, m: number): string {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

export const MOCK_QUEUE_ITEMS: QueueItem[] = [
  {
    id: '1', serverId: 'srv-1', sampleUid: '88241',
    patientName: 'Sarah Jenkins', patientUid: 'PT-001',
    testType: 'Urinalysis', status: 'ASSIGNED',
    priorityLevel: 'HIGH', receivedAt: t(10, 45),
    medtechId: 'mt-1', syncedAt: null,
    rejectionReason: null, rejectionNote: null, rejectedAt: null,
  },
  {
    id: '2', serverId: 'srv-2', sampleUid: '88242',
    patientName: 'John Doe', patientUid: 'PT-002',
    testType: 'Urinalysis', status: 'IN_QUEUE',
    priorityLevel: 'NORMAL', receivedAt: t(11, 15),
    medtechId: 'mt-1', syncedAt: null,
    rejectionReason: null, rejectionNote: null, rejectedAt: null,
  },
  {
    id: '3', serverId: 'srv-3', sampleUid: '88239',
    patientName: 'Michael Vance', patientUid: 'PT-003',
    testType: 'Urinalysis', status: 'PROCESSING',
    priorityLevel: 'NORMAL', receivedAt: t(9, 30),
    medtechId: 'mt-1', syncedAt: null,
    rejectionReason: null, rejectionNote: null, rejectedAt: null,
  },
  {
    id: '4', serverId: 'srv-4', sampleUid: '88245',
    patientName: 'Elena Rodriguez', patientUid: 'PT-004',
    testType: 'Urinalysis', status: 'ASSIGNED',
    priorityLevel: 'HIGH', receivedAt: t(11, 42),
    medtechId: 'mt-1', syncedAt: null,
    rejectionReason: null, rejectionNote: null, rejectedAt: null,
  },
  {
    id: '5', serverId: 'srv-5', sampleUid: '88246',
    patientName: 'Amanda Lee', patientUid: 'PT-005',
    testType: 'Urinalysis', status: 'IN_QUEUE',
    priorityLevel: 'NORMAL', receivedAt: t(11, 55),
    medtechId: 'mt-1', syncedAt: null,
    rejectionReason: null, rejectionNote: null, rejectedAt: null,
  },
  {
    id: '6', serverId: 'srv-6', sampleUid: '88250',
    patientName: 'Robert Cruz', patientUid: 'PT-006',
    testType: 'Urinalysis', status: 'PROCESSING',
    priorityLevel: 'NORMAL', receivedAt: t(8, 50),
    medtechId: 'mt-1', syncedAt: null,
    rejectionReason: null, rejectionNote: null, rejectedAt: null,
  },
  {
    id: '7', serverId: 'srv-7', sampleUid: '88253',
    patientName: 'Diana Santos', patientUid: 'PT-007',
    testType: 'Urinalysis', status: 'ASSIGNED',
    priorityLevel: 'HIGH', receivedAt: t(10, 10),
    medtechId: 'mt-1', syncedAt: null,
    rejectionReason: null, rejectionNote: null, rejectedAt: null,
  },
  {
    id: '8', serverId: 'srv-8', sampleUid: '88255',
    patientName: 'Carlos Reyes', patientUid: 'PT-008',
    testType: 'Urinalysis', status: 'PROCESSING',
    priorityLevel: 'NORMAL', receivedAt: t(9, 5),
    medtechId: 'mt-1', syncedAt: null,
    rejectionReason: null, rejectionNote: null, rejectedAt: null,
  },
  {
    id: '9', serverId: 'srv-9', sampleUid: '88258',
    patientName: 'Isabella Lim', patientUid: 'PT-009',
    testType: 'Urinalysis', status: 'IN_QUEUE',
    priorityLevel: 'LOW', receivedAt: t(12, 3),
    medtechId: 'mt-1', syncedAt: null,
    rejectionReason: null, rejectionNote: null, rejectedAt: null,
  },
  {
    id: '10', serverId: 'srv-10', sampleUid: '88260',
    patientName: 'James Tan', patientUid: 'PT-010',
    testType: 'Urinalysis', status: 'PROCESSING',
    priorityLevel: 'NORMAL', receivedAt: t(8, 20),
    medtechId: 'mt-1', syncedAt: null,
    rejectionReason: null, rejectionNote: null, rejectedAt: null,
  },
  {
    id: '11', serverId: 'srv-11', sampleUid: '88263',
    patientName: 'Maria Garcia', patientUid: 'PT-011',
    testType: 'Urinalysis', status: 'IN_QUEUE',
    priorityLevel: 'NORMAL', receivedAt: t(12, 18),
    medtechId: 'mt-1', syncedAt: null,
    rejectionReason: null, rejectionNote: null, rejectedAt: null,
  },
  {
    id: '12', serverId: 'srv-12', sampleUid: '88265',
    patientName: 'Kevin Park', patientUid: 'PT-012',
    testType: 'Urinalysis', status: 'PROCESSING',
    priorityLevel: 'NORMAL', receivedAt: t(7, 45),
    medtechId: 'mt-1', syncedAt: null,
    rejectionReason: null, rejectionNote: null, rejectedAt: null,
  },
];
