export type WorkerRole = 'mason' | 'helper' | 'laborer';

export type AttendanceStatus = 'P' | 'P/2' | '1.5P' | '2P' | 'A' | '' | '-';

export interface WorkerWageHistory {
  effectiveDate: string;
  dailyWage: number;
}

export interface Worker {
  id: string;
  name: string;
  role: WorkerRole;
  dailyWage: number;
  wageHistory?: WorkerWageHistory[];
  phone?: string;
  isActive: boolean;
  notes?: string;
}

export interface WorkerPayment {
  id: string;
  workerId: string;
  date: string;
  amount: number;
  weekStartDate?: string;
  siteId?: string;
  paymentType: 'weekly_settlement' | 'advance' | 'bonus' | 'partial';
  notes?: string;
}

export interface SignificantActivity {
  date: string;
  description: string;
  status?: 'completed' | 'in_progress' | 'planned';
}

export interface ProjectSite {
  id: string;
  code: string; // e.g. "813-D"
  name: string; // e.g. "Sector D Villa"
  details: string; // e.g. "10 marla"
  contractValue: number;
  status: 'active' | 'on_hold' | 'completed';
  lastSignificantActivity?: SignificantActivity;
  nextSignificantActivity?: SignificantActivity;
  location?: string;
  clientName?: string;
  clientPhone?: string;
  startDate?: string;
  expectedCompletion?: string;
  notes?: string;
}

export interface ClientReceipt {
  id: string;
  siteId: string;
  date: string;
  amount: number;
  paymentMethod: string;
  referenceNo?: string;
  notes?: string;
}

export type SubcontractorCategory =
  | 'shuttering'
  | 'electrician'
  | 'steel_fixer'
  | 'plumber'
  | 'paint'
  | 'tiles'
  | 'masonry_contract'
  | 'other';

export interface Subcontractor {
  id: string;
  name: string; // e.g. "Asghar Shuttering"
  category: SubcontractorCategory;
  siteId: string; // associated project site
  contractValue: number; // total contract sum
  phone?: string;
  notes?: string;
}

export interface SubcontractorPayment {
  id: string;
  subcontractorId: string;
  siteId: string;
  weekStartDate: string; // YYYY-MM-DD
  date: string; // YYYY-MM-DD
  amount: number;
  description: string;
  paidBy?: string; // e.g. "TBD" or "Site Cash"
}

export interface AttendanceRecord {
  id: string;
  workerId: string;
  siteId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  units: number; // 1, 0.5, 1.5, 2, 0
  wage: number; // computed: units * worker.dailyWage
}

export interface AdditionalLaborPayment {
  id: string;
  siteId: string;
  weekStartDate: string;
  date: string;
  item: string; // e.g. "Rori", "Bricks/Rait lifting"
  amount: number;
  paidBy?: string; // e.g. "TBD"
  notes?: string;
}

export type MaterialUnit =
  | 'bags'
  | 'tons'
  | 'kg'
  | 'cft'
  | 'rft'
  | 'sft'
  | 'pieces'
  | 'trips'
  | 'litres'
  | 'truck';

export interface MaterialEntry {
  id: string;
  siteId: string;
  date: string;
  material: string; // e.g. Cement, Steel, Bricks, Sand (Rait), Crushed stone (Rori)
  quantity: number;
  unit: MaterialUnit;
  rate: number;
  total: number;
  supplier?: string;
  isPaid: boolean;
  notes?: string;
}

export interface WeeklySiteNotes {
  id: string;
  siteId: string;
  weekStartDate: string;
  notesText?: string;
  bricksRaitLabor?: number;
  advancePaidByTBD?: number;
  siteRemarks?: string;
}

export interface ConstructionAppData {
  sites: ProjectSite[];
  workers: Worker[];
  workerPayments: WorkerPayment[];
  subcontractors: Subcontractor[];
  attendance: AttendanceRecord[];
  additionalPayments: AdditionalLaborPayment[];
  subcontractorPayments: SubcontractorPayment[];
  materials: MaterialEntry[];
  clientReceipts: ClientReceipt[];
  weeklyNotes: WeeklySiteNotes[];
}
