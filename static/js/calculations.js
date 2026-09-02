import { appState, getSettings, getYearData, getMonthData, getWeekItems, getWeekActuals, getAccountConfig, months, isAccountTrackedWeekly, isAccountIncludedInNet } from './state.js';

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
          actualPaymentDate: targetDate,
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
          actualPaymentDate: actualPaymentDate,
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
            actualPaymentDate: actualPaymentDate,
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
          actualPaymentDate: targetDate,
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
          actualPaymentDate: actualPaymentDate,
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
            actualPaymentDate: actualPaymentDate,
            actualDateStr: `${actualPaymentDate.getDate()} ${months[actualPaymentDate.getMonth()]}`,
            isDueThisWeek: true
          });
        }
      });
    }
  });

  return result;
}

export function calculateLiveDailyPacing(wObj, p, actuals = {}, cfg = {}) {
  if (!wObj || !wObj.startDate || !wObj.endDate || !p) {
    return { isPacingActive: false };
  }
  const sDate = (wObj.startDate instanceof Date) ? wObj.startDate : new Date(wObj.startDate);
  const eDate = (wObj.endDate instanceof Date) ? wObj.endDate : new Date(wObj.endDate);
  if (isNaN(sDate.getTime()) || isNaN(eDate.getTime())) {
    return { isPacingActive: false };
  }

  const now = new Date();
  const wStart = new Date(sDate.getFullYear(), sDate.getMonth(), sDate.getDate(), 0, 0, 0);
  const wEnd = new Date(eDate.getFullYear(), eDate.getMonth(), eDate.getDate(), 23, 59, 59);

  const oneDayMs = 1000 * 60 * 60 * 24;
  const totalDays = Math.max(1, Math.round((wEnd.getTime() - wStart.getTime()) / oneDayMs));
  let elapsedDays = Math.floor((now.getTime() - wStart.getTime()) / oneDayMs) + 1;
  elapsedDays = Math.max(1, Math.min(totalDays, elapsedDays));
  const dayFraction = elapsedDays / totalDays;

  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const clearedDDs = [];
  const upcomingDDs = [];
  const pastDueDDs = [];

  (p.wDDs || []).forEach(d => {
    const isCleared = Boolean(d.auto_cleared || d.status === 'paid');
    const pDate = d.actualPaymentDate ? new Date(d.actualPaymentDate) : null;
    const isPastDate = pDate ? (pDate.getTime() <= todayEnd.getTime()) : false;

    if (isCleared) {
      clearedDDs.push(d);
    } else if (isPastDate) {
      pastDueDDs.push(d);
    } else {
      upcomingDDs.push(d);
    }
  });

  const clearedIncomes = [];
  const upcomingIncomes = [];
  const pastDueIncomes = [];

  (p.wIncomes || []).forEach(i => {
    const isCleared = Boolean(i.auto_cleared || i.status === 'paid');
    const pDate = i.actualPaymentDate ? new Date(i.actualPaymentDate) : null;
    const isPastDate = pDate ? (pDate.getTime() <= todayEnd.getTime()) : false;

    if (isCleared) {
      clearedIncomes.push(i);
    } else if (isPastDate) {
      pastDueIncomes.push(i);
    } else {
      upcomingIncomes.push(i);
    }
  });

  const clearedDDTotal = clearedDDs.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const upcomingDDTotal = upcomingDDs.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const clearedIncomeTotal = clearedIncomes.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const upcomingIncomeTotal = upcomingIncomes.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

  const plannedWeeklyNetSpend = (p.wSpend || 0) - (p.wIncomeSum || 0);
  const pacedDiscretionarySpendToDate = plannedWeeklyNetSpend * dayFraction;

  // Paced target today adds back upcoming bills that haven't cleared yet and only expects spending for elapsed days
  const pacedTargetNetToday = p.predictedNet + upcomingDDTotal - upcomingIncomeTotal + (plannedWeeklyNetSpend * (1 - dayFraction));

  let liveDailyVariance = null;
  if (p.actualNet !== null && p.actualNet !== undefined) {
    liveDailyVariance = p.actualNet - pacedTargetNetToday;
  }

  return {
    isPacingActive: true,
    elapsedDays,
    totalDays,
    dayFraction,
    clearedDDs,
    upcomingDDs,
    pastDueDDs,
    clearedDDTotal,
    upcomingDDTotal,
    clearedIncomes,
    upcomingIncomes,
    pastDueIncomes,
    clearedIncomeTotal,
    upcomingIncomeTotal,
    pacedDiscretionarySpendToDate,
    pacedTargetNetToday,
    liveDailyVariance
  };
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

  budgets.forEach((b, bIdx) => {
    const spent = (b.transactions || []).reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const remaining = Math.max(0, (Number(b.total_budget) || 0) - spent);
    const strategy = b.deduction_strategy || 'none';

    // 1. Dated transactions strictly falling in this month's payday date range
    (b.transactions || []).forEach((t, tIdx) => {
      if (t.date) {
        const tDate = new Date(t.date.includes('T') ? t.date : t.date + 'T12:00:00');
        const tMs = tDate.getTime();
        if (tMs >= startMs && tMs <= endMs) {
          const occDateStr = t.date || '';
          items.push({
            desc: `🎯 ${b.name}${t.desc ? ': ' + t.desc : ''}`,
            rawDesc: `🎯 ${b.name}${t.desc ? ': ' + t.desc : ''}`,
            due_day: tDate.getDate(),
            exact_date: t.date,
            actualPaymentDate: t.date,
            amount: Number(t.amount) || 0,
            account: t.account || b.account,
            is_budget_item: true,
            status: t.status || (t.auto_cleared ? 'paid' : 'due'),
            auto_cleared: Boolean(t.auto_cleared),
            manually_cleared: Boolean(t.manually_cleared),
            cleared_dates: t.cleared_dates || (t.auto_cleared && occDateStr ? [occDateStr] : []),
            matched_txn_id: t.matched_txn_id,
            matched_date: t.matched_date,
            matched_payee: t.matched_payee,
            source_type: 'budget_bill',
            budget_idx: bIdx,
            txn_idx: tIdx,
            raw_target: t
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
        const exactDate = `${schedule.startDate.getFullYear()}-${String(schedule.startDate.getMonth() + 1).padStart(2, '0')}-${String(schedule.startDate.getDate()).padStart(2, '0')}`;
        items.push({
          desc: `🎯 ${b.name} (Monthly Spread)`,
          rawDesc: `🎯 ${b.name} (Monthly Spread)`,
          due_day: schedule.startDate.getDate(),
          exact_date: exactDate,
          actualPaymentDate: exactDate,
          amount: spreadAmt,
          account: b.account,
          is_budget_item: true,
          status: b.status || 'due',
          auto_cleared: Boolean(b.auto_cleared),
          manually_cleared: Boolean(b.manually_cleared),
          cleared_dates: b.cleared_dates || [],
          matched_txn_id: b.matched_txn_id,
          matched_date: b.matched_date,
          matched_payee: b.matched_payee,
          source_type: 'budget_bill',
          budget_idx: bIdx,
          raw_target: b
        });
      }
    } else if (strategy === 'target_date' && remaining > 0 && b.end_date) {
      const endDateObj = new Date(b.end_date.includes('T') ? b.end_date : b.end_date + 'T12:00:00');
      const endMsTime = endDateObj.getTime();
      if (endMsTime >= startMs && endMsTime <= endMs) {
        items.push({
          desc: `🎯 ${b.name} (Target Date Balance)`,
          rawDesc: `🎯 ${b.name} (Target Date Balance)`,
          due_day: endDateObj.getDate(),
          exact_date: b.end_date,
          actualPaymentDate: b.end_date,
          amount: remaining,
          account: b.account,
          is_budget_item: true,
          status: b.status || 'due',
          auto_cleared: Boolean(b.auto_cleared),
          manually_cleared: Boolean(b.manually_cleared),
          cleared_dates: b.cleared_dates || [],
          matched_txn_id: b.matched_txn_id,
          matched_date: b.matched_date,
          matched_payee: b.matched_payee,
          source_type: 'budget_bill',
          budget_idx: bIdx,
          raw_target: b
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
        const occDateStr = t.date || '';
        items.push({
          desc: `🎁 ${b.name}: ${t.desc || 'Gift'}`,
          rawDesc: `🎁 ${b.name}: ${t.desc || 'Gift'}`,
          due_day: tDate.getDate(),
          exact_date: t.date,
          actualPaymentDate: t.date,
          amount: Number(t.amount) || 0,
          account: t.account || b.account || cfg.current_accounts[0],
          isBirthdaySpend: true,
          is_budget_item: true,
          birthdayIdx: bIdx,
          transactionIdx: tIdx,
          status: t.status || (t.auto_cleared ? 'paid' : 'due'),
          auto_cleared: Boolean(t.auto_cleared),
          manually_cleared: Boolean(t.manually_cleared),
          cleared_dates: t.cleared_dates || (t.auto_cleared && occDateStr ? [occDateStr] : []),
          matched_txn_id: t.matched_txn_id,
          matched_date: t.matched_date,
          matched_payee: t.matched_payee,
          source_type: 'birthday',
          raw_target: t,
          actualDateStr: `${tDate.getDate()} ${months[tDate.getMonth()]}`
        });
      }
    });

    // 2. Planned remaining budget allocation if birthday falls in this month's payday date range
    if (bMs >= startMs && bMs <= endMs) {
      if (remaining > 0) {
        items.push({
          desc: `🎂 ${b.name}`,
          rawDesc: `🎂 ${b.name}`,
          due_day: bDate.getDate(),
          exact_date: `${year}-${String(bMIdx + 1).padStart(2, '0')}-${String(b.day || 1).padStart(2, '0')}`,
          actualPaymentDate: `${year}-${String(bMIdx + 1).padStart(2, '0')}-${String(b.day || 1).padStart(2, '0')}`,
          amount: remaining,
          account: b.account || cfg.current_accounts[0],
          isBirthday: true,
          is_budget_item: true,
          budgetTotal: Number(b.budget_amount) || 0,
          spentTotal: spent,
          remaining: remaining,
          status: b.status || 'due',
          auto_cleared: Boolean(b.auto_cleared),
          manually_cleared: Boolean(b.manually_cleared),
          cleared_dates: b.cleared_dates || [],
          matched_txn_id: b.matched_txn_id,
          matched_date: b.matched_date,
          matched_payee: b.matched_payee,
          source_type: 'birthday',
          raw_target: b,
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
        const occDateStr = t.date || '';
        items.push({
          desc: `🎁 ${b.name}: ${t.desc || 'Gift'}`,
          rawDesc: `🎁 ${b.name}: ${t.desc || 'Gift'}`,
          due_day: tDate.getDate(),
          exact_date: t.date,
          actualPaymentDate: t.date,
          amount: Number(t.amount) || 0,
          account: t.account || b.account || cfg.current_accounts[0],
          isBirthdaySpend: true,
          is_budget_item: true,
          birthdayIdx: bIdx,
          transactionIdx: tIdx,
          status: t.status || (t.auto_cleared ? 'paid' : 'due'),
          auto_cleared: Boolean(t.auto_cleared),
          manually_cleared: Boolean(t.manually_cleared),
          cleared_dates: t.cleared_dates || (t.auto_cleared && occDateStr ? [occDateStr] : []),
          matched_txn_id: t.matched_txn_id,
          matched_date: t.matched_date,
          matched_payee: t.matched_payee,
          source_type: 'birthday',
          raw_target: t,
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
          rawDesc: `🎂 ${b.name}`,
          due_day: day,
          exact_date: `${year}-${String(mIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
          actualPaymentDate: `${year}-${String(mIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
          account: b.account || cfg.current_accounts[0],
          amount: remaining,
          budgetTotal: Number(b.budget_amount) || 0,
          status: b.status || 'due',
          auto_cleared: Boolean(b.auto_cleared),
          manually_cleared: Boolean(b.manually_cleared),
          cleared_dates: b.cleared_dates || [],
          matched_txn_id: b.matched_txn_id,
          matched_date: b.matched_date,
          matched_payee: b.matched_payee,
          source_type: 'birthday',
          raw_target: b,
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
        const occDate = weekObj.startDate;
        const occIso = occDate.toISOString().slice(0, 10);
        const isOccCleared = Boolean(r.cleared_dates && r.cleared_dates.includes(occIso));
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
          actualPaymentDate: occDate,
          actualDateStr: `${occDate.getDate()} ${months[occDate.getMonth()]}`,
          occurrenceDate: occDate,
          status: isOccCleared ? 'paid' : 'due',
          auto_cleared: isOccCleared,
          manually_cleared: Boolean(r.manually_cleared)
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
            const occIso = actualPayDate.toISOString().slice(0, 10);
            const isOccCleared = Boolean(r.cleared_dates && r.cleared_dates.includes(occIso));
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
              actualPaymentDate: actualPayDate,
              actualDateStr: `${actualPayDate.getDate()} ${months[actualPayDate.getMonth()]}`,
              occurrenceDate: actualPayDate,
              status: isOccCleared ? 'paid' : 'due',
              auto_cleared: isOccCleared,
              manually_cleared: Boolean(r.manually_cleared)
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
        const occIso = actualPayDate.toISOString().slice(0, 10);
        const isOccCleared = Boolean(r.status === 'paid' || r.auto_cleared || (r.cleared_dates && r.cleared_dates.includes(occIso)));
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
          actualPaymentDate: actualPayDate,
          actualDateStr: `${actualPayDate.getDate()} ${months[actualPayDate.getMonth()]}`,
          occurrenceDate: actualPayDate,
          status: isOccCleared ? 'paid' : 'due',
          auto_cleared: isOccCleared,
          manually_cleared: Boolean(r.manually_cleared)
        });
      }
    }
  });

  return occurrences;
}

export function reconcileTransactionsWithScheduledBills(data) {
  if (!data || !data.open_banking_transactions || !Array.isArray(data.open_banking_transactions)) return 0;
  const txns = data.open_banking_transactions;
  if (txns.length === 0) return 0;

  const cfg = data.settings || {};
  const pdayDay = parseInt(cfg.payday_day || 26, 10);
  const payFreq = cfg.pay_frequency || "monthly";
  const stopWords = new Set(["direct", "debit", "dd", "payment", "pymt", "transfer", "standing", "order", "so", "faster", "fps", "card", "purchase", "pos", "the", "ltd", "limited", "uk", "plc", "co", "bill", "auth", "recurring"]);

  function tokenize(str) {
    if (!str) return new Set();
    const clean = str.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
    return new Set(clean.split(/\s+/).filter(w => w.length >= 2 && !stopWords.has(w)));
  }

  const RETAIL_STOP_MERCHANTS = new Set([
    "schuh", "zara", "primark", "h&m", "hm", "next", "boots", "superdrug", "clarks", "jd sports", "sports direct",
    "greggs", "costa", "starbucks", "mcdonald", "kfc", "subway", "burger king", "nandos", "pret", "caffe nero",
    "tesco", "sainsbury", "asda", "morrison", "aldi", "lidl", "co-op", "coop", "waitrose", "iceland", "marks & spencer", "m&s",
    "b&m", "home bargains", "wilko", "poundland", "savers", "tk maxx", "argos", "currys", "ikea", "b&q", "wickes", "screwfix", "toolstation",
    "pub", "inn", "bar", "tavern", "arms", "restaurant", "bistro", "bakery", "cafe", "coffee", "cinema", "vue", "odeon", "cineworld",
    "deliveroo", "just eat", "uber eats", "amazon", "ebay", "etsy", "shein", "temu"
  ]);

  const BILL_DOMAIN_ALIASES = {
    "council": ["council", "district", "borough", "lincolnshire", "yorkshire", "lancashire", "cheshire", "derbyshire", "nottinghamshire", "staffordshire", "warwickshire", "leicestershire", "northamptonshire", "gloucestershire", "somerset", "devon", "cornwall", "dorset", "wiltshire", "hampshire", "surrey", "sussex", "kent", "essex", "hertfordshire", "bedfordshire", "buckinghamshire", "oxfordshire", "berkshire", "norfolk", "suffolk", "cambridgeshire", "city of", "metropolitan", "unitary", "local authority", "civic", "ctax", "c tax"],
    "tax": ["council", "district", "borough", "lincolnshire", "yorkshire", "hmrc", "revenue", "customs", "dvla"],
    "tv": ["tv licensing", "tv licence", "tvl", "bbc", "television licence", "tvlicense"],
    "licence": ["tv licensing", "tv licence", "tvl", "bbc", "dvla"],
    "energy": ["british gas", "bg energy", "scottish power", "e.on", "eon", "octopus", "ovo", "edf", "bulb", "utilita", "shell energy", "sse", "so energy"],
    "gas": ["british gas", "bg energy", "scottish power", "e.on", "eon", "octopus", "ovo", "edf", "bulb", "utilita"],
    "water": ["water", "severn trent", "thames water", "anglian water", "united utilities", "yorkshire water", "southern water", "wessex water", "south west water", "northumbrian water", "welsh water", "hafra drenau"],
    "broadband": ["bt", "bt group", "virgin media", "virginmedia", "sky", "talktalk", "plusnet", "vodafone", "hyperoptic", "community fibre", "ee"],
    "phone": ["ee", "o2", "three", "vodafone", "giffgaff", "tesco mobile", "sky mobile", "id mobile", "smarty", "voxi", "lebara", "lyca"],
    "internet": ["bt", "virgin media", "virginmedia", "sky", "talktalk", "plusnet", "vodafone", "hyperoptic", "ee"],
    "mortgage": ["nationwide", "santander", "halifax", "barclays", "hsbc", "lloyds", "natwest", "tsb", "yorkshire building", "coventry building", "skipton"],
    "rent": ["property", "estate", "lettings", "landlord", "housing", "residential", "homes", "tenancy"],
    "insurance": ["admiral", "aviva", "direct line", "hastings", "churchill", "lv=", "liverpool victoria", "axa", "more than", "sheilas wheels", "esure", "privilege", "aig", "vitality", "bupa", "axa ppp"],
    "breakdown": ["rac", "the aa", "aa breakdown", "green flag", "autoaid"]
  };

  function isValidBillMatch(bName, bAmt, bDueDay, tPayee, tAmt, tDay, isSameMonth) {
    if (Math.abs(tAmt - bAmt) > 0.05) return false;

    const pClean = tPayee.toLowerCase();
    const bClean = bName.toLowerCase();
    
    let isRetail = false;
    RETAIL_STOP_MERCHANTS.forEach(m => {
      if (pClean.includes(m)) isRetail = true;
    });

    const tTokens = tokenize(tPayee);
    const bTokens = tokenize(bName);
    let nameOverlap = false;
    bTokens.forEach(tok => { if (tTokens.has(tok)) nameOverlap = true; });

    const bAlnum = bClean.replace(/[^a-z0-9]/g, '');
    const pAlnum = pClean.replace(/[^a-z0-9]/g, '');
    const substringMatch = Boolean(bAlnum && (bAlnum.includes(pAlnum) || pAlnum.includes(bAlnum)));
    let partialTokenMatch = false;
    bTokens.forEach(tok => {
      if (tok.length >= 3 && (pAlnum.includes(tok) || pClean.includes(tok))) {
        partialTokenMatch = true;
      }
    });

    if (nameOverlap || substringMatch || partialTokenMatch) return true;

    let aliasMatch = false;
    bTokens.forEach(tok => {
      if (BILL_DOMAIN_ALIASES[tok]) {
        const aliasList = BILL_DOMAIN_ALIASES[tok];
        aliasList.forEach(alias => {
          if (pClean.includes(alias)) aliasMatch = true;
        });
      }
    });
    if (aliasMatch) return true;

    // Retail shopping without explicit name overlap must never match bills
    if (isRetail) return false;

    // Strict non-name fallback for non-round/distinct amounts aligned with expected due date
    const isRoundSmall = (tAmt <= 50.0 && (tAmt % 5 === 0 || (tAmt % 1 === 0 && tAmt <= 25.0)));
    if (!isRoundSmall && isSameMonth) {
      const dayDiff = Math.abs(tDay - (bDueDay || 1));
      if (dayDiff <= 4 || dayDiff >= 27) return true;
    }

    return false;
  }

  const matchedBillKeys = new Set();
  let matchCount = 0;
  const sortedTxns = [...txns].sort((a, b) => (a.booking_date || '').localeCompare(b.booking_date || ''));

  sortedTxns.forEach(t => {
    const rawAmt = Number(t.amount || 0);
    const tAmt = Math.abs(rawAmt);
    if (tAmt < 0.01) return;
    const tIsIncome = (rawAmt > 0);

    const tPayee = `${t.payee_name || ''} ${t.raw_info || ''} ${t.merchant_name || ''}`.trim();
    const tDateStr = t.booking_date || '';

    let targetMName = null;
    let targetYearStr = String(new Date().getFullYear());
    let tDay = 15;

    if (tDateStr) {
      try {
        const dt = new Date(tDateStr.includes('T') ? tDateStr : tDateStr + 'T12:00:00');
        targetYearStr = String(dt.getFullYear());
        tDay = dt.getDate();
        if (payFreq === "monthly" && pdayDay >= 20 && tDay >= (pdayDay - 4)) {
          let budgetMIdx = dt.getMonth() + 1;
          if (budgetMIdx > 11) {
            budgetMIdx = 0;
            targetYearStr = String(dt.getFullYear() + 1);
          }
          targetMName = months[budgetMIdx];
        } else {
          targetMName = months[dt.getMonth()];
        }
      } catch (e) {}
    }

    const yearData = (data.years && data.years[targetYearStr]) || (data.years && data.years[String(new Date().getFullYear())]) || {};
    const monthsMap = yearData.months || {};

    const searchMonths = [];
    if (targetMName && monthsMap[targetMName]) {
      searchMonths.push(targetMName);
      const mIdx = months.indexOf(targetMName);
      if (mIdx > 0 && monthsMap[months[mIdx - 1]]) searchMonths.push(months[mIdx - 1]);
      if (mIdx < 11 && monthsMap[months[mIdx + 1]]) searchMonths.push(months[mIdx + 1]);
    } else {
      searchMonths.push(...Object.keys(monthsMap));
    }

    let matchedThisTxn = false;

    for (const mName of searchMonths) {
      if (matchedThisTxn) break;
      const mData = monthsMap[mName] || {};

      const budgetItems = [];
      (yearData.yearly_budgets || []).forEach((bObj, bIdx) => {
        (bObj.transactions || []).forEach((bTxn, tIdx) => {
          budgetItems.push({
            id: bTxn.id || `budget_${bIdx}_${tIdx}`,
            desc: `🎯 ${bObj.name || ''}: ${bTxn.desc || ''}`.trim(),
            name: bTxn.desc || bObj.name,
            amount: bTxn.amount || 0,
            due_day: bTxn.date ? parseInt(bTxn.date.slice(8, 10), 10) : 1,
            raw_target: bTxn,
            status: bTxn.status || 'due',
            auto_cleared: Boolean(bTxn.auto_cleared),
            manually_cleared: Boolean(bTxn.manually_cleared),
            cleared_dates: bTxn.cleared_dates || []
          });
        });
      });

      const birthdayItems = [];
      (yearData.birthdays || cfg.birthdays || []).forEach((bObj, bIdx) => {
        (bObj.transactions || []).forEach((bTxn, tIdx) => {
          birthdayItems.push({
            id: bTxn.id || `bday_${bIdx}_${tIdx}`,
            desc: `🎁 ${bObj.name || ''}: ${bTxn.desc || ''}`.trim(),
            name: bTxn.desc || bObj.name,
            amount: bTxn.amount || 0,
            due_day: bTxn.date ? parseInt(bTxn.date.slice(8, 10), 10) : 1,
            raw_target: bTxn,
            status: bTxn.status || 'due',
            auto_cleared: Boolean(bTxn.auto_cleared),
            manually_cleared: Boolean(bTxn.manually_cleared),
            cleared_dates: bTxn.cleared_dates || []
          });
        });
      });

      const billCollections = [
        { type: 'direct_debit', isIncome: false, list: mData.direct_debits || [] },
        { type: 'payments_in', isIncome: true, list: mData.payments_in || [] },
        { type: 'scheduled_item', isIncome: false, list: mData.scheduled_items || [] },
        { type: 'yearly_recurring', isIncome: false, list: (yearData.yearly_recurring || []).filter(b => !b.month || b.month === mName) },
        { type: 'yearly_income', isIncome: true, list: (yearData.yearly_income || []).filter(b => !b.month || b.month === mName) },
        { type: 'recurring_payment', isIncome: false, list: yearData.recurring_payments || cfg.recurring_payments || [] },
        { type: 'recurring_income', isIncome: true, list: yearData.recurring_incomes || cfg.recurring_incomes || [] },
        { type: 'budget_bill', isIncome: false, list: budgetItems },
        { type: 'birthday', isIncome: false, list: birthdayItems }
      ];

      for (const coll of billCollections) {
        if (matchedThisTxn) break;
        if (tIsIncome !== coll.isIncome) continue;

        for (let idx = 0; idx < coll.list.length; idx++) {
          const b = coll.list[idx];
          const bId = b.id || `${targetYearStr}_${mName}_${coll.type}_${idx}`;
          if (matchedBillKeys.has(bId)) continue;
          if (b.manually_cleared) {
            matchedBillKeys.add(bId);
            continue;
          }

          const bAmt = Math.abs(Number(b.amount || 0));
          const bName = b.desc || b.name || '';
          const bDueDay = parseInt(b.due_day || b.day_of_month || 1, 10);
          const isSameMonth = (targetMName === mName);

          if (isValidBillMatch(bName, bAmt, bDueDay, tPayee, tAmt, tDay, isSameMonth)) {
            b.status = 'paid';
            b.auto_cleared = true;
            b.matched_txn_id = t.transaction_id;
            b.matched_date = tDateStr;
            b.matched_amount = tAmt;
            b.matched_payee = t.payee_name || t.merchant_name;
            if (tDateStr) {
              const occIso = tDateStr.slice(0, 10);
              b.cleared_dates = b.cleared_dates || [];
              if (!b.cleared_dates.includes(occIso)) b.cleared_dates.push(occIso);
            }

            if (b.raw_target) {
              b.raw_target.status = 'paid';
              b.raw_target.auto_cleared = true;
              b.raw_target.matched_txn_id = t.transaction_id;
              b.raw_target.matched_date = tDateStr;
              b.raw_target.matched_amount = tAmt;
              b.raw_target.matched_payee = t.payee_name || t.merchant_name;
              if (tDateStr) {
                const occIso = tDateStr.slice(0, 10);
                b.raw_target.cleared_dates = b.raw_target.cleared_dates || [];
                if (!b.raw_target.cleared_dates.includes(occIso)) b.raw_target.cleared_dates.push(occIso);
              }
            }

            t.matched_bill_id = bName;
            t.auto_cleared = true;
            matchedBillKeys.add(bId);
            matchedThisTxn = true;
            matchCount++;
            break;
          }
        }
      }
    }
  });

  return matchCount;
}

if (typeof window !== 'undefined') {
  window.reconcileTransactionsWithScheduledBills = reconcileTransactionsWithScheduledBills;
}

export let SPEND_CATEGORIES = [
  {
    id: 'groceries',
    label: 'Supermarket & Groceries',
    icon: '🛒',
    color: '#10b981',
    keywords: [
      'tesco', 'sainsbury', 'asda', 'morrison', 'aldi', 'lidl', 'waitrose', 'marks & spencer', 'marks and spencer', 'marks spencer', 'marks&spencer', 'm&s food', 'm&s simply food', 'm&s', 'm & s',
      'co-op', 'coop', 'iceland foods', 'iceland', 'ocado', 'booths', 'whole foods', 'farmfoods', 'spar', 'nisa', 'londis', 'premier stores',
      'premier', 'costcutter', 'budgens', 'one stop', 'best-one', 'happy shopper', 'day-today', 'keystore', 'family shopper', 'roys',
      'hellofresh', 'gousto', 'abel & cole', 'riverford', 'mindful chef', 'musclefood', 'pasta evangelists', 'allplants', 'costco', 'makro',
      'booker', 'wing yip', 'h mart', 'oriental supermarket', 'asian supermarket', 'halal butcher', 'butcher', 'fishmonger', 'greengrocer',
      'farm shop', 'delicatessen', 'bakery', 'milk & more', 'modern milkman', 'heron foods', 'star bargains', 'approved food', 'majestic wine',
      'bargain booze', 'oddbins', 'laithwaites', 'virgin wines', 'the wine society', 'beer hawk', 'bottle club', 'distillers', 'off licence',
      'supermarket', 'grocery', 'grocer', 'provision'
    ]
  },
  {
    id: 'transport',
    label: 'Fuel, Travel & Vehicles',
    icon: '⛽',
    color: '#0284c7',
    keywords: [
      'tesco pay at pump', 'tesco pay at pum', 'tesco petrol', 'tesco fuel', 'tesco pfs', 'tesco forecourt', 'tesco service station',
      'sainsburys pay at pump', 'sainsbury\'s pay at pump', 'sainsburys petrol', 'sainsbury\'s petrol', 'sainsburys fuel', 'sainsbury\'s fuel', 'sainsburys pfs', 'sainsbury\'s pfs',
      'asda pay at pump', 'asda pay at pum', 'asda petrol', 'asda fuel', 'asda pfs', 'asda forecourt',
      'morrisons pay at pump', 'morrisons petrol', 'morrisons fuel', 'morrisons pfs',
      'pay at pump', 'pay at pum', 'pfs forecourt', 'pfs fuel', 'pfs', 'supermarket petrol', 'supermarket fuel',
      'shell', 'bp oil', 'bp pulse', 'bp connect', 'esso', 'texaco', 'applegreen', 'jet petrol', 'jet service', 'murco', 'gulf oil', 'total petrol',
      'pace fuel', 'harvest energy', 'moto hospitality', 'welcome break', 'roadchef', 'extra services', 'rontec', 'mfg', 'motor fuel', 'euro garages',
      'eg group', 'certas energy', 'petrol', 'fuel', 'diesel', 'oil', 'filling station', 'service station', 'forecourt', 'tesla supercharger', 'tesla',
      'gridserve', 'pod point', 'ionity', 'instavolt', 'osprey', 'shell recharge', 'geniepoint', 'fastned', 'esb energy', 'source london', 'evgo',
      'tfl', 'transport for london', 'tfl travel', 'tfl auto topup', 'oyster', 'trainline', 'national rail', 'lner', 'avanti west coast', 'avanti',
      'gwr', 'great western', 'crosscountry', 'thameslink', 'scotrail', 'transport for wales', 'tfw', 'southern railway', 'south western railway',
      'swr', 'chiltern railways', 'northern rail', 'merseyrail', 'transpennine express', 'c2c rail', 'greater anglia', 'east midlands railway',
      'emr', 'southeastern railway', 'grand central', 'hull trains', 'lumo', 'eurostar', 'railway', 'train', 'underground', 'metro', 'tram',
      'stagecoach', 'arriva', 'first bus', 'first group', 'national express', 'megabus', 'flixbus', 'go-ahead', 'transdev', 'lothian buses',
      'uber', 'uber trip', 'uber bv', 'bolt.eu', 'bolt', 'free now', 'gett', 'cabify', 'addison lee', 'taxi', 'minicab', 'radio cars', 'cab',
      'ringgo', 'paybyphone', 'justpark', 'ncp', 'q-park', 'apcoa', 'parkopedia', 'parkme', 'saba parking', 'euro car parks', 'horizon parking',
      'dart charge', 'merseyflow', 'm6 toll', 'clean air zone', 'caz', 'ulez', 'congestion charge', 'tyne tunnel', 'parking', 'toll',
      'dvla', 'mot', 'halfords autocentre', 'kwik fit', 'kwik-fit', 'national tyres', 'ats euromaster', 'f1 autocentres', 'formula one', 'protyre',
      'mr clutch', 'in n out autocentre', 'rac', 'aa breakdown', 'green flag', 'auto glass', 'autoglass', 'national windscreens', 'car wash',
      'imo car wash', 'waves car wash', 'euro car parts', 'gsf car parts', 'demon tweeks', 'tyres', 'garage', 'auto repair', 'mechanic',
      'zipcar', 'enterprise rent', 'enterprise rent-a-car', 'hertz', 'europcar', 'avis', 'sixt', 'budget rent', 'alamo', 'green motion', 'turo'
    ]
  },
  {
    id: 'dining',
    label: 'Dining, Cafes, Bars & Takeaways',
    icon: '☕',
    color: '#f59e0b',
    keywords: [
      'costa coffee', 'costa', 'starbucks', 'caffe nero', 'caffe', 'pret a manger', 'pret', 'leon', 'gail\'s bakery', 'gails', 'joe & the juice',
      'boston tea party', 'coffee#1', 'black sheep coffee', '200 degrees', 'watchhouse', 'grind', 'ole & steen', 'greggs', 'cooplands', 'wenzel\'s',
      'paul bakery', 'patisserie valerie', 'millie\'s cookies', 'krispy kreme', 'dunkin', 'tim hortons', 'coffee', 'cafe', 'tea room', 'bakery',
      'mcdonald\'s', 'mcdonalds', 'mcdonald', 'kfc', 'burger king', 'subway', 'nando\'s', 'nandos', 'five guys', 'taco bell', 'wendy\'s', 'popeyes',
      'wingstop', 'shake shack', 'jollibee', 'chopstix', 'wimpy', 'roosters piri piri', 'pepe\'s piri piri', 'german doner kebab', 'gdk', 'tortilla',
      'domino\'s pizza', 'dominos', 'papa john\'s', 'papa johns', 'pizza hut', 'pizza express', 'franco manca', 'pizza pilgrims', 'homeslice',
      'honest burgers', 'patty & bun', 'meatliquor', 'byron burger', 'gbk', 'gourmet burger', 'zizzi', 'ask italian', 'prezzo', 'bella italia',
      'carluccio\'s', 'piccolino', 'san carlo', 'wildwood', 'strada', 'cafe rouge', 'cote brasserie', 'cote', 'bill\'s', 'bills restaurant',
      'the ivy', 'wagamama', 'yo! sushi', 'yo sushi', 'itsu', 'wasabi', 'kokoro', 'pho', 'rosa\'s thai', 'banana tree', 'dishoom', 'mowgli',
      'wahaca', 'las iguanas', 'turtle bay', 'chiquito', 'barburrito', 'deliveroo', 'just eat', 'justeat', 'uber eats', 'ubereats', 'foodhub',
      'wetherspoon', 'j d wetherspoon', 'greene king', 'marston\'s', 'marstons', 'mitchells & butlers', 'stonegate', 'fullers', 'young\'s',
      'shepherd neame', 'samuel smith', 'brewdog', 'all bar one', 'slug & lettuce', 'beefeater', 'harvester', 'toby carvery', 'chef & brewer',
      'hungry horse', 'sizzling pubs', 'miller & carter', 'ember inns', 'vintage inns', 'revolution bars', 'revolucion de cuba', 'o\'neill\'s',
      'walkabout', 'pub', 'bar', 'tavern', 'inn', 'brewery', 'taproom', 'cocktail', 'lounge', 'bistro', 'restaurant', 'diner', 'grill',
      'eatery', 'takeaway', 'kebab', 'chippy', 'fish and chips', 'chinese takeaway', 'indian takeaway', 'pizzeria', 'curry house',
      'catering', 'caterer', 'caterers', 'cater', 'buffet', 'food truck', 'street food', 'canteen', 'sandwich shop', 'sandwich bar', 'steakhouse', 'carvery'
    ]
  },
  {
    id: 'shopping',
    label: 'Shopping, Retail, Tech & Home',
    icon: '🛍️',
    color: '#ec4899',
    keywords: [
      'amazon', 'amzn', 'amazon eu', 'amazon marketplace', 'ebay', 'argos', 'very.co.uk', 'very', 'littlewoods', 'etsy', 'temu',
      'aliexpress', 'wish.com', 'vinted', 'depop', 'tiktok shop', 'john lewis', 'marks & spencer', 'm&s', 'debenhams', 'house of fraser',
      'selfridges', 'harrods', 'harvey nichols', 'fenwick', 'liberty', 'oliver bonas', 'flying tiger', 'miniso',
      'b&q', 'screwfix', 'toolstation', 'wickes', 'homebase', 'travis perkins', 'selco', 'jewson', 'magnet', 'city plumbing', 'dobbies garden centre',
      'dobbies', 'notcutts', 'british garden centres', 'rhs', 'gardening', 'plants', 'hardware', 'diy',
      'ikea', 'dunelm', 'the range', 'b&m', 'bm retail', 'home bargains', 'wilko', 'poundland', 'savers', 'dfs', 'sofology', 'scs', 'oak furnitureland',
      'furniture village', 'wayfair', 'habitat', 'made.com', 'loaf', 'dreams', 'bensons for beds', 'tapi carpets', 'carpetright', 'procook',
      'lakeland', 'robert dyas', 'furniture', 'homeware',
      'primark', 'next retail', 'next', 'zara', 'h&m', 'tk maxx', 'tkmaxx', 'homesense', 'asos', 'boohoo', 'prettylittlething', 'shein', 'mango',
      'river island', 'new look', 'urban outfitters', 'uniqlo', 'matalan', 'fatface', 'white stuff', 'seasalt', 'joules', 'superdry', 'levi\'s',
      'hollister', 'abercrombie', 'allsaints', 'reiss', 'ted baker', 'cos', '& other stories', 'monki', 'weekday', 'clothing', 'fashion', 'apparel',
      'jd sports', 'sports direct', 'decathlon', 'mountain warehouse', 'go outdoors', 'blacks', 'millets', 'cotswold outdoor', 'foot locker',
      'schuh', 'clarks', 'deichmann', 'office shoes', 'kurt geiger', 'skechers', 'shoes', 'footwear', 'trainer',
      'currys', 'pc world', 'ao.com', 'appliances direct', 'richer sounds', 'apple store', 'apple.com', 'apple', 'samsung', 'dyson', 'shark ninja',
      'cex', 'game stores', 'sonos', 'bose', 'maplin', 'scan.co.uk', 'overclockers', 'box.co.uk', 'ebuyer', 'electronics',
      'pandora', 'ernest jones', 'h.samuel', 'beaverbrooks', 'goldsmiths', 'watches of switzerland', 'f.hinds', 'warren james', 'swarovski',
      'astrid & miyu', 'monica vinader', 'jewellery', 'watch',
      'waterstones', 'whsmith', 'w h smith', 'blackwell\'s', 'foyles', 'the works', 'card factory', 'clintons', 'paperchase', 'ryman', 'cass art',
      'hobbycraft', 'stationery', 'books',
      'pets at home', 'zooplus', 'pets corner', 'jollyes', 'vet', 'vets4pets', 'medivet', 'pdsa', 'rspca', 'animed direct', 'monster pet',
      'hotel chocolat', 'lindt', 'thorntons', 'interflora', 'bloom & wild', 'moonpig', 'funky pigeon', 'lush', 'the body shop', 'space nk',
      'sephora', 'boots', 'superdrug', 'cult beauty', 'lookfantastic', 'charlotte tilbury', 'mac cosmetics', 'jo malone', 'molton brown',
      'penhaligon\'s', 'cosmetics', 'perfume', 'beauty', 'gift'
    ]
  },
  {
    id: 'entertainment',
    label: 'Entertainment, Gaming, Leisure & Media',
    icon: '🎮',
    color: '#8b5cf6',
    keywords: [
      'amazon prime', 'apple.com/bill', 'itunes.com/bill', 'google play', 'google *play',
      'netflix', 'spotify', 'disney+', 'disney plus', 'disney', 'prime video', 'apple tv', 'youtube premium', 'youtube', 'now tv', 'paramount+',
      'discovery+', 'britbox', 'crunchyroll', 'mubi', 'dazn', 'streaming', 'stream', 'deezer', 'tidal', 'amazon music', 'apple music', 'audible',
      'pocket casts', 'soundcloud', 'bandcamp', 'patreon', 'playstation', 'psn', 'sony interactive', 'xbox', 'microsoft*xbox', 'nintendo eShop',
      'nintendo', 'steam', 'valve', 'epic games', 'blizzard', 'battle.net', 'riot games', 'ea games', 'electronic arts', 'ubisoft', 'rockstar games',
      'roblox', 'twitch', 'discord', 'gog.com', 'gaming', 'video game', 'arcade',
      'odeon cinemas', 'odeon', 'vue cinemas', 'vue', 'cineworld', 'showcase cinemas', 'everyman cinema', 'everyman', 'picturehouse', 'curzon',
      'cinema', 'theatre', 'atg tickets', 'london theatre', 'national theatre', 'royal opera house', 'ticketmaster', 'see tickets', 'eventbrite',
      'axs', 'skiddle', 'dice.fm', 'resident advisor', 'gigantic', 'concert', 'festival', 'gig',
      'alton towers', 'thorpe park', 'chessington', 'legoland', 'madame tussauds', 'london eye', 'sea life', 'warwick castle', 'merlin entertainments',
      'national trust', 'english heritage', 'historic royal palaces', 'kew gardens', 'eden project', 'london zoo', 'chester zoo', 'marwell zoo',
      'longleat', 'zoo', 'safari park', 'aquarium', 'museum', 'exhibition', 'gallery', 'hollywood bowl', 'tenpin', 'lane7', 'flight club',
      'boom battle bar', 'swingers', 'junkyard golf', 'topgolf', 'escape room', 'go ape', 'bowling', 'mini golf',
      'the guardian', 'the times', 'telegraph', 'financial times', 'economist', 'new york times', 'washington post', 'medium', 'substack', 'newspaper'
    ]
  },
  {
    id: 'bills',
    label: 'Bills, Utilities, Telecoms & Housing',
    icon: '🏡',
    color: '#6366f1',
    keywords: [
      'british gas', 'octopus energy', 'octopus', 'ovo energy', 'ovo', 'e.on next', 'eon next', 'e.on', 'eon', 'edf energy', 'edf', 'scottish power',
      'shell energy', 'utilita', 'so energy', 'good energy', 'outfox the market', 'bulb energy', 'co-op energy', 'energy', 'gas bill', 'electric bill',
      'thames water', 'severn trent water', 'severn trent', 'anglian water', 'united utilities', 'yorkshire water', 'southern water', 'south west water',
      'northumbrian water', 'welsh water', 'dwr cymru', 'wessex water', 'affinity water', 'bristol water', 'south east water', 'ses water', 'water bill',
      'bt group', 'bt bill', 'bt broadband', 'ee limited', 'ee', 'o2 uk', 'o2', 'telefonica', 'vodafone', 'three uk', 'three', '3 uk', 'virgin media',
      'sky digital', 'sky uk', 'sky', 'talktalk', 'plusnet', 'now broadband', 'hyperoptic', 'community fibre', 'gigaclear', 'zen internet', 'kcom',
      'giffgaff', 'smarty', 'voxi', 'lebara', 'lycamobile', 'id mobile', 'tesco mobile', 'asda mobile', 'sainsburys energy', 'sainsbury\'s energy',
      'tesco insurance', 'sainsburys insurance', 'sainsbury\'s insurance', 'broadband', 'telecom', 'mobile phone',
      'council tax', 'city council', 'borough council', 'district council', 'county council', 'hmrc', 'self assessment', 'tv licensing', 'tv licence',
      'aviva', 'direct line', 'admiral insurance', 'admiral', 'hastings direct', 'hastings', 'churchill insurance', 'churchill', 'privilege insurance',
      'more than', 'legal & general', 'lv=', 'liverpool victoria', 'axa insurance', 'axa', 'allianz', 'zurich insurance', 'royal london', 'sunlife',
      'vitality life', 'vitality health', 'bupa insurance', 'petplan', 'bought by many', 'manypets', 'policy expert', 'insurance', 'premium',
      'nationwide mortgage', 'santander mortgage', 'halifax mortgage', 'barclays mortgage', 'hsbc mortgage', 'natwest mortgage', 'lloyds mortgage',
      'yorkshire building society', 'coventry building society', 'skipton building society', 'leeds building society', 'virgin money mortgage',
      'rent payment', 'mortgage payment', 'estate agent', 'letting agent', 'ground rent', 'service charge', 'landlord', 'mortgage', 'rent'
    ]
  },
  {
    id: 'health',
    label: 'Health, Fitness, Medical & Beauty',
    icon: '🏥',
    color: '#14b8a6',
    keywords: [
      'puregym', 'the gym group', 'the gym', 'david lloyd', 'nuffield health', 'nuffield', 'virgin active', 'anytime fitness', 'fitness first',
      'gymbox', 'better gym', 'bannatyne', 'everlast gyms', 'jd gyms', 'snap fitness', 'f45', 'crossfit', 'classpass', 'leisure centre', 'swimming pool',
      'gym', 'fitness', 'workout', 'pilates', 'yoga',
      'boots pharmacy', 'lloydspharmacy', 'well pharmacy', 'rowlands pharmacy', 'superdrug pharmacy', 'pharmacy2u', 'chemist4u', 'nhs prescription',
      'pharmacy', 'chemist', 'prescription', 'spex4less', 'specsavers', 'vision express', 'boots opticians', 'scrivens', 'optical express',
      'optician', 'eyecare', 'glasses', 'contact lenses',
      'nhs dental', 'bupa dental', 'mydentist', 'dental surgery', 'dental practice', 'dentist', 'dental', 'orthodontist',
      'doctor', 'gp surgery', 'hospital', 'private clinic', 'physiotherapy', 'physio', 'chiropractor', 'osteopath', 'podiatry', 'acupuncture',
      'psychotherapy', 'counselling', 'betterhelp', 'mind', 'health clinic', 'blood test', 'mri scan', 'medical', 'clinic',
      'barber', 'hairdressing', 'hair salon', 'toni & guy', 'rush hair', 'supercuts', 'beauty salon', 'nail bar', 'nail salon', 'waxing',
      'tanning', 'sunbed', 'spa day', 'massage', 'aesthetic clinic', 'tattoo studio', 'tattoo', 'piercing', 'hair', 'salon'
    ]
  },
  {
    id: 'travel',
    label: 'Travel, Airlines, Hotels & Holidays',
    icon: '✈️',
    color: '#06b6d4',
    keywords: [
      'ryanair', 'easyjet', 'british airways', 'ba.com', 'jet2', 'tui', 'virgin atlantic', 'wizz air', 'emirates', 'qatar airways', 'klm',
      'air france', 'lufthansa', 'aer lingus', 'vueling', 'norwegian air', 'turkish airlines', 'singapore airlines', 'etihad', 'iberia', 'sas',
      'airline', 'flight', 'airport', 'airways', 'duty free',
      'booking.com', 'airbnb', 'hotels.com', 'expedia', 'tripadvisor', 'agoda', 'trivago', 'kayak', 'skyscanner', 'lastminute.com', 'on the beach',
      'loveholidays', 'trailfinders', 'hays travel', 'kuoni', 'travel agent', 'holiday',
      'premier inn', 'travelodge', 'holiday inn', 'crowne plaza', 'marriott', 'hilton', 'doubletree', 'ibis', 'novotel', 'mercure', 'accor hotels',
      'best western', 'radisson', 'jurys inn', 'leonardo hotels', 'malmaison', 'hotel du vin', 'britannia hotels', 'center parcs', 'butlin\'s',
      'haven holidays', 'parkdean resorts', 'forest holidays', 'youth hostel', 'yha', 'hostelworld', 'hotel', 'motel', 'resort', 'hostel',
      'p&o ferries', 'dfds seaways', 'dfds', 'stena line', 'brittany ferries', 'irish ferries', 'red funnel', 'wightlink', 'caledonian macbrayne',
      'calmac', 'condor ferries', 'royal caribbean', 'p&o cruises', 'princess cruises', 'msc cruises', 'norwegian cruise', 'ferry', 'cruise'
    ]
  },
  {
    id: 'education',
    label: 'Education, Courses & Childcare',
    icon: '📚',
    color: '#3b82f6',
    keywords: [
      'nursery', 'childcare', 'daycare', 'babysitter', 'nanny', 'pre-school', 'kindergarten', 'playgroup', 'tuition', 'school fees', 'school',
      'college', 'university', 'ucas', 'student finance', 'student loans', 'school uniform', 'parentpay', 'parentmail', 'arbor', 'scopay',
      'schoolmoney', 'udemy', 'coursera', 'skillshare', 'linkedin learning', 'masterclass', 'duolingo', 'codecademy', 'tutor', 'kumon',
      'music lessons', 'driving lessons', 'bsm', 'red driving school', 'passmefast', 'theory test', 'driving test', 'course', 'training'
    ]
  },
  {
    id: 'transfers',
    label: 'Transfers, Savings, Investments & Wallets',
    icon: '🔄',
    color: '#64748b',
    keywords: [
      'tesco bank', 'tesco credit card', 'tesco creditcard', 'tesco cc', 'tesco personal finance', 'tesco loans',
      'sainsburys bank', 'sainsbury\'s bank', 'sainsbury bank', 'sainsburys credit card', 'sainsbury\'s credit card', 'sainsburys cc',
      'asda money', 'asda credit card', 'asda creditcard',
      'm&s bank', 'marks and spencer bank', 'marks & spencer bank', 'm&s credit card',
      'john lewis finance', 'partnership card',
      'faster payment', 'bank transfer', 'direct debit', 'standing order', 'transfer to', 'transfer from', 'card payment', 'credit card payment',
      'bill payment', 'autopay', 'internal transfer', 'cash withdrawal', 'atm', 'cash deposit', 'cheque', 'payment received',
      'paypal', 'revolut', 'monzo', 'starling', 'wise', 'transferwise', 'curve', 'monese', 'cash app', 'venmo', 'skrill', 'neteller',
      'chip savings', 'chip', 'moneybox', 'plum', 'vanguard', 'hargreaves lansdown', 'aj bell', 'interactive investor', 'freetrade', 'trading 212',
      'etoro', 'nutmeg', 'wealthify', 'moneyfarm', 'ns&i', 'premium bonds', 'pension', 'scottish widows', 'aviva pension', 'nest pensions',
      'standard life', 'coinbase', 'binance', 'kraken', 'crypto.com', 'gemini', 'bitstamp', 'coinjar', 'crypto', 'savings', 'investment'
    ]
  },
  {
    id: 'general',
    label: 'General & Miscellaneous',
    icon: '📦',
    color: '#94a3b8',
    keywords: []
  }
];

export function getCategoryById(catId) {
  return SPEND_CATEGORIES.find(c => c.id === catId) || SPEND_CATEGORIES[SPEND_CATEGORIES.length - 1];
}

export function setDynamicCategories(cats) {
  if (Array.isArray(cats) && cats.length > 0) {
    SPEND_CATEGORIES = cats;
    _CACHED_CATEGORY_INDEX = null;
  }
}

// Pre-index keywords sorted descending by length for optimal precision
let _CACHED_CATEGORY_INDEX = null;
function getCategorySearchIndex() {
  if (_CACHED_CATEGORY_INDEX) return _CACHED_CATEGORY_INDEX;

  const allKeywords = [];

  SPEND_CATEGORIES.forEach(cat => {
    if (cat.id === 'general') return;
    (cat.keywords || []).forEach(kw => {
      if (kw) {
        allKeywords.push({
          keyword: kw.toLowerCase().trim(),
          category: cat,
          length: kw.trim().length
        });
      }
    });
  });

  allKeywords.sort((a, b) => b.length - a.length);

  _CACHED_CATEGORY_INDEX = allKeywords;
  return _CACHED_CATEGORY_INDEX;
}

export function categorizeTransaction(t, customRules = {}) {
  if (t.category && SPEND_CATEGORIES.some(c => c.id === t.category)) {
    return getCategoryById(t.category);
  }

  const payee = (t.payee_name || '').toLowerCase();
  const rawInfo = (t.raw_info || '').toLowerCase();
  const creditor = (t.creditor_name || '').toLowerCase();
  const merchant = (t.merchant_name || '').toLowerCase();
  const fullText = `${payee} ${rawInfo} ${creditor} ${merchant}`;

  // 1. User custom merchant rules (highest priority after manual assignment)
  for (const [pattern, catId] of Object.entries(customRules || {})) {
    if (pattern && fullText.includes(pattern.toLowerCase())) {
      return getCategoryById(catId);
    }
  }

  // 2. Open Banking provider classification / meta tags (e.g. TrueLayer / Plaid category arrays)
  const classifications = Array.isArray(t.classification) ? t.classification : (Array.isArray(t.transaction_classification) ? t.transaction_classification : []);
  const classText = classifications.join(' ').toLowerCase();
  if (classText.includes('grocer') || classText.includes('supermarket')) return getCategoryById('groceries');
  if (classText.includes('fuel') || classText.includes('gas station') || classText.includes('transport') || classText.includes('automotive') || classText.includes('transit') || classText.includes('taxi')) return getCategoryById('transport');
  if (classText.includes('restaurant') || classText.includes('dining') || classText.includes('cafe') || classText.includes('food and drink') || classText.includes('fast food') || classText.includes('bar') || classText.includes('pub') || classText.includes('cater')) return getCategoryById('dining');
  if (classText.includes('shopping') || classText.includes('retail') || classText.includes('clothing') || classText.includes('electronics') || classText.includes('department store')) return getCategoryById('shopping');
  if (classText.includes('entertainment') || classText.includes('media') || classText.includes('gaming') || classText.includes('streaming') || classText.includes('movies') || classText.includes('music')) return getCategoryById('entertainment');
  if (classText.includes('utilities') || classText.includes('bills') || classText.includes('insurance') || classText.includes('telecom') || classText.includes('tax') || classText.includes('rent') || classText.includes('mortgage')) return getCategoryById('bills');
  if (classText.includes('health') || classText.includes('medical') || classText.includes('fitness') || classText.includes('pharmacy') || classText.includes('dental') || classText.includes('gym')) return getCategoryById('health');
  if (classText.includes('travel') || classText.includes('airline') || classText.includes('flight') || classText.includes('hotel') || classText.includes('lodging') || classText.includes('vacation')) return getCategoryById('travel');
  if (classText.includes('education') || classText.includes('school') || classText.includes('tuition') || classText.includes('childcare')) return getCategoryById('education');
  if (classText.includes('transfer') || classText.includes('deposit') || classText.includes('withdrawal') || classText.includes('atm') || classText.includes('investment') || classText.includes('savings')) return getCategoryById('transfers');

  // 3. Auto-cleared direct debits / recurring bills
  if (t.auto_cleared || t.matched_bill_id) {
    return getCategoryById('bills');
  }

  // 4. Normalized string matching: strip punctuation, extra spaces, transaction codes
  const cleanNorm = ' ' + fullText
    .replace(/[*\-_#/:.,;]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() + ' ';
  const fullPadded = ' ' + fullText + ' ';

  const allKeywords = getCategorySearchIndex();

  // 5. Keyword search matching: match longest specific merchant phrases first
  for (const item of allKeywords) {
    if (item.length <= 4) {
      if (cleanNorm.includes(` ${item.keyword} `) || fullPadded.includes(` ${item.keyword} `)) {
        return item.category;
      }
    } else {
      if (cleanNorm.includes(item.keyword) || fullText.includes(item.keyword)) {
        return item.category;
      }
    }
  }

  return getCategoryById('general');
}

export function calculateCategoryBreakdown(transactions, timeframe = 'this_month', accountFilter = 'all', activeUser = 'all', customRules = {}) {
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth();

  let startDate = null;
  let endDate = new Date(curYear, curMonth, now.getDate(), 23, 59, 59);

  if (timeframe === 'active_week') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    startDate = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0);
  } else if (timeframe === 'this_month') {
    startDate = new Date(curYear, curMonth, 1, 0, 0, 0);
  } else if (timeframe === 'last_month') {
    startDate = new Date(curYear, curMonth - 1, 1, 0, 0, 0);
    endDate = new Date(curYear, curMonth, 0, 23, 59, 59);
  } else if (timeframe === 'last_30_days') {
    startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
  } else if (timeframe === 'year_to_date') {
    startDate = new Date(curYear, 0, 1, 0, 0, 0);
  } else {
    startDate = new Date(curYear, curMonth, 1, 0, 0, 0);
  }

  const filtered = (transactions || []).filter(t => {
    const amt = Number(t.amount || 0);
    if (amt >= 0) return false;

    if (t.booking_date) {
      const tDate = new Date(t.booking_date);
      if (startDate && tDate < startDate) return false;
      if (endDate && tDate > endDate) return false;
    }

    if (accountFilter && accountFilter !== 'all') {
      const tAcc = String(t.account_name || '').toLowerCase();
      const fAcc = String(accountFilter).toLowerCase();
      if (!tAcc.includes(fAcc) && fAcc !== tAcc) return false;
    }

    if (activeUser && activeUser !== 'all' && activeUser !== 'Joint') {
      if (t.owner && t.owner !== 'Joint' && t.owner !== activeUser) return false;
    }

    return true;
  });

  const totalsByCategory = {};
  SPEND_CATEGORIES.forEach(c => {
    totalsByCategory[c.id] = {
      category: c,
      totalAmount: 0,
      count: 0,
      transactions: []
    };
  });

  const merchantTotals = {};
  let grandTotal = 0;

  filtered.forEach(t => {
    const cat = categorizeTransaction(t, customRules);
    const absAmt = Math.abs(Number(t.amount || 0));

    totalsByCategory[cat.id].totalAmount += absAmt;
    totalsByCategory[cat.id].count += 1;
    totalsByCategory[cat.id].transactions.push({ ...t, assignedCategory: cat });

    const mName = t.payee_name || 'Unknown Merchant';
    merchantTotals[mName] = (merchantTotals[mName] || 0) + absAmt;

    if (cat.id !== 'transfers') {
      grandTotal += absAmt;
    }
  });

  const categoryList = Object.values(totalsByCategory)
    .filter(c => c.totalAmount > 0)
    .map(c => ({
      ...c,
      percentage: grandTotal > 0 ? (c.totalAmount / grandTotal) * 100 : 0
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);

  const topMerchants = Object.entries(merchantTotals)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  return {
    filteredTransactions: filtered.map(t => ({ ...t, assignedCategory: categorizeTransaction(t, customRules) })),
    categoryList,
    topMerchants,
    grandTotal,
    transactionCount: filtered.length,
    startDate,
    endDate
  };
}

export function calculateMonthForecast(monthName = appState.activeTab, year = appState.currentYear) {
  const cfg = getSettings();
  let targetMonth = monthName;
  if (!targetMonth || targetMonth === 'Overview' || !months.includes(targetMonth)) {
    const detected = (typeof detectCurrentMonthAndWeek === 'function') ? detectCurrentMonthAndWeek(year) : null;
    targetMonth = (detected && detected.month) ? detected.month : 'Jan';
  }

  const mIdx = months.indexOf(targetMonth);
  const schedule = calculateMonthSchedule(year, mIdx);
  const mData = getMonthData(targetMonth, year);

  const deducts = mData.deductions_list || [];
  let totalCurrentInflow = 0;
  let totalSalarySavingsIn = 0;
  const personTotals = {};
  (cfg.people || []).forEach(p => personTotals[p] = { salary: 0, out: 0, leftover: 0 });

  deducts.forEach(d => {
    (cfg.people || []).forEach(p => {
      let amt = 0;
      if (d.is_salary) {
        amt = getDeductionSalaryForMonth(d, p, schedule).total;
        personTotals[p].salary += amt;
        if (cfg.current_accounts.includes(d.target_account)) totalCurrentInflow += amt;
        if (cfg.savings_accounts.includes(d.target_account)) totalSalarySavingsIn += amt;
      } else {
        if (d.amounts && typeof d.amounts[p] !== 'undefined') {
          amt = Number(d.amounts[p]) || 0;
        } else if (d.person) {
          amt = (d.person === p) ? (Number(d.amount) || 0) : 0;
        }
        personTotals[p].out += amt;
        if (cfg.current_accounts.includes(d.target_account)) totalCurrentInflow += amt;
        if (cfg.savings_accounts.includes(d.target_account)) totalSalarySavingsIn += amt;
      }
    });
  });

  (cfg.people || []).forEach(p => personTotals[p].leftover = personTotals[p].salary - personTotals[p].out);

  const yData = getYearData(year);
  const allYearlyBills = yData.yearly_recurring || [];
  const allYearlyIncome = yData.yearly_income || [];
  const budgetBillsThisMonth = (typeof getYearlyBudgetItemsForMonth === 'function') ? getYearlyBudgetItemsForMonth(targetMonth, mIdx, year) : [];
  const birthdayBillsThisMonth = (typeof getBirthdayItemsForMonth === 'function') ? getBirthdayItemsForMonth(targetMonth, mIdx, year) : [];
  const allBirthdays = yData.birthdays || cfg.birthdays || [];
  const allRecurring = yData.recurring_payments || cfg.recurring_payments || [];
  const allRecurringIncomes = yData.recurring_incomes || cfg.recurring_incomes || [];

  let totalDD = (mData.direct_debits || []).reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  allYearlyBills.filter(yb => yb.month === targetMonth).forEach(yb => totalDD += (Number(yb.amount) || 0));
  budgetBillsThisMonth.forEach(b => totalDD += (Number(b.amount) || 0));
  birthdayBillsThisMonth.forEach(b => totalDD += (Number(b.amount) || 0));

  let totalMonthPaymentsIn = (mData.payments_in || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  allYearlyIncome.filter(yi => yi.month === targetMonth).forEach(yi => totalMonthPaymentsIn += (Number(yi.amount) || 0));

  let totalWeeklySpend = 0, totalWeeklyCurrentSpend = 0, totalWeeklyIncome = 0;
  schedule.weeks.forEach(wObj => {
    const items = getWeekItems(targetMonth, wObj.name, year);
    items.forEach(i => {
      const amt = Number(i.amount) || 0;
      if (i.is_income) totalWeeklyIncome += amt;
      else {
        totalWeeklySpend += amt;
        const isCurrent = i.account_type === 'current' || (i.desc && i.desc.toLowerCase().includes('cash'));
        if (isCurrent) totalWeeklyCurrentSpend += amt;
      }
    });
  });

  let totalCurrentOpening = 0;
  const runningCurrentByAcc = {};
  (cfg.current_accounts || []).forEach(acc => {
    const val = Number(mData.current_data[acc] && mData.current_data[acc].opening) || 0;
    totalCurrentOpening += val;
    runningCurrentByAcc[acc] = val;
  });

  deducts.forEach(d => {
    if (cfg.current_accounts.includes(d.target_account)) {
      (cfg.people || []).forEach(p => {
        const amount = d.is_salary ? getDeductionSalaryForMonth(d, p, schedule).total : ((d.amounts && typeof d.amounts[p] !== 'undefined') ? Number(d.amounts[p]) : (d.person === p ? Number(d.amount) : 0));
        if (runningCurrentByAcc[d.target_account] !== undefined) {
          runningCurrentByAcc[d.target_account] += amount || 0;
        }
      });
    }
  });

  let totalCreditOpeningSpent = 0, totalCreditLimit = 0;
  const runningCreditByCard = {};
  (cfg.credit_accounts || []).forEach(c => {
    const spent = Number(mData.credit_data[c.name] && mData.credit_data[c.name].opening_spent) || 0;
    totalCreditLimit += Number(c.limit) || 0;
    totalCreditOpeningSpent += spent;
    runningCreditByCard[c.name] = spent;
  });

  const autoSavingsFromDD = {};
  (cfg.savings_accounts || []).forEach(acc => autoSavingsFromDD[acc] = 0);
  (mData.direct_debits || []).forEach(dd => {
    if (dd.transfer_to && cfg.savings_accounts.includes(dd.transfer_to)) {
      autoSavingsFromDD[dd.transfer_to] += Number(dd.amount) || 0;
    }
  });

  let totalSavingsOpening = 0;
  const runningSavingsByAcc = {};
  (cfg.savings_accounts || []).forEach(acc => {
    const val = Number(mData.savings_data[acc] && mData.savings_data[acc].opening) || 0;
    totalSavingsOpening += val;
    runningSavingsByAcc[acc] = val;
  });

  deducts.forEach(d => {
    if (cfg.savings_accounts.includes(d.target_account)) {
      (cfg.people || []).forEach(p => {
        const amt = d.is_salary ? getDeductionSalaryForMonth(d, p, schedule).total : ((d.amounts && typeof d.amounts[p] !== 'undefined') ? Number(d.amounts[p]) : (d.person === p ? Number(d.amount) : 0));
        if (runningSavingsByAcc[d.target_account] !== undefined) runningSavingsByAcc[d.target_account] += amt || 0;
      });
    }
  });

  // Calculate week-by-week cashflow predictions
  const weeklyPredictions = [];
  schedule.weeks.forEach((wObj, wIdx) => {
    const isFinalWeek = (wIdx === schedule.weeks.length - 1);
    const items = getWeekItems(targetMonth, wObj.name, year);
    const actuals = getWeekActuals(targetMonth, wObj.name, year);

    let wExpenseSum = 0, wIncomeSum = 0;
    items.forEach(it => {
      const amt = Number(it.amount) || 0;
      if (it.is_income) wIncomeSum += amt;
      else wExpenseSum += amt;
    });

    const directDebitsWithMeta = (mData.direct_debits || []).map((b, idx) => ({ ...b, source_type: 'direct_debit', source_idx: idx }));
    const yearlyBillsWithMeta = (yData.yearly_recurring || []).map((b, idx) => ({ ...b, source_type: 'yearly_recurring', source_idx: idx }));
    const budgetBillsThisMonth = (typeof getYearlyBudgetItemsForMonth === 'function') ? getYearlyBudgetItemsForMonth(targetMonth, mIdx, year).map((b, idx) => ({ ...b, source_type: 'budget_bill', source_idx: idx })) : [];
    const allScheduledBills = [...directDebitsWithMeta, ...yearlyBillsWithMeta, ...budgetBillsThisMonth];
    const baseDDs = getDDsForWeek(allScheduledBills, wObj, schedule);

    const wBirthdays = (typeof getBirthdaysForWeek === 'function') ? getBirthdaysForWeek(allBirthdays, wObj, schedule, year) : [];
    const wRecurring = (typeof getRecurringForWeek === 'function') ? getRecurringForWeek(allRecurring, wObj, schedule, year) : [];

    const wDDs = [...baseDDs, ...wRecurring, ...wBirthdays];
    const wDDTotal = wDDs.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

    const directIncomesWithMeta = (mData.payments_in || []).map((b, idx) => ({ ...b, source_type: 'payments_in', source_idx: idx }));
    const yearlyIncomesWithMeta = (yData.yearly_income || []).map((b, idx) => ({ ...b, source_type: 'yearly_income', source_idx: idx }));
    const allScheduledIncomes = [...directIncomesWithMeta, ...yearlyIncomesWithMeta];
    const baseIncomes = getIncomesForWeek(allScheduledIncomes, wObj, schedule, year);
    const wRecurringIncomes = (typeof getRecurringForWeek === 'function') ? getRecurringForWeek(allRecurringIncomes, wObj, schedule, year) : [];
    const wIncomes = [...baseIncomes, ...wRecurringIncomes];
    const wIncomeTotal = wIncomes.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

    // 1. Process Outgoings
    wDDs.forEach(dd => {
      const paidFrom = dd.account || cfg.current_accounts[0];
      const amt = Number(dd.amount) || 0;
      if (runningCurrentByAcc[paidFrom] !== undefined) {
        runningCurrentByAcc[paidFrom] -= amt;
      }
      if (runningCreditByCard[paidFrom] !== undefined) {
        runningCreditByCard[paidFrom] += amt;
      }
      if (runningSavingsByAcc[paidFrom] !== undefined) {
        runningSavingsByAcc[paidFrom] -= amt;
      }
      if (dd.transfer_to && cfg.savings_accounts.includes(dd.transfer_to)) {
        if (runningSavingsByAcc[dd.transfer_to] !== undefined) {
          runningSavingsByAcc[dd.transfer_to] += amt;
        }
      }
    });

    // 2. Process Inflows
    wIncomes.forEach(pi => {
      const creditedTo = pi.account || cfg.current_accounts[0];
      const amt = Number(pi.amount) || 0;
      if (runningCurrentByAcc[creditedTo] !== undefined) {
        runningCurrentByAcc[creditedTo] += amt;
      }
      if (runningCreditByCard[creditedTo] !== undefined) {
        runningCreditByCard[creditedTo] = Math.max(0, runningCreditByCard[creditedTo] - amt);
      }
      if (runningSavingsByAcc[creditedTo] !== undefined) {
        runningSavingsByAcc[creditedTo] += amt;
      }
    });

    const autopaysDue = [];
    (cfg.credit_accounts || []).forEach(c => {
      if (c.autopay_enabled) {
        let isDueThisWeek = (c.autopay_when === `week_${wIdx + 1}`);
        if (isDueThisWeek) {
          const openingDebt = Number(mData.credit_data[c.name] && mData.credit_data[c.name].opening_spent) || 0;
          const payAmt = c.autopay_type === 'full' ? openingDebt : Math.min(openingDebt, Number(c.autopay_fixed_amt) || 0);
          if (payAmt > 0) {
            const fundingAcc = c.autopay_from || cfg.current_accounts[0];
            if (runningCurrentByAcc[fundingAcc] !== undefined) runningCurrentByAcc[fundingAcc] -= payAmt;
            runningCreditByCard[c.name] = Math.max(0, runningCreditByCard[c.name] - payAmt);
            autopaysDue.push({ card: c.name, from: fundingAcc, amount: payAmt });
          }
        }
      }
    });

    items.forEach(it => {
      const amt = Number(it.amount) || 0;
      if (it.account_type === 'current') {
        const acc = it.account_name || cfg.current_accounts[0];
        if (runningCurrentByAcc[acc] !== undefined) runningCurrentByAcc[acc] = it.is_income ? runningCurrentByAcc[acc] + amt : runningCurrentByAcc[acc] - amt;
      } else if (it.account_type === 'credit') {
        const cName = it.account_name || cfg.credit_accounts[0]?.name;
        if (cName && runningCreditByCard[cName] !== undefined) runningCreditByCard[cName] = it.is_income ? runningCreditByCard[cName] - amt : runningCreditByCard[cName] + amt;
      } else if (it.account_type === 'savings') {
        const sName = it.account_name || cfg.savings_accounts[0];
        if (sName && runningSavingsByAcc[sName] !== undefined) runningSavingsByAcc[sName] = it.is_income ? runningSavingsByAcc[sName] + amt : runningSavingsByAcc[sName] - amt;
      }
    });

    const weekCurrentSnap = { ...runningCurrentByAcc };
    const weekCreditSnap = { ...runningCreditByCard };
    const weekSavingsSnap = { ...runningSavingsByAcc };

    let sumWeekCurrent = 0, sumWeekCredit = 0, sumWeekSavings = 0;
    (cfg.current_accounts || []).forEach(acc => sumWeekCurrent += (weekCurrentSnap[acc] || 0));
    (cfg.credit_accounts || []).forEach(c => sumWeekCredit += (weekCreditSnap[c.name] || 0));
    if (cfg.track_savings) {
      (cfg.savings_accounts || []).forEach(s => sumWeekSavings += (weekSavingsSnap[s] || 0));
    }

    let predictedNet = 0;
    if (isFinalWeek) {
      cfg.current_accounts.filter(a => isAccountIncludedInNet('current', a)).forEach(a => predictedNet += (weekCurrentSnap[a] || 0));
      if (cfg.track_savings) {
        cfg.savings_accounts.filter(s => isAccountIncludedInNet('savings', s)).forEach(s => predictedNet += (weekSavingsSnap[s] || 0));
      }
      cfg.credit_accounts.filter(c => isAccountIncludedInNet('credit', c.name)).forEach(c => predictedNet -= (weekCreditSnap[c.name] || 0));
    } else {
      cfg.current_accounts.filter(a => isAccountTrackedWeekly('current', a) && isAccountIncludedInNet('current', a)).forEach(a => predictedNet += (weekCurrentSnap[a] || 0));
      if (cfg.track_savings) {
        cfg.savings_accounts.filter(s => isAccountTrackedWeekly('savings', s) && isAccountIncludedInNet('savings', s)).forEach(s => predictedNet += (weekSavingsSnap[s] || 0));
      }
      cfg.credit_accounts.filter(c => isAccountTrackedWeekly('credit', c.name) && isAccountIncludedInNet('credit', c.name)).forEach(c => predictedNet -= (weekCreditSnap[c.name] || 0));
    }

    const checkinCurrentAccounts = cfg.current_accounts.filter(acc => isFinalWeek || isAccountTrackedWeekly('current', acc));
    const checkinCreditAccounts = cfg.credit_accounts.filter(c => isFinalWeek || isAccountTrackedWeekly('credit', c.name));
    const checkinSavingsAccounts = cfg.track_savings ? cfg.savings_accounts.filter(s => isFinalWeek || isAccountTrackedWeekly('savings', s)) : [];

    let actCurrentSum = 0, actCreditSpentSum = 0, actSavingsSum = 0;
    let hasActualEntry = false;

    checkinCurrentAccounts.forEach(acc => {
      if (actuals[`curr_${acc}`] !== undefined && actuals[`curr_${acc}`] !== "" && actuals[`curr_${acc}`] !== null) {
        hasActualEntry = true;
        if (isAccountIncludedInNet('current', acc)) {
          actCurrentSum += parseFloat(actuals[`curr_${acc}`]) || 0;
        }
      } else if (isAccountIncludedInNet('current', acc)) {
        actCurrentSum += (weekCurrentSnap[acc] || 0);
      }
    });

    checkinCreditAccounts.forEach(c => {
      let cardSpent = 0;
      if (actuals[`c_avail_${c.name}`] !== undefined && actuals[`c_avail_${c.name}`] !== "") {
        cardSpent = (Number(c.limit) || 0) - (parseFloat(actuals[`c_avail_${c.name}`]) || 0);
        hasActualEntry = true;
      } else if (actuals[`c_spent_${c.name}`] !== undefined && actuals[`c_spent_${c.name}`] !== "") {
        cardSpent = parseFloat(actuals[`c_spent_${c.name}`]) || 0;
        hasActualEntry = true;
      } else {
        cardSpent = (weekCreditSnap[c.name] || 0);
      }
      if (isAccountIncludedInNet('credit', c.name)) {
        actCreditSpentSum += cardSpent;
      }
    });

    checkinSavingsAccounts.forEach(s => {
      if (actuals[`sav_${s}`] !== undefined && actuals[`sav_${s}`] !== "") {
        hasActualEntry = true;
        if (isAccountIncludedInNet('savings', s)) {
          actSavingsSum += parseFloat(actuals[`sav_${s}`]) || 0;
        }
      } else if (isAccountIncludedInNet('savings', s)) {
        actSavingsSum += (weekSavingsSnap[s] || 0);
      }
    });

    let actualNet = null, variance = null;
    if (hasActualEntry) {
      actualNet = actCurrentSum + actSavingsSum - actCreditSpentSum;
      variance = actualNet - predictedNet;
    }

    weeklyPredictions.push({
      wIdx,
      wObj,
      wSpend: wExpenseSum,
      wIncomeSum: wIncomeSum,
      wDDs: wDDs,
      wDDTotal: wDDTotal,
      wIncomes: wIncomes,
      wIncomeTotal: wIncomeTotal,
      autopaysDue: autopaysDue,
      weekCurrentSnap: weekCurrentSnap,
      weekCreditSnap: weekCreditSnap,
      weekSavingsSnap: weekSavingsSnap,
      sumWeekCurrent: sumWeekCurrent,
      sumWeekCredit: sumWeekCredit,
      sumWeekSavings: sumWeekSavings,
      predictedNet: predictedNet,
      actualNet: actualNet,
      variance: variance
    });
  });

  const finalWeekPred = weeklyPredictions.length > 0 ? weeklyPredictions[weeklyPredictions.length - 1] : { sumWeekCurrent: 0, sumWeekCredit: 0, sumWeekSavings: 0, predictedNet: 0, weekCurrentSnap: {}, weekCreditSnap: {}, weekSavingsSnap: {} };
  const projectedMonthEndCurrent = finalWeekPred.sumWeekCurrent;
  const projectedMonthEndCredit = finalWeekPred.sumWeekCredit;
  const projectedMonthEndSavings = finalWeekPred.sumWeekSavings;

  let projectedMonthEndNet = 0;
  cfg.current_accounts.filter(a => isAccountIncludedInNet('current', a)).forEach(a => projectedMonthEndNet += (finalWeekPred.weekCurrentSnap[a] || 0));
  if (cfg.track_savings) {
    cfg.savings_accounts.filter(s => isAccountIncludedInNet('savings', s)).forEach(s => projectedMonthEndNet += (finalWeekPred.weekSavingsSnap[s] || 0));
  }
  cfg.credit_accounts.filter(c => isAccountIncludedInNet('credit', c.name)).forEach(c => projectedMonthEndNet -= (finalWeekPred.weekCreditSnap[c.name] || 0));

  const projectedMonthEndTotalNet = projectedMonthEndCurrent + (cfg.track_savings ? projectedMonthEndSavings : 0) - projectedMonthEndCredit;
  const totalStartingTotalNet = totalCurrentOpening + (cfg.track_savings ? totalSavingsOpening : 0) - totalCreditOpeningSpent;

  const totalOutgoings = totalDD + totalWeeklySpend;
  const weeklyAvg = schedule.numWeeks > 0 ? totalWeeklySpend / schedule.numWeeks : 0;

  const totalAutoPayMonth = cfg.credit_accounts.reduce((sum, c) => {
    if (c.autopay_enabled) {
      const debt = Number(mData.credit_data[c.name] && mData.credit_data[c.name].opening_spent) || 0;
      return sum + (c.autopay_type === 'full' ? debt : Math.min(debt, Number(c.autopay_fixed_amt) || 0));
    }
    return sum;
  }, 0);

  let latestVariance = null;
  for (let i = weeklyPredictions.length - 1; i >= 0; i--) {
    if (weeklyPredictions[i].variance !== null) {
      latestVariance = weeklyPredictions[i].variance;
      break;
    }
  }

  // Detect current week info
  const now = new Date();
  let activeWeekIndex = -1;
  const detected = (typeof detectCurrentMonthAndWeek === 'function') ? detectCurrentMonthAndWeek(year) : null;
  const isCurrentMonth = (detected && detected.month === targetMonth);

  if (isCurrentMonth) {
    schedule.weeks.forEach((wObj, idx) => {
      const wEndInc = new Date(wObj.endDate.getFullYear(), wObj.endDate.getMonth(), wObj.endDate.getDate(), 23, 59, 59);
      if (now.getTime() >= wObj.startDate.getTime() && now.getTime() <= wEndInc.getTime()) {
        activeWeekIndex = idx;
      }
    });
    if (activeWeekIndex === -1 && detected && detected.week) {
      activeWeekIndex = schedule.weeks.findIndex(w => w.name === detected.week);
    }
  }

  // Cycle progress
  let cycleStart = schedule.weeks[0]?.startDate || new Date(year, mIdx, 1);
  let cycleEnd = schedule.weeks[schedule.weeks.length - 1]?.endDate || new Date(year, mIdx + 1, 0);
  let totalCycleDays = Math.max(1, Math.round((cycleEnd.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  let elapsedCycleDays = Math.max(0, Math.min(totalCycleDays, Math.round((now.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24)) + 1));
  let percentElapsed = Math.min(100, Math.max(0, Math.round((elapsedCycleDays / totalCycleDays) * 100)));

  return {
    month: targetMonth,
    year,
    schedule,
    mData,
    deducts,
    personTotals,
    totalCurrentInflow,
    totalSalarySavingsIn,
    totalDD,
    totalMonthPaymentsIn,
    totalWeeklySpend,
    totalWeeklyCurrentSpend,
    totalCurrentOpening,
    totalCreditOpeningSpent,
    totalCreditLimit,
    totalSavingsOpening,
    autoSavingsFromDD,
    weeklyPredictions,
    projectedMonthEndCurrent,
    projectedMonthEndCredit,
    projectedMonthEndSavings,
    projectedMonthEndNet,
    projectedMonthEndTotalNet,
    totalStartingTotalNet,
    totalOutgoings,
    weeklyAvg,
    totalAutoPayMonth,
    latestVariance,
    isCurrentMonth,
    activeWeekIndex,
    cycleStart,
    cycleEnd,
    totalCycleDays,
    elapsedCycleDays,
    percentElapsed
  };
}

if (typeof window !== 'undefined') {
  window.calculateLiveDailyPacing = calculateLiveDailyPacing;
  window.SPEND_CATEGORIES = SPEND_CATEGORIES;
  window.getCategoryById = getCategoryById;
  window.categorizeTransaction = categorizeTransaction;
  window.calculateCategoryBreakdown = calculateCategoryBreakdown;
  window.calculateMonthForecast = calculateMonthForecast;
}
