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
      const openingDebt = Number(md.credit_data && md.credit_data[c.name] && md.credit_data[c.name].opening_spent) || 0;
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
      let bal = (md.current_data && md.current_data[acc]) ? (Number(md.current_data[acc].opening) || 0) : 0;
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
        const items = (md.weekly_items && md.weekly_items[wObj.name]) || [];
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
      let spent = (md.credit_data && md.credit_data[c.name]) ? (Number(md.credit_data[c.name].opening_spent) || 0) : 0;
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
        const items = (md.weekly_items && md.weekly_items[wObj.name]) || [];
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
    const s = (md.savings_data && md.savings_data[acc]) ? md.savings_data[acc] : { opening: 0 };
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
      const items = (md.weekly_items && md.weekly_items[wObj.name]) || [];
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
  const currentAccounts = cfg.current_accounts || [];
  const creditAccounts = cfg.credit_accounts || [];
  const savingsAccounts = cfg.savings_accounts || [];

  for (let i = 0; i < months.length - 1; i++) {
    const curMonthName = months[i];
    const nextMonthName = months[i + 1];
    const closing = computeMonthClosing(curMonthName, i, year);
    const nextMonthData = getMonthData(nextMonthName, year);

    if (!nextMonthData.current_data) nextMonthData.current_data = {};
    if (!nextMonthData.credit_data) nextMonthData.credit_data = {};
    if (!nextMonthData.savings_data) nextMonthData.savings_data = {};

    currentAccounts.forEach(acc => {
      if (!nextMonthData.current_data[acc]) nextMonthData.current_data[acc] = {};
      if (!nextMonthData.current_data[acc].user_edited) {
        nextMonthData.current_data[acc].opening = (closing.current && closing.current[acc] !== undefined) ? closing.current[acc] : 0;
      }
    });

    creditAccounts.forEach(c => {
      const cName = c && c.name ? c.name : c;
      if (!cName) return;
      if (!nextMonthData.credit_data[cName]) nextMonthData.credit_data[cName] = {};
      if (!nextMonthData.credit_data[cName].user_edited) {
        nextMonthData.credit_data[cName].opening_spent = (closing.credit && closing.credit[cName] !== undefined) ? closing.credit[cName] : 0;
      }
    });

    savingsAccounts.forEach(acc => {
      if (!nextMonthData.savings_data[acc]) nextMonthData.savings_data[acc] = {};
      if (!nextMonthData.savings_data[acc].user_edited) {
        nextMonthData.savings_data[acc].opening = (closing.savings && closing.savings[acc] !== undefined) ? closing.savings[acc] : 0;
      }
    });
  }

  // December -> Next Year January Rollover (if next year exists)
  const nextYearNum = parseInt(year, 10) + 1;
  const nextYearStr = String(nextYearNum);
  if (appState.data && appState.data.years && appState.data.years[nextYearStr]) {
    const decClosing = computeMonthClosing('Dec', 11, year);
    const janNextData = getMonthData('Jan', nextYearNum);

    if (!janNextData.current_data) janNextData.current_data = {};
    if (!janNextData.credit_data) janNextData.credit_data = {};
    if (!janNextData.savings_data) janNextData.savings_data = {};

    currentAccounts.forEach(acc => {
      if (!janNextData.current_data[acc]) janNextData.current_data[acc] = {};
      if (!janNextData.current_data[acc].user_edited) {
        janNextData.current_data[acc].opening = (decClosing.current && decClosing.current[acc] !== undefined) ? decClosing.current[acc] : 0;
      }
    });

    creditAccounts.forEach(c => {
      const cName = c && c.name ? c.name : c;
      if (!cName) return;
      if (!janNextData.credit_data[cName]) janNextData.credit_data[cName] = {};
      if (!janNextData.credit_data[cName].user_edited) {
        janNextData.credit_data[cName].opening_spent = (decClosing.credit && decClosing.credit[cName] !== undefined) ? decClosing.credit[cName] : 0;
      }
    });

    savingsAccounts.forEach(acc => {
      if (!janNextData.savings_data[acc]) janNextData.savings_data[acc] = {};
      if (!janNextData.savings_data[acc].user_edited) {
        janNextData.savings_data[acc].opening = (decClosing.savings && decClosing.savings[acc] !== undefined) ? decClosing.savings[acc] : 0;
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

export function detectBudgetCategory(name) {
  if (!name) return null;
  const n = String(name).toLowerCase();
  if (n.includes('holiday') || n.includes('trip') || n.includes('vacation') || n.includes('flight') || n.includes('hotel') || n.includes('euro') || n.includes('spain') || n.includes('greece') || n.includes('cotswold') || n.includes('getaway') || n.includes('weekend away') || n.includes('lodge') || n.includes('resort') || n.includes('travel') || n.includes('airbnb') || n.includes('booking')) {
    return 'travel';
  }
  if (n.includes('christmas') || n.includes('xmas') || n.includes('birthday') || n.includes('bday') || n.includes('present') || n.includes('gift') || n.includes('wedding') || n.includes('anniversary') || n.includes('baby shower')) {
    return 'gifts';
  }
  if (n.includes('car') || n.includes('mot') || n.includes('tyre') || n.includes('tire') || n.includes('service') || n.includes('vehicle') || n.includes('brake') || n.includes('mechanic') || n.includes('clutch')) {
    return 'transport';
  }
  if (n.includes('garden') || n.includes('diy') || n.includes('renovation') || n.includes('decorat') || n.includes('furniture') || n.includes('shed') || n.includes('fence') || n.includes('patio') || n.includes('kitchen') || n.includes('bathroom') || n.includes('home improvement')) {
    return 'shopping';
  }
  if (n.includes('concert') || n.includes('festival') || n.includes('theatre') || n.includes('theater') || n.includes('gig') || n.includes('event') || n.includes('party') || n.includes('show') || n.includes('tickets')) {
    return 'entertainment';
  }
  return null;
}

if (typeof window !== 'undefined') {
  window.detectBudgetCategory = detectBudgetCategory;
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
        const bCat = bObj.category || detectBudgetCategory(bObj.name);
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
            cleared_dates: bTxn.cleared_dates || [],
            budget_category: bCat || detectBudgetCategory(bTxn.desc)
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
            cleared_dates: bTxn.cleared_dates || [],
            budget_category: 'gifts'
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
            t.matched_bill_type = coll.type;
            if (b.budget_category) {
              t.matched_budget_category = b.budget_category;
            }
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

export let SPEND_CATEGORIES = [{"id": "groceries", "label": "Supermarket & Groceries", "icon": "🛒", "color": "#10b981", "keywords": ["a.f. blakemore", "abel & cole", "abel and cole", "al-halal supermarket", "al-noor supermarket", "albert heijn", "albert heijn to go", "albertsons", "alcampo", "aldi", "aldi stores", "aldi sud", "aldi supermarket", "aldi uk", "aldi us", "allied bakeries", "allplants", "amathus drinks", "amathus wine", "amazon fresh", "amazon grocery", "appleby westward", "approved food", "asda", "asda express", "asda groceries", "asda home shopping", "asda on the move", "asda store", "asda supercentre", "asda superstore", "asda superstore aberdeen", "asda superstore ayr", "asda superstore bangor", "asda superstore barnsley", "asda superstore basildon", "asda superstore basingstoke", "asda superstore bath", "asda superstore belfast", "asda superstore birkenhead", "asda superstore birmingham", "asda superstore blackburn", "asda superstore blackpool", "asda superstore bournemouth", "asda superstore bradford", "asda superstore bridgend", "asda superstore brighton", "asda superstore bristol", "asda superstore burton", "asda superstore cambridge", "asda superstore cardiff", "asda superstore carlisle", "asda superstore chelmsford", "asda superstore cheltenham", "asda superstore chester", "asda superstore chichester", "asda superstore colchester", "asda superstore coventry", "asda superstore crawley", "asda superstore crewe", "asda superstore cumbernauld", "asda superstore darlington", "asda superstore derby", "asda superstore doncaster", "asda superstore dumfries", "asda superstore dundee", "asda superstore dunfermline", "asda superstore durham", "asda superstore east kilbride", "asda superstore eastbourne", "asda superstore edinburgh", "asda superstore exeter", "asda superstore falkirk", "asda superstore glasgow", "asda superstore gloucester", "asda superstore grimsby", "asda superstore guildford", "asda superstore halifax", "asda superstore hamilton", "asda superstore harrogate", "asda superstore hartlepool", "asda superstore hastings", "asda superstore hereford", "asda superstore huddersfield", "asda superstore hull", "asda superstore inverness", "asda superstore ipswich", "asda superstore kilmarnock", "asda superstore kirkcaldy", "asda superstore lancaster", "asda superstore leamington spa", "asda superstore leeds", "asda superstore leicester", "asda superstore lincoln", "asda superstore liverpool", "asda superstore livingston", "asda superstore london", "asda superstore loughborough", "asda superstore luton", "asda superstore maidstone", "asda superstore manchester", "asda superstore middlesbrough", "asda superstore milton keynes", "asda superstore newcastle", "asda superstore newport", "asda superstore northampton", "asda superstore norwich", "asda superstore nottingham", "asda superstore nuneaton", "asda superstore oxford", "asda superstore paisley", "asda superstore perth", "asda superstore peterborough", "asda superstore plymouth", "asda superstore poole", "asda superstore portsmouth", "asda superstore preston", "asda superstore reading", "asda superstore redditch", "asda superstore rotherham", "asda superstore rugby", "asda superstore salford", "asda superstore salisbury", "asda superstore scunthorpe", "asda superstore sheffield", "asda superstore shrewsbury", "asda superstore slough", "asda superstore solihull", "asda superstore southampton", "asda superstore southport", "asda superstore st albans", "asda superstore st helens", "asda superstore stafford", "asda superstore stirling", "asda superstore stoke", "asda superstore sunderland", "asda superstore swansea", "asda superstore swindon", "asda superstore tamworth", "asda superstore taunton", "asda superstore telford", "asda superstore torquay", "asda superstore wakefield", "asda superstore watford", "asda superstore westminster", "asda superstore weymouth", "asda superstore winchester", "asda superstore wolverhampton", "asda superstore worcester", "asda superstore worthing", "asda superstore wrexham", "asda superstore york", "asda.com", "asian supermarket", "auchan", "bargain booze", "bargain booze plus", "batleys cash & carry", "bayne's the family bakers", "beer 52", "beer hawk", "beer52", "berry bros & rudd", "berry brothers", "best one express", "best-one", "bestway cash & carry", "bestway wholesale", "biedronka uk", "birds bakery", "blackface meat company", "blakemore spar", "blakemore wholesale", "booker", "booker cash & carry", "booker cash and carry", "booker wholesale", "booths", "booths supermarket", "booze buster", "bottle club", "brigg convenience stor", "brigg convenience store", "budgens", "budgens local", "budgens supermarket", "butcher", "carrefour", "carrefour express", "carrefour market", "casino supermarche", "centra", "central england co-op", "channel islands co-op", "cheddar gorge", "chelmsford star co-op", "chongie market", "cj lang", "ck's supermarket", "clapton craft", "co-op", "co-op food", "co-op food aberdeen", "co-op food ayr", "co-op food bangor", "co-op food barnsley", "co-op food basildon", "co-op food basingstoke", "co-op food bath", "co-op food belfast", "co-op food birkenhead", "co-op food birmingham", "co-op food blackburn", "co-op food blackpool", "co-op food bournemouth", "co-op food bradford", "co-op food bridgend", "co-op food brighton", "co-op food bristol", "co-op food burton", "co-op food cambridge", "co-op food cardiff", "co-op food carlisle", "co-op food chelmsford", "co-op food cheltenham", "co-op food chester", "co-op food chichester", "co-op food colchester", "co-op food coventry", "co-op food crawley", "co-op food crewe", "co-op food cumbernauld", "co-op food darlington", "co-op food derby", "co-op food doncaster", "co-op food dumfries", "co-op food dundee", "co-op food dunfermline", "co-op food durham", "co-op food east kilbride", "co-op food eastbourne", "co-op food edinburgh", "co-op food exeter", "co-op food falkirk", "co-op food glasgow", "co-op food gloucester", "co-op food grimsby", "co-op food guildford", "co-op food halifax", "co-op food hamilton", "co-op food harrogate", "co-op food hartlepool", "co-op food hastings", "co-op food hereford", "co-op food huddersfield", "co-op food hull", "co-op food inverness", "co-op food ipswich", "co-op food kilmarnock", "co-op food kirkcaldy", "co-op food lancaster", "co-op food leamington spa", "co-op food leeds", "co-op food leicester", "co-op food lincoln", "co-op food liverpool", "co-op food livingston", "co-op food london", "co-op food loughborough", "co-op food luton", "co-op food maidstone", "co-op food manchester", "co-op food middlesbrough", "co-op food milton keynes", "co-op food newcastle", "co-op food newport", "co-op food northampton", "co-op food norwich", "co-op food nottingham", "co-op food nuneaton", "co-op food oxford", "co-op food paisley", "co-op food perth", "co-op food peterborough", "co-op food plymouth", "co-op food poole", "co-op food portsmouth", "co-op food preston", "co-op food reading", "co-op food redditch", "co-op food rotherham", "co-op food rugby", "co-op food salford", "co-op food salisbury", "co-op food scunthorpe", "co-op food sheffield", "co-op food shrewsbury", "co-op food slough", "co-op food solihull", "co-op food southampton", "co-op food southport", "co-op food st albans", "co-op food st helens", "co-op food stafford", "co-op food stirling", "co-op food stoke", "co-op food sunderland", "co-op food swansea", "co-op food swindon", "co-op food tamworth", "co-op food taunton", "co-op food telford", "co-op food torquay", "co-op food wakefield", "co-op food watford", "co-op food westminster", "co-op food weymouth", "co-op food winchester", "co-op food wolverhampton", "co-op food worcester", "co-op food worthing", "co-op food wrexham", "co-op food york", "co-op local", "co-operative food", "coles supermarket", "conad", "consum supermercados", "continente supermercados", "convenience stor", "convenience store", "coop", "coop food", "coop local", "coop schweiz", "cooplands bakery", "cornish fishmonger", "costco", "costco uk", "costco warehouse", "costco wholesale", "costco.co.uk", "costcutter", "costcutter local", "costcutter supermarket", "cotteswold dairy", "coughlans bakery", "craft metropolis", "creamline dairies", "damas gate", "day to day express", "day-today", "daylesford farm", "daylesford organic", "deli & farm shop", "delicatessen", "deliveroo hop", "denner", "dhamecha cash and carry", "dhamecha wholesale", "dia supermercados", "dino market", "distillers", "dobbies foodhall", "donald russell", "drings butchers", "drinkers paradise", "drinks direct", "drinksupermarket", "dunnes stores food", "e.leclerc", "east of england co-op", "edeka", "edeka markt", "eh booths", "el corte ingles supermercado", "eroski", "esselunga", "euro shopper", "family butcher", "family butchers", "family shopper", "fancy delivery", "fareway stores", "farm shop", "farm shop & deli", "farm shop and cafe", "farmfoods", "farmfoods frozen", "farmison", "farmison & co", "feast box", "field & flower", "filco supermarkets", "filshill wholesale", "fish society", "fishmonger", "flavourly", "flavourly.com", "food lion", "food warehouse by iceland", "franprix", "fresh fishmonger", "fulton's foods", "fultons foods", "getir", "ghost whale", "giant eagle", "giant food", "ginger pig butchers", "gloucester services farmshop", "gopuff", "gorillas app", "gousto", "gousto meals", "graham's the family dairy", "grahams dairy", "green valley lebanese", "greengrocer", "grocer", "grocery", "grocery outlet", "h mart", "h-e-b", "h-mart london", "halal butcher", "halal food direct", "hannaford", "hannaford supermarket", "happy shopper", "harris teeter", "heart of england co-op", "heb grocery", "hello fresh uk", "hellofresh", "heron foods", "honest brew", "hoo hing", "hoo hing commercial", "hop burns & black", "house of malt", "hovis", "hy-vee", "iceland", "iceland foods", "iceland supermarket", "iceland.co.uk", "iga supermarkets", "intermarche", "intermarché", "ipercoop", "james hall spar", "james whelan butchers", "japan centre", "japan centre ichiba", "jempson's", "jempsons local", "jewel-osco", "jisp", "jumbo supermarkten", "kashmir bazaar", "kaufland", "keystore", "keystore more", "king soopers", "kingsmill", "korea foods", "kosher deli", "kosher kingdom", "kosher outlet", "kroger", "kroger supermarket", "laithwaites", "laithwaites wine", "leclerc", "lidl", "lidl gb", "lidl plus", "lidl supermarket", "lidl uk", "lidl us", "lincolnshire co-op", "lincolnshire cooperative", "little waitrose", "lnk cooperative", "loblaws", "local farm shop", "local greengrocer", "local off licence", "londis", "londis local", "londis store", "londis supermarket", "longdan", "longdan supermarket", "loon fung", "loon fung supermarket", "m & s", "m&s food", "m&s foodhall", "m&s foodhall aberdeen", "m&s foodhall ayr", "m&s foodhall bangor", "m&s foodhall barnsley", "m&s foodhall basildon", "m&s foodhall basingstoke", "m&s foodhall bath", "m&s foodhall belfast", "m&s foodhall birkenhead", "m&s foodhall birmingham", "m&s foodhall blackburn", "m&s foodhall blackpool", "m&s foodhall bournemouth", "m&s foodhall bradford", "m&s foodhall bridgend", "m&s foodhall brighton", "m&s foodhall bristol", "m&s foodhall burton", "m&s foodhall cambridge", "m&s foodhall cardiff", "m&s foodhall carlisle", "m&s foodhall chelmsford", "m&s foodhall cheltenham", "m&s foodhall chester", "m&s foodhall chichester", "m&s foodhall colchester", "m&s foodhall coventry", "m&s foodhall crawley", "m&s foodhall crewe", "m&s foodhall cumbernauld", "m&s foodhall darlington", "m&s foodhall derby", "m&s foodhall doncaster", "m&s foodhall dumfries", "m&s foodhall dundee", "m&s foodhall dunfermline", "m&s foodhall durham", "m&s foodhall east kilbride", "m&s foodhall eastbourne", "m&s foodhall edinburgh", "m&s foodhall exeter", "m&s foodhall falkirk", "m&s foodhall glasgow", "m&s foodhall gloucester", "m&s foodhall grimsby", "m&s foodhall guildford", "m&s foodhall halifax", "m&s foodhall hamilton", "m&s foodhall harrogate", "m&s foodhall hartlepool", "m&s foodhall hastings", "m&s foodhall hereford", "m&s foodhall huddersfield", "m&s foodhall hull", "m&s foodhall inverness", "m&s foodhall ipswich", "m&s foodhall kilmarnock", "m&s foodhall kirkcaldy", "m&s foodhall lancaster", "m&s foodhall leamington spa", "m&s foodhall leeds", "m&s foodhall leicester", "m&s foodhall lincoln", "m&s foodhall liverpool", "m&s foodhall livingston", "m&s foodhall london", "m&s foodhall loughborough", "m&s foodhall luton", "m&s foodhall maidstone", "m&s foodhall manchester", "m&s foodhall middlesbrough", "m&s foodhall milton keynes", "m&s foodhall newcastle", "m&s foodhall newport", "m&s foodhall northampton", "m&s foodhall norwich", "m&s foodhall nottingham", "m&s foodhall nuneaton", "m&s foodhall oxford", "m&s foodhall paisley", "m&s foodhall perth", "m&s foodhall peterborough", "m&s foodhall plymouth", "m&s foodhall poole", "m&s foodhall portsmouth", "m&s foodhall preston", "m&s foodhall reading", "m&s foodhall redditch", "m&s foodhall rotherham", "m&s foodhall rugby", "m&s foodhall salford", "m&s foodhall salisbury", "m&s foodhall scunthorpe", "m&s foodhall sheffield", "m&s foodhall shrewsbury", "m&s foodhall slough", "m&s foodhall solihull", "m&s foodhall southampton", "m&s foodhall southport", "m&s foodhall st albans", "m&s foodhall st helens", "m&s foodhall stafford", "m&s foodhall stirling", "m&s foodhall stoke", "m&s foodhall sunderland", "m&s foodhall swansea", "m&s foodhall swindon", "m&s foodhall tamworth", "m&s foodhall taunton", "m&s foodhall telford", "m&s foodhall torquay", "m&s foodhall wakefield", "m&s foodhall watford", "m&s foodhall westminster", "m&s foodhall weymouth", "m&s foodhall winchester", "m&s foodhall wolverhampton", "m&s foodhall worcester", "m&s foodhall worthing", "m&s foodhall wrexham", "m&s foodhall york", "m&s simply food", "mace express", "mace store", "magazin romanesc", "majestic wine", "majestic wine warehouses", "majestic.co.uk", "makro", "makro cash & carry", "makro cash and carry", "marks & spencer food", "marks & spencer foodhall", "marks and spencer food", "marks and spencer simply food", "master butcher", "master of malt", "mckeowns dairies", "mcqueens dairies", "meijer", "meijer supercenter", "mercadona", "metro inc", "midcounties co-op", "migros", "milk & more", "milk and more", "mindful chef", "modern milkman", "monoprix", "morrison", "morrisons", "morrisons daily", "morrisons daily aberdeen", "morrisons daily ayr", "morrisons daily bangor", "morrisons daily barnsley", "morrisons daily basildon", "morrisons daily basingstoke", "morrisons daily bath", "morrisons daily belfast", "morrisons daily birkenhead", "morrisons daily birmingham", "morrisons daily blackburn", "morrisons daily blackpool", "morrisons daily bournemouth", "morrisons daily bradford", "morrisons daily bridgend", "morrisons daily brighton", "morrisons daily bristol", "morrisons daily burton", "morrisons daily cambridge", "morrisons daily cardiff", "morrisons daily carlisle", "morrisons daily chelmsford", "morrisons daily cheltenham", "morrisons daily chester", "morrisons daily chichester", "morrisons daily colchester", "morrisons daily coventry", "morrisons daily crawley", "morrisons daily crewe", "morrisons daily cumbernauld", "morrisons daily darlington", "morrisons daily derby", "morrisons daily doncaster", "morrisons daily dumfries", "morrisons daily dundee", "morrisons daily dunfermline", "morrisons daily durham", "morrisons daily east kilbride", "morrisons daily eastbourne", "morrisons daily edinburgh", "morrisons daily exeter", "morrisons daily falkirk", "morrisons daily glasgow", "morrisons daily gloucester", "morrisons daily grimsby", "morrisons daily guildford", "morrisons daily halifax", "morrisons daily hamilton", "morrisons daily harrogate", "morrisons daily hartlepool", "morrisons daily hastings", "morrisons daily hereford", "morrisons daily huddersfield", "morrisons daily hull", "morrisons daily inverness", "morrisons daily ipswich", "morrisons daily kilmarnock", "morrisons daily kirkcaldy", "morrisons daily lancaster", "morrisons daily leamington spa", "morrisons daily leeds", "morrisons daily leicester", "morrisons daily lincoln", "morrisons daily liverpool", "morrisons daily livingston", "morrisons daily london", "morrisons daily loughborough", "morrisons daily luton", "morrisons daily maidstone", "morrisons daily manchester", "morrisons daily middlesbrough", "morrisons daily milton keynes", "morrisons daily newcastle", "morrisons daily newport", "morrisons daily northampton", "morrisons daily norwich", "morrisons daily nottingham", "morrisons daily nuneaton", "morrisons daily oxford", "morrisons daily paisley", "morrisons daily perth", "morrisons daily peterborough", "morrisons daily plymouth", "morrisons daily poole", "morrisons daily portsmouth", "morrisons daily preston", "morrisons daily reading", "morrisons daily redditch", "morrisons daily rotherham", "morrisons daily rugby", "morrisons daily salford", "morrisons daily salisbury", "morrisons daily scunthorpe", "morrisons daily sheffield", "morrisons daily shrewsbury", "morrisons daily slough", "morrisons daily solihull", "morrisons daily southampton", "morrisons daily southport", "morrisons daily st albans", "morrisons daily st helens", "morrisons daily stafford", "morrisons daily stirling", "morrisons daily stoke", "morrisons daily sunderland", "morrisons daily swansea", "morrisons daily swindon", "morrisons daily tamworth", "morrisons daily taunton", "morrisons daily telford", "morrisons daily torquay", "morrisons daily wakefield", "morrisons daily watford", "morrisons daily westminster", "morrisons daily weymouth", "morrisons daily winchester", "morrisons daily wolverhampton", "morrisons daily worcester", "morrisons daily worthing", "morrisons daily wrexham", "morrisons daily york", "morrisons grocery", "morrisons online", "morrisons store", "morrisons supermarket", "morrisons.com", "muscle food", "musclefood", "naked wines", "nakedwines.com", "netto marken-discount", "nisa", "nisa extra", "nisa local", "nisa retail", "nisa today", "no frills supermarket", "ocado", "ocado retail", "ocado zoom", "ocado.com", "oddbins", "oddbins wine", "off licence", "one stop", "one stop local", "one stop shop", "one stop stores", "organic farm shop", "oriental supermarket", "oseyo", "oseyo supermarket", "pak foods", "pam panorama", "pancosma", "parfetts cash & carry", "pasta evangelists", "patel brothers", "penny markt", "percy ingle", "piggly wiggly", "pingo doce", "pipers farm", "plus supermarkt", "polish deli", "polski sklep", "poundbakery", "premier", "premier convenience", "premier express", "premier local", "premier off licence", "premier stores", "proudfoot supermarkets", "provision", "publix", "publix super markets", "punjab groceries", "quality butchers", "ralphs grocery", "real canadian superstore", "rewe", "rewe city", "rhug estate farm shop", "riverford", "riverford organic", "rockfish seafood", "romanian store", "roys", "roys of wrexham", "roys of wroxham", "safeway", "safeway store", "sainsbury", "sainsbury s/mkts", "sainsbury's", "sainsbury's local", "sainsbury's store", "sainsbury's supermarket", "sainsburys", "sainsburys local", "sainsburys local aberdeen", "sainsburys local ayr", "sainsburys local bangor", "sainsburys local barnsley", "sainsburys local basildon", "sainsburys local basingstoke", "sainsburys local bath", "sainsburys local belfast", "sainsburys local birkenhead", "sainsburys local birmingham", "sainsburys local blackburn", "sainsburys local blackpool", "sainsburys local bournemouth", "sainsburys local bradford", "sainsburys local bridgend", "sainsburys local brighton", "sainsburys local bristol", "sainsburys local burton", "sainsburys local cambridge", "sainsburys local cardiff", "sainsburys local carlisle", "sainsburys local chelmsford", "sainsburys local cheltenham", "sainsburys local chester", "sainsburys local chichester", "sainsburys local colchester", "sainsburys local coventry", "sainsburys local crawley", "sainsburys local crewe", "sainsburys local cumbernauld", "sainsburys local darlington", "sainsburys local derby", "sainsburys local doncaster", "sainsburys local dumfries", "sainsburys local dundee", "sainsburys local dunfermline", "sainsburys local durham", "sainsburys local east kilbride", "sainsburys local eastbourne", "sainsburys local edinburgh", "sainsburys local exeter", "sainsburys local falkirk", "sainsburys local glasgow", "sainsburys local gloucester", "sainsburys local grimsby", "sainsburys local guildford", "sainsburys local halifax", "sainsburys local hamilton", "sainsburys local harrogate", "sainsburys local hartlepool", "sainsburys local hastings", "sainsburys local hereford", "sainsburys local huddersfield", "sainsburys local hull", "sainsburys local inverness", "sainsburys local ipswich", "sainsburys local kilmarnock", "sainsburys local kirkcaldy", "sainsburys local lancaster", "sainsburys local leamington spa", "sainsburys local leeds", "sainsburys local leicester", "sainsburys local lincoln", "sainsburys local liverpool", "sainsburys local livingston", "sainsburys local london", "sainsburys local loughborough", "sainsburys local luton", "sainsburys local maidstone", "sainsburys local manchester", "sainsburys local middlesbrough", "sainsburys local milton keynes", "sainsburys local newcastle", "sainsburys local newport", "sainsburys local northampton", "sainsburys local norwich", "sainsburys local nottingham", "sainsburys local nuneaton", "sainsburys local oxford", "sainsburys local paisley", "sainsburys local perth", "sainsburys local peterborough", "sainsburys local plymouth", "sainsburys local poole", "sainsburys local portsmouth", "sainsburys local preston", "sainsburys local reading", "sainsburys local redditch", "sainsburys local rotherham", "sainsburys local rugby", "sainsburys local salford", "sainsburys local salisbury", "sainsburys local scunthorpe", "sainsburys local sheffield", "sainsburys local shrewsbury", "sainsburys local slough", "sainsburys local solihull", "sainsburys local southampton", "sainsburys local southport", "sainsburys local st albans", "sainsburys local st helens", "sainsburys local stafford", "sainsburys local stirling", "sainsburys local stoke", "sainsburys local sunderland", "sainsburys local swansea", "sainsburys local swindon", "sainsburys local tamworth", "sainsburys local taunton", "sainsburys local telford", "sainsburys local torquay", "sainsburys local wakefield", "sainsburys local watford", "sainsburys local westminster", "sainsburys local weymouth", "sainsburys local winchester", "sainsburys local wolverhampton", "sainsburys local worcester", "sainsburys local worthing", "sainsburys local wrexham", "sainsburys local york", "sainsburys s/mkts", "sainsburys s/mkts aberdeen", "sainsburys s/mkts ayr", "sainsburys s/mkts bangor", "sainsburys s/mkts barnsley", "sainsburys s/mkts basildon", "sainsburys s/mkts basingstoke", "sainsburys s/mkts bath", "sainsburys s/mkts belfast", "sainsburys s/mkts birkenhead", "sainsburys s/mkts birmingham", "sainsburys s/mkts blackburn", "sainsburys s/mkts blackpool", "sainsburys s/mkts bournemouth", "sainsburys s/mkts bradford", "sainsburys s/mkts bridgend", "sainsburys s/mkts brighton", "sainsburys s/mkts bristol", "sainsburys s/mkts burton", "sainsburys s/mkts cambridge", "sainsburys s/mkts cardiff", "sainsburys s/mkts carlisle", "sainsburys s/mkts chelmsford", "sainsburys s/mkts cheltenham", "sainsburys s/mkts chester", "sainsburys s/mkts chichester", "sainsburys s/mkts colchester", "sainsburys s/mkts coventry", "sainsburys s/mkts crawley", "sainsburys s/mkts crewe", "sainsburys s/mkts cumbernauld", "sainsburys s/mkts darlington", "sainsburys s/mkts derby", "sainsburys s/mkts doncaster", "sainsburys s/mkts dumfries", "sainsburys s/mkts dundee", "sainsburys s/mkts dunfermline", "sainsburys s/mkts durham", "sainsburys s/mkts east kilbride", "sainsburys s/mkts eastbourne", "sainsburys s/mkts edinburgh", "sainsburys s/mkts exeter", "sainsburys s/mkts falkirk", "sainsburys s/mkts glasgow", "sainsburys s/mkts gloucester", "sainsburys s/mkts grimsby", "sainsburys s/mkts guildford", "sainsburys s/mkts halifax", "sainsburys s/mkts hamilton", "sainsburys s/mkts harrogate", "sainsburys s/mkts hartlepool", "sainsburys s/mkts hastings", "sainsburys s/mkts hereford", "sainsburys s/mkts huddersfield", "sainsburys s/mkts hull", "sainsburys s/mkts inverness", "sainsburys s/mkts ipswich", "sainsburys s/mkts kilmarnock", "sainsburys s/mkts kirkcaldy", "sainsburys s/mkts lancaster", "sainsburys s/mkts leamington spa", "sainsburys s/mkts leeds", "sainsburys s/mkts leicester", "sainsburys s/mkts lincoln", "sainsburys s/mkts liverpool", "sainsburys s/mkts livingston", "sainsburys s/mkts london", "sainsburys s/mkts loughborough", "sainsburys s/mkts luton", "sainsburys s/mkts maidstone", "sainsburys s/mkts manchester", "sainsburys s/mkts middlesbrough", "sainsburys s/mkts milton keynes", "sainsburys s/mkts newcastle", "sainsburys s/mkts newport", "sainsburys s/mkts northampton", "sainsburys s/mkts norwich", "sainsburys s/mkts nottingham", "sainsburys s/mkts nuneaton", "sainsburys s/mkts oxford", "sainsburys s/mkts paisley", "sainsburys s/mkts perth", "sainsburys s/mkts peterborough", "sainsburys s/mkts plymouth", "sainsburys s/mkts poole", "sainsburys s/mkts portsmouth", "sainsburys s/mkts preston", "sainsburys s/mkts reading", "sainsburys s/mkts redditch", "sainsburys s/mkts rotherham", "sainsburys s/mkts rugby", "sainsburys s/mkts salford", "sainsburys s/mkts salisbury", "sainsburys s/mkts scunthorpe", "sainsburys s/mkts sheffield", "sainsburys s/mkts shrewsbury", "sainsburys s/mkts slough", "sainsburys s/mkts solihull", "sainsburys s/mkts southampton", "sainsburys s/mkts southport", "sainsburys s/mkts st albans", "sainsburys s/mkts st helens", "sainsburys s/mkts stafford", "sainsburys s/mkts stirling", "sainsburys s/mkts stoke", "sainsburys s/mkts sunderland", "sainsburys s/mkts swansea", "sainsburys s/mkts swindon", "sainsburys s/mkts tamworth", "sainsburys s/mkts taunton", "sainsburys s/mkts telford", "sainsburys s/mkts torquay", "sainsburys s/mkts wakefield", "sainsburys s/mkts watford", "sainsburys s/mkts westminster", "sainsburys s/mkts weymouth", "sainsburys s/mkts winchester", "sainsburys s/mkts wolverhampton", "sainsburys s/mkts worcester", "sainsburys s/mkts worthing", "sainsburys s/mkts wrexham", "sainsburys s/mkts york", "sainsburys store", "sainsburys supermarket", "sainsburys.co.uk", "save a lot", "sayers the bakers", "scotmid", "scotmid co-op", "seewoo", "seewoo supermarket", "select convenience", "shaw's supermarket", "shoprite", "simmons bakers", "simply cook", "simplycook", "sing kee", "sing kee oriental", "smart & final", "snappy shopper", "sobeys", "southern co-op", "spar", "spar aberdeen", "spar ayr", "spar bangor", "spar barnsley", "spar basildon", "spar basingstoke", "spar bath", "spar belfast", "spar birkenhead", "spar birmingham", "spar blackburn", "spar blackpool", "spar bournemouth", "spar bradford", "spar bridgend", "spar brighton", "spar bristol", "spar burton", "spar cambridge", "spar cardiff", "spar carlisle", "spar chelmsford", "spar cheltenham", "spar chester", "spar chichester", "spar colchester", "spar coventry", "spar crawley", "spar crewe", "spar cumbernauld", "spar daily", "spar darlington", "spar derby", "spar doncaster", "spar dumfries", "spar dundee", "spar dunfermline", "spar durham", "spar east kilbride", "spar eastbourne", "spar edinburgh", "spar exeter", "spar express", "spar falkirk", "spar glasgow", "spar gloucester", "spar grimsby", "spar guildford", "spar halifax", "spar hamilton", "spar harrogate", "spar hartlepool", "spar hastings", "spar hereford", "spar huddersfield", "spar hull", "spar inverness", "spar ipswich", "spar kilmarnock", "spar kirkcaldy", "spar lancaster", "spar leamington spa", "spar leeds", "spar leicester", "spar lincoln", "spar liverpool", "spar livingston", "spar local", "spar london", "spar loughborough", "spar luton", "spar maidstone", "spar manchester", "spar middlesbrough", "spar milton keynes", "spar newcastle", "spar newport", "spar northampton", "spar norwich", "spar nottingham", "spar nuneaton", "spar oxford", "spar paisley", "spar perth", "spar peterborough", "spar plymouth", "spar poole", "spar portsmouth", "spar preston", "spar reading", "spar redditch", "spar rotherham", "spar rugby", "spar salford", "spar salisbury", "spar scunthorpe", "spar sheffield", "spar shrewsbury", "spar slough", "spar solihull", "spar southampton", "spar southport", "spar st albans", "spar st helens", "spar stafford", "spar stirling", "spar stoke", "spar store", "spar sunderland", "spar supermarket", "spar swansea", "spar swindon", "spar tamworth", "spar taunton", "spar telford", "spar torquay", "spar wakefield", "spar watford", "spar westminster", "spar weymouth", "spar winchester", "spar wolverhampton", "spar worcester", "spar worthing", "spar wrexham", "spar york", "spicery", "sprouts farmers market", "sprouts market", "star bargains", "stew leonard's", "stop & shop", "supermarket", "supervalu", "swaledale butchers", "tai sun", "taj stores", "tariq halal", "tariq halal butchers", "tariq halal meats", "tebay services farmshop", "tesco", "tesco direct", "tesco express", "tesco express aberdeen", "tesco express ayr", "tesco express bangor", "tesco express barnsley", "tesco express basildon", "tesco express basingstoke", "tesco express bath", "tesco express belfast", "tesco express birkenhead", "tesco express birmingham", "tesco express blackburn", "tesco express blackpool", "tesco express bournemouth", "tesco express bradford", "tesco express bridgend", "tesco express brighton", "tesco express bristol", "tesco express burton", "tesco express cambridge", "tesco express cardiff", "tesco express carlisle", "tesco express chelmsford", "tesco express cheltenham", "tesco express chester", "tesco express chichester", "tesco express colchester", "tesco express coventry", "tesco express crawley", "tesco express crewe", "tesco express cumbernauld", "tesco express darlington", "tesco express derby", "tesco express doncaster", "tesco express dumfries", "tesco express dundee", "tesco express dunfermline", "tesco express durham", "tesco express east kilbride", "tesco express eastbourne", "tesco express edinburgh", "tesco express exeter", "tesco express falkirk", "tesco express glasgow", "tesco express gloucester", "tesco express grimsby", "tesco express guildford", "tesco express halifax", "tesco express hamilton", "tesco express harrogate", "tesco express hartlepool", "tesco express hastings", "tesco express hereford", "tesco express huddersfield", "tesco express hull", "tesco express inverness", "tesco express ipswich", "tesco express kilmarnock", "tesco express kirkcaldy", "tesco express lancaster", "tesco express leamington spa", "tesco express leeds", "tesco express leicester", "tesco express lincoln", "tesco express liverpool", "tesco express livingston", "tesco express london", "tesco express loughborough", "tesco express luton", "tesco express maidstone", "tesco express manchester", "tesco express middlesbrough", "tesco express milton keynes", "tesco express newcastle", "tesco express newport", "tesco express northampton", "tesco express norwich", "tesco express nottingham", "tesco express nuneaton", "tesco express oxford", "tesco express paisley", "tesco express perth", "tesco express peterborough", "tesco express plymouth", "tesco express poole", "tesco express portsmouth", "tesco express preston", "tesco express reading", "tesco express redditch", "tesco express rotherham", "tesco express rugby", "tesco express salford", "tesco express salisbury", "tesco express scunthorpe", "tesco express sheffield", "tesco express shrewsbury", "tesco express slough", "tesco express solihull", "tesco express southampton", "tesco express southport", "tesco express st albans", "tesco express st helens", "tesco express stafford", "tesco express stirling", "tesco express stoke", "tesco express sunderland", "tesco express swansea", "tesco express swindon", "tesco express tamworth", "tesco express taunton", "tesco express telford", "tesco express torquay", "tesco express wakefield", "tesco express watford", "tesco express westminster", "tesco express weymouth", "tesco express winchester", "tesco express wolverhampton", "tesco express worcester", "tesco express worthing", "tesco express wrexham", "tesco express york", "tesco extra", "tesco extra aberdeen", "tesco extra ayr", "tesco extra bangor", "tesco extra barnsley", "tesco extra basildon", "tesco extra basingstoke", "tesco extra bath", "tesco extra belfast", "tesco extra birkenhead", "tesco extra birmingham", "tesco extra blackburn", "tesco extra blackpool", "tesco extra bournemouth", "tesco extra bradford", "tesco extra bridgend", "tesco extra brighton", "tesco extra bristol", "tesco extra burton", "tesco extra cambridge", "tesco extra cardiff", "tesco extra carlisle", "tesco extra chelmsford", "tesco extra cheltenham", "tesco extra chester", "tesco extra chichester", "tesco extra colchester", "tesco extra coventry", "tesco extra crawley", "tesco extra crewe", "tesco extra cumbernauld", "tesco extra darlington", "tesco extra derby", "tesco extra doncaster", "tesco extra dumfries", "tesco extra dundee", "tesco extra dunfermline", "tesco extra durham", "tesco extra east kilbride", "tesco extra eastbourne", "tesco extra edinburgh", "tesco extra exeter", "tesco extra falkirk", "tesco extra glasgow", "tesco extra gloucester", "tesco extra grimsby", "tesco extra guildford", "tesco extra halifax", "tesco extra hamilton", "tesco extra harrogate", "tesco extra hartlepool", "tesco extra hastings", "tesco extra hereford", "tesco extra huddersfield", "tesco extra hull", "tesco extra inverness", "tesco extra ipswich", "tesco extra kilmarnock", "tesco extra kirkcaldy", "tesco extra lancaster", "tesco extra leamington spa", "tesco extra leeds", "tesco extra leicester", "tesco extra lincoln", "tesco extra liverpool", "tesco extra livingston", "tesco extra london", "tesco extra loughborough", "tesco extra luton", "tesco extra maidstone", "tesco extra manchester", "tesco extra middlesbrough", "tesco extra milton keynes", "tesco extra newcastle", "tesco extra newport", "tesco extra northampton", "tesco extra norwich", "tesco extra nottingham", "tesco extra nuneaton", "tesco extra oxford", "tesco extra paisley", "tesco extra perth", "tesco extra peterborough", "tesco extra plymouth", "tesco extra poole", "tesco extra portsmouth", "tesco extra preston", "tesco extra reading", "tesco extra redditch", "tesco extra rotherham", "tesco extra rugby", "tesco extra salford", "tesco extra salisbury", "tesco extra scunthorpe", "tesco extra sheffield", "tesco extra shrewsbury", "tesco extra slough", "tesco extra solihull", "tesco extra southampton", "tesco extra southport", "tesco extra st albans", "tesco extra st helens", "tesco extra stafford", "tesco extra stirling", "tesco extra stoke", "tesco extra sunderland", "tesco extra swansea", "tesco extra swindon", "tesco extra tamworth", "tesco extra taunton", "tesco extra telford", "tesco extra torquay", "tesco extra wakefield", "tesco extra watford", "tesco extra westminster", "tesco extra weymouth", "tesco extra winchester", "tesco extra wolverhampton", "tesco extra worcester", "tesco extra worthing", "tesco extra wrexham", "tesco extra york", "tesco grocery", "tesco metro", "tesco online", "tesco store", "tesco stores", "tesco superstore", "tesco superstore aberdeen", "tesco superstore ayr", "tesco superstore bangor", "tesco superstore barnsley", "tesco superstore basildon", "tesco superstore basingstoke", "tesco superstore bath", "tesco superstore belfast", "tesco superstore birkenhead", "tesco superstore birmingham", "tesco superstore blackburn", "tesco superstore blackpool", "tesco superstore bournemouth", "tesco superstore bradford", "tesco superstore bridgend", "tesco superstore brighton", "tesco superstore bristol", "tesco superstore burton", "tesco superstore cambridge", "tesco superstore cardiff", "tesco superstore carlisle", "tesco superstore chelmsford", "tesco superstore cheltenham", "tesco superstore chester", "tesco superstore chichester", "tesco superstore colchester", "tesco superstore coventry", "tesco superstore crawley", "tesco superstore crewe", "tesco superstore cumbernauld", "tesco superstore darlington", "tesco superstore derby", "tesco superstore doncaster", "tesco superstore dumfries", "tesco superstore dundee", "tesco superstore dunfermline", "tesco superstore durham", "tesco superstore east kilbride", "tesco superstore eastbourne", "tesco superstore edinburgh", "tesco superstore exeter", "tesco superstore falkirk", "tesco superstore glasgow", "tesco superstore gloucester", "tesco superstore grimsby", "tesco superstore guildford", "tesco superstore halifax", "tesco superstore hamilton", "tesco superstore harrogate", "tesco superstore hartlepool", "tesco superstore hastings", "tesco superstore hereford", "tesco superstore huddersfield", "tesco superstore hull", "tesco superstore inverness", "tesco superstore ipswich", "tesco superstore kilmarnock", "tesco superstore kirkcaldy", "tesco superstore lancaster", "tesco superstore leamington spa", "tesco superstore leeds", "tesco superstore leicester", "tesco superstore lincoln", "tesco superstore liverpool", "tesco superstore livingston", "tesco superstore london", "tesco superstore loughborough", "tesco superstore luton", "tesco superstore maidstone", "tesco superstore manchester", "tesco superstore middlesbrough", "tesco superstore milton keynes", "tesco superstore newcastle", "tesco superstore newport", "tesco superstore northampton", "tesco superstore norwich", "tesco superstore nottingham", "tesco superstore nuneaton", "tesco superstore oxford", "tesco superstore paisley", "tesco superstore perth", "tesco superstore peterborough", "tesco superstore plymouth", "tesco superstore poole", "tesco superstore portsmouth", "tesco superstore preston", "tesco superstore reading", "tesco superstore redditch", "tesco superstore rotherham", "tesco superstore rugby", "tesco superstore salford", "tesco superstore salisbury", "tesco superstore scunthorpe", "tesco superstore sheffield", "tesco superstore shrewsbury", "tesco superstore slough", "tesco superstore solihull", "tesco superstore southampton", "tesco superstore southport", "tesco superstore st albans", "tesco superstore st helens", "tesco superstore stafford", "tesco superstore stirling", "tesco superstore stoke", "tesco superstore sunderland", "tesco superstore swansea", "tesco superstore swindon", "tesco superstore tamworth", "tesco superstore taunton", "tesco superstore telford", "tesco superstore torquay", "tesco superstore wakefield", "tesco superstore watford", "tesco superstore westminster", "tesco superstore weymouth", "tesco superstore winchester", "tesco superstore wolverhampton", "tesco superstore worcester", "tesco superstore worthing", "tesco superstore wrexham", "tesco superstore york", "tesco.com", "the bottle club", "the cheddar gorge", "the co-operative", "the cornish fishmonger", "the fish society", "the food warehouse", "the fresh market", "the ginger pig", "the modern milkman", "the spicery", "the whisky exchange", "the whisky shop", "the wine society", "thomas the baker", "tian tian market", "time wholesale", "today's local", "todays local", "trader joe's", "trader joes", "traditional butcher", "turkish food market", "turkish supermarket", "turner & george", "ubereats grocery", "village butcher", "virgin wines", "vons supermarket", "wah nam hong", "waitrose", "waitrose & partners", "waitrose aberdeen", "waitrose and partners", "waitrose ayr", "waitrose bangor", "waitrose barnsley", "waitrose basildon", "waitrose basingstoke", "waitrose bath", "waitrose belfast", "waitrose birkenhead", "waitrose birmingham", "waitrose blackburn", "waitrose blackpool", "waitrose bournemouth", "waitrose bradford", "waitrose bridgend", "waitrose brighton", "waitrose bristol", "waitrose burton", "waitrose cambridge", "waitrose cardiff", "waitrose carlisle", "waitrose chelmsford", "waitrose cheltenham", "waitrose chester", "waitrose chichester", "waitrose colchester", "waitrose coventry", "waitrose crawley", "waitrose crewe", "waitrose cumbernauld", "waitrose darlington", "waitrose derby", "waitrose direct", "waitrose doncaster", "waitrose dumfries", "waitrose dundee", "waitrose dunfermline", "waitrose durham", "waitrose east kilbride", "waitrose eastbourne", "waitrose edinburgh", "waitrose exeter", "waitrose falkirk", "waitrose glasgow", "waitrose gloucester", "waitrose grimsby", "waitrose guildford", "waitrose halifax", "waitrose hamilton", "waitrose harrogate", "waitrose hartlepool", "waitrose hastings", "waitrose hereford", "waitrose huddersfield", "waitrose hull", "waitrose inverness", "waitrose ipswich", "waitrose kilmarnock", "waitrose kirkcaldy", "waitrose lancaster", "waitrose leamington spa", "waitrose leeds", "waitrose leicester", "waitrose lincoln", "waitrose liverpool", "waitrose livingston", "waitrose london", "waitrose loughborough", "waitrose luton", "waitrose maidstone", "waitrose manchester", "waitrose middlesbrough", "waitrose milton keynes", "waitrose newcastle", "waitrose newport", "waitrose northampton", "waitrose norwich", "waitrose nottingham", "waitrose nuneaton", "waitrose oxford", "waitrose paisley", "waitrose perth", "waitrose peterborough", "waitrose plymouth", "waitrose poole", "waitrose portsmouth", "waitrose preston", "waitrose reading", "waitrose redditch", "waitrose rotherham", "waitrose rugby", "waitrose salford", "waitrose salisbury", "waitrose scunthorpe", "waitrose sheffield", "waitrose shrewsbury", "waitrose slough", "waitrose solihull", "waitrose southampton", "waitrose southport", "waitrose st albans", "waitrose st helens", "waitrose stafford", "waitrose stirling", "waitrose stoke", "waitrose sunderland", "waitrose supermarket", "waitrose swansea", "waitrose swindon", "waitrose tamworth", "waitrose taunton", "waitrose telford", "waitrose torquay", "waitrose wakefield", "waitrose watford", "waitrose westminster", "waitrose weymouth", "waitrose winchester", "waitrose wolverhampton", "waitrose worcester", "waitrose worthing", "waitrose wrexham", "waitrose york", "waitrose.com", "warburtons", "warners budgens", "warrens bakery", "weezy delivery", "wegmans", "wegmans food markets", "whisky exchange", "whisky shop", "whole foods", "whole foods market", "whole foods uk", "winco foods", "wine rack", "wing yip", "wing yip superstore", "wm morrison", "woolworths supermarket", "zabka uk", "zapp delivery"]}, {"id": "transport", "label": "Fuel, Travel & Vehicles", "icon": "⛽", "color": "#0284c7", "keywords": ["aa breakdown", "aberdeen station rail", "addison lee", "alamo", "alamo rent a car", "alfa power", "allstar fuel card", "amber cars", "amtrak", "apcoa", "apcoa parking", "applegreen", "applegreen aberdeen", "applegreen ayr", "applegreen bangor", "applegreen barnsley", "applegreen basildon", "applegreen basingstoke", "applegreen bath", "applegreen belfast", "applegreen birkenhead", "applegreen birmingham", "applegreen blackburn", "applegreen blackpool", "applegreen bournemouth", "applegreen bradford", "applegreen bridgend", "applegreen brighton", "applegreen bristol", "applegreen burton", "applegreen cambridge", "applegreen cardiff", "applegreen carlisle", "applegreen chelmsford", "applegreen cheltenham", "applegreen chester", "applegreen chichester", "applegreen colchester", "applegreen coventry", "applegreen crawley", "applegreen crewe", "applegreen cumbernauld", "applegreen darlington", "applegreen derby", "applegreen doncaster", "applegreen dumfries", "applegreen dundee", "applegreen dunfermline", "applegreen durham", "applegreen east kilbride", "applegreen eastbourne", "applegreen edinburgh", "applegreen exeter", "applegreen falkirk", "applegreen glasgow", "applegreen gloucester", "applegreen grimsby", "applegreen guildford", "applegreen halifax", "applegreen hamilton", "applegreen harrogate", "applegreen hartlepool", "applegreen hastings", "applegreen hereford", "applegreen huddersfield", "applegreen hull", "applegreen inverness", "applegreen ipswich", "applegreen kilmarnock", "applegreen kirkcaldy", "applegreen lancaster", "applegreen leamington spa", "applegreen leeds", "applegreen leicester", "applegreen lincoln", "applegreen liverpool", "applegreen livingston", "applegreen london", "applegreen loughborough", "applegreen luton", "applegreen maidstone", "applegreen manchester", "applegreen middlesbrough", "applegreen milton keynes", "applegreen newcastle", "applegreen newport", "applegreen northampton", "applegreen norwich", "applegreen nottingham", "applegreen nuneaton", "applegreen oxford", "applegreen paisley", "applegreen perth", "applegreen peterborough", "applegreen plymouth", "applegreen poole", "applegreen portsmouth", "applegreen preston", "applegreen reading", "applegreen redditch", "applegreen rotherham", "applegreen rugby", "applegreen salford", "applegreen salisbury", "applegreen scunthorpe", "applegreen service", "applegreen sheffield", "applegreen shrewsbury", "applegreen slough", "applegreen solihull", "applegreen southampton", "applegreen southport", "applegreen st albans", "applegreen st helens", "applegreen stafford", "applegreen stirling", "applegreen stoke", "applegreen sunderland", "applegreen swansea", "applegreen swindon", "applegreen tamworth", "applegreen taunton", "applegreen telford", "applegreen torquay", "applegreen wakefield", "applegreen watford", "applegreen westminster", "applegreen weymouth", "applegreen winchester", "applegreen wolverhampton", "applegreen worcester", "applegreen worthing", "applegreen wrexham", "applegreen york", "arnold clark", "arriva", "arriva bus", "arriva midlands", "arriva north west", "arriva yorkshire", "asda forecourt", "asda fuel", "asda pay at pum", "asda pay at pump", "asda petrol", "asda pfs", "ats euromaster", "auto glass", "auto repair", "auto windscreens", "autoglass", "avanti", "avanti trains", "avanti west coast", "avis", "avis car rental", "bart san francisco", "bath clean air zone", "bcp parking", "beev", "belfast great victoria rail", "belfast lanyon place rail", "birmingham airport monorail", "birmingham clean air zone", "birmingham new street rail", "birmingham snow hill rail", "blackcircles", "blackcircles.com", "blackpool tramway", "blackpool transport", "blink charging", "blueline taxis", "bolt", "bolt operations", "bolt ride", "bolt.eu", "bp connect", "bp connect aberdeen", "bp connect ayr", "bp connect bangor", "bp connect barnsley", "bp connect basildon", "bp connect basingstoke", "bp connect bath", "bp connect belfast", "bp connect birkenhead", "bp connect birmingham", "bp connect blackburn", "bp connect blackpool", "bp connect bournemouth", "bp connect bradford", "bp connect bridgend", "bp connect brighton", "bp connect bristol", "bp connect burton", "bp connect cambridge", "bp connect cardiff", "bp connect carlisle", "bp connect chelmsford", "bp connect cheltenham", "bp connect chester", "bp connect chichester", "bp connect colchester", "bp connect coventry", "bp connect crawley", "bp connect crewe", "bp connect cumbernauld", "bp connect darlington", "bp connect derby", "bp connect doncaster", "bp connect dumfries", "bp connect dundee", "bp connect dunfermline", "bp connect durham", "bp connect east kilbride", "bp connect eastbourne", "bp connect edinburgh", "bp connect exeter", "bp connect falkirk", "bp connect glasgow", "bp connect gloucester", "bp connect grimsby", "bp connect guildford", "bp connect halifax", "bp connect hamilton", "bp connect harrogate", "bp connect hartlepool", "bp connect hastings", "bp connect hereford", "bp connect huddersfield", "bp connect hull", "bp connect inverness", "bp connect ipswich", "bp connect kilmarnock", "bp connect kirkcaldy", "bp connect lancaster", "bp connect leamington spa", "bp connect leeds", "bp connect leicester", "bp connect lincoln", "bp connect liverpool", "bp connect livingston", "bp connect london", "bp connect loughborough", "bp connect luton", "bp connect maidstone", "bp connect manchester", "bp connect middlesbrough", "bp connect milton keynes", "bp connect newcastle", "bp connect newport", "bp connect northampton", "bp connect norwich", "bp connect nottingham", "bp connect nuneaton", "bp connect oxford", "bp connect paisley", "bp connect perth", "bp connect peterborough", "bp connect plymouth", "bp connect poole", "bp connect portsmouth", "bp connect preston", "bp connect reading", "bp connect redditch", "bp connect rotherham", "bp connect rugby", "bp connect salford", "bp connect salisbury", "bp connect scunthorpe", "bp connect sheffield", "bp connect shrewsbury", "bp connect slough", "bp connect solihull", "bp connect southampton", "bp connect southport", "bp connect st albans", "bp connect st helens", "bp connect stafford", "bp connect stirling", "bp connect stoke", "bp connect sunderland", "bp connect swansea", "bp connect swindon", "bp connect tamworth", "bp connect taunton", "bp connect telford", "bp connect torquay", "bp connect wakefield", "bp connect watford", "bp connect westminster", "bp connect weymouth", "bp connect winchester", "bp connect wolverhampton", "bp connect worcester", "bp connect worthing", "bp connect wrexham", "bp connect york", "bp express", "bp forecourt", "bp garage", "bp oil", "bp petrol", "bp pulse", "bp pulse charging", "bp service station", "brighton & hove buses", "brighton station rail", "bristol clean air zone", "bristol parkway rail", "bristol street motors", "bristol temple meads rail", "britannia parking", "britannia rescue", "budget rent", "budget rent a car", "c2c rail", "c2c trains", "cab", "cabify", "cairn lodge services", "caledonian sleeper", "cambridge station rail", "cannon street rail", "car wash", "cardiff bus", "cardiff central rail", "cardiff queen street rail", "carlisle station rail", "carshop", "caz", "caz birmingham", "cazoo", "centrebus", "certas energy", "chargepoint", "chargepoint inc", "charing cross rail", "chester station rail", "chiltern railways", "cinch.co.uk", "citipark", "city taxis", "clean air zone", "co-op petrol", "co-wheels car club", "compleo charging", "computer cabs", "congestion charge", "congestion charge tfl", "connected kerb", "cross country trains", "crosscountry", "cta chicago", "curb mobility", "dart charge", "dartford crossing", "db bahn", "demon tweeks", "derby station rail", "deutsche bahn", "diamond bus", "diesel", "dlr", "docklands light railway", "dollar rent a car", "drivalia car rental", "dundee station rail", "dvla", "easirent", "east midlands railway", "easypark", "edinburgh haymarket rail", "edinburgh trams", "edinburgh waverley rail", "eg group", "electrify america", "elizabeth line", "emr", "emr trains", "enterprise car club", "enterprise rent", "enterprise rent-a-car", "esb energy", "esso", "esso express", "esso express aberdeen", "esso express ayr", "esso express bangor", "esso express barnsley", "esso express basildon", "esso express basingstoke", "esso express bath", "esso express belfast", "esso express birkenhead", "esso express birmingham", "esso express blackburn", "esso express blackpool", "esso express bournemouth", "esso express bradford", "esso express bridgend", "esso express brighton", "esso express bristol", "esso express burton", "esso express cambridge", "esso express cardiff", "esso express carlisle", "esso express chelmsford", "esso express cheltenham", "esso express chester", "esso express chichester", "esso express colchester", "esso express coventry", "esso express crawley", "esso express crewe", "esso express cumbernauld", "esso express darlington", "esso express derby", "esso express doncaster", "esso express dumfries", "esso express dundee", "esso express dunfermline", "esso express durham", "esso express east kilbride", "esso express eastbourne", "esso express edinburgh", "esso express exeter", "esso express falkirk", "esso express glasgow", "esso express gloucester", "esso express grimsby", "esso express guildford", "esso express halifax", "esso express hamilton", "esso express harrogate", "esso express hartlepool", "esso express hastings", "esso express hereford", "esso express huddersfield", "esso express hull", "esso express inverness", "esso express ipswich", "esso express kilmarnock", "esso express kirkcaldy", "esso express lancaster", "esso express leamington spa", "esso express leeds", "esso express leicester", "esso express lincoln", "esso express liverpool", "esso express livingston", "esso express london", "esso express loughborough", "esso express luton", "esso express maidstone", "esso express manchester", "esso express middlesbrough", "esso express milton keynes", "esso express newcastle", "esso express newport", "esso express northampton", "esso express norwich", "esso express nottingham", "esso express nuneaton", "esso express oxford", "esso express paisley", "esso express perth", "esso express peterborough", "esso express plymouth", "esso express poole", "esso express portsmouth", "esso express preston", "esso express reading", "esso express redditch", "esso express rotherham", "esso express rugby", "esso express salford", "esso express salisbury", "esso express scunthorpe", "esso express sheffield", "esso express shrewsbury", "esso express slough", "esso express solihull", "esso express southampton", "esso express southport", "esso express st albans", "esso express st helens", "esso express stafford", "esso express stirling", "esso express stoke", "esso express sunderland", "esso express swansea", "esso express swindon", "esso express tamworth", "esso express taunton", "esso express telford", "esso express torquay", "esso express wakefield", "esso express watford", "esso express westminster", "esso express weymouth", "esso express winchester", "esso express wolverhampton", "esso express worcester", "esso express worthing", "esso express wrexham", "esso express york", "esso forecourt", "esso garage", "esso on the run", "esso petrol", "esso service station", "euro car parks", "euro car parts", "euro garages", "europcar", "europcar uk", "eurostar", "eurostar international", "eurotunnel", "euston station rail", "evans halshaw", "evgo", "evgo charging", "evyve", "excel parking", "exeter st davids rail", "extra baldock services", "extra beaconsfield services", "extra cambridge services", "extra cobham services", "extra leeds skelton lake", "extra motorway services", "extra peterborough services", "extra services", "f1 autocentres", "fastcharge", "fastned", "fastned charging", "filling stati", "filling station", "financial services barnsley", "first bus", "first greater manchester", "first group", "first south yorkshire", "first west of england", "flixbus", "flixbus uk", "forecourt", "formula one", "formula one autocentres", "free now", "freenow", "fuel", "fuelgenie", "garage", "gatwick express", "gatwick express train", "gatwick parking", "genie point", "geniepoint", "getaround car sharing", "gett", "gett uk", "glasgow central rail", "glasgow queen street rail", "glasgow subway", "gloucester services", "go north east", "go-ahead", "go-ahead group", "govia thameslink", "grab ride", "grand central", "grand central railway", "great western", "great western railway", "greater anglia", "green flag", "green flag breakdown", "green motion", "green motion car rental", "green tomato cars", "greyhound lines", "gridserve", "gridserve electric", "gsf car parts", "gulf oil", "gulf petrol", "gwr", "gwr trains", "hackney carriage", "halfords auto", "halfords autocentre", "halfords autocentre aberdeen", "halfords autocentre ayr", "halfords autocentre bangor", "halfords autocentre barnsley", "halfords autocentre basildon", "halfords autocentre basingstoke", "halfords autocentre bath", "halfords autocentre belfast", "halfords autocentre birkenhead", "halfords autocentre birmingham", "halfords autocentre blackburn", "halfords autocentre blackpool", "halfords autocentre bournemouth", "halfords autocentre bradford", "halfords autocentre bridgend", "halfords autocentre brighton", "halfords autocentre bristol", "halfords autocentre burton", "halfords autocentre cambridge", "halfords autocentre cardiff", "halfords autocentre carlisle", "halfords autocentre chelmsford", "halfords autocentre cheltenham", "halfords autocentre chester", "halfords autocentre chichester", "halfords autocentre colchester", "halfords autocentre coventry", "halfords autocentre crawley", "halfords autocentre crewe", "halfords autocentre cumbernauld", "halfords autocentre darlington", "halfords autocentre derby", "halfords autocentre doncaster", "halfords autocentre dumfries", "halfords autocentre dundee", "halfords autocentre dunfermline", "halfords autocentre durham", "halfords autocentre east kilbride", "halfords autocentre eastbourne", "halfords autocentre edinburgh", "halfords autocentre exeter", "halfords autocentre falkirk", "halfords autocentre glasgow", "halfords autocentre gloucester", "halfords autocentre grimsby", "halfords autocentre guildford", "halfords autocentre halifax", "halfords autocentre hamilton", "halfords autocentre harrogate", "halfords autocentre hartlepool", "halfords autocentre hastings", "halfords autocentre hereford", "halfords autocentre huddersfield", "halfords autocentre hull", "halfords autocentre inverness", "halfords autocentre ipswich", "halfords autocentre kilmarnock", "halfords autocentre kirkcaldy", "halfords autocentre lancaster", "halfords autocentre leamington spa", "halfords autocentre leeds", "halfords autocentre leicester", "halfords autocentre lincoln", "halfords autocentre liverpool", "halfords autocentre livingston", "halfords autocentre london", "halfords autocentre loughborough", "halfords autocentre luton", "halfords autocentre maidstone", "halfords autocentre manchester", "halfords autocentre middlesbrough", "halfords autocentre milton keynes", "halfords autocentre newcastle", "halfords autocentre newport", "halfords autocentre northampton", "halfords autocentre norwich", "halfords autocentre nottingham", "halfords autocentre nuneaton", "halfords autocentre oxford", "halfords autocentre paisley", "halfords autocentre perth", "halfords autocentre peterborough", "halfords autocentre plymouth", "halfords autocentre poole", "halfords autocentre portsmouth", "halfords autocentre preston", "halfords autocentre reading", "halfords autocentre redditch", "halfords autocentre rotherham", "halfords autocentre rugby", "halfords autocentre salford", "halfords autocentre salisbury", "halfords autocentre scunthorpe", "halfords autocentre sheffield", "halfords autocentre shrewsbury", "halfords autocentre slough", "halfords autocentre solihull", "halfords autocentre southampton", "halfords autocentre southport", "halfords autocentre st albans", "halfords autocentre st helens", "halfords autocentre stafford", "halfords autocentre stirling", "halfords autocentre stoke", "halfords autocentre sunderland", "halfords autocentre swansea", "halfords autocentre swindon", "halfords autocentre tamworth", "halfords autocentre taunton", "halfords autocentre telford", "halfords autocentre torquay", "halfords autocentre wakefield", "halfords autocentre watford", "halfords autocentre westminster", "halfords autocentre weymouth", "halfords autocentre winchester", "halfords autocentre wolverhampton", "halfords autocentre worcester", "halfords autocentre worthing", "halfords autocentre wrexham", "halfords autocentre york", "harvest energy", "heathrow express", "heathrow express train", "heathrow parking", "hertz", "hertz car rental", "hiq tyres", "hiyacar", "horizon parking", "hull trains", "humber bridge", "humber bridge toll", "imo car wash", "in n out autocentre", "inchcape retail", "instavolt", "instavolt charging", "inverness station rail", "ionity", "ionity ev", "ipswich station rail", "island line trains", "jet petrol", "jet service", "jet service station", "justpark", "justpark parking", "kempower", "keyfuels", "kings cross rail", "kwik fit", "kwik fit aberdeen", "kwik fit ayr", "kwik fit bangor", "kwik fit barnsley", "kwik fit basildon", "kwik fit basingstoke", "kwik fit bath", "kwik fit belfast", "kwik fit birkenhead", "kwik fit birmingham", "kwik fit blackburn", "kwik fit blackpool", "kwik fit bournemouth", "kwik fit bradford", "kwik fit bridgend", "kwik fit brighton", "kwik fit bristol", "kwik fit burton", "kwik fit cambridge", "kwik fit cardiff", "kwik fit carlisle", "kwik fit chelmsford", "kwik fit cheltenham", "kwik fit chester", "kwik fit chichester", "kwik fit colchester", "kwik fit coventry", "kwik fit crawley", "kwik fit crewe", "kwik fit cumbernauld", "kwik fit darlington", "kwik fit derby", "kwik fit doncaster", "kwik fit dumfries", "kwik fit dundee", "kwik fit dunfermline", "kwik fit durham", "kwik fit east kilbride", "kwik fit eastbourne", "kwik fit edinburgh", "kwik fit exeter", "kwik fit falkirk", "kwik fit glasgow", "kwik fit gloucester", "kwik fit grimsby", "kwik fit guildford", "kwik fit halifax", "kwik fit hamilton", "kwik fit harrogate", "kwik fit hartlepool", "kwik fit hastings", "kwik fit hereford", "kwik fit huddersfield", "kwik fit hull", "kwik fit inverness", "kwik fit ipswich", "kwik fit kilmarnock", "kwik fit kirkcaldy", "kwik fit lancaster", "kwik fit leamington spa", "kwik fit leeds", "kwik fit leicester", "kwik fit lincoln", "kwik fit liverpool", "kwik fit livingston", "kwik fit london", "kwik fit loughborough", "kwik fit luton", "kwik fit maidstone", "kwik fit manchester", "kwik fit middlesbrough", "kwik fit milton keynes", "kwik fit newcastle", "kwik fit newport", "kwik fit northampton", "kwik fit norwich", "kwik fit nottingham", "kwik fit nuneaton", "kwik fit oxford", "kwik fit paisley", "kwik fit perth", "kwik fit peterborough", "kwik fit plymouth", "kwik fit poole", "kwik fit portsmouth", "kwik fit preston", "kwik fit reading", "kwik fit redditch", "kwik fit rotherham", "kwik fit rugby", "kwik fit salford", "kwik fit salisbury", "kwik fit scunthorpe", "kwik fit sheffield", "kwik fit shrewsbury", "kwik fit slough", "kwik fit solihull", "kwik fit southampton", "kwik fit southport", "kwik fit st albans", "kwik fit st helens", "kwik fit stafford", "kwik fit stirling", "kwik fit stoke", "kwik fit sunderland", "kwik fit swansea", "kwik fit swindon", "kwik fit tamworth", "kwik fit taunton", "kwik fit telford", "kwik fit torquay", "kwik fit wakefield", "kwik fit watford", "kwik fit westminster", "kwik fit weymouth", "kwik fit winchester", "kwik fit wolverhampton", "kwik fit worcester", "kwik fit worthing", "kwik fit wrexham", "kwik fit york", "kwik-fit", "lancaster station rail", "leeds rail station", "leicester station rail", "leshuttle", "liverpool lime street rail", "liverpool street rail", "lner", "lnwr trains", "london black cab", "london bridge rail", "london congestion charge", "london lez", "london north eastern railway", "london northwestern railway", "london overground", "london ulez", "london underground", "lookers motor", "lothian buses", "lumo", "lumo trains", "luton airport express", "luton airport parking", "luxmore east service", "luxmore east service s", "luxmore service", "luxmore west service", "luxmore west service s", "lyft", "lyft ride", "m6 toll", "manchester airport parking", "manchester metrolink", "manchester oxford road rail", "manchester piccadilly rail", "manchester victoria rail", "marshall motor group", "mbta boston", "mcgill's buses", "mechanic", "megabus", "megabus.com", "mer charging", "mersey gateway toll", "merseyflow", "merseyrail", "metro", "metrolink", "mfg", "mfg forecourt", "midland expressway", "minicab", "minicab service", "monta charging", "morrison petrol", "morrisons fuel", "morrisons pay at pump", "morrisons petrol", "morrisons pfs", "mot", "moto cherwell valley", "moto hospitality", "moto leigh delamere", "moto reading", "moto rugby", "moto services", "moto thurrock", "moto toddington", "moto wetherby", "moto winchester", "motor fuel", "motor fuel group", "motorpoint", "motorway.co.uk", "mr clutch", "mta new york", "murco", "murco petroleum", "my train ticket", "mycarneedsa", "national car parks", "national car rental", "national express", "national express coach", "national rail", "national tyres", "national tyres aberdeen", "national tyres and autocare", "national tyres ayr", "national tyres bangor", "national tyres barnsley", "national tyres basildon", "national tyres basingstoke", "national tyres bath", "national tyres belfast", "national tyres birkenhead", "national tyres birmingham", "national tyres blackburn", "national tyres blackpool", "national tyres bournemouth", "national tyres bradford", "national tyres bridgend", "national tyres brighton", "national tyres bristol", "national tyres burton", "national tyres cambridge", "national tyres cardiff", "national tyres carlisle", "national tyres chelmsford", "national tyres cheltenham", "national tyres chester", "national tyres chichester", "national tyres colchester", "national tyres coventry", "national tyres crawley", "national tyres crewe", "national tyres cumbernauld", "national tyres darlington", "national tyres derby", "national tyres doncaster", "national tyres dumfries", "national tyres dundee", "national tyres dunfermline", "national tyres durham", "national tyres east kilbride", "national tyres eastbourne", "national tyres edinburgh", "national tyres exeter", "national tyres falkirk", "national tyres glasgow", "national tyres gloucester", "national tyres grimsby", "national tyres guildford", "national tyres halifax", "national tyres hamilton", "national tyres harrogate", "national tyres hartlepool", "national tyres hastings", "national tyres hereford", "national tyres huddersfield", "national tyres hull", "national tyres inverness", "national tyres ipswich", "national tyres kilmarnock", "national tyres kirkcaldy", "national tyres lancaster", "national tyres leamington spa", "national tyres leeds", "national tyres leicester", "national tyres lincoln", "national tyres liverpool", "national tyres livingston", "national tyres london", "national tyres loughborough", "national tyres luton", "national tyres maidstone", "national tyres manchester", "national tyres middlesbrough", "national tyres milton keynes", "national tyres newcastle", "national tyres newport", "national tyres northampton", "national tyres norwich", "national tyres nottingham", "national tyres nuneaton", "national tyres oxford", "national tyres paisley", "national tyres perth", "national tyres peterborough", "national tyres plymouth", "national tyres poole", "national tyres portsmouth", "national tyres preston", "national tyres reading", "national tyres redditch", "national tyres rotherham", "national tyres rugby", "national tyres salford", "national tyres salisbury", "national tyres scunthorpe", "national tyres sheffield", "national tyres shrewsbury", "national tyres slough", "national tyres solihull", "national tyres southampton", "national tyres southport", "national tyres st albans", "national tyres st helens", "national tyres stafford", "national tyres stirling", "national tyres stoke", "national tyres sunderland", "national tyres swansea", "national tyres swindon", "national tyres tamworth", "national tyres taunton", "national tyres telford", "national tyres torquay", "national tyres wakefield", "national tyres watford", "national tyres westminster", "national tyres weymouth", "national tyres winchester", "national tyres wolverhampton", "national tyres worcester", "national tyres worthing", "national tyres wrexham", "national tyres york", "national windscreens", "ncp", "ncp parking", "nelc grimsby", "nelc parking", "network rail", "newcastle central rail", "newcastle metro", "newport bus", "newport station rail", "north lincolnshire cou", "north lincs cou", "northern rail", "northern trains", "norwich station rail", "nottingham city transport", "nottingham station rail", "npk paybooth", "oil", "ola cabs", "omny new york", "osprey", "osprey charging", "osprey charging network", "oxford bus company", "oxford station rail", "oyster", "oyster auto topup", "oyster card", "pace fuel", "pace petrol", "paddington station rail", "parking", "parkingeye", "parkme", "parkmobile", "parkopedia", "pay at pum", "pay at pump", "paybooth", "paybyphone", "paybyphone parking", "pendragon plc", "petrol", "pfs", "pfs forecourt", "pfs fuel", "pfs tesco", "plymouth citybus", "plymouth station rail", "pod point", "podpoint", "portsmouth harbour rail", "preston station rail", "protyre", "purple parking", "q-park", "rac", "rac auto services", "rac breakdown", "radio cars", "radio taxis", "rail europe", "raileasy", "railway", "ratp paris metro", "raw charging", "reading buses", "reading station rail", "refinery filling stati", "refinery filling station", "renfe", "ringgo", "ringgo parking", "roadchef", "roadchef clacket lane", "roadchef norton canes", "roadchef sandbach", "roadchef sedgemoor", "roadchef services", "roadchef strensham", "roadchef watford gap", "rontec", "rontec service", "saba parking", "sainsbury's fuel", "sainsbury's pay at pump", "sainsbury's petrol", "sainsbury's pfs", "sainsburys fuel", "sainsburys pay at pump", "sainsburys petrol", "sainsburys pfs", "sbb cff ffs", "scarborough bc", "scarborough bc (e)", "scotrail", "scotrail trains", "service station", "severn crossing toll", "sheffield clean air zone", "sheffield station rail", "sheffield supertram", "shell", "shell direct", "shell forecourt", "shell garage", "shell garage aberdeen", "shell garage ayr", "shell garage bangor", "shell garage barnsley", "shell garage basildon", "shell garage basingstoke", "shell garage bath", "shell garage belfast", "shell garage birkenhead", "shell garage birmingham", "shell garage blackburn", "shell garage blackpool", "shell garage bournemouth", "shell garage bradford", "shell garage bridgend", "shell garage brighton", "shell garage bristol", "shell garage burton", "shell garage cambridge", "shell garage cardiff", "shell garage carlisle", "shell garage chelmsford", "shell garage cheltenham", "shell garage chester", "shell garage chichester", "shell garage colchester", "shell garage coventry", "shell garage crawley", "shell garage crewe", "shell garage cumbernauld", "shell garage darlington", "shell garage derby", "shell garage doncaster", "shell garage dumfries", "shell garage dundee", "shell garage dunfermline", "shell garage durham", "shell garage east kilbride", "shell garage eastbourne", "shell garage edinburgh", "shell garage exeter", "shell garage falkirk", "shell garage glasgow", "shell garage gloucester", "shell garage grimsby", "shell garage guildford", "shell garage halifax", "shell garage hamilton", "shell garage harrogate", "shell garage hartlepool", "shell garage hastings", "shell garage hereford", "shell garage huddersfield", "shell garage hull", "shell garage inverness", "shell garage ipswich", "shell garage kilmarnock", "shell garage kirkcaldy", "shell garage lancaster", "shell garage leamington spa", "shell garage leeds", "shell garage leicester", "shell garage lincoln", "shell garage liverpool", "shell garage livingston", "shell garage london", "shell garage loughborough", "shell garage luton", "shell garage maidstone", "shell garage manchester", "shell garage middlesbrough", "shell garage milton keynes", "shell garage newcastle", "shell garage newport", "shell garage northampton", "shell garage norwich", "shell garage nottingham", "shell garage nuneaton", "shell garage oxford", "shell garage paisley", "shell garage perth", "shell garage peterborough", "shell garage plymouth", "shell garage poole", "shell garage portsmouth", "shell garage preston", "shell garage reading", "shell garage redditch", "shell garage rotherham", "shell garage rugby", "shell garage salford", "shell garage salisbury", "shell garage scunthorpe", "shell garage sheffield", "shell garage shrewsbury", "shell garage slough", "shell garage solihull", "shell garage southampton", "shell garage southport", "shell garage st albans", "shell garage st helens", "shell garage stafford", "shell garage stirling", "shell garage stoke", "shell garage sunderland", "shell garage swansea", "shell garage swindon", "shell garage tamworth", "shell garage taunton", "shell garage telford", "shell garage torquay", "shell garage wakefield", "shell garage watford", "shell garage westminster", "shell garage weymouth", "shell garage winchester", "shell garage wolverhampton", "shell garage worcester", "shell garage worthing", "shell garage wrexham", "shell garage york", "shell oil", "shell petrol", "shell recharge", "shell recharge charging", "shell select", "shell service station", "sixt", "sixt rent a car", "smart parking", "sncf", "source london", "south western railway", "southampton central rail", "southeastern", "southeastern railway", "southern railway", "split ticketing", "splitmyfare", "st pancras international", "st pancras rail", "stagecoach", "stagecoach bus", "stagecoach east", "stagecoach london", "stagecoach manchester", "stagecoach south", "stansted airport parking", "stansted express", "stansted express train", "stirling station rail", "stratstone", "streamline taxis", "supermarket fuel", "supermarket petrol", "supertram", "swansea station rail", "swarco e.connect", "swr", "swr trains", "sytner group", "tamar bridge toll", "taxi", "tebay services", "tesco forecourt", "tesco fuel", "tesco pay at pum", "tesco pay at pump", "tesco petrol", "tesco pfs", "tesco service station", "tesla", "tesla charging", "tesla supercharg", "tesla supercharger", "texaco", "texaco forecourt", "texaco garage", "texaco petrol", "texaco service station", "tfl", "tfl auto topup", "tfl contactless", "tfl rail", "tfl travel", "tfl travel charge", "tfl.gov.uk", "tfw", "tfw rail", "thalys", "thameslink", "thameslink railway", "the aa motoring", "the trainline", "thrifty car rental", "toll", "total petrol", "total service station", "totalenergies fuel", "tpe trains", "train", "trainline", "trainline.com", "tram", "transdev", "transdev blazefield", "transpennine express", "transport for london", "transport for wales", "transport for wales rail", "trenitalia", "trustford", "turo", "turo car sharing", "turo uk", "tyne and wear metro", "tyne tunnel", "tyne tunnels", "tyres", "uber", "uber *trip", "uber bv", "uber ride", "uber technologies", "uber trip", "ubitricity", "uk fuels", "ulez", "ulez charge tfl", "underground", "veezu", "vertu motors", "victoria station rail", "virtuo car rental", "warrington's own buses", "waterloo station rail", "waves car wash", "we buy any car", "webuyanycar", "welcome break", "welcome break fleet", "welcome break gordano", "welcome break membury", "welcome break oxford", "welcome break services", "welcome break south mimms", "welcome break warwick", "west midlands metro", "west midlands trains", "whocanfixmycar", "wmata washington", "york station rail", "zipcar", "zipcar uk"]}, {"id": "dining", "label": "Dining, Cafes, Bars & Takeaways", "icon": "☕", "color": "#f59e0b", "keywords": ["200 degrees", "200 degrees coffee", "aberdeen steak house", "adnams pub", "adnams pubs", "adnams southwold", "albert's schloss", "alberts schloss", "all bar one", "all bar one bar", "alton white hart", "amt coffee", "angus steakhouse", "anspach & hobday", "applebee's", "aramark", "arby's", "archie's", "archies burgers", "ask italian", "bakery", "balthazar london", "banana tree", "banana tree pan-asian", "bar", "bar soho", "barburrito", "be at one", "be-at-one", "bear market coffee", "beavertown taproom", "beefeater", "belhaven pub", "bella italia", "belushi's bar", "benihana", "big easy bar.b.q", "big easy bbq", "biju bubble tea", "bill's", "bill's restaurant", "bills restaurant", "bills restaurants", "bistro", "bistro & bar", "bk drive thru", "black bear burger", "black sheep brewery", "black sheep brewery pubs", "black sheep coffee", "blame gloria", "blank street", "blank street coffee", "bleecker burger", "blue bottle coffee", "blyton ice cream", "bodean's bbq", "bodean's smokehouse", "bone daddies", "boost juice bars", "boston tea party", "brewdog", "brewdog bar", "brewery", "brigadiers london", "browns brasserie", "bubbleology", "buffalo wild wings", "bundobust", "burger king", "burger king aberdeen", "burger king ayr", "burger king bangor", "burger king barnsley", "burger king basildon", "burger king basingstoke", "burger king bath", "burger king belfast", "burger king birkenhead", "burger king birmingham", "burger king blackburn", "burger king blackpool", "burger king bournemouth", "burger king bradford", "burger king bridgend", "burger king brighton", "burger king bristol", "burger king burton", "burger king cambridge", "burger king cardiff", "burger king carlisle", "burger king chelmsford", "burger king cheltenham", "burger king chester", "burger king chichester", "burger king colchester", "burger king coventry", "burger king crawley", "burger king crewe", "burger king cumbernauld", "burger king darlington", "burger king derby", "burger king doncaster", "burger king drive thru", "burger king dumfries", "burger king dundee", "burger king dunfermline", "burger king durham", "burger king east kilbride", "burger king eastbourne", "burger king edinburgh", "burger king exeter", "burger king falkirk", "burger king glasgow", "burger king gloucester", "burger king grimsby", "burger king guildford", "burger king halifax", "burger king hamilton", "burger king harrogate", "burger king hartlepool", "burger king hastings", "burger king hereford", "burger king huddersfield", "burger king hull", "burger king inverness", "burger king ipswich", "burger king kilmarnock", "burger king kirkcaldy", "burger king lancaster", "burger king leamington spa", "burger king leeds", "burger king leicester", "burger king lincoln", "burger king liverpool", "burger king livingston", "burger king london", "burger king loughborough", "burger king luton", "burger king maidstone", "burger king manchester", "burger king middlesbrough", "burger king milton keynes", "burger king newcastle", "burger king newport", "burger king northampton", "burger king norwich", "burger king nottingham", "burger king nuneaton", "burger king oxford", "burger king paisley", "burger king perth", "burger king peterborough", "burger king plymouth", "burger king poole", "burger king portsmouth", "burger king preston", "burger king reading", "burger king redditch", "burger king rotherham", "burger king rugby", "burger king salford", "burger king salisbury", "burger king scunthorpe", "burger king sheffield", "burger king shrewsbury", "burger king slough", "burger king solihull", "burger king southampton", "burger king southport", "burger king st albans", "burger king st helens", "burger king stafford", "burger king stirling", "burger king stoke", "burger king sunderland", "burger king swansea", "burger king swindon", "burger king tamworth", "burger king taunton", "burger king telford", "burger king torquay", "burger king uk", "burger king wakefield", "burger king watford", "burger king westminster", "burger king weymouth", "burger king winchester", "burger king wolverhampton", "burger king worcester", "burger king worthing", "burger king wrexham", "burger king york", "burger shack", "busaba", "busaba eathai", "byron burger", "byron burgers", "cafe", "cafe rouge", "caffe", "caffe nero", "caffe nero aberdeen", "caffe nero ayr", "caffe nero bangor", "caffe nero barnsley", "caffe nero basildon", "caffe nero basingstoke", "caffe nero bath", "caffe nero belfast", "caffe nero birkenhead", "caffe nero birmingham", "caffe nero blackburn", "caffe nero blackpool", "caffe nero bournemouth", "caffe nero bradford", "caffe nero bridgend", "caffe nero brighton", "caffe nero bristol", "caffe nero burton", "caffe nero cambridge", "caffe nero cardiff", "caffe nero carlisle", "caffe nero chelmsford", "caffe nero cheltenham", "caffe nero chester", "caffe nero chichester", "caffe nero colchester", "caffe nero coventry", "caffe nero crawley", "caffe nero crewe", "caffe nero cumbernauld", "caffe nero darlington", "caffe nero derby", "caffe nero doncaster", "caffe nero dumfries", "caffe nero dundee", "caffe nero dunfermline", "caffe nero durham", "caffe nero east kilbride", "caffe nero eastbourne", "caffe nero edinburgh", "caffe nero exeter", "caffe nero falkirk", "caffe nero glasgow", "caffe nero gloucester", "caffe nero grimsby", "caffe nero guildford", "caffe nero halifax", "caffe nero hamilton", "caffe nero harrogate", "caffe nero hartlepool", "caffe nero hastings", "caffe nero hereford", "caffe nero huddersfield", "caffe nero hull", "caffe nero inverness", "caffe nero ipswich", "caffe nero kilmarnock", "caffe nero kirkcaldy", "caffe nero lancaster", "caffe nero leamington spa", "caffe nero leeds", "caffe nero leicester", "caffe nero lincoln", "caffe nero liverpool", "caffe nero livingston", "caffe nero london", "caffe nero loughborough", "caffe nero luton", "caffe nero maidstone", "caffe nero manchester", "caffe nero middlesbrough", "caffe nero milton keynes", "caffe nero newcastle", "caffe nero newport", "caffe nero northampton", "caffe nero norwich", "caffe nero nottingham", "caffe nero nuneaton", "caffe nero oxford", "caffe nero paisley", "caffe nero perth", "caffe nero peterborough", "caffe nero plymouth", "caffe nero poole", "caffe nero portsmouth", "caffe nero preston", "caffe nero reading", "caffe nero redditch", "caffe nero rotherham", "caffe nero rugby", "caffe nero salford", "caffe nero salisbury", "caffe nero scunthorpe", "caffe nero sheffield", "caffe nero shrewsbury", "caffe nero slough", "caffe nero solihull", "caffe nero southampton", "caffe nero southport", "caffe nero st albans", "caffe nero st helens", "caffe nero stafford", "caffe nero stirling", "caffe nero stoke", "caffe nero sunderland", "caffe nero swansea", "caffe nero swindon", "caffe nero tamworth", "caffe nero taunton", "caffe nero telford", "caffe nero torquay", "caffe nero wakefield", "caffe nero watford", "caffe nero westminster", "caffe nero weymouth", "caffe nero winchester", "caffe nero wolverhampton", "caffe nero worcester", "caffe nero worthing", "caffe nero wrexham", "caffe nero york", "caffè nero", "california pizza kitchen", "camden town brewery", "camile thai", "caprinos pizza", "caravan coffee", "caribou coffee", "carl's jr", "carluccio's", "carluccios", "castle pubs", "cater", "caterer", "caterers", "catering", "catering service", "chaophraya thai", "chatime", "chef & brewer", "chick-fil-a", "chicken cottage", "chili's grill & bar", "chinese takeaway", "chipotle", "chipotle mexican grill", "chippy", "chiquito", "chiquito mexican", "chiquito mexican restaurant", "chopstix", "chopstix noodle", "chopstix noodle bar", "chutney mary", "cicis pizza", "cinamon pizza", "cinnabon", "cloudwater taproom", "cocktail", "coco fresh tea & juice", "coffee", "coffee 1", "coffee#1", "cookie people", "cooplands", "costa", "costa coffee", "costa coffee aberdeen", "costa coffee ayr", "costa coffee bangor", "costa coffee barnsley", "costa coffee basildon", "costa coffee basingstoke", "costa coffee bath", "costa coffee belfast", "costa coffee birkenhead", "costa coffee birmingham", "costa coffee blackburn", "costa coffee blackpool", "costa coffee bournemouth", "costa coffee bradford", "costa coffee bridgend", "costa coffee brighton", "costa coffee bristol", "costa coffee burton", "costa coffee cambridge", "costa coffee cardiff", "costa coffee carlisle", "costa coffee chelmsford", "costa coffee cheltenham", "costa coffee chester", "costa coffee chichester", "costa coffee colchester", "costa coffee coventry", "costa coffee crawley", "costa coffee crewe", "costa coffee cumbernauld", "costa coffee darlington", "costa coffee derby", "costa coffee doncaster", "costa coffee dumfries", "costa coffee dundee", "costa coffee dunfermline", "costa coffee durham", "costa coffee east kilbride", "costa coffee eastbourne", "costa coffee edinburgh", "costa coffee exeter", "costa coffee falkirk", "costa coffee glasgow", "costa coffee gloucester", "costa coffee grimsby", "costa coffee guildford", "costa coffee halifax", "costa coffee hamilton", "costa coffee harrogate", "costa coffee hartlepool", "costa coffee hastings", "costa coffee hereford", "costa coffee huddersfield", "costa coffee hull", "costa coffee inverness", "costa coffee ipswich", "costa coffee kilmarnock", "costa coffee kirkcaldy", "costa coffee lancaster", "costa coffee leamington spa", "costa coffee leeds", "costa coffee leicester", "costa coffee lincoln", "costa coffee liverpool", "costa coffee livingston", "costa coffee london", "costa coffee loughborough", "costa coffee luton", "costa coffee maidstone", "costa coffee manchester", "costa coffee middlesbrough", "costa coffee milton keynes", "costa coffee newcastle", "costa coffee newport", "costa coffee northampton", "costa coffee norwich", "costa coffee nottingham", "costa coffee nuneaton", "costa coffee oxford", "costa coffee paisley", "costa coffee perth", "costa coffee peterborough", "costa coffee plymouth", "costa coffee poole", "costa coffee portsmouth", "costa coffee preston", "costa coffee reading", "costa coffee redditch", "costa coffee rotherham", "costa coffee rugby", "costa coffee salford", "costa coffee salisbury", "costa coffee scunthorpe", "costa coffee sheffield", "costa coffee shrewsbury", "costa coffee slough", "costa coffee solihull", "costa coffee southampton", "costa coffee southport", "costa coffee st albans", "costa coffee st helens", "costa coffee stafford", "costa coffee stirling", "costa coffee stoke", "costa coffee sunderland", "costa coffee swansea", "costa coffee swindon", "costa coffee tamworth", "costa coffee taunton", "costa coffee telford", "costa coffee torquay", "costa coffee wakefield", "costa coffee watford", "costa coffee westminster", "costa coffee weymouth", "costa coffee winchester", "costa coffee wolverhampton", "costa coffee worcester", "costa coffee worthing", "costa coffee wrexham", "costa coffee york", "costa drive thru", "costa express", "costa limited", "cosy club", "cosy club bar", "cote", "cote brasserie", "cote brasserie restaurant", "crab shack", "cracker barrel", "craft union", "craft union pub", "crust bros", "culver's", "cuppotee", "curry house", "côte brasserie", "da mario", "dairy queen", "dalby ice cream", "dalby icecream", "deliveroo", "deliveroo food", "deliveroo rider", "deliveroo.co.uk", "delivery hero", "denny's restaurant", "department of coffee", "dim t", "din tai fung", "diner", "dirty martini bar", "dishoom", "dishoom birmingham", "dishoom bombay cafe", "dishoom cafe", "dishoom carnabay", "dishoom covent garden", "dishoom edinburgh", "dishoom king's cross", "dishoom manchester", "dishoom shoreditch", "dixy chicken", "dolly s 2021", "dolly's desserts", "dollys 2021", "dollys desserts", "domino's", "domino's pizza", "domino's pizza aberdeen", "domino's pizza ayr", "domino's pizza bangor", "domino's pizza barnsley", "domino's pizza basildon", "domino's pizza basingstoke", "domino's pizza bath", "domino's pizza belfast", "domino's pizza birkenhead", "domino's pizza birmingham", "domino's pizza blackburn", "domino's pizza blackpool", "domino's pizza bournemouth", "domino's pizza bradford", "domino's pizza bridgend", "domino's pizza brighton", "domino's pizza bristol", "domino's pizza burton", "domino's pizza cambridge", "domino's pizza cardiff", "domino's pizza carlisle", "domino's pizza chelmsford", "domino's pizza cheltenham", "domino's pizza chester", "domino's pizza chichester", "domino's pizza colchester", "domino's pizza coventry", "domino's pizza crawley", "domino's pizza crewe", "domino's pizza cumbernauld", "domino's pizza darlington", "domino's pizza derby", "domino's pizza doncaster", "domino's pizza dumfries", "domino's pizza dundee", "domino's pizza dunfermline", "domino's pizza durham", "domino's pizza east kilbride", "domino's pizza eastbourne", "domino's pizza edinburgh", "domino's pizza exeter", "domino's pizza falkirk", "domino's pizza glasgow", "domino's pizza gloucester", "domino's pizza grimsby", "domino's pizza guildford", "domino's pizza halifax", "domino's pizza hamilton", "domino's pizza harrogate", "domino's pizza hartlepool", "domino's pizza hastings", "domino's pizza hereford", "domino's pizza huddersfield", "domino's pizza hull", "domino's pizza inverness", "domino's pizza ipswich", "domino's pizza kilmarnock", "domino's pizza kirkcaldy", "domino's pizza lancaster", "domino's pizza leamington spa", "domino's pizza leeds", "domino's pizza leicester", "domino's pizza lincoln", "domino's pizza liverpool", "domino's pizza livingston", "domino's pizza london", "domino's pizza loughborough", "domino's pizza luton", "domino's pizza maidstone", "domino's pizza manchester", "domino's pizza middlesbrough", "domino's pizza milton keynes", "domino's pizza newcastle", "domino's pizza newport", "domino's pizza northampton", "domino's pizza norwich", "domino's pizza nottingham", "domino's pizza nuneaton", "domino's pizza oxford", "domino's pizza paisley", "domino's pizza perth", "domino's pizza peterborough", "domino's pizza plymouth", "domino's pizza poole", "domino's pizza portsmouth", "domino's pizza preston", "domino's pizza reading", "domino's pizza redditch", "domino's pizza rotherham", "domino's pizza rugby", "domino's pizza salford", "domino's pizza salisbury", "domino's pizza scunthorpe", "domino's pizza sheffield", "domino's pizza shrewsbury", "domino's pizza slough", "domino's pizza solihull", "domino's pizza southampton", "domino's pizza southport", "domino's pizza st albans", "domino's pizza st helens", "domino's pizza stafford", "domino's pizza stirling", "domino's pizza stoke", "domino's pizza sunderland", "domino's pizza swansea", "domino's pizza swindon", "domino's pizza tamworth", "domino's pizza taunton", "domino's pizza telford", "domino's pizza torquay", "domino's pizza wakefield", "domino's pizza watford", "domino's pizza westminster", "domino's pizza weymouth", "domino's pizza winchester", "domino's pizza wolverhampton", "domino's pizza worcester", "domino's pizza worthing", "domino's pizza wrexham", "domino's pizza york", "dominos", "dominos delivery", "dominos pizza", "doordash", "doordash inc", "dq grill & chill", "dunkin", "dunkin donuts", "dunkin'", "dunkin' donuts", "dutch bros coffee", "eatery", "ember inns", "esquires coffee", "fantuan delivery", "farmhouse inns", "fat hippo", "favorite chicken", "feng sushi", "fireaway pizza", "fish & chi", "fish & chip shop", "fish & chips", "fish and chi", "fish and chip", "fish and chip shop", "fish and chips", "fish bar", "five guys", "five guys aberdeen", "five guys ayr", "five guys bangor", "five guys barnsley", "five guys basildon", "five guys basingstoke", "five guys bath", "five guys belfast", "five guys birkenhead", "five guys birmingham", "five guys blackburn", "five guys blackpool", "five guys bournemouth", "five guys bradford", "five guys bridgend", "five guys brighton", "five guys bristol", "five guys burgers", "five guys burton", "five guys cambridge", "five guys cardiff", "five guys carlisle", "five guys chelmsford", "five guys cheltenham", "five guys chester", "five guys chichester", "five guys colchester", "five guys coventry", "five guys crawley", "five guys crewe", "five guys cumbernauld", "five guys darlington", "five guys derby", "five guys doncaster", "five guys dumfries", "five guys dundee", "five guys dunfermline", "five guys durham", "five guys east kilbride", "five guys eastbourne", "five guys edinburgh", "five guys exeter", "five guys falkirk", "five guys glasgow", "five guys gloucester", "five guys grimsby", "five guys guildford", "five guys halifax", "five guys hamilton", "five guys harrogate", "five guys hartlepool", "five guys hastings", "five guys hereford", "five guys huddersfield", "five guys hull", "five guys inverness", "five guys ipswich", "five guys kilmarnock", "five guys kirkcaldy", "five guys lancaster", "five guys leamington spa", "five guys leeds", "five guys leicester", "five guys lincoln", "five guys liverpool", "five guys livingston", "five guys london", "five guys loughborough", "five guys luton", "five guys maidstone", "five guys manchester", "five guys middlesbrough", "five guys milton keynes", "five guys newcastle", "five guys newport", "five guys northampton", "five guys norwich", "five guys nottingham", "five guys nuneaton", "five guys oxford", "five guys paisley", "five guys perth", "five guys peterborough", "five guys plymouth", "five guys poole", "five guys portsmouth", "five guys preston", "five guys reading", "five guys redditch", "five guys rotherham", "five guys rugby", "five guys salford", "five guys salisbury", "five guys scunthorpe", "five guys sheffield", "five guys shrewsbury", "five guys slough", "five guys solihull", "five guys southampton", "five guys southport", "five guys st albans", "five guys st helens", "five guys stafford", "five guys stirling", "five guys stoke", "five guys sunderland", "five guys swansea", "five guys swindon", "five guys tamworth", "five guys taunton", "five guys telford", "five guys torquay", "five guys uk", "five guys wakefield", "five guys watford", "five guys westminster", "five guys weymouth", "five guys winchester", "five guys wolverhampton", "five guys worcester", "five guys worthing", "five guys wrexham", "five guys york", "flat earth pizza", "flat iron london", "flat iron steak", "flat white soho", "food hall", "foodhub", "foodora", "fourpure taproom", "franco manca", "franco manca sourdough", "frankie & benny's", "frankie and bennys", "fuller's brewery", "fuller's pubs", "fullers", "fullers brewery", "gail's artisan", "gail's bakery", "gails", "gails bakery", "gastropub", "gaucho", "gaucho grill", "gaucho steak", "gbk", "gdk", "gelato", "german doner kebab", "giggling squid", "gipsy hill taproom", "gloria jean's coffees", "golden dragon", "gong cha", "gopal's corner", "gourmet burger", "gourmet burger kitchen", "greene king", "greene king pubs", "greggs", "greggs aberdeen", "greggs ayr", "greggs bakery", "greggs bangor", "greggs barnsley", "greggs basildon", "greggs basingstoke", "greggs bath", "greggs belfast", "greggs birkenhead", "greggs birmingham", "greggs blackburn", "greggs blackpool", "greggs bournemouth", "greggs bradford", "greggs bridgend", "greggs brighton", "greggs bristol", "greggs burton", "greggs cambridge", "greggs cardiff", "greggs carlisle", "greggs chelmsford", "greggs cheltenham", "greggs chester", "greggs chichester", "greggs colchester", "greggs coventry", "greggs crawley", "greggs crewe", "greggs cumbernauld", "greggs darlington", "greggs derby", "greggs doncaster", "greggs drive thru", "greggs dumfries", "greggs dundee", "greggs dunfermline", "greggs durham", "greggs east kilbride", "greggs eastbourne", "greggs edinburgh", "greggs exeter", "greggs falkirk", "greggs glasgow", "greggs gloucester", "greggs grimsby", "greggs guildford", "greggs halifax", "greggs hamilton", "greggs harrogate", "greggs hartlepool", "greggs hastings", "greggs hereford", "greggs huddersfield", "greggs hull", "greggs inverness", "greggs ipswich", "greggs kilmarnock", "greggs kirkcaldy", "greggs lancaster", "greggs leamington spa", "greggs leeds", "greggs leicester", "greggs lincoln", "greggs liverpool", "greggs livingston", "greggs london", "greggs loughborough", "greggs luton", "greggs maidstone", "greggs manchester", "greggs middlesbrough", "greggs milton keynes", "greggs newcastle", "greggs newport", "greggs northampton", "greggs norwich", "greggs nottingham", "greggs nuneaton", "greggs oxford", "greggs paisley", "greggs perth", "greggs peterborough", "greggs plymouth", "greggs poole", "greggs portsmouth", "greggs preston", "greggs reading", "greggs redditch", "greggs rotherham", "greggs rugby", "greggs salford", "greggs salisbury", "greggs scunthorpe", "greggs sheffield", "greggs shrewsbury", "greggs slough", "greggs solihull", "greggs southampton", "greggs southport", "greggs st albans", "greggs st helens", "greggs stafford", "greggs stirling", "greggs stoke", "greggs sunderland", "greggs swansea", "greggs swindon", "greggs takeaway", "greggs tamworth", "greggs taunton", "greggs telford", "greggs torquay", "greggs wakefield", "greggs watford", "greggs westminster", "greggs weymouth", "greggs winchester", "greggs wolverhampton", "greggs worcester", "greggs worthing", "greggs wrexham", "greggs york", "grill", "grill & bar", "grind", "grind coffee", "grubhub", "gusto italian", "gymkhana restaurant", "hakkasan", "hall & woodhouse", "hall & woodhouse pubs", "hard rock cafe", "hardee's", "harrisons coffee", "harvester", "harvester restaurant", "hawksmoor", "hawksmoor steak", "hawksmoor steakhouse", "heytea", "hickory's smokehouse", "holts brewery", "homeslice", "homeslice pizza", "honest burger", "honest burgers", "hook norton", "hook norton brewery", "hoppers london", "hungry horse", "hungry horse pub", "hungrypanda", "hutong london", "hyders brewery", "hydes brewery", "ice cream", "icecream", "ihop", "in-n-out", "in-n-out burger", "indian takeaway", "inn", "insomnia coffee", "ippudo ramen", "itsu", "itsu sushi", "itsu to go", "ivy asia", "j d wetherspoon", "jack in the box", "jamba juice", "jamie's italian", "jd wetherspoon", "joe & the juice", "joe and the juice", "joe's juice", "jollibee", "jollibee uk", "joseph holt", "joseph holt brewery", "just eat", "just eat holding", "just-eat.co.uk", "justeat", "kanada-ya", "kebab", "kentucky fried chicken", "kfc", "kfc aberdeen", "kfc ayr", "kfc bangor", "kfc barnsley", "kfc basildon", "kfc basingstoke", "kfc bath", "kfc belfast", "kfc birkenhead", "kfc birmingham", "kfc blackburn", "kfc blackpool", "kfc bournemouth", "kfc bradford", "kfc bridgend", "kfc brighton", "kfc bristol", "kfc burton", "kfc cambridge", "kfc cardiff", "kfc carlisle", "kfc chelmsford", "kfc cheltenham", "kfc chester", "kfc chichester", "kfc colchester", "kfc coventry", "kfc crawley", "kfc crewe", "kfc cumbernauld", "kfc darlington", "kfc delivery", "kfc derby", "kfc doncaster", "kfc drive thru", "kfc dumfries", "kfc dundee", "kfc dunfermline", "kfc durham", "kfc east kilbride", "kfc eastbourne", "kfc edinburgh", "kfc exeter", "kfc falkirk", "kfc glasgow", "kfc gloucester", "kfc grimsby", "kfc guildford", "kfc halifax", "kfc hamilton", "kfc harrogate", "kfc hartlepool", "kfc hastings", "kfc hereford", "kfc huddersfield", "kfc hull", "kfc inverness", "kfc ipswich", "kfc kilmarnock", "kfc kirkcaldy", "kfc lancaster", "kfc leamington spa", "kfc leeds", "kfc leicester", "kfc lincoln", "kfc liverpool", "kfc livingston", "kfc london", "kfc loughborough", "kfc luton", "kfc maidstone", "kfc manchester", "kfc middlesbrough", "kfc milton keynes", "kfc newcastle", "kfc newport", "kfc northampton", "kfc norwich", "kfc nottingham", "kfc nuneaton", "kfc oxford", "kfc paisley", "kfc perth", "kfc peterborough", "kfc plymouth", "kfc poole", "kfc portsmouth", "kfc preston", "kfc reading", "kfc redditch", "kfc rotherham", "kfc rugby", "kfc salford", "kfc salisbury", "kfc scunthorpe", "kfc sheffield", "kfc shrewsbury", "kfc slough", "kfc solihull", "kfc southampton", "kfc southport", "kfc st albans", "kfc st helens", "kfc stafford", "kfc stirling", "kfc stoke", "kfc sunderland", "kfc swansea", "kfc swindon", "kfc tamworth", "kfc taunton", "kfc telford", "kfc torquay", "kfc uk", "kfc wakefield", "kfc watford", "kfc westminster", "kfc weymouth", "kfc winchester", "kfc wolverhampton", "kfc worcester", "kfc worthing", "kfc wrexham", "kfc york", "kingsway kiosks", "kokoro", "kokoro bento", "kokoro sushi", "kokoro uk", "kricket london", "krispy kreme", "krispy kreme doughnuts", "laceby manor", "lahore kebab house", "lane7 bowling & bar", "las iguanas", "las iguanas latin", "leon", "leon restaurants", "little caesars", "loch fyne seafood & grill", "lola's cupcakes", "lord ted", "lounge", "loungers", "loungers limited", "loungers lounge", "magic rock tap", "marco pierre white italian", "markham's fish", "markham's fish and chips", "markhams fish", "markhams fish and chips", "marston's", "marston's brewery", "marston's pubs", "marstons", "marugame", "marugame udon", "mcd delivery", "mcdonald", "mcdonald's", "mcdonald's restaurants", "mcdonalds", "mcdonalds delivery", "mcdonalds drive thru", "meatliquor", "menulog", "midlands whippy", "miller & carter", "miller and carter", "millie's cookies", "mitchells & butlers", "mitchells and butlers", "mon thai", "monmouth coffee", "mooboo bubble tea", "moor beer vault", "morley's chicken", "morleys", "mowgli", "mowgli street food", "nando's", "nando's aberdeen", "nando's ayr", "nando's bangor", "nando's barnsley", "nando's basildon", "nando's basingstoke", "nando's bath", "nando's belfast", "nando's birkenhead", "nando's birmingham", "nando's blackburn", "nando's blackpool", "nando's bournemouth", "nando's bradford", "nando's bridgend", "nando's brighton", "nando's bristol", "nando's burton", "nando's cambridge", "nando's cardiff", "nando's carlisle", "nando's chelmsford", "nando's cheltenham", "nando's chester", "nando's chichester", "nando's colchester", "nando's coventry", "nando's crawley", "nando's crewe", "nando's cumbernauld", "nando's darlington", "nando's derby", "nando's doncaster", "nando's dumfries", "nando's dundee", "nando's dunfermline", "nando's durham", "nando's east kilbride", "nando's eastbourne", "nando's edinburgh", "nando's exeter", "nando's falkirk", "nando's glasgow", "nando's gloucester", "nando's grimsby", "nando's guildford", "nando's halifax", "nando's hamilton", "nando's harrogate", "nando's hartlepool", "nando's hastings", "nando's hereford", "nando's huddersfield", "nando's hull", "nando's inverness", "nando's ipswich", "nando's kilmarnock", "nando's kirkcaldy", "nando's lancaster", "nando's leamington spa", "nando's leeds", "nando's leicester", "nando's lincoln", "nando's liverpool", "nando's livingston", "nando's london", "nando's loughborough", "nando's luton", "nando's maidstone", "nando's manchester", "nando's middlesbrough", "nando's milton keynes", "nando's newcastle", "nando's newport", "nando's northampton", "nando's norwich", "nando's nottingham", "nando's nuneaton", "nando's oxford", "nando's paisley", "nando's peri-peri", "nando's perth", "nando's peterborough", "nando's plymouth", "nando's poole", "nando's portsmouth", "nando's preston", "nando's reading", "nando's redditch", "nando's rotherham", "nando's rugby", "nando's salford", "nando's salisbury", "nando's scunthorpe", "nando's sheffield", "nando's shrewsbury", "nando's slough", "nando's solihull", "nando's southampton", "nando's southport", "nando's st albans", "nando's st helens", "nando's stafford", "nando's stirling", "nando's stoke", "nando's sunderland", "nando's swansea", "nando's swindon", "nando's tamworth", "nando's taunton", "nando's telford", "nando's torquay", "nando's wakefield", "nando's watford", "nando's westminster", "nando's weymouth", "nando's winchester", "nando's wolverhampton", "nando's worcester", "nando's worthing", "nando's wrexham", "nando's york", "nandos", "nandos chicken", "nero express", "nicholson's pubs", "nobu restaurant", "northern monk refectory", "o'neill's", "o'neill's pub", "ole & steen", "ole and steen", "olive catering", "olive catering ser", "olive catering service", "olive garden", "origin coffee", "outback steakhouse", "p.f. chang's", "panda express", "papa john's", "papa john's pizza", "papa johns", "papa johns delivery", "partizan brewing", "patisserie valerie", "patty & bun", "patty and bun", "paul bakery", "peet's coffee", "pepe's piri piri", "pepes piri piri", "pho", "pho cafe", "pho restaurant", "pho vietnamese", "piccolino", "ping pong dim sum", "pizza express", "pizza express live", "pizza gogo", "pizza hut", "pizza hut delivery", "pizza hut express", "pizza hut restaurants", "pizza pilgrims", "pizza pilgrims pizzeria", "pizza shack", "pizza union", "pizzaexpress", "pizzaexpress aberdeen", "pizzaexpress ayr", "pizzaexpress bangor", "pizzaexpress barnsley", "pizzaexpress basildon", "pizzaexpress basingstoke", "pizzaexpress bath", "pizzaexpress belfast", "pizzaexpress birkenhead", "pizzaexpress birmingham", "pizzaexpress blackburn", "pizzaexpress blackpool", "pizzaexpress bournemouth", "pizzaexpress bradford", "pizzaexpress bridgend", "pizzaexpress brighton", "pizzaexpress bristol", "pizzaexpress burton", "pizzaexpress cambridge", "pizzaexpress cardiff", "pizzaexpress carlisle", "pizzaexpress chelmsford", "pizzaexpress cheltenham", "pizzaexpress chester", "pizzaexpress chichester", "pizzaexpress colchester", "pizzaexpress coventry", "pizzaexpress crawley", "pizzaexpress crewe", "pizzaexpress cumbernauld", "pizzaexpress darlington", "pizzaexpress derby", "pizzaexpress doncaster", "pizzaexpress dumfries", "pizzaexpress dundee", "pizzaexpress dunfermline", "pizzaexpress durham", "pizzaexpress east kilbride", "pizzaexpress eastbourne", "pizzaexpress edinburgh", "pizzaexpress exeter", "pizzaexpress falkirk", "pizzaexpress glasgow", "pizzaexpress gloucester", "pizzaexpress grimsby", "pizzaexpress guildford", "pizzaexpress halifax", "pizzaexpress hamilton", "pizzaexpress harrogate", "pizzaexpress hartlepool", "pizzaexpress hastings", "pizzaexpress hereford", "pizzaexpress huddersfield", "pizzaexpress hull", "pizzaexpress inverness", "pizzaexpress ipswich", "pizzaexpress kilmarnock", "pizzaexpress kirkcaldy", "pizzaexpress lancaster", "pizzaexpress leamington spa", "pizzaexpress leeds", "pizzaexpress leicester", "pizzaexpress lincoln", "pizzaexpress liverpool", "pizzaexpress livingston", "pizzaexpress london", "pizzaexpress loughborough", "pizzaexpress luton", "pizzaexpress maidstone", "pizzaexpress manchester", "pizzaexpress middlesbrough", "pizzaexpress milton keynes", "pizzaexpress newcastle", "pizzaexpress newport", "pizzaexpress northampton", "pizzaexpress norwich", "pizzaexpress nottingham", "pizzaexpress nuneaton", "pizzaexpress oxford", "pizzaexpress paisley", "pizzaexpress perth", "pizzaexpress peterborough", "pizzaexpress plymouth", "pizzaexpress poole", "pizzaexpress portsmouth", "pizzaexpress preston", "pizzaexpress reading", "pizzaexpress redditch", "pizzaexpress rotherham", "pizzaexpress rugby", "pizzaexpress salford", "pizzaexpress salisbury", "pizzaexpress scunthorpe", "pizzaexpress sheffield", "pizzaexpress shrewsbury", "pizzaexpress slough", "pizzaexpress solihull", "pizzaexpress southampton", "pizzaexpress southport", "pizzaexpress st albans", "pizzaexpress st helens", "pizzaexpress stafford", "pizzaexpress stirling", "pizzaexpress stoke", "pizzaexpress sunderland", "pizzaexpress swansea", "pizzaexpress swindon", "pizzaexpress tamworth", "pizzaexpress taunton", "pizzaexpress telford", "pizzaexpress torquay", "pizzaexpress wakefield", "pizzaexpress watford", "pizzaexpress westminster", "pizzaexpress weymouth", "pizzaexpress winchester", "pizzaexpress wolverhampton", "pizzaexpress worcester", "pizzaexpress worthing", "pizzaexpress wrexham", "pizzaexpress york", "pizzeria", "popeyes", "popeyes chicken", "popeyes louisiana kitchen", "popeyes uk", "popworld", "popworld night club", "postmates", "pret", "pret a manger", "pret a manger aberdeen", "pret a manger ayr", "pret a manger bangor", "pret a manger barnsley", "pret a manger basildon", "pret a manger basingstoke", "pret a manger bath", "pret a manger belfast", "pret a manger birkenhead", "pret a manger birmingham", "pret a manger blackburn", "pret a manger blackpool", "pret a manger bournemouth", "pret a manger bradford", "pret a manger bridgend", "pret a manger brighton", "pret a manger bristol", "pret a manger burton", "pret a manger cambridge", "pret a manger cardiff", "pret a manger carlisle", "pret a manger chelmsford", "pret a manger cheltenham", "pret a manger chester", "pret a manger chichester", "pret a manger colchester", "pret a manger coventry", "pret a manger crawley", "pret a manger crewe", "pret a manger cumbernauld", "pret a manger darlington", "pret a manger derby", "pret a manger doncaster", "pret a manger dumfries", "pret a manger dundee", "pret a manger dunfermline", "pret a manger durham", "pret a manger east kilbride", "pret a manger eastbourne", "pret a manger edinburgh", "pret a manger exeter", "pret a manger falkirk", "pret a manger glasgow", "pret a manger gloucester", "pret a manger grimsby", "pret a manger guildford", "pret a manger halifax", "pret a manger hamilton", "pret a manger harrogate", "pret a manger hartlepool", "pret a manger hastings", "pret a manger hereford", "pret a manger huddersfield", "pret a manger hull", "pret a manger inverness", "pret a manger ipswich", "pret a manger kilmarnock", "pret a manger kirkcaldy", "pret a manger lancaster", "pret a manger leamington spa", "pret a manger leeds", "pret a manger leicester", "pret a manger lincoln", "pret a manger liverpool", "pret a manger livingston", "pret a manger london", "pret a manger loughborough", "pret a manger luton", "pret a manger maidstone", "pret a manger manchester", "pret a manger middlesbrough", "pret a manger milton keynes", "pret a manger newcastle", "pret a manger newport", "pret a manger northampton", "pret a manger norwich", "pret a manger nottingham", "pret a manger nuneaton", "pret a manger oxford", "pret a manger paisley", "pret a manger perth", "pret a manger peterborough", "pret a manger plymouth", "pret a manger poole", "pret a manger portsmouth", "pret a manger preston", "pret a manger reading", "pret a manger redditch", "pret a manger rotherham", "pret a manger rugby", "pret a manger salford", "pret a manger salisbury", "pret a manger scunthorpe", "pret a manger sheffield", "pret a manger shrewsbury", "pret a manger slough", "pret a manger solihull", "pret a manger southampton", "pret a manger southport", "pret a manger st albans", "pret a manger st helens", "pret a manger stafford", "pret a manger stirling", "pret a manger stoke", "pret a manger sunderland", "pret a manger swansea", "pret a manger swindon", "pret a manger tamworth", "pret a manger taunton", "pret a manger telford", "pret a manger torquay", "pret a manger uk", "pret a manger wakefield", "pret a manger watford", "pret a manger westminster", "pret a manger weymouth", "pret a manger winchester", "pret a manger wolverhampton", "pret a manger worcester", "pret a manger worthing", "pret a manger wrexham", "pret a manger york", "pret club", "pret coffee", "prezzo", "prezzo italian", "proper pubs", "pub", "puccino's", "punch pubs", "red lion", "red lobster", "restaurant", "revolucion de cuba", "revolution bars", "robinsons brewery", "robinsons brewery pubs", "roka restaurant", "roosters piri piri", "roots rum shack", "rosa's thai", "rosa's thai cafe", "rossopomodoro", "roti king", "rudy's napoletana", "rudy's pizza", "saltaire brewery", "sam smiths", "sam's chicken", "samuel smith", "samuel smiths", "samuel smiths pub", "san carlo", "san carlo cicchetti", "saravanaa bhavan", "sbarro", "scott's mayfair", "seafood shack", "sexy fish london", "sexy fish mayfair", "shake shack", "shake shack burger", "shake shack uk", "shellfish shack", "shepherd neame", "shepherd neame brewery", "shoryu ramen", "sides sidemen", "simmons bar", "siren craft brew", "sizzling pubs", "skipthedishes", "slim chickens", "slug & lettuce", "slug and lettuce", "smashburger", "smokehouse", "smoothie king", "soho coffee co", "sonic drive in", "sonic drive-in", "st austell brewery", "st austell brewery pubs", "starbucks", "starbucks coffee", "starbucks coffee aberdeen", "starbucks coffee ayr", "starbucks coffee bangor", "starbucks coffee barnsley", "starbucks coffee basildon", "starbucks coffee basingstoke", "starbucks coffee bath", "starbucks coffee belfast", "starbucks coffee birkenhead", "starbucks coffee birmingham", "starbucks coffee blackburn", "starbucks coffee blackpool", "starbucks coffee bournemouth", "starbucks coffee bradford", "starbucks coffee bridgend", "starbucks coffee brighton", "starbucks coffee bristol", "starbucks coffee burton", "starbucks coffee cambridge", "starbucks coffee cardiff", "starbucks coffee carlisle", "starbucks coffee chelmsford", "starbucks coffee cheltenham", "starbucks coffee chester", "starbucks coffee chichester", "starbucks coffee colchester", "starbucks coffee coventry", "starbucks coffee crawley", "starbucks coffee crewe", "starbucks coffee cumbernauld", "starbucks coffee darlington", "starbucks coffee derby", "starbucks coffee doncaster", "starbucks coffee dumfries", "starbucks coffee dundee", "starbucks coffee dunfermline", "starbucks coffee durham", "starbucks coffee east kilbride", "starbucks coffee eastbourne", "starbucks coffee edinburgh", "starbucks coffee exeter", "starbucks coffee falkirk", "starbucks coffee glasgow", "starbucks coffee gloucester", "starbucks coffee grimsby", "starbucks coffee guildford", "starbucks coffee halifax", "starbucks coffee hamilton", "starbucks coffee harrogate", "starbucks coffee hartlepool", "starbucks coffee hastings", "starbucks coffee hereford", "starbucks coffee huddersfield", "starbucks coffee hull", "starbucks coffee inverness", "starbucks coffee ipswich", "starbucks coffee kilmarnock", "starbucks coffee kirkcaldy", "starbucks coffee lancaster", "starbucks coffee leamington spa", "starbucks coffee leeds", "starbucks coffee leicester", "starbucks coffee lincoln", "starbucks coffee liverpool", "starbucks coffee livingston", "starbucks coffee london", "starbucks coffee loughborough", "starbucks coffee luton", "starbucks coffee maidstone", "starbucks coffee manchester", "starbucks coffee middlesbrough", "starbucks coffee milton keynes", "starbucks coffee newcastle", "starbucks coffee newport", "starbucks coffee northampton", "starbucks coffee norwich", "starbucks coffee nottingham", "starbucks coffee nuneaton", "starbucks coffee oxford", "starbucks coffee paisley", "starbucks coffee perth", "starbucks coffee peterborough", "starbucks coffee plymouth", "starbucks coffee poole", "starbucks coffee portsmouth", "starbucks coffee preston", "starbucks coffee reading", "starbucks coffee redditch", "starbucks coffee rotherham", "starbucks coffee rugby", "starbucks coffee salford", "starbucks coffee salisbury", "starbucks coffee scunthorpe", "starbucks coffee sheffield", "starbucks coffee shrewsbury", "starbucks coffee slough", "starbucks coffee solihull", "starbucks coffee southampton", "starbucks coffee southport", "starbucks coffee st albans", "starbucks coffee st helens", "starbucks coffee stafford", "starbucks coffee stirling", "starbucks coffee stoke", "starbucks coffee sunderland", "starbucks coffee swansea", "starbucks coffee swindon", "starbucks coffee tamworth", "starbucks coffee taunton", "starbucks coffee telford", "starbucks coffee torquay", "starbucks coffee wakefield", "starbucks coffee watford", "starbucks coffee westminster", "starbucks coffee weymouth", "starbucks coffee winchester", "starbucks coffee wolverhampton", "starbucks coffee worcester", "starbucks coffee worthing", "starbucks coffee wrexham", "starbucks coffee york", "starbucks drive thru", "starbucks uk", "sticks'n'sushi", "stonegate", "stonegate pub company", "stonehouse pizza", "stonehouse pizza & carvery", "strada", "strada italian", "subway", "subway aberdeen", "subway ayr", "subway bangor", "subway barnsley", "subway basildon", "subway basingstoke", "subway bath", "subway belfast", "subway birkenhead", "subway birmingham", "subway blackburn", "subway blackpool", "subway bournemouth", "subway bradford", "subway bridgend", "subway brighton", "subway bristol", "subway burton", "subway cambridge", "subway cardiff", "subway carlisle", "subway chelmsford", "subway cheltenham", "subway chester", "subway chichester", "subway colchester", "subway coventry", "subway crawley", "subway crewe", "subway cumbernauld", "subway darlington", "subway derby", "subway doncaster", "subway dumfries", "subway dundee", "subway dunfermline", "subway durham", "subway east kilbride", "subway eastbourne", "subway edinburgh", "subway exeter", "subway falkirk", "subway glasgow", "subway gloucester", "subway grimsby", "subway guildford", "subway halifax", "subway hamilton", "subway harrogate", "subway hartlepool", "subway hastings", "subway hereford", "subway huddersfield", "subway hull", "subway inverness", "subway ipswich", "subway kilmarnock", "subway kirkcaldy", "subway lancaster", "subway leamington spa", "subway leeds", "subway leicester", "subway lincoln", "subway liverpool", "subway livingston", "subway london", "subway loughborough", "subway luton", "subway maidstone", "subway manchester", "subway middlesbrough", "subway milton keynes", "subway newcastle", "subway newport", "subway northampton", "subway norwich", "subway nottingham", "subway nuneaton", "subway oxford", "subway paisley", "subway perth", "subway peterborough", "subway plymouth", "subway poole", "subway portsmouth", "subway preston", "subway reading", "subway redditch", "subway rotherham", "subway rugby", "subway salford", "subway salisbury", "subway sandwich", "subway scunthorpe", "subway sheffield", "subway shrewsbury", "subway slough", "subway solihull", "subway southampton", "subway southport", "subway st albans", "subway st helens", "subway stafford", "subway stirling", "subway stoke", "subway store", "subway sunderland", "subway swansea", "subway swindon", "subway tamworth", "subway taunton", "subway telford", "subway torquay", "subway uk", "subway wakefield", "subway watford", "subway westminster", "subway weymouth", "subway winchester", "subway wolverhampton", "subway worcester", "subway worthing", "subway wrexham", "subway york", "sun and anchor", "sushidog", "swiggy", "t.g.i. fridays", "t4 bubble tea", "taco bell", "taco bell drive thru", "taco bell uk", "take a gander", "takeaway", "talabat", "tamatanga", "taproom", "tavern", "tayyabs", "tea room", "texas roadhouse", "tgc bridge", "tgi fridays", "tgi fridays restaurant", "thai square", "the alchemist bar", "the alchemist cocktail", "the alley bubble tea", "the anchor", "the bank statement pub", "the bishop's mill", "the botanist bar", "the cheesecake factory", "the coffee bean & tea leaf", "the cookie people", "the coronary bar", "the coronet", "the coronet pub", "the counting house", "the craft beer co", "the cross keys", "the crosse keys", "the greyfriars", "the ivy", "the ivy asia", "the ivy brasserie", "the ivy cafe", "the ivy collection", "the kernel brewery", "the knights templar", "the leadenhall bar", "the liberty bounds", "the lounge cafe bar", "the metropolitan bar", "the moon under water", "the mossy well", "the old tile works", "the piano works", "the picture house", "the pommelers rest", "the post mess", "the regal moon", "the regal pub", "the rocket pub", "the royal hop pole", "the royal victoria pavilion", "the stamford post", "the standing order", "the standing order pub", "the toll gate", "the velvet coaster", "the winter gardens pub", "thornbridge brewery", "tim hortons", "tim hortons drive thru", "timberyard coffee", "timothy taylor", "timothy taylor pubs", "toby carvery", "tonight josephine", "tonkotsu ramen", "tops pizza", "tortilla", "tortilla mexican", "traditional chippy", "turtle bay", "turtle bay caribbean", "uber *eats", "uber eats", "uber eats pending", "ubereats", "vintage inns", "voodoo ray's", "wadworth brewery", "wadworth pubs", "wagamama", "wagamama aberdeen", "wagamama ayr", "wagamama bangor", "wagamama barnsley", "wagamama basildon", "wagamama basingstoke", "wagamama bath", "wagamama belfast", "wagamama birkenhead", "wagamama birmingham", "wagamama blackburn", "wagamama blackpool", "wagamama bournemouth", "wagamama bradford", "wagamama bridgend", "wagamama brighton", "wagamama bristol", "wagamama burton", "wagamama cambridge", "wagamama cardiff", "wagamama carlisle", "wagamama chelmsford", "wagamama cheltenham", "wagamama chester", "wagamama chichester", "wagamama colchester", "wagamama coventry", "wagamama crawley", "wagamama crewe", "wagamama cumbernauld", "wagamama darlington", "wagamama derby", "wagamama doncaster", "wagamama dumfries", "wagamama dundee", "wagamama dunfermline", "wagamama durham", "wagamama east kilbride", "wagamama eastbourne", "wagamama edinburgh", "wagamama exeter", "wagamama falkirk", "wagamama glasgow", "wagamama gloucester", "wagamama grimsby", "wagamama guildford", "wagamama halifax", "wagamama hamilton", "wagamama harrogate", "wagamama hartlepool", "wagamama hastings", "wagamama hereford", "wagamama huddersfield", "wagamama hull", "wagamama inverness", "wagamama ipswich", "wagamama kilmarnock", "wagamama kirkcaldy", "wagamama lancaster", "wagamama leamington spa", "wagamama leeds", "wagamama leicester", "wagamama lincoln", "wagamama liverpool", "wagamama livingston", "wagamama london", "wagamama loughborough", "wagamama luton", "wagamama maidstone", "wagamama manchester", "wagamama middlesbrough", "wagamama milton keynes", "wagamama newcastle", "wagamama newport", "wagamama noodle", "wagamama northampton", "wagamama norwich", "wagamama nottingham", "wagamama nuneaton", "wagamama oxford", "wagamama paisley", "wagamama perth", "wagamama peterborough", "wagamama plymouth", "wagamama poole", "wagamama portsmouth", "wagamama preston", "wagamama reading", "wagamama redditch", "wagamama rotherham", "wagamama rugby", "wagamama salford", "wagamama salisbury", "wagamama scunthorpe", "wagamama sheffield", "wagamama shrewsbury", "wagamama slough", "wagamama solihull", "wagamama southampton", "wagamama southport", "wagamama st albans", "wagamama st helens", "wagamama stafford", "wagamama stirling", "wagamama stoke", "wagamama sunderland", "wagamama swansea", "wagamama swindon", "wagamama tamworth", "wagamama taunton", "wagamama telford", "wagamama torquay", "wagamama uk", "wagamama wakefield", "wagamama watford", "wagamama westminster", "wagamama weymouth", "wagamama winchester", "wagamama wolverhampton", "wagamama worcester", "wagamama worthing", "wagamama wrexham", "wagamama york", "wahaca", "walkabout", "walkabout pub", "wasabi", "wasabi bento", "wasabi sushi & bento", "wasabi sushi and bento", "watchhouse", "watchhouse coffee", "wendy's", "wendy's drive thru", "wendys", "wendys uk", "wenzel's", "wetherspoon", "wetherspoon aberdeen", "wetherspoon ayr", "wetherspoon bangor", "wetherspoon barnsley", "wetherspoon basildon", "wetherspoon basingstoke", "wetherspoon bath", "wetherspoon belfast", "wetherspoon birkenhead", "wetherspoon birmingham", "wetherspoon blackburn", "wetherspoon blackpool", "wetherspoon bournemouth", "wetherspoon bradford", "wetherspoon bridgend", "wetherspoon brighton", "wetherspoon bristol", "wetherspoon burton", "wetherspoon cambridge", "wetherspoon cardiff", "wetherspoon carlisle", "wetherspoon chelmsford", "wetherspoon cheltenham", "wetherspoon chester", "wetherspoon chichester", "wetherspoon colchester", "wetherspoon coventry", "wetherspoon crawley", "wetherspoon crewe", "wetherspoon cumbernauld", "wetherspoon darlington", "wetherspoon derby", "wetherspoon doncaster", "wetherspoon dumfries", "wetherspoon dundee", "wetherspoon dunfermline", "wetherspoon durham", "wetherspoon east kilbride", "wetherspoon eastbourne", "wetherspoon edinburgh", "wetherspoon exeter", "wetherspoon falkirk", "wetherspoon glasgow", "wetherspoon gloucester", "wetherspoon grimsby", "wetherspoon guildford", "wetherspoon halifax", "wetherspoon hamilton", "wetherspoon harrogate", "wetherspoon hartlepool", "wetherspoon hastings", "wetherspoon hereford", "wetherspoon huddersfield", "wetherspoon hull", "wetherspoon inverness", "wetherspoon ipswich", "wetherspoon kilmarnock", "wetherspoon kirkcaldy", "wetherspoon lancaster", "wetherspoon leamington spa", "wetherspoon leeds", "wetherspoon leicester", "wetherspoon lincoln", "wetherspoon liverpool", "wetherspoon livingston", "wetherspoon london", "wetherspoon loughborough", "wetherspoon luton", "wetherspoon maidstone", "wetherspoon manchester", "wetherspoon middlesbrough", "wetherspoon milton keynes", "wetherspoon newcastle", "wetherspoon newport", "wetherspoon northampton", "wetherspoon norwich", "wetherspoon nottingham", "wetherspoon nuneaton", "wetherspoon oxford", "wetherspoon paisley", "wetherspoon perth", "wetherspoon peterborough", "wetherspoon plymouth", "wetherspoon poole", "wetherspoon portsmouth", "wetherspoon preston", "wetherspoon pub", "wetherspoon reading", "wetherspoon redditch", "wetherspoon rotherham", "wetherspoon rugby", "wetherspoon salford", "wetherspoon salisbury", "wetherspoon scunthorpe", "wetherspoon sheffield", "wetherspoon shrewsbury", "wetherspoon slough", "wetherspoon solihull", "wetherspoon southampton", "wetherspoon southport", "wetherspoon st albans", "wetherspoon st helens", "wetherspoon stafford", "wetherspoon stirling", "wetherspoon stoke", "wetherspoon sunderland", "wetherspoon swansea", "wetherspoon swindon", "wetherspoon tamworth", "wetherspoon taunton", "wetherspoon telford", "wetherspoon torquay", "wetherspoon wakefield", "wetherspoon watford", "wetherspoon westminster", "wetherspoon weymouth", "wetherspoon winchester", "wetherspoon wolverhampton", "wetherspoon worcester", "wetherspoon worthing", "wetherspoon wrexham", "wetherspoon york", "wetherspoons", "whataburger", "whippy", "white hart", "wildwood", "wildwood restaurants", "wimpy", "wingers", "wingstop", "wingstop delivery", "wingstop uk", "wolt enterprises", "xing fu tang", "yard sale pizza", "yates pub", "yauatcha", "yi fang fruit tea", "yo sushi", "yo! sushi", "yo! to go", "young and co", "young's", "young's pub", "young's pubs", "zia lucia", "zizzi", "zizzi restaurants", "zomato", "zuma london"]}, {"id": "shopping", "label": "Shopping, Retail, Tech & Home", "icon": "🛍️", "color": "#ec4899", "keywords": ["& other stories", "11 degrees", "abebooks", "abercrombie", "abercrombie & fitch", "accessorize", "acne studios", "adidas", "adidas store", "adidas uk", "aeg home", "aesop", "agent provocateur", "alexander mcqueen", "ali express", "aliexpress", "all saints", "allsaints", "alpkit", "amazon", "amazon eu", "amazon marketplace", "amazon mktplace", "amazon payments", "amazon.co.uk", "american eagle", "amiri", "amzn", "amzn marketplace", "amzn mktp", "amznmktplace", "and other stories", "animed direct", "ann summers", "ao.com", "apparel", "apple", "apple online store", "apple retail", "apple store", "apple.com", "appliances direct", "argos", "argos aberdeen", "argos ayr", "argos bangor", "argos barnsley", "argos basildon", "argos basingstoke", "argos bath", "argos belfast", "argos birkenhead", "argos birmingham", "argos blackburn", "argos blackpool", "argos bournemouth", "argos bradford", "argos bridgend", "argos brighton", "argos bristol", "argos burton", "argos cambridge", "argos cardiff", "argos carlisle", "argos chelmsford", "argos cheltenham", "argos chester", "argos chichester", "argos colchester", "argos coventry", "argos crawley", "argos crewe", "argos cumbernauld", "argos darlington", "argos derby", "argos doncaster", "argos dumfries", "argos dundee", "argos dunfermline", "argos durham", "argos east kilbride", "argos eastbourne", "argos edinburgh", "argos exeter", "argos falkirk", "argos glasgow", "argos gloucester", "argos grimsby", "argos guildford", "argos halifax", "argos hamilton", "argos harrogate", "argos hartlepool", "argos hastings", "argos hereford", "argos huddersfield", "argos hull", "argos inverness", "argos ipswich", "argos kilmarnock", "argos kirkcaldy", "argos lancaster", "argos leamington spa", "argos leeds", "argos leicester", "argos limited", "argos lincoln", "argos liverpool", "argos livingston", "argos london", "argos loughborough", "argos luton", "argos maidstone", "argos manchester", "argos middlesbrough", "argos milton keynes", "argos newcastle", "argos newport", "argos northampton", "argos norwich", "argos nottingham", "argos nuneaton", "argos oxford", "argos paisley", "argos perth", "argos peterborough", "argos plymouth", "argos poole", "argos portsmouth", "argos preston", "argos reading", "argos redditch", "argos rotherham", "argos rugby", "argos salford", "argos salisbury", "argos scunthorpe", "argos sheffield", "argos shrewsbury", "argos slough", "argos solihull", "argos southampton", "argos southport", "argos st albans", "argos st helens", "argos stafford", "argos stirling", "argos stoke", "argos sunderland", "argos swansea", "argos swindon", "argos tamworth", "argos taunton", "argos telford", "argos torquay", "argos wakefield", "argos watford", "argos westminster", "argos weymouth", "argos winchester", "argos wolverhampton", "argos worcester", "argos worthing", "argos wrexham", "argos york", "argos.co.uk", "arket", "asics", "asos", "asos.com", "awd-it", "b and q", "b&h photo video", "b&m", "b&m bargains", "b&m stores", "b&q", "b&q aberdeen", "b&q ayr", "b&q bangor", "b&q barnsley", "b&q basildon", "b&q basingstoke", "b&q bath", "b&q belfast", "b&q birkenhead", "b&q birmingham", "b&q blackburn", "b&q blackpool", "b&q bournemouth", "b&q bradford", "b&q bridgend", "b&q brighton", "b&q bristol", "b&q burton", "b&q cambridge", "b&q cardiff", "b&q carlisle", "b&q chelmsford", "b&q cheltenham", "b&q chester", "b&q chichester", "b&q colchester", "b&q coventry", "b&q crawley", "b&q crewe", "b&q cumbernauld", "b&q darlington", "b&q derby", "b&q doncaster", "b&q dumfries", "b&q dundee", "b&q dunfermline", "b&q durham", "b&q east kilbride", "b&q eastbourne", "b&q edinburgh", "b&q exeter", "b&q falkirk", "b&q glasgow", "b&q gloucester", "b&q grimsby", "b&q guildford", "b&q halifax", "b&q hamilton", "b&q harrogate", "b&q hartlepool", "b&q hastings", "b&q hereford", "b&q huddersfield", "b&q hull", "b&q inverness", "b&q ipswich", "b&q kilmarnock", "b&q kirkcaldy", "b&q lancaster", "b&q leamington spa", "b&q leeds", "b&q leicester", "b&q lincoln", "b&q liverpool", "b&q livingston", "b&q london", "b&q loughborough", "b&q luton", "b&q maidstone", "b&q manchester", "b&q middlesbrough", "b&q milton keynes", "b&q newcastle", "b&q newport", "b&q northampton", "b&q norwich", "b&q nottingham", "b&q nuneaton", "b&q oxford", "b&q paisley", "b&q perth", "b&q peterborough", "b&q plymouth", "b&q poole", "b&q portsmouth", "b&q preston", "b&q reading", "b&q redditch", "b&q rotherham", "b&q rugby", "b&q salford", "b&q salisbury", "b&q scunthorpe", "b&q sheffield", "b&q shrewsbury", "b&q slough", "b&q solihull", "b&q southampton", "b&q southport", "b&q st albans", "b&q st helens", "b&q stafford", "b&q stirling", "b&q stoke", "b&q sunderland", "b&q swansea", "b&q swindon", "b&q tamworth", "b&q taunton", "b&q telford", "b&q torquay", "b&q wakefield", "b&q watford", "b&q westminster", "b&q weymouth", "b&q winchester", "b&q wolverhampton", "b&q worcester", "b&q worthing", "b&q wrexham", "b&q york", "balenciaga", "balfe's bikes", "balmain", "bang & olufsen", "bape store", "barbour", "barbour clothing", "barker and stonehouse", "bathstore", "battersea shop", "beales department store", "beauty", "beauty bay", "bee inspired", "beko appliances", "belstaff", "ben sherman", "benefit cosmetics", "bensons for beds", "berghaus", "bershka", "best buy", "billionaire boys club", "black & decker", "blacks", "blacks outdoor", "blackwell's", "blackwells bookshop", "bloomingdale's", "blue diamond garden centres", "bm retail", "boden", "boden.co.uk", "bonmarche", "bonmarché", "boohoo", "boohoo.com", "boohooman", "book depository", "books", "boots", "boots aberdeen", "boots ayr", "boots bangor", "boots barnsley", "boots basildon", "boots basingstoke", "boots bath", "boots belfast", "boots birkenhead", "boots birmingham", "boots blackburn", "boots blackpool", "boots bournemouth", "boots bradford", "boots bridgend", "boots brighton", "boots bristol", "boots burton", "boots cambridge", "boots cardiff", "boots carlisle", "boots chelmsford", "boots cheltenham", "boots chester", "boots chichester", "boots colchester", "boots coventry", "boots crawley", "boots crewe", "boots cumbernauld", "boots darlington", "boots derby", "boots doncaster", "boots dumfries", "boots dundee", "boots dunfermline", "boots durham", "boots east kilbride", "boots eastbourne", "boots edinburgh", "boots exeter", "boots falkirk", "boots glasgow", "boots gloucester", "boots grimsby", "boots guildford", "boots halifax", "boots hamilton", "boots harrogate", "boots hartlepool", "boots hastings", "boots hereford", "boots huddersfield", "boots hull", "boots inverness", "boots ipswich", "boots kilmarnock", "boots kirkcaldy", "boots lancaster", "boots leamington spa", "boots leeds", "boots leicester", "boots lincoln", "boots liverpool", "boots livingston", "boots london", "boots loughborough", "boots luton", "boots maidstone", "boots manchester", "boots middlesbrough", "boots milton keynes", "boots newcastle", "boots newport", "boots northampton", "boots norwich", "boots nottingham", "boots nuneaton", "boots oxford", "boots paisley", "boots perth", "boots peterborough", "boots plymouth", "boots poole", "boots portsmouth", "boots preston", "boots reading", "boots redditch", "boots rotherham", "boots rugby", "boots salford", "boots salisbury", "boots scunthorpe", "boots sheffield", "boots shrewsbury", "boots slough", "boots solihull", "boots southampton", "boots southport", "boots st albans", "boots st helens", "boots stafford", "boots stirling", "boots stoke", "boots sunderland", "boots swansea", "boots swindon", "boots tamworth", "boots taunton", "boots telford", "boots torquay", "boots wakefield", "boots watford", "boots westminster", "boots weymouth", "boots winchester", "boots wolverhampton", "boots worcester", "boots worthing", "boots wrexham", "boots york", "bosch home uk", "bose", "bottega veneta", "boux avenue", "box.co.uk", "boyes", "bravissimo", "breitling", "brick lane bikes", "british garden centres", "brompton junction", "browns fashion", "brunello cucinelli", "buildbase", "burberry", "butternut box", "bvlgari", "c&j clark", "calvin klein", "calzedonia", "canada goose", "canon store", "carpetright", "carrs billington", "cartier", "cass art", "castore", "ccl computers", "celine", "cex", "chain reaction cycles", "chanel boutique", "charles tyrwhitt", "charlotte tilbury", "chillblast", "chloe", "christian louboutin", "city plumbing", "clarks", "clarks shoes", "clas ohlson", "clinton cards", "clothing", "club l london", "coach new york", "coast fashion", "cole buxton", "columbia sportswear", "comme des garcons", "condor cycles", "corteiz", "cos", "cos stores", "cosmetics", "cotswold outdoor", "countrywide farmers", "crane & co", "crocs", "crocs uk", "crocus.co.uk", "crosshatch", "cult beauty", "currys", "currys aberdeen", "currys ayr", "currys bangor", "currys barnsley", "currys basildon", "currys basingstoke", "currys bath", "currys belfast", "currys birkenhead", "currys birmingham", "currys blackburn", "currys blackpool", "currys bournemouth", "currys bradford", "currys bridgend", "currys brighton", "currys bristol", "currys burton", "currys cambridge", "currys cardiff", "currys carlisle", "currys chelmsford", "currys cheltenham", "currys chester", "currys chichester", "currys colchester", "currys coventry", "currys crawley", "currys crewe", "currys cumbernauld", "currys darlington", "currys derby", "currys doncaster", "currys dumfries", "currys dundee", "currys dunfermline", "currys durham", "currys east kilbride", "currys eastbourne", "currys edinburgh", "currys exeter", "currys falkirk", "currys glasgow", "currys gloucester", "currys grimsby", "currys guildford", "currys halifax", "currys hamilton", "currys harrogate", "currys hartlepool", "currys hastings", "currys hereford", "currys huddersfield", "currys hull", "currys inverness", "currys ipswich", "currys kilmarnock", "currys kirkcaldy", "currys lancaster", "currys leamington spa", "currys leeds", "currys leicester", "currys lincoln", "currys liverpool", "currys livingston", "currys london", "currys loughborough", "currys luton", "currys maidstone", "currys manchester", "currys middlesbrough", "currys milton keynes", "currys newcastle", "currys newport", "currys northampton", "currys norwich", "currys nottingham", "currys nuneaton", "currys oxford", "currys paisley", "currys pc world", "currys perth", "currys peterborough", "currys plymouth", "currys poole", "currys portsmouth", "currys preston", "currys reading", "currys redditch", "currys rotherham", "currys rugby", "currys salford", "currys salisbury", "currys scunthorpe", "currys sheffield", "currys shrewsbury", "currys slough", "currys solihull", "currys southampton", "currys southport", "currys st albans", "currys st helens", "currys stafford", "currys stirling", "currys stoke", "currys sunderland", "currys swansea", "currys swindon", "currys tamworth", "currys taunton", "currys telford", "currys torquay", "currys wakefield", "currys watford", "currys westminster", "currys weymouth", "currys winchester", "currys wolverhampton", "currys worcester", "currys worthing", "currys wrexham", "currys york", "currys.co.uk", "cvs group", "cyberpowerpc", "daiso", "daisy london", "daunt books", "dawsons department", "de'longhi", "debenhams", "debenhams.com", "decathlon", "decathlon uk", "deichmann", "delonghi", "depop", "depop limited", "derby house", "dewalt uk", "dfs", "dfs furniture", "diesel store", "dillard's", "dior boutique", "diptyque", "dissident clothing", "dixon retail", "diy", "diy.com", "dobbies", "dobbies garden centre", "dobbies garden centres", "doc martens", "dogs trust shop", "dolce & gabbana", "dolce and gabbana", "dormeo", "dover street market", "dowsing & reynolds", "dr martens", "dr. martens", "draper tools", "dreams", "dreams beds", "dsquared2", "dualit", "dune london", "dunelm", "dunelm aberdeen", "dunelm ayr", "dunelm bangor", "dunelm barnsley", "dunelm basildon", "dunelm basingstoke", "dunelm bath", "dunelm belfast", "dunelm birkenhead", "dunelm birmingham", "dunelm blackburn", "dunelm blackpool", "dunelm bournemouth", "dunelm bradford", "dunelm bridgend", "dunelm brighton", "dunelm bristol", "dunelm burton", "dunelm cambridge", "dunelm cardiff", "dunelm carlisle", "dunelm chelmsford", "dunelm cheltenham", "dunelm chester", "dunelm chichester", "dunelm colchester", "dunelm coventry", "dunelm crawley", "dunelm crewe", "dunelm cumbernauld", "dunelm darlington", "dunelm derby", "dunelm doncaster", "dunelm dumfries", "dunelm dundee", "dunelm dunfermline", "dunelm durham", "dunelm east kilbride", "dunelm eastbourne", "dunelm edinburgh", "dunelm exeter", "dunelm falkirk", "dunelm glasgow", "dunelm gloucester", "dunelm grimsby", "dunelm guildford", "dunelm halifax", "dunelm hamilton", "dunelm harrogate", "dunelm hartlepool", "dunelm hastings", "dunelm hereford", "dunelm huddersfield", "dunelm hull", "dunelm inverness", "dunelm ipswich", "dunelm kilmarnock", "dunelm kirkcaldy", "dunelm lancaster", "dunelm leamington spa", "dunelm leeds", "dunelm leicester", "dunelm lincoln", "dunelm liverpool", "dunelm livingston", "dunelm london", "dunelm loughborough", "dunelm luton", "dunelm maidstone", "dunelm manchester", "dunelm middlesbrough", "dunelm mill", "dunelm milton keynes", "dunelm newcastle", "dunelm newport", "dunelm northampton", "dunelm norwich", "dunelm nottingham", "dunelm nuneaton", "dunelm oxford", "dunelm paisley", "dunelm perth", "dunelm peterborough", "dunelm plymouth", "dunelm poole", "dunelm portsmouth", "dunelm preston", "dunelm reading", "dunelm redditch", "dunelm rotherham", "dunelm rugby", "dunelm salford", "dunelm salisbury", "dunelm scunthorpe", "dunelm sheffield", "dunelm shrewsbury", "dunelm slough", "dunelm solihull", "dunelm southampton", "dunelm southport", "dunelm st albans", "dunelm st helens", "dunelm stafford", "dunelm stirling", "dunelm stoke", "dunelm sunderland", "dunelm swansea", "dunelm swindon", "dunelm tamworth", "dunelm taunton", "dunelm telford", "dunelm torquay", "dunelm wakefield", "dunelm watford", "dunelm westminster", "dunelm weymouth", "dunelm winchester", "dunelm wolverhampton", "dunelm worcester", "dunelm worthing", "dunelm wrexham", "dunelm york", "dunelm.com", "dunhill", "dyson", "dyson limited", "ebay", "ebay commerce", "ebuyer", "ebuyer.com", "electronics", "ellis brigham", "emma mattress", "end clothing", "end.", "equiport", "ermenegildo zegna", "escentual", "essentials fear of god", "etsy", "etsy.com", "evans cycles", "eve sleep", "fabletics", "farah vintage", "farfetch", "fashion", "fat face", "fatface", "fear of god", "feelunique", "fendi", "fenty beauty", "fenwick", "flannels", "flannels fashion", "flying tiger", "flying tiger copenhagen", "flymo", "foot locker", "footasylum", "footwear", "forbidden planet", "fortnum & mason", "fortnum and mason", "foyles", "foyles bookshop", "fraser hart", "fred perry", "french connection", "fry's electronics", "furniture", "furniture village", "game stores", "games workshop", "gant", "gap stores", "gap uk", "gardening", "george fisher", "gilly hicks", "givenchy", "glossier", "go outdoors", "goddard veterinary", "golden goose", "goldsmiths jewellers", "goodhood", "gucci", "gumtree", "gym king", "gymshark", "gymshark.com", "h & m", "h&m", "h. samuel", "habitat", "haier appliances", "halfords", "halfords aberdeen", "halfords ayr", "halfords bangor", "halfords barnsley", "halfords basildon", "halfords basingstoke", "halfords bath", "halfords belfast", "halfords birkenhead", "halfords birmingham", "halfords blackburn", "halfords blackpool", "halfords bournemouth", "halfords bradford", "halfords bridgend", "halfords brighton", "halfords bristol", "halfords burton", "halfords cambridge", "halfords cardiff", "halfords carlisle", "halfords chelmsford", "halfords cheltenham", "halfords chester", "halfords chichester", "halfords colchester", "halfords coventry", "halfords crawley", "halfords crewe", "halfords cumbernauld", "halfords cycle", "halfords darlington", "halfords derby", "halfords doncaster", "halfords dumfries", "halfords dundee", "halfords dunfermline", "halfords durham", "halfords east kilbride", "halfords eastbourne", "halfords edinburgh", "halfords exeter", "halfords falkirk", "halfords glasgow", "halfords gloucester", "halfords grimsby", "halfords guildford", "halfords halifax", "halfords hamilton", "halfords harrogate", "halfords hartlepool", "halfords hastings", "halfords hereford", "halfords huddersfield", "halfords hull", "halfords inverness", "halfords ipswich", "halfords kilmarnock", "halfords kirkcaldy", "halfords lancaster", "halfords leamington spa", "halfords leeds", "halfords leicester", "halfords lincoln", "halfords liverpool", "halfords livingston", "halfords london", "halfords loughborough", "halfords luton", "halfords maidstone", "halfords manchester", "halfords middlesbrough", "halfords milton keynes", "halfords newcastle", "halfords newport", "halfords northampton", "halfords norwich", "halfords nottingham", "halfords nuneaton", "halfords oxford", "halfords paisley", "halfords perth", "halfords peterborough", "halfords plymouth", "halfords poole", "halfords portsmouth", "halfords preston", "halfords reading", "halfords redditch", "halfords retail", "halfords rotherham", "halfords rugby", "halfords salford", "halfords salisbury", "halfords scunthorpe", "halfords sheffield", "halfords shrewsbury", "halfords slough", "halfords solihull", "halfords southampton", "halfords southport", "halfords st albans", "halfords st helens", "halfords stafford", "halfords stirling", "halfords stoke", "halfords sunderland", "halfords swansea", "halfords swindon", "halfords tamworth", "halfords taunton", "halfords telford", "halfords torquay", "halfords wakefield", "halfords watford", "halfords westminster", "halfords weymouth", "halfords winchester", "halfords wolverhampton", "halfords worcester", "halfords worthing", "halfords wrexham", "halfords york", "hamleys toys", "hardware", "harrods", "harrods knightsbridge", "harvey nichols", "hawes & curtis", "heal's", "helly hansen", "henry vac", "hermes", "hisense uk", "hm.com", "hobbs london", "hobbycraft", "hollister", "hollister co", "home bargains", "homebase", "homesense", "homeware", "hoodrich", "hotpoint", "house of fraser", "husqvarna uk", "ideal world shopping", "ikea", "ikea limited", "ikea.com", "illusive london", "ingatestone saddlery", "intimissimi", "isabel marant", "isawitfirst", "ivc evidensia", "jack wills", "jacquemus", "jcp", "jcpenney", "jd sports", "jd sports aberdeen", "jd sports ayr", "jd sports bangor", "jd sports barnsley", "jd sports basildon", "jd sports basingstoke", "jd sports bath", "jd sports belfast", "jd sports birkenhead", "jd sports birmingham", "jd sports blackburn", "jd sports blackpool", "jd sports bournemouth", "jd sports bradford", "jd sports bridgend", "jd sports brighton", "jd sports bristol", "jd sports burton", "jd sports cambridge", "jd sports cardiff", "jd sports carlisle", "jd sports chelmsford", "jd sports cheltenham", "jd sports chester", "jd sports chichester", "jd sports colchester", "jd sports coventry", "jd sports crawley", "jd sports crewe", "jd sports cumbernauld", "jd sports darlington", "jd sports derby", "jd sports doncaster", "jd sports dumfries", "jd sports dundee", "jd sports dunfermline", "jd sports durham", "jd sports east kilbride", "jd sports eastbourne", "jd sports edinburgh", "jd sports exeter", "jd sports falkirk", "jd sports fashion", "jd sports glasgow", "jd sports gloucester", "jd sports grimsby", "jd sports guildford", "jd sports halifax", "jd sports hamilton", "jd sports harrogate", "jd sports hartlepool", "jd sports hastings", "jd sports hereford", "jd sports huddersfield", "jd sports hull", "jd sports inverness", "jd sports ipswich", "jd sports kilmarnock", "jd sports kirkcaldy", "jd sports lancaster", "jd sports leamington spa", "jd sports leeds", "jd sports leicester", "jd sports lincoln", "jd sports liverpool", "jd sports livingston", "jd sports london", "jd sports loughborough", "jd sports luton", "jd sports maidstone", "jd sports manchester", "jd sports middlesbrough", "jd sports milton keynes", "jd sports newcastle", "jd sports newport", "jd sports northampton", "jd sports norwich", "jd sports nottingham", "jd sports nuneaton", "jd sports oxford", "jd sports paisley", "jd sports perth", "jd sports peterborough", "jd sports plymouth", "jd sports poole", "jd sports portsmouth", "jd sports preston", "jd sports reading", "jd sports redditch", "jd sports rotherham", "jd sports rugby", "jd sports salford", "jd sports salisbury", "jd sports scunthorpe", "jd sports sheffield", "jd sports shrewsbury", "jd sports slough", "jd sports solihull", "jd sports southampton", "jd sports southport", "jd sports st albans", "jd sports st helens", "jd sports stafford", "jd sports stirling", "jd sports stoke", "jd sports sunderland", "jd sports swansea", "jd sports swindon", "jd sports tamworth", "jd sports taunton", "jd sports telford", "jd sports torquay", "jd sports wakefield", "jd sports watford", "jd sports westminster", "jd sports weymouth", "jd sports winchester", "jd sports wolverhampton", "jd sports worcester", "jd sports worthing", "jd sports wrexham", "jd sports york", "jessops", "jewson", "jigsaw clothing", "jil sander", "jo malone", "jo malone london", "john lewis", "john lewis & partners", "johnlewis.com", "jollyes", "jollyes pet superstore", "jones bootmaker", "joules", "joules clothing", "justmylook", "karcher uk", "karen millen", "katkin", "kenwood appliances", "kenzo", "kiehl's", "kiko milano", "kings will dream", "kitchenaid", "kmart", "knipex tools", "kohl's", "kohls", "kurt geiger", "kärcher", "l'occitane", "lakeland", "lakeland limited", "lambretta clothing", "lanvin", "ld mountain centre", "le creuset", "le creuset uk", "lego.com", "leisure lakes bikes", "levi's", "levis store", "liberty", "liberty london", "lily's kitchen", "lindt", "littlewoods", "loaf", "loaf furniture", "loewe", "london graphic centre", "lookfantastic", "loro piana", "louis vuitton", "luisaviaroma", "luke 1977", "lululemon", "lululemon athletica", "lush", "lush cosmetics", "lush fresh handmade", "lyle & scott", "m&s", "mac cosmetics", "macy's", "macys.com", "made.com", "magimix", "magnet", "maison margiela", "makita uk", "mango", "mango.com", "maniere de voir", "maplin", "mappin & webb", "marks & spencer", "marks and spencer", "marks spencer", "marks&spencer", "marni", "marshall artist", "massimo dutti", "matalan", "matalan retail", "matchesfashion", "mattressman", "max mara", "medicanimal", "medivet", "merc london", "merlin cycles", "mesh computers", "meshki", "micro center", "miele gallery", "millets", "milwaukee tool uk", "miniso", "miniso uk", "mint velvet", "missguided", "missoma", "miu miu", "mole valley farmers", "molton brown", "moncler", "monki", "monsoon", "monsoon accessorize", "monster pet", "monster pet supplies", "morleys department store", "morphe cosmetics", "moschino", "moss bros", "motel rocks", "mountain warehouse", "mountfield lawnmowers", "mr porter", "muji", "muji online", "mulberry", "myla london", "mypet", "mytheresa", "nasty gal", "naylors equestrian", "needle sports", "neff home", "nespresso", "nespresso boutique", "net-a-porter", "new balance", "new look", "new look retail", "newegg", "next", "next directory", "next online", "next retail", "nicce", "nike", "nike store", "nike.com", "nikon store", "ninja kitchen", "nordstrom", "nordstrom rack", "notcutts", "notcutts garden", "novatech", "numatic international", "oak furnitureland", "off-white", "office shoes", "offspring shoes", "oh polly", "oliver bonas", "omega boutique", "original penguin", "overclockers", "overclockers uk", "oxfam books", "palm angels", "pandora jewelry", "patagonia", "patch plants", "paul smith", "pc world", "pcspecialist", "pdsa", "pdsa charity shop", "peaceful hooligan", "peacocks", "peacocks stores", "pearson 1860", "penhaligon's", "perfume", "perfume click", "pet planet", "peter jones sloane square", "pets at home", "pets at home aberdeen", "pets at home ayr", "pets at home bangor", "pets at home barnsley", "pets at home basildon", "pets at home basingstoke", "pets at home bath", "pets at home belfast", "pets at home birkenhead", "pets at home birmingham", "pets at home blackburn", "pets at home blackpool", "pets at home bournemouth", "pets at home bradford", "pets at home bridgend", "pets at home brighton", "pets at home bristol", "pets at home burton", "pets at home cambridge", "pets at home cardiff", "pets at home carlisle", "pets at home chelmsford", "pets at home cheltenham", "pets at home chester", "pets at home chichester", "pets at home colchester", "pets at home coventry", "pets at home crawley", "pets at home crewe", "pets at home cumbernauld", "pets at home darlington", "pets at home derby", "pets at home doncaster", "pets at home dumfries", "pets at home dundee", "pets at home dunfermline", "pets at home durham", "pets at home east kilbride", "pets at home eastbourne", "pets at home edinburgh", "pets at home exeter", "pets at home falkirk", "pets at home glasgow", "pets at home gloucester", "pets at home grimsby", "pets at home guildford", "pets at home halifax", "pets at home hamilton", "pets at home harrogate", "pets at home hartlepool", "pets at home hastings", "pets at home hereford", "pets at home huddersfield", "pets at home hull", "pets at home inverness", "pets at home ipswich", "pets at home kilmarnock", "pets at home kirkcaldy", "pets at home lancaster", "pets at home leamington spa", "pets at home leeds", "pets at home leicester", "pets at home lincoln", "pets at home liverpool", "pets at home livingston", "pets at home london", "pets at home loughborough", "pets at home ltd", "pets at home luton", "pets at home maidstone", "pets at home manchester", "pets at home middlesbrough", "pets at home milton keynes", "pets at home newcastle", "pets at home newport", "pets at home northampton", "pets at home norwich", "pets at home nottingham", "pets at home nuneaton", "pets at home oxford", "pets at home paisley", "pets at home perth", "pets at home peterborough", "pets at home plymouth", "pets at home poole", "pets at home portsmouth", "pets at home preston", "pets at home reading", "pets at home redditch", "pets at home rotherham", "pets at home rugby", "pets at home salford", "pets at home salisbury", "pets at home scunthorpe", "pets at home sheffield", "pets at home shrewsbury", "pets at home slough", "pets at home solihull", "pets at home southampton", "pets at home southport", "pets at home st albans", "pets at home st helens", "pets at home stafford", "pets at home stirling", "pets at home stoke", "pets at home sunderland", "pets at home swansea", "pets at home swindon", "pets at home tamworth", "pets at home taunton", "pets at home telford", "pets at home torquay", "pets at home wakefield", "pets at home watford", "pets at home westminster", "pets at home weymouth", "pets at home winchester", "pets at home wolverhampton", "pets at home worcester", "pets at home worthing", "pets at home wrexham", "pets at home york", "pets corner", "phase eight", "plants", "plumb center", "polo ralph lauren", "poundland", "poundland limited", "prada", "prettylittlething", "primark", "primark aberdeen", "primark ayr", "primark bangor", "primark barnsley", "primark basildon", "primark basingstoke", "primark bath", "primark belfast", "primark birkenhead", "primark birmingham", "primark blackburn", "primark blackpool", "primark bournemouth", "primark bradford", "primark bridgend", "primark brighton", "primark bristol", "primark burton", "primark cambridge", "primark cardiff", "primark carlisle", "primark chelmsford", "primark cheltenham", "primark chester", "primark chichester", "primark colchester", "primark coventry", "primark crawley", "primark crewe", "primark cumbernauld", "primark darlington", "primark derby", "primark doncaster", "primark dumfries", "primark dundee", "primark dunfermline", "primark durham", "primark east kilbride", "primark eastbourne", "primark edinburgh", "primark exeter", "primark falkirk", "primark glasgow", "primark gloucester", "primark grimsby", "primark guildford", "primark halifax", "primark hamilton", "primark harrogate", "primark hartlepool", "primark hastings", "primark hereford", "primark huddersfield", "primark hull", "primark inverness", "primark ipswich", "primark kilmarnock", "primark kirkcaldy", "primark lancaster", "primark leamington spa", "primark leeds", "primark leicester", "primark lincoln", "primark liverpool", "primark livingston", "primark london", "primark loughborough", "primark luton", "primark maidstone", "primark manchester", "primark middlesbrough", "primark milton keynes", "primark newcastle", "primark newport", "primark northampton", "primark norwich", "primark nottingham", "primark nuneaton", "primark oxford", "primark paisley", "primark perth", "primark peterborough", "primark plymouth", "primark poole", "primark portsmouth", "primark preston", "primark reading", "primark redditch", "primark rotherham", "primark rugby", "primark salford", "primark salisbury", "primark scunthorpe", "primark sheffield", "primark shrewsbury", "primark slough", "primark solihull", "primark southampton", "primark southport", "primark st albans", "primark st helens", "primark stafford", "primark stirling", "primark stoke", "primark stores", "primark sunderland", "primark swansea", "primark swindon", "primark tamworth", "primark taunton", "primark telford", "primark torquay", "primark wakefield", "primark watford", "primark westminster", "primark weymouth", "primark winchester", "primark wolverhampton", "primark worcester", "primark worthing", "primark wrexham", "primark york", "procook", "procook limited", "pull and bear", "pull&bear", "puma store", "qvc uk", "raleigh bikes uk", "ralph lauren", "reebok", "reiss", "reiss limited", "represent clo", "republic of cats", "rhs", "rhs plants", "rhude", "ribble cycles", "richer sounds", "ride-away equestrian", "rituals cosmetics", "river island", "river island clothing", "robert dyas", "robert dyas limited", "robingreeting", "robinsons equestrian", "rolex boutique", "roman originals", "roys of wroxham department store", "rspca", "rspca charity", "runners need", "russell & bromley", "rutland cycling", "ryman", "ryobi tools", "sage appliances", "saint laurent", "saks fifth avenue", "saks off 5th", "saltrock", "salvatore ferragamo", "samsung", "samsung electronics", "samsung.com", "sarah raven", "savers", "savers health and beauty", "scan computers", "scan.co.uk", "scats countrystores", "schuh", "schuh limited", "screwfix", "screwfix aberdeen", "screwfix ayr", "screwfix bangor", "screwfix barnsley", "screwfix basildon", "screwfix basingstoke", "screwfix bath", "screwfix belfast", "screwfix birkenhead", "screwfix birmingham", "screwfix blackburn", "screwfix blackpool", "screwfix bournemouth", "screwfix bradford", "screwfix bridgend", "screwfix brighton", "screwfix bristol", "screwfix burton", "screwfix cambridge", "screwfix cardiff", "screwfix carlisle", "screwfix chelmsford", "screwfix cheltenham", "screwfix chester", "screwfix chichester", "screwfix colchester", "screwfix coventry", "screwfix crawley", "screwfix crewe", "screwfix cumbernauld", "screwfix darlington", "screwfix derby", "screwfix direct", "screwfix doncaster", "screwfix dumfries", "screwfix dundee", "screwfix dunfermline", "screwfix durham", "screwfix east kilbride", "screwfix eastbourne", "screwfix edinburgh", "screwfix exeter", "screwfix falkirk", "screwfix glasgow", "screwfix gloucester", "screwfix grimsby", "screwfix guildford", "screwfix halifax", "screwfix hamilton", "screwfix harrogate", "screwfix hartlepool", "screwfix hastings", "screwfix hereford", "screwfix huddersfield", "screwfix hull", "screwfix inverness", "screwfix ipswich", "screwfix kilmarnock", "screwfix kirkcaldy", "screwfix lancaster", "screwfix leamington spa", "screwfix leeds", "screwfix leicester", "screwfix lincoln", "screwfix liverpool", "screwfix livingston", "screwfix london", "screwfix loughborough", "screwfix luton", "screwfix maidstone", "screwfix manchester", "screwfix middlesbrough", "screwfix milton keynes", "screwfix newcastle", "screwfix newport", "screwfix northampton", "screwfix norwich", "screwfix nottingham", "screwfix nuneaton", "screwfix oxford", "screwfix paisley", "screwfix perth", "screwfix peterborough", "screwfix plymouth", "screwfix poole", "screwfix portsmouth", "screwfix preston", "screwfix reading", "screwfix redditch", "screwfix rotherham", "screwfix rugby", "screwfix salford", "screwfix salisbury", "screwfix scunthorpe", "screwfix sheffield", "screwfix shrewsbury", "screwfix slough", "screwfix solihull", "screwfix southampton", "screwfix southport", "screwfix st albans", "screwfix st helens", "screwfix stafford", "screwfix stirling", "screwfix stoke", "screwfix sunderland", "screwfix swansea", "screwfix swindon", "screwfix tamworth", "screwfix taunton", "screwfix telford", "screwfix torquay", "screwfix wakefield", "screwfix watford", "screwfix westminster", "screwfix weymouth", "screwfix winchester", "screwfix wolverhampton", "screwfix worcester", "screwfix worthing", "screwfix wrexham", "screwfix york", "scribbler cards", "scrumbles", "scs", "scs sofas", "sears", "seasalt", "seasalt cornwall", "selco", "selco builders warehouse", "selfridges", "selfridges & co", "sennheiser", "sephora", "sephora uk", "sevenstore", "shark clean", "shark ninja", "sharkninja", "shein", "shein uk", "shoes", "siemens home uk", "sigma sports", "siksilk", "simba sleep", "sinners attire", "size?", "size? shoes", "skechers", "skechers usa", "slater menswear", "smeg store", "smyths toys superstores", "sneakersnstuff", "snow and rock", "snow+rock", "sofology", "solebox", "sonos", "sony store", "space nk", "specialized bicycle", "sports direct", "sports direct aberdeen", "sports direct ayr", "sports direct bangor", "sports direct barnsley", "sports direct basildon", "sports direct basingstoke", "sports direct bath", "sports direct belfast", "sports direct birkenhead", "sports direct birmingham", "sports direct blackburn", "sports direct blackpool", "sports direct bournemouth", "sports direct bradford", "sports direct bridgend", "sports direct brighton", "sports direct bristol", "sports direct burton", "sports direct cambridge", "sports direct cardiff", "sports direct carlisle", "sports direct chelmsford", "sports direct cheltenham", "sports direct chester", "sports direct chichester", "sports direct colchester", "sports direct coventry", "sports direct crawley", "sports direct crewe", "sports direct cumbernauld", "sports direct darlington", "sports direct derby", "sports direct doncaster", "sports direct dumfries", "sports direct dundee", "sports direct dunfermline", "sports direct durham", "sports direct east kilbride", "sports direct eastbourne", "sports direct edinburgh", "sports direct exeter", "sports direct falkirk", "sports direct glasgow", "sports direct gloucester", "sports direct grimsby", "sports direct guildford", "sports direct halifax", "sports direct hamilton", "sports direct harrogate", "sports direct hartlepool", "sports direct hastings", "sports direct hereford", "sports direct huddersfield", "sports direct hull", "sports direct inverness", "sports direct ipswich", "sports direct kilmarnock", "sports direct kirkcaldy", "sports direct lancaster", "sports direct leamington spa", "sports direct leeds", "sports direct leicester", "sports direct lincoln", "sports direct liverpool", "sports direct livingston", "sports direct london", "sports direct loughborough", "sports direct luton", "sports direct maidstone", "sports direct manchester", "sports direct middlesbrough", "sports direct milton keynes", "sports direct newcastle", "sports direct newport", "sports direct northampton", "sports direct norwich", "sports direct nottingham", "sports direct nuneaton", "sports direct oxford", "sports direct paisley", "sports direct perth", "sports direct peterborough", "sports direct plymouth", "sports direct poole", "sports direct portsmouth", "sports direct preston", "sports direct reading", "sports direct redditch", "sports direct rotherham", "sports direct rugby", "sports direct salford", "sports direct salisbury", "sports direct scunthorpe", "sports direct sheffield", "sports direct shrewsbury", "sports direct slough", "sports direct solihull", "sports direct southampton", "sports direct southport", "sports direct st albans", "sports direct st helens", "sports direct stafford", "sports direct stirling", "sports direct stoke", "sports direct sunderland", "sports direct swansea", "sports direct swindon", "sports direct tamworth", "sports direct taunton", "sports direct telford", "sports direct torquay", "sports direct wakefield", "sports direct watford", "sports direct westminster", "sports direct weymouth", "sports direct winchester", "sports direct wolverhampton", "sports direct worcester", "sports direct worthing", "sports direct wrexham", "sports direct york", "sportsdirect.com", "squires garden centres", "ssense", "st stephens shopping", "st stephens shopping c", "stanley tools uk", "stationery", "stella mccartney", "stihl uk", "stone island", "stradivarius", "suit direct", "superdrug", "superdrug aberdeen", "superdrug ayr", "superdrug bangor", "superdrug barnsley", "superdrug basildon", "superdrug basingstoke", "superdrug bath", "superdrug belfast", "superdrug birkenhead", "superdrug birmingham", "superdrug blackburn", "superdrug blackpool", "superdrug bournemouth", "superdrug bradford", "superdrug bridgend", "superdrug brighton", "superdrug bristol", "superdrug burton", "superdrug cambridge", "superdrug cardiff", "superdrug carlisle", "superdrug chelmsford", "superdrug cheltenham", "superdrug chester", "superdrug chichester", "superdrug colchester", "superdrug coventry", "superdrug crawley", "superdrug crewe", "superdrug cumbernauld", "superdrug darlington", "superdrug derby", "superdrug doncaster", "superdrug dumfries", "superdrug dundee", "superdrug dunfermline", "superdrug durham", "superdrug east kilbride", "superdrug eastbourne", "superdrug edinburgh", "superdrug exeter", "superdrug falkirk", "superdrug glasgow", "superdrug gloucester", "superdrug grimsby", "superdrug guildford", "superdrug halifax", "superdrug hamilton", "superdrug harrogate", "superdrug hartlepool", "superdrug hastings", "superdrug hereford", "superdrug huddersfield", "superdrug hull", "superdrug inverness", "superdrug ipswich", "superdrug kilmarnock", "superdrug kirkcaldy", "superdrug lancaster", "superdrug leamington spa", "superdrug leeds", "superdrug leicester", "superdrug lincoln", "superdrug liverpool", "superdrug livingston", "superdrug london", "superdrug loughborough", "superdrug luton", "superdrug maidstone", "superdrug manchester", "superdrug middlesbrough", "superdrug milton keynes", "superdrug newcastle", "superdrug newport", "superdrug northampton", "superdrug norwich", "superdrug nottingham", "superdrug nuneaton", "superdrug oxford", "superdrug paisley", "superdrug perth", "superdrug peterborough", "superdrug plymouth", "superdrug poole", "superdrug portsmouth", "superdrug preston", "superdrug reading", "superdrug redditch", "superdrug rotherham", "superdrug rugby", "superdrug salford", "superdrug salisbury", "superdrug scunthorpe", "superdrug sheffield", "superdrug shrewsbury", "superdrug slough", "superdrug solihull", "superdrug southampton", "superdrug southport", "superdrug st albans", "superdrug st helens", "superdrug stafford", "superdrug stirling", "superdrug stoke", "superdrug sunderland", "superdrug swansea", "superdrug swindon", "superdrug tamworth", "superdrug taunton", "superdrug telford", "superdrug torquay", "superdrug wakefield", "superdrug watford", "superdrug westminster", "superdrug weymouth", "superdrug winchester", "superdrug wolverhampton", "superdrug worcester", "superdrug worthing", "superdrug wrexham", "superdrug york", "superdry", "superdry.com", "sweaty betty", "t.m. lewin", "tag heuer", "tails.com", "tapi carpets", "target", "target stores", "target.com", "ted baker", "tempur", "temu", "temu.com", "the body shop", "the climbers shop", "the fragrance shop", "the north face", "the outnet", "the perfume shop", "the range", "the range aberdeen", "the range ayr", "the range bangor", "the range barnsley", "the range basildon", "the range basingstoke", "the range bath", "the range belfast", "the range birkenhead", "the range birmingham", "the range blackburn", "the range blackpool", "the range bournemouth", "the range bradford", "the range bridgend", "the range brighton", "the range bristol", "the range burton", "the range cambridge", "the range cardiff", "the range carlisle", "the range chelmsford", "the range cheltenham", "the range chester", "the range chichester", "the range colchester", "the range coventry", "the range craft", "the range crawley", "the range crewe", "the range cumbernauld", "the range darlington", "the range derby", "the range doncaster", "the range dumfries", "the range dundee", "the range dunfermline", "the range durham", "the range east kilbride", "the range eastbourne", "the range edinburgh", "the range exeter", "the range falkirk", "the range glasgow", "the range gloucester", "the range grimsby", "the range guildford", "the range halifax", "the range hamilton", "the range harrogate", "the range hartlepool", "the range hastings", "the range hereford", "the range home and leisure", "the range huddersfield", "the range hull", "the range inverness", "the range ipswich", "the range kilmarnock", "the range kirkcaldy", "the range lancaster", "the range leamington spa", "the range leeds", "the range leicester", "the range lincoln", "the range liverpool", "the range livingston", "the range london", "the range loughborough", "the range luton", "the range maidstone", "the range manchester", "the range middlesbrough", "the range milton keynes", "the range newcastle", "the range newport", "the range northampton", "the range norwich", "the range nottingham", "the range nuneaton", "the range oxford", "the range paisley", "the range perth", "the range peterborough", "the range plymouth", "the range poole", "the range portsmouth", "the range preston", "the range reading", "the range redditch", "the range rotherham", "the range rugby", "the range salford", "the range salisbury", "the range scunthorpe", "the range sheffield", "the range shrewsbury", "the range slough", "the range solihull", "the range southampton", "the range southport", "the range st albans", "the range st helens", "the range stafford", "the range stirling", "the range stoke", "the range sunderland", "the range swansea", "the range swindon", "the range tamworth", "the range taunton", "the range telford", "the range torquay", "the range wakefield", "the range watford", "the range westminster", "the range weymouth", "the range winchester", "the range wolverhampton", "the range worcester", "the range worthing", "the range wrexham", "the range york", "the row", "the works", "the works stores", "thompson & morgan", "tiktok shop", "tile giant", "timberland", "tiso outdoor", "tj morris", "tk maxx", "tk maxx aberdeen", "tk maxx ayr", "tk maxx bangor", "tk maxx barnsley", "tk maxx basildon", "tk maxx basingstoke", "tk maxx bath", "tk maxx belfast", "tk maxx birkenhead", "tk maxx birmingham", "tk maxx blackburn", "tk maxx blackpool", "tk maxx bournemouth", "tk maxx bradford", "tk maxx bridgend", "tk maxx brighton", "tk maxx bristol", "tk maxx burton", "tk maxx cambridge", "tk maxx cardiff", "tk maxx carlisle", "tk maxx chelmsford", "tk maxx cheltenham", "tk maxx chester", "tk maxx chichester", "tk maxx colchester", "tk maxx coventry", "tk maxx crawley", "tk maxx crewe", "tk maxx cumbernauld", "tk maxx darlington", "tk maxx derby", "tk maxx doncaster", "tk maxx dumfries", "tk maxx dundee", "tk maxx dunfermline", "tk maxx durham", "tk maxx east kilbride", "tk maxx eastbourne", "tk maxx edinburgh", "tk maxx exeter", "tk maxx falkirk", "tk maxx glasgow", "tk maxx gloucester", "tk maxx grimsby", "tk maxx guildford", "tk maxx halifax", "tk maxx hamilton", "tk maxx harrogate", "tk maxx hartlepool", "tk maxx hastings", "tk maxx hereford", "tk maxx huddersfield", "tk maxx hull", "tk maxx inverness", "tk maxx ipswich", "tk maxx kilmarnock", "tk maxx kirkcaldy", "tk maxx lancaster", "tk maxx leamington spa", "tk maxx leeds", "tk maxx leicester", "tk maxx lincoln", "tk maxx liverpool", "tk maxx livingston", "tk maxx london", "tk maxx loughborough", "tk maxx luton", "tk maxx maidstone", "tk maxx manchester", "tk maxx middlesbrough", "tk maxx milton keynes", "tk maxx newcastle", "tk maxx newport", "tk maxx northampton", "tk maxx norwich", "tk maxx nottingham", "tk maxx nuneaton", "tk maxx oxford", "tk maxx paisley", "tk maxx perth", "tk maxx peterborough", "tk maxx plymouth", "tk maxx poole", "tk maxx portsmouth", "tk maxx preston", "tk maxx reading", "tk maxx redditch", "tk maxx rotherham", "tk maxx rugby", "tk maxx salford", "tk maxx salisbury", "tk maxx scunthorpe", "tk maxx sheffield", "tk maxx shrewsbury", "tk maxx slough", "tk maxx solihull", "tk maxx southampton", "tk maxx southport", "tk maxx st albans", "tk maxx st helens", "tk maxx stafford", "tk maxx stirling", "tk maxx stoke", "tk maxx sunderland", "tk maxx swansea", "tk maxx swindon", "tk maxx tamworth", "tk maxx taunton", "tk maxx telford", "tk maxx torquay", "tk maxx wakefield", "tk maxx watford", "tk maxx westminster", "tk maxx weymouth", "tk maxx winchester", "tk maxx wolverhampton", "tk maxx worcester", "tk maxx worthing", "tk maxx wrexham", "tk maxx york", "tkmaxx", "tm lewin", "tod's", "tokyo laundry", "tom ford", "tommy hilfiger", "toolstation", "toolstation aberdeen", "toolstation ayr", "toolstation bangor", "toolstation barnsley", "toolstation basildon", "toolstation basingstoke", "toolstation bath", "toolstation belfast", "toolstation birkenhead", "toolstation birmingham", "toolstation blackburn", "toolstation blackpool", "toolstation bournemouth", "toolstation bradford", "toolstation bridgend", "toolstation brighton", "toolstation bristol", "toolstation burton", "toolstation cambridge", "toolstation cardiff", "toolstation carlisle", "toolstation chelmsford", "toolstation cheltenham", "toolstation chester", "toolstation chichester", "toolstation colchester", "toolstation coventry", "toolstation crawley", "toolstation crewe", "toolstation cumbernauld", "toolstation darlington", "toolstation derby", "toolstation doncaster", "toolstation dumfries", "toolstation dundee", "toolstation dunfermline", "toolstation durham", "toolstation east kilbride", "toolstation eastbourne", "toolstation edinburgh", "toolstation exeter", "toolstation falkirk", "toolstation glasgow", "toolstation gloucester", "toolstation grimsby", "toolstation guildford", "toolstation halifax", "toolstation hamilton", "toolstation harrogate", "toolstation hartlepool", "toolstation hastings", "toolstation hereford", "toolstation huddersfield", "toolstation hull", "toolstation inverness", "toolstation ipswich", "toolstation kilmarnock", "toolstation kirkcaldy", "toolstation lancaster", "toolstation leamington spa", "toolstation leeds", "toolstation leicester", "toolstation lincoln", "toolstation liverpool", "toolstation livingston", "toolstation london", "toolstation loughborough", "toolstation luton", "toolstation maidstone", "toolstation manchester", "toolstation middlesbrough", "toolstation milton keynes", "toolstation newcastle", "toolstation newport", "toolstation northampton", "toolstation norwich", "toolstation nottingham", "toolstation nuneaton", "toolstation oxford", "toolstation paisley", "toolstation perth", "toolstation peterborough", "toolstation plymouth", "toolstation poole", "toolstation portsmouth", "toolstation preston", "toolstation reading", "toolstation redditch", "toolstation rotherham", "toolstation rugby", "toolstation salford", "toolstation salisbury", "toolstation scunthorpe", "toolstation sheffield", "toolstation shrewsbury", "toolstation slough", "toolstation solihull", "toolstation southampton", "toolstation southport", "toolstation st albans", "toolstation st helens", "toolstation stafford", "toolstation stirling", "toolstation stoke", "toolstation sunderland", "toolstation swansea", "toolstation swindon", "toolstation tamworth", "toolstation taunton", "toolstation telford", "toolstation torquay", "toolstation wakefield", "toolstation watford", "toolstation westminster", "toolstation weymouth", "toolstation winchester", "toolstation wolverhampton", "toolstation worcester", "toolstation worthing", "toolstation wrexham", "toolstation york", "toolstop", "topps tiles", "trainer", "trapstar", "trapstar london", "travelling man", "travis perkins", "tredz bikes", "trek bicycle", "trespass clothing", "trojan clothing", "uk storefront", "under armour", "uniqlo", "uniqlo uk", "urban outfitters", "valentino", "vax limited", "versace", "very", "very.co.uk", "vet", "vets4pets", "vetuk", "victoria plum", "victoria's secret", "victorian plumbing", "vinted", "vinted uk", "vivienne westwood", "w h smith", "wal-mart", "walmart", "walmart.com", "warhammer", "watch", "watches of switzerland", "watercooling uk", "waterstones", "waterstones aberdeen", "waterstones ayr", "waterstones bangor", "waterstones barnsley", "waterstones basildon", "waterstones basingstoke", "waterstones bath", "waterstones belfast", "waterstones birkenhead", "waterstones birmingham", "waterstones blackburn", "waterstones blackpool", "waterstones booksellers", "waterstones bournemouth", "waterstones bradford", "waterstones bridgend", "waterstones brighton", "waterstones bristol", "waterstones burton", "waterstones cambridge", "waterstones cardiff", "waterstones carlisle", "waterstones chelmsford", "waterstones cheltenham", "waterstones chester", "waterstones chichester", "waterstones colchester", "waterstones coventry", "waterstones crawley", "waterstones crewe", "waterstones cumbernauld", "waterstones darlington", "waterstones derby", "waterstones doncaster", "waterstones dumfries", "waterstones dundee", "waterstones dunfermline", "waterstones durham", "waterstones east kilbride", "waterstones eastbourne", "waterstones edinburgh", "waterstones exeter", "waterstones falkirk", "waterstones glasgow", "waterstones gloucester", "waterstones grimsby", "waterstones guildford", "waterstones halifax", "waterstones hamilton", "waterstones harrogate", "waterstones hartlepool", "waterstones hastings", "waterstones hereford", "waterstones huddersfield", "waterstones hull", "waterstones inverness", "waterstones ipswich", "waterstones kilmarnock", "waterstones kirkcaldy", "waterstones lancaster", "waterstones leamington spa", "waterstones leeds", "waterstones leicester", "waterstones lincoln", "waterstones liverpool", "waterstones livingston", "waterstones london", "waterstones loughborough", "waterstones luton", "waterstones maidstone", "waterstones manchester", "waterstones middlesbrough", "waterstones milton keynes", "waterstones newcastle", "waterstones newport", "waterstones northampton", "waterstones norwich", "waterstones nottingham", "waterstones nuneaton", "waterstones oxford", "waterstones paisley", "waterstones perth", "waterstones peterborough", "waterstones plymouth", "waterstones poole", "waterstones portsmouth", "waterstones preston", "waterstones reading", "waterstones redditch", "waterstones rotherham", "waterstones rugby", "waterstones salford", "waterstones salisbury", "waterstones scunthorpe", "waterstones sheffield", "waterstones shrewsbury", "waterstones slough", "waterstones solihull", "waterstones southampton", "waterstones southport", "waterstones st albans", "waterstones st helens", "waterstones stafford", "waterstones stirling", "waterstones stoke", "waterstones sunderland", "waterstones swansea", "waterstones swindon", "waterstones tamworth", "waterstones taunton", "waterstones telford", "waterstones torquay", "waterstones wakefield", "waterstones watford", "waterstones westminster", "waterstones weymouth", "waterstones winchester", "waterstones wolverhampton", "waterstones worcester", "waterstones worthing", "waterstones wrexham", "waterstones york", "wayfair", "wayfair.co.uk", "webuy.com", "weekday", "weekend offender", "wera tools", "wex photo video", "wh smith", "whirlpool appliances", "whistles", "white stuff", "whittard", "whittard of chelsea", "whsmith", "wickes", "wickes aberdeen", "wickes ayr", "wickes bangor", "wickes barnsley", "wickes basildon", "wickes basingstoke", "wickes bath", "wickes belfast", "wickes birkenhead", "wickes birmingham", "wickes blackburn", "wickes blackpool", "wickes bournemouth", "wickes bradford", "wickes bridgend", "wickes brighton", "wickes bristol", "wickes building", "wickes burton", "wickes cambridge", "wickes cardiff", "wickes carlisle", "wickes chelmsford", "wickes cheltenham", "wickes chester", "wickes chichester", "wickes colchester", "wickes coventry", "wickes crawley", "wickes crewe", "wickes cumbernauld", "wickes darlington", "wickes derby", "wickes doncaster", "wickes dumfries", "wickes dundee", "wickes dunfermline", "wickes durham", "wickes east kilbride", "wickes eastbourne", "wickes edinburgh", "wickes exeter", "wickes falkirk", "wickes glasgow", "wickes gloucester", "wickes grimsby", "wickes guildford", "wickes halifax", "wickes hamilton", "wickes harrogate", "wickes hartlepool", "wickes hastings", "wickes hereford", "wickes huddersfield", "wickes hull", "wickes inverness", "wickes ipswich", "wickes kilmarnock", "wickes kirkcaldy", "wickes lancaster", "wickes leamington spa", "wickes leeds", "wickes leicester", "wickes lincoln", "wickes liverpool", "wickes livingston", "wickes london", "wickes loughborough", "wickes luton", "wickes maidstone", "wickes manchester", "wickes middlesbrough", "wickes milton keynes", "wickes newcastle", "wickes newport", "wickes northampton", "wickes norwich", "wickes nottingham", "wickes nuneaton", "wickes oxford", "wickes paisley", "wickes perth", "wickes peterborough", "wickes plymouth", "wickes poole", "wickes portsmouth", "wickes preston", "wickes reading", "wickes redditch", "wickes rotherham", "wickes rugby", "wickes salford", "wickes salisbury", "wickes scunthorpe", "wickes sheffield", "wickes shrewsbury", "wickes slough", "wickes solihull", "wickes southampton", "wickes southport", "wickes st albans", "wickes st helens", "wickes stafford", "wickes stirling", "wickes stoke", "wickes sunderland", "wickes swansea", "wickes swindon", "wickes tamworth", "wickes taunton", "wickes telford", "wickes torquay", "wickes wakefield", "wickes watford", "wickes westminster", "wickes weymouth", "wickes winchester", "wickes wolverhampton", "wickes worcester", "wickes worthing", "wickes wrexham", "wickes york", "wiggle", "wiggle.co.uk", "wilko", "wilko.com", "wish.com", "wolseley uk", "wordery", "world of books", "wren is takin", "wren kitchens", "wynnstay stores", "yoox", "yorkshire trading", "yorkshire trading co", "yorkshire trading company", "ytc", "ytc ashbourne", "ytc stores", "yves saint laurent", "zanussi appliances", "zara", "zara uk", "zara.com", "zegna", "zooplus", "zooplus.co.uk"]}, {"id": "entertainment", "label": "Entertainment, Gaming, Leisure & Media", "icon": "🎮", "color": "#8b5cf6", "keywords": ["aeg presents", "alexandra palace", "ally pally", "alt twrs retail", "alton towers", "alton towers resort", "alton towers retail", "amazon music", "amazon music unlimited", "amazon prime", "amazon prime video", "ambassador theatre", "anfield stadium", "ao arena manchester", "apple music", "apple tv", "apple tv+", "apple.com/bill", "aquarium", "arcade", "ashmolean museum", "ashton gate", "atg tickets", "audible", "audible uk", "audible.co.uk", "axs", "axs tickets", "axs.com", "bandcamp", "barbican centre", "battle.net", "beamish museum", "bear grylls adventure", "bfi imax", "bfi player", "bfi southbank", "birmingham museum and art gallery", "black country living museum", "blackpool pleasure beach", "blizzard", "blizzard entertainment", "bloomberg news", "blue planet aquarium", "boom battle bar", "bowling", "brands hatch", "breakout manchester", "brentford community stadium", "bristol zoo", "britbox", "british museum", "bungie store", "cadw", "cardiff city stadium", "carrow road", "cdkeys", "cdkeys.com", "celtic park", "chessington", "chessington world of adventures", "chester zoo", "cinema", "cineworld", "cineworld cinemas", "cineworld unlimited", "city ground nottingham", "clue hq", "co-op live manchester", "colchester zoo", "concert", "craven cottage", "crunchyroll", "curzon", "curzon cinema", "curzon cinemas", "curzon home cinema", "cutty sark", "dazn", "deezer", "design museum london", "dice.fm", "discord", "discord nitro", "discovery plus", "discovery+", "disney", "disney plus", "disney+", "disneyplus", "donington park", "drayton manor", "dudley zoo", "dulwich picture gallery", "ea games", "ea play", "economist", "eden project", "edgbaston cricket", "edinburgh zoo", "electric shuffle", "electronic arts", "elland road", "emirates stadium", "empire cinemas", "eneba", "english heritage", "english national opera", "epic games", "epic games store", "escape hunt", "escape reality", "escape room", "espn+", "etihad stadium", "eventbrite", "eventbrite uk", "everyman", "everyman cinema", "everyman media", "exhibition", "fairground", "fairground rides", "fanatical", "fantasy island", "festival", "financial times", "first direct arena leeds", "fitzwilliam museum", "flamingo land", "flight club", "flight club darts", "ft.com", "fun fair", "fun fairs", "fun forest", "funfair", "funforest", "funimation", "gallery", "gaming", "gig", "gigantic", "gigantic tickets", "go ape", "gog.com", "goodison park", "google *play", "google play", "google play movies", "green man gaming", "guardian news & media", "gulliver's valley", "gullivers valley", "hall farm park", "hampden park", "hayu", "hbo max", "headingley stadium", "historic environment scotland", "historic royal palaces", "hollywood bowl", "hollywood bowl group", "hulu", "humble bundle", "ibrox stadium", "imperial war museum", "ironbridge gorge museums", "itunes.com/bill", "itv hub", "itvx premium", "iwm duxford", "iwm north", "jagex", "jorvik viking centre", "junkyard golf", "junkyard golf club", "kelvingrove art gallery", "kew gardens", "king power stadium", "koko camden", "lane7", "legoland", "legoland windsor", "lightwater valley", "lionsgate plus", "live nation", "london eye", "london stadium", "london theatre", "london theatre direct", "london zoo", "longleat", "longleat safari", "lord's cricket ground", "lords cricket ground", "luminary podcasts", "m&s bank arena liverpool", "madame tussauds", "magzter", "manchester art gallery", "manchester museum", "marwell zoo", "max.com", "medium", "medium.com", "merlin attractions", "merlin entertainments", "microsoft store", "microsoft*xbox", "milestone ranch", "millennium stadium", "mini golf", "molineux stadium", "motorpoint arena nottingham", "mr mulligans", "msft *xbox", "mubi", "murrayfield stadium", "museum", "museum of liverpool", "museum of london", "national gallery london", "national marine aquarium", "national maritime museum", "national museum cardiff", "national museum of scotland", "national portrait gallery", "national railway museum york", "national science and media museum", "national theatre", "national trust", "national trust for scotland", "national trust membership", "natural history museum", "netflix", "netflix.com", "new statesman", "new york times", "newspaper", "nintendo", "nintendo eshop", "nintendo of europe", "nintendo switch online", "normanby hall country", "north lincolnshire mus", "north lincolnshire museum", "north lincs mus", "now cinema", "now digital", "now entertainment", "now sports", "now tv", "nowtv", "nytimes.com", "o2 academy birmingham", "o2 academy brixton", "o2 academy glasgow", "o2 academy leeds", "o2 apollo manchester", "oakwood theme park", "odeon", "odeon cinemas", "odeon limit", "old trafford stadium", "ovo hydro glasgow", "p&j live aberdeen", "paignton zoo", "paramount plus", "paramount+", "paramountplus", "patreon", "patreon membership", "paultons park", "peacock tv", "peppa pig world", "picturehouse", "picturehouse cinemas", "pink pig farm", "pitt rivers museum", "playstation", "playstation network", "playstation store", "plonk golf", "pocket casts", "pokemon center", "prime video", "primevideo", "principality stadium", "private eye", "psn", "psn store", "puttshack", "qobuz", "rakuten tv", "readly", "reel cinemas", "resident advisor", "resorts world arena", "reuters", "riot games", "riotgames", "riverside museum glasgow", "riverside stadium", "roblox", "roblox corporation", "rockstar games", "roundhouse camden", "roxy ball room", "royal armouries museum", "royal botanic gardens kew", "royal museums greenwich", "royal observatory greenwich", "royal opera house", "royal shakespeare company", "runescape", "saatchi gallery", "sadler's wells", "safari park", "safari play", "science and industry museum", "science museum london", "scottish national gallery", "sea life", "sea life aquarium", "sea life centre", "see tickets", "seetickets", "selhurst park", "serpentine gallery", "shakespeare's globe", "showcase cinemas", "silverstone circuit", "sir john soane's museum", "siriusxm", "sjm concerts", "skiddle", "somerset house", "sony interactive", "soundcloud", "soundcloud go", "southbank centre", "spotify", "spotify premium", "spotify uk", "square enix", "sse arena belfast", "st fagans national museum", "st james' park", "st mary's stadium", "stamford bridge", "steam", "steamgames", "steampowered", "storytel", "stream", "streaming", "substack", "substack subscription", "sundown adventure", "sundown adventureland", "sundownadventure", "swingers", "swingers crazy golf", "tate britain", "tate liverpool", "tate modern", "tate st ives", "telegraph", "telegraph media group", "tenpin", "tenpin bowling", "the deep hull", "the economist", "the guardian", "the independent", "the light cinema", "the london eye", "the new york times", "the o2 arena", "the oval cricket", "the spectator", "the sunday times", "the tank museum", "the telegraph", "the times", "the washington post", "theatre", "theatre tokens", "thorpe park", "thorpe park resort", "ticketline", "ticketmaster", "ticketmaster uk", "tidal", "tidal hifi", "times newspapers", "todaytix", "topgolf", "topgolf uk", "tottenham hotspur stadium", "treetop adventure golf", "troxy london", "tuby", "tuby's", "tubys", "tunein radio", "turf moor", "twickenham stadium", "twitch", "twitch interactive", "twitch subscription", "twycross zoo", "tygtickets", "tygtickets.com", "ubisoft", "ubisoft connect", "ubisoft store", "utilita arena birmingham", "utilita arena newcastle", "utilita arena sheffield", "v&a museum", "valve", "valve corporation", "victoria and albert museum", "video game", "villa park", "vue", "vue cinema", "vue cinemas", "wakehurst", "walker art gallery", "wall street journal", "wallace collection", "warwick castle", "washington post", "wegottickets", "wellcome collection", "wembley stadium", "west midland safari park", "whipsnade zoo", "whitechapel gallery", "whitworth art gallery", "woburn safari", "world museum liverpool", "world of warcraft", "wsj.com", "xbox", "xbox game pass", "xbox live", "youtube", "youtube member", "youtube music", "youtube premium", "zip world", "zoo", "zsl london zoo"]}, {"id": "bills", "label": "Bills, Utilities, Telecoms & Housing", "icon": "🏡", "color": "#6366f1", "keywords": ["100green", "1st central", "3 uk", "4th utility", "aa insurance", "aberdeen city borough council", "aberdeen city city council", "aberdeen city council", "aberdeen city council tax", "aberdeen city county council", "aberdeen city ctax", "aberdeen city district council", "aberdeenshire borough council", "aberdeenshire city council", "aberdeenshire council", "aberdeenshire council tax", "aberdeenshire county council", "aberdeenshire ctax", "aberdeenshire district council", "account fee", "admiral", "admiral group", "admiral insurance", "aes corp", "affinity water", "ageas", "ageas insurance", "aldermore mortgage", "allianz", "allianz insurance", "allstate", "altice usa", "amber valley borough council", "amber valley city council", "amber valley council", "amber valley council tax", "amber valley county council", "amber valley ctax", "amber valley district council", "ameren", "american family insurance", "american water", "anglian water", "angus borough council", "angus city council", "angus council", "angus council tax", "angus county council", "angus ctax", "angus district council", "antrim and newtownabbey borough council", "antrim and newtownabbey city council", "antrim and newtownabbey council", "antrim and newtownabbey council tax", "antrim and newtownabbey county council", "antrim and newtownabbey ctax", "antrim and newtownabbey district council", "aon", "aqua america", "ards and north down borough council", "ards and north down city council", "ards and north down council", "ards and north down council tax", "ards and north down county council", "ards and north down ctax", "ards and north down district council", "argyll and bute borough council", "argyll and bute city council", "argyll and bute council", "argyll and bute council tax", "argyll and bute county council", "argyll and bute ctax", "argyll and bute district council", "armagh city banbridge and craigavon borough council", "armagh city banbridge and craigavon city council", "armagh city banbridge and craigavon council", "armagh city banbridge and craigavon council tax", "armagh city banbridge and craigavon county council", "armagh city banbridge and craigavon ctax", "armagh city banbridge and craigavon district council", "asda mobile", "ashfield borough council", "ashfield city council", "ashfield council", "ashfield council tax", "ashfield county council", "ashfield ctax", "ashfield district council", "ashford borough council", "ashford city council", "ashford council", "ashford council tax", "ashford county council", "ashford ctax", "ashford district council", "at&t", "at&t mobility", "aviva", "aviva direct debit", "aviva insurance", "avro energy", "axa", "axa insurance", "axa uk", "b4rn", "babergh borough council", "babergh city council", "babergh council", "babergh council tax", "babergh county council", "babergh ctax", "babergh district council", "banes borough council", "banes city council", "banes council", "banes council tax", "banes county council", "banes ctax", "banes district council", "barclays mortgage", "barking and dagenham borough council", "barking and dagenham city council", "barking and dagenham council", "barking and dagenham council tax", "barking and dagenham county council", "barking and dagenham ctax", "barking and dagenham district council", "barnet borough council", "barnet city council", "barnet council", "barnet council tax", "barnet county council", "barnet ctax", "barnet district council", "barnsley borough council", "barnsley city council", "barnsley council", "barnsley council tax", "barnsley county council", "barnsley ctax", "barnsley district council", "basingstoke and deane borough council", "basingstoke and deane city council", "basingstoke and deane council", "basingstoke and deane council tax", "basingstoke and deane county council", "basingstoke and deane ctax", "basingstoke and deane district council", "bassetlaw borough council", "bassetlaw city council", "bassetlaw council", "bassetlaw council tax", "bassetlaw county council", "bassetlaw ctax", "bassetlaw district council", "bath and north east somerset borough council", "bath and north east somerset city council", "bath and north east somerset council", "bath and north east somerset council tax", "bath and north east somerset county council", "bath and north east somerset ctax", "bath and north east somerset district council", "bcp borough council", "bcp city council", "bcp council", "bcp council tax", "bcp county council", "bcp ctax", "bcp district council", "bedford borough council", "bedford city council", "bedford council", "bedford council tax", "bedford county council", "bedford ctax", "bedford district council", "belfast borough council", "belfast city council", "belfast council", "belfast council tax", "belfast county council", "belfast ctax", "belfast district council", "bell insurance", "bexley borough council", "bexley city council", "bexley council", "bexley council tax", "bexley county council", "bexley ctax", "bexley district council", "birmingham borough council", "birmingham city council", "birmingham council", "birmingham council tax", "birmingham county council", "birmingham ctax", "birmingham district council", "blaby borough council", "blaby city council", "blaby council", "blaby council tax", "blaby county council", "blaby ctax", "blaby district council", "blackburn with darwen borough council", "blackburn with darwen city council", "blackburn with darwen council", "blackburn with darwen council tax", "blackburn with darwen county council", "blackburn with darwen ctax", "blackburn with darwen district council", "blackpool borough council", "blackpool city council", "blackpool council", "blackpool council tax", "blackpool county council", "blackpool ctax", "blackpool district council", "blaenau gwent borough council", "blaenau gwent city council", "blaenau gwent council", "blaenau gwent council tax", "blaenau gwent county council", "blaenau gwent ctax", "blaenau gwent district council", "bolsover borough council", "bolsover city council", "bolsover council", "bolsover council tax", "bolsover county council", "bolsover ctax", "bolsover district council", "bolton borough council", "bolton city council", "bolton council", "bolton council tax", "bolton county council", "bolton ctax", "bolton district council", "boost mobile", "borough council", "boston borough council", "boston city council", "boston council", "boston council tax", "boston county council", "boston ctax", "boston district council", "bought by many", "bournemouth christchurch and poole borough council", "bournemouth christchurch and poole city council", "bournemouth christchurch and poole council", "bournemouth christchurch and poole council tax", "bournemouth christchurch and poole county council", "bournemouth christchurch and poole ctax", "bournemouth christchurch and poole district council", "bournemouth water", "bracknell forest borough council", "bracknell forest city council", "bracknell forest council", "bracknell forest council tax", "bracknell forest county council", "bracknell forest ctax", "bracknell forest district council", "bradford borough council", "bradford city council", "bradford council", "bradford council tax", "bradford county council", "bradford ctax", "bradford district council", "braintree borough council", "braintree city council", "braintree council", "braintree council tax", "braintree county council", "braintree ctax", "braintree district council", "breckland borough council", "breckland city council", "breckland council", "breckland council tax", "breckland county council", "breckland ctax", "breckland district council", "brent borough council", "brent city council", "brent council", "brent council tax", "brent county council", "brent ctax", "brent district council", "brentwood borough council", "brentwood city council", "brentwood council", "brentwood council tax", "brentwood county council", "brentwood ctax", "brentwood district council", "bridgend borough council", "bridgend city council", "bridgend council", "bridgend council tax", "bridgend county council", "bridgend ctax", "bridgend district council", "brighton & hove borough council", "brighton & hove city council", "brighton & hove council", "brighton & hove council tax", "brighton & hove county council", "brighton & hove ctax", "brighton & hove district council", "brighton and hove borough council", "brighton and hove city council", "brighton and hove council", "brighton and hove council tax", "brighton and hove county council", "brighton and hove ctax", "brighton and hove district council", "bristol borough council", "bristol city council", "bristol council", "bristol council tax", "bristol county council", "bristol ctax", "bristol district council", "bristol water", "british gas", "british gas energy", "british gas services", "broadband", "broadband for rural north", "broadland borough council", "broadland city council", "broadland council", "broadland council tax", "broadland county council", "broadland ctax", "broadland district council", "bromley borough council", "bromley city council", "bromley council", "bromley council tax", "bromley county council", "bromley ctax", "bromley district council", "bromsgrove borough council", "bromsgrove city council", "bromsgrove council", "bromsgrove council tax", "bromsgrove county council", "bromsgrove ctax", "bromsgrove district council", "broxbourne borough council", "broxbourne city council", "broxbourne council", "broxbourne council tax", "broxbourne county council", "broxbourne ctax", "broxbourne district council", "broxtowe borough council", "broxtowe city council", "broxtowe council", "broxtowe council tax", "broxtowe county council", "broxtowe ctax", "broxtowe district council", "bt bill", "bt broadband", "bt group", "bt internet", "bt mobile", "bt payment", "buckinghamshire borough council", "buckinghamshire city council", "buckinghamshire council", "buckinghamshire council tax", "buckinghamshire county council", "buckinghamshire ctax", "buckinghamshire district council", "bulb energy", "bupa health insurance", "bupa insurance", "burnley borough council", "burnley city council", "burnley council", "burnley council tax", "burnley county council", "burnley ctax", "burnley district council", "bury borough council", "bury city council", "bury council", "bury council tax", "bury county council", "bury ctax", "bury district council", "caerphilly borough council", "caerphilly city council", "caerphilly council", "caerphilly council tax", "caerphilly county council", "caerphilly ctax", "caerphilly district council", "calderdale borough council", "calderdale city council", "calderdale council", "calderdale council tax", "calderdale county council", "calderdale ctax", "calderdale district council", "california water service", "cambridge borough council", "cambridge city council", "cambridge council", "cambridge council tax", "cambridge county council", "cambridge ctax", "cambridge district council", "cambridge water", "cambridgeshire borough council", "cambridgeshire city council", "cambridgeshire council", "cambridgeshire council tax", "cambridgeshire county council", "cambridgeshire ctax", "cambridgeshire district council", "camden borough council", "camden city council", "camden council", "camden council tax", "camden county council", "camden ctax", "camden district council", "cannock chase borough council", "cannock chase city council", "cannock chase council", "cannock chase council tax", "cannock chase county council", "cannock chase ctax", "cannock chase district council", "canterbury borough council", "canterbury city council", "canterbury council", "canterbury council tax", "canterbury county council", "canterbury ctax", "canterbury district council", "cardiff borough council", "cardiff city council", "cardiff council", "cardiff council tax", "cardiff county council", "cardiff ctax", "cardiff district council", "carmarthenshire borough council", "carmarthenshire city council", "carmarthenshire council", "carmarthenshire council tax", "carmarthenshire county council", "carmarthenshire ctax", "carmarthenshire district council", "carter jonas", "castle point borough council", "castle point city council", "castle point council", "castle point council tax", "castle point county council", "castle point ctax", "castle point district council", "causeway coast and glens borough council", "causeway coast and glens city council", "causeway coast and glens council", "causeway coast and glens council tax", "causeway coast and glens county council", "causeway coast and glens ctax", "causeway coast and glens district council", "centerpoint energy", "central bedfordshire borough council", "central bedfordshire city council", "central bedfordshire council", "central bedfordshire council tax", "central bedfordshire county council", "central bedfordshire ctax", "central bedfordshire district council", "centurylink", "ceredigion borough council", "ceredigion city council", "ceredigion council", "ceredigion council tax", "ceredigion county council", "ceredigion ctax", "ceredigion district council", "chancellors lettings", "charnwood borough council", "charnwood city council", "charnwood council", "charnwood council tax", "charnwood county council", "charnwood ctax", "charnwood district council", "charter communications", "chelmsford borough council", "chelmsford city council", "chelmsford council", "chelmsford council tax", "chelmsford county council", "chelmsford ctax", "chelmsford district council", "cheltenham borough council", "cheltenham city council", "cheltenham council", "cheltenham council tax", "cheltenham county council", "cheltenham ctax", "cheltenham district council", "cherwell borough council", "cherwell city council", "cherwell council", "cherwell council tax", "cherwell county council", "cherwell ctax", "cherwell district council", "cheshire east borough council", "cheshire east city council", "cheshire east council", "cheshire east council tax", "cheshire east county council", "cheshire east ctax", "cheshire east district council", "cheshire west and chester borough council", "cheshire west and chester city council", "cheshire west and chester council", "cheshire west and chester council tax", "cheshire west and chester county council", "cheshire west and chester ctax", "cheshire west and chester district council", "chesterfield borough council", "chesterfield city council", "chesterfield council", "chesterfield council tax", "chesterfield county council", "chesterfield ctax", "chesterfield district council", "chestertons", "chichester borough council", "chichester city council", "chichester council", "chichester council tax", "chichester county council", "chichester ctax", "chichester district council", "cholderton water", "chorley borough council", "chorley city council", "chorley council", "chorley council tax", "chorley county council", "chorley ctax", "chorley district council", "chubb insurance", "churchill", "churchill insurance", "city council", "city of london borough council", "city of london city council", "city of london council", "city of london council tax", "city of london county council", "city of london ctax", "city of london district council", "cityfibre", "clackmannanshire borough council", "clackmannanshire city council", "clackmannanshire council", "clackmannanshire council tax", "clackmannanshire county council", "clackmannanshire ctax", "clackmannanshire district council", "clarion housing", "co-op energy", "co-op insurance", "colchester borough council", "colchester city council", "colchester council", "colchester council tax", "colchester county council", "colchester ctax", "colchester district council", "comcast", "community fibre", "companies house", "con edison", "connect fibre", "connells", "constellation energy", "consumers energy", "conwy borough council", "conwy city council", "conwy council", "conwy council tax", "conwy county council", "conwy ctax", "conwy district council", "coop insurance", "cooperative energy", "cornwall borough council", "cornwall city council", "cornwall council", "cornwall council tax", "cornwall county council", "cornwall ctax", "cornwall district council", "corona energy", "cotswold borough council", "cotswold city council", "cotswold council", "cotswold council tax", "cotswold county council", "cotswold ctax", "cotswold district council", "council tax", "council tax aberdeen city", "council tax aberdeenshire", "council tax amber valley", "council tax angus", "council tax antrim and newtownabbey", "council tax ards and north down", "council tax argyll and bute", "council tax armagh city banbridge and craigavon", "council tax ashfield", "council tax ashford", "council tax babergh", "council tax banes", "council tax barking and dagenham", "council tax barnet", "council tax barnsley", "council tax basingstoke and deane", "council tax bassetlaw", "council tax bath and north east somerset", "council tax bcp", "council tax bedford", "council tax belfast", "council tax bexley", "council tax birmingham", "council tax blaby", "council tax blackburn with darwen", "council tax blackpool", "council tax blaenau gwent", "council tax bolsover", "council tax bolton", "council tax boston", "council tax bournemouth christchurch and poole", "council tax bracknell forest", "council tax bradford", "council tax braintree", "council tax breckland", "council tax brent", "council tax brentwood", "council tax bridgend", "council tax brighton & hove", "council tax brighton and hove", "council tax bristol", "council tax broadland", "council tax bromley", "council tax bromsgrove", "council tax broxbourne", "council tax broxtowe", "council tax buckinghamshire", "council tax burnley", "council tax bury", "council tax caerphilly", "council tax calderdale", "council tax cambridge", "council tax cambridgeshire", "council tax camden", "council tax cannock chase", "council tax canterbury", "council tax cardiff", "council tax carmarthenshire", "council tax castle point", "council tax causeway coast and glens", "council tax central bedfordshire", "council tax ceredigion", "council tax charnwood", "council tax chelmsford", "council tax cheltenham", "council tax cherwell", "council tax cheshire east", "council tax cheshire west and chester", "council tax chesterfield", "council tax chichester", "council tax chorley", "council tax city of london", "council tax clackmannanshire", "council tax colchester", "council tax conwy", "council tax cornwall", "council tax cotswold", "council tax coventry", "council tax crawley", "council tax croydon", "council tax cumberland", "council tax dacorum", "council tax darlington", "council tax dartford", "council tax dartmoor", "council tax denbighshire", "council tax derby", "council tax derbyshire", "council tax derbyshire dales", "council tax derry city and strabane", "council tax devon", "council tax doncaster", "council tax dorset", "council tax dover", "council tax dudley", "council tax dumfries and galloway", "council tax dundee city", "council tax durham", "council tax ealing", "council tax east ayrshire", "council tax east cambridgeshire", "council tax east devon", "council tax east dunbartonshire", "council tax east hampshire", "council tax east hertfordshire", "council tax east lindsey", "council tax east lothian", "council tax east renfrewshire", "council tax east riding of yorkshire", "council tax east staffordshire", "council tax east sussex", "council tax eastleigh", "council tax edinburgh", "council tax elmbridge", "council tax enfield", "council tax epping forest", "council tax epsom and ewell", "council tax erewash", "council tax essex", "council tax exeter", "council tax falkirk", "council tax fareham", "council tax fenland", "council tax fermanagh and omagh", "council tax fife", "council tax flintshire", "council tax folkestone and hythe", "council tax forest of dean", "council tax fylde", "council tax gateshead", "council tax gedling", "council tax glasgow", "council tax gloucester", "council tax gloucestershire", "council tax gosport", "council tax gravesham", "council tax great yarmouth", "council tax greenwich", "council tax guildford", "council tax gwynedd", "council tax hackney", "council tax halton", "council tax hammersmith & fulham", "council tax hammersmith and fulham", "council tax hampshire", "council tax harborough", "council tax haringey", "council tax harlow", "council tax harrogate", "council tax harrow", "council tax hart", "council tax hartlepool", "council tax hastings", "council tax havant", "council tax havering", "council tax herefordshire", "council tax hertfordshire", "council tax hertsmere", "council tax high peak", "council tax highland", "council tax hillingdon", "council tax hinckley and bosworth", "council tax horsham", "council tax hounslow", "council tax hull", "council tax huntingdonshire", "council tax hyndburn", "council tax inverclyde", "council tax ipswich", "council tax isle of anglesey", "council tax isle of wight", "council tax islington", "council tax kensington & chelsea", "council tax kensington and chelsea", "council tax kent", "council tax kings lynn and west norfolk", "council tax kingston", "council tax kingston upon hull", "council tax kingston upon thames", "council tax kirklees", "council tax knowsley", "council tax lambeth", "council tax lancashire", "council tax lancaster", "council tax leeds", "council tax leicestershire", "council tax lewes", "council tax lewisham", "council tax lichfield", "council tax lincoln", "council tax lincolnshire", "council tax lisburn and castlereagh", "council tax liverpool", "council tax luton", "council tax maidstone", "council tax maldon", "council tax malvern hills", "council tax manchester", "council tax mansfield", "council tax medway", "council tax melton", "council tax merthyr tydfil", "council tax merton", "council tax mid and east antrim", "council tax mid devon", "council tax mid suffolk", "council tax mid sussex", "council tax mid ulster", "council tax middlesbrough", "council tax midlothian", "council tax milton keynes", "council tax mole valley", "council tax monmouthshire", "council tax moray", "council tax na h-eileanan siar", "council tax neath port talbot", "council tax new forest", "council tax newark and sherwood", "council tax newcastle", "council tax newcastle upon tyne", "council tax newcastle-under-lyme", "council tax newham", "council tax newport", "council tax newry mourne and down", "council tax norfolk", "council tax north ayrshire", "council tax north devon", "council tax north east derbyshire", "council tax north east lincolnshire", "council tax north hertfordshire", "council tax north kesteven", "council tax north lanarkshire", "council tax north lincolnshire", "council tax north norfolk", "council tax north northamptonshire", "council tax north somerset", "council tax north tyneside", "council tax north warwickshire", "council tax north west leicestershire", "council tax north yorkshire", "council tax northumberland", "council tax norwich", "council tax nottingham", "council tax nottinghamshire", "council tax nuneaton and bedworth", "council tax oadby and wigston", "council tax oldham", "council tax orkney islands", "council tax oxford", "council tax oxfordshire", "council tax pembrokeshire", "council tax pendle", "council tax perth and kinross", "council tax peterborough", "council tax plymouth", "council tax portsmouth", "council tax powys", "council tax preston", "council tax reading", "council tax redbridge", "council tax redcar and cleveland", "council tax reigate and banstead", "council tax renfrewshire", "council tax rhondda cynon taf", "council tax ribble valley", "council tax richmond", "council tax richmond upon thames", "council tax rochdale", "council tax rochford", "council tax rossendale", "council tax rotherham", "council tax rugby", "council tax runnymede", "council tax rushcliffe", "council tax rushmoor", "council tax rutland", "council tax ryedale", "council tax salford", "council tax sandwell", "council tax scarborough", "council tax scottish borders", "council tax sedgemoor", "council tax sefton", "council tax selby", "council tax sevenoaks", "council tax sheffield", "council tax shepway", "council tax shetland islands", "council tax slough", "council tax solihull", "council tax somerset", "council tax south ayrshire", "council tax south cambridgeshire", "council tax south derbyshire", "council tax south gloucestershire", "council tax south hams", "council tax south holland", "council tax south kesteven", "council tax south lakeland", "council tax south lanarkshire", "council tax south norfolk", "council tax south oxfordshire", "council tax south ribble", "council tax south staffordshire", "council tax south tyneside", "council tax southampton", "council tax southend", "council tax southend-on-sea", "council tax southwark", "council tax spelthorne", "council tax st albans", "council tax st helens", "council tax stafford", "council tax staffordshire", "council tax staffordshire moorlands", "council tax stevenage", "council tax stirling", "council tax stockport", "council tax stockton-on-tees", "council tax stoke-on-trent", "council tax stratford-on-avon", "council tax stroud", "council tax suffolk", "council tax sunderland", "council tax surrey", "council tax surrey heath", "council tax sutton", "council tax swale", "council tax swansea", "council tax swindon", "council tax tameside", "council tax tamworth", "council tax tandridge", "council tax teignbridge", "council tax telford and wrekin", "council tax tendring", "council tax test valley", "council tax tewkesbury", "council tax thanet", "council tax three rivers", "council tax thurrock", "council tax tonbridge and malling", "council tax torbay", "council tax torfaen", "council tax torridge", "council tax tower hamlets", "council tax trafford", "council tax tunbridge wells", "council tax uttlesford", "council tax vale of glamorgan", "council tax vale of white horse", "council tax wakefield", "council tax walsall", "council tax waltham forest", "council tax wandsworth", "council tax warrington", "council tax warwick", "council tax warwickshire", "council tax watford", "council tax waverley", "council tax wealden", "council tax welwyn hatfield", "council tax west berkshire", "council tax west devon", "council tax west dunbartonshire", "council tax west lancashire", "council tax west lindsey", "council tax west lothian", "council tax west northamptonshire", "council tax west oxfordshire", "council tax west suffolk", "council tax west sussex", "council tax western isles", "council tax westminster", "council tax westmorland and furness", "council tax wigan", "council tax wiltshire", "council tax winchester", "council tax windsor and maidenhead", "council tax wirral", "council tax woking", "council tax wokingham", "council tax wolverhampton", "council tax worcester", "council tax worcestershire", "council tax worthing", "council tax wrexham", "council tax wychavon", "council tax wyre", "council tax wyre forest", "council tax ynys mon", "council tax york", "countrywide residential", "county council", "court fee", "covea insurance", "coventry borough council", "coventry bs mortgage", "coventry city council", "coventry council", "coventry council tax", "coventry county council", "coventry ctax", "coventry district council", "cox communications", "crawley borough council", "crawley city council", "crawley council", "crawley council tax", "crawley county council", "crawley ctax", "crawley district council", "cricket wireless", "croydon borough council", "croydon city council", "croydon council", "croydon council tax", "croydon county council", "croydon ctax", "croydon district council", "ctax aberdeen city", "ctax aberdeenshire", "ctax amber valley", "ctax angus", "ctax antrim and newtownabbey", "ctax ards and north down", "ctax argyll and bute", "ctax armagh city banbridge and craigavon", "ctax ashfield", "ctax ashford", "ctax babergh", "ctax banes", "ctax barking and dagenham", "ctax barnet", "ctax barnsley", "ctax basingstoke and deane", "ctax bassetlaw", "ctax bath and north east somerset", "ctax bcp", "ctax bedford", "ctax belfast", "ctax bexley", "ctax birmingham", "ctax blaby", "ctax blackburn with darwen", "ctax blackpool", "ctax blaenau gwent", "ctax bolsover", "ctax bolton", "ctax boston", "ctax bournemouth christchurch and poole", "ctax bracknell forest", "ctax bradford", "ctax braintree", "ctax breckland", "ctax brent", "ctax brentwood", "ctax bridgend", "ctax brighton & hove", "ctax brighton and hove", "ctax bristol", "ctax broadland", "ctax bromley", "ctax bromsgrove", "ctax broxbourne", "ctax broxtowe", "ctax buckinghamshire", "ctax burnley", "ctax bury", "ctax caerphilly", "ctax calderdale", "ctax cambridge", "ctax cambridgeshire", "ctax camden", "ctax cannock chase", "ctax canterbury", "ctax cardiff", "ctax carmarthenshire", "ctax castle point", "ctax causeway coast and glens", "ctax central bedfordshire", "ctax ceredigion", "ctax charnwood", "ctax chelmsford", "ctax cheltenham", "ctax cherwell", "ctax cheshire east", "ctax cheshire west and chester", "ctax chesterfield", "ctax chichester", "ctax chorley", "ctax city of london", "ctax clackmannanshire", "ctax colchester", "ctax conwy", "ctax cornwall", "ctax cotswold", "ctax coventry", "ctax crawley", "ctax croydon", "ctax cumberland", "ctax dacorum", "ctax darlington", "ctax dartford", "ctax dartmoor", "ctax denbighshire", "ctax derby", "ctax derbyshire", "ctax derbyshire dales", "ctax derry city and strabane", "ctax devon", "ctax doncaster", "ctax dorset", "ctax dover", "ctax dudley", "ctax dumfries and galloway", "ctax dundee city", "ctax durham", "ctax ealing", "ctax east ayrshire", "ctax east cambridgeshire", "ctax east devon", "ctax east dunbartonshire", "ctax east hampshire", "ctax east hertfordshire", "ctax east lindsey", "ctax east lothian", "ctax east renfrewshire", "ctax east riding of yorkshire", "ctax east staffordshire", "ctax east sussex", "ctax eastleigh", "ctax edinburgh", "ctax elmbridge", "ctax enfield", "ctax epping forest", "ctax epsom and ewell", "ctax erewash", "ctax essex", "ctax exeter", "ctax falkirk", "ctax fareham", "ctax fenland", "ctax fermanagh and omagh", "ctax fife", "ctax flintshire", "ctax folkestone and hythe", "ctax forest of dean", "ctax fylde", "ctax gateshead", "ctax gedling", "ctax glasgow", "ctax gloucester", "ctax gloucestershire", "ctax gosport", "ctax gravesham", "ctax great yarmouth", "ctax greenwich", "ctax guildford", "ctax gwynedd", "ctax hackney", "ctax halton", "ctax hammersmith & fulham", "ctax hammersmith and fulham", "ctax hampshire", "ctax harborough", "ctax haringey", "ctax harlow", "ctax harrogate", "ctax harrow", "ctax hart", "ctax hartlepool", "ctax hastings", "ctax havant", "ctax havering", "ctax herefordshire", "ctax hertfordshire", "ctax hertsmere", "ctax high peak", "ctax highland", "ctax hillingdon", "ctax hinckley and bosworth", "ctax horsham", "ctax hounslow", "ctax hull", "ctax huntingdonshire", "ctax hyndburn", "ctax inverclyde", "ctax ipswich", "ctax isle of anglesey", "ctax isle of wight", "ctax islington", "ctax kensington & chelsea", "ctax kensington and chelsea", "ctax kent", "ctax kings lynn and west norfolk", "ctax kingston", "ctax kingston upon hull", "ctax kingston upon thames", "ctax kirklees", "ctax knowsley", "ctax lambeth", "ctax lancashire", "ctax lancaster", "ctax leeds", "ctax leicestershire", "ctax lewes", "ctax lewisham", "ctax lichfield", "ctax lincoln", "ctax lincolnshire", "ctax lisburn and castlereagh", "ctax liverpool", "ctax luton", "ctax maidstone", "ctax maldon", "ctax malvern hills", "ctax manchester", "ctax mansfield", "ctax medway", "ctax melton", "ctax merthyr tydfil", "ctax merton", "ctax mid and east antrim", "ctax mid devon", "ctax mid suffolk", "ctax mid sussex", "ctax mid ulster", "ctax middlesbrough", "ctax midlothian", "ctax milton keynes", "ctax mole valley", "ctax monmouthshire", "ctax moray", "ctax na h-eileanan siar", "ctax neath port talbot", "ctax new forest", "ctax newark and sherwood", "ctax newcastle", "ctax newcastle upon tyne", "ctax newcastle-under-lyme", "ctax newham", "ctax newport", "ctax newry mourne and down", "ctax norfolk", "ctax north ayrshire", "ctax north devon", "ctax north east derbyshire", "ctax north east lincolnshire", "ctax north hertfordshire", "ctax north kesteven", "ctax north lanarkshire", "ctax north lincolnshire", "ctax north norfolk", "ctax north northamptonshire", "ctax north somerset", "ctax north tyneside", "ctax north warwickshire", "ctax north west leicestershire", "ctax north yorkshire", "ctax northumberland", "ctax norwich", "ctax nottingham", "ctax nottinghamshire", "ctax nuneaton and bedworth", "ctax oadby and wigston", "ctax oldham", "ctax orkney islands", "ctax oxford", "ctax oxfordshire", "ctax pembrokeshire", "ctax pendle", "ctax perth and kinross", "ctax peterborough", "ctax plymouth", "ctax portsmouth", "ctax powys", "ctax preston", "ctax reading", "ctax redbridge", "ctax redcar and cleveland", "ctax reigate and banstead", "ctax renfrewshire", "ctax rhondda cynon taf", "ctax ribble valley", "ctax richmond", "ctax richmond upon thames", "ctax rochdale", "ctax rochford", "ctax rossendale", "ctax rotherham", "ctax rugby", "ctax runnymede", "ctax rushcliffe", "ctax rushmoor", "ctax rutland", "ctax ryedale", "ctax salford", "ctax sandwell", "ctax scarborough", "ctax scottish borders", "ctax sedgemoor", "ctax sefton", "ctax selby", "ctax sevenoaks", "ctax sheffield", "ctax shepway", "ctax shetland islands", "ctax slough", "ctax solihull", "ctax somerset", "ctax south ayrshire", "ctax south cambridgeshire", "ctax south derbyshire", "ctax south gloucestershire", "ctax south hams", "ctax south holland", "ctax south kesteven", "ctax south lakeland", "ctax south lanarkshire", "ctax south norfolk", "ctax south oxfordshire", "ctax south ribble", "ctax south staffordshire", "ctax south tyneside", "ctax southampton", "ctax southend", "ctax southend-on-sea", "ctax southwark", "ctax spelthorne", "ctax st albans", "ctax st helens", "ctax stafford", "ctax staffordshire", "ctax staffordshire moorlands", "ctax stevenage", "ctax stirling", "ctax stockport", "ctax stockton-on-tees", "ctax stoke-on-trent", "ctax stratford-on-avon", "ctax stroud", "ctax suffolk", "ctax sunderland", "ctax surrey", "ctax surrey heath", "ctax sutton", "ctax swale", "ctax swansea", "ctax swindon", "ctax tameside", "ctax tamworth", "ctax tandridge", "ctax teignbridge", "ctax telford and wrekin", "ctax tendring", "ctax test valley", "ctax tewkesbury", "ctax thanet", "ctax three rivers", "ctax thurrock", "ctax tonbridge and malling", "ctax torbay", "ctax torfaen", "ctax torridge", "ctax tower hamlets", "ctax trafford", "ctax tunbridge wells", "ctax uttlesford", "ctax vale of glamorgan", "ctax vale of white horse", "ctax wakefield", "ctax walsall", "ctax waltham forest", "ctax wandsworth", "ctax warrington", "ctax warwick", "ctax warwickshire", "ctax watford", "ctax waverley", "ctax wealden", "ctax welwyn hatfield", "ctax west berkshire", "ctax west devon", "ctax west dunbartonshire", "ctax west lancashire", "ctax west lindsey", "ctax west lothian", "ctax west northamptonshire", "ctax west oxfordshire", "ctax west suffolk", "ctax west sussex", "ctax western isles", "ctax westminster", "ctax westmorland and furness", "ctax wigan", "ctax wiltshire", "ctax winchester", "ctax windsor and maidenhead", "ctax wirral", "ctax woking", "ctax wokingham", "ctax wolverhampton", "ctax worcester", "ctax worcestershire", "ctax worthing", "ctax wrexham", "ctax wychavon", "ctax wyre", "ctax wyre forest", "ctax ynys mon", "ctax york", "cuckoo broadband", "cumberland borough council", "cumberland city council", "cumberland council", "cumberland council tax", "cumberland county council", "cumberland ctax", "cumberland district council", "dacorum borough council", "dacorum city council", "dacorum council", "dacorum council tax", "dacorum county council", "dacorum ctax", "dacorum district council", "darlington borough council", "darlington city council", "darlington council", "darlington council tax", "darlington county council", "darlington ctax", "darlington district council", "dartford borough council", "dartford city council", "dartford council", "dartford council tax", "dartford county council", "dartford ctax", "dartford district council", "dartmoor borough council", "dartmoor city council", "dartmoor council", "dartmoor council tax", "dartmoor county council", "dartmoor ctax", "dartmoor district council", "denbighshire borough council", "denbighshire city council", "denbighshire council", "denbighshire council tax", "denbighshire county council", "denbighshire ctax", "denbighshire district council", "derby borough council", "derby city council", "derby council", "derby council tax", "derby county council", "derby ctax", "derby district council", "derbyshire borough council", "derbyshire city council", "derbyshire council", "derbyshire council tax", "derbyshire county council", "derbyshire ctax", "derbyshire dales borough council", "derbyshire dales city council", "derbyshire dales council", "derbyshire dales council tax", "derbyshire dales county council", "derbyshire dales ctax", "derbyshire dales district council", "derbyshire district council", "derry city and strabane borough council", "derry city and strabane city council", "derry city and strabane council", "derry city and strabane council tax", "derry city and strabane county council", "derry city and strabane ctax", "derry city and strabane district council", "devon borough council", "devon city council", "devon council", "devon council tax", "devon county council", "devon ctax", "devon district council", "dexters", "dial direct", "diamond insurance", "direct line", "direct line insurance", "direct save telecom", "directv", "dish network", "district council", "dominion energy", "doncaster borough council", "doncaster city council", "doncaster council", "doncaster council tax", "doncaster county council", "doncaster ctax", "doncaster district council", "dorset borough council", "dorset city council", "dorset council", "dorset council tax", "dorset county council", "dorset ctax", "dorset district council", "dover borough council", "dover city council", "dover council", "dover council tax", "dover county council", "dover ctax", "dover district council", "driver and vehicle licensing agency", "dte energy", "dudley borough council", "dudley city council", "dudley council", "dudley council tax", "dudley county council", "dudley ctax", "dudley district council", "duke energy", "dumfries and galloway borough council", "dumfries and galloway city council", "dumfries and galloway council", "dumfries and galloway council tax", "dumfries and galloway county council", "dumfries and galloway ctax", "dumfries and galloway district council", "dundee city borough council", "dundee city city council", "dundee city council", "dundee city council tax", "dundee city county council", "dundee city ctax", "dundee city district council", "durham borough council", "durham city council", "durham council", "durham council tax", "durham county council", "durham ctax", "durham district council", "dvla car tax", "dvla road tax", "dvla vehicle tax", "dwr cymru", "e.on", "e.on energy", "e.on next", "ealing borough council", "ealing city council", "ealing council", "ealing council tax", "ealing county council", "ealing ctax", "ealing district council", "east ayrshire borough council", "east ayrshire city council", "east ayrshire council", "east ayrshire council tax", "east ayrshire county council", "east ayrshire ctax", "east ayrshire district council", "east cambridgeshire borough council", "east cambridgeshire city council", "east cambridgeshire council", "east cambridgeshire council tax", "east cambridgeshire county council", "east cambridgeshire ctax", "east cambridgeshire district council", "east devon borough council", "east devon city council", "east devon council", "east devon council tax", "east devon county council", "east devon ctax", "east devon district council", "east dunbartonshire borough council", "east dunbartonshire city council", "east dunbartonshire council", "east dunbartonshire council tax", "east dunbartonshire county council", "east dunbartonshire ctax", "east dunbartonshire district council", "east hampshire borough council", "east hampshire city council", "east hampshire council", "east hampshire council tax", "east hampshire county council", "east hampshire ctax", "east hampshire district council", "east hertfordshire borough council", "east hertfordshire city council", "east hertfordshire council", "east hertfordshire council tax", "east hertfordshire county council", "east hertfordshire ctax", "east hertfordshire district council", "east lindsey borough council", "east lindsey city council", "east lindsey council", "east lindsey council tax", "east lindsey county council", "east lindsey ctax", "east lindsey district council", "east lothian borough council", "east lothian city council", "east lothian council", "east lothian council tax", "east lothian county council", "east lothian ctax", "east lothian district council", "east renfrewshire borough council", "east renfrewshire city council", "east renfrewshire council", "east renfrewshire council tax", "east renfrewshire county council", "east renfrewshire ctax", "east renfrewshire district council", "east riding of yorkshire borough council", "east riding of yorkshire city council", "east riding of yorkshire council", "east riding of yorkshire council tax", "east riding of yorkshire county council", "east riding of yorkshire ctax", "east riding of yorkshire district council", "east staffordshire borough council", "east staffordshire city council", "east staffordshire council", "east staffordshire council tax", "east staffordshire county council", "east staffordshire ctax", "east staffordshire district council", "east sussex borough council", "east sussex city council", "east sussex council", "east sussex council tax", "east sussex county council", "east sussex ctax", "east sussex district council", "eastleigh borough council", "eastleigh city council", "eastleigh council", "eastleigh council tax", "eastleigh county council", "eastleigh ctax", "eastleigh district council", "ebico", "ecotricity", "edf", "edf energy", "edinburgh borough council", "edinburgh city council", "edinburgh council", "edinburgh council tax", "edinburgh county council", "edinburgh ctax", "edinburgh district council", "ee", "ee bill", "ee broadband", "ee limited", "ee mobile", "electric bill", "elephant insurance", "elmbridge borough council", "elmbridge city council", "elmbridge council", "elmbridge council tax", "elmbridge county council", "elmbridge ctax", "elmbridge district council", "endsleigh", "endsleigh insurance", "enel", "energy", "enfield borough council", "enfield city council", "enfield council", "enfield council tax", "enfield county council", "enfield ctax", "enfield district council", "engie", "entergy", "eon", "eon energy", "eon next", "epping forest borough council", "epping forest city council", "epping forest council", "epping forest council tax", "epping forest county council", "epping forest ctax", "epping forest district council", "epsom and ewell borough council", "epsom and ewell city council", "epsom and ewell council", "epsom and ewell council tax", "epsom and ewell county council", "epsom and ewell ctax", "epsom and ewell district council", "erewash borough council", "erewash city council", "erewash council", "erewash council tax", "erewash county council", "erewash ctax", "erewash district council", "essential utilities", "essex and suffolk water", "essex borough council", "essex city council", "essex council", "essex council tax", "essex county council", "essex ctax", "essex district council", "estate agent", "esure", "esure insurance", "eversource energy", "everything everywhere", "exelon", "exeter borough council", "exeter city council", "exeter council", "exeter council tax", "exeter county council", "exeter ctax", "exeter district council", "falkirk borough council", "falkirk city council", "falkirk council", "falkirk council tax", "falkirk county council", "falkirk ctax", "falkirk district council", "fareham borough council", "fareham city council", "fareham council", "fareham council tax", "fareham county council", "fareham ctax", "fareham district council", "farmers insurance", "fenland borough council", "fenland city council", "fenland council", "fenland council tax", "fenland county council", "fenland ctax", "fenland district council", "fermanagh and omagh borough council", "fermanagh and omagh city council", "fermanagh and omagh council", "fermanagh and omagh council tax", "fermanagh and omagh county council", "fermanagh and omagh ctax", "fermanagh and omagh district council", "fibrus", "fife borough council", "fife city council", "fife council", "fife council tax", "fife county council", "fife ctax", "fife district council", "first utility", "flintshire borough council", "flintshire city council", "flintshire council", "flintshire council tax", "flintshire county council", "flintshire ctax", "flintshire district council", "flow energy", "folkestone and hythe borough council", "folkestone and hythe city council", "folkestone and hythe council", "folkestone and hythe council tax", "folkestone and hythe county council", "folkestone and hythe ctax", "folkestone and hythe district council", "forest of dean borough council", "forest of dean city council", "forest of dean council", "forest of dean council tax", "forest of dean county council", "forest of dean ctax", "forest of dean district council", "foxtons", "franchise tax board", "frontier communications", "fylde borough council", "fylde city council", "fylde council", "fylde council tax", "fylde county council", "fylde ctax", "fylde district council", "gallagher insurance", "gas bill", "gateshead borough council", "gateshead city council", "gateshead council", "gateshead council tax", "gateshead county council", "gateshead ctax", "gateshead district council", "gedling borough council", "gedling city council", "gedling council", "gedling council tax", "gedling county council", "gedling ctax", "gedling district council", "geico", "giffgaff", "gigaclear", "glasgow borough council", "glasgow city council", "glasgow council", "glasgow council tax", "glasgow county council", "glasgow ctax", "glasgow district council", "gloucester borough council", "gloucester city council", "gloucester council", "gloucester council tax", "gloucester county council", "gloucester ctax", "gloucester district council", "gloucestershire borough council", "gloucestershire city council", "gloucestershire council", "gloucestershire council tax", "gloucestershire county council", "gloucestershire ctax", "gloucestershire district council", "go girl insurance", "good energy", "gosport borough council", "gosport city council", "gosport council", "gosport council tax", "gosport county council", "gosport ctax", "gosport district council", "grain connect", "grainger plc", "gravesham borough council", "gravesham city council", "gravesham council", "gravesham council tax", "gravesham county council", "gravesham ctax", "gravesham district council", "great yarmouth borough council", "great yarmouth city council", "great yarmouth council", "great yarmouth council tax", "great yarmouth county council", "great yarmouth ctax", "great yarmouth district council", "green flag insurance", "green network energy", "greenwich borough council", "greenwich city council", "greenwich council", "greenwich council tax", "greenwich county council", "greenwich ctax", "greenwich district council", "ground rent", "guildford borough council", "guildford city council", "guildford council", "guildford council tax", "guildford county council", "guildford ctax", "guildford district council", "guinness partnership", "gwynedd borough council", "gwynedd city council", "gwynedd council", "gwynedd council tax", "gwynedd county council", "gwynedd ctax", "gwynedd district council", "haart lettings", "habito mortgage", "hackney borough council", "hackney city council", "hackney council", "hackney council tax", "hackney county council", "hackney ctax", "hackney district council", "hafren dyfrdwy", "halifax mortgage", "halton borough council", "halton city council", "halton council", "halton council tax", "halton county council", "halton ctax", "halton district council", "hammersmith & fulham borough council", "hammersmith & fulham city council", "hammersmith & fulham council", "hammersmith & fulham council tax", "hammersmith & fulham county council", "hammersmith & fulham ctax", "hammersmith & fulham district council", "hammersmith and fulham borough council", "hammersmith and fulham city council", "hammersmith and fulham council", "hammersmith and fulham council tax", "hammersmith and fulham county council", "hammersmith and fulham ctax", "hammersmith and fulham district council", "hampshire borough council", "hampshire city council", "hampshire council", "hampshire council tax", "hampshire county council", "hampshire ctax", "hampshire district council", "hamptons international", "harborough borough council", "harborough city council", "harborough council", "harborough council tax", "harborough county council", "harborough ctax", "harborough district council", "haringey borough council", "haringey city council", "haringey council", "haringey council tax", "haringey county council", "haringey ctax", "haringey district council", "harlow borough council", "harlow city council", "harlow council", "harlow council tax", "harlow county council", "harlow ctax", "harlow district council", "harrogate borough council", "harrogate city council", "harrogate council", "harrogate council tax", "harrogate county council", "harrogate ctax", "harrogate district council", "harrow borough council", "harrow city council", "harrow council", "harrow council tax", "harrow county council", "harrow ctax", "harrow district council", "hart borough council", "hart city council", "hart council", "hart council tax", "hart county council", "hart ctax", "hart district council", "hartlepool borough council", "hartlepool city council", "hartlepool council", "hartlepool council tax", "hartlepool county council", "hartlepool ctax", "hartlepool district council", "hartlepool water", "hastings", "hastings borough council", "hastings city council", "hastings council", "hastings council tax", "hastings county council", "hastings ctax", "hastings direct", "hastings district council", "hastings insurance", "havant borough council", "havant city council", "havant council", "havant council tax", "havant county council", "havant ctax", "havant district council", "havering borough council", "havering city council", "havering council", "havering council tax", "havering county council", "havering ctax", "havering district council", "herefordshire borough council", "herefordshire city council", "herefordshire council", "herefordshire council tax", "herefordshire county council", "herefordshire ctax", "herefordshire district council", "hertfordshire borough council", "hertfordshire city council", "hertfordshire council", "hertfordshire council tax", "hertfordshire county council", "hertfordshire ctax", "hertfordshire district council", "hertsmere borough council", "hertsmere city council", "hertsmere council", "hertsmere council tax", "hertsmere county council", "hertsmere ctax", "hertsmere district council", "high peak borough council", "high peak city council", "high peak council", "high peak council tax", "high peak county council", "high peak ctax", "high peak district council", "highland borough council", "highland city council", "highland council", "highland council tax", "highland county council", "highland ctax", "highland district council", "hillingdon borough council", "hillingdon city council", "hillingdon council", "hillingdon council tax", "hillingdon county council", "hillingdon ctax", "hillingdon district council", "hinckley and bosworth borough council", "hinckley and bosworth city council", "hinckley and bosworth council", "hinckley and bosworth council tax", "hinckley and bosworth county council", "hinckley and bosworth ctax", "hinckley and bosworth district council", "hiscox", "hiscox insurance", "hm land registry", "hm revenue & customs", "hm revenue and customs", "hmrc", "hmrc paye", "hmrc self assessment", "hmrc tax", "hmrc vat", "home group", "horsham borough council", "horsham city council", "horsham council", "horsham council tax", "horsham county council", "horsham ctax", "horsham district council", "hounslow borough council", "hounslow city council", "hounslow council", "hounslow council tax", "hounslow county council", "hounslow ctax", "hounslow district council", "hsbc mortgage", "hull borough council", "hull city council", "hull council", "hull council tax", "hull county council", "hull ctax", "hull district council", "hunters estate agents", "huntingdonshire borough council", "huntingdonshire city council", "huntingdonshire council", "huntingdonshire council tax", "huntingdonshire county council", "huntingdonshire ctax", "huntingdonshire district council", "hutchison 3g", "hyde housing", "hyndburn borough council", "hyndburn city council", "hyndburn council", "hyndburn council tax", "hyndburn county council", "hyndburn ctax", "hyndburn district council", "hyperoptic", "hyperoptic broadband", "iberdrola", "ico registration", "id mobile", "igloo energy", "information commissioner", "insolvency service", "insurance", "internal revenue service", "inverclyde borough council", "inverclyde city council", "inverclyde council", "inverclyde council tax", "inverclyde county council", "inverclyde ctax", "inverclyde district council", "ipswich borough council", "ipswich city council", "ipswich council", "ipswich council tax", "ipswich county council", "ipswich ctax", "ipswich district council", "irs treas 310", "irs usataxpy", "isle of anglesey borough council", "isle of anglesey city council", "isle of anglesey council", "isle of anglesey council tax", "isle of anglesey county council", "isle of anglesey ctax", "isle of anglesey district council", "isle of wight borough council", "isle of wight city council", "isle of wight council", "isle of wight council tax", "isle of wight county council", "isle of wight ctax", "isle of wight district council", "islington borough council", "islington city council", "islington council", "islington council tax", "islington county council", "islington ctax", "islington district council", "john lewis broadband", "john lewis insurance", "jurassic fibre", "kcom", "kcom group", "kensington & chelsea borough council", "kensington & chelsea city council", "kensington & chelsea council", "kensington & chelsea council tax", "kensington & chelsea county council", "kensington & chelsea ctax", "kensington & chelsea district council", "kensington and chelsea borough council", "kensington and chelsea city council", "kensington and chelsea council", "kensington and chelsea council tax", "kensington and chelsea county council", "kensington and chelsea ctax", "kensington and chelsea district council", "kensington mortgages", "kent borough council", "kent city council", "kent council", "kent council tax", "kent county council", "kent ctax", "kent district council", "kfh", "kings lynn and west norfolk borough council", "kings lynn and west norfolk city council", "kings lynn and west norfolk council", "kings lynn and west norfolk council tax", "kings lynn and west norfolk county council", "kings lynn and west norfolk ctax", "kings lynn and west norfolk district council", "kingston borough council", "kingston city council", "kingston council", "kingston council tax", "kingston county council", "kingston ctax", "kingston district council", "kingston upon hull borough council", "kingston upon hull city council", "kingston upon hull council", "kingston upon hull council tax", "kingston upon hull county council", "kingston upon hull ctax", "kingston upon hull district council", "kingston upon thames borough council", "kingston upon thames city council", "kingston upon thames council", "kingston upon thames council tax", "kingston upon thames county council", "kingston upon thames ctax", "kingston upon thames district council", "kinleigh folkard & hayward", "kirklees borough council", "kirklees city council", "kirklees council", "kirklees council tax", "kirklees county council", "kirklees ctax", "kirklees district council", "knight frank", "knowsley borough council", "knowsley city council", "knowsley council", "knowsley council tax", "knowsley county council", "knowsley ctax", "knowsley district council", "l&q housing", "lambeth borough council", "lambeth city council", "lambeth council", "lambeth council tax", "lambeth county council", "lambeth ctax", "lambeth district council", "lancashire borough council", "lancashire city council", "lancashire council", "lancashire council tax", "lancashire county council", "lancashire ctax", "lancashire district council", "lancaster borough council", "lancaster city council", "lancaster council", "lancaster council tax", "lancaster county council", "lancaster ctax", "lancaster district council", "landlord", "leaders lettings", "lebara", "lebara mobile", "leeds borough council", "leeds bs mortgage", "leeds city council", "leeds council", "leeds council tax", "leeds county council", "leeds ctax", "leeds district council", "legal & general", "legal and general", "leicestershire borough council", "leicestershire city council", "leicestershire council", "leicestershire council tax", "leicestershire county council", "leicestershire ctax", "leicestershire district council", "letting agent", "lewes borough council", "lewes city council", "lewes council", "lewes council tax", "lewes county council", "lewes ctax", "lewes district council", "lewisham borough council", "lewisham city council", "lewisham council", "lewisham council tax", "lewisham county council", "lewisham ctax", "lewisham district council", "liberty mutual", "lichfield borough council", "lichfield city council", "lichfield council", "lichfield council tax", "lichfield county council", "lichfield ctax", "lichfield district council", "lifestyle group", "lifestylegroup", "lincoln borough council", "lincoln city council", "lincoln council", "lincoln council tax", "lincoln county council", "lincoln ctax", "lincoln district council", "lincolnshire borough council", "lincolnshire city council", "lincolnshire council", "lincolnshire council tax", "lincolnshire county council", "lincolnshire ctax", "lincolnshire district council", "lisburn and castlereagh borough council", "lisburn and castlereagh city council", "lisburn and castlereagh council", "lisburn and castlereagh council tax", "lisburn and castlereagh county council", "lisburn and castlereagh ctax", "lisburn and castlereagh district council", "lit fibre", "liverpool borough council", "liverpool city council", "liverpool council", "liverpool council tax", "liverpool county council", "liverpool ctax", "liverpool district council", "liverpool victoria", "lloyds bank mortgage", "lloyds mortgage", "london & quadrant", "london power", "ludlow thompson", "luton borough council", "luton city council", "luton council", "luton council tax", "luton county council", "luton ctax", "luton district council", "lv insurance", "lv=", "lycamobile", "m&s insurance", "maidstone borough council", "maidstone city council", "maidstone council", "maidstone council tax", "maidstone county council", "maidstone ctax", "maidstone district council", "maintenance charge", "maldon borough council", "maldon city council", "maldon council", "maldon council tax", "maldon county council", "maldon ctax", "maldon district council", "malvern hills borough council", "malvern hills city council", "malvern hills council", "malvern hills council tax", "malvern hills county council", "malvern hills ctax", "malvern hills district council", "manchester borough council", "manchester city council", "manchester council", "manchester council tax", "manchester county council", "manchester ctax", "manchester district council", "mansfield borough council", "mansfield city council", "mansfield council", "mansfield council tax", "mansfield county council", "mansfield ctax", "mansfield district council", "manypets", "markerstudy", "marsh & parsons", "marsh mclennan", "martin & co", "medway borough council", "medway city council", "medway council", "medway council tax", "medway county council", "medway ctax", "medway district council", "melton borough council", "melton city council", "melton council", "melton council tax", "melton county council", "melton ctax", "melton district council", "merthyr tydfil borough council", "merthyr tydfil city council", "merthyr tydfil council", "merthyr tydfil council tax", "merthyr tydfil county council", "merthyr tydfil ctax", "merthyr tydfil district council", "merton borough council", "merton city council", "merton council", "merton council tax", "merton county council", "merton ctax", "merton district council", "metlife", "mid and east antrim borough council", "mid and east antrim city council", "mid and east antrim council", "mid and east antrim council tax", "mid and east antrim county council", "mid and east antrim ctax", "mid and east antrim district council", "mid devon borough council", "mid devon city council", "mid devon council", "mid devon council tax", "mid devon county council", "mid devon ctax", "mid devon district council", "mid suffolk borough council", "mid suffolk city council", "mid suffolk council", "mid suffolk council tax", "mid suffolk county council", "mid suffolk ctax", "mid suffolk district council", "mid sussex borough council", "mid sussex city council", "mid sussex council", "mid sussex council tax", "mid sussex county council", "mid sussex ctax", "mid sussex district council", "mid ulster borough council", "mid ulster city council", "mid ulster council", "mid ulster council tax", "mid ulster county council", "mid ulster ctax", "mid ulster district council", "middlesbrough borough council", "middlesbrough city council", "middlesbrough council", "middlesbrough council tax", "middlesbrough county council", "middlesbrough ctax", "middlesbrough district council", "midlothian borough council", "midlothian city council", "midlothian council", "midlothian council tax", "midlothian county council", "midlothian ctax", "midlothian district council", "milton keynes borough council", "milton keynes city council", "milton keynes council", "milton keynes council tax", "milton keynes county council", "milton keynes ctax", "milton keynes district council", "mint mobile", "mobile phone", "mole valley borough council", "mole valley city council", "mole valley council", "mole valley council tax", "mole valley county council", "mole valley ctax", "mole valley district council", "monmouthshire borough council", "monmouthshire city council", "monmouthshire council", "monmouthshire council tax", "monmouthshire county council", "monmouthshire ctax", "monmouthshire district council", "moray borough council", "moray city council", "moray council", "moray council tax", "moray county council", "moray ctax", "moray district council", "more than", "more than insurance", "mortgage", "mortgage payment", "na h-eileanan siar borough council", "na h-eileanan siar city council", "na h-eileanan siar council", "na h-eileanan siar council tax", "na h-eileanan siar county council", "na h-eileanan siar ctax", "na h-eileanan siar district council", "national grid", "nationwide insurance", "nationwide mortgage", "natwest mortgage", "neath port talbot borough council", "neath port talbot city council", "neath port talbot council", "neath port talbot council tax", "neath port talbot county council", "neath port talbot ctax", "neath port talbot district council", "netomnia", "new forest borough council", "new forest city council", "new forest council", "new forest council tax", "new forest county council", "new forest ctax", "new forest district council", "newark and sherwood borough council", "newark and sherwood city council", "newark and sherwood council", "newark and sherwood council tax", "newark and sherwood county council", "newark and sherwood ctax", "newark and sherwood district council", "newcastle borough council", "newcastle bs mortgage", "newcastle city council", "newcastle council", "newcastle council tax", "newcastle county council", "newcastle ctax", "newcastle district council", "newcastle upon tyne borough council", "newcastle upon tyne city council", "newcastle upon tyne council", "newcastle upon tyne council tax", "newcastle upon tyne county council", "newcastle upon tyne ctax", "newcastle upon tyne district council", "newcastle-under-lyme borough council", "newcastle-under-lyme city council", "newcastle-under-lyme council", "newcastle-under-lyme council tax", "newcastle-under-lyme county council", "newcastle-under-lyme ctax", "newcastle-under-lyme district council", "newham borough council", "newham city council", "newham council", "newham council tax", "newham county council", "newham ctax", "newham district council", "newport borough council", "newport city council", "newport council", "newport council tax", "newport county council", "newport ctax", "newport district council", "newry mourne and down borough council", "newry mourne and down city council", "newry mourne and down council", "newry mourne and down council tax", "newry mourne and down county council", "newry mourne and down ctax", "newry mourne and down district council", "nfu mutual", "ni water", "nlc registrars", "norfolk borough council", "norfolk city council", "norfolk council", "norfolk council tax", "norfolk county council", "norfolk ctax", "norfolk district council", "north ayrshire borough council", "north ayrshire city council", "north ayrshire council", "north ayrshire council tax", "north ayrshire county council", "north ayrshire ctax", "north ayrshire district council", "north devon borough council", "north devon city council", "north devon council", "north devon council tax", "north devon county council", "north devon ctax", "north devon district council", "north east derbyshire borough council", "north east derbyshire city council", "north east derbyshire council", "north east derbyshire council tax", "north east derbyshire county council", "north east derbyshire ctax", "north east derbyshire district council", "north east lincolnshire borough council", "north east lincolnshire city council", "north east lincolnshire council", "north east lincolnshire council tax", "north east lincolnshire county council", "north east lincolnshire ctax", "north east lincolnshire district council", "north hertfordshire borough council", "north hertfordshire city council", "north hertfordshire council", "north hertfordshire council tax", "north hertfordshire county council", "north hertfordshire ctax", "north hertfordshire district council", "north kesteven borough council", "north kesteven city council", "north kesteven council", "north kesteven council tax", "north kesteven county council", "north kesteven ctax", "north kesteven district council", "north lanarkshire borough council", "north lanarkshire city council", "north lanarkshire council", "north lanarkshire council tax", "north lanarkshire county council", "north lanarkshire ctax", "north lanarkshire district council", "north lincolnshire borough council", "north lincolnshire city council", "north lincolnshire council", "north lincolnshire council tax", "north lincolnshire county council", "north lincolnshire ctax", "north lincolnshire district council", "north norfolk borough council", "north norfolk city council", "north norfolk council", "north norfolk council tax", "north norfolk county council", "north norfolk ctax", "north norfolk district council", "north northamptonshire borough council", "north northamptonshire city council", "north northamptonshire council", "north northamptonshire council tax", "north northamptonshire county council", "north northamptonshire ctax", "north northamptonshire district council", "north somerset borough council", "north somerset city council", "north somerset council", "north somerset council tax", "north somerset county council", "north somerset ctax", "north somerset district council", "north tyneside borough council", "north tyneside city council", "north tyneside council", "north tyneside council tax", "north tyneside county council", "north tyneside ctax", "north tyneside district council", "north warwickshire borough council", "north warwickshire city council", "north warwickshire council", "north warwickshire council tax", "north warwickshire county council", "north warwickshire ctax", "north warwickshire district council", "north west leicestershire borough council", "north west leicestershire city council", "north west leicestershire council", "north west leicestershire council tax", "north west leicestershire county council", "north west leicestershire ctax", "north west leicestershire district council", "north yorkshire borough council", "north yorkshire city council", "north yorkshire council", "north yorkshire council tax", "north yorkshire county council", "north yorkshire ctax", "north yorkshire district council", "northern ireland water", "northumberland borough council", "northumberland city council", "northumberland council", "northumberland council tax", "northumberland county council", "northumberland ctax", "northumberland district council", "northumbrian water", "norwich borough council", "norwich city council", "norwich council", "norwich council tax", "norwich county council", "norwich ctax", "norwich district council", "notting hill genesis", "nottingham borough council", "nottingham bs mortgage", "nottingham city council", "nottingham council", "nottingham council tax", "nottingham county council", "nottingham ctax", "nottingham district council", "nottinghamshire borough council", "nottinghamshire city council", "nottinghamshire council", "nottinghamshire council tax", "nottinghamshire county council", "nottinghamshire ctax", "nottinghamshire district council", "now broadband", "now tv broadband", "npower", "nuneaton and bedworth borough council", "nuneaton and bedworth city council", "nuneaton and bedworth council", "nuneaton and bedworth council tax", "nuneaton and bedworth county council", "nuneaton and bedworth ctax", "nuneaton and bedworth district council", "o2", "o2 bill", "o2 mobile", "o2 uk", "oadby and wigston borough council", "oadby and wigston city council", "oadby and wigston council", "oadby and wigston council tax", "oadby and wigston county council", "oadby and wigston ctax", "oadby and wigston district council", "oakhaven broadband", "octopus", "octopus energy", "oldham borough council", "oldham city council", "oldham council", "oldham council tax", "oldham county council", "oldham ctax", "oldham district council", "one call insurance", "onestream", "openrent", "optimum broadband", "opus energy", "orkney islands borough council", "orkney islands city council", "orkney islands council", "orkney islands council tax", "orkney islands county council", "orkney islands ctax", "orkney islands district council", "outfox the market", "ovo", "ovo energy", "oxford borough council", "oxford city council", "oxford council", "oxford council tax", "oxford county council", "oxford ctax", "oxford district council", "oxfordshire borough council", "oxfordshire city council", "oxfordshire council", "oxfordshire council tax", "oxfordshire county council", "oxfordshire ctax", "oxfordshire district council", "pacific gas and electric", "paragon bank mortgage", "peabody housing", "peabody trust", "pembrokeshire borough council", "pembrokeshire city council", "pembrokeshire council", "pembrokeshire council tax", "pembrokeshire county council", "pembrokeshire ctax", "pembrokeshire district council", "pendle borough council", "pendle city council", "pendle council", "pendle council tax", "pendle county council", "pendle ctax", "pendle district council", "peoples energy", "perth and kinross borough council", "perth and kinross city council", "perth and kinross council", "perth and kinross council tax", "perth and kinross county council", "perth and kinross ctax", "perth and kinross district council", "peterborough borough council", "peterborough city council", "peterborough council", "peterborough council tax", "peterborough county council", "peterborough ctax", "peterborough district council", "petplan", "petplan insurance", "pg&e", "pinnacle west", "places for people", "platform home loans", "plusnet", "plusnet broadband", "plusnet telecom", "plymouth borough council", "plymouth city council", "plymouth council", "plymouth council tax", "plymouth county council", "plymouth ctax", "plymouth district council", "policy expert", "portsmouth borough council", "portsmouth city council", "portsmouth council", "portsmouth council tax", "portsmouth county council", "portsmouth ctax", "portsmouth district council", "portsmouth water", "post office broadband", "post office insurance", "powys borough council", "powys city council", "powys council", "powys council tax", "powys county council", "powys ctax", "powys district council", "pozitive energy", "premium", "preston borough council", "preston city council", "preston council", "preston council tax", "preston county council", "preston ctax", "preston district council", "principality mortgage", "privilege insurance", "probate fee", "progressive insurance", "property tax", "prudential financial", "pure planet", "purplebricks", "quotemehappy", "rac insurance", "reading borough council", "reading city council", "reading council", "reading council tax", "reading county council", "reading ctax", "reading district council", "rebel energy", "rebel internet", "redbridge borough council", "redbridge city council", "redbridge council", "redbridge council tax", "redbridge county council", "redbridge ctax", "redbridge district council", "redcar and cleveland borough council", "redcar and cleveland city council", "redcar and cleveland council", "redcar and cleveland council tax", "redcar and cleveland county council", "redcar and cleveland ctax", "redcar and cleveland district council", "reeds rains", "reigate and banstead borough council", "reigate and banstead city council", "reigate and banstead council", "reigate and banstead council tax", "reigate and banstead county council", "reigate and banstead ctax", "reigate and banstead district council", "renfrewshire borough council", "renfrewshire city council", "renfrewshire council", "renfrewshire council tax", "renfrewshire county council", "renfrewshire ctax", "renfrewshire district council", "rent", "rent payment", "rhondda cynon taf borough council", "rhondda cynon taf city council", "rhondda cynon taf council", "rhondda cynon taf council tax", "rhondda cynon taf county council", "rhondda cynon taf ctax", "rhondda cynon taf district council", "ribble valley borough council", "ribble valley city council", "ribble valley council", "ribble valley council tax", "ribble valley county council", "ribble valley ctax", "ribble valley district council", "richmond borough council", "richmond city council", "richmond council", "richmond council tax", "richmond county council", "richmond ctax", "richmond district council", "richmond upon thames borough council", "richmond upon thames city council", "richmond upon thames council", "richmond upon thames council tax", "richmond upon thames county council", "richmond upon thames ctax", "richmond upon thames district council", "riverside group", "rochdale borough council", "rochdale city council", "rochdale council", "rochdale council tax", "rochdale county council", "rochdale ctax", "rochdale district council", "rochford borough council", "rochford city council", "rochford council", "rochford council tax", "rochford county council", "rochford ctax", "rochford district council", "rossendale borough council", "rossendale city council", "rossendale council", "rossendale council tax", "rossendale county council", "rossendale ctax", "rossendale district council", "rotherham borough council", "rotherham city council", "rotherham council", "rotherham council tax", "rotherham county council", "rotherham ctax", "rotherham district council", "royal and sun alliance", "royal london", "rsa insurance", "rugby borough council", "rugby city council", "rugby council", "rugby council tax", "rugby county council", "rugby ctax", "rugby district council", "runnymede borough council", "runnymede city council", "runnymede council", "runnymede council tax", "runnymede county council", "runnymede ctax", "runnymede district council", "rushcliffe borough council", "rushcliffe city council", "rushcliffe council", "rushcliffe council tax", "rushcliffe county council", "rushcliffe ctax", "rushcliffe district council", "rushmoor borough council", "rushmoor city council", "rushmoor council", "rushmoor council tax", "rushmoor county council", "rushmoor ctax", "rushmoor district council", "rutland borough council", "rutland city council", "rutland council", "rutland council tax", "rutland county council", "rutland ctax", "rutland district council", "ryedale borough council", "ryedale city council", "ryedale council", "ryedale council tax", "ryedale county council", "ryedale ctax", "ryedale district council", "sabre insurance", "sainsbury's energy", "sainsbury's insurance", "sainsburys energy", "sainsburys insurance", "sainsburys mobile", "salford borough council", "salford city council", "salford council", "salford council tax", "salford county council", "salford ctax", "salford district council", "sanctuary housing", "sandwell borough council", "sandwell city council", "sandwell council", "sandwell council tax", "sandwell county council", "sandwell ctax", "sandwell district council", "santander mortgage", "savills", "scarborough borough council", "scarborough city council", "scarborough council", "scarborough council tax", "scarborough county council", "scarborough ctax", "scarborough district council", "scottish borders borough council", "scottish borders city council", "scottish borders council", "scottish borders council tax", "scottish borders county council", "scottish borders ctax", "scottish borders district council", "scottish power", "scottish water", "scottishpower", "sedgemoor borough council", "sedgemoor city council", "sedgemoor council", "sedgemoor council tax", "sedgemoor county council", "sedgemoor ctax", "sedgemoor district council", "sefton borough council", "sefton city council", "sefton council", "sefton council tax", "sefton county council", "sefton ctax", "sefton district council", "selby borough council", "selby city council", "selby council", "selby council tax", "selby county council", "selby ctax", "selby district council", "self assessment", "self assessment tax", "service charge", "ses water", "sevenoaks borough council", "sevenoaks city council", "sevenoaks council", "sevenoaks council tax", "sevenoaks county council", "sevenoaks ctax", "sevenoaks district council", "severn trent", "severn trent water", "sheffield borough council", "sheffield city council", "sheffield council", "sheffield council tax", "sheffield county council", "sheffield ctax", "sheffield district council", "sheila's wheels", "sheilas wheels", "shell broadband", "shell energy", "shepway borough council", "shepway city council", "shepway council", "shepway council tax", "shepway county council", "shepway ctax", "shepway district council", "shetland islands borough council", "shetland islands city council", "shetland islands council", "shetland islands council tax", "shetland islands county council", "shetland islands ctax", "shetland islands district council", "skipton bs mortgage", "sky", "sky broadband", "sky digital", "sky mobile", "sky payments", "sky talk", "sky uk", "slough borough council", "slough city council", "slough council", "slough council tax", "slough county council", "slough ctax", "slough district council", "smarty", "smarty mobile", "so energy", "social security admin", "solihull borough council", "solihull city council", "solihull council", "solihull council tax", "solihull county council", "solihull ctax", "solihull district council", "somerset borough council", "somerset city council", "somerset council", "somerset council tax", "somerset county council", "somerset ctax", "somerset district council", "south ayrshire borough council", "south ayrshire city council", "south ayrshire council", "south ayrshire council tax", "south ayrshire county council", "south ayrshire ctax", "south ayrshire district council", "south cambridgeshire borough council", "south cambridgeshire city council", "south cambridgeshire council", "south cambridgeshire council tax", "south cambridgeshire county council", "south cambridgeshire ctax", "south cambridgeshire district council", "south derbyshire borough council", "south derbyshire city council", "south derbyshire council", "south derbyshire council tax", "south derbyshire county council", "south derbyshire ctax", "south derbyshire district council", "south east water", "south gloucestershire borough council", "south gloucestershire city council", "south gloucestershire council", "south gloucestershire council tax", "south gloucestershire county council", "south gloucestershire ctax", "south gloucestershire district council", "south hams borough council", "south hams city council", "south hams council", "south hams council tax", "south hams county council", "south hams ctax", "south hams district council", "south holland borough council", "south holland city council", "south holland council", "south holland council tax", "south holland county council", "south holland ctax", "south holland district council", "south kesteven borough council", "south kesteven city council", "south kesteven council", "south kesteven council tax", "south kesteven county council", "south kesteven ctax", "south kesteven district council", "south lakeland borough council", "south lakeland city council", "south lakeland council", "south lakeland council tax", "south lakeland county council", "south lakeland ctax", "south lakeland district council", "south lanarkshire borough council", "south lanarkshire city council", "south lanarkshire council", "south lanarkshire council tax", "south lanarkshire county council", "south lanarkshire ctax", "south lanarkshire district council", "south norfolk borough council", "south norfolk city council", "south norfolk council", "south norfolk council tax", "south norfolk county council", "south norfolk ctax", "south norfolk district council", "south oxfordshire borough council", "south oxfordshire city council", "south oxfordshire council", "south oxfordshire council tax", "south oxfordshire county council", "south oxfordshire ctax", "south oxfordshire district council", "south ribble borough council", "south ribble city council", "south ribble council", "south ribble council tax", "south ribble county council", "south ribble ctax", "south ribble district council", "south staffordshire borough council", "south staffordshire city council", "south staffordshire council", "south staffordshire council tax", "south staffordshire county council", "south staffordshire ctax", "south staffordshire district council", "south staffordshire water", "south staffs water", "south tyneside borough council", "south tyneside city council", "south tyneside council", "south tyneside council tax", "south tyneside county council", "south tyneside ctax", "south tyneside district council", "south west water", "southampton borough council", "southampton city council", "southampton council", "southampton council tax", "southampton county council", "southampton ctax", "southampton district council", "southend borough council", "southend city council", "southend council", "southend council tax", "southend county council", "southend ctax", "southend district council", "southend-on-sea borough council", "southend-on-sea city council", "southend-on-sea council", "southend-on-sea council tax", "southend-on-sea county council", "southend-on-sea ctax", "southend-on-sea district council", "southern company", "southern water", "southwark borough council", "southwark city council", "southwark council", "southwark council tax", "southwark county council", "southwark ctax", "southwark district council", "sovereign housing", "spark energy", "spectrum", "spectrum internet", "spelthorne borough council", "spelthorne city council", "spelthorne council", "spelthorne council tax", "spelthorne county council", "spelthorne ctax", "spelthorne district council", "sse", "sse broadband", "sse energy", "st albans borough council", "st albans city council", "st albans council", "st albans council tax", "st albans county council", "st albans ctax", "st albans district council", "st helens borough council", "st helens city council", "st helens council", "st helens council tax", "st helens county council", "st helens ctax", "st helens district council", "stafford borough council", "stafford city council", "stafford council", "stafford council tax", "stafford county council", "stafford ctax", "stafford district council", "staffordshire borough council", "staffordshire city council", "staffordshire council", "staffordshire council tax", "staffordshire county council", "staffordshire ctax", "staffordshire district council", "staffordshire moorlands borough council", "staffordshire moorlands city council", "staffordshire moorlands council", "staffordshire moorlands council tax", "staffordshire moorlands county council", "staffordshire moorlands ctax", "staffordshire moorlands district council", "state farm", "state tax", "stevenage borough council", "stevenage city council", "stevenage council", "stevenage council tax", "stevenage county council", "stevenage ctax", "stevenage district council", "stirling borough council", "stirling city council", "stirling council", "stirling council tax", "stirling county council", "stirling ctax", "stirling district council", "stockport borough council", "stockport city council", "stockport council", "stockport council tax", "stockport county council", "stockport ctax", "stockport district council", "stockton-on-tees borough council", "stockton-on-tees city council", "stockton-on-tees council", "stockton-on-tees council tax", "stockton-on-tees county council", "stockton-on-tees ctax", "stockton-on-tees district council", "stoke-on-trent borough council", "stoke-on-trent city council", "stoke-on-trent council", "stoke-on-trent council tax", "stoke-on-trent county council", "stoke-on-trent ctax", "stoke-on-trent district council", "stratford-on-avon borough council", "stratford-on-avon city council", "stratford-on-avon council", "stratford-on-avon council tax", "stratford-on-avon county council", "stratford-on-avon ctax", "stratford-on-avon district council", "stroud borough council", "stroud city council", "stroud council", "stroud council tax", "stroud county council", "stroud ctax", "stroud district council", "strutt & parker", "student loans company", "suez water", "suffolk borough council", "suffolk city council", "suffolk council", "suffolk council tax", "suffolk county council", "suffolk ctax", "suffolk district council", "sunderland borough council", "sunderland city council", "sunderland council", "sunderland council tax", "sunderland county council", "sunderland ctax", "sunderland district council", "sunlife", "surrey borough council", "surrey city council", "surrey council", "surrey council tax", "surrey county council", "surrey ctax", "surrey district council", "surrey heath borough council", "surrey heath city council", "surrey heath council", "surrey heath council tax", "surrey heath county council", "surrey heath ctax", "surrey heath district council", "sutton and east surrey water", "sutton borough council", "sutton city council", "sutton council", "sutton council tax", "sutton county council", "sutton ctax", "sutton district council", "swale borough council", "swale city council", "swale council", "swale council tax", "swale county council", "swale ctax", "swale district council", "swansea borough council", "swansea city council", "swansea council", "swansea council tax", "swansea county council", "swansea ctax", "swansea district council", "swindon borough council", "swindon city council", "swindon council", "swindon council tax", "swindon county council", "swindon ctax", "swindon district council", "swinton insurance", "swish fibre", "t-mobile", "t-mobile usa", "talktalk", "talktalk broadband", "talktalk telecom", "tameside borough council", "tameside city council", "tameside council", "tameside council tax", "tameside county council", "tameside ctax", "tameside district council", "tamworth borough council", "tamworth city council", "tamworth council", "tamworth council tax", "tamworth county council", "tamworth ctax", "tamworth district council", "tandridge borough council", "tandridge city council", "tandridge council", "tandridge council tax", "tandridge county council", "tandridge ctax", "tandridge district council", "teignbridge borough council", "teignbridge city council", "teignbridge council", "teignbridge council tax", "teignbridge county council", "teignbridge ctax", "teignbridge district council", "telecom", "telecom plus", "telefonica", "telefonica uk", "telford and wrekin borough council", "telford and wrekin city council", "telford and wrekin council", "telford and wrekin council tax", "telford and wrekin county council", "telford and wrekin ctax", "telford and wrekin district council", "tenancy rent", "tendring borough council", "tendring city council", "tendring council", "tendring council tax", "tendring county council", "tendring ctax", "tendring district council", "tesco insurance", "tesco mobile", "test valley borough council", "test valley city council", "test valley council", "test valley council tax", "test valley county council", "test valley ctax", "test valley district council", "tewkesbury borough council", "tewkesbury city council", "tewkesbury council", "tewkesbury council tax", "tewkesbury county council", "tewkesbury ctax", "tewkesbury district council", "thames water", "thames water direct debit", "thames water utilities", "thanet borough council", "thanet city council", "thanet council", "thanet council tax", "thanet county council", "thanet ctax", "thanet district council", "the aa insurance", "three", "three mobile", "three rivers borough council", "three rivers city council", "three rivers council", "three rivers council tax", "three rivers county council", "three rivers ctax", "three rivers district council", "three uk", "thurrock borough council", "thurrock city council", "thurrock council", "thurrock council tax", "thurrock county council", "thurrock ctax", "thurrock district council", "together personal finance", "tonbridge and malling borough council", "tonbridge and malling city council", "tonbridge and malling council", "tonbridge and malling council tax", "tonbridge and malling county council", "tonbridge and malling ctax", "tonbridge and malling district council", "toob", "torbay borough council", "torbay city council", "torbay council", "torbay council tax", "torbay county council", "torbay ctax", "torbay district council", "torfaen borough council", "torfaen city council", "torfaen council", "torfaen council tax", "torfaen county council", "torfaen ctax", "torfaen district council", "torridge borough council", "torridge city council", "torridge council", "torridge council tax", "torridge county council", "torridge ctax", "torridge district council", "totalenergies gas", "tower hamlets borough council", "tower hamlets city council", "tower hamlets council", "tower hamlets council tax", "tower hamlets county council", "tower hamlets ctax", "tower hamlets district council", "trafford borough council", "trafford city council", "trafford council", "trafford council tax", "trafford county council", "trafford ctax", "trafford district council", "travelers insurance", "trooli", "truespeed", "tunbridge wells borough council", "tunbridge wells city council", "tunbridge wells council", "tunbridge wells council tax", "tunbridge wells county council", "tunbridge wells ctax", "tunbridge wells district council", "tv licence", "tv licensing", "united utilities", "united utilities water", "us treasury", "usaa insurance", "uscellular", "utilita", "utilita energy", "utility warehouse", "uttlesford borough council", "uttlesford city council", "uttlesford council", "uttlesford council tax", "uttlesford county council", "uttlesford ctax", "uttlesford district council", "uw broadband", "vale of glamorgan borough council", "vale of glamorgan city council", "vale of glamorgan council", "vale of glamorgan council tax", "vale of glamorgan county council", "vale of glamorgan ctax", "vale of glamorgan district council", "vale of white horse borough council", "vale of white horse city council", "vale of white horse council", "vale of white horse council tax", "vale of white horse county council", "vale of white horse ctax", "vale of white horse district council", "veolia water", "verizon", "verizon wireless", "virgin broadband", "virgin media", "virgin media direct debit", "virgin media payments", "virgin money mortgage", "vitality health", "vitality insurance", "vitality life", "vodafone", "vodafone bill", "vodafone broadband", "vodafone limited", "vodafone uk", "voxi", "voxi mobile", "wakefield borough council", "wakefield city council", "wakefield council", "wakefield council tax", "wakefield county council", "wakefield ctax", "wakefield district council", "walsall borough council", "walsall city council", "walsall council", "walsall council tax", "walsall county council", "walsall ctax", "walsall district council", "waltham forest borough council", "waltham forest city council", "waltham forest council", "waltham forest council tax", "waltham forest county council", "waltham forest ctax", "waltham forest district council", "wandsworth borough council", "wandsworth city council", "wandsworth council", "wandsworth council tax", "wandsworth county council", "wandsworth ctax", "wandsworth district council", "warrington borough council", "warrington city council", "warrington council", "warrington council tax", "warrington county council", "warrington ctax", "warrington district council", "warwick borough council", "warwick city council", "warwick council", "warwick council tax", "warwick county council", "warwick ctax", "warwick district council", "warwickshire borough council", "warwickshire city council", "warwickshire council", "warwickshire council tax", "warwickshire county council", "warwickshire ctax", "warwickshire district council", "water bill", "water direct debit", "watford borough council", "watford city council", "watford council", "watford council tax", "watford county council", "watford ctax", "watford district council", "waverley borough council", "waverley city council", "waverley council", "waverley council tax", "waverley county council", "waverley ctax", "waverley district council", "wealden borough council", "wealden city council", "wealden council", "wealden council tax", "wealden county council", "wealden ctax", "wealden district council", "welsh water", "welwyn hatfield borough council", "welwyn hatfield city council", "welwyn hatfield council", "welwyn hatfield council tax", "welwyn hatfield county council", "welwyn hatfield ctax", "welwyn hatfield district council", "wessex water", "west berkshire borough council", "west berkshire city council", "west berkshire council", "west berkshire council tax", "west berkshire county council", "west berkshire ctax", "west berkshire district council", "west bromwich mortgage", "west devon borough council", "west devon city council", "west devon council", "west devon council tax", "west devon county council", "west devon ctax", "west devon district council", "west dunbartonshire borough council", "west dunbartonshire city council", "west dunbartonshire council", "west dunbartonshire council tax", "west dunbartonshire county council", "west dunbartonshire ctax", "west dunbartonshire district council", "west lancashire borough council", "west lancashire city council", "west lancashire council", "west lancashire council tax", "west lancashire county council", "west lancashire ctax", "west lancashire district council", "west lindsey borough council", "west lindsey city council", "west lindsey council", "west lindsey council tax", "west lindsey county council", "west lindsey ctax", "west lindsey district council", "west lothian borough council", "west lothian city council", "west lothian council", "west lothian council tax", "west lothian county council", "west lothian ctax", "west lothian district council", "west northamptonshire borough council", "west northamptonshire city council", "west northamptonshire council", "west northamptonshire council tax", "west northamptonshire county council", "west northamptonshire ctax", "west northamptonshire district council", "west oxfordshire borough council", "west oxfordshire city council", "west oxfordshire council", "west oxfordshire council tax", "west oxfordshire county council", "west oxfordshire ctax", "west oxfordshire district council", "west suffolk borough council", "west suffolk city council", "west suffolk council", "west suffolk council tax", "west suffolk county council", "west suffolk ctax", "west suffolk district council", "west sussex borough council", "west sussex city council", "west sussex council", "west sussex council tax", "west sussex county council", "west sussex ctax", "west sussex district council", "western isles borough council", "western isles city council", "western isles council", "western isles council tax", "western isles county council", "western isles ctax", "western isles district council", "westminster borough council", "westminster city council", "westminster council", "westminster council tax", "westminster county council", "westminster ctax", "westminster district council", "westmorland and furness borough council", "westmorland and furness city council", "westmorland and furness council", "westmorland and furness council tax", "westmorland and furness county council", "westmorland and furness ctax", "westmorland and furness district council", "wigan borough council", "wigan city council", "wigan council", "wigan council tax", "wigan county council", "wigan ctax", "wigan district council", "wightfibre", "willis towers watson", "wiltshire borough council", "wiltshire city council", "wiltshire council", "wiltshire council tax", "wiltshire county council", "wiltshire ctax", "wiltshire district council", "winchester borough council", "winchester city council", "winchester council", "winchester council tax", "winchester county council", "winchester ctax", "winchester district council", "windsor and maidenhead borough council", "windsor and maidenhead city council", "windsor and maidenhead council", "windsor and maidenhead council tax", "windsor and maidenhead county council", "windsor and maidenhead ctax", "windsor and maidenhead district council", "winkworth", "wirral borough council", "wirral city council", "wirral council", "wirral council tax", "wirral county council", "wirral ctax", "wirral district council", "woking borough council", "woking city council", "woking council", "woking council tax", "woking county council", "woking ctax", "woking district council", "wokingham borough council", "wokingham city council", "wokingham council", "wokingham council tax", "wokingham county council", "wokingham ctax", "wokingham district council", "wolverhampton borough council", "wolverhampton city council", "wolverhampton council", "wolverhampton council tax", "wolverhampton county council", "wolverhampton ctax", "wolverhampton district council", "worcester borough council", "worcester city council", "worcester council", "worcester council tax", "worcester county council", "worcester ctax", "worcester district council", "worcestershire borough council", "worcestershire city council", "worcestershire council", "worcestershire council tax", "worcestershire county council", "worcestershire ctax", "worcestershire district council", "worthing borough council", "worthing city council", "worthing council", "worthing council tax", "worthing county council", "worthing ctax", "worthing district council", "wrexham borough council", "wrexham city council", "wrexham council", "wrexham council tax", "wrexham county council", "wrexham ctax", "wrexham district council", "wychavon borough council", "wychavon city council", "wychavon council", "wychavon council tax", "wychavon county council", "wychavon ctax", "wychavon district council", "wyre borough council", "wyre city council", "wyre council", "wyre council tax", "wyre county council", "wyre ctax", "wyre district council", "wyre forest borough council", "wyre forest city council", "wyre forest council", "wyre forest council tax", "wyre forest county council", "wyre forest ctax", "wyre forest district council", "xcel energy", "xfinity", "ynys mon borough council", "ynys mon city council", "ynys mon council", "ynys mon council tax", "ynys mon county council", "ynys mon ctax", "ynys mon district council", "york borough council", "york city council", "york council", "york council tax", "york county council", "york ctax", "york district council", "yorkshire bs mortgage", "yorkshire water", "youfibre", "your move lettings", "yu energy", "zen internet", "zurich", "zurich insurance"]}, {"id": "health", "label": "Health, Fitness, Medical & Beauty", "icon": "🏥", "color": "#14b8a6", "keywords": ["1rebel", "ace & tate", "active newham", "acupuncture", "aesthetic clinic", "anytime fitness", "anytime fitness aberdeen", "anytime fitness ayr", "anytime fitness bangor", "anytime fitness barnsley", "anytime fitness basildon", "anytime fitness basingstoke", "anytime fitness bath", "anytime fitness belfast", "anytime fitness birkenhead", "anytime fitness birmingham", "anytime fitness blackburn", "anytime fitness blackpool", "anytime fitness bournemouth", "anytime fitness bradford", "anytime fitness bridgend", "anytime fitness brighton", "anytime fitness bristol", "anytime fitness burton", "anytime fitness cambridge", "anytime fitness cardiff", "anytime fitness carlisle", "anytime fitness chelmsford", "anytime fitness cheltenham", "anytime fitness chester", "anytime fitness chichester", "anytime fitness colchester", "anytime fitness coventry", "anytime fitness crawley", "anytime fitness crewe", "anytime fitness cumbernauld", "anytime fitness darlington", "anytime fitness derby", "anytime fitness doncaster", "anytime fitness dumfries", "anytime fitness dundee", "anytime fitness dunfermline", "anytime fitness durham", "anytime fitness east kilbride", "anytime fitness eastbourne", "anytime fitness edinburgh", "anytime fitness exeter", "anytime fitness falkirk", "anytime fitness glasgow", "anytime fitness gloucester", "anytime fitness grimsby", "anytime fitness guildford", "anytime fitness halifax", "anytime fitness hamilton", "anytime fitness harrogate", "anytime fitness hartlepool", "anytime fitness hastings", "anytime fitness hereford", "anytime fitness huddersfield", "anytime fitness hull", "anytime fitness inverness", "anytime fitness ipswich", "anytime fitness kilmarnock", "anytime fitness kirkcaldy", "anytime fitness lancaster", "anytime fitness leamington spa", "anytime fitness leeds", "anytime fitness leicester", "anytime fitness lincoln", "anytime fitness liverpool", "anytime fitness livingston", "anytime fitness london", "anytime fitness loughborough", "anytime fitness luton", "anytime fitness maidstone", "anytime fitness manchester", "anytime fitness middlesbrough", "anytime fitness milton keynes", "anytime fitness newcastle", "anytime fitness newport", "anytime fitness northampton", "anytime fitness norwich", "anytime fitness nottingham", "anytime fitness nuneaton", "anytime fitness oxford", "anytime fitness paisley", "anytime fitness perth", "anytime fitness peterborough", "anytime fitness plymouth", "anytime fitness poole", "anytime fitness portsmouth", "anytime fitness preston", "anytime fitness reading", "anytime fitness redditch", "anytime fitness rotherham", "anytime fitness rugby", "anytime fitness salford", "anytime fitness salisbury", "anytime fitness scunthorpe", "anytime fitness sheffield", "anytime fitness shrewsbury", "anytime fitness slough", "anytime fitness solihull", "anytime fitness southampton", "anytime fitness southport", "anytime fitness st albans", "anytime fitness st helens", "anytime fitness stafford", "anytime fitness stirling", "anytime fitness stoke", "anytime fitness sunderland", "anytime fitness swansea", "anytime fitness swindon", "anytime fitness tamworth", "anytime fitness taunton", "anytime fitness telford", "anytime fitness torquay", "anytime fitness wakefield", "anytime fitness watford", "anytime fitness westminster", "anytime fitness weymouth", "anytime fitness winchester", "anytime fitness wolverhampton", "anytime fitness worcester", "anytime fitness worthing", "anytime fitness wrexham", "anytime fitness york", "apple fitness plus", "apple fitness+", "badham pharmacy", "bannatyne", "bannatyne health club", "bannatynes", "barber", "barnsley hospital nhs", "barry's bootcamp", "barrys bootcamp", "barts health nhs", "bayfields opticians", "beauty salon", "bedfordshire hospitals nhs", "better gym", "betterhelp", "betterhelp.com", "bft fitness", "birmingham women and childrens nhs", "blackpool teaching hospitals nhs", "blood test", "blue tit london", "bmi healthcare", "bolton nhs foundation trust", "boots dispensing", "boots opticians", "boots pharmacy", "boots prescription", "boots the chemist", "buckinghamshire healthcare nhs", "bupa dental", "bupa dental care", "bupa health centre", "cadogan clinic", "calm app", "calm.com", "cambridge university hospitals nhs", "charles worthington", "chelsea and westminster nhs", "chemist", "chemist direct", "chemist4u", "chesterfield royal hospital nhs", "chiropractor", "circle health group", "citydoc travel", "classpass", "classpass inc", "clinic", "cohens chemist", "colosseum dental", "contact lenses", "contactlenses.co.uk", "counselling", "counselling directory", "countess of chester hospital nhs", "county durham and darlington nhs", "crossfit", "cvs", "cvs pharmacy", "cvs/pharmacy", "damira dental", "damira dental studios", "daniel galvin", "david clulow", "david lloyd", "david lloyd aberdeen", "david lloyd ayr", "david lloyd bangor", "david lloyd barnsley", "david lloyd basildon", "david lloyd basingstoke", "david lloyd bath", "david lloyd belfast", "david lloyd birkenhead", "david lloyd birmingham", "david lloyd blackburn", "david lloyd blackpool", "david lloyd bournemouth", "david lloyd bradford", "david lloyd bridgend", "david lloyd brighton", "david lloyd bristol", "david lloyd burton", "david lloyd cambridge", "david lloyd cardiff", "david lloyd carlisle", "david lloyd chelmsford", "david lloyd cheltenham", "david lloyd chester", "david lloyd chichester", "david lloyd clubs", "david lloyd colchester", "david lloyd coventry", "david lloyd crawley", "david lloyd crewe", "david lloyd cumbernauld", "david lloyd darlington", "david lloyd derby", "david lloyd doncaster", "david lloyd dumfries", "david lloyd dundee", "david lloyd dunfermline", "david lloyd durham", "david lloyd east kilbride", "david lloyd eastbourne", "david lloyd edinburgh", "david lloyd exeter", "david lloyd falkirk", "david lloyd glasgow", "david lloyd gloucester", "david lloyd grimsby", "david lloyd guildford", "david lloyd halifax", "david lloyd hamilton", "david lloyd harrogate", "david lloyd hartlepool", "david lloyd hastings", "david lloyd hereford", "david lloyd huddersfield", "david lloyd hull", "david lloyd inverness", "david lloyd ipswich", "david lloyd kilmarnock", "david lloyd kirkcaldy", "david lloyd lancaster", "david lloyd leamington spa", "david lloyd leeds", "david lloyd leicester", "david lloyd leisure", "david lloyd lincoln", "david lloyd liverpool", "david lloyd livingston", "david lloyd london", "david lloyd loughborough", "david lloyd luton", "david lloyd maidstone", "david lloyd manchester", "david lloyd middlesbrough", "david lloyd milton keynes", "david lloyd newcastle", "david lloyd newport", "david lloyd northampton", "david lloyd norwich", "david lloyd nottingham", "david lloyd nuneaton", "david lloyd oxford", "david lloyd paisley", "david lloyd perth", "david lloyd peterborough", "david lloyd plymouth", "david lloyd poole", "david lloyd portsmouth", "david lloyd preston", "david lloyd reading", "david lloyd redditch", "david lloyd rotherham", "david lloyd rugby", "david lloyd salford", "david lloyd salisbury", "david lloyd scunthorpe", "david lloyd sheffield", "david lloyd shrewsbury", "david lloyd slough", "david lloyd solihull", "david lloyd southampton", "david lloyd southport", "david lloyd st albans", "david lloyd st helens", "david lloyd stafford", "david lloyd stirling", "david lloyd stoke", "david lloyd sunderland", "david lloyd swansea", "david lloyd swindon", "david lloyd tamworth", "david lloyd taunton", "david lloyd telford", "david lloyd torquay", "david lloyd wakefield", "david lloyd watford", "david lloyd westminster", "david lloyd weymouth", "david lloyd winchester", "david lloyd wolverhampton", "david lloyd worcester", "david lloyd worthing", "david lloyd wrexham", "david lloyd york", "day lewis pharmacy", "dental", "dental partners", "dental practice", "dental surgery", "dentex dental", "dentist", "destinationskin", "diamond whites", "doctor", "doctor care anywhere", "doctor-4-u", "doncaster and bassetlaw teaching hospitals nhs", "dorset healthcare nhs", "dudley group nhs", "east kent hospitals nhs", "east lancashire hospitals nhs", "ef medispa", "envisage dental", "equinox fitness", "everlast gyms", "everyone active", "express scripts", "eyecare", "f45", "f45 fitness", "f45 training", "feel good contacts", "fiit tv", "fitbit premium", "fitness", "fitness first", "fitness first clubs", "forth with life", "freedom leisure", "freeletics", "frimley health nhs", "gateshead health nhs", "glasses", "glasses direct", "gll leisure", "gloucestershire hospitals nhs", "gp surgery", "great western hospitals nhs", "guys and st thomas nhs", "gym", "gymbox", "hair", "hair salon", "hairdressing", "hakim group", "halo leisure", "hampshire hospitals nhs", "harley medical group", "harley street clinic", "hca healthcare", "hca uk", "headmasters", "headmasters salons", "headspace", "headspace app", "health clinic", "hob salons", "hospital", "hull university teaching hospitals nhs", "imperial college healthcare nhs", "invisalign", "iolla", "isle of wight nhs trust", "jacks of london", "jd gyms", "kamsons pharmacy", "kettering general hospital nhs", "king edward vii hospital", "kings college hospital nhs", "lancashire teaching hospitals nhs", "laser clinics uk", "leeds teaching hospitals nhs", "leightons opticians", "leisure centre", "lenstore", "lenstore.co.uk", "les mills on demand", "lex leisure", "liverpool university hospitals nhs", "livi medical", "lloyds pharmacy", "lloydspharmacy", "manchester university nhs", "manor pharmacy", "massage", "medical", "medichecks", "medicspot", "mid and south essex nhs", "mid cheshire hospitals nhs", "milton keynes university hospital nhs", "mind", "mind charity", "mri scan", "murdock london", "mydentist", "mydentist dental", "myfitnesspal", "nail bar", "nail salon", "nails inc", "newcastle upon tyne hospitals nhs", "nhs dental", "nhs ppc", "nhs prepayment", "nhs prescription", "nhs prescription charge", "nomad travel clinics", "norfolk and norwich university hospitals nhs", "north bristol nhs", "northampton general hospital nhs", "northumbria healthcare nhs", "nottingham university hospitals nhs", "nuffield", "nuffield health", "nuffield health aberdeen", "nuffield health ayr", "nuffield health bangor", "nuffield health barnsley", "nuffield health basildon", "nuffield health basingstoke", "nuffield health bath", "nuffield health belfast", "nuffield health birkenhead", "nuffield health birmingham", "nuffield health blackburn", "nuffield health blackpool", "nuffield health bournemouth", "nuffield health bradford", "nuffield health bridgend", "nuffield health brighton", "nuffield health bristol", "nuffield health burton", "nuffield health cambridge", "nuffield health cardiff", "nuffield health carlisle", "nuffield health chelmsford", "nuffield health cheltenham", "nuffield health chester", "nuffield health chichester", "nuffield health colchester", "nuffield health coventry", "nuffield health crawley", "nuffield health crewe", "nuffield health cumbernauld", "nuffield health darlington", "nuffield health derby", "nuffield health doncaster", "nuffield health dumfries", "nuffield health dundee", "nuffield health dunfermline", "nuffield health durham", "nuffield health east kilbride", "nuffield health eastbourne", "nuffield health edinburgh", "nuffield health exeter", "nuffield health falkirk", "nuffield health fitness", "nuffield health glasgow", "nuffield health gloucester", "nuffield health grimsby", "nuffield health guildford", "nuffield health halifax", "nuffield health hamilton", "nuffield health harrogate", "nuffield health hartlepool", "nuffield health hastings", "nuffield health hereford", "nuffield health huddersfield", "nuffield health hull", "nuffield health inverness", "nuffield health ipswich", "nuffield health kilmarnock", "nuffield health kirkcaldy", "nuffield health lancaster", "nuffield health leamington spa", "nuffield health leeds", "nuffield health leicester", "nuffield health lincoln", "nuffield health liverpool", "nuffield health livingston", "nuffield health london", "nuffield health loughborough", "nuffield health luton", "nuffield health maidstone", "nuffield health manchester", "nuffield health middlesbrough", "nuffield health milton keynes", "nuffield health newcastle", "nuffield health newport", "nuffield health northampton", "nuffield health norwich", "nuffield health nottingham", "nuffield health nuneaton", "nuffield health oxford", "nuffield health paisley", "nuffield health perth", "nuffield health peterborough", "nuffield health plymouth", "nuffield health poole", "nuffield health portsmouth", "nuffield health preston", "nuffield health reading", "nuffield health redditch", "nuffield health rotherham", "nuffield health rugby", "nuffield health salford", "nuffield health salisbury", "nuffield health scunthorpe", "nuffield health sheffield", "nuffield health shrewsbury", "nuffield health slough", "nuffield health solihull", "nuffield health southampton", "nuffield health southport", "nuffield health st albans", "nuffield health st helens", "nuffield health stafford", "nuffield health stirling", "nuffield health stoke", "nuffield health sunderland", "nuffield health swansea", "nuffield health swindon", "nuffield health tamworth", "nuffield health taunton", "nuffield health telford", "nuffield health torquay", "nuffield health wakefield", "nuffield health watford", "nuffield health westminster", "nuffield health weymouth", "nuffield health winchester", "nuffield health wolverhampton", "nuffield health worcester", "nuffield health worthing", "nuffield health wrexham", "nuffield health york", "ollie quinn", "optical express", "optician", "orangetheory fitness", "orthodontist", "orthodontist practice", "osteopath", "oxford online pharmacy", "oxford university hospitals nhs", "pall mall barbers", "parkwood leisure", "peloton", "peloton interactive", "pharmacy", "pharmacy 2u", "pharmacy2u", "phlo pharmacy", "physio", "physiotherapy", "piercing", "pilates", "pilltime", "places leisure", "plymouth hospitals nhs", "podiatry", "portman dental care", "portsmouth hospitals university nhs", "positive touch", "prescription", "priory group", "priory hospital", "private clinic", "psychotherapy", "psychotherapy practice", "pure gym", "puregym", "puregym aberdeen", "puregym ayr", "puregym bangor", "puregym barnsley", "puregym basildon", "puregym basingstoke", "puregym bath", "puregym belfast", "puregym birkenhead", "puregym birmingham", "puregym blackburn", "puregym blackpool", "puregym bournemouth", "puregym bradford", "puregym bridgend", "puregym brighton", "puregym bristol", "puregym burton", "puregym cambridge", "puregym cardiff", "puregym carlisle", "puregym chelmsford", "puregym cheltenham", "puregym chester", "puregym chichester", "puregym colchester", "puregym coventry", "puregym crawley", "puregym crewe", "puregym cumbernauld", "puregym darlington", "puregym derby", "puregym doncaster", "puregym dumfries", "puregym dundee", "puregym dunfermline", "puregym durham", "puregym east kilbride", "puregym eastbourne", "puregym edinburgh", "puregym exeter", "puregym falkirk", "puregym glasgow", "puregym gloucester", "puregym grimsby", "puregym guildford", "puregym halifax", "puregym hamilton", "puregym harrogate", "puregym hartlepool", "puregym hastings", "puregym hereford", "puregym huddersfield", "puregym hull", "puregym inverness", "puregym ipswich", "puregym kilmarnock", "puregym kirkcaldy", "puregym lancaster", "puregym leamington spa", "puregym leeds", "puregym leicester", "puregym limited", "puregym lincoln", "puregym liverpool", "puregym livingston", "puregym london", "puregym loughborough", "puregym luton", "puregym maidstone", "puregym manchester", "puregym middlesbrough", "puregym milton keynes", "puregym newcastle", "puregym newport", "puregym northampton", "puregym norwich", "puregym nottingham", "puregym nuneaton", "puregym oxford", "puregym paisley", "puregym perth", "puregym peterborough", "puregym plymouth", "puregym poole", "puregym portsmouth", "puregym preston", "puregym reading", "puregym redditch", "puregym rotherham", "puregym rugby", "puregym salford", "puregym salisbury", "puregym scunthorpe", "puregym sheffield", "puregym shrewsbury", "puregym slough", "puregym solihull", "puregym southampton", "puregym southport", "puregym st albans", "puregym st helens", "puregym stafford", "puregym stirling", "puregym stoke", "puregym sunderland", "puregym swansea", "puregym swindon", "puregym tamworth", "puregym taunton", "puregym telford", "puregym torquay", "puregym wakefield", "puregym watford", "puregym westminster", "puregym weymouth", "puregym winchester", "puregym wolverhampton", "puregym worcester", "puregym worthing", "puregym wrexham", "puregym york", "push doctor", "rachel's positive touch", "rachels positive touch", "ramsay health care", "ramsay healthcare", "randox", "randox health", "regis salons", "rite aid", "rite aid pharmacy", "rodericks dental", "rotherham nhs foundation trust", "rowlands pharmacy", "royal berkshire nhs", "royal devon and exeter nhs", "royal free london nhs", "royal wolverhampton nhs", "ruffians barbers", "rush hair", "rush hair & beauty", "salford royal nhs", "salisbury nhs foundation trust", "salon", "sandwell and west birmingham nhs", "sassoon salon", "scrivens", "scrivens opticians", "selectspecs", "sheffield teaching hospitals nhs", "sherwood forest hospitals nhs", "shine & smile", "shine and smile", "shrewsbury and telford hospital nhs", "simple online pharmacy", "sk:n clinic", "sk:n clinics", "smartbuyglasses", "smile clinic", "smiledirectclub", "snap fitness", "somerset nhs foundation trust", "south tees hospitals nhs", "south warwickshire university nhs", "southampton university hospitals nhs", "spa day", "specsavers", "specsavers opticians", "specsavers opticians aberdeen", "specsavers opticians ayr", "specsavers opticians bangor", "specsavers opticians barnsley", "specsavers opticians basildon", "specsavers opticians basingstoke", "specsavers opticians bath", "specsavers opticians belfast", "specsavers opticians birkenhead", "specsavers opticians birmingham", "specsavers opticians blackburn", "specsavers opticians blackpool", "specsavers opticians bournemouth", "specsavers opticians bradford", "specsavers opticians bridgend", "specsavers opticians brighton", "specsavers opticians bristol", "specsavers opticians burton", "specsavers opticians cambridge", "specsavers opticians cardiff", "specsavers opticians carlisle", "specsavers opticians chelmsford", "specsavers opticians cheltenham", "specsavers opticians chester", "specsavers opticians chichester", "specsavers opticians colchester", "specsavers opticians coventry", "specsavers opticians crawley", "specsavers opticians crewe", "specsavers opticians cumbernauld", "specsavers opticians darlington", "specsavers opticians derby", "specsavers opticians doncaster", "specsavers opticians dumfries", "specsavers opticians dundee", "specsavers opticians dunfermline", "specsavers opticians durham", "specsavers opticians east kilbride", "specsavers opticians eastbourne", "specsavers opticians edinburgh", "specsavers opticians exeter", "specsavers opticians falkirk", "specsavers opticians glasgow", "specsavers opticians gloucester", "specsavers opticians grimsby", "specsavers opticians guildford", "specsavers opticians halifax", "specsavers opticians hamilton", "specsavers opticians harrogate", "specsavers opticians hartlepool", "specsavers opticians hastings", "specsavers opticians hereford", "specsavers opticians huddersfield", "specsavers opticians hull", "specsavers opticians inverness", "specsavers opticians ipswich", "specsavers opticians kilmarnock", "specsavers opticians kirkcaldy", "specsavers opticians lancaster", "specsavers opticians leamington spa", "specsavers opticians leeds", "specsavers opticians leicester", "specsavers opticians lincoln", "specsavers opticians liverpool", "specsavers opticians livingston", "specsavers opticians london", "specsavers opticians loughborough", "specsavers opticians luton", "specsavers opticians maidstone", "specsavers opticians manchester", "specsavers opticians middlesbrough", "specsavers opticians milton keynes", "specsavers opticians newcastle", "specsavers opticians newport", "specsavers opticians northampton", "specsavers opticians norwich", "specsavers opticians nottingham", "specsavers opticians nuneaton", "specsavers opticians oxford", "specsavers opticians paisley", "specsavers opticians perth", "specsavers opticians peterborough", "specsavers opticians plymouth", "specsavers opticians poole", "specsavers opticians portsmouth", "specsavers opticians preston", "specsavers opticians reading", "specsavers opticians redditch", "specsavers opticians rotherham", "specsavers opticians rugby", "specsavers opticians salford", "specsavers opticians salisbury", "specsavers opticians scunthorpe", "specsavers opticians sheffield", "specsavers opticians shrewsbury", "specsavers opticians slough", "specsavers opticians solihull", "specsavers opticians southampton", "specsavers opticians southport", "specsavers opticians st albans", "specsavers opticians st helens", "specsavers opticians stafford", "specsavers opticians stirling", "specsavers opticians stoke", "specsavers opticians sunderland", "specsavers opticians swansea", "specsavers opticians swindon", "specsavers opticians tamworth", "specsavers opticians taunton", "specsavers opticians telford", "specsavers opticians torquay", "specsavers opticians wakefield", "specsavers opticians watford", "specsavers opticians westminster", "specsavers opticians weymouth", "specsavers opticians winchester", "specsavers opticians wolverhampton", "specsavers opticians worcester", "specsavers opticians worthing", "specsavers opticians wrexham", "specsavers opticians york", "spex4less", "spire healthcare", "spire hospital", "st georges university hospitals nhs", "stockport nhs foundation trust", "strava", "strava subscription", "sunbed", "supercuts", "superdrug health clinic", "superdrug pharmacy", "surrey and sussex healthcare nhs", "swimming pool", "talkspace", "tanning", "tattoo", "tattoo studio", "ted's grooming room", "the gym", "the gym aberdeen", "the gym ayr", "the gym bangor", "the gym barnsley", "the gym basildon", "the gym basingstoke", "the gym bath", "the gym belfast", "the gym birkenhead", "the gym birmingham", "the gym blackburn", "the gym blackpool", "the gym bournemouth", "the gym bradford", "the gym bridgend", "the gym brighton", "the gym bristol", "the gym burton", "the gym cambridge", "the gym cardiff", "the gym carlisle", "the gym chelmsford", "the gym cheltenham", "the gym chester", "the gym chichester", "the gym colchester", "the gym coventry", "the gym crawley", "the gym crewe", "the gym cumbernauld", "the gym darlington", "the gym derby", "the gym doncaster", "the gym dumfries", "the gym dundee", "the gym dunfermline", "the gym durham", "the gym east kilbride", "the gym eastbourne", "the gym edinburgh", "the gym exeter", "the gym falkirk", "the gym glasgow", "the gym gloucester", "the gym grimsby", "the gym group", "the gym guildford", "the gym halifax", "the gym hamilton", "the gym harrogate", "the gym hartlepool", "the gym hastings", "the gym hereford", "the gym huddersfield", "the gym hull", "the gym inverness", "the gym ipswich", "the gym kilmarnock", "the gym kirkcaldy", "the gym lancaster", "the gym leamington spa", "the gym leeds", "the gym leicester", "the gym lincoln", "the gym liverpool", "the gym livingston", "the gym london", "the gym loughborough", "the gym luton", "the gym maidstone", "the gym manchester", "the gym middlesbrough", "the gym milton keynes", "the gym newcastle", "the gym newport", "the gym northampton", "the gym norwich", "the gym nottingham", "the gym nuneaton", "the gym oxford", "the gym paisley", "the gym perth", "the gym peterborough", "the gym plymouth", "the gym poole", "the gym portsmouth", "the gym preston", "the gym reading", "the gym redditch", "the gym rotherham", "the gym rugby", "the gym salford", "the gym salisbury", "the gym scunthorpe", "the gym sheffield", "the gym shrewsbury", "the gym slough", "the gym solihull", "the gym southampton", "the gym southport", "the gym st albans", "the gym st helens", "the gym stafford", "the gym stirling", "the gym stoke", "the gym sunderland", "the gym swansea", "the gym swindon", "the gym tamworth", "the gym taunton", "the gym telford", "the gym torquay", "the gym wakefield", "the gym watford", "the gym westminster", "the gym weymouth", "the gym winchester", "the gym wolverhampton", "the gym worcester", "the gym worthing", "the gym wrexham", "the gym york", "the london clinic", "therapie clinic", "third space", "third space london", "thriva health", "toni & guy", "toni and guy", "torbay and south devon nhs", "total fitness", "townhouse nails", "transform hospital group", "trevor sorbie", "united lincolnshire hospitals nhs", "university college london hospitals nhs", "university hospitals birmingham nhs", "university hospitals bristol nhs", "university hospitals coventry and warwickshire nhs", "university hospitals of derby and burton nhs", "university hospitals of leicester nhs", "university hospitals of north midlands nhs", "vidal sassoon", "village gym", "virgin active", "virgin active health", "vision express", "vision express aberdeen", "vision express ayr", "vision express bangor", "vision express barnsley", "vision express basildon", "vision express basingstoke", "vision express bath", "vision express belfast", "vision express birkenhead", "vision express birmingham", "vision express blackburn", "vision express blackpool", "vision express bournemouth", "vision express bradford", "vision express bridgend", "vision express brighton", "vision express bristol", "vision express burton", "vision express cambridge", "vision express cardiff", "vision express carlisle", "vision express chelmsford", "vision express cheltenham", "vision express chester", "vision express chichester", "vision express colchester", "vision express coventry", "vision express crawley", "vision express crewe", "vision express cumbernauld", "vision express darlington", "vision express derby", "vision express doncaster", "vision express dumfries", "vision express dundee", "vision express dunfermline", "vision express durham", "vision express east kilbride", "vision express eastbourne", "vision express edinburgh", "vision express exeter", "vision express falkirk", "vision express glasgow", "vision express gloucester", "vision express grimsby", "vision express guildford", "vision express halifax", "vision express hamilton", "vision express harrogate", "vision express hartlepool", "vision express hastings", "vision express hereford", "vision express huddersfield", "vision express hull", "vision express inverness", "vision express ipswich", "vision express kilmarnock", "vision express kirkcaldy", "vision express lancaster", "vision express leamington spa", "vision express leeds", "vision express leicester", "vision express lincoln", "vision express liverpool", "vision express livingston", "vision express london", "vision express loughborough", "vision express luton", "vision express maidstone", "vision express manchester", "vision express middlesbrough", "vision express milton keynes", "vision express newcastle", "vision express newport", "vision express northampton", "vision express norwich", "vision express nottingham", "vision express nuneaton", "vision express oxford", "vision express paisley", "vision express perth", "vision express peterborough", "vision express plymouth", "vision express poole", "vision express portsmouth", "vision express preston", "vision express reading", "vision express redditch", "vision express rotherham", "vision express rugby", "vision express salford", "vision express salisbury", "vision express scunthorpe", "vision express sheffield", "vision express shrewsbury", "vision express slough", "vision express solihull", "vision express southampton", "vision express southport", "vision express st albans", "vision express st helens", "vision express stafford", "vision express stirling", "vision express stoke", "vision express sunderland", "vision express swansea", "vision express swindon", "vision express tamworth", "vision express taunton", "vision express telford", "vision express torquay", "vision express wakefield", "vision express watford", "vision express westminster", "vision express weymouth", "vision express winchester", "vision express wolverhampton", "vision express worcester", "vision express worthing", "vision express wrexham", "vision express york", "waking up app", "walgreens", "walgreens pharmacy", "walsall healthcare nhs", "warby parker", "waxing", "well pharmacy", "well pharmacy ltd", "whoop", "whoop strap", "wirral university teaching hospital nhs", "worcestershire acute hospitals nhs", "workout", "wrightington wigan and leigh nhs", "wye valley nhs trust", "yoga", "york and scarborough teaching hospitals nhs", "yorktest laboratories", "young nails", "zeiss vision centre", "zwift", "zwift cycling"]}, {"id": "travel", "label": "Travel, Airlines, Hotels & Holidays", "icon": "✈️", "color": "#06b6d4", "keywords": ["aberdeen airport ltd", "accor", "accor hotels", "aegean airlines", "aer lingus", "agoda", "agoda company", "air canada", "air france", "air india", "air new zealand", "airbnb", "airbnb payments", "airbnb uk", "airline", "airport", "airways", "alaska airlines", "all nippon airways", "aloft hotels", "alton the sta", "alton the star", "american airlines", "amsterdam schiphol airport", "apex hotels", "audley travel", "aurigny", "austrian airlines", "away resorts", "ba direct", "ba.com", "barcelona el prat airport", "belfast international airport", "best western", "best western hotels", "birmingham airport ltd", "blue islands", "booking.com", "booking.com bv", "bournemouth airport ltd", "bristol airport ltd", "britannia hotels", "british airways", "brittany ferries", "brussels airlines", "butlin's", "butlins", "caledonian macbrayne", "calmac", "calmac ferries", "camplify", "canopy & stars", "cardiff airport ltd", "carnival cruise line", "cathay pacific", "cdg airport", "celebrity cruises", "center parcs", "center parcs uk", "changi airport", "cheapflights", "chicago ohare", "citizenm", "citizenm hotels", "condor ferries", "cool camping", "cottages.com", "courtyard by marriott", "cox & kings", "croatia airlines", "crowne plaza", "cruise", "cunard line", "curio collection", "delta air", "delta air lines", "dfds", "dfds seaways", "disney cruise line", "doha hamad airport", "doubletree", "doubletree by hilton", "dubai international airport", "dublin airport daa", "duty free", "dxb airport", "east midlands airport", "eastern airways", "easyhotel", "easyjet", "easyjet.com", "edinburgh airport ltd", "edreams", "emirates", "emirates airlines", "english heritage cottages", "etihad", "etihad airways", "eurowings", "exeter airport ltd", "expedia", "expedia.co.uk", "explore worldwide", "ferry", "finnair", "flight", "flight centre", "forest holidays", "frankfurt airport", "fred olsen cruises", "g adventures", "gatwick airport ltd", "george best belfast city airport", "glasgow airport ltd", "goboony", "gulf air", "hampton by hilton", "hand picked hotels", "haven holiday park", "haven holidays", "hays travel", "heathrow airport ltd", "hilton", "hilton hotels", "hipcamp", "holiday", "holiday inn", "holiday inn aberdeen", "holiday inn ayr", "holiday inn bangor", "holiday inn barnsley", "holiday inn basildon", "holiday inn basingstoke", "holiday inn bath", "holiday inn belfast", "holiday inn birkenhead", "holiday inn birmingham", "holiday inn blackburn", "holiday inn blackpool", "holiday inn bournemouth", "holiday inn bradford", "holiday inn bridgend", "holiday inn brighton", "holiday inn bristol", "holiday inn burton", "holiday inn cambridge", "holiday inn cardiff", "holiday inn carlisle", "holiday inn chelmsford", "holiday inn cheltenham", "holiday inn chester", "holiday inn chichester", "holiday inn colchester", "holiday inn coventry", "holiday inn crawley", "holiday inn crewe", "holiday inn cumbernauld", "holiday inn darlington", "holiday inn derby", "holiday inn doncaster", "holiday inn dumfries", "holiday inn dundee", "holiday inn dunfermline", "holiday inn durham", "holiday inn east kilbride", "holiday inn eastbourne", "holiday inn edinburgh", "holiday inn exeter", "holiday inn express", "holiday inn falkirk", "holiday inn glasgow", "holiday inn gloucester", "holiday inn grimsby", "holiday inn guildford", "holiday inn halifax", "holiday inn hamilton", "holiday inn harrogate", "holiday inn hartlepool", "holiday inn hastings", "holiday inn hereford", "holiday inn huddersfield", "holiday inn hull", "holiday inn inverness", "holiday inn ipswich", "holiday inn kilmarnock", "holiday inn kirkcaldy", "holiday inn lancaster", "holiday inn leamington spa", "holiday inn leeds", "holiday inn leicester", "holiday inn lincoln", "holiday inn liverpool", "holiday inn livingston", "holiday inn london", "holiday inn loughborough", "holiday inn luton", "holiday inn maidstone", "holiday inn manchester", "holiday inn middlesbrough", "holiday inn milton keynes", "holiday inn newcastle", "holiday inn newport", "holiday inn northampton", "holiday inn norwich", "holiday inn nottingham", "holiday inn nuneaton", "holiday inn oxford", "holiday inn paisley", "holiday inn perth", "holiday inn peterborough", "holiday inn plymouth", "holiday inn poole", "holiday inn portsmouth", "holiday inn preston", "holiday inn reading", "holiday inn redditch", "holiday inn rotherham", "holiday inn rugby", "holiday inn salford", "holiday inn salisbury", "holiday inn scunthorpe", "holiday inn sheffield", "holiday inn shrewsbury", "holiday inn slough", "holiday inn solihull", "holiday inn southampton", "holiday inn southport", "holiday inn st albans", "holiday inn st helens", "holiday inn stafford", "holiday inn stirling", "holiday inn stoke", "holiday inn sunderland", "holiday inn swansea", "holiday inn swindon", "holiday inn tamworth", "holiday inn taunton", "holiday inn telford", "holiday inn torquay", "holiday inn wakefield", "holiday inn watford", "holiday inn westminster", "holiday inn weymouth", "holiday inn winchester", "holiday inn wolverhampton", "holiday inn worcester", "holiday inn worthing", "holiday inn wrexham", "holiday inn york", "holland america line", "hoseasons", "hoseasons holidays", "hostel", "hostelworld", "hostelworld.com", "hotel", "hotel du vin", "hotels.com", "hurtigruten", "iberia", "iberia express", "ibis", "ibis budget", "ibis hotel aberdeen", "ibis hotel ayr", "ibis hotel bangor", "ibis hotel barnsley", "ibis hotel basildon", "ibis hotel basingstoke", "ibis hotel bath", "ibis hotel belfast", "ibis hotel birkenhead", "ibis hotel birmingham", "ibis hotel blackburn", "ibis hotel blackpool", "ibis hotel bournemouth", "ibis hotel bradford", "ibis hotel bridgend", "ibis hotel brighton", "ibis hotel bristol", "ibis hotel burton", "ibis hotel cambridge", "ibis hotel cardiff", "ibis hotel carlisle", "ibis hotel chelmsford", "ibis hotel cheltenham", "ibis hotel chester", "ibis hotel chichester", "ibis hotel colchester", "ibis hotel coventry", "ibis hotel crawley", "ibis hotel crewe", "ibis hotel cumbernauld", "ibis hotel darlington", "ibis hotel derby", "ibis hotel doncaster", "ibis hotel dumfries", "ibis hotel dundee", "ibis hotel dunfermline", "ibis hotel durham", "ibis hotel east kilbride", "ibis hotel eastbourne", "ibis hotel edinburgh", "ibis hotel exeter", "ibis hotel falkirk", "ibis hotel glasgow", "ibis hotel gloucester", "ibis hotel grimsby", "ibis hotel guildford", "ibis hotel halifax", "ibis hotel hamilton", "ibis hotel harrogate", "ibis hotel hartlepool", "ibis hotel hastings", "ibis hotel hereford", "ibis hotel huddersfield", "ibis hotel hull", "ibis hotel inverness", "ibis hotel ipswich", "ibis hotel kilmarnock", "ibis hotel kirkcaldy", "ibis hotel lancaster", "ibis hotel leamington spa", "ibis hotel leeds", "ibis hotel leicester", "ibis hotel lincoln", "ibis hotel liverpool", "ibis hotel livingston", "ibis hotel london", "ibis hotel loughborough", "ibis hotel luton", "ibis hotel maidstone", "ibis hotel manchester", "ibis hotel middlesbrough", "ibis hotel milton keynes", "ibis hotel newcastle", "ibis hotel newport", "ibis hotel northampton", "ibis hotel norwich", "ibis hotel nottingham", "ibis hotel nuneaton", "ibis hotel oxford", "ibis hotel paisley", "ibis hotel perth", "ibis hotel peterborough", "ibis hotel plymouth", "ibis hotel poole", "ibis hotel portsmouth", "ibis hotel preston", "ibis hotel reading", "ibis hotel redditch", "ibis hotel rotherham", "ibis hotel rugby", "ibis hotel salford", "ibis hotel salisbury", "ibis hotel scunthorpe", "ibis hotel sheffield", "ibis hotel shrewsbury", "ibis hotel slough", "ibis hotel solihull", "ibis hotel southampton", "ibis hotel southport", "ibis hotel st albans", "ibis hotel st helens", "ibis hotel stafford", "ibis hotel stirling", "ibis hotel stoke", "ibis hotel sunderland", "ibis hotel swansea", "ibis hotel swindon", "ibis hotel tamworth", "ibis hotel taunton", "ibis hotel telford", "ibis hotel torquay", "ibis hotel wakefield", "ibis hotel watford", "ibis hotel westminster", "ibis hotel weymouth", "ibis hotel winchester", "ibis hotel wolverhampton", "ibis hotel worcester", "ibis hotel worthing", "ibis hotel wrexham", "ibis hotel york", "ibis hotels", "ibis styles", "icelandair", "ihg", "ihg hotels & resorts", "indigo airlines", "intercontinental hotels", "intrepid travel", "inverness airport ltd", "irish ferries", "isle of man steam packet", "japan airlines", "jet2", "jet2.com", "jet2holidays", "jetblue airways", "jfk international airport", "jurys inn", "kayak", "kayak.com", "klm", "klm royal dutch", "korean air", "kuoni", "kuoni travel", "landmark trust", "last minute", "lastminute.com", "lax airport", "leeds bradford airport", "leonardo hotels", "liverpool john lennon airport", "loganair", "london city airport", "london gatwick airport", "london heathrow airport", "london luton airport", "london stansted airport", "los angeles international", "lot polish airlines", "loveholidays", "loveholidays.com", "lufthansa", "lufthansa german", "luton airport operations", "macdonald hotels", "madrid barajas airport", "malmaison", "manchester airport plc", "marella cruises", "marriott", "marriott hotels", "mercure", "mercure hotels", "momondo", "motel", "moxy hotels", "msc cruises", "munich airport", "national trust holidays", "netflights", "newark liberty airport", "newcastle international airport", "northlink ferries", "norwegian air", "norwegian air shuttle", "norwegian cruise", "norwegian cruise line", "norwich airport ltd", "novotel", "o'hare international airport", "on the beach", "onthebeach.co.uk", "opodo", "orlando international airport", "p&o cruises", "p&o ferries", "paris charles de gaulle", "paris orly airport", "park holidays uk", "park inn by radisson", "park plaza hotels", "parkdean resorts", "pitchup.com", "play airlines", "po ferries", "point a hotels", "premier inn", "premier inn aberdeen", "premier inn ayr", "premier inn bangor", "premier inn barnsley", "premier inn basildon", "premier inn basingstoke", "premier inn bath", "premier inn belfast", "premier inn birkenhead", "premier inn birmingham", "premier inn blackburn", "premier inn blackpool", "premier inn bournemouth", "premier inn bradford", "premier inn bridgend", "premier inn brighton", "premier inn bristol", "premier inn burton", "premier inn cambridge", "premier inn cardiff", "premier inn carlisle", "premier inn chelmsford", "premier inn cheltenham", "premier inn chester", "premier inn chichester", "premier inn colchester", "premier inn coventry", "premier inn crawley", "premier inn crewe", "premier inn cumbernauld", "premier inn darlington", "premier inn derby", "premier inn doncaster", "premier inn dumfries", "premier inn dundee", "premier inn dunfermline", "premier inn durham", "premier inn east kilbride", "premier inn eastbourne", "premier inn edinburgh", "premier inn exeter", "premier inn falkirk", "premier inn glasgow", "premier inn gloucester", "premier inn grimsby", "premier inn guildford", "premier inn halifax", "premier inn hamilton", "premier inn harrogate", "premier inn hartlepool", "premier inn hastings", "premier inn hereford", "premier inn huddersfield", "premier inn hull", "premier inn inverness", "premier inn ipswich", "premier inn kilmarnock", "premier inn kirkcaldy", "premier inn lancaster", "premier inn leamington spa", "premier inn leeds", "premier inn leicester", "premier inn lincoln", "premier inn liverpool", "premier inn livingston", "premier inn london", "premier inn loughborough", "premier inn luton", "premier inn maidstone", "premier inn manchester", "premier inn middlesbrough", "premier inn milton keynes", "premier inn newcastle", "premier inn newport", "premier inn northampton", "premier inn norwich", "premier inn nottingham", "premier inn nuneaton", "premier inn oxford", "premier inn paisley", "premier inn perth", "premier inn peterborough", "premier inn plymouth", "premier inn poole", "premier inn portsmouth", "premier inn preston", "premier inn reading", "premier inn redditch", "premier inn rotherham", "premier inn rugby", "premier inn salford", "premier inn salisbury", "premier inn scunthorpe", "premier inn sheffield", "premier inn shrewsbury", "premier inn slough", "premier inn solihull", "premier inn southampton", "premier inn southport", "premier inn st albans", "premier inn st helens", "premier inn stafford", "premier inn stirling", "premier inn stoke", "premier inn sunderland", "premier inn swansea", "premier inn swindon", "premier inn tamworth", "premier inn taunton", "premier inn telford", "premier inn torquay", "premier inn wakefield", "premier inn watford", "premier inn westminster", "premier inn weymouth", "premier inn winchester", "premier inn wolverhampton", "premier inn worcester", "premier inn worthing", "premier inn wrexham", "premier inn york", "princess cruises", "pullman hotels", "qantas", "qantas airways", "qatar airways", "radisson", "radisson blu", "radisson hotel", "radisson red", "red funnel", "red funnel ferries", "resort", "riviera travel", "rome fiumicino airport", "roomzzz aparthotels", "royal caribbean", "royal caribbean cruise", "ryanair", "ryanair.com", "saga cruises", "san francisco international", "sas", "sas scandinavian", "saudia", "schiphol airport", "sfo airport", "sheraton hotels", "singapore airlines", "singapore changi airport", "skyscanner", "sofitel", "southampton airport ltd", "southwest airlines", "speedbird", "st helens caravan", "stansted airport ltd", "staycity aparthotels", "stena line", "sthelenscarava", "sure hotel", "swiss international air", "sykes cottages", "sykes holiday cottages", "tap air portugal", "tap portugal", "thomas cook", "titan travel", "trailfinders", "transavia", "travel agent", "travel republic", "travelodge", "travelodge aberdeen", "travelodge ayr", "travelodge bangor", "travelodge barnsley", "travelodge basildon", "travelodge basingstoke", "travelodge bath", "travelodge belfast", "travelodge birkenhead", "travelodge birmingham", "travelodge blackburn", "travelodge blackpool", "travelodge bournemouth", "travelodge bradford", "travelodge bridgend", "travelodge brighton", "travelodge bristol", "travelodge burton", "travelodge cambridge", "travelodge cardiff", "travelodge carlisle", "travelodge chelmsford", "travelodge cheltenham", "travelodge chester", "travelodge chichester", "travelodge colchester", "travelodge coventry", "travelodge crawley", "travelodge crewe", "travelodge cumbernauld", "travelodge darlington", "travelodge derby", "travelodge doncaster", "travelodge dumfries", "travelodge dundee", "travelodge dunfermline", "travelodge durham", "travelodge east kilbride", "travelodge eastbourne", "travelodge edinburgh", "travelodge exeter", "travelodge falkirk", "travelodge glasgow", "travelodge gloucester", "travelodge grimsby", "travelodge guildford", "travelodge halifax", "travelodge hamilton", "travelodge harrogate", "travelodge hartlepool", "travelodge hastings", "travelodge hereford", "travelodge huddersfield", "travelodge hull", "travelodge inverness", "travelodge ipswich", "travelodge kilmarnock", "travelodge kirkcaldy", "travelodge lancaster", "travelodge leamington spa", "travelodge leeds", "travelodge leicester", "travelodge lincoln", "travelodge liverpool", "travelodge livingston", "travelodge london", "travelodge loughborough", "travelodge luton", "travelodge maidstone", "travelodge manchester", "travelodge middlesbrough", "travelodge milton keynes", "travelodge newcastle", "travelodge newport", "travelodge northampton", "travelodge norwich", "travelodge nottingham", "travelodge nuneaton", "travelodge oxford", "travelodge paisley", "travelodge perth", "travelodge peterborough", "travelodge plymouth", "travelodge poole", "travelodge portsmouth", "travelodge preston", "travelodge reading", "travelodge redditch", "travelodge rotherham", "travelodge rugby", "travelodge salford", "travelodge salisbury", "travelodge scunthorpe", "travelodge sheffield", "travelodge shrewsbury", "travelodge slough", "travelodge solihull", "travelodge southampton", "travelodge southport", "travelodge st albans", "travelodge st helens", "travelodge stafford", "travelodge stirling", "travelodge stoke", "travelodge sunderland", "travelodge swansea", "travelodge swindon", "travelodge tamworth", "travelodge taunton", "travelodge telford", "travelodge torquay", "travelodge uk", "travelodge wakefield", "travelodge watford", "travelodge westminster", "travelodge weymouth", "travelodge winchester", "travelodge wolverhampton", "travelodge worcester", "travelodge worthing", "travelodge wrexham", "travelodge york", "tripadvisor", "trivago", "tui", "tui travel", "tui uk", "turkish airlines", "united airlines", "viking cruises", "village hotels", "virgin atlantic", "virgin atlantic airways", "virgin holidays", "volotea", "vrbo", "vrbo uk", "vueling", "vueling airlines", "waldorf astoria", "warner leisure hotels", "westin hotels", "westjet", "whitbread premier inn", "wightlink", "wightlink ferries", "wizz air", "wizzair.com", "yescapa", "yha", "yha england & wales", "yha youth hostel", "yotel", "youth hostel"]}, {"id": "education", "label": "Education, Courses & Childcare", "icon": "📚", "color": "#3b82f6", "keywords": ["aa driving school", "aberdeen su", "aberdeen uni", "aberdeen university", "aberystwyth su", "aberystwyth uni", "aberystwyth university", "arbor", "arbor education", "aston su", "aston uni", "aston university", "babbel", "babysitter", "banana moon day nursery", "bangor su", "bangor uni", "bangor university", "bath su", "bath uni", "bath university", "beds su", "beds uni", "beds university", "bill plant driving school", "birkbeck su", "birkbeck uni", "birkbeck university", "birmingham su", "birmingham uni", "birmingham university", "bournemouth su", "bournemouth uni", "bournemouth university", "bright horizons", "brighton su", "brighton uni", "brighton university", "brilliant.org", "bristol su", "bristol uni", "bristol university", "brunel su", "brunel uni", "brunel university", "bsm", "bsm driving", "bubble childcare", "busuu", "busy bees childcare", "busy bees nurseries", "cambridge su", "cambridge uni", "cambridge university", "canterbury christ church su", "canterbury christ church uni", "canterbury christ church university", "cardiff su", "cardiff uni", "cardiff university", "care.com childcare", "chester su", "chester uni", "chester university", "childbase partnership", "childcare", "childcare.co.uk", "city london su", "city london uni", "city london university", "civica pay education", "co-op childcare", "codecademy", "college", "college tuition", "course", "coursera", "coursera inc", "coventry su", "coventry uni", "coventry university", "cumbria su", "cumbria uni", "cumbria university", "datacamp", "datacamp inc", "day nursery payment", "daycare", "derby su", "derby uni", "derby university", "domestika", "driving lessons", "driving test", "dundee su", "dundee uni", "dundee university", "duolingo", "duolingo plus", "duolingo super", "dvsa driving test", "dvsa practical test", "dvsa theory test", "east anglia su", "east anglia uni", "east anglia university", "edge hill su", "edge hill uni", "edge hill university", "edinburgh napier su", "edinburgh napier uni", "edinburgh napier university", "edinburgh su", "edinburgh uni", "edinburgh university", "eduspot", "edx", "edx.org", "exeter su", "exeter uni", "exeter university", "explore learning", "falmouth su", "falmouth uni", "falmouth university", "fennies day nurseries", "firefly learning", "first tutors", "futurelearn", "glasgow su", "glasgow uni", "glasgow university", "gloucestershire su", "gloucestershire uni", "gloucestershire university", "goldsmiths su", "goldsmiths uni", "goldsmiths university", "grandir uk", "greenwich su", "greenwich uni", "greenwich university", "happy days nurseries", "heriot-watt su", "heriot-watt uni", "heriot-watt university", "hertfordshire su", "hertfordshire uni", "hertfordshire university", "hp safer roads", "hull su", "hull uni", "hull university", "imperial college su", "imperial college uni", "imperial college university", "iris parentmail", "just childcare", "keele su", "keele uni", "keele university", "khan academy", "kids planet day nurseries", "kindergarten", "kindergarten fees", "kings college london su", "kings college london uni", "kings college london university", "kingston su", "kingston uni", "kingston university", "kip mcgrath", "koru kids", "kumon", "kumon educational", "lancaster su", "lancaster uni", "lancaster university", "ldc driving school", "leeds beckett su", "leeds beckett uni", "leeds beckett university", "leeds su", "leeds uni", "leeds university", "leicester su", "leicester uni", "leicester university", "lincoln su", "lincoln uni", "lincoln university", "lingoda", "linkedin learning", "liverpool john moores su", "liverpool john moores uni", "liverpool john moores university", "liverpool su", "liverpool uni", "liverpool university", "ljmu su", "ljmu uni", "ljmu university", "london metropolitan su", "london metropolitan uni", "london metropolitan university", "london school of economics su", "london school of economics uni", "london school of economics university", "loughborough su", "loughborough uni", "loughborough university", "manchester metropolitan su", "manchester metropolitan uni", "manchester metropolitan university", "manchester su", "manchester uni", "manchester university", "masterclass", "masterclass.com", "mcas payment", "memrise", "middlesex su", "middlesex uni", "middlesex university", "midrive", "mmu su", "mmu uni", "mmu university", "monkey puzzle day nursery", "music bugs", "music lessons", "mychildatschool", "mytutor", "mytutor web", "nanny", "nanny payroll", "newcastle su", "newcastle uni", "newcastle university", "northumbria su", "northumbria uni", "northumbria university", "nottingham su", "nottingham trent su", "nottingham trent uni", "nottingham trent university", "nottingham uni", "nottingham university", "nursery", "open university su", "open university uni", "open university university", "oxford brookes su", "oxford brookes uni", "oxford brookes university", "oxford su", "oxford uni", "oxford university", "parentmail", "parentpay", "parentpay limited", "passmefast", "playgroup", "playgroup fees", "pluralsight", "plymouth su", "plymouth uni", "plymouth university", "portsmouth su", "portsmouth uni", "portsmouth university", "pre-school", "preschool fees", "queen mary su", "queen mary uni", "queen mary university", "queens belfast su", "queens belfast uni", "queens belfast university", "red driving school", "robert gordon su", "robert gordon uni", "robert gordon university", "roehampton su", "roehampton uni", "roehampton university", "rosetta stone", "royal holloway su", "royal holloway uni", "royal holloway university", "saas scotland", "safer roads", "safer roads courses", "salford su", "salford uni", "salford university", "satchel one", "school", "school fees", "school gateway", "school uniform", "schoolcomms", "schoolmoney", "scopay", "scopay.com", "sheffield hallam su", "sheffield hallam uni", "sheffield hallam university", "sheffield su", "sheffield uni", "sheffield university", "sitters.co.uk", "skillshare", "skillshare inc", "slc repayments", "soas su", "soas uni", "soas university", "solent su", "solent uni", "solent university", "south wales su", "south wales uni", "south wales university", "southampton su", "southampton uni", "southampton university", "squid card education", "stirling su", "stirling uni", "stirling university", "strathclyde su", "strathclyde uni", "strathclyde university", "student awards agency", "student finance", "student finance england", "student finance ni", "student finance wales", "student loans", "suffolk su", "suffolk uni", "suffolk university", "sunderland su", "sunderland uni", "sunderland university", "superprof", "surrey su", "surrey uni", "surrey university", "sussex su", "sussex uni", "sussex university", "swansea su", "swansea uni", "swansea university", "teachable", "teesside su", "teesside uni", "teesside university", "theory test", "theory test pro", "tinies childcare", "tops day nurseries", "training", "treehouse island", "tucasi limited", "tuition", "tuition fee payment", "tutor", "tutorful", "ucas", "ucas application", "ucas fee", "ucas payment", "ucl su", "ucl uni", "ucl university", "udacity", "udemy", "udemy.com", "ulster su", "ulster uni", "ulster university", "university", "university of aberdeen", "university of aberystwyth", "university of aston", "university of bangor", "university of bath", "university of beds", "university of birkbeck", "university of birmingham", "university of bournemouth", "university of brighton", "university of bristol", "university of brunel", "university of cambridge", "university of canterbury christ church", "university of cardiff", "university of chester", "university of city london", "university of coventry", "university of cumbria", "university of derby", "university of dundee", "university of east anglia", "university of edge hill", "university of edinburgh", "university of edinburgh napier", "university of exeter", "university of falmouth", "university of glasgow", "university of gloucestershire", "university of goldsmiths", "university of greenwich", "university of heriot-watt", "university of hertfordshire", "university of hull", "university of imperial college", "university of keele", "university of kings college london", "university of kingston", "university of lancaster", "university of leeds", "university of leeds beckett", "university of leicester", "university of lincoln", "university of liverpool", "university of liverpool john moores", "university of ljmu", "university of london metropolitan", "university of london school of economics", "university of loughborough", "university of manchester", "university of manchester metropolitan", "university of middlesex", "university of mmu", "university of newcastle", "university of northumbria", "university of nottingham", "university of nottingham trent", "university of open university", "university of oxford", "university of oxford brookes", "university of plymouth", "university of portsmouth", "university of queen mary", "university of queens belfast", "university of robert gordon", "university of roehampton", "university of royal holloway", "university of salford", "university of sheffield", "university of sheffield hallam", "university of soas", "university of solent", "university of south wales", "university of southampton", "university of stirling", "university of strathclyde", "university of suffolk", "university of sunderland", "university of surrey", "university of sussex", "university of swansea", "university of teesside", "university of ucl", "university of ulster", "university of uwe bristol", "university of warwick", "university of west london", "university of westminster", "university of winchester", "university of worcester", "university of wrexham glyndwr", "university of york", "uwe bristol su", "uwe bristol uni", "uwe bristol university", "warwick su", "warwick uni", "warwick university", "west london su", "west london uni", "west london university", "westminster su", "westminster uni", "westminster university", "winchester su", "winchester uni", "winchester university", "wisepay", "worcester su", "worcester uni", "worcester university", "wrexham glyndwr su", "wrexham glyndwr uni", "wrexham glyndwr university", "york su", "york uni", "york university"]}, {"id": "transfers", "label": "Transfers, Savings, Investments & Wallets", "icon": "🔄", "color": "#64748b", "keywords": ["118 118 money", "aegon pensions", "aj bell", "aj bell youinvest", "al rayan bank", "aldermore bank", "american express", "amex payment", "amex uk", "aqua card", "asda credit card", "asda creditcard", "asda money", "atm", "atm cash", "atom bank", "autopay", "autopay payment", "aviva life & pensions", "aviva pension", "azimo", "bank of scotland", "bank transfer", "bank transfer credit", "banxa", "barclaycard", "barclaycard commercial", "barclaycard payment", "barclays bank", "barclays smart investor", "barclays uk", "bath building society", "bestinvest", "beverley building society", "bill payment", "binance", "binance uk", "bip card", "bitpanda", "bitstamp", "cambridge building society", "capital one", "capital one card", "card payment", "card payment received", "cash app", "cash deposit", "cash deposit counter", "cash withdrawal", "cash withdrawal atm", "charles stanley", "charter savings bank", "chase uk", "cheque", "cheque deposit", "chip", "chip financial", "chip savings", "clarity card", "clarity cr", "clydesdale bank", "cmc markets", "co-op bank", "coinbase", "coinbase payments", "coinbase uk", "coinjar", "coventry bs", "coventry building society", "creation financial", "credit card payment", "crypto", "crypto.com", "cumberland building society", "currencies direct", "curve", "curve card", "curve uk", "darlington building society", "debbie fishwick", "degiro", "dodl by aj bell", "dudley building society", "etoro", "etoro uk", "faster payment", "faster payment transfer", "fidelity international", "fluid card", "freetrade", "freetrade limited", "furness building society", "gatehouse bank", "gemini", "gemini trust", "halifax bank", "halifax clarity", "halifax clarity cr", "halifax credit", "halifax credit car", "halifax credit card", "halifax plc", "hargreaves lansdown", "harpenden building society", "hinckley & rugby bs", "hsbc bank uk", "hsbc credit card", "hsbc uk", "ig index", "ig.com", "interactive brokers", "interactive investor", "internal transfer", "investengine", "investment", "jamie surfleet", "john lewis finance", "john lewis partnership card", "jpmorgan chase bank", "julie smith", "kraken", "kraken bitcoin", "kroo bank", "leeds bs", "leeds building society", "legal & general pension", "lloyds bank", "lloyds bank plc", "lloyds credit card", "loughborough building society", "luno crypto", "m&s bank", "m&s credit card", "mansfield building society", "marbles card", "marcus by goldman", "marks & spencer bank", "marks and spencer bank", "marks and spencer credit card", "mbna card payment", "mbna limited", "metro bank", "monese", "moneybox", "moneybox app", "moneyfarm", "moneygram", "monmouthshire building society", "monzo", "monzo bank", "moonpay", "national savings and investments", "nationwide bs", "nationwide building society", "nationwide credit card", "natwest", "natwest bank", "natwest credit card", "nest corporation", "nest pensions", "neteller", "newbury building society", "newcastle building society", "newday ltd", "nexo financial", "nigel smith", "nottingham building society", "now: pensions", "ns&i", "ns&i direct debit", "ns&i prize", "nutmeg", "nutmeg saving", "oaknorth bank", "ofx global", "paragon bank", "partnership card", "payment received", "paypal", "paypal credit", "paypal payment", "paypal transfer", "paysend", "payward ltd", "penfold pension", "penrith building society", "pension", "pensionbee", "phoenix life", "plum", "plum fintech", "plum savings", "plus500", "premium bonds", "principality building society", "prudential pension", "raisin uk", "ramp network", "rbs bank", "remitly", "revolut", "revolut ltd", "ria money transfer", "royal bank of scotland", "royal london pension", "saffron building society", "sainsbury bank", "sainsbury's bank", "sainsbury's credit card", "sainsburys bank", "sainsburys cc", "sainsburys credit card", "santander bank", "santander credit card", "santander uk", "savings", "saxo bank", "scottish building society", "scottish widows", "scottish widows pension", "shawbrook bank", "skipton bs", "skipton building society", "skrill", "skrill limited", "smart pension", "smartsave bank", "smile.co.uk", "standard life", "standard life pension", "standing order", "starling", "starling bank", "swansea building society", "tandem bank", "tesco bank", "tesco bank credit card", "tesco cc", "tesco credit card", "tesco creditcard", "tesco loans", "tesco personal finance", "the co-operative bank", "the people's pension", "tide bank", "tipton & coseley bs", "torfx", "trading 212", "trading 212 uk", "transfer from", "transfer from savings", "transfer to", "transfer to savings", "transferwise", "tsb bank", "tsb bank plc", "tymit card", "ulster bank", "vanguard", "vanguard asset", "vanguard investments", "vanguard uk", "vanquis bank", "venmo", "vernon building society", "virgin money", "virgin money credit card", "wealthify", "west bromwich building society", "western union", "wise", "wise payments", "wise transfer", "wombat invest", "worldremit", "xe.com transfer", "yonder card", "yorkshire bank", "yorkshire bs", "yorkshire building society", "zopa credit card", "zopa savings"]}, {"id": "gifts", "label": "Gifts, Birthdays & Occasions", "icon": "🎁", "color": "#f43f5e", "keywords": ["activity superstore", "anniversary card", "anniversary gift", "appleyard flowers", "arena flowers", "astrid & miyu", "baby shower", "balloon delivery", "beaverbrooks", "birthday", "birthday card", "birthday gift", "birthday party", "birthday present", "birthdays", "bloom & wild", "bloom and wild", "bloomandwild.com", "build a bear", "build-a-bear", "bunches", "bunches.co.uk", "buyagift", "card and balloon", "card factory", "card factory scunthorpe", "cardfactory.co.uk", "cards and gifts", "cards direct", "cartwright & butler", "charbonnel et walker", "christmas card", "christmas gift", "christmas present", "christmas shopping", "clearance gifts", "clintons", "clintons cards", "clintons.co.uk", "costume shop", "disney store", "early learning centre", "eflorist", "ernest jones", "etsy gifts", "experience day", "experience days", "f hinds", "f.hinds", "fancy dress", "florist", "floristry", "flower delivery", "flower shop", "flowers direct", "flying flowers", "freddie's flowers", "freddies flowers", "funky pigeon", "funky pigeon com", "funkypigeon.com", "gift", "gift card", "gift cards", "gift shop", "gift voucher", "gifthouse", "gifts", "goldsmiths", "greeting cards", "greetings cards", "h samuel", "h.samuel", "hallmark", "hamleys", "hamper gifts", "hampers.com", "haute florists", "high street vouchers", "hobbycraft gifts", "hotel chocolat", "interflora", "interflora.co.uk", "jewellery", "jewelry", "lego retail", "lego store", "letterbox gifts", "lindt chocolate shop", "local florist", "love2shop", "model shop", "monica vinader", "montezuma's", "moonpig", "moonpig uk", "moonpig.com", "not on the high street", "notonthehighstreet", "one4all", "pandora", "pandora jewellery", "pandora.net", "paperchase", "party delights", "party pieces", "party shop", "present", "presents", "prestige flowers", "red letter days", "scribbler", "serenata flowers", "smartbox", "smyths toys", "smyths toys uk", "smythstoys", "smythstoys.com", "spicers hampers", "swarovski", "swarovski crystal", "the entertainer", "the entertainer toy shop", "theentertainer.com", "thomas sabo", "thorntons", "thorntons chocolates", "tiffany & co", "tiffany and co", "toy shop", "toyland", "toyshop", "virgin experience", "virgin experience days", "virgin wines gift", "warren james", "wedding card", "wedding gift", "wedding present", "wonderbox", "xmas gift"]}, {"id": "general", "label": "General & Miscellaneous", "icon": "📦", "color": "#94a3b8", "keywords": []}];

export function getCategoryById(catId) {
  return SPEND_CATEGORIES.find(c => c.id === catId) || SPEND_CATEGORIES[SPEND_CATEGORIES.length - 1];
}

export function setDynamicCategories(cats) {
  if (Array.isArray(cats) && cats.length > 0) {
    SPEND_CATEGORIES = cats;
    _CACHED_CATEGORY_INDEX = null;
  }
}

// Pre-clean transaction text by removing payment gateway prefixes and standardizing whitespace
function normalizeTransactionText(text) {
  if (!text || typeof text !== 'string') return '';
  let s = text.toLowerCase();
  // Strip common payment processor / aggregator prefixes (including multi-asterisks, Shopify SP)
  s = s.replace(/\b(?:sq\s*\*|iz\s*\*|zettle[\s_*]+|paypal\s*\*|crv\s*\*|sumup\s*\*+|sp\s*\*?|stripe\s*\*)\s*/gi, ' ');
  // Expand common bank statement truncations to canonical forms
  s = s.replace(/\bfilling\s+stati\b/gi, 'filling station');
  s = s.replace(/\bservice\s+s\b/gi, 'service station');
  s = s.replace(/\bfish\s+(?:and|&)\s+chi\b/gi, 'fish and chips');
  s = s.replace(/\bconvenience\s+stor\b/gi, 'convenience store');
  s = s.replace(/\bhalifax\s+credit\s+car\b/gi, 'halifax credit card');
  // Replace symbols/punctuation with spaces, but keep letters/numbers
  s = s.replace(/[*\-_#/:.,;()&]/g, ' ');
  // Collapse whitespace
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

// Pre-index keywords sorted descending by length and word count for optimal precision & performance
let _CACHED_CATEGORY_INDEX = null;
function getCategorySearchIndex() {
  if (_CACHED_CATEGORY_INDEX) return _CACHED_CATEGORY_INDEX;

  const firstWordMap = new Map();
  const allIndexed = [];

  SPEND_CATEGORIES.forEach(cat => {
    if (cat.id === 'general') return;
    (cat.keywords || []).forEach(rawKw => {
      if (!rawKw) return;
      const cleanKw = normalizeTransactionText(rawKw);
      if (!cleanKw) return;

      const words = cleanKw.split(' ');
      const firstWord = words[0];
      const entry = {
        keyword: cleanKw,
        category: cat,
        wordCount: words.length,
        length: cleanKw.length
      };

      allIndexed.push(entry);

      if (!firstWordMap.has(firstWord)) {
        firstWordMap.set(firstWord, []);
      }
      firstWordMap.get(firstWord).push(entry);
    });
  });

  // Sort each bucket by wordCount descending, then length descending (longest specific match first)
  for (const list of firstWordMap.values()) {
    list.sort((a, b) => b.wordCount - a.wordCount || b.length - a.length);
  }

  allIndexed.sort((a, b) => b.wordCount - a.wordCount || b.length - a.length);

  _CACHED_CATEGORY_INDEX = { firstWordMap, allIndexed };
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

  // 2. Open Banking provider classification / meta tags & bank transaction codes
  const classifications = Array.isArray(t.classification) ? t.classification : (Array.isArray(t.transaction_classification) ? t.transaction_classification : []);
  const metaCategory = (t.transaction_category || t.transaction_type || t.type || t.bank_transaction_code || '').toLowerCase();
  const classText = `${classifications.join(' ').toLowerCase()} ${metaCategory}`;
  if (classText.includes('grocer') || classText.includes('supermarket')) return getCategoryById('groceries');
  if (classText.includes('fuel') || classText.includes('gas station') || classText.includes('transport') || classText.includes('automotive') || classText.includes('transit') || classText.includes('taxi')) return getCategoryById('transport');
  if (classText.includes('restaurant') || classText.includes('dining') || classText.includes('cafe') || classText.includes('food and drink') || classText.includes('fast food') || classText.includes('bar') || classText.includes('pub') || classText.includes('cater')) return getCategoryById('dining');
  if (classText.includes('shopping') || classText.includes('retail') || classText.includes('clothing') || classText.includes('electronics') || classText.includes('department store')) return getCategoryById('shopping');
  if (classText.includes('entertainment') || classText.includes('media') || classText.includes('gaming') || classText.includes('streaming') || classText.includes('movies') || classText.includes('music')) return getCategoryById('entertainment');
  if (classText.includes('utilities') || classText.includes('bills') || classText.includes('insurance') || classText.includes('telecom') || classText.includes('tax') || classText.includes('rent') || classText.includes('mortgage')) return getCategoryById('bills');
  if (classText.includes('health') || classText.includes('medical') || classText.includes('fitness') || classText.includes('pharmacy') || classText.includes('dental') || classText.includes('gym')) return getCategoryById('health');
  if (classText.includes('travel') || classText.includes('airline') || classText.includes('flight') || classText.includes('hotel') || classText.includes('lodging') || classText.includes('vacation')) return getCategoryById('travel');
  if (classText.includes('education') || classText.includes('school') || classText.includes('tuition') || classText.includes('childcare')) return getCategoryById('education');
  if (classText.includes('transfer') || classText.includes('tfr') || classText.includes('internal') || classText.includes('deposit') || classText.includes('withdrawal') || classText.includes('atm') || classText.includes('investment') || classText.includes('savings') || classText.includes('pmnt-icdt') || classText.includes('pmnt-rcdt')) return getCategoryById('transfers');

  // 3. Normalized string matching: strip processor prefixes, punctuation, extra spaces
  const clean = normalizeTransactionText(fullText);
  if (!clean) return getCategoryById('general');

  const cleanPadded = ' ' + clean + ' ';
  const tokens = clean.split(' ');

  const searchIndex = getCategorySearchIndex();

  // 5. Keyword search matching: look up candidates matching any token present in the transaction
  const candidates = [];
  const seenKw = new Set();

  if (searchIndex && searchIndex.firstWordMap) {
    for (const token of tokens) {
      const bucket = searchIndex.firstWordMap.get(token);
      if (bucket) {
        for (const item of bucket) {
          if (!seenKw.has(item.keyword)) {
            seenKw.add(item.keyword);
            candidates.push(item);
          }
        }
      }
    }
  }

  const candidatePool = candidates.length > 0 ? candidates : (searchIndex.allIndexed || searchIndex || []);
  candidatePool.sort((a, b) => (b.wordCount || 1) - (a.wordCount || 1) || (b.length || 0) - (a.length || 0));

  for (const item of candidatePool) {
    if (cleanPadded.includes(' ' + item.keyword + ' ')) {
      return item.category;
    }
  }

  // 4. Inherited Budget / Occasion Category (if matched to an Annual Budget or Birthday)
  if (t.matched_budget_category && SPEND_CATEGORIES.some(c => c.id === t.matched_budget_category)) {
    return getCategoryById(t.matched_budget_category);
  }

  // 5. Matched Scheduled Bills & Occasions Fallback:
  if (t.auto_cleared || t.matched_bill_id) {
    if (t.matched_bill_type === 'birthday') {
      return getCategoryById('gifts');
    }
    if (t.matched_bill_type === 'budget_bill') {
      const d = detectBudgetCategory(t.matched_bill_id);
      if (d) return getCategoryById(d);
      return getCategoryById('shopping');
    }
    return getCategoryById('bills');
  }

  // 6. Savings Account Activity: Unallocated movements to/from a designated savings account, pot, or ISA are internal transfers
  const accName = (t.account_name || '').toLowerCase();
  const accType = (t.account_type || '').toLowerCase();
  if (accName.includes('saving') || accName.includes('isa') || accName.includes('pot') || accName.includes('vault') || accType === 'savings') {
    return getCategoryById('transfers');
  }

  // 7. Household Members & Self-Transfers:
  // Detects payments between household members, account owners, and family surnames
  const cfg = (typeof getSettings === 'function') ? getSettings() : {};
  const householdMembers = Array.isArray(cfg.people) ? cfg.people : [];
  const recognizedNames = new Set();

  householdMembers.forEach(p => {
    if (!p) return;
    const parts = p.toLowerCase().trim().split(/\s+/);
    parts.forEach(part => {
      if (part.length >= 3 && !['person', 'user', 'joint', 'partner', 'default'].includes(part)) {
        recognizedNames.add(part);
      }
    });
  });

  if (t.owner && typeof t.owner === 'string' && t.owner.length >= 3 && t.owner.toLowerCase() !== 'joint') {
    recognizedNames.add(t.owner.toLowerCase().trim());
  }

  // Recognize common family surname variants from transactions
  recognizedNames.add('thompson');
  recognizedNames.add('thompso');

  const payeeTokens = clean.split(' ');
  for (const token of payeeTokens) {
    if (token.length >= 3 && recognizedNames.has(token)) {
      return getCategoryById('transfers');
    }
  }

  // 8. Inter-Account Transfers: Payee explicitly references another registered account
  const registeredAccounts = [
    ...(cfg.current_accounts || []),
    ...(cfg.savings_accounts || []),
    ...(cfg.credit_accounts || [])
  ];
  for (const acc of registeredAccounts) {
    const accStr = (typeof acc === 'string') ? acc : (acc && (acc.name || acc.id || ''));
    if (!accStr || typeof accStr !== 'string') continue;
    const cleanAcc = normalizeTransactionText(accStr);
    if (cleanAcc && cleanAcc.length >= 4 && cleanPadded.includes(' ' + cleanAcc + ' ')) {
      return getCategoryById('transfers');
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
  window.setDynamicCategories = setDynamicCategories;
  window.categorizeTransaction = categorizeTransaction;
  window.calculateCategoryBreakdown = calculateCategoryBreakdown;
  window.calculateMonthForecast = calculateMonthForecast;
}
