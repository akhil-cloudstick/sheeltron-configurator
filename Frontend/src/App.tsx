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
import { ConfiguratorLayout } from '@/features/configurator/ConfiguratorLayout'
import { ProcessorStep } from '@/features/configurator/steps/ProcessorStep'
import { ChassisStep } from '@/features/configurator/steps/ChassisStep'
import { RamStep } from '@/features/configurator/steps/RamStep'
import { StorageStep } from '@/features/configurator/steps/StorageStep'
import { ReviewStep } from '@/features/configurator/steps/ReviewStep'
import { QuotesPage } from '@/features/quotes/QuotesPage'
import { QuoteDetailPage } from '@/features/quotes/QuoteDetailPage'

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/stock/chassis" replace />} />

            {/* Stock + import monitoring — staff roles only (not salesman) */}
            <Route element={<RoleRoute roles={['admin', 'super_admin', 'stock_manager']} />}>
              <Route path="stock" element={<StockSection />}>
                <Route index element={<Navigate to="/stock/chassis" replace />} />
                <Route path="chassis" element={<ServersPage />} />
                <Route path=":kind" element={<ProductStockRoute />} />
              </Route>
              <Route path="issues" element={<IssuesPage />} />
              <Route path="change-logs" element={<ChangeLogsPage />} />
            </Route>

            {/* Coverage dashboard — super_admin only */}
            <Route element={<RoleRoute roles={['super_admin']} />}>
              <Route path="coverage" element={<CoveragePage />} />
            </Route>

            {/* Pricing & Rules + All quotes — admin + super_admin */}
            <Route element={<RoleRoute roles={['admin', 'super_admin']} />}>
              <Route path="pricing" element={<PricingSection />}>
                <Route index element={<Navigate to="/pricing/bulk" replace />} />
                <Route path="bulk" element={<BulkPriceUpdate />} />
                <Route path="compatibility" element={<CompatibilityOverrides />} />
              </Route>
              <Route path="quotes" element={<QuotesPage />} />
              <Route path="quotes/:id" element={<QuoteDetailPage />} />
            </Route>
          </Route>

          {/* Salesman configurator — its own layout (no admin shell), salesman only */}
          <Route element={<RoleRoute roles={['salesman']} />}>
            <Route path="configurator" element={<ConfiguratorLayout />}>
              <Route index element={<Navigate to="/configurator/processor" replace />} />
              <Route path="processor" element={<ProcessorStep />} />
              <Route path="chassis" element={<ChassisStep />} />
              <Route path="ram" element={<RamStep />} />
              <Route path="storage" element={<StorageStep />} />
              <Route path="review" element={<ReviewStep />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <ToastHost />
    </>
  )
}
