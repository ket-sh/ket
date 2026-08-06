const backing = new Map<string, string>();

const storageBox = {
  getItem: (name: string): string | null => backing.get(name) ?? null,
  setItem: (name: string, value: string): void => {
    backing.set(name, value);
  },
  removeItem: (name: string): void => {
    backing.delete(name);
  },
  clear: (): void => {
    backing.clear();
  },
};

Reflect.set(globalThis, 'localStorage', storageBox);
Reflect.set(window, 'localStorage', storageBox);
