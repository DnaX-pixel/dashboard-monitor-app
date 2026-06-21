import { useEffect, useState } from 'react';
import Icon from './Icon';

export default function Topbar({ title, onMenuClick }) {
  const [now, setNow] = useState('');

  useEffect(() => {
    const update = () => {
      const d = new Date();
      const opts = { timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
      const dateOpts = { timeZone: 'Asia/Kuala_Lumpur', day: '2-digit', month: 'short' };
      setNow(`${d.toLocaleDateString('en-MY', dateOpts)} ${d.toLocaleTimeString('en-MY', opts)}`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="topbar">
      <button className="mobile-toggle" onClick={onMenuClick}>
        <Icon name="jobs" size={22} />
      </button>
      <div className="topbar-title">{title}</div>
      <div className="topbar-spacer" />
      <div className="topbar-search">
        <span className="search-icon"><Icon name="search" size={16} /></span>
        <input placeholder="Search jobs..." />
      </div>
      <div className="topbar-clock">
        <Icon name="clock" size={14} />
        {now}
      </div>
    </header>
  );
}