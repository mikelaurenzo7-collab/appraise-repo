import { useState, useRef, useEffect, useCallback } from "react";
import { MapPin } from "lucide-react";

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
  placeholder?: string;
}

// Google Autocomplete "session token": groups the typing lifecycle into one
// billable unit and widens result diversity. Regenerated after each selection.
function newSessionToken(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const DEBOUNCE_MS = 180;

export function AddressAutocomplete({ value, onChange, placeholder = "Enter property address..." }: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const sessionTokenRef = useRef<string>(newSessionToken());

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const fetchSuggestions = useCallback(async (input: string) => {
    const id = ++requestIdRef.current;
    try {
      const response = await fetch("/api/places-autocomplete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, sessionToken: sessionTokenRef.current }),
      });
      if (!response.ok) return;
      const data = await response.json();
      // Drop stale responses so a slow earlier request can't overwrite newer results.
      if (id !== requestIdRef.current) return;
      setSuggestions(data.predictions || []);
      setIsOpen(true);
    } catch (error) {
      console.error("Autocomplete error:", error);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    onChange(input);
    setSelectedIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (input.length < 3) {
      requestIdRef.current++;
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(input);
    }, DEBOUNCE_MS);
  };

  const handleSelectSuggestion = (suggestion: string) => {
    onChange(suggestion);
    setSuggestions([]);
    setIsOpen(false);
    // Google bills per-session; rotate the token after each successful pick.
    sessionTokenRef.current = newSessionToken();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7C3AED] w-5 h-5" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => value.length >= 3 && suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-3 rounded-lg border border-[#E2E8F0] bg-white text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls="address-autocomplete-listbox"
          role="combobox"
        />
      </div>

      {isOpen && suggestions.length > 0 && (
        <div
          id="address-autocomplete-listbox"
          role="listbox"
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E2E8F0] rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion}-${index}`}
              type="button"
              role="option"
              aria-selected={index === selectedIndex}
              onClick={() => handleSelectSuggestion(suggestion)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`w-full text-left px-4 py-3 hover:bg-[#F1F5F9] transition-colors ${
                index === selectedIndex ? "bg-[#7C3AED] text-white" : "text-[#0F172A]"
              }`}
            >
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{suggestion}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
