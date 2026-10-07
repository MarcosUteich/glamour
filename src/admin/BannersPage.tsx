import { BannersEditor } from './BannersEditor'
import { PageTitle } from './ui'

export function BannersPage() {
  return (
    <div className="mx-auto">
      <PageTitle>Banners</PageTitle>
      <BannersEditor />
    </div>
  )
}
