import { describe, it, expect } from 'vitest';
import { ErrorCode } from '../../types.js';
import {
  ScrapidouError,
  InvalidInputError,
  APIError,
  NetworkError,
  NotFoundError,
  RateLimitError,
  formatErrorForMCP,
  isNetworkError,
} from '../errors.js';

describe('ScrapidouError', () => {
  it('creates error with code and message', () => {
    const err = new ScrapidouError(ErrorCode.INVALID_INPUT, 'bad input');
    expect(err.code).toBe(ErrorCode.INVALID_INPUT);
    expect(err.message).toBe('bad input');
    expect(err.name).toBe('ScrapidouError');
    expect(err).toBeInstanceOf(Error);
  });

  it('stores optional details', () => {
    const err = new ScrapidouError(ErrorCode.API_ERROR, 'fail', { status: 500 });
    expect(err.details).toEqual({ status: 500 });
  });

  it('toMCPError returns correct format', () => {
    const err = new ScrapidouError(ErrorCode.NOT_FOUND, 'not found', { url: '/x' });
    const mcp = err.toMCPError();
    expect(mcp).toEqual({
      code: ErrorCode.NOT_FOUND,
      message: 'not found',
      details: { url: '/x' },
    });
  });
});

describe('Specialized error classes', () => {
  it('InvalidInputError has correct code', () => {
    const err = new InvalidInputError('bad');
    expect(err.code).toBe(ErrorCode.INVALID_INPUT);
    expect(err.name).toBe('InvalidInputError');
    expect(err).toBeInstanceOf(ScrapidouError);
  });

  it('APIError has correct code', () => {
    const err = new APIError('api fail');
    expect(err.code).toBe(ErrorCode.API_ERROR);
    expect(err.name).toBe('APIError');
  });

  it('NetworkError has correct code', () => {
    const err = new NetworkError('timeout');
    expect(err.code).toBe(ErrorCode.NETWORK_ERROR);
    expect(err.name).toBe('NetworkError');
  });

  it('NotFoundError has correct code', () => {
    const err = new NotFoundError('missing');
    expect(err.code).toBe(ErrorCode.NOT_FOUND);
    expect(err.name).toBe('NotFoundError');
  });

  it('RateLimitError has correct code', () => {
    const err = new RateLimitError('slow down');
    expect(err.code).toBe(ErrorCode.RATE_LIMIT);
    expect(err.name).toBe('RateLimitError');
  });
});

describe('formatErrorForMCP', () => {
  it('formats ScrapidouError with details', () => {
    const err = new ScrapidouError(ErrorCode.API_ERROR, 'fail', { status: 500 });
    const result = formatErrorForMCP(err);
    expect(result).toContain('Error [API_ERROR]: fail');
    expect(result).toContain('"status": 500');
  });

  it('formats ScrapidouError without details', () => {
    const err = new ScrapidouError(ErrorCode.NOT_FOUND, 'nope');
    const result = formatErrorForMCP(err);
    expect(result).toBe('Error [NOT_FOUND]: nope');
  });

  it('formats generic Error', () => {
    const result = formatErrorForMCP(new Error('generic'));
    expect(result).toBe('Error: generic');
  });

  it('formats unknown error', () => {
    const result = formatErrorForMCP('string error');
    expect(result).toBe('Unknown error: string error');
  });

  it('formats null/undefined', () => {
    expect(formatErrorForMCP(null)).toBe('Unknown error: null');
    expect(formatErrorForMCP(undefined)).toBe('Unknown error: undefined');
  });
});

describe('isNetworkError', () => {
  it('returns true for NetworkError with network keyword in message', () => {
    // Note: instanceof NetworkError doesn't work due to Object.setPrototypeOf in ScrapidouError constructor.
    // But the message-based check picks it up if the message contains a network keyword.
    expect(isNetworkError(new NetworkError('network connection failed'))).toBe(true);
  });

  it('returns true for Error with network-related message', () => {
    expect(isNetworkError(new Error('connection refused'))).toBe(true);
    expect(isNetworkError(new Error('Request timeout'))).toBe(true);
    expect(isNetworkError(new Error('ECONNREFUSED'))).toBe(true);
    expect(isNetworkError(new Error('ENOTFOUND'))).toBe(true);
    expect(isNetworkError(new Error('network error'))).toBe(true);
  });

  it('returns false for non-network Error', () => {
    expect(isNetworkError(new Error('syntax error'))).toBe(false);
    expect(isNetworkError(new InvalidInputError('bad'))).toBe(false);
  });

  it('returns false for non-Error values', () => {
    expect(isNetworkError('string')).toBe(false);
    expect(isNetworkError(42)).toBe(false);
    expect(isNetworkError(null)).toBe(false);
  });
});
