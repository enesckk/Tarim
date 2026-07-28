import type { PlannedEvidenceForm } from '../api/taskThemes'

type Props = {
  theme: string
  form: PlannedEvidenceForm
  onChange: (patch: Partial<PlannedEvidenceForm>) => void
  className?: string
}

/** Tema seçildikten sonra uzman için planlanan/hedef kanıt alanları. */
export function PlannedEvidenceFields({ theme, form, onChange, className }: Props) {
  if (!theme) return null

  return (
    <div className={className ?? 'planned-evidence-fields'}>
      <p className="planned-evidence-heading">Planlanan değerler (hedef)</p>
      <p className="planned-evidence-hint">
        Üretici tamamladığında gerçekleşen değerlerle buradaki hedefleri karşılaştırırsınız.
      </p>
      <div className="planned-evidence-grid">
        {theme === 'Sulama' ? (
          <>
            <label className="land-task-field">
              <span>Hedef süre (dk)</span>
              <input
                type="number"
                min={1}
                value={form.durationMinutes}
                onChange={(e) => onChange({ durationMinutes: e.target.value })}
                placeholder="Örn. 45"
                required
              />
            </label>
            <label className="land-task-field">
              <span>Hedef su (litre)</span>
              <input
                type="number"
                min={0.01}
                step="any"
                value={form.waterAmount}
                onChange={(e) => onChange({ waterAmount: e.target.value })}
                placeholder="Örn. 200"
                required
              />
            </label>
          </>
        ) : null}
        {theme === 'Gubreleme' ? (
          <>
            <label className="land-task-field">
              <span>Planlanan gübre</span>
              <input
                value={form.fertilizerName}
                onChange={(e) => onChange({ fertilizerName: e.target.value })}
                placeholder="Örn. 15-15-15"
                required
              />
            </label>
            <label className="land-task-field">
              <span>Hedef miktar (kg)</span>
              <input
                type="number"
                min={0.01}
                step="any"
                value={form.amount}
                onChange={(e) => onChange({ amount: e.target.value })}
                placeholder="Örn. 25"
                required
              />
            </label>
          </>
        ) : null}
        {theme === 'Ilaclama' ? (
          <>
            <label className="land-task-field">
              <span>Planlanan ilaç</span>
              <input
                value={form.pesticideName}
                onChange={(e) => onChange({ pesticideName: e.target.value })}
                placeholder="Örn. Fungisit X"
                required
              />
            </label>
            <label className="land-task-field">
              <span>Planlanan doz</span>
              <input
                value={form.dose}
                onChange={(e) => onChange({ dose: e.target.value })}
                placeholder="Örn. 100 ml / 100 L"
                required
              />
            </label>
            <label className="land-task-field">
              <span>Hedef su (litre)</span>
              <input
                type="number"
                min={0.01}
                step="any"
                value={form.waterAmount}
                onChange={(e) => onChange({ waterAmount: e.target.value })}
                placeholder="Örn. 100"
                required
              />
            </label>
          </>
        ) : null}
        {theme === 'Dikim' ? (
          <label className="land-task-field">
            <span>Hedef fide sayısı</span>
            <input
              type="number"
              min={1}
              value={form.seedlingCount}
              onChange={(e) => onChange({ seedlingCount: e.target.value })}
              placeholder="Örn. 500"
              required
            />
          </label>
        ) : null}
        {theme === 'Hasat' ? (
          <>
            <label className="land-task-field">
              <span>Hedef ürün (kg)</span>
              <input
                type="number"
                min={0.01}
                step="any"
                value={form.productQuantity}
                onChange={(e) => onChange({ productQuantity: e.target.value })}
                placeholder="Örn. 350"
                required
              />
            </label>
            <label className="land-task-field">
              <span>Hedef kasa sayısı</span>
              <input
                type="number"
                min={0}
                value={form.crateCount}
                onChange={(e) => onChange({ crateCount: e.target.value })}
                placeholder="Örn. 14"
                required
              />
            </label>
          </>
        ) : null}
        {theme === 'Bakim' ? (
          <label className="land-task-field planned-evidence-full">
            <span>Planlanan bakım</span>
            <textarea
              value={form.description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="Örn. Sıra arası çapalama ve yaprak budama"
              rows={2}
              required
            />
          </label>
        ) : null}
      </div>
    </div>
  )
}
