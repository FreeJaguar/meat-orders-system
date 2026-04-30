const STATUS_STYLES = {
  'חדשה':   { bg: '#EAF0F8', text: '#2D5A8E' },
  'בטיפול': { bg: '#FDF3DC', text: '#8B6914' },
  'הודפס':  { bg: '#EFEFEF', text: '#5A5A5A' },
  'נשלחה':  { bg: '#F0EAF8', text: '#6B3FAB' },
  'הושלמה': { bg: '#E8F4EC', text: '#3D7A52' },
  'בוטלה':  { bg: '#F8EAEA', text: '#A63D3D' },
};

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || { bg: '#EFEFEF', text: '#5A5A5A' };
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {status}
    </span>
  );
}
