import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseAttendanceUnits,
  formatAttendanceCode,
  calculateDayWage,
  calculateSubcontractorLedger,
  calculateWeeklySiteTotals,
  generateWeekDates,
  getSaturdayOfWeek,
  getWorkWeekFriday,
  isFriday,
  getPreviousWorkWeekSaturday,
  getNextWorkWeekSaturday,
  formatWorkWeekSummary,
} from './constructionMath';

test('parseAttendanceUnits handles all standard construction attendance symbols', () => {
  assert.equal(parseAttendanceUnits('P'), 1.0);
  assert.equal(parseAttendanceUnits('p'), 1.0);
  assert.equal(parseAttendanceUnits('P/2'), 0.5);
  assert.equal(parseAttendanceUnits('0.5P'), 0.5);
  assert.equal(parseAttendanceUnits('1.5P'), 1.5);
  assert.equal(parseAttendanceUnits('2P'), 2.0);
  assert.equal(parseAttendanceUnits('A'), 0);
  assert.equal(parseAttendanceUnits('-'), 0);
  assert.equal(parseAttendanceUnits(''), 0);
});

test('formatAttendanceCode converts numerical units back to symbols', () => {
  assert.equal(formatAttendanceCode(1), 'P');
  assert.equal(formatAttendanceCode(0.5), 'P/2');
  assert.equal(formatAttendanceCode(1.5), '1.5P');
  assert.equal(formatAttendanceCode(2), '2P');
  assert.equal(formatAttendanceCode(0), 'A');
});

test('calculateDayWage calculates daily wage from units correctly', () => {
  // Mason wage: 1650/day
  assert.equal(calculateDayWage(1.0, 1650), 1650);
  assert.equal(calculateDayWage(0.5, 1650), 825);
  assert.equal(calculateDayWage(1.5, 1650), 2475);

  // Laborer wage: 1100/day
  assert.equal(calculateDayWage(1.0, 1100), 1100);
  assert.equal(calculateDayWage(0.5, 1100), 550);
});

test('calculateWeeklySiteTotals reproduces exact handwritten sheet numbers', () => {
  // Handwritten sheet values:
  // Masons: 2475 + 2475 = 4950
  // Laborers: 1100 + 1100 + 550 + 550 = 3300
  // Total Labor = 8250
  // Bricks/Rait = 0
  // Additional Payments (Rori) = 10,500
  // Total Payment Due = 18,750
  // Paid by TBD = 10,500
  // Rem. Payable = 8,250
  // + Asghar Shuttering = 10,000
  // New Total = 18,250

  const summary = calculateWeeklySiteTotals({
    directLaborWages: 8250,
    bricksRaitLabor: 0,
    additionalPaymentsSum: 10500,
    paidByTBD: 10500,
    subcontractorsSum: 10000,
  });

  assert.equal(summary.directLaborWages, 8250);
  assert.equal(summary.bricksRaitLabor, 0);
  assert.equal(summary.grandTotalLabor, 8250);
  assert.equal(summary.additionalPaymentsSum, 10500);
  assert.equal(summary.totalPaymentDue, 18750);
  assert.equal(summary.paidByTBD, 10500);
  assert.equal(summary.remainingPayable, 8250);
  assert.equal(summary.subcontractorsSum, 10000);
  assert.equal(summary.newWeeklyTotal, 18250);
});

test('calculateWeeklySiteTotals correctly adds Bricks/Rait money input to Grand Total Labor', () => {
  // If user enters Bricks/Rait = 1500
  const summary = calculateWeeklySiteTotals({
    directLaborWages: 8250,
    bricksRaitLabor: 1500,
    additionalPaymentsSum: 10500,
    paidByTBD: 10500,
    subcontractorsSum: 10000,
  });

  assert.equal(summary.directLaborWages, 8250);
  assert.equal(summary.bricksRaitLabor, 1500);
  assert.equal(summary.grandTotalLabor, 9750); // 8250 + 1500
  assert.equal(summary.totalPaymentDue, 20250); // 9750 + 10500
  assert.equal(summary.remainingPayable, 9750); // 20250 - 10500
  assert.equal(summary.newWeeklyTotal, 19750); // 9750 + 10000
});

test('calculateSubcontractorLedger calculates payments and remaining balances', () => {
  // Asghar Shuttering contract value = 250,000
  // Payments: 50,000 + 10,000 = 60,000
  const result = calculateSubcontractorLedger(250000, [
    { amount: 50000 },
    { amount: 10000 },
  ]);

  assert.equal(result.totalPaid, 60000);
  assert.equal(result.remainingBalance, 190000);
  assert.equal(result.percentagePaid, 24);
});

test('generateWeekDates generates sequence of dates correctly', () => {
  const dates = generateWeekDates('2026-10-10', 6);
  assert.equal(dates.length, 6);
  assert.equal(dates[0].date, '2026-10-10');
  assert.equal(dates[0].dayShort, 'Sat');
  assert.equal(dates[0].isSaturday, true);
  assert.equal(dates[5].date, '2026-10-15');
  assert.equal(dates[5].dayShort, 'Thu');
  assert.equal(dates[5].isThursday, true);
  // Friday is NOT in the 6 active work dates
  assert.equal(dates.some((d) => d.isFriday), false);
});

test('work week starts at Saturday and concludes at Thursday with Friday off', () => {
  // Oct 10, 2026 is Saturday
  assert.equal(getSaturdayOfWeek('2026-10-10'), '2026-10-10');
  // Oct 11, 2026 is Sunday -> resolves to Saturday Oct 10
  assert.equal(getSaturdayOfWeek('2026-10-11'), '2026-10-10');
  // Oct 12, 2026 is Monday -> resolves to Saturday Oct 10
  assert.equal(getSaturdayOfWeek('2026-10-12'), '2026-10-10');
  // Oct 15, 2026 is Thursday -> resolves to Saturday Oct 10
  assert.equal(getSaturdayOfWeek('2026-10-15'), '2026-10-10');
  // Oct 16, 2026 is Friday (weekly off day concluding this work week) -> resolves to Saturday Oct 10
  assert.equal(getSaturdayOfWeek('2026-10-16'), '2026-10-10');
  // Oct 17, 2026 is next Saturday -> resolves to Saturday Oct 17
  assert.equal(getSaturdayOfWeek('2026-10-17'), '2026-10-17');

  // Friday is off
  assert.equal(getWorkWeekFriday('2026-10-10'), '2026-10-16');
  assert.equal(isFriday('2026-10-16'), true);
  assert.equal(isFriday('2026-10-10'), false);

  // Previous and next week jumps
  assert.equal(getPreviousWorkWeekSaturday('2026-10-10'), '2026-10-03');
  assert.equal(getNextWorkWeekSaturday('2026-10-10'), '2026-10-17');

  // Summary string
  const summary = formatWorkWeekSummary('2026-10-10');
  assert.match(summary, /10 Oct \(Sat\) — 15 Oct \(Thu\) • Friday Off/);
});

