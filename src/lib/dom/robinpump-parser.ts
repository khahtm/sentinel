import type { TokenCardData } from '../../types';

/** Regex to match Ethereum addresses */
const ADDRESS_REGEX = /0x[a-fA-F0-9]{40}/;

/**
 * Find all token card elements on the current RobinPump page.
 *
 * RobinPump main page DOM structure:
 *   <a href="/project/0xTOKEN_ADDRESS">
 *     <div class="bg-card ...">card content</div>
 *   </a>
 *
 * The token address is in the parent <a> href, not inside the card.
 */
export function findTokenCards(): TokenCardData[] {
  const cards: TokenCardData[] = [];

  // Strategy 1: Find links to /project/0x... pages (main listing page pattern)
  const projectLinks = document.querySelectorAll<HTMLAnchorElement>(
    'a[href*="/project/0x"]'
  );

  for (const link of projectLinks) {
    const href = link.getAttribute('href') ?? '';
    const match = href.match(ADDRESS_REGEX);
    if (!match) continue;

    // Use the .bg-card child as injection target, or the link itself
    const cardEl = link.querySelector<HTMLElement>('.bg-card') ?? link;

    cards.push({
      tokenAddress: match[0] as `0x${string}`,
      creatorAddress: undefined,
      element: cardEl,
    });
  }

  if (cards.length > 0) return deduplicateCards(cards);

  // Strategy 2: Find .bg-card elements that are inside links with 0x addresses
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
    });
  }

  if (cards.length > 0) return deduplicateCards(cards);

  // Strategy 3: Find .bg-card elements and check parent/ancestor links
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
    });
  }

  return deduplicateCards(cards);
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
