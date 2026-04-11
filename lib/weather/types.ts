/**
 * Weather data types and interfaces
 */

export interface WeatherData {
  temperature: number | null
  conditions: 'rain' | 'snow' | 'clear' | 'cloudy' | 'unknown'
  precipitation: number | null
  cachedAt: Date
}

export interface WeatherDataWithMetadata extends WeatherData {
  isCached: boolean
  cacheAge: number // in milliseconds
}

export interface OpenWeatherMapResponse {
  current?: {
    temp: number
    weather: Array<{
      main: string
      description: string
    }>
    rain?: {
      '1h'?: number
    }
    snow?: {
      '1h'?: number
    }
  }
  daily?: Array<{
    dt: number
    temp: {
      day: number
    }
    weather: Array<{
      main: string
      description: string
    }>
    rain?: number
    snow?: number
  }>
}

/**
 * Error codes for weather API operations
 */
export enum WeatherErrorCode {
  API_ERROR = 'WEATHER_API_ERROR',
  CACHE_ERROR = 'WEATHER_CACHE_ERROR',
  INVALID_PARAMS = 'WEATHER_INVALID_PARAMS',
  RATE_LIMIT = 'WEATHER_RATE_LIMIT',
  TIMEOUT = 'WEATHER_TIMEOUT',
}

export class WeatherError extends Error {
  constructor(
    public code: WeatherErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'WeatherError'
  }
}
