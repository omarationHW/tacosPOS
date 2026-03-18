import { Routes, Route } from 'react-router';
import { AppLayout } from '@/components/AppLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { RoleRedirect } from '@/components/RoleRedirect';
import { BusinessLineGuard } from '@/components/BusinessLineGuard';
import { Login } from '@/pages/Login';
import { BusinessLineSelect } from '@/pages/BusinessLineSelect';
import { POS } from '@/pages/POS';
import { Kitchen } from '@/pages/Kitchen';
import { Cuentas } from '@/pages/Cuentas';
import { CashRegisterPage } from '@/pages/CashRegisterPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { CategoriesPage } from '@/pages/admin/CategoriesPage';
import { ProductsPage } from '@/pages/admin/ProductsPage';
import { StaffPage } from '@/pages/admin/StaffPage';
import { CustomersPage } from '@/pages/admin/CustomersPage';
import { OrderHistoryPage } from '@/pages/admin/OrderHistoryPage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/select-line"
        element={
          <ProtectedRoute>
            <BusinessLineSelect />
          </ProtectedRoute>
        }
      />

      <Route
        element={
          <ProtectedRoute>
            <BusinessLineGuard>
              <AppLayout />
            </BusinessLineGuard>
          </ProtectedRoute>
        }
      >
        <Route
          path="/pos"
          element={
            <ProtectedRoute allowedRoles={['admin', 'cashier', 'waiter']}>
              <POS />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cuentas"
          element={
            <ProtectedRoute allowedRoles={['admin', 'cashier', 'waiter']}>
              <Cuentas />
            </ProtectedRoute>
          }
        />
        <Route
          path="/kitchen"
          element={
            <ProtectedRoute allowedRoles={['admin', 'kitchen', 'cashier', 'waiter']}>
              <Kitchen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/caja"
          element={
            <ProtectedRoute allowedRoles={['admin', 'cashier', 'waiter']}>
              <CashRegisterPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reportes"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/categories"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <CategoriesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/products"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ProductsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/staff"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <StaffPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/customers"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <CustomersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <OrderHistoryPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<RoleRedirect />} />
    </Routes>
  );
}
