import { appState, getSettings, getYearData, getMonthData, getWeekItems, getWeekActuals, getAccountConfig, months } from './state.js';

export function getEaster(year) {
  const f = Math.floor,
        G = year % 19,
        C = f(year / 100),
        H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30,
        I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11)),
        J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7,
        L = I - J,
        month = 3 + f((L + 40) / 44),
        day = L + 28 - 31 * f(month / 4);
  return new Date(year, month - 1, day);
}

export function getBankHolidays(year, countryCode) {
  if (countryCode === 'none') return [];
  const holidays = [];
  const addH = (d) => holidays.push(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime());

  if (countryCode === 'us') {
    let d = new Date(year, 0, 1);
    if (d.getDay() === 0) d.setDate(2); else if (d.getDay() === 6) d.setDate(31);
    addH(d);
    
    d = new Date(year, 0, 1); while (d.getDay() !== 1) d.setDate(d.getDate() + 1); d.setDate(d.getDate() + 14); addH(d);
    d = new Date(year, 1, 1); while (d.getDay() !== 1) d.setDate(d.getDate() + 1); d.setDate(d.getDate() + 14); addH(d);
    d = new Date(year, 4, 31); while (d.getDay() !== 1) d.setDate(d.getDate() - 1); addH(d);
    addH(new Date(year, 5, 19));
    addH(new Date(year, 6, 4));
    d = new Date(year, 8, 1); while (d.getDay() !== 1) d.setDate(d.getDate() + 1); addH(d);
    d = new Date(year, 9, 1); while (d.getDay() !== 1) d.setDate(d.getDate() + 1); d.setDate(d.getDate() + 7); addH(d);
    addH(new Date(year, 10, 11));
    d = new Date(year, 10, 1); while (d.getDay() !== 4) d.setDate(d.getDate() + 1); d.setDate(d.getDate() + 21); addH(d);
    addH(new Date(year, 11, 25));
    return holidays;
  }

  // UK Holidays (England & Wales, Scotland)
  addH(new Date(year, 0, 1));
  const easter = getEaster(year);
  const gf = new Date(easter); gf.setDate(easter.getDate() - 2); addH(gf);
  const em = new Date(easter); em.setDate(easter.getDate() + 1); addH(em);
  let d = new Date(year, 4, 1); while (d.getDay() !== 1) d.setDate(d.getDate() + 1); addH(d);
  d = new Date(year, 4, 31); while (d.getDay() !== 1) d.setDate(d.getDate() - 1); addH(d);
  d = new Date(year, 7, 31); while (d.getDay() !== 1) d.setDate(d.getDate() - 1); addH(d);
  addH(new Date(year, 11, 25)); addH(new Date(year, 11, 26));
  return holidays;
}

export function getAdjustedWorkingDay(dateObj, rule = 'following') {
  if (rule === 'exact') {
    return new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
  }
  const cfg = getSettings();
  const holidays = getBankHolidays(dateObj.getFullYear(), cfg.country_holidays)
    .concat(getBankHolidays(dateObj.getFullYear() + 1, cfg.country_holidays))
    .concat(getBankHolidays(dateObj.getFullYear() - 1, cfg.country_holidays));
  let curr = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
  if (rule === 'previous') {
    while (curr.getDay() === 0 || curr.getDay() === 6 || holidays.includes(curr.getTime())) {
      curr.setDate(curr.getDate() - 1);
    }
  } else { // 'following' (default)
    while (curr.getDay() === 0 || curr.getDay() === 6 || holidays.includes(curr.getTime())) {
      curr.setDate(curr.getDate() + 1);
    }
  }
  return curr;
}

export function getNextWorkingDay(dateObj) {
  return getAdjustedWorkingDay(dateObj, 'following');
}

export function getPreviousWorkingDay(dateObj) {
  return getAdjustedWorkingDay(dateObj, 'previous');
}

export function calculateMonthSchedule(year = appState.currentYear, monthIdx) {
  const cfg = getSettings();
  const mName = months[monthIdx];
  const md = getMonthData(mName, year);

  let startDate, endDate, nextStartDate;
  const overrideStart = md.override_start_date || (md.date_overrides && md.date_overrides.start_date);
  const overrideEnd = md.override_end_date || (md.date_overrides && md.date_overrides.end_date);

  if (overrideStart && overrideEnd) {
    const sParts = overrideStart.split('-').map(Number);
    const eParts = overrideEnd.split('-').map(Number);
    startDate = new Date(sParts[0], sParts[1] - 1, sParts[2], 0, 0, 0);
    endDate = new Date(eParts[0], eParts[1] - 1, eParts[2], 23, 59, 59);
    nextStartDate = new Date(eParts[0], eParts[1] - 1, eParts[2] + 1, 0, 0, 0);
  } else {
    function getPaydayMonday(d) {
      const day = d.getDay();
      const res = new Date(d);
      if (day === 0) {
        res.setDate(d.getDate() + 1); // Sunday -> Monday
      } else if (day === 6) {
        res.setDate(d.getDate() + 2); // Saturday -> Monday
      } else {
        res.setDate(d.getDate() - (day - 1)); // Pull back to its Monday
      }
      res.setHours(0, 0, 0, 0);
      return res;
    }

    function getTargetPayDate(y, m) {
      if (cfg.payday_is_last_working_day || cfg.payday_day === 'last_working_day') {
        const lastDay = new Date(y, m + 1, 0);
        return getAdjustedWorkingDay(lastDay, 'previous');
      } else if (cfg.payday_day === 'last_day') {
        return new Date(y, m + 1, 0);
      } else {
        const pDay = parseInt(cfg.payday_day || 26, 10);
        const maxD = new Date(y, m + 1, 0).getDate();
        const rawDate = new Date(y, m, Math.min(pDay, maxD));
        return getAdjustedWorkingDay(rawDate, cfg.payday_rule || 'previous');
      }
    }

    const startRef = (monthIdx === 0) ? getTargetPayDate(year - 1, 11) : getTargetPayDate(year, monthIdx - 1);
    const endRef = getTargetPayDate(year, monthIdx);
    
    startDate = getPaydayMonday(startRef);
    nextStartDate = getPaydayMonday(endRef);
    endDate = new Date(nextStartDate.getTime());
    endDate.setDate(endDate.getDate() - 1);
    endDate.setHours(23, 59, 59);
  }

  const diffTime = nextStartDate.getTime() - startDate.getTime();
  const numWeeks = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24 * 7)));

  const weeks = [];
  for (let i = 0; i < numWeeks; i++) {
    const wStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + (i * 7), 0, 0, 0);
    let wEnd = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + (i * 7) + 6, 23, 59, 59);
    if (i === numWeeks - 1 && overrideStart && overrideEnd) {
      wEnd = new Date(endDate.getTime());
    }

    const dayStr = wStart.getDate().toString().padStart(2, '0');
    const monthShort = months[wStart.getMonth()];
    weeks.push({ 
      name: `Week ${i + 1}`, 
      label: `Week ${i + 1} (${dayStr} ${monthShort})`,
      startDate: wStart,
      endDate: wEnd
    });
  }

  const schedObj = {
    startDate,
    endDate,
    numWeeks,
    weeks,
    primaryMonthIdx: monthIdx,
    primaryYear: year,
    dateRangeStr: `${startDate.getDate()} ${months[startDate.getMonth()]} - ${endDate.getDate()} ${months[endDate.getMonth()]}`
  };

  return schedObj;
}

export function getPaydaysForSchedule(schedule, freq = 'monthly', options = {}) {
  const cfg = getSettings();
  const frequency = freq || cfg.pay_frequency || 'monthly';
  const startMs = schedule.startDate.getTime();
  const endMs = schedule.endDate.getTime();
  const paydays = [];

  if (frequency === 'weekly') {
    schedule.weeks.forEach(w => {
      paydays.push({
        date: w.startDate,
        weekName: w.name,
        label: `Weekly Pay (${w.startDate.getDate()} ${months[w.startDate.getMonth()]})`
      });
    });
  } else if (frequency === 'biweekly' || frequency === 'four_weekly') {
    const stepDays = frequency === 'biweekly' ? 14 : 28;
    const anchorStr = options.anchorDate || cfg.payday_anchor_date || '2026-01-09';
    const anchor = new Date(anchorStr.includes('T') ? anchorStr : anchorStr + 'T12:00:00');
    
    let cur = new Date(anchor.getTime());
    while (cur.getTime() > startMs - (35 * 86400000)) {
      cur.setDate(cur.getDate() - stepDays);
    }
    while (cur.getTime() <= endMs + (14 * 86400000)) {
      const pTime = cur.getTime();
      if (pTime >= startMs && pTime <= endMs) {
        const week = schedule.weeks.find(w => pTime >= w.startDate.getTime() && pTime <= w.endDate.getTime()) || schedule.weeks[0];
        paydays.push({
          date: new Date(cur.getTime()),
          weekName: week ? week.name : 'Week 1',
          label: `${frequency === 'biweekly' ? 'Bi-Weekly' : '4-Weekly'} Pay (${cur.getDate()} ${months[cur.getMonth()]})`
        });
      }
      cur.setDate(cur.getDate() + stepDays);
    }
  } else if (frequency === 'semi_monthly') {
    const d1 = parseInt(options.firstDay || cfg.payday_first_day || 15, 10);
    const d2Opt = options.secondDay || cfg.payday_second_day || 'last_day';
    
    const m1 = schedule.startDate.getMonth();
    const m2 = schedule.endDate.getMonth();
    const y1 = schedule.startDate.getFullYear();
    const y2 = schedule.endDate.getFullYear();
    
    const candidateMonths = [{ y: y1, m: m1 }];
    if (m1 !== m2 || y1 !== y2) candidateMonths.push({ y: y2, m: m2 });

    candidateMonths.forEach(cm => {
      const dt1 = new Date(cm.y, cm.m, d1, 12, 0, 0);
      const lastDayOfMonth = new Date(cm.y, cm.m + 1, 0).getDate();
      const d2Val = d2Opt === 'last_day' ? lastDayOfMonth : Math.min(parseInt(d2Opt, 10), lastDayOfMonth);
      const dt2 = new Date(cm.y, cm.m, d2Val, 12, 0, 0);

      [dt1, dt2].forEach(dt => {
        const adj = getAdjustedWorkingDay(dt, 'following');
        const pTime = adj.getTime();
        if (pTime >= startMs && pTime <= endMs) {
          const week = schedule.weeks.find(w => pTime >= w.startDate.getTime() && pTime <= w.endDate.getTime()) || schedule.weeks[0];
          paydays.push({
            date: adj,
            weekName: week ? week.name : 'Week 1',
            label: `Semi-Monthly Pay (${adj.getDate()} ${months[adj.getMonth()]})`
          });
        }
      });
    });
  } else {
    paydays.push({
      date: schedule.startDate,
      weekName: 'Week 1',
      label: `Monthly Payday (${schedule.startDate.getDate()} ${months[schedule.startDate.getMonth()]})`
    });
  }

  return paydays;
}

export function getDeductionSalaryForMonth(d, person, schedule) {
  const baseAmt = (d.amounts && typeof d.amounts[person] !== 'undefined') ? Number(d.amounts[person]) : (d.person === person ? Number(d.amount) : 0);
  if (baseAmt <= 0) return { total: 0, count: 0, paydays: [] };
  if (!d.is_salary) return { total: baseAmt, count: 1, paydays: [] };

  const freq = d.frequency || getSettings().pay_frequency || 'monthly';
  if (freq === 'monthly') {
    return { total: baseAmt, count: 1, paydays: [] };
  }

  const paydays = getPaydaysForSchedule(schedule, freq, {
    anchorDate: d.anchor_date || getSettings().payday_anchor_date,
    firstDay: d.first_day || getSettings().payday_first_day,
    secondDay: d.second_day || getSettings().payday_second_day
  });

  const count = Math.max(1, paydays.length);
  return {
    total: baseAmt * count,
    count,
    paydays
  };
}

export function getCandidateDatesForDueDay(dueDay, startDate, endDate) {
  const dates = [];
  let curY = startDate.getFullYear();
  let curM = startDate.getMonth();
  const endY = endDate.getFullYear();
  const endM = endDate.getMonth();

  const startDayZero = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0).getTime();
  const endDayZero = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59).getTime();

  while (curY < endY || (curY === endY && curM <= endM)) {
    const maxDay = new Date(curY, curM + 1, 0).getDate();
    const day = Math.min(Math.max(1, parseInt(dueDay || 1, 10)), maxDay);
    const targetDate = new Date(curY, curM, day);
    const targetDayZero = new Date(curY, curM, day, 0, 0, 0).getTime();

    if (targetDayZero >= startDayZero && targetDayZero <= endDayZero) {
      dates.push(targetDate);
    }

    curM++;
    if (curM > 11) {
      curM = 0;
      curY++;
    }
  }
  return dates;
}

export function getDDsForWeek(directDebits, weekObj, monthSchedule) {
  const wStartTime = weekObj.startDate.getTime();
  const wEndTime = new Date(weekObj.endDate.getFullYear(), weekObj.endDate.getMonth(), weekObj.endDate.getDate(), 23, 59, 59).getTime();
  const schedStart = monthSchedule ? monthSchedule.startDate : weekObj.startDate;
  const schedEnd = monthSchedule ? monthSchedule.endDate : weekObj.endDate;
  const isLastWeek = monthSchedule && monthSchedule.weeks && weekObj.name === monthSchedule.weeks[monthSchedule.weeks.length - 1].name;
  const primaryMonthIdx = (monthSchedule && monthSchedule.primaryMonthIdx !== undefined) ? monthSchedule.primaryMonthIdx : (appState.activeTab ? months.indexOf(appState.activeTab) : 0);
  const primaryYear = (monthSchedule && monthSchedule.primaryYear !== undefined) ? monthSchedule.primaryYear : appState.currentYear;

  const result = [];
  (directDebits || []).forEach(dd => {
    const rule = dd.holiday_rule || 'following';

    if (dd.exact_date) {
      const targetDate = new Date(dd.exact_date.includes('T') ? dd.exact_date : dd.exact_date + 'T12:00:00');
      const payTime = targetDate.getTime();
      const isDueThisWeek = (payTime >= wStartTime && payTime <= wEndTime) || (isLastWeek && payTime >= wStartTime && targetDate.getTime() <= schedEnd.getTime());
      if (isDueThisWeek) {
        result.push({
          ...dd,
          is_income: false,
          actualDateStr: `${targetDate.getDate()} ${months[targetDate.getMonth()]}`,
          isDueThisWeek: true
        });
      }
    } else if (dd.month) {
      const dueDay = parseInt(dd.due_day || 1, 10);
      let targetMIdx = months.indexOf(dd.month);
      if (targetMIdx === -1) {
        targetMIdx = months.findIndex(m => m.toLowerCase().startsWith(dd.month.toLowerCase().substring(0, 3)));
      }
      if (targetMIdx === -1) targetMIdx = primaryMonthIdx;
      
      const targetDate = new Date(primaryYear, targetMIdx, dueDay);
      const actualPaymentDate = getAdjustedWorkingDay(targetDate, rule);
      const payTime = actualPaymentDate.getTime();
      const isDueThisWeek = (payTime >= wStartTime && payTime <= wEndTime) || (isLastWeek && payTime >= wStartTime && targetDate.getTime() <= schedEnd.getTime());
      if (isDueThisWeek) {
        result.push({
          ...dd,
          is_income: false,
          actualDateStr: `${actualPaymentDate.getDate()} ${months[actualPaymentDate.getMonth()]}`,
          isDueThisWeek: true
        });
      }
    } else {
      const dueDay = parseInt(dd.due_day || 1, 10);
      const candidateDates = getCandidateDatesForDueDay(dueDay, schedStart, schedEnd);
      candidateDates.forEach(targetDate => {
        const actualPaymentDate = getAdjustedWorkingDay(targetDate, rule);
        const payTime = actualPaymentDate.getTime();
        const isDueThisWeek = (payTime >= wStartTime && payTime <= wEndTime) || (isLastWeek && payTime >= wStartTime && targetDate.getTime() <= schedEnd.getTime());
        if (isDueThisWeek) {
          result.push({
            ...dd,
            is_income: false,
            actualDateStr: `${actualPaymentDate.getDate()} ${months[actualPaymentDate.getMonth()]}`,
            isDueThisWeek: true
          });
        }
      });
    }
  });

  return result;
}

export function getIncomesForWeek(paymentsIn, weekObj, monthSchedule, year = appState.currentYear) {
  const wStartTime = weekObj.startDate.getTime();
  const wEndTime = new Date(weekObj.endDate.getFullYear(), weekObj.endDate.getMonth(), weekObj.endDate.getDate(), 23, 59, 59).getTime();
  const schedStart = monthSchedule ? monthSchedule.startDate : weekObj.startDate;
  const schedEnd = monthSchedule ? monthSchedule.endDate : weekObj.endDate;
  const isLastWeek = monthSchedule && monthSchedule.weeks && weekObj.name === monthSchedule.weeks[monthSchedule.weeks.length - 1].name;
  const primaryMonthIdx = (monthSchedule && monthSchedule.primaryMonthIdx !== undefined) ? monthSchedule.primaryMonthIdx : (appState.activeTab ? months.indexOf(appState.activeTab) : 0);
  const primaryYear = (monthSchedule && monthSchedule.primaryYear !== undefined) ? monthSchedule.primaryYear : year;

  const result = [];
  (paymentsIn || []).forEach(pi => {
    const rule = pi.holiday_rule || 'previous';

    if (pi.exact_date) {
      const targetDate = new Date(pi.exact_date.includes('T') ? pi.exact_date : pi.exact_date + 'T12:00:00');
      const payTime = targetDate.getTime();
      const isDueThisWeek = (payTime >= wStartTime && payTime <= wEndTime) || (isLastWeek && payTime >= wStartTime && targetDate.getTime() <= schedEnd.getTime());
      if (isDueThisWeek) {
        result.push({
          ...pi,
          is_income: true,
          actualDateStr: `${targetDate.getDate()} ${months[targetDate.getMonth()]}`,
          isDueThisWeek: true
        });
      }
    } else if (pi.month) {
      const dueDay = parseInt(pi.due_day || 1, 10);
      let targetMIdx = months.indexOf(pi.month);
      if (targetMIdx === -1) {
        targetMIdx = months.findIndex(m => m.toLowerCase().startsWith(pi.month.toLowerCase().substring(0, 3)));
      }
      if (targetMIdx === -1) targetMIdx = primaryMonthIdx;
      
      const targetDate = new Date(primaryYear, targetMIdx, dueDay);
      const actualPaymentDate = getAdjustedWorkingDay(targetDate, rule);
      const payTime = actualPaymentDate.getTime();
      const isDueThisWeek = (payTime >= wStartTime && payTime <= wEndTime) || (isLastWeek && payTime >= wStartTime && targetDate.getTime() <= schedEnd.getTime());
      if (isDueThisWeek) {
        result.push({
          ...pi,
          is_income: true,
          actualDateStr: `${actualPaymentDate.getDate()} ${months[actualPaymentDate.getMonth()]}`,
          isDueThisWeek: true
        });
      }
    } else {
      const dueDay = parseInt(pi.due_day || 1, 10);
      const candidateDates = getCandidateDatesForDueDay(dueDay, schedStart, schedEnd);
      candidateDates.forEach(targetDate => {
        const actualPaymentDate = getAdjustedWorkingDay(targetDate, rule);
        const payTime = actualPaymentDate.getTime();
        const isDueThisWeek = (payTime >= wStartTime && payTime <= wEndTime) || (isLastWeek && payTime >= wStartTime && targetDate.getTime() <= schedEnd.getTime());
        if (isDueThisWeek) {
          result.push({
            ...pi,
            is_income: true,
            actualDateStr: `${actualPaymentDate.getDate()} ${months[actualPaymentDate.getMonth()]}`,
            isDueThisWeek: true
          });
        }
      });
    }
  });

  return result;
}

export function isRecurringDueInMonth(r, mName, year = appState.currentYear) {
  if (!r) return false;
  if (r.frequency === 'monthly') return true;
  if (r.frequency === 'yearly') return r.month === mName;
  const mIdx = months.indexOf(mName);
  if (mIdx === -1) return false;
  const sched = calculateMonthSchedule(year, mIdx);
  for (const w of sched.weeks) {
    const occs = getRecurringForWeek([r], w, sched, year);
    if (occs && occs.length > 0) return true;
  }
  return false;
}

export function getNextOccurrenceDate(r, fromDate = new Date(), year = appState.currentYear) {
  if (!r) return null;
  const start = r.start_date ? new Date(r.start_date.includes('T') ? r.start_date : r.start_date + 'T00:00:00') : new Date(year, 0, 1);
  const end = r.end_date ? new Date(r.end_date.includes('T') ? r.end_date : r.end_date + 'T23:59:59') : null;

  const freq = r.frequency || 'monthly';
  const intervalN = Math.max(1, parseInt(r.interval_n || 1, 10));
  const fromDateZero = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate(), 0, 0, 0);
  const holidayRule = r.holiday_rule || (r.is_income ? 'previous' : 'following');

  if (freq === 'weekly' || freq === 'biweekly' || freq === 'custom_weeks' || freq === 'four_weekly') {
    const stepWeeks = freq === 'weekly' ? 1 : (freq === 'biweekly' ? 2 : (freq === 'four_weekly' ? 4 : intervalN));
    let cur = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0);
    const limitDate = new Date(Number(year) + 5, 11, 31);
    while (cur < fromDateZero && cur <= limitDate) {
      cur.setDate(cur.getDate() + (stepWeeks * 7));
    }
    if (end && cur > end) return null;
    return cur;
  }

  if (freq === 'monthly' || freq === 'quarterly' || freq === 'custom_months') {
    const stepMonths = freq === 'monthly' ? 1 : (freq === 'quarterly' ? 3 : intervalN);
    const dueDay = parseInt(r.day_of_month || start.getDate() || 1, 10);
    let curYear = start.getFullYear();
    let curMonth = start.getMonth();

    for (let count = 0; count < 120; count++) {
      const candidate = new Date(curYear, curMonth, dueDay);
      const payDate = getAdjustedWorkingDay(candidate, holidayRule);
      const payDateZero = new Date(payDate.getFullYear(), payDate.getMonth(), payDate.getDate(), 0, 0, 0);

      if (payDateZero >= fromDateZero) {
        if (end && payDateZero > end) return null;
        return payDate;
      }
      curMonth += stepMonths;
      while (curMonth >= 12) {
        curMonth -= 12;
        curYear += 1;
      }
    }
  }

  if (freq === 'yearly') {
    const mIdx = r.month ? months.indexOf(r.month) : start.getMonth();
    const dueDay = parseInt(r.due_day || r.day_of_month || start.getDate() || 1, 10);
    const candThisYear = getAdjustedWorkingDay(new Date(year, mIdx >= 0 ? mIdx : 0, dueDay), holidayRule);
    const candZero = new Date(candThisYear.getFullYear(), candThisYear.getMonth(), candThisYear.getDate(), 0, 0, 0);

    if (candZero >= fromDateZero) return candThisYear;
    return getAdjustedWorkingDay(new Date(Number(year) + 1, mIdx >= 0 ? mIdx : 0, dueDay), holidayRule);
  }

  return start;
}

export function formatScheduledBillDue(b, contextMonth = null, year = appState.currentYear) {
  if (!b) return '';
  if (b.frequency === 'monthly' || b.source_type === 'direct_debit' || b.source_type === 'monthly_payment_in') {
    return contextMonth ? `Day ${b.due_day || 1}` : `Day ${b.due_day || 1} each month`;
  }
  if (b.frequency === 'yearly' || b.source_type === 'yearly_recurring' || b.source_type === 'yearly_income') {
    return `${b.due_day || 1} ${b.month || 'Jan'}`;
  }

  // Multi-cadence recurring item in month overview context
  if (contextMonth) {
    const mIdx = months.indexOf(contextMonth);
    if (mIdx >= 0) {
      const sched = calculateMonthSchedule(year, mIdx);
      for (const w of sched.weeks) {
        const occs = getRecurringForWeek([b], w, sched, year);
        if (occs && occs.length > 0) {
          return occs[0].actualDateStr;
        }
      }
    }
  }

  // In Bills Manager: compute next upcoming occurrence from today
  const now = new Date();
  const nextDate = getNextOccurrenceDate(b, now, year);
  if (nextDate) {
    const isDifferentYear = nextDate.getFullYear() !== now.getFullYear();
    const dayStr = nextDate.getDate();
    const monthStr = months[nextDate.getMonth()];
    const yearStr = isDifferentYear ? ` ${nextDate.getFullYear()}` : '';
    return `${dayStr} ${monthStr}${yearStr}`;
  }
  return b.start_date ? b.start_date : 'Scheduled';
}

export function computeMonthClosing(mName, mIdx, year = appState.currentYear) {
  const cfg = getSettings();
  const yData = getYearData(year);
  const md = getMonthData(mName, year);
  const schedule = calculateMonthSchedule(year, mIdx);

  const closingCurrent = {};
  const closingCredit = {};
  const closingSavings = {};

  const numWeeks = schedule.weeks.length;
  const lastWeekName = `Week ${numWeeks}`;
  const lastActuals = (md.weekly_actuals && md.weekly_actuals[lastWeekName]) ? md.weekly_actuals[lastWeekName] : {};

  const savingsInflowFromSalary = {};
  const savingsInflowFromDD = {};
  cfg.savings_accounts.forEach(acc => {
    savingsInflowFromSalary[acc] = 0;
    savingsInflowFromDD[acc] = 0;
  });

  (md.deductions_list || []).forEach(d => {
    if (cfg.savings_accounts.includes(d.target_account)) {
      cfg.people.forEach(p => {
        const amt = d.is_salary ? getDeductionSalaryForMonth(d, p, schedule).total : ((d.amounts && typeof d.amounts[p] !== 'undefined') ? Number(d.amounts[p]) : (d.person === p ? Number(d.amount) : 0));
        savingsInflowFromSalary[d.target_account] += amt || 0;
      });
    }
  });
  (md.direct_debits || []).forEach(dd => {
    if (dd.transfer_to && cfg.savings_accounts.includes(dd.transfer_to)) {
      savingsInflowFromDD[dd.transfer_to] += Number(dd.amount) || 0;
    }
  });

  const cardAutoPayments = {};
  cfg.credit_accounts.forEach(c => {
    if (c.autopay_enabled) {
      const openingDebt = Number(md.credit_data[c.name] && md.credit_data[c.name].opening_spent) || 0;
      let payAmt = c.autopay_type === 'full' ? openingDebt : Math.min(openingDebt, Number(c.autopay_fixed_amt) || 0);
      cardAutoPayments[c.name] = { payAmt, from: c.autopay_from || cfg.current_accounts[0] };
    }
  });

  const budgetBillsThisMonth = (typeof getYearlyBudgetItemsForMonth === 'function') ? getYearlyBudgetItemsForMonth(mName, mIdx, year) : [];
  const startMs = new Date(schedule.startDate.getFullYear(), schedule.startDate.getMonth(), schedule.startDate.getDate(), 0, 0, 0).getTime();
  const endMs = new Date(schedule.endDate.getFullYear(), schedule.endDate.getMonth(), schedule.endDate.getDate(), 23, 59, 59).getTime();

  const yearlyBillsThisMonth = (yData.yearly_recurring || []).filter(yb => {
    const dueDay = parseInt(yb.due_day || 1, 10);
    let targetMIdx = months.indexOf(yb.month);
    if (targetMIdx === -1) targetMIdx = months.findIndex(m => m.toLowerCase().startsWith((yb.month || '').toLowerCase().substring(0, 3)));
    if (targetMIdx === -1) return false;
    const targetDate = new Date(year, targetMIdx, dueDay);
    const actualPaymentDate = getAdjustedWorkingDay(targetDate, yb.holiday_rule || 'following');
    const pTime = actualPaymentDate.getTime();
    return pTime >= startMs && pTime <= endMs;
  });

  const yearlyIncomeThisMonth = (yData.yearly_income || []).filter(yi => {
    const dueDay = parseInt(yi.due_day || 1, 10);
    let targetMIdx = months.indexOf(yi.month);
    if (targetMIdx === -1) targetMIdx = months.findIndex(m => m.toLowerCase().startsWith((yi.month || '').toLowerCase().substring(0, 3)));
    if (targetMIdx === -1) return false;
    const targetDate = new Date(year, targetMIdx, dueDay);
    const actualPaymentDate = getAdjustedWorkingDay(targetDate, yi.holiday_rule || 'previous');
    const pTime = actualPaymentDate.getTime();
    return pTime >= startMs && pTime <= endMs;
  });

  const birthdaysThisMonth = (typeof getBirthdayItemsForMonth === 'function') ? getBirthdayItemsForMonth(mName, mIdx, year) : [];

  const allRecurring = yData.recurring_payments || cfg.recurring_payments || [];
  const recurringBillsThisMonth = [];
  schedule.weeks.forEach(wObj => {
    const wRec = getRecurringForWeek(allRecurring, wObj, schedule, year);
    (wRec || []).forEach(r => recurringBillsThisMonth.push(r));
  });

  const allRecurringIncomes = yData.recurring_incomes || cfg.recurring_incomes || [];
  const recurringIncomesThisMonth = [];
  schedule.weeks.forEach(wObj => {
    const wRecIn = getRecurringForWeek(allRecurringIncomes, wObj, schedule, year);
    (wRecIn || []).forEach(r => recurringIncomesThisMonth.push(r));
  });

  const monthlyPaymentsInThisMonth = [];
  schedule.weeks.forEach(wObj => {
    const wIn = getIncomesForWeek(md.payments_in || [], wObj, schedule, year);
    (wIn || []).forEach(pi => monthlyPaymentsInThisMonth.push(pi));
  });

  cfg.current_accounts.forEach(acc => {
    let actVal = lastActuals[`curr_${acc}`];
    if (actVal !== "" && actVal !== null && actVal !== undefined) {
      closingCurrent[acc] = parseFloat(actVal) || 0;
    } else {
      let bal = md.current_data[acc] ? (Number(md.current_data[acc].opening) || 0) : 0;
      (md.deductions_list || []).forEach(d => {
        if (d.target_account === acc) {
          cfg.people.forEach(p => {
            const amt = d.is_salary ? getDeductionSalaryForMonth(d, p, schedule).total : ((d.amounts && typeof d.amounts[p] !== 'undefined') ? Number(d.amounts[p]) : (d.person === p ? Number(d.amount) : 0));
            bal += amt || 0;
          });
        }
      });
      (md.direct_debits || []).forEach(dd => {
        if (dd.account === acc || (!dd.account && acc === cfg.current_accounts[0])) bal -= Number(dd.amount) || 0;
      });
      monthlyPaymentsInThisMonth.forEach(pi => {
        if (pi.account === acc || (!pi.account && acc === cfg.current_accounts[0])) bal += Number(pi.amount) || 0;
      });
      yearlyBillsThisMonth.forEach(yb => {
        if (yb.account === acc) bal -= Number(yb.amount) || 0;
      });
      yearlyIncomeThisMonth.forEach(yi => {
        if (yi.account === acc) bal += Number(yi.amount) || 0;
      });
      budgetBillsThisMonth.forEach(b => {
        if (b.account === acc) bal -= Number(b.amount) || 0;
      });
      birthdaysThisMonth.forEach(b => {
        if (b.account === acc) bal -= Number(b.amount) || 0;
      });
      recurringBillsThisMonth.forEach(r => {
        if (r.account === acc) bal -= Number(r.amount) || 0;
      });
      recurringIncomesThisMonth.forEach(r => {
        if (r.account === acc) bal += Number(r.amount) || 0;
      });
      cfg.credit_accounts.forEach(c => {
        if (cardAutoPayments[c.name] && cardAutoPayments[c.name].from === acc) bal -= cardAutoPayments[c.name].payAmt;
      });
      schedule.weeks.forEach(wObj => {
        const items = md.weekly_items[wObj.name] || [];
        items.forEach(it => {
          const targetAcct = it.account_name || cfg.current_accounts[0];
          const isCurrent = it.account_type === 'current' || (it.desc && it.desc.toLowerCase().includes('cash'));
          if (isCurrent && targetAcct === acc) {
            const amt = Number(it.amount) || 0;
            bal = it.is_income ? bal + amt : bal - amt;
          }
        });
      });
      closingCurrent[acc] = bal;
    }
  });

  cfg.credit_accounts.forEach(c => {
    let actAvail = lastActuals[`c_avail_${c.name}`];
    let actSpent = lastActuals[`c_spent_${c.name}`];
    if (actAvail !== "" && actAvail !== null && actAvail !== undefined) {
      closingCredit[c.name] = (Number(c.limit) || 0) - (parseFloat(actAvail) || 0);
    } else if (actSpent !== "" && actSpent !== null && actSpent !== undefined) {
      closingCredit[c.name] = parseFloat(actSpent) || 0;
    } else {
      let spent = md.credit_data[c.name] ? (Number(md.credit_data[c.name].opening_spent) || 0) : 0;
      (md.direct_debits || []).forEach(dd => {
        if (dd.account === c.name) spent += Number(dd.amount) || 0;
      });
      monthlyPaymentsInThisMonth.forEach(pi => {
        if (pi.account === c.name) spent -= Number(pi.amount) || 0;
      });
      yearlyBillsThisMonth.forEach(yb => {
        if (yb.account === c.name) spent += Number(yb.amount) || 0;
      });
      yearlyIncomeThisMonth.forEach(yi => {
        if (yi.account === c.name) spent -= Number(yi.amount) || 0;
      });
      budgetBillsThisMonth.forEach(b => {
        if (b.account === c.name) spent += Number(b.amount) || 0;
      });
      birthdaysThisMonth.forEach(b => {
        if (b.account === c.name) spent += Number(b.amount) || 0;
      });
      recurringBillsThisMonth.forEach(r => {
        if (r.account === c.name) spent += Number(r.amount) || 0;
      });
      recurringIncomesThisMonth.forEach(r => {
        if (r.account === c.name) spent -= Number(r.amount) || 0;
      });
      if (cardAutoPayments[c.name]) spent -= cardAutoPayments[c.name].payAmt;
      schedule.weeks.forEach(wObj => {
        const items = md.weekly_items[wObj.name] || [];
        items.forEach(it => {
          const targetAcct = it.account_name || cfg.credit_accounts[0]?.name;
          const isCredit = it.account_type === 'credit' || (!it.desc || !it.desc.toLowerCase().includes('cash'));
          if (isCredit && targetAcct === c.name) {
            const amt = Number(it.amount) || 0;
            spent = it.is_income ? spent - amt : spent + amt;
          }
        });
      });
      closingCredit[c.name] = Math.max(0, spent);
    }
  });

  cfg.savings_accounts.forEach(acc => {
    const s = md.savings_data[acc] ? md.savings_data[acc] : { opening: 0 };
    const autoInflow = (savingsInflowFromSalary[acc] || 0) + (savingsInflowFromDD[acc] || 0);
    let directDebitOutflow = 0;
    (md.direct_debits || []).forEach(dd => {
      if (dd.account === acc) directDebitOutflow += Number(dd.amount) || 0;
    });
    let paymentsInInflow = 0;
    monthlyPaymentsInThisMonth.forEach(pi => {
      if (pi.account === acc) paymentsInInflow += Number(pi.amount) || 0;
    });
    let yearlyBillOutflow = 0;
    yearlyBillsThisMonth.forEach(yb => {
      if (yb.account === acc) yearlyBillOutflow += Number(yb.amount) || 0;
    });
    let yearlyIncomeInflow = 0;
    yearlyIncomeThisMonth.forEach(yi => {
      if (yi.account === acc) yearlyIncomeInflow += Number(yi.amount) || 0;
    });
    let recurringBillOutflow = 0;
    recurringBillsThisMonth.forEach(r => {
      if (r.account === acc) recurringBillOutflow += Number(r.amount) || 0;
    });
    let recurringIncomeInflow = 0;
    recurringIncomesThisMonth.forEach(r => {
      if (r.account === acc) recurringIncomeInflow += Number(r.amount) || 0;
    });
    let weeklySavingsNet = 0;
    schedule.weeks.forEach(wObj => {
      const items = md.weekly_items[wObj.name] || [];
      items.forEach(it => {
        if (it.account_type === 'savings' && it.account_name === acc) {
          const amt = Number(it.amount) || 0;
          weeklySavingsNet = it.is_income ? weeklySavingsNet + amt : weeklySavingsNet - amt;
        }
      });
    });

    let budgetOutflow = 0;
    budgetBillsThisMonth.forEach(b => {
      if (b.account === acc) budgetOutflow += Number(b.amount) || 0;
    });
    let birthdayOutflow = 0;
    birthdaysThisMonth.forEach(b => {
      if (b.account === acc) birthdayOutflow += Number(b.amount) || 0;
    });

    const plannedClosing = (Number(s.opening) || 0) + autoInflow + paymentsInInflow + yearlyIncomeInflow + recurringIncomeInflow - directDebitOutflow - yearlyBillOutflow - recurringBillOutflow - budgetOutflow - birthdayOutflow + weeklySavingsNet;
    const conf = (typeof getAccountConfig === 'function') ? getAccountConfig('savings', acc, year) : { savings_predict_mode: 'planned' };
    let actVal = lastActuals[`sav_${acc}`];
    let hasActual = (actVal !== "" && actVal !== null && actVal !== undefined);

    if (conf.savings_predict_mode === 'actual' && hasActual) {
      closingSavings[acc] = parseFloat(actVal) || 0;
    } else {
      // Default: Pure Planned cashflow rollover (excludes actual check-ins from future predictions)
      closingSavings[acc] = plannedClosing;
    }
  });

  return { current: closingCurrent, credit: closingCredit, savings: closingSavings };
}

export function calculateAndSyncRollovers(year = appState.currentYear) {
  const cfg = getSettings();
  for (let i = 0; i < months.length - 1; i++) {
    const curMonthName = months[i];
    const nextMonthName = months[i + 1];
    const closing = computeMonthClosing(curMonthName, i, year);
    const nextMonthData = getMonthData(nextMonthName, year);

    cfg.current_accounts.forEach(acc => {
      if (!nextMonthData.current_data[acc]) nextMonthData.current_data[acc] = {};
      if (!nextMonthData.current_data[acc].user_edited) {
        nextMonthData.current_data[acc].opening = closing.current[acc] !== undefined ? closing.current[acc] : 0;
      }
    });

    cfg.credit_accounts.forEach(c => {
      if (!nextMonthData.credit_data[c.name]) nextMonthData.credit_data[c.name] = {};
      if (!nextMonthData.credit_data[c.name].user_edited) {
        nextMonthData.credit_data[c.name].opening_spent = closing.credit[c.name] !== undefined ? closing.credit[c.name] : 0;
      }
    });

    cfg.savings_accounts.forEach(acc => {
      if (!nextMonthData.savings_data[acc]) nextMonthData.savings_data[acc] = {};
      if (!nextMonthData.savings_data[acc].user_edited) {
        nextMonthData.savings_data[acc].opening = closing.savings[acc] !== undefined ? closing.savings[acc] : 0;
      }
    });
  }

  // December -> Next Year January Rollover (if next year exists)
  const nextYearNum = parseInt(year, 10) + 1;
  const nextYearStr = String(nextYearNum);
  if (appState.data && appState.data.years && appState.data.years[nextYearStr]) {
    const decClosing = computeMonthClosing('Dec', 11, year);
    const janNextData = getMonthData('Jan', nextYearNum);

    cfg.current_accounts.forEach(acc => {
      if (!janNextData.current_data[acc]) janNextData.current_data[acc] = {};
      if (!janNextData.current_data[acc].user_edited) {
        janNextData.current_data[acc].opening = decClosing.current[acc] !== undefined ? decClosing.current[acc] : 0;
      }
    });

    cfg.credit_accounts.forEach(c => {
      if (!janNextData.credit_data[c.name]) janNextData.credit_data[c.name] = {};
      if (!janNextData.credit_data[c.name].user_edited) {
        janNextData.credit_data[c.name].opening_spent = decClosing.credit[c.name] !== undefined ? decClosing.credit[c.name] : 0;
      }
    });

    cfg.savings_accounts.forEach(acc => {
      if (!janNextData.savings_data[acc]) janNextData.savings_data[acc] = {};
      if (!janNextData.savings_data[acc].user_edited) {
        janNextData.savings_data[acc].opening = decClosing.savings[acc] !== undefined ? decClosing.savings[acc] : 0;
      }
    });
  }
}

if (typeof window !== 'undefined') {
  window.calculateMonthSchedule = calculateMonthSchedule;
  window.getDDsForWeek = getDDsForWeek;
  window.getIncomesForWeek = getIncomesForWeek;
  window.calculateAndSyncRollovers = calculateAndSyncRollovers;
  window.getAdjustedWorkingDay = getAdjustedWorkingDay;
  window.getNextWorkingDay = getNextWorkingDay;
  window.getPreviousWorkingDay = getPreviousWorkingDay;
  window.getBankHolidays = getBankHolidays;
  window.getEaster = getEaster;
  window.getYearlyBudgetItemsForMonth = getYearlyBudgetItemsForMonth;
  window.getBirthdayItemsForMonth = getBirthdayItemsForMonth;
  window.getBirthdaysForWeek = getBirthdaysForWeek;
  window.getBirthdayOccasionsForWeek = getBirthdayOccasionsForWeek;
  window.getRecurringForWeek = getRecurringForWeek;
}


export function getYearlyBudgetItemsForMonth(mName, mIdx, year = appState.currentYear) {
  const yData = getYearData(year);
  const budgets = yData.yearly_budgets || [];
  const schedule = calculateMonthSchedule(year, mIdx);
  const items = [];
  const startMs = new Date(schedule.startDate.getFullYear(), schedule.startDate.getMonth(), schedule.startDate.getDate(), 0, 0, 0).getTime();
  const endMs = new Date(schedule.endDate.getFullYear(), schedule.endDate.getMonth(), schedule.endDate.getDate(), 23, 59, 59).getTime();

  budgets.forEach(b => {
    const spent = (b.transactions || []).reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const remaining = Math.max(0, (Number(b.total_budget) || 0) - spent);
    const strategy = b.deduction_strategy || 'none';

    // 1. Dated transactions strictly falling in this month's payday date range
    (b.transactions || []).forEach(t => {
      if (t.date) {
        const tDate = new Date(t.date.includes('T') ? t.date : t.date + 'T12:00:00');
        const tMs = tDate.getTime();
        if (tMs >= startMs && tMs <= endMs) {
          items.push({
            desc: `🎯 ${b.name}: ${t.desc}`,
            due_day: tDate.getDate(),
            exact_date: t.date,
            amount: Number(t.amount) || 0,
            account: t.account || b.account,
            is_budget_item: true
          });
        }
      }
    });

    // 2. Planned remaining deductions
    if (strategy === 'monthly_spread' && remaining > 0) {
      const endMIdx = b.end_date ? new Date(b.end_date.includes('T') ? b.end_date : b.end_date + 'T12:00:00').getMonth() : 11;
      if (mIdx <= endMIdx) {
        const numMonths = Math.max(1, endMIdx + 1);
        const spreadAmt = remaining / numMonths;
        items.push({
          desc: `🎯 ${b.name} (Monthly Spread)`,
          due_day: schedule.startDate.getDate(),
          exact_date: `${schedule.startDate.getFullYear()}-${String(schedule.startDate.getMonth() + 1).padStart(2, '0')}-${String(schedule.startDate.getDate()).padStart(2, '0')}`,
          amount: spreadAmt,
          account: b.account,
          is_budget_item: true
        });
      }
    } else if (strategy === 'target_date' && remaining > 0 && b.end_date) {
      const endDateObj = new Date(b.end_date.includes('T') ? b.end_date : b.end_date + 'T12:00:00');
      const endMsTime = endDateObj.getTime();
      if (endMsTime >= startMs && endMsTime <= endMs) {
        items.push({
          desc: `🎯 ${b.name} (Target Date Balance)`,
          due_day: endDateObj.getDate(),
          exact_date: b.end_date,
          amount: remaining,
          account: b.account,
          is_budget_item: true
        });
      }
    }
  });

  return items;
}


export function detectCurrentMonthAndWeek(year = appState.currentYear) {
  const now = new Date();
  const nowMs = now.getTime();
  const cfg = getSettings();
  const pDay = cfg.payday_day || 26;
  const country = cfg.bank_holiday_country || 'uk_ew';

  for (let m = 0; m < 12; m++) {
    const sched = calculateMonthSchedule(year, m, pDay, country);
    const sTime = new Date(sched.startDate.getFullYear(), sched.startDate.getMonth(), sched.startDate.getDate(), 0, 0, 0).getTime();
    const eTime = new Date(sched.endDate.getFullYear(), sched.endDate.getMonth(), sched.endDate.getDate(), 23, 59, 59).getTime();

    if (nowMs >= sTime && nowMs <= eTime) {
      let matchedWeek = sched.weeks[0]?.name || 'Week 1';
      for (let w of sched.weeks) {
        const ws = new Date(w.startDate.getFullYear(), w.startDate.getMonth(), w.startDate.getDate(), 0, 0, 0).getTime();
        const we = new Date(w.endDate.getFullYear(), w.endDate.getMonth(), w.endDate.getDate(), 23, 59, 59).getTime();
        if (nowMs >= ws && nowMs <= we) {
          matchedWeek = w.name;
          break;
        }
      }
      return { month: months[m], monthIdx: m, week: matchedWeek, schedule: sched };
    }
  }

  const curMonthIdx = now.getMonth();
  const sched = calculateMonthSchedule(year, curMonthIdx, pDay, country);
  return { month: months[curMonthIdx], monthIdx: curMonthIdx, week: 'Week 1', schedule: sched };
}


export function getBirthdayItemsForMonth(mName, mIdx, year = appState.currentYear) {
  const yData = getYearData(year);
  const birthdays = yData.birthdays || getSettings().birthdays || [];
  const schedule = calculateMonthSchedule(year, mIdx);
  const cfg = getSettings();
  const items = [];
  const startMs = new Date(schedule.startDate.getFullYear(), schedule.startDate.getMonth(), schedule.startDate.getDate(), 0, 0, 0).getTime();
  const endMs = new Date(schedule.endDate.getFullYear(), schedule.endDate.getMonth(), schedule.endDate.getDate(), 23, 59, 59).getTime();

  birthdays.forEach((b, bIdx) => {
    let bMIdx = months.indexOf(b.month);
    if (bMIdx === -1) bMIdx = months.findIndex(m => m.toLowerCase().startsWith(String(b.month || '').toLowerCase().substring(0, 3)));
    if (bMIdx === -1) bMIdx = 0;
    const bDate = new Date(year, bMIdx, parseInt(b.day || 1, 10));
    const bMs = bDate.getTime();

    const spent = (b.transactions || []).reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const remaining = Math.max(0, (Number(b.budget_amount) || 0) - spent);

    // 1. Dated transactions strictly falling in this month's payday date range
    (b.transactions || []).forEach((t, tIdx) => {
      let tDate;
      if (t.date) {
        tDate = new Date(t.date.includes('T') ? t.date : t.date + 'T12:00:00');
      } else {
        tDate = bDate;
      }
      const tMs = tDate.getTime();
      if (tMs >= startMs && tMs <= endMs) {
        items.push({
          desc: `🎁 ${b.name}: ${t.desc || 'Gift'}`,
          due_day: tDate.getDate(),
          exact_date: t.date,
          amount: Number(t.amount) || 0,
          account: t.account || b.account || cfg.current_accounts[0],
          isBirthdaySpend: true,
          is_budget_item: true,
          birthdayIdx: bIdx,
          transactionIdx: tIdx,
          actualDateStr: `${tDate.getDate()} ${months[tDate.getMonth()]}`
        });
      }
    });

    // 2. Planned remaining budget allocation if birthday falls in this month's payday date range
    if (bMs >= startMs && bMs <= endMs) {
      if (remaining > 0) {
        items.push({
          desc: `🎂 ${b.name}`,
          due_day: bDate.getDate(),
          exact_date: `${year}-${String(bMIdx + 1).padStart(2, '0')}-${String(b.day || 1).padStart(2, '0')}`,
          amount: remaining,
          account: b.account || cfg.current_accounts[0],
          isBirthday: true,
          is_budget_item: true,
          budgetTotal: Number(b.budget_amount) || 0,
          spentTotal: spent,
          remaining: remaining,
          actualDateStr: `${bDate.getDate()} ${months[bMIdx]}`
        });
      }
    }
  });

  return items;
}

export function getBirthdaysForWeek(birthdays, weekObj, monthSchedule, year = appState.currentYear) {
  const wStartTime = weekObj.startDate.getTime();
  const wEndTime = new Date(weekObj.endDate.getFullYear(), weekObj.endDate.getMonth(), weekObj.endDate.getDate(), 23, 59, 59).getTime();
  const cfg = getSettings();
  const items = [];

  (birthdays || []).forEach((b, bIdx) => {
    let mIdx = months.indexOf(b.month);
    if (mIdx === -1) {
      mIdx = months.findIndex(m => m.toLowerCase().startsWith(String(b.month).toLowerCase().substring(0, 3)));
    }
    if (mIdx === -1) mIdx = 0;
    const day = parseInt(b.day || 1, 10);
    const targetDate = new Date(year, mIdx, day);
    const bTime = targetDate.getTime();

    const spent = (b.transactions || []).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const remaining = Math.max(0, (Number(b.budget_amount) || 0) - spent);

    // 1. Dated transactions strictly falling in this week's date range
    (b.transactions || []).forEach((t, tIdx) => {
      let tDate;
      if (t.date) {
        tDate = new Date(t.date.includes('T') ? t.date : t.date + 'T12:00:00');
      } else {
        tDate = targetDate;
      }
      const tMs = tDate.getTime();
      if (tMs >= wStartTime && tMs <= wEndTime) {
        items.push({
          desc: `🎁 ${b.name}: ${t.desc || 'Gift'}`,
          due_day: tDate.getDate(),
          exact_date: t.date,
          amount: Number(t.amount) || 0,
          account: t.account || b.account || cfg.current_accounts[0],
          isBirthdaySpend: true,
          is_budget_item: true,
          birthdayIdx: bIdx,
          transactionIdx: tIdx,
          actualDateStr: `${tDate.getDate()} ${months[tDate.getMonth()]}`
        });
      }
    });

    // 2. Planned remaining budget allocation on the birthday's date
    if (bTime >= wStartTime && bTime <= wEndTime) {
      if (remaining > 0) {
        items.push({
          ...b,
          originalIdx: bIdx,
          isBirthday: true,
          is_budget_item: true,
          desc: `🎂 ${b.name}`,
          due_day: day,
          account: b.account || cfg.current_accounts[0],
          amount: remaining,
          budgetTotal: Number(b.budget_amount) || 0,
          spentTotal: spent,
          remaining: remaining,
          actualDateStr: `${day} ${months[mIdx]}`
        });
      }
    }
  });

  return items;
}

export function getBirthdayOccasionsForWeek(birthdays, weekObj, monthSchedule, year = appState.currentYear) {
  const wStartTime = weekObj.startDate.getTime();
  const wEndTime = new Date(weekObj.endDate.getFullYear(), weekObj.endDate.getMonth(), weekObj.endDate.getDate(), 23, 59, 59).getTime();
  const cfg = getSettings();
  const occasions = [];

  (birthdays || []).forEach((b, bIdx) => {
    let mIdx = months.indexOf(b.month);
    if (mIdx === -1) {
      mIdx = months.findIndex(m => m.toLowerCase().startsWith(String(b.month).toLowerCase().substring(0, 3)));
    }
    if (mIdx === -1) mIdx = 0;
    const day = parseInt(b.day || 1, 10);
    const targetDate = new Date(year, mIdx, day);
    const bTime = targetDate.getTime();

    if (bTime >= wStartTime && bTime <= wEndTime) {
      const spent = (b.transactions || []).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      const remaining = (Number(b.budget_amount) || 0) - spent;
      occasions.push({
        ...b,
        originalIdx: bIdx,
        isBirthday: true,
        due_day: day,
        account: b.account || cfg.current_accounts[0],
        amount: Math.max(0, remaining),
        budgetTotal: Number(b.budget_amount) || 0,
        spentTotal: spent,
        remaining: remaining,
        actualDateStr: `${day} ${months[mIdx]}`
      });
    }
  });

  return occasions;
}

export function getRecurringForWeek(recurringItems, weekObj, monthSchedule, year = appState.currentYear) {
  const wStartTime = weekObj.startDate.getTime();
  const wEndTime = new Date(weekObj.endDate.getFullYear(), weekObj.endDate.getMonth(), weekObj.endDate.getDate(), 23, 59, 59).getTime();

  const occurrences = [];

  (recurringItems || []).forEach((r, rIdx) => {
    const amount = Number(r.amount) || 0;
    if (amount <= 0) return;
    const startDate = r.start_date ? new Date(r.start_date.includes('T') ? r.start_date : r.start_date + 'T00:00:00') : new Date(year, 0, 1);
    const endDate = r.end_date ? new Date(r.end_date.includes('T') ? r.end_date : r.end_date + 'T23:59:59') : null;

    if (wStartTime < startDate.getTime() && wEndTime < startDate.getTime()) return;
    if (endDate && wStartTime > endDate.getTime()) return;

    const freq = r.frequency || 'monthly';
    const intervalN = Math.max(1, parseInt(r.interval_n || 1, 10));
    const isIncome = !!r.is_income;
    const holidayRule = r.holiday_rule || (isIncome ? 'previous' : 'following');

    if (freq === 'weekly' || freq === 'biweekly' || freq === 'custom_weeks' || freq === 'four_weekly') {
      const stepWeeks = freq === 'weekly' ? 1 : (freq === 'biweekly' ? 2 : (freq === 'four_weekly' ? 4 : intervalN));
      const diffMs = weekObj.startDate.getTime() - startDate.getTime();
      const diffWeeks = Math.round(diffMs / (1000 * 60 * 60 * 24 * 7));
      
      if (diffWeeks >= 0 && diffWeeks % stepWeeks === 0) {
        occurrences.push({
          ...r,
          isRecurring: true,
          isMovable: true,
          is_income: isIncome,
          source_type: r.source_type || (isIncome ? 'recurring_income' : 'recurring_payment'),
          source_idx: rIdx,
          rawDesc: r.desc,
          desc: isIncome ? `📥 ${r.desc}` : `🔄 ${r.desc}`,
          amount,
          account: r.account,
          holiday_rule: holidayRule,
          actualDateStr: `${weekObj.startDate.getDate()} ${months[weekObj.startDate.getMonth()]}`,
          occurrenceDate: weekObj.startDate
        });
      }
    } else if (freq === 'monthly' || freq === 'quarterly' || freq === 'custom_months') {
      const stepMonths = freq === 'monthly' ? 1 : (freq === 'quarterly' ? 3 : intervalN);
      const dueDay = parseInt(r.day_of_month || startDate.getDate() || 1, 10);
      
      // Test month of week start and week end
      const testMonths = [weekObj.startDate.getMonth(), weekObj.endDate.getMonth()];
      const uniqueMonths = [...new Set(testMonths)];

      uniqueMonths.forEach(m => {
        const testDate = new Date(year, m, dueDay);
        const actualPayDate = getAdjustedWorkingDay(testDate, holidayRule);
        const payTime = actualPayDate.getTime();

        if (payTime >= wStartTime && payTime <= wEndTime) {
          const diffMonths = (year - startDate.getFullYear()) * 12 + (m - startDate.getMonth());
          if (diffMonths >= 0 && diffMonths % stepMonths === 0) {
            occurrences.push({
              ...r,
              isRecurring: true,
              isMovable: true,
              is_income: isIncome,
              source_type: r.source_type || (isIncome ? 'recurring_income' : 'recurring_payment'),
              source_idx: rIdx,
              rawDesc: r.desc,
              desc: isIncome ? `📥 ${r.desc}` : `🔄 ${r.desc}`,
              amount,
              account: r.account,
              holiday_rule: holidayRule,
              actualDateStr: `${actualPayDate.getDate()} ${months[actualPayDate.getMonth()]}`,
              occurrenceDate: actualPayDate
            });
          }
        }
      });
    } else if (freq === 'yearly') {
      const dueMonth = r.month ? months.indexOf(r.month) : startDate.getMonth();
      const dueDay = parseInt(r.day_of_month || startDate.getDate() || 1, 10);
      const testDate = new Date(year, dueMonth, dueDay);
      const actualPayDate = getAdjustedWorkingDay(testDate, holidayRule);
      const payTime = actualPayDate.getTime();

      if (payTime >= wStartTime && payTime <= wEndTime) {
        occurrences.push({
          ...r,
          isRecurring: true,
          isMovable: true,
          is_income: isIncome,
          source_type: r.source_type || (isIncome ? 'yearly_income' : 'recurring_payment'),
          source_idx: rIdx,
          rawDesc: r.desc,
          desc: isIncome ? `📥 ${r.desc}` : `🔄 ${r.desc}`,
          amount,
          account: r.account,
          holiday_rule: holidayRule,
          actualDateStr: `${actualPayDate.getDate()} ${months[actualPayDate.getMonth()]}`,
          occurrenceDate: actualPayDate
        });
      }
    }
  });

  return occurrences;
}
