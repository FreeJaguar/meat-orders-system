'use client'

export default function DebugPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">🔍 בדיקת הגדרות</h1>
      
      <div className="space-y-4">
        <div className="p-4 border rounded">
          <h3 className="font-bold">Supabase URL:</h3>
          <p className="text-sm">{supabaseUrl || '❌ לא מוגדר'}</p>
        </div>
        
        <div className="p-4 border rounded">
          <h3 className="font-bold">Supabase Key:</h3>
          <p className="text-sm">{supabaseKey ? '✅ קיים' : '❌ לא מוגדר'}</p>
        </div>
        
        <div className="p-4 border rounded">
          <h3 className="font-bold">Node Environment:</h3>
          <p className="text-sm">{process.env.NODE_ENV}</p>
        </div>
      </div>
    </div>
  );
}