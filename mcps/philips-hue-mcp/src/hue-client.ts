/**
 * Philips Hue Bridge API Client
 * Handles communication with the Hue Bridge REST API
 */

export interface HueLight {
  id: string;
  name: string;
  state: {
    on: boolean;
    bri?: number;
    hue?: number;
    sat?: number;
    reachable: boolean;
  };
  type: string;
  modelid: string;
}

export interface HueLightState {
  on?: boolean;
  bri?: number;
  hue?: number;
  sat?: number;
  effect?: string;
  alert?: string;
  transitiontime?: number;
}

export interface HueApiResponse {
  success?: Record<string, unknown>;
  error?: {
    type: number;
    address: string;
    description: string;
  };
}

export class HueClient {
  private bridgeIp: string;
  private apiKey: string;
  private baseUrl: string;

  constructor(bridgeIp: string, apiKey: string) {
    this.bridgeIp = bridgeIp;
    this.apiKey = apiKey;
    this.baseUrl = `http://${bridgeIp}/api/${apiKey}`;
  }

  /**
   * Get all lights from the bridge
   */
  async getLights(): Promise<Record<string, HueLight>> {
    const response = await fetch(`${this.baseUrl}/lights`);

    if (!response.ok) {
      throw new Error(`Failed to get lights: ${response.status} ${response.statusText}`);
    }

    const data: unknown = await response.json();

    // Check for API error response
    if (Array.isArray(data) && data[0]?.error) {
      throw new Error(`Hue API error: ${data[0].error.description}`);
    }

    return data as Record<string, HueLight>;
  }

  /**
   * Get a specific light by ID
   */
  async getLight(lightId: string): Promise<HueLight> {
    const response = await fetch(`${this.baseUrl}/lights/${lightId}`);

    if (!response.ok) {
      throw new Error(`Failed to get light ${lightId}: ${response.status} ${response.statusText}`);
    }

    const data: unknown = await response.json();

    if (Array.isArray(data) && data[0]?.error) {
      throw new Error(`Hue API error: ${data[0].error.description}`);
    }

    const lightData = data as Omit<HueLight, 'id'>;
    return { ...lightData, id: lightId };
  }

  /**
   * Set the state of a specific light
   */
  async setLightState(lightId: string, state: HueLightState): Promise<HueApiResponse[]> {
    const response = await fetch(`${this.baseUrl}/lights/${lightId}/state`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(state),
    });

    if (!response.ok) {
      throw new Error(`Failed to set light state: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<HueApiResponse[]>;
  }

  /**
   * Turn a light on
   */
  async turnOn(lightId: string): Promise<HueApiResponse[]> {
    return this.setLightState(lightId, { on: true });
  }

  /**
   * Turn a light off
   */
  async turnOff(lightId: string): Promise<HueApiResponse[]> {
    return this.setLightState(lightId, { on: false });
  }

  /**
   * Toggle a light's on/off state
   */
  async toggle(lightId: string): Promise<{ previousState: boolean; newState: boolean; response: HueApiResponse[] }> {
    const light = await this.getLight(lightId);
    const newState = !light.state.on;
    const response = await this.setLightState(lightId, { on: newState });

    return {
      previousState: light.state.on,
      newState,
      response,
    };
  }

  /**
   * Turn all lights on
   */
  async turnAllOn(): Promise<{ lightId: string; response: HueApiResponse[] }[]> {
    const lights = await this.getLights();
    const results: { lightId: string; response: HueApiResponse[] }[] = [];

    for (const lightId of Object.keys(lights)) {
      const response = await this.turnOn(lightId);
      results.push({ lightId, response });
    }

    return results;
  }

  /**
   * Turn all lights off
   */
  async turnAllOff(): Promise<{ lightId: string; response: HueApiResponse[] }[]> {
    const lights = await this.getLights();
    const results: { lightId: string; response: HueApiResponse[] }[] = [];

    for (const lightId of Object.keys(lights)) {
      const response = await this.turnOff(lightId);
      results.push({ lightId, response });
    }

    return results;
  }

  /**
   * Toggle all lights
   */
  async toggleAll(): Promise<{ lightId: string; previousState: boolean; newState: boolean }[]> {
    const lights = await this.getLights();
    const results: { lightId: string; previousState: boolean; newState: boolean }[] = [];

    for (const [lightId, light] of Object.entries(lights)) {
      const newState = !light.state.on;
      await this.setLightState(lightId, { on: newState });
      results.push({
        lightId,
        previousState: light.state.on,
        newState,
      });
    }

    return results;
  }
}
