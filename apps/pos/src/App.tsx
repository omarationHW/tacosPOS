import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { AppLayout } from '@/components/AppLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { RoleRedirect } from '@/components/RoleRedirect';
import { BusinessLineGuard } from '@/components/BusinessLineGuard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Login } from '@/pages/Login';
import { BusinessLineSelect } from '@/pages/BusinessLineSelect';
import { POS } from '@/pages/POS';
import { Kitchen } from '@/pages/Kitchen';

const Cuentas = lazy(() => import('@/pages/Cuentas').then((m) => ({ default: m.Cuentas })));
const CashRegisterPage = lazy(() =>
  import('@/pages/CashRegisterPage').then((m) => ({ default: m.CashRegisterPage })),
);
const ReportsPage = lazy(() =>
  import('@/pages/ReportsPage').then((m) => ({ default: m.ReportsPage })),
);
const CategoriesPage = lazy(() =>
  import('@/pages/admin/CategoriesPage').then((m) => ({ default: m.CategoriesPage })),
);
const ProductsPage = lazy(() =>
  import('@/pages/admin/ProductsPage').then((m) => ({ default: m.ProductsPage })),
);
const StaffPage = lazy(() =>
  import('@/pages/admin/StaffPage').then((m) => ({ default: m.StaffPage })),
);
const CustomersPage = lazy(() =>
  import('@/pages/admin/CustomersPage').then((m) => ({ default: m.CustomersPage })),
);
const OrderHistoryPage = lazy(() =>
  import('@/pages/admin/OrderHistoryPage').then((m) => ({ default: m.OrderHistoryPage })),
);

function PageFallback() {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <LoadingSpinner size="lg" />
    </div>
  );
}

export function App() {
  return (
    <Suspense fallback={<PageFallback />}>
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
      <SpeedInsights />
    </Suspense>
  );
}
