import { Outlet } from 'react-router-dom'

// Navigation is handled entirely by the left sidebar — no top tabs or module header.
export function StockSection() {
  return <Outlet />
}
