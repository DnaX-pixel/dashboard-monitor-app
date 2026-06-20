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

  return (
    <div className="schedule-picker-v2">
      {/* Type toggle */}
      <div className="schedule-type-tabs">
        <button
          className={s.type === 'interval' ? 'active' : ''}
          onClick={() => upd('type', 'interval')}
        >
          ⏱ Interval
        </button>
        <button
          className={s.type === 'alarm' ? 'active' : ''}
          onClick={() => upd('type', 'alarm')}
        >
          ⏰ Alarm
        </button>
      </div>

      {/* Interval mode */}
      {s.type === 'interval' && (
        <div className="schedule-interval-row">
          <span>Every</span>
          <input
            type="number" min="1" max="60"
            value={s.amount}
            onChange={e => upd('amount', Math.max(1, +e.target.value || 1))}
            className="schedule-num"
          />
          <select value={s.unit} onChange={e => upd('unit', e.target.value)}>
            <option value="minutes">minutes</option>
            <option value="hours">hours</option>
          </select>
        </div>
      )}

      {/* Alarm mode */}
      {s.type === 'alarm' && (
        <>
          <div className="schedule-time-row">
            <label>Time</label>
            <input
              type="time"
              value={`${String(s.hour).padStart(2,'0')}:${String(s.minute).padStart(2,'0')}`}
              onChange={e => {
                const [h, m] = e.target.value.split(':').map(Number);
                upd('hour', h); upd('minute', m);
              }}
              className="schedule-time-input"
            />
          </div>

          <div className="schedule-days-row">
            <label>Repeat on</label>
            <div className="day-toggles">
              {DAYS.map((day, i) => (
                <button
                  key={i}
                  className={`day-toggle ${s.days.includes(i) ? 'active' : ''}`}
                  onClick={() => toggleDay(i)}
                  title={DAYS_FULL[i]}
                >
                  {day[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="schedule-quick-days">
            <button onClick={() => upd('days', [1,2,3,4,5])}>Weekdays</button>
            <button onClick={() => upd('days', [0,6])}>Weekends</button>
            <button onClick={() => upd('days', [0,1,2,3,4,5,6])}>Every day</button>
          </div>
        </>
      )}

      {/* Human readable + cron */}
      <div className="schedule-summary">
        <span className="schedule-summary-label">📋</span>
        <span className="schedule-summary-text">{cronToHuman(buildCron(s))}</span>
        <span className="cron-preview">{buildCron(s)}</span>
      </div>
    </div>
  );
}