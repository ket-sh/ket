import { useState } from 'react';

export interface Filter {
  query: string;
  typing: boolean;
  begin: () => void;
  type: (glyph: string) => void;
  erase: () => void;
  keep: () => void;
  clear: () => void;
}

export function useFilter(): Filter {
  const [query, setQuery] = useState('');
  const [typing, setTyping] = useState(false);

  return {
    query,
    typing,
    begin: () => {
      setTyping(true);
    },
    type: (glyph) => {
      setQuery((worn) => worn + glyph);
    },
    erase: () => {
      setQuery((worn) => worn.slice(0, -1));
    },
    keep: () => {
      setTyping(false);
    },
    clear: () => {
      setQuery('');
      setTyping(false);
    },
  };
}
