import AdvancedAuthSystem from '../components/AdvancedAuthSystem';
import OrderForm from '../components/OrderForm';

export default function Page() {
  return (
    <AdvancedAuthSystem requiredRole="field_agent">
      <OrderForm />
    </AdvancedAuthSystem>
  );
}