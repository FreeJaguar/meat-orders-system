'use client'
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Shield, Lock, Users, Eye, EyeOff, Plus, Edit, Trash2, Save, X, Settings } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function AdvancedAuthSystem({ children, requiredRole = null }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // משתני פאנל אדמין
  const [allUsers, setAllUsers] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({
    username: '',
    password_hash: '',
    role: 'field_agent',
    full_name: '',
    is_active: true
  });

  useEffect(() => {
    checkSavedLogin();
  }, []);

  const checkSavedLogin = () => {
    const savedUser = localStorage.getItem('currentUser');
    const loginTime = localStorage.getItem('loginTime');
    
    if (savedUser && loginTime) {
      const hoursSinceLogin = (Date.now() - parseInt(loginTime)) / (1000 * 60 * 60);
      if (hoursSinceLogin < 24) {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        setUserRole(user.role);
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('loginTime');
      }
    }
  };

  const login = async () => {
    setLoading(true);
    setError('');
    
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('password_hash', password) // במציאות זה יהיה hash
        .eq('is_active', true)
        .single();

      if (error || !users) {
        setError('שם משתמש או סיסמה שגויים!');
        return;
      }

      setCurrentUser(users);
      setUserRole(users.role);
      setIsAuthenticated(true);
      setShowLogin(false);
      setUsername('');
      setPassword('');
      
      localStorage.setItem('currentUser', JSON.stringify(users));
      localStorage.setItem('loginTime', Date.now().toString());
      
    } catch (err) {
      setError('שגיאה בהתחברות למערכת');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('loginTime');
  };

  const loadAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllUsers(data || []);
    } catch (err) {
      setError('שגיאה בטעינת רשימת המשתמשים');
    }
  };

  const openAdminPanel = async () => {
    setShowAdminPanel(true);
    setError('');
    await loadAllUsers();
  };

  const openUserModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setNewUser({
        username: user.username,
        password_hash: '',
        role: user.role,
        full_name: user.full_name || '',
        is_active: user.is_active
      });
    } else {
      setEditingUser(null);
      setNewUser({
        username: '',
        password_hash: '',
        role: 'field_agent',
        full_name: '',
        is_active: true
      });
    }
    setShowUserModal(true);
  };

  const saveUser = async () => {
    if (!newUser.username || (!editingUser && !newUser.password_hash)) {
      setError('יש למלא את כל השדות הנדרשים');
      return;
    }

    setLoading(true);
    try {
      if (editingUser) {
        // עדכון משתמש קיים
        const updateData = {
          username: newUser.username,
          role: newUser.role,
          full_name: newUser.full_name,
          is_active: newUser.is_active,
          updated_at: new Date().toISOString()
        };

        // אם יש סיסמה חדשה
        if (newUser.password_hash) {
          updateData.password_hash = newUser.password_hash;
        }

        const { error } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', editingUser.id);

        if (error) throw error;
        
      } else {
        // יצירת משתמש חדש
        const { error } = await supabase
          .from('users')
          .insert([{
            username: newUser.username,
            password_hash: newUser.password_hash,
            role: newUser.role,
            full_name: newUser.full_name,
            is_active: newUser.is_active
          }]);

        if (error) throw error;
      }

      setShowUserModal(false);
      setEditingUser(null);
      await loadAllUsers();
      
    } catch (err) {
      setError('שגיאה בשמירת המשתמש: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את המשתמש?')) return;

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      await loadAllUsers();
      
    } catch (err) {
      setError('שגיאה במחיקת המשתמש');
    }
  };

  const hasAccess = () => {
    if (!requiredRole) return true;
    if (userRole === 'admin') return true;
    return userRole === requiredRole;
  };

  const getRoleName = (role) => {
    switch (role) {
      case 'admin': return 'מנהל מערכת';
      case 'field_agent': return 'סוכן שטח';
      case 'warehouse': return 'מחסנאי';
      default: return 'לא מוגדר';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 border-red-300';
      case 'field_agent': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'warehouse': return 'bg-purple-100 text-purple-800 border-purple-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (!isAuthenticated || !hasAccess()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          
          <div className="text-center mb-8">
            <Shield size={64} className="mx-auto text-blue-500 mb-4" />
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              🥩 מערכת הזמנות בשר
            </h1>
            <p className="text-gray-600">
              {!isAuthenticated ? 'התחברות למערכת' : 'אין לך הרשאה לגשת לדף זה'}
            </p>
          </div>

          {error && (
            <div className="bg-red-100 border-2 border-red-300 text-red-800 px-4 py-3 rounded-lg mb-6 font-medium">
              {error}
            </div>
          )}

          {!showLogin ? (
            <div className="bg-white p-6 rounded-lg shadow-lg border-2 border-gray-200">
              <h3 className="font-bold text-gray-800 mb-4 text-lg text-center">בחר את התפקיד שלך</h3>
              
              <div className="space-y-3">
                <button
                  onClick={() => setShowLogin('field_agent')}
                  className="w-full bg-blue-500 text-white p-4 rounded-lg hover:bg-blue-600 transition-colors font-bold flex items-center justify-center"
                >
                  <Users size={20} className="ml-2" />
                  סוכן שטח
                </button>
                
                <button
                  onClick={() => setShowLogin('warehouse')}
                  className="w-full bg-purple-500 text-white p-4 rounded-lg hover:bg-purple-600 transition-colors font-bold flex items-center justify-center"
                >
                  <Shield size={20} className="ml-2" />
                  מחסנאי
                </button>
                
                <button
                  onClick={() => setShowLogin('admin')}
                  className="w-full bg-red-500 text-white p-4 rounded-lg hover:bg-red-600 transition-colors font-bold flex items-center justify-center"
                >
                  <Settings size={20} className="ml-2" />
                  מנהל מערכת
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-lg shadow-lg border-2 border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800 text-lg">
                  התחברות - {getRoleName(showLogin)}
                </h3>
                <button
                  onClick={() => setShowLogin(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">שם משתמש</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="הכנס שם משתמש..."
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none text-gray-800 font-medium"
                    onKeyPress={(e) => e.key === 'Enter' && login()}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">סיסמה</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="הכנס סיסמה..."
                      className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none text-gray-800 font-medium"
                      onKeyPress={(e) => e.key === 'Enter' && login()}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-3 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
                
                <button
                  onClick={login}
                  disabled={loading || !username || !password}
                  className="w-full bg-green-500 text-white p-3 rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-bold"
                >
                  {loading ? '⏳ מתחבר...' : '🔓 התחבר'}
                </button>
              </div>

              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                <strong>משתמשים לבדיקה:</strong><br />
                • admin / admin123<br />
                • agent1 / agent123<br />
                • warehouse1 / warehouse123
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* סרגל משתמש עליון */}
      <div className="bg-white shadow-md border-b-2 border-gray-200 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3 space-x-reverse">
            <Shield size={24} className="text-green-500" />
            <div>
              <span className="font-bold text-gray-800">
                {currentUser?.full_name || currentUser?.username} 
              </span>
              <span className={`mr-2 px-2 py-1 rounded text-xs font-bold border ${getRoleColor(userRole)}`}>
                {getRoleName(userRole)}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 space-x-reverse">
            {userRole === 'admin' && (
              <button
                onClick={openAdminPanel}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors font-bold text-sm flex items-center"
              >
                <Settings size={16} className="ml-1" />
                ניהול משתמשים
              </button>
            )}
            
            <button
              onClick={logout}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors font-bold"
            >
              🚪 התנתק
            </button>
          </div>
        </div>
      </div>

      {/* פאנל אדמין לניהול משתמשים */}
      {showAdminPanel && userRole === 'admin' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto border-4 border-gray-300">
            <div className="p-6 border-b-2 border-gray-200 bg-red-50">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                  <Settings size={24} className="ml-2" />
                  ניהול משתמשים ומערכת
                </h2>
                <button
                  onClick={() => setShowAdminPanel(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {error && (
                <div className="bg-red-100 border-2 border-red-300 text-red-800 px-4 py-3 rounded-lg mb-6 font-medium">
                  {error}
                </div>
              )}

              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">רשימת משתמשים</h3>
                <button
                  onClick={() => openUserModal()}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors font-bold flex items-center"
                >
                  <Plus size={16} className="ml-1" />
                  הוסף משתמש
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-2 border-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-3 text-right font-bold text-gray-800 border-b">שם משתמש</th>
                      <th className="p-3 text-right font-bold text-gray-800 border-b">שם מלא</th>
                      <th className="p-3 text-right font-bold text-gray-800 border-b">תפקיד</th>
                      <th className="p-3 text-right font-bold text-gray-800 border-b">סטטוס</th>
                      <th className="p-3 text-right font-bold text-gray-800 border-b">תאריך יצירה</th>
                      <th className="p-3 text-right font-bold text-gray-800 border-b">פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers.map((user, index) => (
                      <tr key={user.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="p-3 border-b font-medium text-gray-800">{user.username}</td>
                        <td className="p-3 border-b text-gray-700">{user.full_name || '-'}</td>
                        <td className="p-3 border-b">
                          <span className={`px-2 py-1 rounded text-xs font-bold border ${getRoleColor(user.role)}`}>
                            {getRoleName(user.role)}
                          </span>
                        </td>
                        <td className="p-3 border-b">
                          <span className={`px-2 py-1 rounded text-xs font-bold border ${
                            user.is_active 
                              ? 'bg-green-100 text-green-800 border-green-300' 
                              : 'bg-red-100 text-red-800 border-red-300'
                          }`}>
                            {user.is_active ? 'פעיל' : 'לא פעיל'}
                          </span>
                        </td>
                        <td className="p-3 border-b text-gray-700">
                          {new Date(user.created_at).toLocaleDateString('he-IL')}
                        </td>
                        <td className="p-3 border-b">
                          <div className="flex space-x-2 space-x-reverse">
                            <button
                              onClick={() => openUserModal(user)}
                              className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition-colors flex items-center"
                            >
                              <Edit size={14} className="ml-1" />
                              ערוך
                            </button>
                            <button
                              onClick={() => deleteUser(user.id)}
                              className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition-colors flex items-center"
                            >
                              <Trash2 size={14} className="ml-1" />
                              מחק
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* מודל עריכה/הוספת משתמש */}
      {showUserModal && userRole === 'admin' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full border-4 border-gray-300">
            <div className="p-6 border-b-2 border-gray-200">
              <h3 className="text-xl font-bold text-gray-800">
                {editingUser ? 'עריכת משתמש' : 'הוספת משתמש חדש'}
              </h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">שם משתמש</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  className="w-full border-2 border-gray-300 rounded px-3 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="הכנס שם משתמש..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  {editingUser ? 'סיסמה חדשה (השאר ריק כדי לא לשנות)' : 'סיסמה'}
                </label>
                <input
                  type="password"
                  value={newUser.password_hash}
                  onChange={(e) => setNewUser({...newUser, password_hash: e.target.value})}
                  className="w-full border-2 border-gray-300 rounded px-3 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="הכנס סיסמה..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">שם מלא</label>
                <input
                  type="text"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({...newUser, full_name: e.target.value})}
                  className="w-full border-2 border-gray-300 rounded px-3 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="שם מלא..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">תפקיד</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  className="w-full border-2 border-gray-300 rounded px-3 py-2 focus:border-blue-500 focus:outline-none"
                >
                  <option value="field_agent">סוכן שטח</option>
                  <option value="warehouse">מחסנאי</option>
                  <option value="admin">מנהל מערכת</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={newUser.is_active}
                  onChange={(e) => setNewUser({...newUser, is_active: e.target.checked})}
                  className="ml-2"
                />
                <label htmlFor="is_active" className="text-sm font-bold text-gray-700">
                  משתמש פעיל
                </label>
              </div>
            </div>

            <div className="p-6 border-t-2 border-gray-200 flex space-x-3 space-x-reverse">
              <button
                onClick={saveUser}
                disabled={loading}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:bg-gray-300 transition-colors font-bold flex items-center"
              >
                <Save size={16} className="ml-1" />
                {loading ? 'שומר...' : 'שמור'}
              </button>
              
              <button
                onClick={() => setShowUserModal(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors font-bold flex items-center"
              >
                <X size={16} className="ml-1" />
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* תוכן הדף */}
      {children}
    </div>
  );
}