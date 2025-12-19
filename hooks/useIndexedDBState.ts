import { useState, useEffect, useCallback, useRef } from 'react';
import * as db from '../utils/db';

// Define types for functional updates, similar to React's own types.
type SetStateAction<S> = S | ((prevState: S) => S);
type Dispatch<A> = (value: A) => void;

const DB_CHANGE_EVENT = 'indexeddb-change';

export function useIndexedDBState<T>(key: string | null, defaultValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(defaultValue);
  
  const loadIdRef = useRef(0);

  // A simple queue to handle rapid writes and prevent race conditions.
  const writeQueueRef = useRef<(() => Promise<any>)[]>([]);
  const isWritingRef = useRef(false);

  // Effect to load data from DB initially and listen for changes across components.
  useEffect(() => {
    if (!key) {
      setValue(defaultValue);
      return;
    }

    const currentLoadId = ++loadIdRef.current;
    
    const loadValue = () => {
        db.get(key).then(storedValue => {
            // Only update state if this is the most recent load request.
            if (currentLoadId === loadIdRef.current) {
                if (storedValue !== undefined && storedValue !== null) {
                    setValue(storedValue);
                } else {
                    setValue(defaultValue);
                }
            }
        }).catch(err => {
            console.error(`Failed to load key "${key}" from IndexedDB`, err);
            if (currentLoadId === loadIdRef.current) {
                setValue(defaultValue);
            }
        });
    };
    
    // Initial load
    loadValue();

    // Event handler for cross-component updates
    const handleDbChange = (event: CustomEvent) => {
        if (event.detail.key === key) {
            // A change happened for our key, reload the value.
            loadValue();
        }
    };

    window.addEventListener(DB_CHANGE_EVENT, handleDbChange as EventListener);

    // Cleanup function to remove the event listener
    return () => {
        window.removeEventListener(DB_CHANGE_EVENT, handleDbChange as EventListener);
    };
  }, [key, defaultValue]);

  // The setter function returned by the hook.
  const setStoredValue = useCallback((newValue: SetStateAction<T>) => {
    if (!key) return;
    
    // This immediately updates the local state for a responsive UI.
    setValue(prevValue => {
        const finalValue = typeof newValue === 'function'
            ? (newValue as (prevState: T) => T)(prevValue)
            : newValue;
        
        // This function processes the next item in the write queue.
        const processQueue = () => {
            if (isWritingRef.current || writeQueueRef.current.length === 0) {
                return;
            }
            isWritingRef.current = true;
            const writeTask = writeQueueRef.current.shift();

            if (writeTask) {
                writeTask().finally(() => {
                    isWritingRef.current = false;
                    processQueue(); // Process the next item
                });
            }
        };

        // The actual task to write to DB and notify other components.
        const task = () => db.set(key, finalValue)
            .then(() => {
                // On successful write, dispatch an event to notify other instances of the hook.
                window.dispatchEvent(new CustomEvent(DB_CHANGE_EVENT, { detail: { key } }));
            })
            .catch(err => console.error(`Failed to save key "${key}" to IndexedDB`, err));
        
        // Add the write operation to the queue.
        writeQueueRef.current.push(task);
        
        // Start processing the queue if it's not already running.
        processQueue();
        
        return finalValue;
    });
  }, [key]);

  return [value, setStoredValue];
}
