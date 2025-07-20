'use client'
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Search, Plus, Minus, Trash2 } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function OrderForm() {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [orderItems, setOrderItems] = useState([]);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    code: '',
    phone: '',
    address: '',
    contact_person: ''
  });
  const [editingOrder, setEditingOrder] = useState(null);
  const [showOrdersList, setShowOrdersList] = useState(false);
  const [allOrders, setAllOrders] = useState([]);

  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [tempProduct, setTempProduct] = useState({
    quantity: 1,
    weight: '',
    notes: ''
  });
  useEffect(() => {
    loadCustomers();
    loadProducts();
    loadAllOrders();
    // הגדרת תאריך ברירת מחדל למחר
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDeliveryDate(tomorrow.toISOString().split('T')[0]);
  }, []);

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
      setNewCustomer({ name: '', code: '', phone: '', address: '', contact_person: '' });
      setShowAddCustomer(false);
      setMessage(`✅ לקוח ${data.name} נוסף בהצלחה ונבחר!`);
      
    } catch {
      setMessage('❌ שגיאה בהוספת הלקוח');
    }
  };

  const loadOrderForEdit = (order) => {
    // בדיקה אם ההזמנה בטיפול במחסן
    if (order.status === 'בטיפול' || order.status === 'נשלחה' || order.status === 'הושלמה') {
      setMessage('❌ לא ניתן לערוך הזמנה שכבר בטיפול במחסן');
      return;
    }

    setEditingOrder(order);
    setSelectedCustomer(order.customer_id);
    setDeliveryDate(order.delivery_date);
    setNotes(order.notes || '');
    
    const items = order.order_items.map(item => {
      const noteParts = item.notes ? item.notes.split(' | ') : ['', ''];
      const weight = noteParts[0]?.replace('משקל: ', '') || '';
      const notes = noteParts[1] || '';
      
      return {
        product_id: item.product_id,
        product_name: item.products.name,
        category: item.products.category,
        quantity: item.quantity,
        weight: weight,
        notes: notes,
        unit: item.products.unit
      };
    });
    
    setOrderItems(items);
    setShowOrdersList(false);
    setMessage(`📝 עורך הזמנה ${order.order_number} (סטטוס: ${order.status})`);
  };

  const addProduct = (product) => {
    setSelectedProduct(product);
    setTempProduct({
    quantity: 1,
    weight: '',
    notes: ''
    });
    setShowProductModal(true);
  };
  const confirmAddProduct = () => {
  const existingIndex = orderItems.findIndex(item => item.product_id === selectedProduct.id);
  
  if (existingIndex >= 0) {
    // עדכן כמות קיימת
    updateQuantity(existingIndex, orderItems[existingIndex].quantity + tempProduct.quantity);
  } else {
    // הוסף פריט חדש
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

  const updateQuantity = (index, quantity) => {
    if (quantity <= 0) {
      setOrderItems(orderItems.filter((_, i) => i !== index));
    } else {
      setOrderItems(orderItems.map((item, i) => 
        i === index ? { ...item, quantity } : item
      ));
    }
  };

  const updateItemField = (index, field, value) => {
    setOrderItems(orderItems.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const submitOrder = async (e) => {
    e.preventDefault();
    
    if (!selectedCustomer || orderItems.length === 0) {
      setMessage('❌ יש למלא את כל השדות הנדרשים');
      return;
    }

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
          total_items: orderItems.reduce((sum, item) => sum + item.quantity, 0)
        }])
        .select()
        .single();

      const orderItemsData = orderItems.map(item => ({
        order_id: orderData.id,
        product_id: item.product_id,
        quantity: item.quantity,
        notes: `${item.weight ? `משקל: ${item.weight} | ` : ''}${item.notes || ''}`
      }));

      await supabase
        .from('order_items')
        .insert(orderItemsData);

      setMessage(`🎉 הזמנה ${orderNumber} נשלחה בהצלחה למחסן!`);
      
      // איפוס הטופס
      setSelectedCustomer('');
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

  const updateOrder = async (e) => {
    e.preventDefault();
    
    if (!selectedCustomer || orderItems.length === 0) {
      setMessage('❌ יש למלא את כל השדות הנדרשים');
      return;
    }

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

      await supabase
        .from('order_items')
        .delete()
        .eq('order_id', editingOrder.id);

      const orderItemsData = orderItems.map(item => ({
        order_id: editingOrder.id,
        product_id: item.product_id,
        quantity: item.quantity,
        notes: `${item.weight ? `משקל: ${item.weight} | ` : ''}${item.notes || ''}`
      }));

      await supabase
        .from('order_items')
        .insert(orderItemsData);

      setMessage(`✅ הזמנה ${editingOrder.order_number} עודכנה בהצלחה!`);
      
      setEditingOrder(null);
      setSelectedCustomer('');
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
    setOrderItems([]);
    setNotes('');
    setMessage('');
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(products.map(p => p.category))];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🥩 מערכת הזמנות בשר
          </h1>
          <p className="text-gray-600">מערכת דיגיטלית לסוכן שטח</p>
          
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

        {message && (
          <div className={`p-4 mb-6 rounded-lg border font-medium ${
            message.includes('🎉') || message.includes('✅') || message.includes('בהצלחה') 
              ? 'bg-green-100 text-green-800 border-green-300' 
              : message.includes('📝')
              ? 'bg-blue-100 text-blue-800 border-blue-300'
              : 'bg-red-100 text-red-800 border-red-300'
            }`}>
            {message}
          </div>
        )}

        {/* רשימת הזמנות קיימות */}
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
                          order.status === 'חדשה' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'בטיפול' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'נשלחה' ? 'bg-purple-100 text-purple-800' :
                          order.status === 'הושלמה' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        <strong>{order.customers?.name}</strong> | 
                        {new Date(order.delivery_date).toLocaleDateString('he-IL')} | 
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
          
          {/* בחירת לקוח */}
          <div className="bg-white p-6 rounded-lg shadow-lg border">
            <h3 className="font-bold text-gray-800 mb-4 text-lg">🏪 בחירת לקוח</h3>
            <div className="space-y-4">
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none text-gray-800 bg-white font-medium"
                required
              >
                <option value="" className="text-gray-500">בחר לקוח...</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id} className="text-gray-800">
                    {customer.name} {customer.code ? `(${customer.code})` : ''}
                  </option>
                ))}
              </select>
              
              <button
                type="button"
                onClick={() => setShowAddCustomer(!showAddCustomer)}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors font-medium"
              >
                ➕ הוסף לקוח חדש
              </button>
            </div>

            {/* הוספת לקוח חדש */}
            {showAddCustomer && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                <h4 className="font-bold text-gray-800 mb-3">הוספת לקוח חדש</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="שם הלקוח *"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                    className="border-2 border-gray-300 rounded px-3 py-2 focus:border-blue-500 focus:outline-none text-gray-800 bg-white font-medium"
                    required
                  />
                  <input
                    type="text"
                    placeholder="קוד לקוח (אופציונלי)"
                    value={newCustomer.code}
                    onChange={(e) => setNewCustomer({...newCustomer, code: e.target.value})}
                    className="border-2 border-gray-300 rounded px-3 py-2 focus:border-blue-500 focus:outline-none text-gray-800 bg-white font-medium"
                  />
                  <input
                    type="text"
                    placeholder="טלפון"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                    className="border-2 border-gray-300 rounded px-3 py-2 focus:border-blue-500 focus:outline-none text-gray-800 bg-white font-medium"
                  />
                  <input
                    type="text"
                    placeholder="כתובת"
                    value={newCustomer.address}
                    onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                    className="border-2 border-gray-300 rounded px-3 py-2 focus:border-blue-500 focus:outline-none text-gray-800 bg-white font-medium"
                  />
                </div>
                <div className="mt-4 flex space-x-2 space-x-reverse">
                  <button
                    type="button"
                    onClick={addNewCustomer}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors font-medium"
                  >
                    💾 שמור לקוח
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddCustomer(false)}
                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors font-medium"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* תאריך אספקה */}
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

          {/* חיפוש וסינון מוצרים */}
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
                <option value="" className="text-gray-500">כל הקטגוריות</option>
                {categories.map(category => (
                  <option key={category} value={category} className="text-gray-800">{category}</option>
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

          {/* פריטי הזמנה */}
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
                        onClick={() => updateQuantity(index, 0)}
                        className="text-red-500 hover:text-red-700 font-medium"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">כמות</label>
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <button
                            type="button"
                            onClick={() => updateQuantity(index, item.quantity - 1)}
                            className="w-8 h-8 bg-red-500 text-white rounded-full hover:bg-red-600 flex items-center justify-center font-bold"
                          >
                            <Minus size={16} />
                          </button>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 0)}
                            className="w-16 text-center border-2 border-gray-300 rounded px-2 py-1 text-gray-800 bg-white font-bold"
                            min="1"
                          />
                          <button
                            type="button"
                            onClick={() => updateQuantity(index, item.quantity + 1)}
                            className="w-8 h-8 bg-green-500 text-white rounded-full hover:bg-green-600 flex items-center justify-center font-bold"
                          >
                            <Plus size={16} />
                          </button>
                          <span className="text-sm text-gray-600 mr-2 font-medium">{item.unit}</span>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">משקל (אופציונלי)</label>
                        <input
                          type="text"
                          value={item.weight || ''}
                          onChange={(e) => updateItemField(index, 'weight', e.target.value)}
                          placeholder="כמה ק״ג?"
                          className="w-full border-2 border-gray-300 rounded px-3 py-1 text-sm focus:border-blue-500 focus:outline-none text-gray-800 bg-white font-medium"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">הערות (אופציונלי)</label>
                        <input
                          type="text"
                          value={item.notes || ''}
                          onChange={(e) => updateItemField(index, 'notes', e.target.value)}
                          placeholder="הערות למוצר..."
                          className="w-full border-2 border-gray-300 rounded px-3 py-1 text-sm focus:border-blue-500 focus:outline-none text-gray-800 bg-white font-medium"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* הערות נוספות */}
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

          {/* כפתור שליחה */}
          <div className="bg-white p-6 rounded-lg shadow-lg border">
            <div className="flex space-x-4 space-x-reverse">
              <button
                type="submit"
                disabled={loading || !selectedCustomer || orderItems.length === 0}
                className="flex-1 bg-green-500 text-white py-4 rounded-lg text-xl font-bold hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '⏳ מעדכן...' : editingOrder ? '💾 עדכן הזמנה' : '🚀 שליחת הזמנה'}
              </button>
            </div>
          </div>
        </form>
        {/* Modal להגדרת כמות מוצר */}
        {showProductModal && selectedProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full border-4 border-gray-300">
              <div className="p-6 border-b-2 border-gray-200">
                <h3 className="text-xl font-bold text-gray-800">
                  הגדרת כמות - {selectedProduct.name}
                </h3>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">כמות</label>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <button
                      type="button"
                      onClick={() => setTempProduct({...tempProduct, quantity: Math.max(1, tempProduct.quantity - 1)})}
                      className="w-8 h-8 bg-red-500 text-white rounded-full hover:bg-red-600 flex items-center justify-center font-bold"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={tempProduct.quantity}
                      onChange={(e) => setTempProduct({...tempProduct, quantity: parseInt(e.target.value) || 1})}
                      className="w-20 text-center border-2 border-gray-300 rounded px-2 py-1 text-gray-800 bg-white font-bold"
                      min="1"
                    />
                    <button
                      type="button"
                      onClick={() => setTempProduct({...tempProduct, quantity: tempProduct.quantity + 1})}
                      className="w-8 h-8 bg-green-500 text-white rounded-full hover:bg-green-600 flex items-center justify-center font-bold"
                    >
                      +
                    </button>
                    <span className="text-sm text-gray-600 mr-2 font-medium">{selectedProduct.unit}</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">משקל (אופציונלי)</label>
                  <input
                    type="text"
                    value={tempProduct.weight}
                    onChange={(e) => setTempProduct({...tempProduct, weight: e.target.value})}
                    placeholder="כמה ק״ג?"
                    className="w-full border-2 border-gray-300 rounded px-3 py-2 focus:border-blue-500 focus:outline-none text-gray-800 bg-white font-medium"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">הערות (אופציונלי)</label>
                  <input
                    type="text"
                    value={tempProduct.notes}
                    onChange={(e) => setTempProduct({...tempProduct, notes: e.target.value})}
                    placeholder="הערות למוצר..."
                    className="w-full border-2 border-gray-300 rounded px-3 py-2 focus:border-blue-500 focus:outline-none text-gray-800 bg-white font-medium"
                  />
                </div>
              </div>

              <div className="p-6 border-t-2 border-gray-200 flex space-x-3 space-x-reverse">
                <button
                  onClick={confirmAddProduct}
                  className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors font-bold flex-1"
                >
                  ✅ הוסף להזמנה
                </button>
                
                <button
                  onClick={() => setShowProductModal(false)}
                  className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors font-bold"
                >
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
