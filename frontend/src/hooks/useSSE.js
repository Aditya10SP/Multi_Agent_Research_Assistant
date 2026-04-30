import { useState, useEffect, useRef } from 'react';

export const useSSE = () => {
  const [events, setEvents] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const eventSourceRef = useRef(null);

  const connect = (jobId) => {
    const eventSource = new EventSource(`http://localhost:8000/research/${jobId}/status`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setEvents(prev => [...prev, data]);
      } catch (err) {
        console.error('Failed to parse SSE event:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE connection error:', err);
      setError(new Error('SSE connection failed'));
      disconnect();
    };

    eventSourceRef.current = eventSource;
    setIsConnected(true);
  };

  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
  };

  const reset = () => {
    setEvents([]);
    setError(null);
  };

  useEffect(() => {
    return () => disconnect();
  }, []);

  return { events, isConnected, error, connect, disconnect, reset };
};
