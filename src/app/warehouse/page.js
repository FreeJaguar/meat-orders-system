'use client'
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Eye, Download, Printer } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { getItemWeightAndNotes } from '@/lib/orderUtils';

const supabase = getSupabaseClient();

export default function WarehouseDashboard() {
  const router = useRouter();

  // ─── Auth ─────────────────────────────────────────────────────────────────
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ─── Orders ───────────────────────────────────────────────────────────────
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  useEffect(() => {
    // Auth check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login');
        return;
      }
      setUser(session.user);
      setAuthLoading(false);
    });

    loadOrders();
    const cleanup = setupRealtimeSubscription();

    // Request browser notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return cleanup;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadOrders = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('orders')
        .select(`
          *,
          customers (name, code, phone, address),
          order_items (
            *,
            products (name, category, unit)
          )
        `)
        .order('created_at', { ascending: false });
      setOrders(data || []);
    } catch {
      console.log('Error loading orders');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('orders-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders'
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          showNotification(`🔔 הזמנה חדשה התקבלה! מספר: ${payload.new.order_number}`);
          playNotificationSound();
        } else if (payload.eventType === 'UPDATE') {
          showNotification(`📝 הזמנה ${payload.new.order_number} עודכנה`);
        }
        loadOrders();
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'order_items'
      }, () => {
        loadOrders();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  const showNotification = (message) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('מערכת הזמנות מחסן', { body: message, icon: '🥩' });
    }
    const el = document.createElement('div');
    el.className = 'fixed top-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg z-50 animate-bounce';
    el.innerHTML = `<div class="flex items-center space-x-2 space-x-reverse"><span>🔔</span><span>${message}</span></div>`;
    document.body.appendChild(el);
    setTimeout(() => { if (document.body.contains(el)) document.body.removeChild(el); }, 5000);
  };

  const playNotificationSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.setValueAtTime(600, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch {
      // audio not supported
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  // ─── Order status ─────────────────────────────────────────────────────────
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId);
      loadOrders();
      setShowOrderDetails(false);
      alert(`✅ סטטוס ההזמנה עודכן ל-${newStatus}`);
    } catch {
      alert('שגיאה בעדכון סטטוס ההזמנה');
    }
  };

  // ─── Print ────────────────────────────────────────────────────────────────
  const printOrder = async (order) => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      alert('לא ניתן לפתוח חלון הדפסה. אנא בדוק את הגדרות החסימה בדפדפן.');
      return;
    }
    printWindow.document.write(generatePrintHTML(order));
    printWindow.document.close();
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    };
    try {
      await supabase
        .from('orders')
        .update({ status: 'הודפס', updated_at: new Date().toISOString() })
        .eq('id', order.id);
      loadOrders();
      alert('✅ ההזמנה הודפסה וסומנה כהודפס');
    } catch {
      alert('⚠️ ההדפסה בוצעה אך לא ניתן לעדכן את הסטטוס');
    }
  };

  const generatePrintHTML = (order) => {
    const itemsByCategory = (order.order_items || []).reduce((acc, item) => {
      const cat = item.products?.category || 'אחר';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {});

    const categoriesHTML = Object.entries(itemsByCategory).map(([category, items]) => `
      <div class="category-section">
        <h3 style="background:#e5e7eb;padding:6px;margin:0 0 5px 0;font-weight:bold;border-right:4px solid #3b82f6;color:#1f2937;font-size:14px;">${escapeHtml(category)}</h3>
        ${items.map(item => {
          const { weight, notes } = getItemWeightAndNotes(item);
          return `
            <div style="padding:6px;border-bottom:1px solid #d1d5db;display:flex;justify-content:space-between;align-items:center;">
              <div style="flex:1;">
                <div style="font-weight:bold;font-size:12px;color:#1f2937;">${escapeHtml(item.products?.name || 'מוצר לא זמין')}</div>
                ${weight ? `<div style="font-size:10px;color:#6b7280;margin-top:2px;">משקל: ${escapeHtml(weight)}</div>` : ''}
                ${notes ? `<div style="font-size:11px;color:#6b7280;margin-top:2px;">הערות: ${escapeHtml(notes)}</div>` : ''}
              </div>
              <div style="text-align:left;font-weight:bold;font-size:12px;color:#1f2937;min-width:60px;">
                ${weight ? weight : `${item.quantity} ${escapeHtml(item.products?.unit || 'יח׳')}`}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `).join('');

    return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <title>הזמנה ${escapeHtml(order.order_number)}</title>
  <style>
    @media print { body { margin:0; padding:20px; } }
    .categories-container { columns:2; column-gap:20px; }
    .category-section { break-inside:avoid; margin-bottom:15px; page-break-inside:avoid; }
    body { font-family:'Segoe UI',Tahoma,Arial,sans-serif; margin:0; padding:10px; line-height:1.2; font-size:11px; color:#1f2937; background:white; }
    p { margin:1px 0; }
    .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:15px; }
    .info-box { border:1px solid #e5e7eb; padding:4px; border-radius:2px; background:#f9fafb; font-size:12px; }
    .info-box h3 { margin:0 0 4px 0; font-size:12px; color:#1f2937; font-weight:bold; }
    .info-box p { margin:8px 0; font-size:14px; }
    .items-container { border:2px solid #e5e7eb; border-radius:8px; overflow:hidden; background:white; }
  </style>
</head>
<body>
  <div class="info-grid">
    <div class="info-box">
      <h3>פרטי לקוח</h3>
      <p><strong>שם:</strong> ${escapeHtml(order.customers?.name || 'לא צוין')}</p>
      <p><strong>קוד:</strong> ${escapeHtml(order.customers?.code || 'אין')}</p>
      <p><strong>טלפון:</strong> ${escapeHtml(order.customers?.phone || 'לא צוין')}</p>
      <p><strong>כתובת:</strong> ${escapeHtml(order.customers?.address || 'לא צוינה')}</p>
    </div>
    <div class="info-box">
      <h3>פרטי הזמנה</h3>
      <p><strong>מספר:</strong> ${escapeHtml(order.order_number)}</p>
      <p><strong>תאריך אספקה:</strong> ${new Date(order.delivery_date).toLocaleDateString('he-IL', { year:'numeric', month:'long', day:'numeric' })}</p>
      <p><strong>סטטוס:</strong> ${escapeHtml(order.status)}</p>
      <p><strong>סה"כ פריטים:</strong> ${order.order_items?.length || 0} מוצרים</p>
    </div>
  </div>
  ${order.notes ? `
    <div class="info-box" style="margin-bottom:15px;">
      <h3>הערות כלליות</h3>
      <p style="background:white;padding:6px;border-radius:4px;border:1px solid #e5e7eb;">${escapeHtml(order.notes)}</p>
    </div>
  ` : ''}
  <div class="items-container">
    <div class="categories-container">${categoriesHTML}</div>
  </div>
</body>
</html>`;
  };

  // ─── CSV export ───────────────────────────────────────────────────────────
  const exportToExcel = () => {
    const csvContent = generateCSVContent();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `הזמנות_${new Date().toLocaleDateString('he-IL').replace(/\//g, '-')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateCSVContent = () => {
    const headers = ['מספר הזמנה','לקוח','קוד לקוח','תאריך אספקה','סטטוס','מוצר','קטגוריה','כמות','משקל','הערות פריט','הערות הזמנה','תאריך יצירה'];
    const rows = [];
    filteredOrders.forEach(order => {
      if (order.order_items?.length > 0) {
        order.order_items.forEach(item => {
          const { weight, notes: itemNotes } = getItemWeightAndNotes(item);
          rows.push([
            order.order_number,
            order.customers?.name || '',
            order.customers?.code || '',
            new Date(order.delivery_date).toLocaleDateString('he-IL'),
            order.status,
            item.products?.name || '',
            item.products?.category || '',
            weight ? '' : item.quantity,
            weight,
            itemNotes,
            order.notes || '',
            new Date(order.created_at).toLocaleDateString('he-IL')
          ].map(f => `"${f}"`).join(','));
        });
      } else {
        rows.push([
          order.order_number,
          order.customers?.name || '',
          order.customers?.code || '',
          new Date(order.delivery_date).toLocaleDateString('he-IL'),
          order.status,
          '','','','','',
          order.notes || '',
          new Date(order.created_at).toLocaleDateString('he-IL')
        ].map(f => `"${f}"`).join(','));
      }
    });
    return '﻿' + [headers.join(','), ...rows].join('\n');
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const getStatusColor = (status) => {
    switch (status) {
      case 'חדשה':   return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'בטיפול': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'הודפס':  return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'נשלחה':  return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'הושלמה': return 'bg-green-100 text-green-800 border-green-300';
      case 'בוטלה':  return 'bg-red-100 text-red-800 border-red-300';
      default:       return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const filteredOrders = orders.filter(order =>
    filter === 'all' ? true : order.status === filter
  );

  // ─── Auth loading guard ───────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">📋 דשבורד מחסן</h1>
          <p className="text-gray-600">ניהול הזמנות והתראות בזמן אמת</p>
          <div className="mt-2 flex justify-center items-center space-x-2 space-x-reverse text-sm text-gray-500">
            <span>{user?.email}</span>
            <button onClick={handleSignOut} className="text-red-500 hover:text-red-700 font-medium underline">
              התנתק
            </button>
          </div>
          <div className="mt-4">
            <button
              onClick={() => window.open('/', '_blank')}
              className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors font-bold"
            >
              🏪 חזרה לטופס הזמנות
            </button>
          </div>
        </div>

        {/* Export */}
        <div className="bg-white p-6 rounded-lg shadow-lg mb-6 border-2 border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-gray-800 text-lg">פעולות כלליות</h3>
            <button
              onClick={exportToExcel}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center font-bold"
            >
              <Download size={18} className="ml-2" />
              ייצא לאקסל
            </button>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white p-6 rounded-lg shadow-lg mb-6 border-2 border-gray-200">
          <h3 className="font-bold text-gray-800 mb-4 text-lg">סינון הזמנות</h3>
          <div className="flex flex-wrap gap-3">
            {[
              { key: 'all',    label: 'כל ההזמנות', count: orders.length },
              { key: 'חדשה',   label: 'חדשות',      count: orders.filter(o => o.status === 'חדשה').length },
              { key: 'הודפס',  label: 'הודפס',      count: orders.filter(o => o.status === 'הודפס').length }
            ].map(opt => (
              <button key={opt.key} onClick={() => setFilter(opt.key)}
                className={`px-6 py-3 rounded-lg font-bold transition-colors border-2 ${
                  filter === opt.key
                    ? 'bg-blue-500 text-white border-blue-600 shadow-lg'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                }`}>
                {opt.label} ({opt.count})
              </button>
            ))}
          </div>
        </div>

        {/* Order list */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600 font-medium">טוען הזמנות...</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-lg border-2 border-gray-200">
                <Package size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 font-medium">אין הזמנות להצגה</p>
              </div>
            ) : (
              filteredOrders.map(order => (
                <div key={order.id} className="bg-white p-6 rounded-lg shadow-lg border-2 border-gray-200 hover:shadow-xl transition-all duration-200">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 space-x-reverse mb-3">
                        <h3 className="text-xl font-bold text-gray-800">הזמנה #{order.order_number}</h3>
                        <span className={`px-4 py-2 rounded-full text-sm font-bold border-2 ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div className="space-y-1">
                          <p className="text-gray-800"><span className="font-bold text-gray-900">לקוח:</span> {order.customers?.name || 'לא צוין'}</p>
                          <p className="text-gray-800"><span className="font-bold text-gray-900">קוד לקוח:</span> {order.customers?.code || 'אין'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-gray-800"><span className="font-bold text-gray-900">תאריך אספקה:</span> {new Date(order.delivery_date).toLocaleDateString('he-IL')}</p>
                          <p className="text-gray-800"><span className="font-bold text-gray-900">נוצרה:</span> {new Date(order.created_at).toLocaleDateString('he-IL')}</p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <p className="text-sm text-gray-800">
                          <span className="font-bold text-gray-900">פריטים:</span> {order.order_items?.length || 0} מוצרים
                        </p>
                        {order.notes && (
                          <p className="text-sm text-gray-800 mt-1">
                            <span className="font-bold text-gray-900">הערות:</span> {order.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => printOrder(order)}
                        className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center font-bold border-2 border-gray-700">
                        <Printer size={16} className="ml-1" />
                        הדפס
                      </button>
                      <button onClick={() => { setSelectedOrder(order); setShowOrderDetails(true); }}
                        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center font-bold border-2 border-blue-600">
                        <Eye size={16} className="ml-1" />
                        צפה
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Order details modal */}
        {showOrderDetails && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto border-4 border-gray-300">
              <div className="p-6 border-b-2 border-gray-200 bg-gray-50">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-800">
                    פרטי הזמנה #{selectedOrder.order_number}
                  </h2>
                  <div className="flex space-x-2 space-x-reverse">
                    <button onClick={() => printOrder(selectedOrder)}
                      className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center font-bold border-2 border-gray-700">
                      <Printer size={16} className="ml-1" />
                      הדפס
                    </button>
                    <button onClick={() => setShowOrderDetails(false)}
                      className="text-gray-500 hover:text-gray-700 text-2xl font-bold">
                      ×
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {/* Customer + order info */}
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="font-bold text-gray-800 mb-3 text-lg">פרטי לקוח</h3>
                    <div className="space-y-2 text-sm bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
                      <p className="text-gray-800"><span className="font-bold">שם:</span> {selectedOrder.customers?.name || 'לא צוין'}</p>
                      <p className="text-gray-800"><span className="font-bold">קוד:</span> {selectedOrder.customers?.code || 'אין'}</p>
                      <p className="text-gray-800"><span className="font-bold">טלפון:</span> {selectedOrder.customers?.phone || 'לא צוין'}</p>
                      <p className="text-gray-800"><span className="font-bold">כתובת:</span> {selectedOrder.customers?.address || 'לא צוינה'}</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 mb-3 text-lg">פרטי הזמנה</h3>
                    <div className="space-y-2 text-sm bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
                      <p className="text-gray-800"><span className="font-bold">תאריך אספקה:</span> {new Date(selectedOrder.delivery_date).toLocaleDateString('he-IL')}</p>
                      <p className="text-gray-800"><span className="font-bold">סטטוס:</span>{' '}
                        <span className={`px-2 py-1 rounded text-xs font-bold border ${getStatusColor(selectedOrder.status)}`}>
                          {selectedOrder.status}
                        </span>
                      </p>
                      <p className="text-gray-800"><span className="font-bold">נוצרה:</span> {new Date(selectedOrder.created_at).toLocaleDateString('he-IL')}</p>
                      <p className="text-gray-800"><span className="font-bold">עודכנה:</span> {new Date(selectedOrder.updated_at).toLocaleDateString('he-IL')}</p>
                    </div>
                  </div>
                </div>

                {/* Items grouped by category */}
                <div className="mb-6">
                  {(() => {
                    const byCategory = (selectedOrder.order_items || []).reduce((acc, item) => {
                      const cat = item.products?.category || 'אחר';
                      if (!acc[cat]) acc[cat] = [];
                      acc[cat].push(item);
                      return acc;
                    }, {});

                    return Object.entries(byCategory).map(([category, items]) => (
                      <div key={category} className="mb-4 border-2 border-gray-200 rounded-lg overflow-hidden">
                        <div className="bg-blue-50 px-4 py-3 border-b-2 border-blue-200">
                          <h4 className="font-bold text-blue-800 text-lg">{category}</h4>
                        </div>
                        <div className="divide-y-2 divide-gray-100">
                          {items.map((item, index) => {
                            const { weight, notes } = getItemWeightAndNotes(item);
                            return (
                              <div key={index} className="p-4 flex justify-between items-center bg-white hover:bg-gray-50">
                                <div className="flex-1">
                                  <p className="font-bold text-gray-800 text-lg">{item.products?.name || 'מוצר לא זמין'}</p>
                                  {weight && <p className="text-sm text-gray-600 font-medium">משקל: {weight}</p>}
                                  {notes && <p className="text-sm text-gray-600 font-medium">הערות: {notes}</p>}
                                </div>
                                <div className="text-left font-bold text-xl text-gray-800 min-w-[120px]">
                                  {weight ? weight : `${item.quantity} ${item.products?.unit || 'יח׳'}`}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ));
                  })()}
                </div>

                {selectedOrder.notes && (
                  <div className="mb-6">
                    <h3 className="font-bold text-gray-800 mb-3 text-lg">הערות כלליות</h3>
                    <p className="bg-yellow-50 p-4 rounded-lg border-2 border-yellow-200 text-gray-800 font-medium">
                      {selectedOrder.notes}
                    </p>
                  </div>
                )}

                {/* Status action buttons */}
                <div className="flex space-x-4 space-x-reverse">
                  {selectedOrder.status === 'חדשה' && (
                    <button onClick={() => updateOrderStatus(selectedOrder.id, 'בטיפול')}
                      className="bg-yellow-500 text-white px-6 py-3 rounded-lg hover:bg-yellow-600 transition-colors font-bold border-2 border-yellow-600">
                      🔄 התחל טיפול
                    </button>
                  )}
                  {selectedOrder.status === 'בטיפול' && (
                    <button onClick={() => updateOrderStatus(selectedOrder.id, 'נשלחה')}
                      className="bg-purple-500 text-white px-6 py-3 rounded-lg hover:bg-purple-600 transition-colors font-bold border-2 border-purple-600">
                      🚚 סמן כנשלחה
                    </button>
                  )}
                  {selectedOrder.status === 'נשלחה' && (
                    <button onClick={() => updateOrderStatus(selectedOrder.id, 'הושלמה')}
                      className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors font-bold border-2 border-green-600">
                      ✅ סמן כהושלמה
                    </button>
                  )}
                  {!['בוטלה','הושלמה'].includes(selectedOrder.status) && (
                    <button onClick={() => updateOrderStatus(selectedOrder.id, 'בוטלה')}
                      className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition-colors font-bold border-2 border-red-600">
                      ❌ בטל הזמנה
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// Prevents XSS in print HTML — escapes user-supplied strings before
// inserting them into the document.write() print window.
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
