'use client'
import React, { useState, useEffect } from 'react';
import { Lock, Shield, Users, Eye, EyeOff } from 'lucide-react';

export default function LoginSystem({ children, requiredRole = null }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [password, setPassword] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // סיסמאות בדיקה (במציאות יהיו בבסיס נתונים מוצפנות)
  const passwords = {
    admin: '1234567890', // סיסמת אדמין
    field_agent: '123456', // סיסמת סוכן שטח
    warehouse: 'מחסן123' // סיסמת מחסן
  };

  useEffect(() => {
    // בדיקה אם המשתמש כבר מחובר
    const savedRole = localStorage.getItem('userRole');
    const loginTime = localStorage.getItem('loginTime');
    
    if (savedRole && loginTime) {
      // בדיקה אם החיבור לא פג (24 שעות)
      const hoursSinceLogin = (Date.now() - parseInt(loginTime)) / (1000 * 60 * 60);
      if (hoursSinceLogin < 24) {
        setUserRole(savedRole);
        setIsAuthenticated(true);
      } else {
        // פג תוקף - נקה הכל
        localStorage.removeItem('userRole');
        localStorage.removeItem('loginTime');
      }
    }
  }, []);

  const login = (role) => {
    setLoading(true);
    setError('');
    
    setTimeout(() => {
      if (passwords[role] && password === passwords[role]) {
        setUserRole(role);
        setIsAuthenticated(true);
        setShowLogin(false);
        setPassword('');
        
        // שמירה ב-localStorage
        localStorage.setItem('userRole', role);
        localStorage.setItem('loginTime', Date.now().toString());
        
      } else {
        setError('סיסמה שגויה!');
      }
      setLoading(false);
    }, 500);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
    localStorage.removeItem('userRole');
    localStorage.removeItem('loginTime');
  };

  const openAdminPanel = () => {
    setAdminPassword('');
    setShowAdminPanel(true);
    setError('');
  };

  const accessAdminPanel = () => {
    if (adminPassword === passwords.admin) {
      setError('');
      // כאן תוכל להוסיף לוגיקה לניהול משתמשים
      alert('ברוך הבא לפאנל האדמין!\n\nסיסמאות נוכחיות:\n• אדמין: 1234567890\n• סוכן שטח: 123456\n• מחסן: מחסן123');
      setShowAdminPanel(false);
      setAdminPassword('');
    } else {
      setError('סיסמת אדמין שגויה!');
    }
  };

  // בדיקה אם המשתמש מורשה לגשת לדף
  const hasAccess = () => {
    if (!requiredRole) return true; // אין דרישת הרשאה
    if (userRole === 'admin') return true; // אדמין יכול הכל
    return userRole === requiredRole;
  };

  const getRoleName = (role) => {
    switch (role) {
      case 'admin': return 'מנהל מערכת';
      case 'field_agent': return 'סוכן שטח';
      case 'warehouse': return 'מחסנאי';
      default: return 'לא מחובר';
    }
  };

  // אם לא מחובר או אין הרשאה
  if (!isAuthenticated || !hasAccess()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          
          {/* כותרת */}
          <div className="text-center mb-8">
            <Shield size={64} className="mx-auto text-blue-500 mb-4" />
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              🥩 מערכת הזמנות בשר
            </h1>
            <p className="text-gray-600">
              {!isAuthenticated ? 'התחברות למערכת' : 'אין לך הרשאה לגשת לדף זה'}
            </p>
          </div>

          {/* הודעת שגיאה */}
          {error && (
            <div className="bg-red-100 border-2 border-red-300 text-red-800 px-4 py-3 rounded-lg mb-6 font-medium">
              {error}
            </div>
          )}

          {/* בחירת תפקיד */}
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
                  <Package size={20} className="ml-2" />
                  מחסנאי
                </button>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={openAdminPanel}
                  className="w-full bg-gray-500 text-white p-2 rounded-lg hover:bg-gray-600 transition-colors font-medium text-sm flex items-center justify-center"
                >
                  <Lock size={16} className="ml-1" />
                  פאנל אדמין
                </button>
              </div>
            </div>
          ) : (
            /* טופס התחברות */
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
                  <label className="block text-sm font-bold text-gray-700 mb-2">סיסמה</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="הכנס סיסמה..."
                      className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none text-gray-800 font-medium"
                      onKeyPress={(e) => e.key === 'Enter' && login(showLogin)}
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
                  onClick={() => login(showLogin)}
                  disabled={loading || !password}
                  className="w-full bg-green-500 text-white p-3 rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-bold"
                >
                  {loading ? '⏳ מתחבר...' : '🔓 התחבר'}
                </button>
              </div>

              {/* רמזים לסיסמאות (רק לצורך הדגמה) */}
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                <strong>לצורך בדיקה:</strong><br />
                סוכן שטח: 123456<br />
                מחסנאי: מחסן123
              </div>
            </div>
          )}

          {/* פאנל אדמין */}
          {showAdminPanel && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full border-2 border-gray-300">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-800 text-lg">פאנל אדמין</h3>
                  <button
                    onClick={() => setShowAdminPanel(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">סיסמת אדמין</label>
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="הכנס סיסמת אדמין..."
                      className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none text-gray-800 font-medium"
                      onKeyPress={(e) => e.key === 'Enter' && accessAdminPanel()}
                    />
                  </div>
                  
                  <button
                    onClick={accessAdminPanel}
                    disabled={!adminPassword}
                    className="w-full bg-red-500 text-white p-3 rounded-lg hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-bold"
                  >
                    🔧 גישה לפאנל
                  </button>
                </div>

                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                  <strong>לצורך בדיקה:</strong> 1234567890
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // משתמש מחובר ומורשה - הצג תוכן + סרגל עליון
  return (
    <div>
      {/* סרגל משתמש עליון */}
      <div className="bg-white shadow-md border-b-2 border-gray-200 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3 space-x-reverse">
            <Shield size={24} className="text-green-500" />
            <span className="font-bold text-gray-800">
              מחובר כ: {getRoleName(userRole)}
            </span>
          </div>
          
          <div className="flex items-center space-x-3 space-x-reverse">
            {userRole === 'admin' && (
              <button
                onClick={openAdminPanel}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors font-bold text-sm"
              >
                ⚙️ פאנל אדמין
              </button>
            )}
            
            <button
              onClick={logout}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors font-bold"
            >
              🚪 התנתק
            </button>
          </div>
        </div>
      </div>

      {/* תוכן הדף */}
      {children}
    </div>
  );
}