import { Search, X } from 'lucide-react'

type ListSearchProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  resultCount?: number
  totalCount?: number
}

export function ListSearch({
  value,
  onChange,
  placeholder = 'Ara…',
  resultCount,
  totalCount,
}: ListSearchProps) {
  const showMeta =
    value.trim().length > 0 &&
    resultCount !== undefined &&
    totalCount !== undefined

  return (
    <div className="list-search">
      <Search className="list-search-icon" size={16} aria-hidden />
      <input
        type="search"
        className="list-search-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      {value ? (
        <button
          type="button"
          className="list-search-clear"
          onClick={() => onChange('')}
          aria-label="Aramayı temizle"
        >
          <X size={14} />
        </button>
      ) : null}
      {showMeta ? (
        <span className="list-search-meta">
          {resultCount} / {totalCount}
        </span>
      ) : null}
    </div>
  )
}
