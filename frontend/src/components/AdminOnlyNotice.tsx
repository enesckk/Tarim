import { Link } from 'react-router-dom'

/** Panel içi net mesaj — pazarlama sayfasına atmak yerine. */
export function AdminOnlyNotice({
  title = 'Bu sayfa yalnızca yöneticiler içindir',
  heading = 'Erişim kısıtlı',
}: {
  title?: string
  heading?: string
}) {
  return (
    <section className="panel" style={{ maxWidth: 520, margin: '24px auto' }}>
      <h1 style={{ fontSize: 18, margin: '0 0 8px' }}>{heading}</h1>
      <p className="muted-copy" style={{ marginBottom: 16 }}>
        {title}
      </p>
      <Link to="/app" className="primary-btn">
        Operasyon Merkezi’ne dön
      </Link>
    </section>
  )
}
