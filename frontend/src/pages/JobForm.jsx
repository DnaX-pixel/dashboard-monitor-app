import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import CropSelector from '../components/CropSelector';
import CroppedPreview from '../components/CroppedPreview';
import SchedulePicker from '../components/SchedulePicker';

const DEFAULT = {
  job_name: '', target_url: '',
  schedule_cron: '0 */6 * * *',
  notify_only_on_change: true,
  notification_subject: '',
  crop_x: 0, crop_y: 0, crop_width: 100, crop_height: 100,
};

export default function JobForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(DEFAULT);
  const [recipients, setRecipients] = useState([]);
  const [newRecip, setNewRecip] = useState({ type: 'email', value: '' });
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [multiMode, setMultiMode] = useState(false);
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({ label: '', target_url: '' });

  useEffect(() => {
    if (!isEdit) return;
    Promise.all([
      api.get(`/api/jobs/${id}`),
      api.get(`/api/jobs/${id}/recipients`),
      api.get(`/api/jobs/${id}/items`),
    ]).then(([job, recs, jobItems]) => {
      setForm({
        job_name: job.job_name, target_url: job.target_url,
        schedule_cron: job.schedule_cron,
        notify_only_on_change: Boolean(job.notify_only_on_change),
        notification_subject: job.notification_subject || '',
        crop_x: job.crop_x, crop_y: job.crop_y,
        crop_width: job.crop_width, crop_height: job.crop_height,
      });
      setRecipients(recs);
      if (jobItems.length > 0) { setMultiMode(true); setItems(jobItems); }
    }).catch(err => setError(err.message));
  }, [id, isEdit]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function loadPreview() {
    if (!form.target_url) return;
    setPreviewing(true);
    try {
      const { screenshot_url } = await api.post('/api/preview', { target_url: form.target_url });
      setPreviewUrl(screenshot_url + '?t=' + Date.now());
    } catch (err) { setError('Preview failed: ' + err.message); }
    finally { setPreviewing(false); }
  }

  async function addRecipient() {
    const value = newRecip.value.trim();
    if (!value) return;
    if (isEdit) {
      try { const r = await api.post(`/api/jobs/${id}/recipients`, { type: newRecip.type, value }); setRecipients(rs => [...rs, r]); }
      catch (err) { setError(err.message); return; }
    } else {
      setRecipients(rs => [...rs, { type: newRecip.type, value, _key: Date.now() }]);
    }
    setNewRecip(r => ({ ...r, value: '' }));
  }

  async function removeRecipient(r) {
    if (isEdit && r.recipient_id) {
      try { await api.delete(`/api/jobs/${id}/recipients/${r.recipient_id}`); }
      catch (err) { setError(err.message); return; }
    }
    setRecipients(rs => rs.filter(x => x !== r));
  }

  async function addItem() {
    if (!newItem.target_url) return;
    const itemData = { ...newItem, crop_x: 0, crop_y: 0, crop_width: 100, crop_height: 100, sort_order: items.length };
    if (isEdit) {
      try { const created = await api.post(`/api/jobs/${id}/items`, itemData); setItems(is => [...is, created]); }
      catch (err) { setError(err.message); return; }
    } else {
      setItems(is => [...is, { ...itemData, _key: Date.now() }]);
    }
    setNewItem({ label: '', target_url: '' });
  }

  async function removeItem(item) {
    if (isEdit && item.item_id) {
      try { await api.delete(`/api/jobs/${id}/items/${item.item_id}`); }
      catch (err) { setError(err.message); return; }
    }
    setItems(is => is.filter(x => x !== item));
  }

  function updateItemCrop(item, c) {
    const key = item.item_id ?? item._key;
    setItems(is => is.map(it => {
      if ((it.item_id ?? it._key) === key) {
        return { ...it, crop_x: c.x, crop_y: c.y, crop_width: c.width, crop_height: c.height };
      }
      return it;
    }));
    if (isEdit && item.item_id) {
      api.put(`/api/jobs/${id}/items/${item.item_id}`, { crop_x: c.x, crop_y: c.y, crop_width: c.width, crop_height: c.height }).catch(() => {});
    }
  }

  async function save() {
    if (!form.job_name || !form.schedule_cron) { setError('Job name and schedule are required.'); return; }
    if (!multiMode && !form.target_url) { setError('Target URL is required.'); return; }
    if (multiMode && items.length === 0) { setError('Add at least one URL.'); return; }
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/api/jobs/${id}`, form);
      } else {
        const job = await api.post('/api/jobs', form);
        for (const r of recipients) await api.post(`/api/jobs/${job.job_id}/recipients`, { type: r.type, value: r.value });
        for (const it of items) await api.post(`/api/jobs/${job.job_id}/items`, { label: it.label, target_url: it.target_url, crop_x: it.crop_x ?? 0, crop_y: it.crop_y ?? 0, crop_width: it.crop_width ?? 100, crop_height: it.crop_height ?? 100, sort_order: it.sort_order ?? 0 });
      }
      navigate('/');
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  const cropProp = useMemo(() => ({ x: form.crop_x, y: form.crop_y, width: form.crop_width, height: form.crop_height }), [form]);

  return (
    <div className="animate-fade-in-up">
      <Link to="/" className="inline-flex items-center gap-2 mb-4 text-text-muted hover:text-primary text-sm transition-colors">
        <span className="material-symbols-outlined text-sm">arrow_back</span> Back to Jobs
      </Link>
      <h2 className="font-[Plus_Jakarta_Sans] text-2xl font-extrabold text-text-primary mb-6">{isEdit ? 'Edit Job' : 'New Monitoring Job'}</h2>

      {error && <div className="text-error text-sm flex items-center gap-2 p-3 bg-error/10 border border-error/20 rounded-lg mb-6"><span className="material-symbols-outlined">error</span>{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left column */}
        <div className="space-y-4">
          {/* Job Details */}
          <div className="bg-surface border border-border-subtle rounded-xl p-6">
            <h3 className="font-[Plus_Jakarta_Sans] text-base font-bold text-text-primary mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-primary">assignment</span> Job Details</h3>
            <div className="space-y-[18px]">
              <div>
                <label className="font-[DM_Sans] text-[11px] font-bold uppercase tracking-widest text-text-dim block mb-1.5">Job Name</label>
                <input value={form.job_name} onChange={e => set('job_name', e.target.value)} placeholder="e.g. TNB Status Monitor" className="w-full bg-surface-container-low border border-border-subtle rounded-lg py-2.5 px-3.5 text-text-primary text-sm placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="font-[DM_Sans] text-[11px] font-bold uppercase tracking-widest text-text-dim block mb-1.5">Notification Subject <span className="text-text-dim normal-case font-normal">(optional)</span></label>
                <input value={form.notification_subject} onChange={e => set('notification_subject', e.target.value)} placeholder="e.g. GRVERIFY Compliance Status" className="w-full bg-surface-container-low border border-border-subtle rounded-lg py-2.5 px-3.5 text-text-primary text-sm placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="font-[DM_Sans] text-[11px] font-bold uppercase tracking-widest text-text-dim block mb-1.5">Target URL {multiMode && <span className="text-text-dim normal-case font-normal">(disabled in multi-URL)</span>}</label>
                <input value={form.target_url} onChange={e => set('target_url', e.target.value)} placeholder="https://..." disabled={multiMode} className="w-full bg-surface-container-low border border-border-subtle rounded-lg py-2.5 px-3.5 text-text-primary text-sm placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-40" />
                {!multiMode && <button onClick={loadPreview} disabled={previewing || !form.target_url} className="w-full indigo-violet-gradient text-white font-bold text-sm py-2.5 rounded-lg mt-2 flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-50 transition-all"><span className="material-symbols-outlined">screenshot_region</span>{previewing ? 'Capturing…' : 'Capture Screenshot'}</button>}
              </div>
              <div>
                <label className="font-[DM_Sans] text-[11px] font-bold uppercase tracking-widest text-text-dim block mb-1.5">Schedule</label>
                <SchedulePicker value={form.schedule_cron} onChange={v => set('schedule_cron', v)} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.notify_only_on_change} onChange={e => set('notify_only_on_change', e.target.checked)} className="w-4 h-4 rounded border-border-subtle accent-[#6366f1]" />
                <span className="text-sm text-text-muted">Only notify when content changes</span>
              </label>
            </div>
          </div>

          {/* Multi-URL */}
          <div className="bg-surface border border-border-subtle rounded-xl p-6">
            <h3 className="font-[Plus_Jakarta_Sans] text-base font-bold text-text-primary mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-primary">link</span> Multi-URL Monitoring</h3>
            <label className="flex items-center gap-2 cursor-pointer mb-3">
              <input type="checkbox" checked={multiMode} onChange={e => setMultiMode(e.target.checked)} className="w-4 h-4 rounded border-border-subtle accent-[#6366f1]" />
              <span className="text-sm text-text-muted">Enable multi-URL mode</span>
            </label>
            {multiMode && (
              <>
                {items.length > 0 && (
                  <ul className="space-y-2 mb-3">
                    {items.map((it, i) => (
                      <li key={it.item_id ?? it._key ?? i} className="flex items-center gap-2 p-2.5 bg-surface-container-low border border-border-subtle rounded-lg">
                        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">{it.label || `Item ${i+1}`}</span>
                        <span className="font-[JetBrains_Mono] text-xs text-text-dim truncate flex-1">{it.target_url}</span>
                        <button onClick={() => removeItem(it)} className="text-error hover:text-red-400 text-sm">×</button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex gap-2">
                  <input value={newItem.label} onChange={e => setNewItem(n => ({ ...n, label: e.target.value }))} placeholder="Label" className="w-32 bg-surface-container-low border border-border-subtle rounded-lg py-2 px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none" />
                  <input value={newItem.target_url} onChange={e => setNewItem(n => ({ ...n, target_url: e.target.value }))} placeholder="https://..." className="flex-1 bg-surface-container-low border border-border-subtle rounded-lg py-2 px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none" />
                  <button onClick={addItem} className="px-4 py-2 bg-surface-container-high border border-border-subtle rounded-lg text-sm text-text-primary hover:bg-surface-interactive transition-colors">Add</button>
                </div>
              </>
            )}
          </div>

          {/* Recipients */}
          <div className="bg-surface border border-border-subtle rounded-xl p-6">
            <h3 className="font-[Plus_Jakarta_Sans] text-base font-bold text-text-primary mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-primary">group</span> Notification Recipients</h3>
            {recipients.length > 0 && (
              <ul className="space-y-2 mb-3">
                {recipients.map((r, i) => (
                  <li key={r.recipient_id ?? r._key ?? i} className="flex items-center gap-2 p-2.5 bg-surface-container-low border border-border-subtle rounded-lg">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${r.type === 'email' ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success'}`}>{r.type}</span>
                    <span className="text-sm text-text-muted truncate flex-1">{r.value}</span>
                    <button onClick={() => removeRecipient(r)} className="text-error hover:text-red-400 text-sm">×</button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <select value={newRecip.type} onChange={e => setNewRecip(r => ({ ...r, type: e.target.value }))} className="w-32 bg-surface-container-low border border-border-subtle rounded-lg py-2 px-3 text-sm text-text-primary focus:border-primary focus:outline-none">
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
              <input value={newRecip.value} onChange={e => setNewRecip(r => ({ ...r, value: e.target.value }))} placeholder={newRecip.type === 'email' ? 'user@example.com' : '60123456789@s.whatsapp.net'} className="flex-1 bg-surface-container-low border border-border-subtle rounded-lg py-2 px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none" />
              <button onClick={addRecipient} className="px-4 py-2 bg-surface-container-high border border-border-subtle rounded-lg text-sm text-text-primary hover:bg-surface-interactive transition-colors">Add</button>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {!multiMode ? (
            <>
              <div className="bg-surface border border-border-subtle rounded-xl overflow-hidden">
                <div className="flex items-center justify-between p-4 bg-surface-container-low border-b border-border-subtle">
                  <span className="font-[Plus_Jakarta_Sans] text-sm font-bold text-text-primary flex items-center gap-2"><span className="material-symbols-outlined text-primary">screenshot_region</span> Crop Area Selection</span>
                </div>
                <div className="p-4">
                  {previewing ? (
                    <div className="flex flex-col items-center justify-center py-20"><span className="material-symbols-outlined animate-spin-slow text-text-dim text-3xl mb-2">progress_activity</span> Capturing screenshot…</div>
                  ) : (
                    <CropSelector previewUrl={previewUrl} crop={cropProp} onChange={c => { set('crop_x', c.x); set('crop_y', c.y); set('crop_width', c.width); set('crop_height', c.height); }} />
                  )}
                </div>
              </div>
              {previewUrl && (
                <div className="bg-surface border border-border-subtle rounded-xl p-6">
                  <h3 className="font-[Plus_Jakarta_Sans] text-base font-bold text-text-primary mb-3">Crop Coordinates</h3>
                  <div className="flex gap-2 flex-wrap mb-4">
                    {[['x', form.crop_x], ['y', form.crop_y], ['w', form.crop_width], ['h', form.crop_height]].map(([k, v]) => (
                      <span key={k} className="font-[JetBrains_Mono] text-xs text-primary bg-primary/10 px-3 py-1 rounded-lg border border-primary/20">{k}: {v}%</span>
                    ))}
                  </div>
                  <CroppedPreview previewUrl={previewUrl} crop={cropProp} label="Cropped Result Preview" />
                </div>
              )}
            </>
          ) : (
            items.map((it, i) => (
              <div key={it.item_id ?? it._key ?? i} className="bg-surface border border-border-subtle rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 p-3 bg-primary/10 border border-primary/20 rounded-t-xl">
                  <span className="w-7 h-7 rounded-full indigo-violet-gradient flex items-center justify-center text-white text-sm font-bold">{i+1}</span>
                  <span className="font-[Plus_Jakarta_Sans] text-sm font-bold text-text-primary">{it.label || `URL ${i+1}`}</span>
                  <span className="font-[JetBrains_Mono] text-xs text-text-dim truncate ml-auto">{it.target_url}</span>
                </div>
                <div className="p-4">
                  <CropSelector previewUrl={null} crop={{ x: it.crop_x ?? 0, y: it.crop_y ?? 0, width: it.crop_width ?? 100, height: it.crop_height ?? 100 }} onChange={c => updateItemCrop(it, c)} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 mt-6">
        <Link to="/" className="px-5 py-2.5 bg-surface-container-high border border-border-subtle rounded-lg text-sm text-text-primary hover:bg-surface-interactive transition-colors">Cancel</Link>
        <button onClick={save} disabled={saving} className="indigo-violet-gradient text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:brightness-110 disabled:opacity-50 transition-all flex items-center gap-2">
          {saving ? <><span className="material-symbols-outlined animate-spin-slow">progress_activity</span> Saving…</> : <><span className="material-symbols-outlined">check</span> Save Job</>}
        </button>
      </div>
    </div>
  );
}