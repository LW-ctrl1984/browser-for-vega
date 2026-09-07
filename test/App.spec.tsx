import {normalizeAddress} from '../src/navigation';

describe('normalizeAddress', () => {
  it('keeps complete web addresses', () => {
    expect(normalizeAddress('https://www.bilibili.com/video/BV1')).toBe(
      'https://www.bilibili.com/video/BV1',
    );
  });

  it('adds HTTPS to a host name', () => {
    expect(normalizeAddress('www.bilibili.com')).toBe(
      'https://www.bilibili.com',
    );
  });

  it('uses Google for search text', () => {
    expect(normalizeAddress('Vega OS 浏览器')).toBe(
      'https://www.google.com/search?q=Vega%20OS%20%E6%B5%8F%E8%A7%88%E5%99%A8',
    );
  });
});
