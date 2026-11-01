import { AttendanceStatus } from '../types';

/**
 * Converts attendance string notation to daily work units
 * 'P' = 1.0 day
 * 'P/2' = 0.5 day
 * '1.5P' = 1.5 days
 * '2P' = 2.0 days (double shift)
 * 'A' or empty = 0 days
 */
export function parseAttendanceUnits(status: AttendanceStatus | string): number {
  if (!status) return 0;
  const clean = status.trim().toUpperCase();
  if (clean === 'P' || clean === '1P' || clean === '1') return 1.0;
  if (clean === 'P/2' || clean === '0.5P' || clean === '1/2P' || clean === '0.5') return 0.5;
  if (clean === '1.5P' || clean === '1.5') return 1.5;
  if (clean === '2P' || clean === '2') return 2.0;
  if (clean === 'A' || clean === 'ABSENT' || clean === '-') return 0;

  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

/**
 * Formats units back to display attendance code
 */
export function formatAttendanceCode(units: number): AttendanceStatus {
  if (units <= 0) return 'A';
  if (units === 0.5) return 'P/2';
  if (units === 1) return 'P';
  if (units === 1.5) return '1.5P';
  if (units === 2) return '2P';
  return `${units}P` as AttendanceStatus;
}

/**
 * Calculates a single day's wage from units and daily wage
 */
export function calculateDayWage(units: number, dailyWage: number): number {
  return Math.round(units * dailyWage);
}

/**
 * Calculates subcontractor ledger status: contract value, total paid to date, remaining balance
 */
export function calculateSubcontractorLedger(
  contractValue: number,
  payments: Array<{ amount: number }>
): {
  totalPaid: number;
  remainingBalance: number;
  percentagePaid: number;
} {
  const safeContract = Math.max(0, contractValue || 0);
  const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const remainingBalance = Math.max(0, safeContract - totalPaid);
  const percentagePaid = safeContract > 0 ? Math.min(100, Math.round((totalPaid / safeContract) * 100)) : 0;

  return {
    totalPaid,
    remainingBalance,
    percentagePaid,
  };
}

/**
 * Calculates weekly site summary totals exactly matching the user's handwritten sheet format:
 * - Grand Total Labor (Masons + Helpers + Laborers)
 * - Additional Payments (Rori, Bricks lifting, etc.)
 * - Total Payment Due = Grand Total Labor + Additional Payments
 * - Paid by TBD (Advance or cash paid at site)
 * - Remaining Payable = Total Payment Due - Paid by TBD
 * - Subcontractor Payments (e.g. Asghar Shuttering)
 * - New Total = Remaining Payable + Subcontractor Payments
 */
export function calculateWeeklySiteTotals(params: {
  directLaborWages?: number;
  grandTotalLabor?: number;
  bricksRaitLabor?: number;
  additionalPaymentsSum: number;
  paidByTBD: number;
  subcontractorsSum: number;
}): {
  totalLabor: number;
  directLaborWages: number;
  bricksRaitLabor: number;
  grandTotalLabor: number;
  additionalPaymentsSum: number;
  totalPaymentDue: number;
  paidByTBD: number;
  remainingPayable: number;
  subcontractorsSum: number;
  newWeeklyTotal: number;
} {
  const directLaborWages = Math.max(0, Number(params.directLaborWages ?? params.grandTotalLabor) || 0);
  const bricksRaitLabor = Math.max(0, Number(params.bricksRaitLabor) || 0);
  const grandTotalLabor = directLaborWages + bricksRaitLabor;
  const additionalPaymentsSum = Math.max(0, Number(params.additionalPaymentsSum) || 0);
  const totalPaymentDue = grandTotalLabor + additionalPaymentsSum;
  const paidByTBD = Math.max(0, Number(params.paidByTBD) || 0);
  const remainingPayable = Math.max(0, totalPaymentDue - paidByTBD);
  const subcontractorsSum = Math.max(0, Number(params.subcontractorsSum) || 0);
  const newWeeklyTotal = remainingPayable + subcontractorsSum;

  return {
    totalLabor: grandTotalLabor,
    directLaborWages,
    bricksRaitLabor,
    grandTotalLabor,
    additionalPaymentsSum,
    totalPaymentDue,
    paidByTBD,
    remainingPayable,
    subcontractorsSum,
    newWeeklyTotal,
  };
}

/**
 * Parse YYYY-MM-DD into a local Date set to midday to prevent timezone/DST drift
 */
export function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day, 12, 0, 0);
  }
  return new Date(dateStr);
}

export function formatLocalDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export interface WeekDateInfo {
  date: string;
  dayNumber: number;
  dayShort: string;
  dayFull: string;
  formatted: string;
  isFriday: boolean;
  isSaturday: boolean;
  isThursday: boolean;
}

/**
 * Generates array of 6 active work dates for a given start date (Saturday through Thursday).
 * Friday is the typical weekly off day.
 */
export function generateWeekDates(startDateStr: string, count = 6): WeekDateInfo[] {
  const base = parseLocalDate(startDateStr);
  const dates: WeekDateInfo[] = [];

  const dayNamesShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayNamesFull = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  for (let i = 0; i < count; i++) {
    const current = new Date(base);
    current.setDate(base.getDate() + i);

    const dateStr = formatLocalDate(current);
    const dayOfWeek = current.getDay();

    dates.push({
      date: dateStr,
      dayNumber: current.getDate(),
      dayShort: dayNamesShort[dayOfWeek],
      dayFull: dayNamesFull[dayOfWeek],
      formatted: `${current.getDate()} (${dayNamesShort[dayOfWeek]})`,
      isFriday: dayOfWeek === 5,
      isSaturday: dayOfWeek === 6,
      isThursday: dayOfWeek === 4,
    });
  }

  return dates;
}

/**
 * Construction work week starts on Saturday and concludes on Thursday.
 * Friday is typically off.
 * Given any date string, returns the Saturday date string for that work week.
 */
export function getSaturdayOfWeek(inputDateStr: string): string {
  const d = parseLocalDate(inputDateStr);
  if (isNaN(d.getTime())) return inputDateStr;

  const day = d.getDay(); // 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat
  // Days to subtract to get to Saturday:
  // Sat (6) -> 0
  // Sun (0) -> 1
  // Mon (1) -> 2
  // Tue (2) -> 3
  // Wed (3) -> 4
  // Thu (4) -> 5
  // Fri (5) -> 6 (Friday is the off day concluding this work week)
  const diffToSaturday = day === 6 ? 0 : day + 1;

  const satDate = new Date(d);
  satDate.setDate(d.getDate() - diffToSaturday);
  return formatLocalDate(satDate);
}

/**
 * Returns previous work week Saturday (-7 days)
 */
export function getPreviousWorkWeekSaturday(currentSaturdayStr: string): string {
  const d = parseLocalDate(currentSaturdayStr);
  d.setDate(d.getDate() - 7);
  return formatLocalDate(d);
}

/**
 * Returns next work week Saturday (+7 days)
 */
export function getNextWorkWeekSaturday(currentSaturdayStr: string): string {
  const d = parseLocalDate(currentSaturdayStr);
  d.setDate(d.getDate() + 7);
  return formatLocalDate(d);
}

/**
 * Returns the Friday (Weekly Off) date for a given work week Saturday
 */
export function getWorkWeekFriday(saturdayStr: string): string {
  const d = parseLocalDate(saturdayStr);
  d.setDate(d.getDate() + 6);
  return formatLocalDate(d);
}

/**
 * Checks if a given date is Friday (Weekly off)
 */
export function isFriday(dateStr: string): boolean {
  const d = parseLocalDate(dateStr);
  return d.getDay() === 5;
}

/**
 * Formats a Saturday-to-Thursday range with human-readable summary
 */
export function formatWorkWeekSummary(saturdayStr: string): string {
  const sat = parseLocalDate(saturdayStr);
  const thu = new Date(sat);
  thu.setDate(sat.getDate() + 5);

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const satPart = `${sat.getDate()} ${monthNames[sat.getMonth()]} (Sat)`;
  const thuPart = `${thu.getDate()} ${monthNames[thu.getMonth()]} (Thu)`;

  return `${satPart} — ${thuPart} • Friday Off`;
}

/**
 * Returns currency format (e.g., "Rs 8,250")
 */
export function formatCurrency(amount: number): string {
  return 'Rs ' + (Math.round(amount) || 0).toLocaleString('en-US');
}

/**
 * Calculates total advances taken by a worker for a given week and optional site
 */
export function getWorkerWeeklyAdvance(
  workerId: string,
  weekStartDate: string,
  payments: Array<{
    workerId: string;
    amount: number;
    weekStartDate?: string;
    siteId?: string;
    paymentType: string;
  }>,
  siteId?: string
): number {
  if (!payments || !Array.isArray(payments)) return 0;
  return payments
    .filter(
      (p) =>
        p.workerId === workerId &&
        p.weekStartDate === weekStartDate &&
        (!siteId || !p.siteId || p.siteId === siteId) &&
        (p.paymentType === 'advance' || p.paymentType === 'partial')
    )
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
}

