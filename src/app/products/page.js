'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { validateProduct, productPayload } from '@/lib/productManagement';

const supabase = getSupabaseClient();
const empty = { name: '', category: '', barcode: '', unit: 'קר', price: '', is_active: true };
const field = 'w-full border border-[var(--color-border-strong)] rounded-lg px-3 py-2 bg-white text-[var(--color-text)]';
const btn = 'rounded-lg border border-[var(--color-border-strong)] px-4 py-2 hover:bg-[var(--color-accent-light)] disabled:opacity-50';
export default function ProductsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('active');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...empty });
  const [open, setOpen] = useState(false);
  const dialogRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({data:{session},error:authError}) => {
      if (!alive) return;
      if (authError || !session) { router.replace('/login'); return; }
      setReady(true);
      reload();
    });
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace('/login');
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, [router]); // eslint-disable-line react-hooks/exhaustive-deps
  // Use a native modal dialog: editing never moves the user's position in the catalog.
  // The browser handles focus trapping and returns focus to the Edit button on close.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      dialog.querySelector('[name="product-name"]')?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(''), 5000);
    return () => window.clearTimeout(timeout);
  }, [message]);

  const reload = async () => {
    const {data,error:loadError} = await supabase.from('products').select('*').order('name');
    if (loadError) setError(loadError.message);
    else { setItems(data || []); setError(''); }
  };
  const categories = useMemo(() => [...new Set(items.map(x => x.category).filter(Boolean))].sort((a,b) => a.localeCompare(b,'he')), [items]);
  const filtered = items.filter(x =>
    (!category || x.category === category) &&
    (status === 'all' || (status === 'active' ? x.is_active === true : x.is_active === false)) &&
    [x.name,x.category,x.barcode,x.id].some(v => String(v ?? '').toLowerCase().includes(search.trim().toLowerCase()))
  );
  const closeEditor = () => {
    if (busy) return;
    setOpen(false);
    setEditing(null);
    setError('');
  };
  const start = (item = null) => {
    setEditing(item);
    setForm(item ? { name: item.name || '', category: item.category || '', barcode: item.barcode || '', unit: item.unit || 'קר', price: item.price ?? '', is_active: item.is_active === true } : {...empty});
    setError('');
    setMessage('');
    setOpen(true);
  };
  const save = async event => {
    event.preventDefault();
    if (busy) return;
    setError('');
    const validation = validateProduct(form);
    if (validation) { setError(validation); return; }
    const barcode = form.barcode?.trim();
    if (barcode && items.some(x => x.id !== editing?.id && x.barcode === barcode)) {
      setError('הברקוד כבר קיים במוצר אחר'); return;
    }
    setBusy(true);
    try {
      const payload = productPayload(form);
      const query = editing ? supabase.from('products').update(payload).eq('id',editing.id) : supabase.from('products').insert(payload);
      const {data,error:saveError} = await query.select().single();
      if (saveError) throw saveError;
      setItems(prev => editing ? prev.map(x => x.id === data.id ? data : x) : [...prev,data]);
      setOpen(false);
      setEditing(null);
      // Preserve the list and scroll position after an edit.
      // For a new item, remove filters so the newly added product can be found.
      if (!editing) {
        setStatus('all');
        setCategory('');
        setSearch('');
      }
      setMessage(editing ? 'המוצר עודכן בהצלחה' : 'המוצר נוסף בהצלחה');
    } catch (e) { setError(e.message || 'שגיאה בשמירה'); }
    finally { setBusy(false); }
  };
  const toggle = async item => {
    if (busy) return;
    if (item.is_active && !window.confirm('להשבית את המוצר? הוא לא יוצג בהזמנות חדשות.')) return;
    setBusy(true); setError('');
    const {data,error:changeError} = await supabase.from('products').update({is_active: !item.is_active}).eq('id',item.id).select().single();
    if (changeError) setError(changeError.message);
    else { setItems(prev => prev.map(x => x.id === data.id ? data : x)); setMessage(data.is_active ? 'המוצר הופעל' : 'המוצר הושבת'); }
    setBusy(false);
  };
  if (!ready) return <main dir="rtl" className="p-8">בודק הרשאות...</main>;
  return <main dir="rtl" className="min-h-screen bg-[var(--color-bg)] p-4 sm:p-8 text-[var(--color-text)]">
    <div className="max-w-6xl mx-auto space-y-5">
      <header className="rounded-xl bg-white border border-[var(--color-border)] p-5 flex flex-wrap gap-3 justify-between items-center">
        <div><h1 className="text-2xl font-bold">ניהול מוצרים</h1><p className="text-sm text-[var(--color-text-secondary)]">הוספה, עריכה, הפעלה והשבתה של מוצרי המערכת</p></div>
        <div className="flex gap-2"><Link href="/" className={btn}>חזרה להזמנות</Link><button className="rounded-lg bg-[var(--color-accent)] text-white px-4 py-2" onClick={() => start()}>+ מוצר חדש</button></div>
      </header>
      {message && <p role="status" className="fixed top-4 left-1/2 z-[60] w-[min(90vw,28rem)] -translate-x-1/2 rounded-xl border border-green-200 bg-green-50 px-5 py-3 text-center text-green-800 shadow-lg">{message}</p>}
      {error && !open && <p role="alert" className="rounded-lg p-3 bg-red-50 text-red-800">{error}</p>}
      <dialog
        ref={dialogRef}
        aria-labelledby="product-editor-title"
        onClose={() => { setOpen(false); setEditing(null); setError(''); }}
        onCancel={event => { if (busy) event.preventDefault(); }}
        className="fixed inset-0 m-auto w-[92vw] max-w-2xl max-h-[90dvh] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white p-0 text-[var(--color-text)] shadow-2xl backdrop:bg-black/60"
      >
        <form onSubmit={save} className="flex max-h-[90dvh] flex-col">
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface-alt)] px-5 py-4">
            <div>
              <h2 id="product-editor-title" className="text-xl font-bold">{editing ? 'עריכת מוצר' : 'הוספת מוצר חדש'}</h2>
              {editing && <p className="mt-1 text-sm text-[var(--color-text-secondary)]">מוצר #{editing.id} | {editing.name}</p>}
            </div>
            <button type="button" aria-label="סגירת חלון העריכה" onClick={closeEditor} disabled={busy} className="rounded-lg border border-[var(--color-border)] px-3 py-1 text-xl leading-none hover:bg-[var(--color-accent-light)] disabled:opacity-50">×</button>
          </div>
          <div className="min-h-0 space-y-4 overflow-y-auto overscroll-contain px-5 py-4">
            {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">שם מוצר *
                <input name="product-name" className={field} required maxLength={200} value={form.name} onChange={e => setForm({...form,name:e.target.value})}/>
              </label>
              <label className="block text-sm font-medium">קטגוריה *
                <input className={field} required maxLength={100} list="catalog-categories" value={form.category} onChange={e => setForm({...form,category:e.target.value})}/>
                <datalist id="catalog-categories">{categories.map(c => <option key={c} value={c}/>)}</datalist>
              </label>
              <label className="block text-sm font-medium">יחידת מידה *
                <input className={field} required maxLength={50} value={form.unit} onChange={e => setForm({...form,unit:e.target.value})}/>
              </label>
              <label className="block text-sm font-medium">ברקוד
                <input className={field} maxLength={100} value={form.barcode} onChange={e => setForm({...form,barcode:e.target.value})}/>
              </label>
              <label className="block text-sm font-medium">מחיר
                <input className={field} type="number" min="0" step="0.01" value={form.price} onChange={e => setForm({...form,price:e.target.value})}/>
              </label>
              <label className="flex items-center gap-2 self-end rounded-lg bg-[var(--color-surface-alt)] p-3 text-sm font-medium">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm({...form,is_active:e.target.checked})}/>
                פעיל וזמין להזמנות חדשות
              </label>
            </div>
            {editing && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">שינוי שם או קטגוריה ישנה גם את אופן הצגת המוצר בהזמנות קיימות.</p>}
          </div>
          <div className="flex shrink-0 justify-end gap-2 border-t border-[var(--color-border)] bg-white px-5 py-4">
            <button type="button" disabled={busy} onClick={closeEditor} className={btn}>ביטול</button>
            <button type="submit" disabled={busy} className="rounded-lg bg-[var(--color-accent)] px-5 py-2 font-medium text-white hover:opacity-90 disabled:opacity-50">{busy ? 'שומר...' : 'שמור מוצר'}</button>
          </div>
        </form>
      </dialog>
      <section className="rounded-xl border border-[var(--color-border)] bg-white p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input aria-label="חיפוש מוצר" className={field} value={search} placeholder="חיפוש שם, ברקוד או מספר..." onChange={e => setSearch(e.target.value)}/>
        <select aria-label="קטגוריה" className={field} value={category} onChange={e => setCategory(e.target.value)}><option value="">כל הקטגוריות</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select>
        <select aria-label="מצב מוצר" className={field} value={status} onChange={e => setStatus(e.target.value)}><option value="active">פעילים</option><option value="inactive">מושבתים</option><option value="all">כל המוצרים</option></select>
      </section>
      <p className="text-sm text-[var(--color-text-secondary)]">מציג {filtered.length} מתוך {items.length} מוצרים</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(item => <article key={item.id} className="rounded-xl border border-[var(--color-border)] bg-white p-4">
          <div className="flex justify-between gap-2"><h3 className="font-bold">{item.name}</h3><span className={item.is_active ? 'text-green-700 text-xs' : 'text-amber-700 text-xs'}>{item.is_active ? 'פעיל' : 'מושבת'}</span></div>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">{item.category} | יחידה: {item.unit || 'לא הוגדרה'}</p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-2">מזהה {item.id} | ברקוד: {item.barcode || 'אין'} | מחיר: {item.price ?? 'לא הוגדר'}</p>
          <div className="flex gap-2 mt-4"><button className={btn} onClick={() => start(item)}>עריכה</button><button disabled={busy} className={btn} onClick={() => toggle(item)}>{item.is_active ? 'השבת' : 'הפעל'}</button></div>
        </article>)}
      </div>
      {!filtered.length && <p className="text-center bg-white rounded-xl p-8">לא נמצאו מוצרים לפי הסינון שבחרת.</p>}
    </div>
  </main>;
}
