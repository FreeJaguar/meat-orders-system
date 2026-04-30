'use client'
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Minus, Trash2 } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { getItemWeightAndNotes } from '@/lib/orderUtils';
import SplitLayout from '@/components/layout/SplitLayout';

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
    setOrderItems(prev => {
      const item = prev[index];
      if (!item) return prev;
      if (field === 'weight' && !(value && value.trim()) && item.quantity <= 0) {
        return prev.filter((_, i) => i !== index);
      }
      return prev.map((it, i) => {
        if (i !== index) return it;
        const updated = { ...it, [field]: value };
        if (field === 'weight' && value && value.trim()) updated.quantity = 0;
        if (field === 'quantity' && value > 0)           updated.weight = '';
        return updated;
      });
    });
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

  const clearItems = () => {
    setOrderItems([]);
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
  };

  const clearOrder = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setOrderItems([]);
    setSelectedCustomer('');
    setCustomerSearch('');
    setNotes('');
    setDeliveryDate(tomorrow.toISOString().split('T')[0]);
    setEditingOrder(null);
    setMessage('');
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
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
      <div className="h-dvh flex items-center justify-center bg-[var(--color-bg)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-accent)]"></div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="h-dvh overflow-hidden flex flex-col bg-[var(--color-bg)]">

      {/* ── Header ── */}
      <div className="flex-shrink-0 bg-[var(--color-surface)] border-b border-[var(--color-border)] px-6 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-[var(--color-text)]">
            🥩 מערכת הזמנות בשר
          </h1>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-[var(--color-text-secondary)]">{user?.email}</span>
            <button
              onClick={handleSignOut}
              className="text-[var(--color-danger)] hover:underline font-medium"
            >
              התנתק
            </button>
          </div>
        </div>
        <div className="flex gap-2 mt-2 flex-wrap">
          <button
            onClick={() => setShowOrdersList(!showOrdersList)}
            className="bg-[var(--color-accent)] text-white px-4 py-1.5 rounded text-sm font-medium hover:opacity-90 transition-opacity"
          >
            📋 הזמנות קיימות
          </button>
          <button
            onClick={() => window.open('/warehouse', '_blank')}
            className="border border-[var(--color-border-strong)] text-[var(--color-text-secondary)] px-4 py-1.5 rounded text-sm font-medium hover:bg-[var(--color-accent-light)] transition-colors"
          >
            🏭 דשבורד מחסן
          </button>
          {editingOrder && (
            <button
              onClick={cancelEdit}
              className="border border-[var(--color-danger)] text-[var(--color-danger)] px-4 py-1.5 rounded text-sm font-medium hover:bg-[#F8EAEA] transition-colors"
            >
              ❌ בטל עריכה
            </button>
          )}
        </div>
      </div>

      {/* ── Feedback message ── */}
      {message && (
        <div className={`flex-shrink-0 px-6 py-2.5 text-sm font-medium border-b ${
          message.includes('🎉') || message.includes('✅') || message.includes('בהצלחה')
            ? 'bg-[#E8F4EC] text-[#3D7A52] border-[#3D7A52]'
            : message.includes('📝') || message.includes('📋')
            ? 'bg-[#EAF0F8] text-[#2D5A8E] border-[#2D5A8E]'
            : 'bg-[#F8EAEA] text-[#A63D3D] border-[#A63D3D]'
        }`}>
          {message}
        </div>
      )}

      {/* ── Orders list panel (collapsible) ── */}
      {showOrdersList && (
        <div className="flex-shrink-0 bg-[var(--color-surface)] border-b border-[var(--color-border)] px-6 py-4 max-h-72 overflow-y-auto">
          <h3 className="font-semibold text-[var(--color-text)] mb-3">הזמנות קיימות לעריכה</h3>
          <div className="space-y-2">
            {allOrders.length === 0 ? (
              <p className="text-[var(--color-text-muted)] text-center py-4">אין הזמנות להצגה</p>
            ) : (
              allOrders.map(order => (
                <div key={order.id} className="flex justify-between items-center p-3 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-accent-light)] transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-[var(--color-text)]">#{order.order_number}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        order.status === 'חדשה'   ? 'bg-blue-100 text-blue-800' :
                        order.status === 'בטיפול' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'נשלחה'  ? 'bg-purple-100 text-purple-800' :
                        order.status === 'הושלמה' ? 'bg-green-100 text-green-800' :
                                                     'bg-red-100 text-red-800'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                      <strong>{order.customers?.name}</strong> |{' '}
                      {new Date(order.delivery_date).toLocaleDateString('he-IL')} |{' '}
                      {order.order_items?.length || 0} פריטים
                    </p>
                  </div>
                  <button
                    onClick={() => loadOrderForEdit(order)}
                    disabled={order.status !== 'חדשה'}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      order.status === 'חדשה'
                        ? 'bg-[var(--color-accent)] text-white hover:opacity-90'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
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

      {/* ── Split layout ── */}
      <form onSubmit={editingOrder ? updateOrder : submitOrder} className="flex-1 overflow-hidden flex flex-col">
        <SplitLayout
          leftPanel={
            <div className="p-4 space-y-4">

              {/* Customer selection */}
              <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-4">
                <h3 className="font-semibold text-[var(--color-text)] mb-3">🏪 בחירת לקוח</h3>
                <div className="space-y-3">
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
                      className="w-full border border-[var(--color-border)] rounded-lg px-4 py-2.5 focus:border-[var(--color-accent)] focus:outline-none text-[var(--color-text)] bg-[var(--color-surface)] placeholder-[var(--color-text-muted)]"
                    />
                    {showCustomerDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-[var(--color-surface)] border border-[var(--color-border-strong)] rounded-lg shadow-lg max-h-60 overflow-y-auto">
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
                              className="p-3 hover:bg-[var(--color-accent-light)] cursor-pointer border-b border-[var(--color-border)] last:border-b-0"
                            >
                              <span className="text-[var(--color-text)]">
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
                    className="border border-[var(--color-border-strong)] text-[var(--color-text-secondary)] px-3 py-1.5 rounded text-sm font-medium hover:bg-[var(--color-accent-light)] transition-colors"
                  >
                    ➕ הוסף לקוח חדש
                  </button>
                </div>

                {showAddCustomer && (
                  <div className="mt-4 p-3 bg-[var(--color-surface-alt)] rounded-lg border border-[var(--color-border)]">
                    <h4 className="font-semibold text-[var(--color-text)] mb-3 text-sm">הוספת לקוח חדש</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" placeholder="שם הלקוח *" value={newCustomer.name}
                        onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                        className="border border-[var(--color-border)] rounded px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none text-[var(--color-text)] bg-[var(--color-surface)]" required />
                      <input type="text" placeholder="קוד לקוח (אופציונלי)" value={newCustomer.code}
                        onChange={(e) => setNewCustomer({...newCustomer, code: e.target.value})}
                        className="border border-[var(--color-border)] rounded px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none text-[var(--color-text)] bg-[var(--color-surface)]" />
                      <input type="text" placeholder="טלפון" value={newCustomer.phone}
                        onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                        className="border border-[var(--color-border)] rounded px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none text-[var(--color-text)] bg-[var(--color-surface)]" />
                      <input type="text" placeholder="כתובת" value={newCustomer.address}
                        onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                        className="border border-[var(--color-border)] rounded px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none text-[var(--color-text)] bg-[var(--color-surface)]" />
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button type="button" onClick={addNewCustomer}
                        className="bg-[var(--color-accent)] text-white px-4 py-1.5 rounded text-sm font-medium hover:opacity-90 transition-opacity">
                        💾 שמור לקוח
                      </button>
                      <button type="button" onClick={() => setShowAddCustomer(false)}
                        className="border border-[var(--color-border-strong)] text-[var(--color-text-secondary)] px-4 py-1.5 rounded text-sm font-medium hover:bg-[var(--color-accent-light)] transition-colors">
                        ביטול
                      </button>
                    </div>
                  </div>
                )}

                {selectedCustomer && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => setShowCustomerHistory(!showCustomerHistory)}
                      className="flex items-center gap-2 text-sm font-medium text-[var(--color-accent)] hover:opacity-80"
                    >
                      <span>{showCustomerHistory ? '▲' : '▼'}</span>
                      <span>
                        {loadingHistory
                          ? 'טוען היסטוריה...'
                          : `היסטוריית הזמנות (${customerOrders.length})`}
                      </span>
                    </button>

                    {showCustomerHistory && customerOrders.length > 0 && (
                      <div className="mt-2 border border-[var(--color-border)] rounded-lg overflow-hidden">
                        <div className="bg-[var(--color-surface-alt)] px-4 py-2 border-b border-[var(--color-border)]">
                          <p className="text-xs text-[var(--color-text-muted)]">
                            20 הזמנות אחרונות — לחץ &quot;שכפל&quot; לטעון פריטים לטופס
                          </p>
                        </div>
                        <div className="max-h-64 overflow-y-auto divide-y divide-[var(--color-border)]">
                          {customerOrders.map(order => (
                            <div key={order.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-[var(--color-accent-light)]">
                              <div className="flex-1 text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-[var(--color-text)]">#{order.order_number}</span>
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                    order.status === 'חדשה'   ? 'bg-blue-100 text-blue-800' :
                                    order.status === 'בטיפול' ? 'bg-yellow-100 text-yellow-800' :
                                    order.status === 'הושלמה' ? 'bg-green-100 text-green-800' :
                                                                 'bg-gray-100 text-gray-800'
                                  }`}>{order.status}</span>
                                </div>
                                <p className="text-[var(--color-text-muted)] text-xs mt-0.5">
                                  אספקה: {new Date(order.delivery_date).toLocaleDateString('he-IL')} |{' '}
                                  {order.order_items?.length || 0} פריטים
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => cloneOrder(order)}
                                className="mr-2 bg-[var(--color-accent)] text-white px-3 py-1 rounded text-sm font-medium hover:opacity-90 transition-opacity"
                              >
                                📋 שכפל
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {showCustomerHistory && customerOrders.length === 0 && !loadingHistory && (
                      <p className="mt-2 text-sm text-[var(--color-text-muted)]">אין היסטוריית הזמנות ללקוח זה</p>
                    )}
                  </div>
                )}
              </div>

              {/* Delivery date */}
              <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-4">
                <h3 className="font-semibold text-[var(--color-text)] mb-3">📅 תאריך אספקה</h3>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full border border-[var(--color-border)] rounded-lg px-4 py-2.5 focus:border-[var(--color-accent)] focus:outline-none text-[var(--color-text)] bg-[var(--color-surface)]"
                  required
                />
              </div>

              {/* Product catalog */}
              <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-4">
                <h3 className="font-semibold text-[var(--color-text)] mb-3">🔍 חיפוש וסינון מוצרים</h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="relative">
                    <Search className="absolute right-3 top-2.5 text-[var(--color-text-muted)]" size={18} />
                    <input
                      type="text"
                      placeholder="חפש מוצר לפי שם..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full border border-[var(--color-border)] rounded-lg px-4 py-2.5 pr-10 focus:border-[var(--color-accent)] focus:outline-none text-[var(--color-text)] bg-[var(--color-surface)] placeholder-[var(--color-text-muted)]"
                    />
                  </div>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full border border-[var(--color-border)] rounded-lg px-4 py-2.5 focus:border-[var(--color-accent)] focus:outline-none text-[var(--color-text)] bg-[var(--color-surface)]"
                  >
                    <option value="">כל הקטגוריות</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  {filteredProducts.map(product => (
                    <div key={product.id} className="flex justify-between items-center p-3 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-accent-light)] transition-colors">
                      <div className="flex-1">
                        <span className="font-medium text-[var(--color-text)]">{product.name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="bg-[var(--color-accent-light)] text-[var(--color-accent)] px-2 py-0.5 rounded text-xs font-medium">{product.category}</span>
                          <span className="text-[var(--color-text-secondary)] text-xs">{product.unit || 'יחידה'}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => addProduct(product)}
                        className="bg-[var(--color-accent)] text-white px-3 py-1.5 rounded text-sm font-medium hover:opacity-90 transition-opacity"
                      >
                        ⚙️ הגדר כמות
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* General notes */}
              <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-4">
                <h3 className="font-semibold text-[var(--color-text)] mb-3">📝 הערות נוספות</h3>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="הערות כלליות להזמנה..."
                  className="w-full border border-[var(--color-border)] rounded-lg px-4 py-2.5 focus:border-[var(--color-accent)] focus:outline-none text-[var(--color-text)] bg-[var(--color-surface)] placeholder-[var(--color-text-muted)] resize-none"
                  rows="3"
                />
              </div>

            </div>
          }
          rightPanel={
            <div className="h-full flex flex-col">

              {/* Order items header */}
              <div className="flex-shrink-0 flex justify-between items-center px-4 py-3 border-b border-[var(--color-border)]">
                <h3 className="font-semibold text-[var(--color-text)] text-sm">
                  🛒 פריטי ההזמנה ({orderItems.length})
                </h3>
                {orderItems.length > 0 && (
                  <button
                    type="button"
                    onClick={clearItems}
                    className="text-xs text-[var(--color-danger)] border border-[var(--color-danger)] px-2.5 py-1 rounded hover:bg-[#F8EAEA] transition-colors"
                  >
                    נקה פריטים
                  </button>
                )}
              </div>

              {/* Scrollable order items */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {orderItems.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-[var(--color-text-muted)] text-sm text-center">
                      אין פריטים בהזמנה
                      <br />
                      <span className="text-xs">בחר מוצרים מהקטלוג</span>
                    </p>
                  </div>
                ) : (
                  orderItems.map((item, index) => (
                    <div key={item.product_id} className="p-3 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="font-semibold text-[var(--color-text)] text-sm">{item.product_name}</div>
                          <div className="text-xs text-[var(--color-text-secondary)]">{item.category}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-[var(--color-danger)] hover:opacity-70 mr-1"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">כמות</label>
                          <div className="flex items-center gap-1">
                            <button type="button"
                              onClick={() => updateQuantity(index, item.quantity - 1)}
                              className="w-6 h-6 bg-[var(--color-danger)] text-white rounded-full hover:opacity-80 flex items-center justify-center flex-shrink-0">
                              <Minus size={10} />
                            </button>
                            <input type="number" value={item.quantity}
                              onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 0)}
                              className="w-10 text-center border border-[var(--color-border)] rounded px-1 py-0.5 text-sm text-[var(--color-text)] bg-[var(--color-surface)] font-medium"
                              min="0" />
                            <button type="button"
                              onClick={() => updateQuantity(index, item.quantity + 1)}
                              className="w-6 h-6 bg-[var(--color-success)] text-white rounded-full hover:opacity-80 flex items-center justify-center flex-shrink-0">
                              <Plus size={10} />
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">משקל</label>
                          <input type="text" value={item.weight || ''}
                            onChange={(e) => updateItemField(index, 'weight', e.target.value)}
                            placeholder='ק"ג'
                            className="w-full border border-[var(--color-border)] rounded px-2 py-1 text-xs focus:border-[var(--color-accent)] focus:outline-none text-[var(--color-text)] bg-[var(--color-surface)]" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">הערות</label>
                          <input type="text" value={item.notes || ''}
                            onChange={(e) => updateItemField(index, 'notes', e.target.value)}
                            placeholder="הערות..."
                            className="w-full border border-[var(--color-border)] rounded px-2 py-1 text-xs focus:border-[var(--color-accent)] focus:outline-none text-[var(--color-text)] bg-[var(--color-surface)]" />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Fixed footer */}
              <div className="flex-shrink-0 border-t border-[var(--color-border-strong)] bg-[var(--color-surface-alt)] p-4 space-y-2">
                <button
                  type="submit"
                  disabled={
                    loading || !selectedCustomer || orderItems.length === 0 ||
                    orderItems.some(item => item.quantity <= 0 && (!item.weight || !item.weight.trim()))
                  }
                  className="w-full bg-[var(--color-accent)] text-white py-3 rounded-lg font-bold text-base hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity min-h-[48px]"
                >
                  {loading ? '⏳ מעדכן...' : editingOrder ? '💾 עדכן הזמנה' : '🚀 שליחת הזמנה'}
                </button>
                <button
                  type="button"
                  onClick={clearOrder}
                  className="w-full border border-[var(--color-danger)] text-[var(--color-danger)] py-2 rounded-lg font-medium hover:bg-[#F8EAEA] transition-colors text-sm"
                >
                  🗑️ נקה הזמנה
                </button>
              </div>

            </div>
          }
        />
      </form>

      {/* ── Product quantity modal ── */}
      {showProductModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--color-surface)] rounded-lg max-w-md w-full border border-[var(--color-border-strong)]">
            <div className="p-5 border-b border-[var(--color-border)]">
              <h3 className="text-lg font-semibold text-[var(--color-text)]">
                הגדרת כמות — {selectedProduct.name}
              </h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">כמות</label>
                <div className="flex items-center gap-2">
                  <button type="button"
                    onClick={() => {
                      const q = Math.max(0, tempProduct.quantity - 1);
                      setTempProduct({ ...tempProduct, quantity: q, weight: q > 0 ? '' : tempProduct.weight });
                    }}
                    className="w-8 h-8 bg-[var(--color-danger)] text-white rounded-full hover:opacity-80 flex items-center justify-center font-bold">-</button>
                  <input type="number" value={tempProduct.quantity}
                    onChange={(e) => {
                      const q = parseInt(e.target.value) || 0;
                      setTempProduct({ ...tempProduct, quantity: q, weight: q > 0 ? '' : tempProduct.weight });
                    }}
                    className="w-20 text-center border border-[var(--color-border)] rounded px-2 py-1.5 text-[var(--color-text)] bg-[var(--color-surface)] font-medium"
                    min="0" />
                  <button type="button"
                    onClick={() => setTempProduct({ ...tempProduct, quantity: tempProduct.quantity + 1, weight: '' })}
                    className="w-8 h-8 bg-[var(--color-success)] text-white rounded-full hover:opacity-80 flex items-center justify-center font-bold">+</button>
                  <span className="text-sm text-[var(--color-text-secondary)]">
                    {selectedProduct.unit === 'ק"ג' ? 'קר׳' : selectedProduct.unit}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">משקל</label>
                <input type="text" value={tempProduct.weight}
                  onChange={(e) => setTempProduct({
                    ...tempProduct,
                    weight: e.target.value,
                    quantity: e.target.value && e.target.value.trim() ? 0 : tempProduct.quantity
                  })}
                  placeholder='כמה ק"ג?'
                  className="w-full border border-[var(--color-border)] rounded px-3 py-2 focus:border-[var(--color-accent)] focus:outline-none text-[var(--color-text)] bg-[var(--color-surface)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">הערות</label>
                <input type="text" value={tempProduct.notes}
                  onChange={(e) => setTempProduct({ ...tempProduct, notes: e.target.value })}
                  placeholder="הערות למוצר..."
                  className="w-full border border-[var(--color-border)] rounded px-3 py-2 focus:border-[var(--color-accent)] focus:outline-none text-[var(--color-text)] bg-[var(--color-surface)]" />
              </div>
            </div>
            <div className="p-5 border-t border-[var(--color-border)] flex gap-3">
              <button onClick={confirmAddProduct}
                className="bg-[var(--color-accent)] text-white px-6 py-2.5 rounded-lg hover:opacity-90 transition-opacity font-bold flex-1">
                ✅ הוסף להזמנה
              </button>
              <button onClick={() => setShowProductModal(false)}
                className="border border-[var(--color-border-strong)] text-[var(--color-text-secondary)] px-6 py-2.5 rounded-lg hover:bg-[var(--color-accent-light)] transition-colors font-medium">
                ❌ ביטול
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
