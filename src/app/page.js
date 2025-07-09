'use client'
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Search, Plus, Minus, ShoppingCart, Calendar, User, Package } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// הוסף את השורות האלה לבדיקה:
console.log('🔍 SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('🔍 SUPABASE_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'KEY EXISTS' : 'KEY MISSING');

export default function HomePage() {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [orderItems, setOrderItems] = useState([]);
  const [notes, setNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
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

  // טעינת נתונים בטעינת הקומפוננטה
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
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error loading customers:', error);
      setMessage('שגיאה בטעינת לקוחות');
    } else {
      setCustomers(data || []);
    }
  };

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('category, name');
    
    if (error) {
      console.error('Error loading products:', error);
      setMessage('שגיאה בטעינת מוצרים');
    } else {
      setProducts(data || []);
    }
  };

  // קיבוץ מוצרים לפי קטגוריה
  const productsByCategory = products.reduce((acc, product) => {
    if (!acc[product.category]) {
      acc[product.category] = [];
    }
    acc[product.category].push(product);
    return acc;
  }, {});

  const categories = Object.keys(productsByCategory);

  // סינון מוצרים לפי חיפוש וקטגוריה
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToOrder = (product) => {
    const existingItem = orderItems.find(item => item.product_id === product.id);
    
    if (existingItem) {
      setOrderItems(orderItems.map(item =>
        item.product_id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setOrderItems([...orderItems, {
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

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      setOrderItems(orderItems.filter(item => item.product_id !== productId));
    } else {
      setOrderItems(orderItems.map(item =>
        item.product_id === productId
          ? { ...item, quantity }
          : item
      ));
    }
  };

  const updateItemField = (productId, field, value) => {
    setOrderItems(orderItems.map(item =>
      item.product_id === productId
        ? { ...item, [field]: value }
        : item
    ));
  };

  const getTotalItems = () => {
    return orderItems.reduce((total, item) => total + item.quantity, 0);
  };

  const submitOrder = async (e) => {
    e.preventDefault();
    
    if (!selectedCustomer) {
      setMessage('יש לבחור לקוח');
      return;
    }
    
    if (orderItems.length === 0) {
      setMessage('יש להוסיף לפחות מוצר אחד להזמנה');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // יצירת מספר הזמנה ייחודי
      const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // יצירת ההזמנה
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: selectedCustomer,
          order_number: orderNumber,
          delivery_date: deliveryDate,
          notes: notes,
          status: 'חדשה'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // הוספת פריטי ההזמנה עם כל הפרטים
      const orderItemsData = orderItems.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        notes: `${item.weight ? `משקל: ${item.weight} | ` : ''}${item.notes || ''}`
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsData);

      if (itemsError) throw itemsError;

      // הודעת הצלחה
      const customerName = customers.find(c => c.id == selectedCustomer)?.name || 'לקוח';
      setMessage(`🎉 הזמנה ${orderNumber} נשלחה בהצלחה ללקוח ${customerName}!`);
      
      // איפוס הטופס
      setSelectedCustomer('');
      setOrderItems([]);
      setNotes('');
      setSearchTerm('');
      setSelectedCategory('');
      
    } catch (error) {
      console.error('Error submitting order:', error);
      setMessage('❌ שגיאה בשליחת ההזמנה: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const clearOrder = () => {
    setOrderItems([]);
    setNotes('');
    setSearchTerm('');
    setSelectedCategory('');
    setMessage('');
  };

  const addNewCustomer = async () => {
    if (!newCustomer.name) {
      setMessage('יש למלא את שם הלקוח');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([{
          name: newCustomer.name,
          code: newCustomer.code || null, // קוד אופציונלי
          phone: newCustomer.phone,
          address: newCustomer.address,
          contact_person: newCustomer.contact_person
        }])
        .select()
        .single();

      if (error) throw error;

      // הוסף את הלקוח החדש לרשימה
      setCustomers([...customers, data]);
      
      // בחר את הלקוח החדש אוטומטית
      setSelectedCustomer(data.id);
      
      // איפוס הטופס ובסגירת החלון
      setNewCustomer({ name: '', code: '', phone: '', address: '', contact_person: '' });
      setShowAddCustomer(false);
      setMessage(`✅ לקוח ${data.name} נוסף בהצלחה ונבחר!`);
      
    } catch (error) {
      console.error('Error adding customer:', error);
      setMessage('❌ שגיאה בהוספת הלקוח: ' + error.message);
    }
  };

  const loadAllOrders = async () => {
    try {
      const { data, error } = await supabase
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

      if (error) throw error;
      setAllOrders(data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };

  const loadOrderForEdit = (order) => {
    setEditingOrder(order);
    setSelectedCustomer(order.customer_id);
    setDeliveryDate(order.delivery_date);
    setNotes(order.notes || '');
    
    // טעינת פריטי ההזמנה
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
    setMessage(`📝 עורך הזמנה ${order.order_number}`);
  };

  const updateOrder = async (e) => {
    e.preventDefault();
    
    if (!selectedCustomer || orderItems.length === 0) {
      setMessage('יש למלא את כל השדות הנדרשים');
      return;
    }

    setLoading(true);
    
    try {
      // עדכון פרטי ההזמנה
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          customer_id: selectedCustomer,
          delivery_date: deliveryDate,
          notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingOrder.id);

      if (orderError) throw orderError;

      // מחיקת פריטי ההזמנה הישנים
      const { error: deleteError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', editingOrder.id);

      if (deleteError) throw deleteError;

      // הוספת פריטי ההזמנה החדשים
      const orderItemsData = orderItems.map(item => ({
        order_id: editingOrder.id,
        product_id: item.product_id,
        quantity: item.quantity,
        notes: `${item.weight ? `משקל: ${item.weight} | ` : ''}${item.notes || ''}`
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsData);

      if (itemsError) throw itemsError;

      setMessage(`✅ הזמנה ${editingOrder.order_number} עודכנה בהצלחה!`);
      
      // איפוס מצב עריכה
      setEditingOrder(null);
      setSelectedCustomer('');
      setOrderItems([]);
      setNotes('');
      loadAllOrders();
      
    } catch (error) {
      console.error('Error updating order:', error);
      setMessage('❌ שגיאה בעדכון ההזמנה: ' + error.message);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4">
      <div className="max-w-4xl mx-auto">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🥩 מערכת הזמנות בשר
          </h1>
          <p className="text-gray-600">מערכת דיגיטלית לסוכן שטח</p>
          
          <div className="mt-4 flex justify-center space-x-4 space-x-reverse">
            <button
              onClick={() => setShowOrdersList(!showOrdersList)}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              📋 הזמנות קיימות
            </button>
            {editingOrder && (
              <button
                onClick={cancelEdit}
                className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                ❌ בטל עריכה
              </button>
            )}
          </div>
        </div>

        {message && (
          <div className={`p-4 mb-6 rounded-lg border ${
            message.includes('🎉') || message.includes('✅') || message.includes('בהצלחה') 
              ? 'bg-green-100 text-green-700 border-green-300' 
              : message.includes('📝')
              ? 'bg-blue-100 text-blue-700 border-blue-300'
              : 'bg-red-100 text-red-700 border-red-300'
          }`}>
            {message}
          </div>
        )}

        {/* רשימת הזמנות קיימות */}
        {showOrdersList && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h3 className="font-bold text-gray-800 mb-4">הזמנות קיימות לעריכה</h3>
            <div className="max-h-96 overflow-y-auto space-y-3">
              {allOrders.length === 0 ? (
                <p className="text-gray-500 text-center py-8">אין הזמנות להצגה</p>
              ) : (
                allOrders.map(order => (
                  <div key={order.id} className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 space-x-reverse">
                        <span className="font-medium">#{order.order_number}</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          order.status === 'חדשה' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'בטיפול' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'נשלחה' ? 'bg-purple-100 text-purple-800' :
                          order.status === 'הושלמה' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {order.customers?.name} | 
                        {new Date(order.delivery_date).toLocaleDateString('he-IL')} | 
                        {order.order_items?.length || 0} פריטים
                      </p>
                    </div>
                    <button
                      onClick={() => loadOrderForEdit(order)}
                      className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                    >
                      ✏️ ערוך
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <form onSubmit={editingOrder ? updateOrder : submitOrder} className="space-y-6">
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <label className="flex items-center text-lg font-medium mb-4 text-gray-700">
                <User className="ml-2" size={20} />
                בחירת לקוח *
              </label>
              
              <div className="space-y-3">
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="w-full p-4 border-2 rounded-lg text-lg focus:border-blue-500 focus:outline-none"
                  required
                >
                  <option value="">🏪 בחר לקוח...</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} {customer.code ? `(${customer.code})` : ''}
                    </option>
                  ))}
                </select>
                
                <button
                  type="button"
                  onClick={() => setShowAddCustomer(!showAddCustomer)}
                  className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                >
                  ➕ הוסף לקוח חדש
                </button>
              </div>

              {/* טופס הוספת לקוח */}
              {showAddCustomer && (
                <div className="mt-4 p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                  <h4 className="font-bold text-gray-800 mb-3">פרטי לקוח חדש</h4>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="שם הלקוח *"
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                      className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                      required
                    />
                    <input
                      type="text"
                      placeholder="קוד לקוח (אופציונלי)"
                      value={newCustomer.code}
                      onChange={(e) => setNewCustomer({...newCustomer, code: e.target.value})}
                      className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="טלפון"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                      className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="כתובת"
                      value={newCustomer.address}
                      onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                      className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="איש קשר"
                      value={newCustomer.contact_person}
                      onChange={(e) => setNewCustomer({...newCustomer, contact_person: e.target.value})}
                      className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                    />
                    <div className="flex space-x-2 space-x-reverse">
                      <button
                        type="button"
                        onClick={addNewCustomer}
                        className="flex-1 bg-green-500 text-white py-2 rounded hover:bg-green-600 text-sm font-medium"
                      >
                        ✅ הוסף לקוח
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddCustomer(false);
                          setNewCustomer({ name: '', code: '', phone: '', address: '', contact_person: '' });
                        }}
                        className="px-4 bg-gray-500 text-white py-2 rounded hover:bg-gray-600 text-sm font-medium"
                      >
                        ביטול
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <label className="flex items-center text-lg font-medium mb-4 text-gray-700">
                <Calendar className="ml-2" size={20} />
                תאריך אספקה *
              </label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full p-4 border-2 rounded-lg text-lg focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <label className="flex items-center text-lg font-medium mb-4 text-gray-700">
              <Search className="ml-2" size={20} />
              חיפוש וסינון מוצרים
            </label>
            
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                placeholder="🔍 חפש מוצר לפי שם או קטגוריה..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-3 border-2 rounded-lg text-lg focus:border-blue-500 focus:outline-none"
              />
              
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full p-3 border-2 rounded-lg text-lg focus:border-blue-500 focus:outline-none"
              >
                <option value="">🍖 כל הקטגוריות</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div className="max-h-80 overflow-y-auto border rounded-lg">
              {filteredProducts.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  לא נמצאו מוצרים בחיפוש זה
                </div>
              ) : (
                <div className="space-y-2 p-4">
                  {filteredProducts.map(product => (
                    <div key={product.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex-1">
                        <span className="font-medium text-gray-800">{product.name}</span>
                        <div className="text-sm text-gray-500">
                          <span className="bg-blue-100 px-2 py-1 rounded mr-2">{product.category}</span>
                          <span className="text-gray-600">{product.unit || 'יחידה'}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => addToOrder(product)}
                        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center"
                      >
                        <Plus size={16} className="ml-1" />
                        הוסף
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {orderItems.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-md border-2 border-green-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="flex items-center text-xl font-bold text-gray-800">
                  <ShoppingCart className="ml-2" size={24} />
                  סיכום הזמנה ({getTotalItems()} יחידות, {orderItems.length} פריטים)
                </h3>
                <button
                  type="button"
                  onClick={clearOrder}
                  className="text-red-500 hover:text-red-700 text-sm font-medium"
                >
                  נקה הזמנה
                </button>
              </div>
              
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {orderItems.map(item => (
                  <div key={item.product_id} className="p-4 bg-gray-50 rounded-lg border">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="font-medium text-gray-800">{item.product_name}</div>
                        <div className="text-sm text-gray-500">{item.category}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product_id, 0)}
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
                            type="button"
                            onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                            className="w-8 h-8 bg-red-500 text-white rounded-full hover:bg-red-600 flex items-center justify-center"
                          >
                            <Minus size={16} />
                          </button>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.product_id, parseInt(e.target.value) || 0)}
                            className="w-16 text-center border rounded px-2 py-1"
                            min="1"
                          />
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
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
                          onChange={(e) => updateItemField(item.product_id, 'weight', e.target.value)}
                          placeholder="כמה ק״ג?"
                          className="w-full border rounded px-3 py-1 text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">הערות</label>
                        <input
                          type="text"
                          value={item.notes || ''}
                          onChange={(e) => updateItemField(item.product_id, 'notes', e.target.value)}
                          placeholder="הערות למוצר..."
                          className="w-full border rounded px-3 py-1 text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white p-6 rounded-lg shadow-md">
            <label className="flex items-center text-lg font-medium mb-4 text-gray-700">
              <Package className="ml-2" size={20} />
              הערות נוספות
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="💬 הערות מיוחדות להזמנה..."
              className="w-full p-4 border-2 rounded-lg text-lg focus:border-blue-500 focus:outline-none resize-none"
              rows="3"
            />
          </div>

          <div className="sticky bottom-0 bg-white p-6 rounded-lg shadow-lg border-t-4 border-green-400">
            <div className="flex space-x-4 space-x-reverse">
              <button
                type="submit"
                disabled={loading || !selectedCustomer || orderItems.length === 0}
                className="flex-1 bg-green-500 text-white py-4 rounded-lg text-xl font-bold hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '⏳ מעדכן...' : editingOrder ? '💾 עדכן הזמנה' : '🚀 שליחת הזמנה'}
              </button>
              
              <button
                type="button"
                onClick={clearOrder}
                className="px-6 bg-gray-500 text-white py-4 rounded-lg text-lg font-medium hover:bg-gray-600 transition-colors"
              >
                🗑️ נקה
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}