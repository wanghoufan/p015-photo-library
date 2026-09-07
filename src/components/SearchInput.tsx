import { Search, X } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({ value, onChange, placeholder = '搜索作品名、地点、标签…' }: SearchInputProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gallery-500" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="focus-ring w-full rounded-lg border border-gallery-800 bg-gallery-900 py-2 pl-9 pr-8 text-sm text-gallery-200 placeholder:text-gallery-600 focus:border-gallery-600"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gallery-500 hover:text-gallery-300"
          aria-label="清除搜索"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
