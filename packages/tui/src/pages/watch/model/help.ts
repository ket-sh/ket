import { useState } from 'react';

export interface Help {
  on: boolean;
  open: () => void;
  close: () => void;
}

export function useHelp(): Help {
  const [on, setOn] = useState(false);

  return {
    on,
    open: () => {
      setOn(true);
    },
    close: () => {
      setOn(false);
    },
  };
}
