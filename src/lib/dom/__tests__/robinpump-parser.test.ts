import { describe, it, expect, beforeEach } from 'vitest';
import { findTokenCards } from '../robinpump-parser';

describe('findTokenCards', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('extracts token address from /project/0x... link wrapping .bg-card', () => {
    document.body.innerHTML = `
      <a href="/project/0x1234567890abcdef1234567890abcdef12345678">
        <div class="bg-card">Token A</div>
      </a>
    `;
    const cards = findTokenCards();
    expect(cards).toHaveLength(1);
    expect(cards[0].tokenAddress).toBe('0x1234567890abcdef1234567890abcdef12345678');
  });

  it('finds multiple token cards on listing page', () => {
    document.body.innerHTML = `
      <a href="/project/0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa">
        <div class="bg-card">Token A</div>
      </a>
      <a href="/project/0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb">
        <div class="bg-card">Token B</div>
      </a>
    `;
    const cards = findTokenCards();
    expect(cards).toHaveLength(2);
  });

  it('returns empty array when no token cards exist', () => {
    document.body.innerHTML = '<div>No tokens here</div>';
    const cards = findTokenCards();
    expect(cards).toHaveLength(0);
  });

  it('deduplicates cards with same token address', () => {
    document.body.innerHTML = `
      <a href="/project/0x1111111111111111111111111111111111111111">
        <div class="bg-card">Link 1</div>
      </a>
      <a href="/project/0x1111111111111111111111111111111111111111">
        <div class="bg-card">Link 2</div>
      </a>
    `;
    const cards = findTokenCards();
    expect(cards).toHaveLength(1);
  });

  it('uses .bg-card child as injection element', () => {
    document.body.innerHTML = `
      <a href="/project/0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa">
        <div class="bg-card">Token</div>
      </a>
    `;
    const cards = findTokenCards();
    expect(cards).toHaveLength(1);
    expect(cards[0].element.classList.contains('bg-card')).toBe(true);
  });
});
