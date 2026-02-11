import type { TokenCardData } from '../../types';

/** Regex to match Ethereum addresses */
const ADDRESS_REGEX = /0x[a-fA-F0-9]{40}/;

/**
 * Find all token card elements on the current RobinPump page.
 * Extracts token address from href and market cap from visible text.
 */
export function findTokenCards(): TokenCardData[] {
  const cards: TokenCardData[] = [];

  // Strategy 1: Find links to /project/0x... pages
  const projectLinks = document.querySelectorAll<HTMLAnchorElement>(
    'a[href*="/project/0x"]'
  );

  for (const link of projectLinks) {
    const href = link.getAttribute('href') ?? '';
    const match = href.match(ADDRESS_REGEX);
    if (!match) continue;

    const cardEl = link.querySelector<HTMLElement>('.bg-card') ?? link;

    cards.push({
      tokenAddress: match[0] as `0x${string}`,
      creatorAddress: undefined,
      element: cardEl,
      marketCapUsd: parseDomMarketCap(cardEl),
    });
  }

  if (cards.length > 0) return deduplicateCards(cards);

  // Strategy 2: Find links with 0x addresses
  const allLinks = document.querySelectorAll<HTMLAnchorElement>('a[href*="0x"]');
  for (const link of allLinks) {
    const href = link.getAttribute('href') ?? '';
    const match = href.match(ADDRESS_REGEX);
    if (!match) continue;

    const cardEl = link.querySelector<HTMLElement>('.bg-card') ?? link;

    cards.push({
      tokenAddress: match[0] as `0x${string}`,
      creatorAddress: undefined,
      element: cardEl,
      marketCapUsd: parseDomMarketCap(cardEl),
    });
  }

  if (cards.length > 0) return deduplicateCards(cards);

  // Strategy 3: Find .bg-card elements with ancestor links
  const bgCards = document.querySelectorAll<HTMLElement>('.bg-card');
  for (const card of bgCards) {
    const parentLink = card.closest<HTMLAnchorElement>('a[href*="0x"]');
    if (!parentLink) continue;

    const href = parentLink.getAttribute('href') ?? '';
    const match = href.match(ADDRESS_REGEX);
    if (!match) continue;

    cards.push({
      tokenAddress: match[0] as `0x${string}`,
      creatorAddress: undefined,
      element: card,
      marketCapUsd: parseDomMarketCap(card),
    });
  }

  return deduplicateCards(cards);
}

/**
 * Parse market cap from card's visible text.
 * Looks for dollar amounts like "$1.2K", "$50", "$1.2M" and returns the largest.
 */
function parseDomMarketCap(element: HTMLElement): number | undefined {
  const text = element.textContent ?? '';
  const matches = text.match(/\$\s*([\d,.]+)\s*([KMBkmb])?/g);
  if (!matches || matches.length === 0) return undefined;

  let maxValue = 0;
  for (const m of matches) {
    const parsed = parseDollarString(m);
    if (parsed > maxValue) maxValue = parsed;
  }
  return maxValue > 0 ? maxValue : undefined;
}

/** Parse a dollar string like "$1.2K" → 1200 */
function parseDollarString(s: string): number {
  const match = s.match(/\$\s*([\d,.]+)\s*([KMBkmb])?/);
  if (!match) return 0;
  let num = parseFloat(match[1].replace(/,/g, ''));
  const suffix = (match[2] || '').toUpperCase();
  if (suffix === 'K') num *= 1_000;
  else if (suffix === 'M') num *= 1_000_000;
  else if (suffix === 'B') num *= 1_000_000_000;
  return num;
}

/** Remove duplicate cards targeting the same token address */
function deduplicateCards(cards: TokenCardData[]): TokenCardData[] {
  const seen = new Set<string>();
  return cards.filter((card) => {
    if (seen.has(card.tokenAddress)) return false;
    seen.add(card.tokenAddress);
    return true;
  });
}
