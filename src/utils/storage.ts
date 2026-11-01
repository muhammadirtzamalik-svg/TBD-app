import { ConstructionAppData } from '../types';

const STORAGE_KEY = 'construction_control_siteledger_v1';

export const INITIAL_DATA: ConstructionAppData = {
  sites: [
    {
      id: 'site-813d',
      code: '813-D',
      name: 'Sector D Villa (813-D)',
      details: '10 marla, Plot 813-D',
      contractValue: 12500000,
      status: 'active',
      location: 'Block D, Sector 5, Phase 2',
      clientName: 'Malik Tahir',
      clientPhone: '+92 300 9876543',
      startDate: '2026-09-01',
      expectedCompletion: '2027-04-30',
      lastSignificantActivity: {
        date: '2026-10-10',
        description: 'Ground floor lintel beam casting and curing inspection',
        status: 'completed',
      },
      nextSignificantActivity: {
        date: '2026-10-24',
        description: 'First floor roof slab shuttering, steel binding & concrete pouring',
        status: 'planned',
      },
      notes: '10 Marla modern Spanish architectural style villa. Quality grey structure.',
    },
    {
      id: 'site-402b',
      code: '402-B',
      name: 'Sector B House (402-B)',
      details: '5 marla, Plot 402-B',
      contractValue: 7200000,
      status: 'active',
      location: 'Block B, Sector 3',
      clientName: 'Dr. Salman',
      clientPhone: '+92 321 8765432',
      startDate: '2026-09-15',
      expectedCompletion: '2027-03-31',
      lastSignificantActivity: {
        date: '2026-10-11',
        description: 'Plumbing rough-in and piping pressure test completed',
        status: 'completed',
      },
      nextSignificantActivity: {
        date: '2026-10-26',
        description: 'Internal wall plastering & wet areas waterproofing',
        status: 'planned',
      },
      notes: '5 Marla contemporary duplex.',
    },
  ],
  workers: [
    // Masons (Mistri)
    {
      id: 'w-nasir',
      name: 'Nasir',
      role: 'mason',
      dailyWage: 1650,
      phone: '+92 300 1234567',
      isActive: true,
      notes: 'Lead mason, brickwork and lintel specialist',
      wageHistory: [{ effectiveDate: '2026-09-01', dailyWage: 1650 }],
    },
    {
      id: 'w-asif',
      name: 'Asif',
      role: 'mason',
      dailyWage: 1650,
      phone: '+92 301 2345678',
      isActive: true,
      notes: 'Finishing & column specialist',
      wageHistory: [{ effectiveDate: '2026-09-01', dailyWage: 1650 }],
    },
    {
      id: 'w-rasheed',
      name: 'Rasheed',
      role: 'mason',
      dailyWage: 1600,
      phone: '+92 302 3456789',
      isActive: true,
      notes: 'Plaster and alignment mason',
      wageHistory: [{ effectiveDate: '2026-09-01', dailyWage: 1600 }],
    },
    // Helpers
    {
      id: 'w-akram',
      name: 'Akram',
      role: 'helper',
      dailyWage: 1300,
      phone: '+92 303 4567890',
      isActive: true,
      notes: 'Mortar mixing & scaffolding',
      wageHistory: [{ effectiveDate: '2026-09-01', dailyWage: 1300 }],
    },
    {
      id: 'w-bilal',
      name: 'Bilal',
      role: 'helper',
      dailyWage: 1300,
      phone: '+92 304 5678901',
      isActive: true,
      notes: 'Material handling',
      wageHistory: [{ effectiveDate: '2026-09-01', dailyWage: 1300 }],
    },
    // Laborers (Mazdoor)
    {
      id: 'w-sultan',
      name: 'Sultan',
      role: 'laborer',
      dailyWage: 1100,
      phone: '+92 305 6789012',
      isActive: true,
      notes: 'General excavation & lifting',
      wageHistory: [{ effectiveDate: '2026-09-01', dailyWage: 1100 }],
    },
    {
      id: 'w-dilawar',
      name: 'Dilawar',
      role: 'laborer',
      dailyWage: 1100,
      phone: '+92 306 7890123',
      isActive: true,
      notes: 'Concrete pouring and carrying',
      wageHistory: [{ effectiveDate: '2026-09-01', dailyWage: 1100 }],
    },
    {
      id: 'w-qadeer',
      name: 'Qadeer',
      role: 'laborer',
      dailyWage: 1100,
      phone: '+92 307 8901234',
      isActive: true,
      notes: 'Site cleaning and material loading',
      wageHistory: [{ effectiveDate: '2026-09-01', dailyWage: 1100 }],
    },
    {
      id: 'w-sajad',
      name: 'Sajad',
      role: 'laborer',
      dailyWage: 1100,
      phone: '+92 308 9012345',
      isActive: true,
      notes: 'Brick lifting and stack handling',
      wageHistory: [{ effectiveDate: '2026-09-01', dailyWage: 1100 }],
    },
  ],
  workerPayments: [
    {
      id: 'wp-1',
      workerId: 'w-nasir',
      date: '2026-10-10',
      amount: 4000,
      weekStartDate: '2026-10-05',
      paymentType: 'weekly_settlement',
      notes: 'Settled previous week wages',
    },
    {
      id: 'wp-adv-1',
      workerId: 'w-nasir',
      date: '2026-10-12',
      amount: 2500,
      weekStartDate: '2026-10-10',
      siteId: 'site-813d',
      paymentType: 'advance',
      notes: 'Weekly advance taken for home expenses',
    },
    {
      id: 'wp-adv-2',
      workerId: 'w-asif',
      date: '2026-10-13',
      amount: 2000,
      weekStartDate: '2026-10-10',
      siteId: 'site-813d',
      paymentType: 'advance',
      notes: 'Weekly cash advance',
    },
    {
      id: 'wp-adv-3',
      workerId: 'w-imran',
      date: '2026-10-14',
      amount: 1500,
      weekStartDate: '2026-10-10',
      siteId: 'site-813d',
      paymentType: 'advance',
      notes: 'Advance for fuel & travel',
    },
  ],
  subcontractors: [
    {
      id: 'sub-asghar',
      name: 'Asghar Shuttering',
      category: 'shuttering',
      siteId: 'site-813d',
      contractValue: 320000,
      phone: '+92 321 4455667',
      notes: 'Full shuttering for 10 Marla villa slabs and beams',
    },
    {
      id: 'sub-bashir',
      name: 'Bashir Electrician',
      category: 'electrician',
      siteId: 'site-813d',
      contractValue: 190000,
      phone: '+92 333 5566778',
      notes: 'Conduit piping, DB dressing & complete wiring',
    },
    {
      id: 'sub-tariq',
      name: 'Tariq Steel Fixer',
      category: 'steel_fixer',
      siteId: 'site-813d',
      contractValue: 240000,
      phone: '+92 345 6677889',
      notes: 'Rebar cutting, bending, and slab mesh binding',
    },
    {
      id: 'sub-farhan',
      name: 'Farhan Plumbing Works',
      category: 'plumber',
      siteId: 'site-813d',
      contractValue: 175000,
      phone: '+92 312 7788990',
      notes: 'PPRC cold/hot lines and UPVC drainage sanitary',
    },
  ],
  attendance: [
    // Date 15 (2026-10-15 - Thursday) on 813-D:
    {
      id: 'att-1',
      workerId: 'w-nasir',
      siteId: 'site-813d',
      date: '2026-10-15',
      status: 'P/2',
      units: 0.5,
      wage: 825,
    },
    {
      id: 'att-2',
      workerId: 'w-asif',
      siteId: 'site-813d',
      date: '2026-10-15',
      status: 'P/2',
      units: 0.5,
      wage: 825,
    },
    {
      id: 'att-3',
      workerId: 'w-qadeer',
      siteId: 'site-813d',
      date: '2026-10-15',
      status: 'P/2',
      units: 0.5,
      wage: 550,
    },
    {
      id: 'att-4',
      workerId: 'w-sajad',
      siteId: 'site-813d',
      date: '2026-10-15',
      status: 'P/2',
      units: 0.5,
      wage: 550,
    },
    // Date 14 (2026-10-14 - Wednesday) on 813-D:
    {
      id: 'att-5',
      workerId: 'w-nasir',
      siteId: 'site-813d',
      date: '2026-10-14',
      status: 'P',
      units: 1.0,
      wage: 1650,
    },
    {
      id: 'att-6',
      workerId: 'w-asif',
      siteId: 'site-813d',
      date: '2026-10-14',
      status: 'P',
      units: 1.0,
      wage: 1650,
    },
    {
      id: 'att-7',
      workerId: 'w-sultan',
      siteId: 'site-813d',
      date: '2026-10-14',
      status: 'P',
      units: 1.0,
      wage: 1100,
    },
    {
      id: 'att-8',
      workerId: 'w-dilawar',
      siteId: 'site-813d',
      date: '2026-10-14',
      status: 'P',
      units: 1.0,
      wage: 1100,
    },
    // Date 12 (Monday) on 402-B for Nasir to demonstrate multi-site toll:
    {
      id: 'att-9',
      workerId: 'w-nasir',
      siteId: 'site-402b',
      date: '2026-10-12',
      status: 'P',
      units: 1.0,
      wage: 1650,
    },
    {
      id: 'att-10',
      workerId: 'w-sultan',
      siteId: 'site-402b',
      date: '2026-10-12',
      status: 'P',
      units: 1.0,
      wage: 1100,
    },
  ],
  additionalPayments: [
    {
      id: 'add-1',
      siteId: 'site-813d',
      weekStartDate: '2026-10-10',
      date: '2026-10-15',
      item: 'Rori',
      amount: 10500,
      paidBy: 'TBD',
      notes: 'Crushed stone lifting and foundation filling labor (Paid by TBD)',
    },
  ],
  subcontractorPayments: [
    {
      id: 'subpay-1',
      subcontractorId: 'sub-asghar',
      siteId: 'site-813d',
      weekStartDate: '2026-10-10',
      date: '2026-10-15',
      amount: 10000,
      description: 'Slab shuttering advance payment',
      paidBy: 'Site Cash',
    },
    {
      id: 'subpay-2',
      subcontractorId: 'sub-bashir',
      siteId: 'site-813d',
      weekStartDate: '2026-10-05',
      date: '2026-10-08',
      amount: 25000,
      description: 'First floor conduit pipes completion installment',
      paidBy: 'Bank Transfer',
    },
    {
      id: 'subpay-3',
      subcontractorId: 'sub-tariq',
      siteId: 'site-813d',
      weekStartDate: '2026-10-05',
      date: '2026-10-09',
      amount: 35000,
      description: 'Beams rebar fabrication advance',
      paidBy: 'Office Cash',
    },
  ],
  materials: [
    {
      id: 'mat-1',
      siteId: 'site-813d',
      date: '2026-10-12',
      material: 'Bestway Cement Grade 53',
      quantity: 120,
      unit: 'bags',
      rate: 1380,
      total: 165600,
      supplier: 'Askari Building Materials',
      isPaid: true,
      notes: 'Delivered for column casting',
    },
    {
      id: 'mat-2',
      siteId: 'site-813d',
      date: '2026-10-13',
      material: 'Deformed Steel Rebar Grade 60 (60-Grade)',
      quantity: 2.2,
      unit: 'tons',
      rate: 265000,
      total: 583000,
      supplier: 'Mughal Steel Traders',
      isPaid: false,
      notes: '1/2 inch and 3/4 inch rebar',
    },
    {
      id: 'mat-3',
      siteId: 'site-813d',
      date: '2026-10-14',
      material: 'Awal Quality Red Clay Bricks',
      quantity: 8000,
      unit: 'pieces',
      rate: 14.5,
      total: 116000,
      supplier: 'Bhatti Brick Kiln',
      isPaid: true,
      notes: 'Unloaded at rear yard',
    },
    {
      id: 'mat-4',
      siteId: 'site-813d',
      date: '2026-10-15',
      material: 'Chenab River Sand (Rait)',
      quantity: 2,
      unit: 'trips',
      rate: 22000,
      total: 44000,
      supplier: 'Niazi Sand Transport',
      isPaid: true,
      notes: 'Dumper trucks delivery',
    },
  ],
  clientReceipts: [
    {
      id: 'cr-1',
      siteId: 'site-813d',
      date: '2026-09-02',
      amount: 2500000,
      paymentMethod: 'Bank Cheque (HBL)',
      referenceNo: 'CHQ-890123',
      notes: 'Initial mobilization advance payment',
    },
    {
      id: 'cr-2',
      siteId: 'site-813d',
      date: '2026-10-01',
      amount: 2000000,
      paymentMethod: 'Online Transfer',
      referenceNo: 'FT-993214',
      notes: 'Milestone 1: Plinth level completion',
    },
  ],
  weeklyNotes: [
    {
      id: 'notes-813d-2026-10-12',
      siteId: 'site-813d',
      weekStartDate: '2026-10-12',
      notesText: 'Total = 18750\nPaid by TBD = 10500\nRem. Payable = 8250\n+ Asghar Shuttering = 10000\nNew Total = 18250',
      advancePaidByTBD: 10500,
      siteRemarks: 'Mason work on lintel was finished smoothly on Friday. Rori lifting completed for foundation fill. Ready for next activity slab shuttering.',
    },
  ],
};

export function loadAppData(): ConstructionAppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveAppData(INITIAL_DATA);
      return INITIAL_DATA;
    }
    const parsed = JSON.parse(raw);
    return {
      sites: parsed.sites || INITIAL_DATA.sites,
      workers: parsed.workers || INITIAL_DATA.workers,
      workerPayments: parsed.workerPayments || INITIAL_DATA.workerPayments,
      subcontractors: parsed.subcontractors || INITIAL_DATA.subcontractors,
      attendance: parsed.attendance || INITIAL_DATA.attendance,
      additionalPayments: parsed.additionalPayments || INITIAL_DATA.additionalPayments,
      subcontractorPayments: parsed.subcontractorPayments || INITIAL_DATA.subcontractorPayments,
      materials: parsed.materials || INITIAL_DATA.materials,
      clientReceipts: parsed.clientReceipts || INITIAL_DATA.clientReceipts,
      weeklyNotes: parsed.weeklyNotes || INITIAL_DATA.weeklyNotes,
    };
  } catch (err) {
    console.error('Error loading app data, resetting to initial', err);
    return INITIAL_DATA;
  }
}

export function saveAppData(data: ConstructionAppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save to local storage', err);
  }
}

export function exportBackupData(data: ConstructionAppData): void {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const date = new Date().toISOString().split('T')[0];
  a.download = `SiteLedger_Backup_${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importBackupData(file: File, onSuccess: (data: ConstructionAppData) => void, onError: (err: string) => void) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target?.result as string);
      if (!parsed.sites || !parsed.workers) {
        onError('Invalid backup file structure: missing sites or workers.');
        return;
      }
      saveAppData(parsed);
      onSuccess(parsed);
    } catch {
      onError('Failed to parse JSON backup file.');
    }
  };
  reader.onerror = () => onError('Error reading file.');
  reader.readAsText(file);
}
