import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { ProtectedRoute, RoleRoute } from '@/components/layout/guards'
import { ToastHost } from '@/components/ui'
import { LoginPage } from '@/features/auth/LoginPage'
import { StockSection } from '@/features/stock/StockSection'
import { ServersPage } from '@/features/stock/servers/ServersPage'
import { ProductStockRoute } from '@/features/stock/product/ProductStockRoute'
import { IssuesPage } from '@/features/audit/IssuesPage'
import { ChangeLogsPage } from '@/features/audit/ChangeLogsPage'
import { PricingSection } from '@/features/pricing/PricingSection'
import { BulkPriceUpdate } from '@/features/pricing/BulkPriceUpdate'
import { CompatibilityOverrides } from '@/features/pricing/CompatibilityOverrides'
import { CoveragePage } from '@/features/coverage/CoveragePage'

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/stock/chassis" replace />} />

            {/* Stock — visible to admin + stock_manager */}
            <Route path="stock" element={<StockSection />}>
              <Route index element={<Navigate to="/stock/chassis" replace />} />
              <Route path="chassis" element={<ServersPage />} />
              <Route path=":kind" element={<ProductStockRoute />} />
            </Route>

            {/* Import monitoring — visible to admin + stock_manager */}
            <Route path="issues" element={<IssuesPage />} />
            <Route path="change-logs" element={<ChangeLogsPage />} />

            {/* Coverage dashboard — super_admin only */}
            <Route element={<RoleRoute roles={['super_admin']} />}>
              <Route path="coverage" element={<CoveragePage />} />
            </Route>

            {/* Pricing & Rules — admin + super_admin */}
            <Route element={<RoleRoute roles={['admin', 'super_admin']} />}>
              <Route path="pricing" element={<PricingSection />}>
                <Route index element={<Navigate to="/pricing/bulk" replace />} />
                <Route path="bulk" element={<BulkPriceUpdate />} />
                <Route path="compatibility" element={<CompatibilityOverrides />} />
              </Route>
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <ToastHost />
    </>
  )
}
