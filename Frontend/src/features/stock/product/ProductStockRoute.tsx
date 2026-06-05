import { Navigate, useParams } from 'react-router-dom'
import { PRODUCT_CONFIGS } from './productConfig'
import { ProductStockPage } from './ProductStockPage'

/** Resolves /stock/:kind to its config and renders the generic product page.
 *  Unknown kinds (e.g. the retired "network") redirect to chassis. */
export function ProductStockRoute() {
  const { kind } = useParams<{ kind: string }>()
  const config = kind ? PRODUCT_CONFIGS[kind] : undefined
  if (!config) return <Navigate to="/stock/chassis" replace />
  return <ProductStockPage key={config.key} config={config} />
}
