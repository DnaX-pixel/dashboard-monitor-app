import { useState, useEffect } from 'react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const PRESETS = [
  { label: 'Every 5 min',      cron: '*/5 * * * *',  unit: 'interval' },
  { label: 'Every 15 min',     cron: '*/15 * * * *', unit: 'interval' },
  { label: 'Every 30 min',     cron: '*/30 * * * *', unit: 'interval' },
  { label: 'Every 1 hour',     cron: '0 * * * *',   unit: 'interval' },
  { label: 'Every 6 hours',    cron: '0 */6 * * *', unit: 'interval' },
  { label: 'Every 12 hours',   cron: '0 */12 * * *',unit: 'interval' },
  { label: 'Daily at time',     cron: '0 8 * * *',   unit: 'alarm' },
  { label: 'Specific days',     cron: '0 8 * * 1-5', unit: 'alarm' },
];

function parseCron(cron = '0 */6 * * *') {
  const p = cron.trim().split(/\s+/);
  if (p.length !== 5) return { type: 'interval', amount: 6, unit: 'hours', hour: 8, minute: 0, days: [0,1,2,3,4,5,6] };

  const [min, hr, dom, mon, dow] = p;

  // Interval: */X * * * *
  if (min.startsWith('*/') && hr === '*' && dom === '*' && mon === '*' && dow === '*') {
    return { type: 'interval', amount: +min.slice(2), unit: 'minutes', hour: 0, minute: 0, days: [0,1,2,3,4,5,6] };
  }
  if (hr.startsWith('*/') && min === '0' && dom === '*' && mon === '*' && dow === '*') {
    return { type: 'interval', amount: +hr.slice(2), unit: 'hours', hour: 0, minute: 0, days: [0,1,2,3,4,5,6] };
  }

  // Alarm: M H * * DOW
  const hour = +hr || 0;
  const minute = +min || 0;
  let days = [0,1,2,3,4,5,6];
  if (dow !== '*') {
    days = [];
    dow.split(',').forEach(part => {
      if (part.includes('-')) {
        const [a, b] = part.split('-').map(Number);
        for (let i = a; i <= b; i++) days.push(i);
      } else {
        days.push(+part);
      }
    });
  }
  return { type: 'alarm', amount: 1, unit: 'days', hour, minute, days };
}

function buildCron(s) {
  if (s.type === 'interval') {
    if (s.unit === 'minutes') return `*/${s.amount} * * * *`;
    return `0 */${s.amount} * * *`;
  }
  // alarm
  const hh = String(s.hour).padStart(2, '0');
  const mm = String(s.minute).padStart(2, '0');
  const allDays = s.days.length === 7 || s.days.length === 0;
  const dow = allDays ? '*' : [...s.days].sort().join(',');
  return `${mm} ${hh} * * ${dow}`;
}

function cronToHuman(cron) {
  const s = parseCron(cron);
  if (s.type === 'interval') {
    return `Every ${s.amount} ${s.unit}`;
  }
  const hh = String(s.hour).padStart(2, '0');
  const mm = String(s.minute).padStart(2, '0');
  if (s.days.length === 7 || s.days.length === 0) return `Daily at ${hh}:${mm}`;
  if (s.days.length === 5 && [1,2,3,4,5].every(d => s.days.includes(d))) return `Weekdays at ${hh}:${mm}`;
  if (s.days.length === 2 && s.days.includes(0) && s.days.includes(6)) return `Weekends at ${hh}:${mm}`;
  const dayNames = s.days.sort().map(d => DAYS[d]);
  return `${dayNames.join(', ')} at ${hh}:${mm}`;
}

export default function SchedulePicker({ value, onChange }) {
  const [s, setS] = useState(() => parseCron(value));

  useEffect(() => { onChange(buildCron(s)); }, [s]); // eslint-disable-line

  const upd = (k, v) => setS(p => ({ ...p, [k]: v }));
  const toggleDay = (day) => {
    const has = s.days.includes(day);
    const newDays = has ? s.days.filter(d => d !== day) : [...s.days, day];
    if (newDays.length === 0) return; // keep at least one day
    upd('days', newDays.sort());
  };

  const tabBtn = (active) => `flex-1 py-2 rounded-md text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${active ? 'indigo-violet-gradient text-white shadow-lg' : 'text-text-muted hover:text-text-primary'}`;

  return (
    <div className="flex flex-col gap-4">
      {/* Type toggle */}
      <div className="flex gap-1 bg-surface-container-low p-1 rounded-lg border border-border-subtle">
        <button type="button" className={tabBtn(s.type === 'interval')} onClick={() => upd('type', 'interval')}>
          <span className="material-symbols-outlined text-base">schedule</span> Interval
        </button>
        <button type="button" className={tabBtn(s.type === 'alarm')} onClick={() => upd('type', 'alarm')}>
          <span className="material-symbols-outlined text-base">alarm</span> Alarm
        </button>
      </div>

      {/* Interval mode */}
      {s.type === 'interval' && (
        <div className="flex items-center gap-2.5">
          <span className="text-sm text-text-muted">Every</span>
          <input
            type="number" min="1" max="60"
            value={s.amount}
            onChange={e => upd('amount', Math.max(1, +e.target.value || 1))}
            className="w-16 text-center bg-surface-container-low border border-border-subtle rounded-lg py-2 px-1 text-sm text-text-primary font-[JetBrains_Mono] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <select value={s.unit} onChange={e => upd('unit', e.target.value)} className="bg-surface-container-low border border-border-subtle rounded-lg py-2 px-3 text-sm text-text-primary focus:border-primary focus:outline-none">
            <option value="minutes">minutes</option>
            <option value="hours">hours</option>
          </select>
        </div>
      )}

      {/* Alarm mode */}
      {s.type === 'alarm' && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-text-muted font-bold">Time</label>
            <input
              type="time"
              value={`${String(s.hour).padStart(2,'0')}:${String(s.minute).padStart(2,'0')}`}
              onChange={e => { const [h, m] = e.target.value.split(':').map(Number); upd('hour', h); upd('minute', m); }}
              className="bg-surface-container-low border border-border-subtle rounded-lg py-3 px-4 text-lg text-text-primary font-[JetBrains_Mono] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 [color-scheme:dark]"
            />
          </div>

          <div className="flex flex-col gap-2.5">
            <label className="text-sm text-text-muted font-bold">Repeat on</label>
            <div className="flex gap-2">
              {DAYS.map((day, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDay(i)}
                  title={DAYS_FULL[i]}
                  className={`w-10 h-10 rounded-full text-sm font-bold flex items-center justify-center transition-all ${s.days.includes(i) ? 'indigo-violet-gradient text-white scale-105 shadow-lg' : 'bg-surface-container-low border border-border-subtle text-text-muted hover:text-text-primary'}`}
                >
                  {day[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            {[['Weekdays', [1,2,3,4,5]], ['Weekends', [0,6]], ['Every day', [0,1,2,3,4,5,6]]].map(([label, days]) => (
              <button key={label} type="button" onClick={() => upd('days', days)} className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-surface-container-low border border-border-subtle text-text-muted hover:text-primary hover:border-primary hover:bg-primary/10 transition-all">{label}</button>
            ))}
          </div>
        </>
      )}

      {/* Summary */}
      <div className="flex items-center gap-2.5 p-3 bg-primary/10 border border-primary/20 rounded-lg">
        <span className="material-symbols-outlined text-primary text-lg">event_available</span>
        <span className="text-sm font-semibold text-text-primary flex-1">{cronToHuman(buildCron(s))}</span>
        <span className="font-[JetBrains_Mono] text-xs text-primary bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20">{buildCron(s)}</span>
      </div>
    </div>
  );
}