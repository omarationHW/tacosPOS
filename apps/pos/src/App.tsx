import { Routes, Route } from 'react-router';
import { AppLayout } from '@/components/AppLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { RoleRedirect } from '@/components/RoleRedirect';
import { Login } from '@/pages/Login';
import { POS } from '@/pages/POS';
import { Kitchen } from '@/pages/Kitchen';
import { Cuentas } from '@/pages/Cuentas';
import { CashRegisterPage } from '@/pages/CashRegisterPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { CategoriesPage } from '@/pages/admin/CategoriesPage';
import { ProductsPage } from '@/pages/admin/ProductsPage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/pos"
          element={
            <ProtectedRoute allowedRoles={['admin', 'cashier']}>
              <POS />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cuentas"
          element={
            <ProtectedRoute allowedRoles={['admin', 'cashier']}>
              <Cuentas />
            </ProtectedRoute>
          }
        />
        <Route
          path="/kitchen"
          element={
            <ProtectedRoute allowedRoles={['admin', 'kitchen']}>
              <Kitchen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/caja"
          element={
            <ProtectedRoute allowedRoles={['admin', 'cashier']}>
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
      </Route>

      <Route path="*" element={<RoleRedirect />} />
    </Routes>
  );
}
