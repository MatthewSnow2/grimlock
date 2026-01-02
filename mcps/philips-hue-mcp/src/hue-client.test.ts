import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HueClient, HueLight, HueApiResponse } from './hue-client.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('HueClient', () => {
  let client: HueClient;
  const bridgeIp = '192.168.1.100';
  const apiKey = 'test-api-key';

  beforeEach(() => {
    client = new HueClient(bridgeIp, apiKey);
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create a client with the correct base URL', () => {
      const testClient = new HueClient('10.0.0.1', 'my-key');
      expect(testClient).toBeInstanceOf(HueClient);
    });
  });

  describe('getLights', () => {
    it('should return all lights from the bridge', async () => {
      const mockLights: Record<string, Omit<HueLight, 'id'>> = {
        '1': {
          name: 'Living Room',
          state: { on: true, bri: 254, reachable: true },
          type: 'Extended color light',
          modelid: 'LCT001',
        },
        '2': {
          name: 'Bedroom',
          state: { on: false, bri: 100, reachable: true },
          type: 'Extended color light',
          modelid: 'LCT001',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockLights),
      });

      const lights = await client.getLights();

      expect(mockFetch).toHaveBeenCalledWith(`http://${bridgeIp}/api/${apiKey}/lights`);
      expect(lights).toEqual(mockLights);
    });

    it('should throw an error for non-OK response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(client.getLights()).rejects.toThrow('Failed to get lights: 500 Internal Server Error');
    });

    it('should throw an error for API error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ error: { description: 'unauthorized user' } }]),
      });

      await expect(client.getLights()).rejects.toThrow('Hue API error: unauthorized user');
    });
  });

  describe('getLight', () => {
    it('should return a specific light by ID', async () => {
      const mockLight = {
        name: 'Kitchen',
        state: { on: true, bri: 200, reachable: true },
        type: 'Extended color light',
        modelid: 'LCT001',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockLight),
      });

      const light = await client.getLight('3');

      expect(mockFetch).toHaveBeenCalledWith(`http://${bridgeIp}/api/${apiKey}/lights/3`);
      expect(light).toEqual({ ...mockLight, id: '3' });
    });

    it('should throw an error for non-existent light', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ error: { description: 'resource, /lights/99, not available' } }]),
      });

      await expect(client.getLight('99')).rejects.toThrow('Hue API error: resource, /lights/99, not available');
    });
  });

  describe('setLightState', () => {
    it('should set light state successfully', async () => {
      const mockResponse: HueApiResponse[] = [
        { success: { '/lights/1/state/on': true } },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const response = await client.setLightState('1', { on: true });

      expect(mockFetch).toHaveBeenCalledWith(
        `http://${bridgeIp}/api/${apiKey}/lights/1/state`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ on: true }),
        }
      );
      expect(response).toEqual(mockResponse);
    });

    it('should handle setting multiple state properties', async () => {
      const mockResponse: HueApiResponse[] = [
        { success: { '/lights/1/state/on': true } },
        { success: { '/lights/1/state/bri': 150 } },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const response = await client.setLightState('1', { on: true, bri: 150 });

      expect(response).toEqual(mockResponse);
    });

    it('should throw error for failed state change', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });

      await expect(client.setLightState('1', { on: true })).rejects.toThrow('Failed to set light state: 400 Bad Request');
    });
  });

  describe('turnOn', () => {
    it('should turn a light on', async () => {
      const mockResponse: HueApiResponse[] = [{ success: { '/lights/1/state/on': true } }];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const response = await client.turnOn('1');

      expect(mockFetch).toHaveBeenCalledWith(
        `http://${bridgeIp}/api/${apiKey}/lights/1/state`,
        expect.objectContaining({
          body: JSON.stringify({ on: true }),
        })
      );
      expect(response).toEqual(mockResponse);
    });
  });

  describe('turnOff', () => {
    it('should turn a light off', async () => {
      const mockResponse: HueApiResponse[] = [{ success: { '/lights/1/state/on': false } }];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const response = await client.turnOff('1');

      expect(mockFetch).toHaveBeenCalledWith(
        `http://${bridgeIp}/api/${apiKey}/lights/1/state`,
        expect.objectContaining({
          body: JSON.stringify({ on: false }),
        })
      );
      expect(response).toEqual(mockResponse);
    });
  });

  describe('toggle', () => {
    it('should toggle a light from off to on', async () => {
      const mockLight = {
        name: 'Test Light',
        state: { on: false, reachable: true },
        type: 'Extended color light',
        modelid: 'LCT001',
      };
      const mockStateResponse: HueApiResponse[] = [{ success: { '/lights/1/state/on': true } }];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockLight),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockStateResponse),
        });

      const result = await client.toggle('1');

      expect(result.previousState).toBe(false);
      expect(result.newState).toBe(true);
      expect(result.response).toEqual(mockStateResponse);
    });

    it('should toggle a light from on to off', async () => {
      const mockLight = {
        name: 'Test Light',
        state: { on: true, reachable: true },
        type: 'Extended color light',
        modelid: 'LCT001',
      };
      const mockStateResponse: HueApiResponse[] = [{ success: { '/lights/1/state/on': false } }];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockLight),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockStateResponse),
        });

      const result = await client.toggle('1');

      expect(result.previousState).toBe(true);
      expect(result.newState).toBe(false);
    });
  });

  describe('turnAllOn', () => {
    it('should turn all lights on', async () => {
      const mockLights = {
        '1': { name: 'Light 1', state: { on: false, reachable: true }, type: 'light', modelid: 'LCT001' },
        '2': { name: 'Light 2', state: { on: false, reachable: true }, type: 'light', modelid: 'LCT001' },
      };
      const mockResponse: HueApiResponse[] = [{ success: { '/lights/1/state/on': true } }];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockLights),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

      const results = await client.turnAllOn();

      expect(results).toHaveLength(2);
      expect(results[0].lightId).toBe('1');
      expect(results[1].lightId).toBe('2');
    });
  });

  describe('turnAllOff', () => {
    it('should turn all lights off', async () => {
      const mockLights = {
        '1': { name: 'Light 1', state: { on: true, reachable: true }, type: 'light', modelid: 'LCT001' },
        '2': { name: 'Light 2', state: { on: true, reachable: true }, type: 'light', modelid: 'LCT001' },
      };
      const mockResponse: HueApiResponse[] = [{ success: { '/lights/1/state/on': false } }];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockLights),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

      const results = await client.turnAllOff();

      expect(results).toHaveLength(2);
    });
  });

  describe('toggleAll', () => {
    it('should toggle all lights', async () => {
      const mockLights = {
        '1': { name: 'Light 1', state: { on: true, reachable: true }, type: 'light', modelid: 'LCT001' },
        '2': { name: 'Light 2', state: { on: false, reachable: true }, type: 'light', modelid: 'LCT001' },
      };
      const mockResponse: HueApiResponse[] = [{ success: {} }];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockLights),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

      const results = await client.toggleAll();

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ lightId: '1', previousState: true, newState: false });
      expect(results[1]).toEqual({ lightId: '2', previousState: false, newState: true });
    });
  });
});
