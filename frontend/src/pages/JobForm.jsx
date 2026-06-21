import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import CropSelector   from '../components/CropSelector';
import CroppedPreview  from '../components/CroppedPreview';
import SchedulePicker from '../components/SchedulePicker';
import Icon from '../components/Icon';

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

  const [form,         setForm]         = useState(DEFAULT);
  const [recipients,   setRecipients]   = useState([]);
  const [newRecip,     setNewRecip]     = useState({ type: 'email', value: '' });
  const [previewUrl,   setPreviewUrl]   = useState(null);
  const [previewing,   setPreviewing]   = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');
  const [multiMode,    setMultiMode]    = useState(false);
  const [items,        setItems]        = useState([]);
  const [newItem,      setNewItem]      = useState({ label: '', target_url: '' });
  const [activeItemKey, setActiveItemKey] = useState(null);
  const [itemPreviews,  setItemPreviews]  = useState({});
  const [itemPreviewingKey, setItemPreviewingKey] = useState(null);

  useEffect(() => {
    if (!isEdit) return;
    Promise.all([
      api.get(`/api/jobs/${id}`),
      api.get(`/api/jobs/${id}/recipients`),
      api.get(`/api/jobs/${id}/items`),
    ]).then(([job, recs, jobItems]) => {
      setForm({
        job_name:              job.job_name,
        target_url:            job.target_url,
        schedule_cron:         job.schedule_cron,
        notify_only_on_change: Boolean(job.notify_only_on_change),
        notification_subject:  job.notification_subject || '',
        crop_x:     job.crop_x,
        crop_y:     job.crop_y,
        crop_width:  job.crop_width,
        crop_height: job.crop_height,
      });
      setRecipients(recs);
      if (jobItems.length > 0) {
        setMultiMode(true);
        setItems(jobItems);
      }
    }).catch(err => setError(err.message));
  }, [id, isEdit]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function loadPreview() {
    if (!form.target_url) return;
    setPreviewing(true);
    setError('');
    try {
      const { screenshot_url } = await api.post('/api/preview', { target_url: form.target_url });
      setPreviewUrl(screenshot_url + '?t=' + Date.now());
    } catch (err) {
      setError('Preview failed: ' + err.message);
    } finally {
      setPreviewing(false);
    }
  }

  async function addRecipient() {
    const value = newRecip.value.trim();
    if (!value) return;
    if (isEdit) {
      try {
        const r = await api.post(`/api/jobs/${id}/recipients`, { type: newRecip.type, value });
        setRecipients(rs => [...rs, r]);
      } catch (err) { setError(err.message); return; }
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
    let newKey;
    if (isEdit) {
      try {
        const created = await api.post(`/api/jobs/${id}/items`, itemData);
        setItems(is => [...is, created]);
        newKey = created.item_id;
      } catch (err) { setError(err.message); return; }
    } else {
      newKey = Date.now();
      setItems(is => [...is, { ...itemData, _key: newKey }]);
    }
    setActiveItemKey(newKey);
    setNewItem({ label: '', target_url: '' });
  }

  async function removeItem(item) {
    if (isEdit && item.item_id) {
      try { await api.delete(`/api/jobs/${id}/items/${item.item_id}`); }
      catch (err) { setError(err.message); return; }
    }
    setItems(is => is.filter(x => x !== item));
    const key = item.item_id ?? item._key;
    setItemPreviews(p => { const c = { ...p }; delete c[key]; return c; });
    if (activeItemKey === key) setActiveItemKey(null);
  }

  function updateItemCrop(item, c) {
    const key = item.item_id ?? item._key;
    setItems(is => is.map(it => {
      if ((it.item_id ?? it._key) === key) {
        return {
          ...it,
          crop_x: Math.round(c.x * 10) / 10,
          crop_y: Math.round(c.y * 10) / 10,
          crop_width: Math.round(c.width * 10) / 10,
          crop_height: Math.round(c.height * 10) / 10,
        };
      }
      return it;
    }));
    if (isEdit && item.item_id) {
      api.put(`/api/jobs/${id}/items/${item.item_id}`, {
        crop_x: Math.round(c.x * 10) / 10,
        crop_y: Math.round(c.y * 10) / 10,
        crop_width: Math.round(c.width * 10) / 10,
        crop_height: Math.round(c.height * 10) / 10,
      }).catch(() => {});
    }
  }

  async function loadItemPreview(item) {
    if (!item.target_url) return;
    const key = item.item_id ?? item._key;
    setItemPreviewingKey(key);
    setError('');
    try {
      const { screenshot_url } = await api.post('/api/preview', { target_url: item.target_url });
      setItemPreviews(p => ({ ...p, [key]: screenshot_url + '?t=' + Date.now() }));
    } catch (err) {
      setError('Preview failed: ' + err.message);
    } finally {
      setItemPreviewingKey(null);
    }
  }

  async function save() {
    if (!form.job_name || !form.schedule_cron) {
      setError('Job name and schedule are required.');
      return;
    }
    if (!multiMode && !form.target_url) {
      setError('Target URL is required.');
      return;
    }
    if (multiMode && items.length === 0) {
      setError('Add at least one URL in Multi-URL Monitoring.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await api.put(`/api/jobs/${id}`, form);
      } else {
        const job = await api.post('/api/jobs', form);
        for (const r of recipients) {
          await api.post(`/api/jobs/${job.job_id}/recipients`, { type: r.type, value: r.value });
        }
        for (const it of items) {
          await api.post(`/api/jobs/${job.job_id}/items`, {
            label: it.label,
            target_url: it.target_url,
            crop_x: it.crop_x ?? 0,
            crop_y: it.crop_y ?? 0,
            crop_width: it.crop_width ?? 100,
            crop_height: it.crop_height ?? 100,
            sort_order: it.sort_order ?? 0,
          });
        }
      }
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const cropProp = useMemo(() => ({
    x: form.crop_x, y: form.crop_y,
    width: form.crop_width, height: form.crop_height,
  }), [form.crop_x, form.crop_y, form.crop_width, form.crop_height]);

  return (
    <div className="form-page animate-in">
      <Link to="/" className="back-link"><Icon name="arrowLeft" size={14} /> Back to Jobs</Link>
      <div className="page-header">
        <h1>{isEdit ? 'Edit Job' : 'New Monitoring Job'}</h1>
      </div>

      {error && <div className="error-msg"><Icon name="alert" size={16} /> {error}</div>}

      <div className="form-split">
        {/* LEFT COLUMN */}
        <div className="form-left">
          <div className="card">
            <h2>Job Details</h2>

            <div className="form-group">
              <label>Job Name</label>
              <input
                value={form.job_name}
                onChange={e => set('job_name', e.target.value)}
                placeholder="e.g. TNB Status Monitor"
              />
            </div>

            <div className="form-group">
              <label>
                Notification Subject
                <small>Custom subject for email &amp; message (leave blank to use Job Name)</small>
              </label>
              <input
                value={form.notification_subject}
                onChange={e => set('notification_subject', e.target.value)}
                placeholder="e.g. GR VERIFY Compliance Status"
              />
            </div>

            <div className="form-group">
              <label>Target URL {multiMode && <small style={{ color: 'var(--gray-500)' }}>(disabled in multi-URL mode)</small>}</label>
              <input
                value={form.target_url}
                onChange={e => set('target_url', e.target.value)}
                placeholder="https://..."
                onKeyDown={e => e.key === 'Enter' && loadPreview()}
                disabled={multiMode}
                style={multiMode ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
              />
              {!multiMode && (
                <button
                  className="btn btn-primary btn-block"
                  onClick={loadPreview}
                  disabled={previewing || !form.target_url}
                  style={{ marginTop: 10, padding: '12px' }}
                >
                  {previewing ? 'Capturing Screenshot…' : <><Icon name="capture" size={16} /> Capture Screenshot</>}
                </button>
              )}
            </div>

            <div className="form-group">
              <label>Schedule</label>
              <SchedulePicker
                value={form.schedule_cron}
                onChange={v => set('schedule_cron', v)}
              />
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.notify_only_on_change}
                  onChange={e => set('notify_only_on_change', e.target.checked)}
                />
                Only notify when content changes
              </label>
            </div>
          </div>

          {/* Multi-URL section */}
          <div className="card">
            <h2>Multi-URL Monitoring</h2>
            <label className="checkbox-label" style={{ marginBottom: 14 }}>
              <input
                type="checkbox"
                checked={multiMode}
                onChange={e => setMultiMode(e.target.checked)}
              />
              Enable multi-URL mode (screenshot multiple URLs per run)
            </label>

            {multiMode && (
              <>
                {items.length > 0 && (
                  <ul className="recipient-list" style={{ marginBottom: 14 }}>
                    {items.map((it, i) => (
                      <li key={it.item_id ?? it._key ?? i}>
                        <span className="badge badge-email">{it.label || `Item ${i+1}`}</span>
                        <span style={{ fontFamily: 'SF Mono, Fira Code, monospace', fontSize: 12, color: 'var(--gray-400)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                          {it.target_url}
                        </span>
                        <button className="btn btn-sm btn-danger" onClick={() => removeItem(it)}>×</button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="input-row">
                  <input
                    value={newItem.label}
                    onChange={e => setNewItem(n => ({ ...n, label: e.target.value }))}
                    placeholder="Label (optional)"
                    style={{ maxWidth: 150 }}
                  />
                  <input
                    value={newItem.target_url}
                    onChange={e => setNewItem(n => ({ ...n, target_url: e.target.value }))}
                    placeholder="https://..."
                    onKeyDown={e => e.key === 'Enter' && addItem()}
                  />
                  <button className="btn btn-sm" onClick={addItem}>Add URL</button>
                </div>
                <p className="text-muted" style={{ marginTop: 8, fontSize: 12 }}>
                  Each URL will be screenshotted and OCR'd. Results are combined into one notification.
                </p>
              </>
            )}
          </div>

          <div className="card">
            <h2>Notification Recipients</h2>

            {recipients.length > 0 && (
              <ul className="recipient-list">
                {recipients.map((r, i) => (
                  <li key={r.recipient_id ?? r._key ?? i}>
                    <span className={`badge badge-${r.type}`}>{r.type}</span>
                    {r.value}
                    <button className="btn btn-sm btn-danger" onClick={() => removeRecipient(r)}>×</button>
                  </li>
                ))}
              </ul>
            )}

            <div className="input-row">
              <select
                value={newRecip.type}
                onChange={e => setNewRecip(r => ({ ...r, type: e.target.value }))}
                style={{ maxWidth: 130 }}
              >
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
              <input
                value={newRecip.value}
                onChange={e => setNewRecip(r => ({ ...r, value: e.target.value }))}
                placeholder={newRecip.type === 'email' ? 'user@example.com' : '60123456789@s.whatsapp.net'}
                onKeyDown={e => e.key === 'Enter' && addRecipient()}
              />
              <button className="btn btn-sm" onClick={addRecipient}>Add</button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="form-right">
          {multiMode ? (
            /* Multi-URL mode: show all items with their own crop */
            items.length === 0 ? (
              <div className="card preview-card">
                <div className="preview-header">
                  <label><Icon name="crop" size={16} /> Crop per URL</label>
                </div>
                <div className="preview-body">
                  <div className="preview-spinner" style={{ height: 300 }}>Add URLs in the Multi-URL section to configure crop areas</div>
                </div>
              </div>
            ) : (
              <>
                {items.map((it, i) => {
                  const key = it.item_id ?? it._key ?? i;
                  const previewUrl = itemPreviews[key];
                  const isPreviewing = itemPreviewingKey === key;
                  const itemCrop = {
                    x: it.crop_x ?? 0, y: it.crop_y ?? 0,
                    width: it.crop_width ?? 100, height: it.crop_height ?? 100,
                  };
                  return (
                    <div key={key} className="multi-item-block">
                      <div className="multi-item-header">
                        <span className="multi-item-badge">{i + 1}</span>
                        <span className="multi-item-label">{it.label || `URL ${i+1}`}</span>
                        <span className="multi-item-url" title={it.target_url}>{it.target_url}</span>
                      </div>
                      <div className="card preview-card">
                        <div className="preview-header">
                          <label><Icon name="crop" size={16} /> Crop Area</label>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => loadItemPreview(it)}
                            disabled={isPreviewing || !it.target_url}
                          >
                            {isPreviewing ? 'Loading…' : <><Icon name="search" size={14} /> Preview</>}
                          </button>
                        </div>
                        <div className="preview-body">
                          {isPreviewing ? (
                            <div className="preview-spinner">Capturing screenshot… (may take 10-15s)</div>
                          ) : (
                            <CropSelector
                              previewUrl={previewUrl}
                              crop={itemCrop}
                              onChange={c => updateItemCrop(it, c)}
                            />
                          )}
                        </div>
                      </div>
                      <div className="card">
                        <div className="crop-values">
                          <span>x: {it.crop_x ?? 0}%</span>
                          <span>y: {it.crop_y ?? 0}%</span>
                          <span>w: {it.crop_width ?? 100}%</span>
                          <span>h: {it.crop_height ?? 100}%</span>
                        </div>
                        {previewUrl && (
                          <CroppedPreview previewUrl={previewUrl} crop={itemCrop} label={`Cropped: ${it.label || `URL ${i+1}`}`} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )
          ) : (
            /* Single-URL mode */
            <>
              <div className="card preview-card">
                <div className="preview-header">
                  <label><Icon name="crop" size={16} /> Crop Area Selection</label>
                  <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>Drag a box to select region</span>
                </div>
                <div className="preview-body">
                  {previewing ? (
                    <div className="preview-spinner">Capturing screenshot… (may take 10-15s)</div>
                  ) : (
                    <CropSelector
                      previewUrl={previewUrl}
                      crop={cropProp}
                      onChange={c => {
                        set('crop_x',      Math.round(c.x * 10) / 10);
                        set('crop_y',      Math.round(c.y * 10) / 10);
                        set('crop_width',  Math.round(c.width  * 10) / 10);
                        set('crop_height', Math.round(c.height * 10) / 10);
                      }}
                    />
                  )}
                </div>
              </div>

              {previewUrl && (
                <div className="card">
                  <h2>Crop Coordinates</h2>
                  <div className="crop-values">
                    <span>x: {form.crop_x}%</span>
                    <span>y: {form.crop_y}%</span>
                    <span>w: {form.crop_width}%</span>
                    <span>h: {form.crop_height}%</span>
                  </div>
                  <CroppedPreview previewUrl={previewUrl} crop={cropProp} label="Cropped Result Preview" />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="form-actions" style={{ marginTop: 24 }}>
        <Link to="/" className="btn">Cancel</Link>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save Job'}
        </button>
      </div>
    </div>
  );
}
