import AdvancedAuthSystem from '../../components/AdvancedAuthSystem';
import WarehouseDashboard from '../../components/WarehouseDashboard';

export default function Page() {
  return (
    <AdvancedAuthSystem requiredRole="warehouse">
      <WarehouseDashboard />
    </AdvancedAuthSystem>
  );
}