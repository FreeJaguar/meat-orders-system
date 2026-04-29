'use client'
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Minus, Trash2 } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { getItemWeightAndNotes } from '@/lib/orderUtils';

const supabase = getSupabaseClient();

const DRAFT_KEY = 'meat_order_draft';

export default function OrderForm() {
  const router = useRouter();

  // ─── Auth ────────────────────────────────────────────────────────────────
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ─── Customers / Products ────────────────────────────────────────────────
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '', code: '', phone: '', address: '', contact_person: ''
  });

  // ─── Customer order history ──────────────────────────────────────────────
  const [customerOrders, setCustomerOrders] = useState([]);
  const [showCustomerHistory, setShowCustomerHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // ─── Order form ──────────────────────────────────────────────────────────
  const [orderItems, setOrderItems] = useState([]);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');

  // ─── Product modal ───────────────────────────────────────────────────────
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [tempProduct, setTempProduct] = useState({ quantity: 1, weight: '', notes: '' });

  // ─── Search / filter ─────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // ─── Editing existing order ──────────────────────────────────────────────
  const [editingOrder, setEditingOrder] = useState(null);
  const [showOrdersList, setShowOrdersList] = useState(false);
  const [allOrders, setAllOrders] = useState([]);

  // ─── UI feedback ─────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // ─── Draft save guard ─────────────────────────────────────────────────────
  // Prevents the auto-save effect from writing an empty draft before the
  // initial draft restore has run (which happens in the mount useEffect below).
  const draftRestoredRef = useRef(false);

  // ─── Mount: auth check + draft restore + data load ───────────────────────
  useEffect(() => {
    // 1. Auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login');
        return;
      }
      setUser(session.user);
      setAuthLoading(false);
    });

    // 2. Restore draft from localStorage before setting any defaults
    let hasDraftDate = false;
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.selectedCustomer) setSelectedCustomer(draft.selectedCustomer);
        if (draft.customerSearch)   setCustomerSearch(draft.customerSearch);
        if (draft.deliveryDate)     { setDeliveryDate(draft.deliveryDate); hasDraftDate = true; }
        if (draft.notes)            setNotes(draft.notes);
        if (draft.orderItems?.length > 0) {
          const valid = draft.orderItems.filter(
            item => item.quantity > 0 || (item.weight && item.weight.trim())
          );
          if (valid.length > 0) setOrderItems(valid);
        }
      }
    } catch {
      // malformed localStorage — ignore
    }
    draftRestoredRef.current = true;

    // 3. Default delivery date only when there's no saved draft date
    if (!hasDraftDate) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDeliveryDate(tomorrow.toISOString().split('T')[0]);
    }

    // 4. Load reference data
    loadCustomers();
    loadProducts();
    loadAllOrders();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Close customer dropdown on outside click ────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.customer-dropdown')) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // ─── Auto-save draft ─────────────────────────────────────────────────────
  // Saves form state to localStorage on every meaningful change so that a
  // page refresh (accidental pull-to-refresh on tablet) doesn't lose work.
  // Does NOT save while editing an existing order (to avoid overwriting a
  // clean draft with partial edit state).
  useEffect(() => {
    if (!draftRestoredRef.current) return;  // restore must run first
    if (editingOrder) return;               // editing mode — don't touch draft
    if (!selectedCustomer && orderItems.length === 0) return; // nothing to save

    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        selectedCustomer, customerSearch, deliveryDate, notes, orderItems
      }));
    } catch {
      // storage quota exceeded — silently skip
    }
  }, [selectedCustomer, customerSearch, deliveryDate, notes, orderItems, editingOrder]);

  // ─── Load customer order history when customer changes ───────────────────
  useEffect(() => {
    if (!selectedCustomer) {
      setCustomerOrders([]);
      setShowCustomerHistory(false);
      return;
    }
    loadCustomerOrders(selectedCustomer);
  }, [selectedCustomer]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Data loaders ────────────────────────────────────────────────────────
  const loadCustomers = async () => {
    try {
      const { data } = await supabase
        .from('customers')
        .select('*')
        .order('name');
      setCustomers(data || []);
    } catch {
      console.log('Error loading customers');
    }
  };

  const loadProducts = async () => {
    try {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('category, name');
      setProducts(data || []);
    } catch {
      console.log('Error loading products');
    }
  };

  const loadAllOrders = async () => {
    try {
      const { data } = await supabase
        .from('orders')
        .select(`
          *,
          customers (name, code),
          order_items (
            *,
            products (name, category, unit)
          )
        `)
        .order('created_at', { ascending: false });
      setAllOrders(data || []);
    } catch {
      console.log('Error loading orders');
    }
  };

  // Fetches the last 20 orders for the selected customer.
  // Uses * for order_items so the query works whether or not the weight
  // column migration has been run (explicit column lists fail with a
  // Supabase 42703 error when a column doesn't exist yet).
  const loadCustomerOrders = async (customerId) => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, order_number, created_at, delivery_date, status, total_items,
          order_items (
            *,
            products (name, category, unit)
          )
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error loading customer orders:', error.message, error.code);
        setCustomerOrders([]);
        return;
      }

      setCustomerOrders(data || []);
    } catch (err) {
      console.error('Unexpected error loading customer orders:', err);
      setCustomerOrders([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // ─── Customer actions ────────────────────────────────────────────────────
  const addNewCustomer = async () => {
    if (!newCustomer.name) {
      setMessage('❌ יש למלא את שם הלקוח');
      return;
    }
    try {
      const { data } = await supabase
        .from('customers')
        .insert([{
          name: newCustomer.name,
          code: newCustomer.code || null,
          phone: newCustomer.phone,
          address: newCustomer.address,
          contact_person: newCustomer.contact_person
        }])
        .select()
        .single();
      setCustomers([...customers, data]);
      setSelectedCustomer(data.id);
      setCustomerSearch(`${data.name}${data.code ? ` (${data.code})` : ''}`);
      setNewCustomer({ name: '', code: '', phone: '', address: '', contact_person: '' });
      setShowAddCustomer(false);
      setMessage(`✅ לקוח ${data.name} נוסף בהצלחה ונבחר!`);
    } catch {
      setMessage('❌ שגיאה בהוספת הלקוח');
    }
  };

  // ─── Clone order into draft ───────────────────────────────────────────────
  // Loads items from a past order into the form WITHOUT creating a DB record.
  // The agent can review and edit before submitting as a new order.
  const cloneOrder = (order) => {
    const items = (order.order_items || []).map(item => {
      const { weight, notes: itemNotes } = getItemWeightAndNotes(item);
      return {
        product_id: item.product_id,
        product_name: item.products?.name || '',
        category: item.products?.category || '',
        unit: item.products?.unit || 'יחידה',
        quantity: weight ? 0 : item.quantity,
        weight,
        notes: itemNotes
      };
    });
    setOrderItems(items);
    setNotes(order.notes || '');
    // always default to tomorrow, not the original delivery date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDeliveryDate(tomorrow.toISOString().split('T')[0]);
    setShowCustomerHistory(false);
    setMessage(`📋 פריטים הועתקו מהזמנה ${order.order_number} — עדכן ובדוק לפני שליחה`);
  };

  // ─── Edit existing order ──────────────────────────────────────────────────
  const loadOrderForEdit = (order) => {
    if (['בטיפול', 'נשלחה', 'הושלמה'].includes(order.status)) {
      setMessage('❌ לא ניתן לערוך הזמנה שכבר בטיפול במחסן');
      return;
    }
    setEditingOrder(order);
    setSelectedCustomer(order.customer_id);
    setDeliveryDate(order.delivery_date);
    setNotes(order.notes || '');

    const items = order.order_items.map(item => {
      const { weight, notes: itemNotes } = getItemWeightAndNotes(item);
      return {
        product_id: item.product_id,
        product_name: item.products.name,
        category: item.products.category,
        quantity: weight ? 0 : item.quantity,
        weight,
        notes: itemNotes,
        unit: item.products.unit
      };
    });

    setOrderItems(items);
    setShowOrdersList(false);
    setMessage(`📝 עורך הזמנה ${order.order_number} (סטטוס: ${order.status})`);
  };

  // ─── Product modal ────────────────────────────────────────────────────────
  const addProduct = (product) => {
    setSelectedProduct(product);
    setTempProduct({ quantity: 1, weight: '', notes: '' });
    setShowProductModal(true);
  };

  const confirmAddProduct = () => {
    const existingIndex = orderItems.findIndex(item => item.product_id === selectedProduct.id);
    if (existingIndex >= 0) {
      const updatedItems = [...orderItems];
      updatedItems[existingIndex] = {
        ...updatedItems[existingIndex],
        quantity: tempProduct.quantity,
        weight: tempProduct.weight,
        notes: tempProduct.notes
      };
      setOrderItems(updatedItems);
    } else {
      setOrderItems([...orderItems, {
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        category: selectedProduct.category,
        quantity: tempProduct.quantity,
        weight: tempProduct.weight,
        notes: tempProduct.notes,
        unit: selectedProduct.unit
      }]);
    }
    setShowProductModal(false);
    setSelectedProduct(null);
  };

  // ─── Inline quantity / field updates ─────────────────────────────────────
  const removeItem = (index) =>
    setOrderItems(prev => prev.filter((_, i) => i !== index));

  const updateQuantity = (index, quantity) => {
    setOrderItems(prev => {
      const item = prev[index];
      if (!item) return prev;
      if (quantity <= 0 && !(item.weight && item.weight.trim())) {
        return prev.filter((_, i) => i !== index);
      }
      return prev.map((it, i) =>
        i === index ? { ...it, quantity: Math.max(0, quantity), weight: quantity > 0 ? '' : it.weight } : it
      );
    });
  };

  const updateItemField = (index, field, value) => {
    const item = orderItems[index];
    if (!item) return;
    if (field === 'weight' && !(value && value.trim()) && item.quantity <= 0) {
      removeItem(index);
      return;
    }
    setOrderItems(orderItems.map((it, i) => {
      if (i !== index) return it;
      const updated = { ...it, [field]: value };
      if (field === 'weight' && value && value.trim()) updated.quantity = 0;
      if (field === 'quantity' && value > 0)           updated.weight = '';
      return updated;
    }));
  };

  // ─── Shared validation ────────────────────────────────────────────────────
  const validateForm = () => {
    if (!selectedCustomer || orderItems.length === 0) {
      setMessage('❌ יש למלא את כל השדות הנדרשים');
      return false;
    }
    const hasInvalidItems = orderItems.some(
      item => item.quantity <= 0 && (!item.weight || !item.weight.trim())
    );
    if (hasInvalidItems) {
      setMessage('❌ כל פריט חייב לכלול כמות או משקל');
      return false;
    }
    return true;
  };

  // ─── Build order_items rows for DB insert ─────────────────────────────────
  // Stores weight in the dedicated column (new format).
  // Notes field holds only the freeform comment — no more serialized weight string.
  const buildItemsPayload = (orderId) =>
    orderItems.map(item => ({
      order_id: orderId,
      product_id: item.product_id,
      quantity: item.quantity || 1,
      weight: item.weight ? parseFloat(item.weight) : null,
      notes: item.notes || ''
    }));

  // ─── Submit new order ─────────────────────────────────────────────────────
  const submitOrder = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      const orderNumber = 'ORD-' + Date.now();
      const { data: orderData } = await supabase
        .from('orders')
        .insert([{
          order_number: orderNumber,
          customer_id: selectedCustomer,
          delivery_date: deliveryDate,
          status: 'חדשה',
          notes: notes,
          total_items: orderItems.length,
          created_by: user?.id || null
        }])
        .select()
        .single();

      await supabase.from('order_items').insert(buildItemsPayload(orderData.id));

      // Clear draft only after confirmed success
      try { localStorage.removeItem(DRAFT_KEY); } catch {}

      setMessage(`🎉 הזמנה ${orderNumber} נשלחה בהצלחה למחסן!`);
      setSelectedCustomer('');
      setCustomerSearch('');
      setOrderItems([]);
      setNotes('');
      loadAllOrders();
      setTimeout(() => setMessage(''), 5000);
    } catch {
      setMessage('❌ שגיאה בשליחת ההזמנה');
    } finally {
      setLoading(false);
    }
  };

  // ─── Update existing order ────────────────────────────────────────────────
  const updateOrder = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      await supabase
        .from('orders')
        .update({
          customer_id: selectedCustomer,
          delivery_date: deliveryDate,
          notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingOrder.id);

      await supabase.from('order_items').delete().eq('order_id', editingOrder.id);
      await supabase.from('order_items').insert(buildItemsPayload(editingOrder.id));

      setMessage(`✅ הזמנה ${editingOrder.order_number} עודכנה בהצלחה!`);
      setEditingOrder(null);
      setSelectedCustomer('');
      setCustomerSearch('');
      setOrderItems([]);
      setNotes('');
      loadAllOrders();
    } catch {
      setMessage('❌ שגיאה בעדכון ההזמנה');
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setEditingOrder(null);
    setSelectedCustomer('');
    setCustomerSearch('');
    setOrderItems([]);
    setNotes('');
    setMessage('');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  // ─── Derived data ─────────────────────────────────────────────────────────
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const predefinedOrder = ['מוצרי הודו', 'מוצרי בקר', 'מוצרים', 'מוסדי', 'נקניקים', 'כבש'];
  const allCategories = [...new Set(products.map(p => p.category))];
  const categories = predefinedOrder.filter(cat => allCategories.includes(cat))
    .concat(allCategories.filter(cat => !predefinedOrder.includes(cat)));

  // ─── Auth loading guard ───────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🥩 מערכת הזמנות בשר
          </h1>
          <p className="text-gray-600">מערכת דיגיטלית לסוכן שטח</p>

          {/* User info + sign-out */}
          <div className="mt-2 flex justify-center items-center space-x-2 space-x-reverse text-sm text-gray-500">
            <span>{user?.email}</span>
            <button
              onClick={handleSignOut}
              className="text-red-500 hover:text-red-700 font-medium underline"
            >
              התנתק
            </button>
          </div>

          <div className="mt-4 flex justify-center space-x-4 space-x-reverse">
            <button
              onClick={() => setShowOrdersList(!showOrdersList)}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              📋 הזמנות קיימות
            </button>
            <button
              onClick={() => window.open('/warehouse', '_blank')}
              className="bg-purple-500 text-white px-6 py-2 rounded-lg hover:bg-purple-600 transition-colors font-medium"
            >
              🏭 דשבורד מחסן
            </button>
            {editingOrder && (
              <button
                onClick={cancelEdit}
                className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors font-medium"
              >
                ❌ בטל עריכה
              </button>
            )}
          </div>
        </div>

        {/* Feedback message */}
        {message && (
          <div className={`p-4 mb-6 rounded-lg border font-medium ${
            message.includes('🎉') || message.includes('✅') || message.includes('בהצלחה')
              ? 'bg-green-100 text-green-800 border-green-300'
              : message.includes('📝') || message.includes('📋')
              ? 'bg-blue-100 text-blue-800 border-blue-300'
              : 'bg-red-100 text-red-800 border-red-300'
          }`}>
            {message}
          </div>
        )}

        {/* Existing orders panel (edit mode) */}
        {showOrdersList && (
          <div className="bg-white p-6 rounded-lg shadow-lg mb-6 border">
            <h3 className="font-bold text-gray-800 mb-4 text-lg">הזמנות קיימות לעריכה</h3>
            <div className="max-h-96 overflow-y-auto space-y-3">
              {allOrders.length === 0 ? (
                <p className="text-gray-500 text-center py-8">אין הזמנות להצגה</p>
              ) : (
                allOrders.map(order => (
                  <div key={order.id} className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 space-x-reverse">
                        <span className="font-bold text-gray-800">#{order.order_number}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          order.status === 'חדשה'   ? 'bg-blue-100 text-blue-800' :
                          order.status === 'בטיפול' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'נשלחה'  ? 'bg-purple-100 text-purple-800' :
                          order.status === 'הושלמה' ? 'bg-green-100 text-green-800' :
                                                       'bg-red-100 text-red-800'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        <strong>{order.customers?.name}</strong> |{' '}
                        {new Date(order.delivery_date).toLocaleDateString('he-IL')} |{' '}
                        {order.order_items?.length || 0} פריטים
                      </p>
                    </div>
                    <button
                      onClick={() => loadOrderForEdit(order)}
                      disabled={order.status !== 'חדשה'}
                      className={`px-4 py-2 rounded font-medium transition-colors ${
                        order.status === 'חדשה'
                          ? 'bg-blue-500 text-white hover:bg-blue-600'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {order.status === 'חדשה' ? '✏️ ערוך' : '🔒 במחסן'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <form onSubmit={editingOrder ? updateOrder : submitOrder} className="space-y-6">

          {/* Customer selection */}
          <div className="bg-white p-6 rounded-lg shadow-lg border">
            <h3 className="font-bold text-gray-800 mb-4 text-lg">🏪 בחירת לקוח</h3>
            <div className="space-y-4">
              <div className="relative customer-dropdown">
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  placeholder="חפש לקוח..."
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none text-gray-800 bg-white font-medium"
                />
                {showCustomerDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {customers
                      .filter(c =>
                        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                        (c.code && c.code.toLowerCase().includes(customerSearch.toLowerCase()))
                      )
                      .map(customer => (
                        <div
                          key={customer.id}
                          onClick={() => {
                            setSelectedCustomer(customer.id);
                            setCustomerSearch(`${customer.name}${customer.code ? ` (${customer.code})` : ''}`);
                            setShowCustomerDropdown(false);
                          }}
                          className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <span className="text-gray-800">
                            {customer.name}{customer.code ? ` (${customer.code})` : ''}
                          </span>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowAddCustomer(!showAddCustomer)}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors font-medium"
              >
                ➕ הוסף לקוח חדש
              </button>
            </div>

            {/* Add customer form */}
            {showAddCustomer && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                <h4 className="font-bold text-gray-800 mb-3">הוספת לקוח חדש</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <input type="text" placeholder="שם הלקוח *" value={newCustomer.name}
                    onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                    className="border-2 border-gray-300 rounded px-3 py-2 focus:border-blue-500 focus:outline-none text-gray-800 bg-white font-medium" required />
                  <input type="text" placeholder="קוד לקוח (אופציונלי)" value={newCustomer.code}
                    onChange={(e) => setNewCustomer({...newCustomer, code: e.target.value})}
                    className="border-2 border-gray-300 rounded px-3 py-2 focus:border-blue-500 focus:outline-none text-gray-800 bg-white font-medium" />
                  <input type="text" placeholder="טלפון" value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                    className="border-2 border-gray-300 rounded px-3 py-2 focus:border-blue-500 focus:outline-none text-gray-800 bg-white font-medium" />
                  <input type="text" placeholder="כתובת" value={newCustomer.address}
                    onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                    className="border-2 border-gray-300 rounded px-3 py-2 focus:border-blue-500 focus:outline-none text-gray-800 bg-white font-medium" />
                </div>
                <div className="mt-4 flex space-x-2 space-x-reverse">
                  <button type="button" onClick={addNewCustomer}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors font-medium">
                    💾 שמור לקוח
                  </button>
                  <button type="button" onClick={() => setShowAddCustomer(false)}
                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors font-medium">
                    ביטול
                  </button>
                </div>
              </div>
            )}

            {/* Customer order history */}
            {selectedCustomer && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setShowCustomerHistory(!showCustomerHistory)}
                  className="flex items-center space-x-2 space-x-reverse text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  <span>{showCustomerHistory ? '▲' : '▼'}</span>
                  <span>
                    {loadingHistory
                      ? 'טוען היסטוריה...'
                      : `היסטוריית הזמנות (${customerOrders.length})`}
                  </span>
                </button>

                {showCustomerHistory && customerOrders.length > 0 && (
                  <div className="mt-3 border-2 border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                      <p className="text-xs text-gray-500 font-medium">
                        20 הזמנות אחרונות — לחץ &quot;שכפל&quot; לטעון פריטים לטופס
                      </p>
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
                      {customerOrders.map(order => (
                        <div key={order.id} className="flex items-center justify-between px-4 py-3 hover:bg-blue-50">
                          <div className="flex-1 text-sm">
                            <div className="flex items-center space-x-2 space-x-reverse">
                              <span className="font-bold text-gray-800">#{order.order_number}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                order.status === 'חדשה'   ? 'bg-blue-100 text-blue-800' :
                                order.status === 'בטיפול' ? 'bg-yellow-100 text-yellow-800' :
                                order.status === 'הושלמה' ? 'bg-green-100 text-green-800' :
                                                             'bg-gray-100 text-gray-800'
                              }`}>{order.status}</span>
                            </div>
                            <p className="text-gray-500 mt-0.5">
                              אספקה: {new Date(order.delivery_date).toLocaleDateString('he-IL')} |{' '}
                              {order.order_items?.length || 0} פריטים
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => cloneOrder(order)}
                            className="mr-3 bg-orange-500 text-white px-3 py-1.5 rounded-lg hover:bg-orange-600 transition-colors text-sm font-bold"
                          >
                            📋 שכפל
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {showCustomerHistory && customerOrders.length === 0 && !loadingHistory && (
                  <p className="mt-2 text-sm text-gray-400">אין היסטוריית הזמנות ללקוח זה</p>
                )}
              </div>
            )}
          </div>

          {/* Delivery date */}
          <div className="bg-white p-6 rounded-lg shadow-lg border">
            <h3 className="font-bold text-gray-800 mb-4 text-lg">📅 תאריך אספקה</h3>
            <input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none text-gray-800 bg-white font-medium"
              required
            />
          </div>

          {/* Product search + catalog */}
          <div className="bg-white p-6 rounded-lg shadow-lg border">
            <h3 className="font-bold text-gray-800 mb-4 text-lg">🔍 חיפוש וסינון מוצרים</h3>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="relative">
                <Search className="absolute right-3 top-3 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="חפש מוצר לפי שם..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 pr-12 focus:border-blue-500 focus:outline-none text-gray-800 bg-white font-medium"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none text-gray-800 bg-white font-medium"
              >
                <option value="">כל הקטגוריות</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div className="max-h-96 overflow-y-auto grid gap-2">
              {filteredProducts.map(product => (
                <div key={product.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-blue-50 transition-colors">
                  <div className="flex-1">
                    <span className="font-medium text-gray-800">{product.name}</span>
                    <div className="text-sm text-gray-600">
                      <span className="bg-blue-100 px-2 py-1 rounded mr-2 text-blue-800 font-medium">{product.category}</span>
                      <span className="text-gray-700">{product.unit || 'יחידה'}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => addProduct(product)}
                    className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 transition-colors font-medium"
                  >
                    ⚙️ הגדר כמות
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Order items */}
          {orderItems.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-lg border">
              <h3 className="font-bold text-gray-800 mb-4 text-lg">🛒 פריטי ההזמנה ({orderItems.length})</h3>
              <div className="space-y-4">
                {orderItems.map((item, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="font-bold text-gray-800">{item.product_name}</div>
                        <div className="text-sm text-blue-600 font-medium">{item.category}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-500 hover:text-red-700 font-medium"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">כמות</label>
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <button type="button"
                            onClick={() => updateQuantity(index, item.quantity - 1)}
                            className="w-8 h-8 bg-red-500 text-white rounded-full hover:bg-red-600 flex items-center justify-center font-bold">
                            <Minus size={16} />
                          </button>
                          <input type="number" value={item.quantity}
                            onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 0)}
                            className="w-16 text-center border-2 border-gray-300 rounded px-2 py-1 text-gray-800 bg-white font-bold"
                            min="0" />
                          <button type="button"
                            onClick={() => updateQuantity(index, item.quantity + 1)}
                            className="w-8 h-8 bg-green-500 text-white rounded-full hover:bg-green-600 flex items-center justify-center font-bold">
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">משקל</label>
                        <input type="text" value={item.weight || ''}
                          onChange={(e) => updateItemField(index, 'weight', e.target.value)}
                          placeholder='כמה ק"ג?'
                          className="w-full border-2 border-gray-300 rounded px-3 py-1 text-sm focus:border-blue-500 focus:outline-none text-gray-800 bg-white font-medium" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">הערות</label>
                        <input type="text" value={item.notes || ''}
                          onChange={(e) => updateItemField(index, 'notes', e.target.value)}
                          placeholder="הערות למוצר..."
                          className="w-full border-2 border-gray-300 rounded px-3 py-1 text-sm focus:border-blue-500 focus:outline-none text-gray-800 bg-white font-medium" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* General notes */}
          <div className="bg-white p-6 rounded-lg shadow-lg border">
            <h3 className="font-bold text-gray-800 mb-4 text-lg">📝 הערות נוספות</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="הערות כלליות להזמנה..."
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none text-gray-800 bg-white font-medium"
              rows="4"
            />
          </div>

          {/* Submit */}
          <div className="bg-white p-6 rounded-lg shadow-lg border">
            <button
              type="submit"
              disabled={
                loading || !selectedCustomer || orderItems.length === 0 ||
                orderItems.some(item => item.quantity <= 0 && (!item.weight || !item.weight.trim()))
              }
              className="w-full bg-green-500 text-white py-4 rounded-lg text-xl font-bold hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '⏳ מעדכן...' : editingOrder ? '💾 עדכן הזמנה' : '🚀 שליחת הזמנה'}
            </button>
          </div>
        </form>

        {/* Product quantity modal */}
        {showProductModal && selectedProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full border-4 border-gray-300">
              <div className="p-6 border-b-2 border-gray-200">
                <h3 className="text-xl font-bold text-gray-800">
                  הגדרת כמות — {selectedProduct.name}
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">כמות</label>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <button type="button"
                      onClick={() => {
                        const q = Math.max(0, tempProduct.quantity - 1);
                        setTempProduct({ ...tempProduct, quantity: q, weight: q > 0 ? '' : tempProduct.weight });
                      }}
                      className="w-8 h-8 bg-red-500 text-white rounded-full hover:bg-red-600 flex items-center justify-center font-bold">-</button>
                    <input type="number" value={tempProduct.quantity}
                      onChange={(e) => {
                        const q = parseInt(e.target.value) || 0;
                        setTempProduct({ ...tempProduct, quantity: q, weight: q > 0 ? '' : tempProduct.weight });
                      }}
                      className="w-20 text-center border-2 border-gray-300 rounded px-2 py-1 text-gray-800 bg-white font-bold"
                      min="0" />
                    <button type="button"
                      onClick={() => setTempProduct({ ...tempProduct, quantity: tempProduct.quantity + 1, weight: '' })}
                      className="w-8 h-8 bg-green-500 text-white rounded-full hover:bg-green-600 flex items-center justify-center font-bold">+</button>
                    <span className="text-sm text-gray-600 mr-2 font-medium">
                      {selectedProduct.unit === 'ק"ג' ? 'קר׳' : selectedProduct.unit}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">משקל</label>
                  <input type="text" value={tempProduct.weight}
                    onChange={(e) => setTempProduct({
                      ...tempProduct,
                      weight: e.target.value,
                      quantity: e.target.value && e.target.value.trim() ? 0 : tempProduct.quantity
                    })}
                    placeholder='כמה ק"ג?'
                    className="w-full border-2 border-gray-300 rounded px-3 py-2 focus:border-blue-500 focus:outline-none text-gray-800 bg-white font-medium" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">הערות</label>
                  <input type="text" value={tempProduct.notes}
                    onChange={(e) => setTempProduct({ ...tempProduct, notes: e.target.value })}
                    placeholder="הערות למוצר..."
                    className="w-full border-2 border-gray-300 rounded px-3 py-2 focus:border-blue-500 focus:outline-none text-gray-800 bg-white font-medium" />
                </div>
              </div>
              <div className="p-6 border-t-2 border-gray-200 flex space-x-3 space-x-reverse">
                <button onClick={confirmAddProduct}
                  className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors font-bold flex-1">
                  ✅ הוסף להזמנה
                </button>
                <button onClick={() => setShowProductModal(false)}
                  className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors font-bold">
                  ❌ ביטול
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
