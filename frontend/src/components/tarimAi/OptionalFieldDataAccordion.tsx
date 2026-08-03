import { useId, useRef, useState, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { CheckCircle2, ChevronDown, Droplets, FileUp, Layers, Trash2, Upload } from 'lucide-react'
import type { IrrigationAvailability, ManualIrrigationMode, ManualSoilMode } from '../../api/tarimAi'
import { cn } from '../../lib/utils'
import {
  formatIrrigationAvailability,
  formatIrrigationModeShort,
  formatPdfBytes,
  formatSoilModeShort,
} from '../../utils/tarimAiFormat'

function AccordionSection({
  icon: Icon,
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  icon: LucideIcon
  title: string
  summary: string
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <div className={cn('tai2-accordion', open && 'is-open')}>
      <button type="button" className="tai2-accordion-header" onClick={onToggle} aria-expanded={open}>
        <Icon className="tai2-accordion-icon" size={16} aria-hidden="true" />
        <span className="tai2-accordion-title">{title}</span>
        <span className="tai2-accordion-summary">{summary}</span>
        <ChevronDown className={cn('tai2-chevron', open && 'is-open')} size={16} aria-hidden="true" />
      </button>
      {open ? <div className="tai2-accordion-body">{children}</div> : null}
    </div>
  )
}

function ModeChoiceRow({
  name,
  value,
  onChange,
  options,
  disabled,
}: {
  name: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
  disabled?: boolean
}) {
  return (
    <div className="tai2-choice-row">
      {options.map((option) => (
        <label key={option.value} className={cn('tai2-choice', value === option.value && 'is-active')}>
          <input
            type="radio"
            name={name}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            disabled={disabled}
          />
          {option.label}
        </label>
      ))}
    </div>
  )
}

function PdfUploadField({
  title,
  hint,
  file,
  onFileChange,
  disabled,
}: {
  title: string
  hint: string
  file: File | null
  onFileChange: (file: File | null) => void
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const inputId = useId()
  const [dragging, setDragging] = useState(false)

  function pickFile(next: File | null) {
    if (!next) {
      onFileChange(null)
      return
    }
    const name = next.name.toLowerCase()
    if (!name.endsWith('.pdf') && next.type !== 'application/pdf') {
      return
    }
    onFileChange(next)
  }

  return (
    <div className="tai2-pdf-upload">
      <div className="tai2-pdf-upload-head">
        <FileUp size={16} aria-hidden="true" />
        <div>
          <strong>{title}</strong>
          <p>{hint}</p>
        </div>
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        className="tai2-pdf-input-hidden"
        accept="application/pdf,.pdf"
        disabled={disabled}
        onChange={(event) => {
          pickFile(event.target.files?.[0] ?? null)
          event.target.value = ''
        }}
      />

      {file ? (
        <div className="tai2-pdf-selected" role="status">
          <CheckCircle2 className="tai2-pdf-selected-icon" size={18} aria-hidden="true" />
          <div className="tai2-pdf-selected-text">
            <strong>{file.name}</strong>
            <span>
              {formatPdfBytes(file.size)} · PDF seçildi
            </span>
          </div>
          <button
            type="button"
            className="tai2-btn tai2-btn-ghost tai2-btn-sm"
            disabled={disabled}
            onClick={() => {
              onFileChange(null)
              if (inputRef.current) inputRef.current.value = ''
            }}
            aria-label="Seçilen PDF dosyasını kaldır"
          >
            <Trash2 size={14} aria-hidden="true" />
            Kaldır
          </button>
          <button
            type="button"
            className="tai2-btn tai2-btn-secondary tai2-btn-sm"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            Değiştir
          </button>
        </div>
      ) : (
        <div
          className={cn('tai2-pdf-dropzone', dragging && 'is-dragging', disabled && 'is-disabled')}
          onDragEnter={(event) => {
            event.preventDefault()
            if (!disabled) setDragging(true)
          }}
          onDragOver={(event) => {
            event.preventDefault()
            if (!disabled) setDragging(true)
          }}
          onDragLeave={(event) => {
            event.preventDefault()
            setDragging(false)
          }}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            if (disabled) return
            pickFile(event.dataTransfer.files?.[0] ?? null)
          }}
        >
          <Upload className="tai2-pdf-dropzone-icon" size={28} aria-hidden="true" />
          <p className="tai2-pdf-dropzone-title">PDF dosyasını buraya sürükleyin</p>
          <p className="tai2-pdf-dropzone-sub">veya bilgisayarınızdan seçin · yalnızca .pdf · en fazla 12 MB</p>
          <button
            type="button"
            className="tai2-btn tai2-btn-primary"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            aria-label={`${title} için PDF dosyası seç`}
          >
            <FileUp size={16} aria-hidden="true" />
            PDF dosyası seç
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * Optional soil / irrigation data entry, limited to the fields the analysis API actually accepts:
 * soil: ph, ecDsM, organicMatterPercent, clay/sand/silt percent (no lime, P/K, or lab date).
 * irrigation: availability + optional EC/SAR/pH quality values.
 */
export function OptionalFieldDataAccordion({
  soilMode,
  onSoilModeChange,
  soilPh,
  onSoilPhChange,
  soilEc,
  onSoilEcChange,
  soilOm,
  onSoilOmChange,
  soilClay,
  onSoilClayChange,
  soilSand,
  onSoilSandChange,
  soilSilt,
  onSoilSiltChange,
  soilPdfFile,
  onSoilPdfFileChange,
  irrigationMode,
  onIrrigationModeChange,
  irrigationAvailability,
  onIrrigationAvailabilityChange,
  waterQualityEntered,
  onWaterQualityEnteredChange,
  waterEc,
  onWaterEcChange,
  waterSar,
  onWaterSarChange,
  waterPh,
  onWaterPhChange,
  irrigationPdfFile,
  onIrrigationPdfFileChange,
  disabled,
}: {
  soilMode: ManualSoilMode
  onSoilModeChange: (mode: ManualSoilMode) => void
  soilPh: string
  onSoilPhChange: (value: string) => void
  soilEc: string
  onSoilEcChange: (value: string) => void
  soilOm: string
  onSoilOmChange: (value: string) => void
  soilClay: string
  onSoilClayChange: (value: string) => void
  soilSand: string
  onSoilSandChange: (value: string) => void
  soilSilt: string
  onSoilSiltChange: (value: string) => void
  soilPdfFile: File | null
  onSoilPdfFileChange: (file: File | null) => void
  irrigationMode: ManualIrrigationMode
  onIrrigationModeChange: (mode: ManualIrrigationMode) => void
  irrigationAvailability: IrrigationAvailability
  onIrrigationAvailabilityChange: (value: IrrigationAvailability) => void
  waterQualityEntered: boolean
  onWaterQualityEnteredChange: (value: boolean) => void
  waterEc: string
  onWaterEcChange: (value: string) => void
  waterSar: string
  onWaterSarChange: (value: string) => void
  waterPh: string
  onWaterPhChange: (value: string) => void
  irrigationPdfFile: File | null
  onIrrigationPdfFileChange: (file: File | null) => void
  disabled?: boolean
}) {
  const [soilOpen, setSoilOpen] = useState(soilMode !== 'skip')
  const [irrigationOpen, setIrrigationOpen] = useState(irrigationMode !== 'skip')

  return (
    <div className="tai2-optional-data">
      <p className="tai2-optional-data-note">
        Bu bilgiler analiz güvenini artırır; analiz başlatmak için zorunlu değildir.
      </p>

      <AccordionSection
        icon={Layers}
        title="Toprak analizi"
        summary={formatSoilModeShort(soilMode)}
        open={soilOpen}
        onToggle={() => setSoilOpen((value) => !value)}
      >
        <p className="tai2-accordion-hint">
          Laboratuvar PDF’inizi yükleyin veya pH / EC / organik madde / tekstür değerlerini elle girin.
          İkisi de yoksa SoilGrids model tahminiyle devam edilir.
        </p>
        <ModeChoiceRow
          name="tai2-soil-mode"
          disabled={disabled}
          value={soilMode}
          onChange={(mode) => {
            onSoilModeChange(mode as ManualSoilMode)
            if (mode === 'skip') onSoilPdfFileChange(null)
          }}
          options={[
            { value: 'pdf', label: 'PDF yükle (lab raporu)' },
            { value: 'enter', label: 'Değerleri elle gir' },
            { value: 'skip', label: 'Yoksa devam et (SoilGrids)' },
          ]}
        />

        {soilMode === 'pdf' ? (
          <PdfUploadField
            title="Toprak analizi PDF yükle"
            hint="Laboratuvar raporunu PDF olarak ekleyin. Analiz kaydına bağlanır."
            file={soilPdfFile}
            onFileChange={onSoilPdfFileChange}
            disabled={disabled}
          />
        ) : null}

        {soilMode === 'enter' ? (
          <div className="tai2-field-grid">
            <label>
              pH
              <input
                inputMode="decimal"
                value={soilPh}
                onChange={(event) => onSoilPhChange(event.target.value)}
                placeholder="ör. 7.2"
                disabled={disabled}
              />
            </label>
            <label>
              EC (dS/m)
              <input
                inputMode="decimal"
                value={soilEc}
                onChange={(event) => onSoilEcChange(event.target.value)}
                placeholder="ör. 1.1"
                disabled={disabled}
              />
            </label>
            <label>
              Organik madde (%)
              <input
                inputMode="decimal"
                value={soilOm}
                onChange={(event) => onSoilOmChange(event.target.value)}
                placeholder="ör. 1.8"
                disabled={disabled}
              />
            </label>
            <label>
              Kil (%)
              <input
                inputMode="decimal"
                value={soilClay}
                onChange={(event) => onSoilClayChange(event.target.value)}
                disabled={disabled}
              />
            </label>
            <label>
              Kum (%)
              <input
                inputMode="decimal"
                value={soilSand}
                onChange={(event) => onSoilSandChange(event.target.value)}
                disabled={disabled}
              />
            </label>
            <label>
              Silt (%)
              <input
                inputMode="decimal"
                value={soilSilt}
                onChange={(event) => onSoilSiltChange(event.target.value)}
                disabled={disabled}
              />
            </label>
          </div>
        ) : null}
      </AccordionSection>

      <AccordionSection
        icon={Droplets}
        title="Sulama suyu analizi"
        summary={formatIrrigationModeShort(irrigationMode)}
        open={irrigationOpen}
        onToggle={() => setIrrigationOpen((value) => !value)}
      >
        <p className="tai2-accordion-hint">
          Su analizi PDF’inizi yükleyin veya mevcudiyet + isteğe bağlı EC / SAR / pH değerlerini elle
          girin. Yoksa su kalitesi skorlara dahil edilmez.
        </p>
        <ModeChoiceRow
          name="tai2-irrigation-mode"
          disabled={disabled}
          value={irrigationMode}
          onChange={(mode) => {
            onIrrigationModeChange(mode as ManualIrrigationMode)
            if (mode === 'skip') onIrrigationPdfFileChange(null)
          }}
          options={[
            { value: 'pdf', label: 'PDF yükle (su analizi)' },
            { value: 'enter', label: 'Değerleri elle gir' },
            { value: 'skip', label: 'Yoksa devam et' },
          ]}
        />

        {irrigationMode === 'pdf' ? (
          <PdfUploadField
            title="Sulama suyu analizi PDF yükle"
            hint="Su analizi raporunu PDF olarak ekleyin. Analiz kaydına bağlanır."
            file={irrigationPdfFile}
            onFileChange={onIrrigationPdfFileChange}
            disabled={disabled}
          />
        ) : null}

        {irrigationMode === 'enter' ? (
          <div className="tai2-field-grid">
            <label className="tai2-field-full">
              Sulama suyu mevcudiyeti
              <select
                value={irrigationAvailability}
                onChange={(event) => onIrrigationAvailabilityChange(event.target.value as IrrigationAvailability)}
                disabled={disabled}
              >
                <option value="unknown">{formatIrrigationAvailability('unknown')}</option>
                <option value="unavailable">{formatIrrigationAvailability('unavailable')}</option>
                <option value="available_limited">{formatIrrigationAvailability('available_limited')}</option>
                <option value="available_and_sufficient">
                  {formatIrrigationAvailability('available_and_sufficient')}
                </option>
              </select>
            </label>
            <label className="tai2-field-full tai2-checkbox-field">
              <input
                type="checkbox"
                checked={waterQualityEntered}
                onChange={(event) => onWaterQualityEnteredChange(event.target.checked)}
                disabled={disabled}
              />
              Su kalitesi değerlerini de gir (EC / SAR / pH)
            </label>
            {waterQualityEntered ? (
              <>
                <label>
                  EC (dS/m)
                  <input
                    inputMode="decimal"
                    value={waterEc}
                    onChange={(event) => onWaterEcChange(event.target.value)}
                    disabled={disabled}
                  />
                </label>
                <label>
                  SAR
                  <input
                    inputMode="decimal"
                    value={waterSar}
                    onChange={(event) => onWaterSarChange(event.target.value)}
                    disabled={disabled}
                  />
                </label>
                <label>
                  pH
                  <input
                    inputMode="decimal"
                    value={waterPh}
                    onChange={(event) => onWaterPhChange(event.target.value)}
                    disabled={disabled}
                  />
                </label>
              </>
            ) : null}
          </div>
        ) : null}
      </AccordionSection>
    </div>
  )
}
