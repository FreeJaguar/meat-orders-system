'use client'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function TestPage() {
  const testConnection = async () => {
    try {
      console.log('Testing connection...')
      console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
      
      const { data, error } = await supabase.from('customers').select('*')
      
      if (error) {
        console.error('Error:', error)
        alert('שגיאה בחיבור: ' + error.message)
      } else {
        console.log('Data:', data)
        alert('🎉 החיבור עובד בהצלחה!\n\nיש ' + data.length + ' לקוחות במערכת:\n' + 
              data.map(c => `• ${c.name} (${c.code})`).join('\n'))
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      alert('שגיאה לא צפויה: ' + err.message)
    }
  }

  const testProducts = async () => {
    try {
      const { data, error } = await supabase.from('products').select('*')
      
      if (error) {
        alert('שגיאה בטעינת מוצרים: ' + error.message)
      } else {
        alert('✅ מוצרים נטענו בהצלחה!\n\nיש ' + data.length + ' מוצרים במערכת')
      }
    } catch (err) {
      alert('שגיאה: ' + err.message)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
          בדיקת חיבור למסד הנתונים
        </h1>
        
        <div className="space-y-4">
          <button 
            onClick={testConnection}
            className="w-full bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors font-medium"
          >
            🔗 בדוק חיבור ללקוחות
          </button>

          <button 
            onClick={testProducts}
            className="w-full bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors font-medium"
          >
            📦 בדוק טעינת מוצרים
          </button>

          <div className="mt-6 p-4 bg-gray-50 rounded text-sm text-gray-600">
            <p><strong>מה אמור לקרות:</strong></p>
            <ul className="mt-2 space-y-1">
              <li>• לחיצה על כפתור ראשון → הודעה עם 3 לקוחות</li>
              <li>• לחיצה על כפתור שני → הודעה עם 11 מוצרים</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}