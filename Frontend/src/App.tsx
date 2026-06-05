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
import { CoveragePage } from '@/features/coverage/CoveragePage'
import { ConfiguratorLayout } from '@/features/configurator/ConfiguratorLayout'
import { CompatibilityPicker } from '@/features/configurator/CompatibilityPicker'
import { ProcessorStep } from '@/features/configurator/steps/ProcessorStep'
import { ChassisStep } from '@/features/configurator/steps/ChassisStep'
import { RamStep } from '@/features/configurator/steps/RamStep'
import { StorageStep } from '@/features/configurator/steps/StorageStep'
import { ReviewStep } from '@/features/configurator/steps/ReviewStep'
import { PACK_STEP_ORDER } from '@/features/configurator/configuratorSteps'
import { PacksPage } from '@/features/packs/PacksPage'
import { PackDetailPage } from '@/features/packs/PackDetailPage'
import { PackSaveStep } from '@/features/packs/PackSaveStep'
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

            {/* Quotes — salesman sees their own ("My quotes"), admin/super_admin see all. */}
            <Route element={<RoleRoute roles={['salesman', 'admin', 'super_admin']} />}>
              <Route path="quotes" element={<QuotesPage />} />
              <Route path="quotes/:id" element={<QuoteDetailPage />} />
            </Route>

            {/* Pricing & Rules + Compatible packs — admin + super_admin */}
            <Route element={<RoleRoute roles={['admin', 'super_admin']} />}>
              <Route path="pricing" element={<PricingSection />}>
                <Route index element={<Navigate to="/pricing/bulk" replace />} />
                <Route path="bulk" element={<BulkPriceUpdate />} />
                {/* Compatibility overrides was replaced by the packs builder. */}
                <Route path="compatibility" element={<Navigate to="/compatibility" replace />} />
              </Route>
              <Route path="compatibility" element={<PacksPage />} />
              <Route path="compatibility/:id" element={<PackDetailPage />} />
              {/* Pack builder — wizard embedded in the admin shell (sidebar stays). */}
              <Route
                path="compatibility/build"
                element={<ConfiguratorLayout steps={PACK_STEP_ORDER} mode="pack" embedded />}
              >
                <Route index element={<Navigate to="/compatibility/build/processor" replace />} />
                <Route path="processor" element={<ProcessorStep />} />
                <Route path="chassis" element={<ChassisStep />} />
                <Route path="ram" element={<RamStep />} />
                <Route path="storage" element={<StorageStep />} />
                <Route path="save" element={<PackSaveStep />} />
              </Route>
            </Route>

            {/* Salesman configurator — embedded in the admin shell (sidebar stays). The
                two entry points (Build to order / Compatibility) are sidebar items; the
                wizard steps and the compatibility picker live under /configurator. */}
            <Route element={<RoleRoute roles={['salesman']} />}>
              <Route path="configurator">
                <Route index element={<Navigate to="/configurator/processor" replace />} />
                <Route path="compatibility" element={<CompatibilityPicker />} />
                <Route element={<ConfiguratorLayout embedded />}>
                  <Route path="processor" element={<ProcessorStep />} />
                  <Route path="chassis" element={<ChassisStep />} />
                  <Route path="ram" element={<RamStep />} />
                  <Route path="storage" element={<StorageStep />} />
                  <Route path="review" element={<ReviewStep />} />
                </Route>
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
