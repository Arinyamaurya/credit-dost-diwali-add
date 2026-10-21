import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_URL } from '../config';

/**
 * useSpots:
 * Custom hook to fetch /api/spots on mount and subscribe to /api/spots/stream via Server-Sent Events (SSE).
 * Falls back to polling every 20s if SSE encounters an error or is unsupported.
 * Exposes: { partner, customer, loading, error, refresh, updateLocalSpots }
 */
export function useSpots() {
  const [spots, setSpots] = useState({
    partner: { claimed: 0, total: 100, remaining: 100, soldOut: false },
    customer: { claimed: 0, total: 100, remaining: 100, soldOut: false },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch from standard REST endpoint
  const fetchSpots = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/spots`);
      if (res.data?.ok) {
        setSpots({
          partner: res.data.partner,
          customer: res.data.customer,
        });
        setError(null);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Immediate local update helper when a submission succeeds
  const updateLocalSpots = useCallback((kind, newKindSpots) => {
    if (!kind || !newKindSpots) return;
    setSpots((prev) => ({
      ...prev,
      [kind]: {
        claimed: newKindSpots.claimed,
        total: newKindSpots.total,
        remaining: newKindSpots.remaining,
        soldOut: newKindSpots.remaining <= 0,
      },
    }));
  }, []);

  useEffect(() => {
    // 1. Initial fetch
    fetchSpots();

    // 2. Setup Server-Sent Events (SSE)
    let eventSource = null;
    let pollInterval = null;

    if (typeof EventSource !== 'undefined') {
      try {
        eventSource = new EventSource(`${API_URL}/api/spots/stream`);

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data?.partner && data?.customer) {
              setSpots({
                partner: data.partner,
                customer: data.customer,
              });
              setError(null);
            }
          } catch {
            // Ignore parse errors on comments/heartbeats
          }
        };

        eventSource.onerror = () => {
          // If SSE connection drops, close and start fallback polling
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          if (!pollInterval) {
            pollInterval = setInterval(fetchSpots, 20000);
          }
        };
      } catch {
        pollInterval = setInterval(fetchSpots, 20000);
      }
    } else {
      // Fallback for environments without EventSource
      pollInterval = setInterval(fetchSpots, 20000);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [fetchSpots]);

  return {
    partner: spots.partner,
    customer: spots.customer,
    loading,
    error,
    refresh: fetchSpots,
    updateLocalSpots,
  };
}
