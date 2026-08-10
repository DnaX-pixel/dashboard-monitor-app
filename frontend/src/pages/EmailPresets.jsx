import { useState, useEffect } from 'react';
import { api } from '../api';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EmailPresets() {
  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => { reload().finally(() => setLoading(false)); }, []);

  async function reload() {
    try { setPresets(await api.get('/api/email-presets')); }
    catch (err) { setError(err.message); }
  }

  function flash(msg) {
    setError('');
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  }

  async function createPreset() {
    const name = newName.trim();
    if (!name) { setError('Give the preset a name first.'); return; }
    setError('');
    setCreating(true);
    try {
      const created = await api.post('/api/email-presets', { name });
      setPresets(ps => [...ps, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName('');
      setExpanded(created.preset_id);
      flash(`Preset "${created.name}" created — now add recipients to it.`);
    } catch (err) { setError(err.message); }
    finally { setCreating(false); }
  }

  async function renamePreset(preset) {
    const name = prompt('Rename preset:', preset.name);
    if (name === null || name.trim() === preset.name) return;
    try {
      const updated = await api.put(`/api/email-presets/${preset.preset_id}`, { name: name.trim() });
      setPresets(ps => ps.map(p => (p.preset_id === updated.preset_id ? updated : p))
        .sort((a, b) => a.name.localeCompare(b.name)));
      flash('Preset renamed.');
    } catch (err) { setError(err.message); }
  }

  async function deletePreset(preset) {
    if (!confirm(`Delete preset "${preset.name}"? Jobs that already use it keep their recipients.`)) return;
    try {
      await api.delete(`/api/email-presets/${preset.preset_id}`);
      setPresets(ps => ps.filter(p => p.preset_id !== preset.preset_id));
      flash('Preset deleted.');
    } catch (err) { setError(err.message); }
  }

  async function addMember(preset, email, label) {
    try {
      const member = await api.post(`/api/email-presets/${preset.preset_id}/members`, { email, label });
      setPresets(ps => ps.map(p => (
        p.preset_id === preset.preset_id ? { ...p, members: [...p.members, member] } : p
      )));
      setError('');
    } catch (err) { setError(err.message); }
  }

  async function removeMember(preset, member) {
    try {
      await api.delete(`/api/email-presets/${preset.preset_id}/members/${member.member_id}`);
      setPresets(ps => ps.map(p => (
        p.preset_id === preset.preset_id
          ? { ...p, members: p.members.filter(m => m.member_id !== member.member_id) }
          : p
      )));
    } catch (err) { setError(err.message); }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><span className="material-symbols-outlined animate-spin-slow text-text-dim">progress_activity</span></div>;
  }

  return (
    <div className="animate-fade-in-up max-w-3xl mx-auto">
      <h2 className="font-[Plus_Jakarta_Sans] text-2xl font-extrabold text-text-primary mb-2">Email Presets</h2>
      <p className="font-[DM_Sans] text-sm text-text-dim mb-6">
        Save a named list of email recipients once, then apply it to any job with one click instead of typing addresses
        every time. Applying a preset <span className="text-text-muted">copies</span> its addresses into the job — editing
        a preset later does not change jobs you already created.
      </p>

      {/* Create */}
      <div className="bg-surface border border-border-subtle rounded-xl p-6 mb-4">
        <label className="font-[DM_Sans] text-[11px] font-bold uppercase tracking-widest text-text-dim block mb-1.5">New Preset</label>
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createPreset()}
            maxLength={100}
            placeholder="e.g. Management Team"
            className="flex-1 min-w-0 bg-surface-container-low border border-border-subtle rounded-lg py-2.5 px-3.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button onClick={createPreset} disabled={creating} className="indigo-violet-gradient text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:brightness-110 disabled:opacity-50 transition-all flex items-center gap-2 shrink-0">
            <span className="material-symbols-outlined">add</span> Create
          </button>
        </div>
      </div>

      {error && <div className="p-3 mb-4 bg-error/10 border border-error/20 rounded-lg text-error text-sm flex items-center gap-2"><span className="material-symbols-outlined">error</span>{error}</div>}
      {success && <div className="p-3 mb-4 bg-success/10 border border-success/20 rounded-lg text-success text-sm flex items-center gap-2"><span className="material-symbols-outlined">check_circle</span>{success}</div>}

      {/* List */}
      {presets.length === 0 ? (
        <div className="bg-surface border border-border-subtle rounded-xl p-10 text-center">
          <span className="material-symbols-outlined text-4xl text-text-dim mb-2 block">contacts</span>
          <p className="text-sm text-text-dim">No presets yet. Create one above — for example a "Management" preset with one address, and a "Full Team" preset with three.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {presets.map(p => (
            <PresetCard
              key={p.preset_id}
              preset={p}
              open={expanded === p.preset_id}
              onToggle={() => setExpanded(x => (x === p.preset_id ? null : p.preset_id))}
              onRename={() => renamePreset(p)}
              onDelete={() => deletePreset(p)}
              onAddMember={(email, label) => addMember(p, email, label)}
              onRemoveMember={m => removeMember(p, m)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PresetCard({ preset, open, onToggle, onRename, onDelete, onAddMember, onRemoveMember }) {
  const [email, setEmail] = useState('');
  const [label, setLabel] = useState('');
  const [localError, setLocalError] = useState('');

  function submit() {
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) { setLocalError('Enter a valid email address.'); return; }
    setLocalError('');
    onAddMember(value, label.trim());
    setEmail('');
    setLabel('');
  }

  return (
    <div className="bg-surface border border-border-subtle rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <button onClick={onToggle} className="flex items-center gap-3 flex-1 min-w-0 text-left">
          <span className={`material-symbols-outlined text-text-dim transition-transform ${open ? 'rotate-90' : ''}`}>chevron_right</span>
          <span className="font-[Plus_Jakarta_Sans] font-bold text-text-primary truncate">{preset.name}</span>
          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold shrink-0">
            {preset.members.length} {preset.members.length === 1 ? 'recipient' : 'recipients'}
          </span>
        </button>
        <button onClick={onRename} title="Rename" className="text-text-muted hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-lg">edit</span>
        </button>
        <button onClick={onDelete} title="Delete" className="text-text-muted hover:text-error transition-colors">
          <span className="material-symbols-outlined text-lg">delete</span>
        </button>
      </div>

      {open && (
        <div className="border-t border-border-subtle p-4">
          {preset.members.length > 0 && (
            <ul className="space-y-2 mb-3">
              {preset.members.map(m => (
                <li key={m.member_id} className="flex items-center gap-2 p-2.5 bg-surface-container-low border border-border-subtle rounded-lg">
                  <span className="material-symbols-outlined text-primary text-lg">mail</span>
                  <span className="text-sm text-text-primary truncate">{m.label || m.email}</span>
                  {m.label && <span className="font-[JetBrains_Mono] text-xs text-text-dim truncate">{m.email}</span>}
                  <button onClick={() => onRemoveMember(m)} className="ml-auto text-error hover:text-red-400 text-sm shrink-0">×</button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              maxLength={150}
              placeholder="Name (optional)"
              className="w-40 shrink-0 bg-surface-container-low border border-border-subtle rounded-lg py-2 px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
            />
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              maxLength={150}
              placeholder="user@example.com"
              className="flex-1 min-w-0 bg-surface-container-low border border-border-subtle rounded-lg py-2 px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
            />
            <button onClick={submit} className="px-4 py-2 shrink-0 bg-surface-container-high border border-border-subtle rounded-lg text-sm text-text-primary hover:bg-surface-interactive transition-colors">Add</button>
          </div>
          {localError && <p className="text-xs text-error mt-2">{localError}</p>}
        </div>
      )}
    </div>
  );
}
