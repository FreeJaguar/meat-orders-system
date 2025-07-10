'use client'
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function WarehouseDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editOrderItems, setEditOrderItems] = useState([]);
  const [editNotes, setEditNotes] = useState('');
  const [editDeliveryDate, setEditDeliveryDate] = useState('');
  const [allProducts, setAllProducts] = useState([]);

  useEffect(() => {
    loadOrders();
    loadProducts();
    setupRealtimeSubscription();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
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

      if (error) throw error;
      setOrders(data || []);
      
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('category, name');

      if (error) throw error;
      setAllProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
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
        console.log('Order change received:', payload);
        
        if (payload.eventType === 'INSERT') {
          showNotification(`🔔 הזמנה חדשה התקבלה! מספר: ${payload.new.order_number}`);
          playNotificationSound();
        } else if (payload.eventType === 'UPDATE') {
          showNotification(`📝 הזמנה ${payload.new.order_number} עודכנה`);
        }
        
        loadOrders();
      })
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const showNotification = (message) => {
    // התראה של הדפדפן
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('מערכת הזמנות מחסן', {
        body: message,
        icon: '🥩'
      });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification('מערכת הזמנות מחסן', {
            body: message,
            icon: '🥩'
          });
        }
      });
    }
    
    // התראה ויזואלית באפליקציה
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg z-50 animate-bounce';
    notification.innerHTML = `
      <div class="flex items-center space-x-2 space-x-reverse">
        <span>🔔</span>
        <span>${message}</span>
      </div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 5000);
  };

  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.log('Sound not supported');
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) throw error;
      
      loadOrders();
      setShowOrderDetails(false);
      alert(`✅ סטטוס ההזמנה עודכן ל-${newStatus}`);
      
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('שגיאה בעדכון סטטוס ההזמנה');
    }
  };

  // פונקציות הדפסה וייצוא
  const printOrder = (order) => {
    const printWindow = window.open('', '_blank');
    const printContent = generatePrintHTML(order);
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const generatePrintHTML = (order) => {
    // קיבוץ מוצרים לפי קטגוריה
    const itemsByCategory = order.order_items.reduce((acc, item) => {
      const category = item.products?.category || 'אחר';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {});

    const categoriesHTML = Object.entries(itemsByCategory).map(([category, items]) => `
      <div class="category-section">
        <h3 style="background: #f3f4f6; padding: 8px; margin: 10px 0 5px 0; font-weight: bold; border-right: 4px solid #3b82f6;">${category}</h3>
        ${items.map(item => {
          const noteParts = item.notes ? item.notes.split(' | ') : ['', ''];
          const weight = noteParts[0]?.replace('משקל: ', '') || '';
          const notes = noteParts[1] || '';
          
          return `
            <div style="padding: 8px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between;">
              <div>
                <strong>${item.products?.name || 'מוצר לא זמין'}</strong>
                ${weight ? `<br><small>משקל: ${weight}</small>` : ''}
                ${notes ? `<br><small>הערות: ${notes}</small>` : ''}
              </div>
              <div style="text-align: left; font-weight: bold; font-size: 1.2em;">
                ${item.quantity} ${item.products?.unit || 'יח׳'}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `).join('');

    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <title>הזמנה ${order.order_number}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            line-height: 1.4;
            font-size: 14px;
          }
          .header { 
            border-bottom: 3px solid #333; 
            padding-bottom: 15px; 
            margin-bottom: 20px; 
            text-align: center;
          }
          .info-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 20px; 
            margin-bottom: 20px; 
          }
          .info-box { 
            border: 1px solid #ddd; 
            padding: 10px; 
            border-radius: 5px; 
          }
          .category-section { 
            margin-bottom: 15px; 
            page-break-inside: avoid;
          }
          .items-container {
            border: 1px solid #ddd;
            border-radius: 5px;
            overflow: hidden;
          }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
            .category-section { 
              page-break-inside: avoid; 
              margin-bottom: 20px;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🥩 הזמנה מספר ${order.order_number}</h1>
          <p style="color: #666;">תאריך הדפסה: ${new Date().toLocaleDateString('he-IL')}</p>
        </div>
        
        <div class="info-grid">
          <div class="info-box">
            <h3>פרטי לקוח</h3>
            <p><strong>שם:</strong> ${order.customers?.name || 'לא צוין'}</p>
            <p><strong>קוד:</strong> ${order.customers?.code || 'אין'}</p>
            <p><strong>טלפון:</strong> ${order.customers?.phone || 'לא צוין'}</p>
            <p><strong>כתובת:</strong> ${order.customers?.address || 'לא צוינה'}</p>
          </div>
          
          <div class="info-box">
            <h3>פרטי הזמנה</h3>
            <p><strong>תאריך אספקה:</strong> ${new Date(order.delivery_date).toLocaleDateString('he-IL')}</p>
            <p><strong>סטטוס:</strong> ${order.status}</p>
            <p><strong>סה"כ פריטים:</strong> ${order.order_items?.length || 0}</p>
            <p><strong>נוצרה:</strong> ${new Date(order.created_at).toLocaleDateString('he-IL')}</p>
          </div>
        </div>

        ${order.notes ? `
          <div class="info-box" style="margin-bottom: 20px;">
            <h3>הערות כלליות</h3>
            <p>${order.notes}</p>
          </div>
        ` : ''}
        
        <div class="items-container">
          <h2 style="background: #333; color: white; padding: 10px; margin: 0;">פריטי ההזמנה</h2>
          ${categoriesHTML}
        </div>
        
        <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #666;">
          <p>הודפס ממערכת הזמנות דיגיטלית | ${new Date().toLocaleString('he-IL')}</p>
        </div>
      </body>
      </html>
    `;
  };

  const exportToExcel = () => {
    const csvContent = generateCSVContent();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `הזמנות_${new Date().toLocaleDateString('he-IL').replace(/\//g, '-')}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateCSVContent = () => {
    const headers = ['מספר הזמנה', 'לקוח', 'קוד לקוח', 'תאריך אספקה', 'סטטוס', 'מוצר', 'קטגוריה', 'כמות', 'הערות פריט', 'הערות הזמנה', 'תאריך יצירה'];
    
    const rows = [];
    filteredOrders.forEach(order => {
      if (order.order_items && order.order_items.length > 0) {
        order.order_items.forEach(item => {
          const row = [
            order.order_number,
            order.customers?.name || '',
            order.customers?.code || '',
            new Date(order.delivery_date).toLocaleDateString('he-IL'),
            order.status,
            item.products?.name || '',
            item.products?.category || '',
            item.quantity,
            item.notes || '',
            order.notes || '',
            new Date(order.created_at).toLocaleDateString('he-IL')
          ];
          rows.push(row.map(field => `"${field}"`).join(','));
        });
      } else {
        const row = [
          order.order_number,
          order.customers?.name || '',
          order.customers?.code || '',
          new Date(order.delivery_date).toLocaleDateString('he-IL'),
          order.status,
          '', '', '', '',
          order.notes || '',
          new Date(order.created_at).toLocaleDateString('he-IL')
        ];
        rows.push(row.map(field => `"${field}"`).join(','));
      }
    });
    
    return '\uFEFF' + [headers.join(','), ...rows].join('\n');
  };

  // פונקציות עריכה (כפי שהיו)
  const startEditOrder = (order) => {
    setEditingOrder(order);
    setEditDeliveryDate(order.delivery_date);
    setEditNotes(order.notes || '');
    
    const items = order.order_items.map(item => {
      const noteParts = item.notes ? item.notes.split(' | ') : ['', ''];
      const weight = noteParts[0]?.replace('משקל: ', '') || '';
      const notes = noteParts[1] || '';
      
      return {
        id: item.id,
        product_id: item.product_id,
        product_name: item.products.name,
        category: item.products.category,
        quantity: item.quantity,
        weight: weight,
        notes: notes,
        unit: item.products.unit
      };
    });
    
    setEditOrderItems(items);
    setShowOrderDetails(false);
  };

  const updateEditQuantity = (itemIndex, quantity) => {
    if (quantity <= 0) {
      setEditOrderItems(editOrderItems.filter((_, index) => index !== itemIndex));
    } else {
      setEditOrderItems(editOrderItems.map((item, index) =>
        index === itemIndex ? { ...item, quantity } : item
      ));
    }
  };

  const updateEditItemField = (itemIndex, field, value) => {
    setEditOrderItems(editOrderItems.map((item, index) =>
      index === itemIndex ? { ...item, [field]: value } : item
    ));
  };

  const addProductToEdit = (product) => {
    const existingIndex = editOrderItems.findIndex(item => item.product_id === product.id);
    
    if (existingIndex >= 0) {
      updateEditQuantity(existingIndex, editOrderItems[existingIndex].quantity + 1);
    } else {
      setEditOrderItems([...editOrderItems, {
        id: null,
        product_id: product.id,
        product_name: product.name,
        category: product.category,
        quantity: 1,
        weight: '',
        notes: '',
        unit: product.unit
      }]);
    }
  };

  const saveOrderEdit = async () => {
    if (!editingOrder) return;
    
    try {
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          delivery_date: editDeliveryDate,
          notes: editNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingOrder.id);

      if (orderError) throw orderError;

      const { error: deleteError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', editingOrder.id);

      if (deleteError) throw deleteError;

      const orderItemsData = editOrderItems.map(item => ({
        order_id: editingOrder.id,
        product_id: item.product_id,
        quantity: item.quantity,
        notes: `${item.weight ? `משקל: ${item.weight} | ` : ''}${item.notes || ''}`
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsData);

      if (itemsError) throw itemsError;

      setEditingOrder(null);
      setEditOrderItems([]);
      setEditNotes('');
      setEditDeliveryDate('');
      loadOrders();
      
      alert(`✅ הזמנה ${editingOrder.order_number} עודכנה בהצלחה!`);
      
    } catch (error) {
      console.error('Error updating order:', error);
      alert('❌ שגיאה בעדכון ההזמנה: ' + error.message);
    }
  };

  const cancelEdit = () => {
    setEditingOrder(null);
    setEditOrderItems([]);
    setEditNotes('');
    setEditDeliveryDate('');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'חדשה': return 'bg-blue-100 text-blue-800';
      case 'בטיפול': return 'bg-yellow-100 text-yellow-800';
      case 'נשלחה': return 'bg-purple-100 text-purple-800';
      case 'הושלמה': return 'bg-green-100 text-green-800';
      case 'בוטלה': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    return order.status === filter;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
      <div className="max-w-7xl mx-auto">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            📋 דשבורד מחסן
          </h1>
          <p className="text-gray-600">ניהול הזמנות והתראות בזמן אמת</p>
          
          <div className="mt-4">
            <button
              onClick={() => window.open('/', '_blank')}
              className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors"
            >
              🏪 חזרה לטופס הזמנות
            </button>
          </div>
        </div>

        {/* כפתורי ייצוא */}
        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-gray-800">פעולות כלליות</h3>
            <button
              onClick={exportToExcel}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
            >
              <Download size={16} className="ml-1" />
              ייצא לאקסל
            </button>
          </div>
        </div>

        {/* סינון */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h3 className="font-bold text-gray-800 mb-4">סינון הזמנות</h3>
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'כל ההזמנות', count: orders.length },
              { key: 'חדשה', label: 'חדשות', count: orders.filter(o => o.status === 'חדשה').length },
              { key: 'בטיפול', label: 'בטיפול', count: orders.filter(o => o.status === 'בטיפול').length },
              { key: 'נשלחה', label: 'נשלחו', count: orders.filter(o => o.status === 'נשלחה').length },
              { key: 'הושלמה', label: 'הושלמו', count: orders.filter(o => o.status === 'הושלמה').length }
            ].map(filterOption => (
              <button
                key={filterOption.key}
                onClick={() => setFilter(filterOption.key)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === filterOption.key
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filterOption.label} ({filterOption.count})
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">טוען הזמנות...</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-md">
                <Package size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">אין הזמנות להצגה</p>
              </div>
            ) : (
              filteredOrders.map(order => (
                <div key={order.id} className="bg-white p-6 rounded-lg shadow-md border hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 space-x-reverse mb-2">
                        <h3 className="text-xl font-bold text-gray-800">
                          הזמנה #{order.order_number}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <p><strong>לקוח:</strong> {order.customers?.name || 'לא צוין'}</p>
                          <p><strong>קוד לקוח:</strong> {order.customers?.code || 'אין'}</p>
                        </div>
                        <div>
                          <p><strong>תאריך אספקה:</strong> {new Date(order.delivery_date).toLocaleDateString('he-IL')}</p>
                          <p><strong>נוצרה:</strong> {new Date(order.created_at).toLocaleDateString('he-IL')}</p>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <p className="text-sm text-gray-600">
                          <strong>פריטים:</strong> {order.order_items?.length || 0} מוצרים
                        </p>
                        {order.notes && (
                          <p className="text-sm text-gray-600 mt-1">
                            <strong>הערות:</strong> {order.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => printOrder(order)}
                        className="bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center"
                      >
                        <Printer size={16} className="ml-1" />
                        הדפס
                      </button>

                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowOrderDetails(true);
                        }}
                        className="bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center"
                      >
                        <Eye size={16} className="ml-1" />
                        צפה
                      </button>
                      
                      <button
                        onClick={() => startEditOrder(order)}
                        className="bg-orange-500 text-white px-3 py-2 rounded-lg hover:bg-orange-600 transition-colors flex items-center"
                      >
                        <Edit size={16} className="ml-1" />
                        ערוך
                      </button>
                      
                      {order.status === 'חדשה' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'בטיפול')}
                          className="bg-yellow-500 text-white px-3 py-2 rounded-lg hover:bg-yellow-600 transition-colors"
                        >
                          🔄 התחל טיפול
                        </button>
                      )}
                      
                      {order.status === 'בטיפול' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'נשלחה')}
                          className="bg-purple-500 text-white px-3 py-2 rounded-lg hover:bg-purple-600 transition-colors"
                        >
                          🚚 סמן כנשלחה
                        </button>
                      )}
                      
                      {order.status === 'נשלחה' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'הושלמה')}
                          className="bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 transition-colors"
                        >
                          ✅ סמן כהושלמה
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* חלון פרטי הזמנה */}
        {showOrderDetails && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-800">
                    פרטי הזמנה #{selectedOrder.order_number}
                  </h2>
                  <div className="flex space-x-2 space-x-reverse">
                    <button
                      onClick={() => printOrder(selectedOrder)}
                      className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center"
                    >
                      <Printer size={16} className="ml-1" />
                      הדפס
                    </button>
                    <button
                      onClick={() => setShowOrderDetails(false)}
                      className="text-gray-500 hover:text-gray-700 text-2xl"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="font-bold text-gray-800 mb-3">פרטי לקוח</h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>שם:</strong> {selectedOrder.customers?.name || 'לא צוין'}</p>
                      <p><strong>קוד:</strong> {selectedOrder.customers?.code || 'אין'}</p>
                      <p><strong>טלפון:</strong> {selectedOrder.customers?.phone || 'לא צוין'}</p>
                      <p><strong>כתובת:</strong> {selectedOrder.customers?.address || 'לא צוינה'}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-bold text-gray-800 mb-3">פרטי הזמנה</h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>תאריך אספקה:</strong> {new Date(selectedOrder.delivery_date).toLocaleDateString('he-IL')}</p>
                      <p><strong>סטטוס:</strong> <span className={`px-2 py-1 rounded text-xs ${getStatusColor(selectedOrder.status)}`}>{selectedOrder.status}</span></p>
                      <p><strong>נוצרה:</strong> {new Date(selectedOrder.created_at).toLocaleDateString('he-IL')}</p>
                      <p><strong>עודכנה:</strong> {new Date(selectedOrder.updated_at).toLocaleDateString('he-IL')}</p>
                    </div>
                  </div>
                </div>
                
                <div className="mb-6">
                  <h3 className="font-bold text-gray-800 mb-3">פריטי הזמנה (מקובצים לפי קטגוריה)</h3>
                  {(() => {
                    // קיבוץ פריטים לפי קטגוריה
                    const itemsByCategory = selectedOrder.order_items?.reduce((acc, item) => {
                      const category = item.products?.category || 'אחר';
                      if (!acc[category]) {
                        acc[category] = [];
                      }
                      acc[category].push(item);
                      return acc;
                    }, {}) || {};

                    return Object.entries(itemsByCategory).map(([category, items]) => (
                      <div key={category} className="mb-4 border rounded-lg overflow-hidden">
                        <div className="bg-blue-50 px-4 py-2 border-b">
                          <h4 className="font-bold text-blue-800">{category}</h4>
                        </div>
                        <div className="divide-y">
                          {items.map((item, index) => {
                            const noteParts = item.notes ? item.notes.split(' | ') : ['', ''];
                            const weight = noteParts[0]?.replace('משקל: ', '') || '';
                            const notes = noteParts[1] || '';
                            
                            return (
                              <div key={index} className="p-3 flex justify-between items-center">
                                <div className="flex-1">
                                  <p className="font-medium">{item.products?.name || 'מוצר לא זמין'}</p>
                                  {weight && <p className="text-sm text-gray-600">משקל: {weight}</p>}
                                  {notes && <p className="text-sm text-gray-600">הערות: {notes}</p>}
                                </div>
                                <div className="text-left font-bold text-lg">
                                  {item.quantity} {item.products?.unit || 'יח׳'}
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
                    <h3 className="font-bold text-gray-800 mb-3">הערות כלליות</h3>
                    <p className="bg-gray-50 p-4 rounded-lg">{selectedOrder.notes}</p>
                  </div>
                )}
                
                <div className="flex space-x-4 space-x-reverse">
                  {selectedOrder.status === 'חדשה' && (
                    <button
                      onClick={() => updateOrderStatus(selectedOrder.id, 'בטיפול')}
                      className="bg-yellow-500 text-white px-6 py-3 rounded-lg hover:bg-yellow-600 transition-colors"
                    >
                      🔄 התחל טיפול
                    </button>
                  )}
                  
                  {selectedOrder.status === 'בטיפול' && (
                    <button
                      onClick={() => updateOrderStatus(selectedOrder.id, 'נשלחה')}
                      className="bg-purple-500 text-white px-6 py-3 rounded-lg hover:bg-purple-600 transition-colors"
                    >
                      🚚 סמן כנשלחה
                    </button>
                  )}
                  
                  {selectedOrder.status === 'נשלחה' && (
                    <button
                      onClick={() => updateOrderStatus(selectedOrder.id, 'הושלמה')}
                      className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors"
                    >
                      ✅ סמן כהושלמה
                    </button>
                  )}
                  
                  {selectedOrder.status !== 'בוטלה' && selectedOrder.status !== 'הושלמה' && (
                    <button
                      onClick={() => updateOrderStatus(selectedOrder.id, 'בוטלה')}
                      className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition-colors"
                    >
                      ❌ בטל הזמנה
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* חלון עריכת הזמנה */}
        {editingOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-800">
                    ✏️ עריכת הזמנה #{editingOrder.order_number}
                  </h2>
                  <button
                    onClick={cancelEdit}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="font-bold text-gray-800 mb-3">פרטי לקוח</h3>
                    <div className="space-y-2 text-sm bg-gray-50 p-4 rounded">
                      <p><strong>שם:</strong> {editingOrder.customers?.name || 'לא צוין'}</p>
                      <p><strong>קוד:</strong> {editingOrder.customers?.code || 'אין'}</p>
                      <p><strong>טלפון:</strong> {editingOrder.customers?.phone || 'לא צוין'}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-bold text-gray-800 mb-3">עריכת פרטי הזמנה</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">תאריך אספקה</label>
                        <input
                          type="date"
                          value={editDeliveryDate}
                          onChange={(e) => setEditDeliveryDate(e.target.value)}
                          className="w-full border rounded px-3 py-2 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">הערות כלליות</label>
                        <textarea
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          placeholder="הערות להזמנה..."
                          className="w-full border rounded px-3 py-2 focus:border-blue-500 focus:outline-none"
                          rows="3"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* עריכת פריטי הזמנה */}
                <div className="mb-6">
                  <h3 className="font-bold text-gray-800 mb-3">עריכת פריטי הזמנה</h3>
                  <div className="space-y-4 max-h-80 overflow-y-auto border rounded p-4">
                    {editOrderItems.map((item, index) => (
                      <div key={index} className="p-4 bg-gray-50 rounded-lg border">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="font-medium text-gray-800">{item.product_name}</div>
                            <div className="text-sm text-gray-500">{item.category}</div>
                          </div>
                          <button
                            onClick={() => updateEditQuantity(index, 0)}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            ✖ הסר
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">כמות</label>
                            <div className="flex items-center space-x-2 space-x-reverse">
                              <button
                                onClick={() => updateEditQuantity(index, item.quantity - 1)}
                                className="w-8 h-8 bg-red-500 text-white rounded-full hover:bg-red-600 flex items-center justify-center"
                              >
                                <Minus size={16} />
                              </button>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateEditQuantity(index, parseInt(e.target.value) || 0)}
                                className="w-16 text-center border rounded px-2 py-1"
                                min="1"
                              />
                              <button
                                onClick={() => updateEditQuantity(index, item.quantity + 1)}
                                className="w-8 h-8 bg-green-500 text-white rounded-full hover:bg-green-600 flex items-center justify-center"
                              >
                                <Plus size={16} />
                              </button>
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">משקל</label>
                            <input
                              type="text"
                              value={item.weight || ''}
                              onChange={(e) => updateEditItemField(index, 'weight', e.target.value)}
                              placeholder="כמה ק״ג?"
                              className="w-full border rounded px-3 py-1 text-sm focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">הערות</label>
                            <input
                              type="text"
                              value={item.notes || ''}
                              onChange={(e) => updateEditItemField(index, 'notes', e.target.value)}
                              placeholder="הערות למוצר..."
                              className="w-full border rounded px-3 py-1 text-sm focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* הוספת מוצרים חדשים */}
                <div className="mb-6">
                  <h3 className="font-bold text-gray-800 mb-3">הוסף מוצרים להזמנה</h3>
                  <div className="max-h-48 overflow-y-auto border rounded p-4">
                    <div className="grid gap-2">
                      {allProducts.map(product => (
                        <div key={product.id} className="flex justify-between items-center p-2 bg-gray-50 rounded hover:bg-gray-100">
                          <div className="flex-1">
                            <span className="font-medium text-gray-800">{product.name}</span>
                            <div className="text-sm text-gray-500">
                              <span className="bg-blue-100 px-2 py-1 rounded mr-2">{product.category}</span>
                              <span>{product.unit || 'יחידה'}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => addProductToEdit(product)}
                            className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 transition-colors text-sm"
                          >
                            ➕ הוסף
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-4 space-x-reverse">
                  <button
                    onClick={saveOrderEdit}
                    className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors font-medium"
                  >
                    💾 שמור שינויים
                  </button>
                  
                  <button
                    onClick={cancelEdit}
                    className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    ❌ בטל
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}