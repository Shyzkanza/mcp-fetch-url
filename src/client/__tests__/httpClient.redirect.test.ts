import { describe, it, expect, vi, beforeEach } from 'vitest';

// Le site public est simulé : il redirige vers une adresse interne.
const fetchMock = vi.hoisted(() => vi.fn());
vi.mock('undici', async (importOriginal) => ({
  ...(await importOriginal<typeof import('undici')>()),
  fetch: fetchMock,
}));

import { fetchPage } from '../httpClient.js';

beforeEach(() => {
  fetchMock.mockReset();
});

describe('fetchPage — redirections', () => {
  it.each([
    'http://169.254.169.254/latest/meta-data/',
    'http://[::1]:3000/admin',
    'file:///etc/passwd',
  ])('does not follow a redirection to %s', async (location) => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 302, headers: { location } }));
    await expect(fetchPage('https://public.example/', 5000)).rejects.toThrow(/Blocked URL|Invalid URL protocol/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('follows a redirection to a public address', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 301, headers: { location: '/fr/' } }))
      .mockResolvedValueOnce(
        new Response('<html><body>ok</body></html>', { status: 200, headers: { 'content-type': 'text/html' } })
      );
    const page = await fetchPage('https://public.example/', 5000);
    expect(page.finalUrl).toBe('https://public.example/fr/');
    expect(page.html).toContain('ok');
  });
});
