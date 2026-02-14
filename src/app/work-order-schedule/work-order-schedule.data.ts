import type {
  WorkCenterDocument,
  WorkOrderStatus
} from './work-order-schedule';

interface WorkOrderSeed {
  docId: string;
  name: string;
  workCenterId: string;
  status: WorkOrderStatus;
  start: {
    monthOffset: number;
    dayOfMonth: number;
  };
  end: {
    monthOffset: number;
    dayOfMonth: number;
  };
}

export const SAMPLE_WORK_CENTERS: WorkCenterDocument[] = [
  { docId: 'wc1', docType: 'workCenter', data: { name: 'Genesis Hardware' } },
  { docId: 'wc2', docType: 'workCenter', data: { name: 'Rodriques Electrics' } },
  { docId: 'wc3', docType: 'workCenter', data: { name: 'Konsulting Inc' } },
  { docId: 'wc4', docType: 'workCenter', data: { name: 'McMarrow Distribution' } },
  { docId: 'wc5', docType: 'workCenter', data: { name: 'Spartan Manufacturing' } }
];

export const SAMPLE_WORK_ORDER_SEEDS: WorkOrderSeed[] = [
  { docId: 'wo1', name: 'Batch 24-001', workCenterId: 'wc1', status: 'complete', start: { monthOffset: -2, dayOfMonth: 4 }, end: { monthOffset: -2, dayOfMonth: 18 } },
  { docId: 'wo2', name: 'Die Setup A', workCenterId: 'wc1', status: 'in-progress', start: { monthOffset: 0, dayOfMonth: 5 }, end: { monthOffset: 0, dayOfMonth: 16 } },
  { docId: 'wo13', name: 'Final Packaging Y', workCenterId: 'wc1', status: 'open', start: { monthOffset: 2, dayOfMonth: 7 }, end: { monthOffset: 2, dayOfMonth: 21 } },
  { docId: 'wo3', name: 'CNC Job #145', workCenterId: 'wc2', status: 'in-progress', start: { monthOffset: -1, dayOfMonth: 10 }, end: { monthOffset: -1, dayOfMonth: 24 } },
  { docId: 'wo4', name: 'Fixture Rework', workCenterId: 'wc2', status: 'open', start: { monthOffset: 1, dayOfMonth: 3 }, end: { monthOffset: 1, dayOfMonth: 15 } },
  { docId: 'wo14', name: 'Advanced Machining', workCenterId: 'wc2', status: 'complete', start: { monthOffset: 3, dayOfMonth: 9 }, end: { monthOffset: 3, dayOfMonth: 23 } },
  { docId: 'wo5', name: 'Assembly Pack B', workCenterId: 'wc3', status: 'in-progress', start: { monthOffset: -3, dayOfMonth: 12 }, end: { monthOffset: -3, dayOfMonth: 27 } },
  { docId: 'wo9', name: 'Spring Assembly', workCenterId: 'wc3', status: 'blocked', start: { monthOffset: 0, dayOfMonth: 19 }, end: { monthOffset: 1, dayOfMonth: 4 } },
  { docId: 'wo15', name: 'Complex Systems', workCenterId: 'wc3', status: 'open', start: { monthOffset: 4, dayOfMonth: 6 }, end: { monthOffset: 4, dayOfMonth: 20 } },
  { docId: 'wo6', name: 'QC Hold 001', workCenterId: 'wc4', status: 'blocked', start: { monthOffset: -2, dayOfMonth: 20 }, end: { monthOffset: -1, dayOfMonth: 7 } },
  { docId: 'wo11', name: 'Tooling Setup', workCenterId: 'wc4', status: 'open', start: { monthOffset: 4, dayOfMonth: 2 }, end: { monthOffset: 4, dayOfMonth: 18 } },
  { docId: 'wo16', name: 'Final Inspection', workCenterId: 'wc4', status: 'in-progress', start: { monthOffset: 5, dayOfMonth: 5 }, end: { monthOffset: 5, dayOfMonth: 18 } },
  { docId: 'wo7', name: 'Final Packaging X', workCenterId: 'wc5', status: 'open', start: { monthOffset: -1, dayOfMonth: 4 }, end: { monthOffset: -1, dayOfMonth: 18 } },
  { docId: 'wo12', name: 'Quality Control Pass', workCenterId: 'wc5', status: 'complete', start: { monthOffset: 1, dayOfMonth: 20 }, end: { monthOffset: 2, dayOfMonth: 6 } },
  { docId: 'wo17', name: 'Packaging Transfer', workCenterId: 'wc5', status: 'blocked', start: { monthOffset: 4, dayOfMonth: 11 }, end: { monthOffset: 4, dayOfMonth: 25 } }
];
