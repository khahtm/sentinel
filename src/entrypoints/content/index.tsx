import ReactDOM from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { ScoreBadge } from '../../components/score-badge';
import { DetailSidebarPanelWithFullScoreBreakdown } from '../../components/detail-sidebar-panel-with-full-score-breakdown';
import { ToastNotificationStackContainer } from '../../components/toast-notification-stack-container';
import { findTokenCards } from '../../lib/dom/robinpump-parser';
import { BADGE_HOST_CLASS, OBSERVER_DEBOUNCE_MS } from '../../lib/constants';
import type { ScoreRequest, ScoreResponse, QuickScore, TokenCardData, FullScoreRequest } from '../../types';
import type { FullScore } from '../../types/scoring-types';
import type { TokenAlert } from '../../lib/alerts/alert-types-and-websocket-messages';

/** Global sidebar state */
let sidebarHost: HTMLDivElement | null = null;
let sidebarRoot: Root | null = null;
let currentOpenTokenAddress: string | null = null;

/** Global toast notification state */
let toastHost: HTMLDivElement | null = null;
let toastRoot: Root | null = null;
let activeAlerts: TokenAlert[] = [];

/** Inject a ScoreBadge into a token card's DOM via Shadow DOM */
function injectBadge(
  card: HTMLElement,
  score: QuickScore,
  tokenAddress: string,
  creatorAddress?: string,
  onBadgeClick?: () => void
): void {
  // Skip if badge already injected
  if (card.querySelector(`.${BADGE_HOST_CLASS}`)) return;

  const host = document.createElement('div');
  host.className = BADGE_HOST_CLASS;
  host.style.display = 'inline-block';
  host.style.marginLeft = '4px';

  const shadow = host.attachShadow({ mode: 'closed' });
  const mountPoint = document.createElement('div');
  shadow.appendChild(mountPoint);

  card.appendChild(host);

  ReactDOM.createRoot(mountPoint).render(
    <ScoreBadge
      score={score.score}
      tier={score.tier}
      loading={false}
      onClick={onBadgeClick}
    />
  );
}

/** Inject a loading skeleton badge into a token card */
function injectLoadingBadge(card: HTMLElement): void {
  if (card.querySelector(`.${BADGE_HOST_CLASS}`)) return;

  const host = document.createElement('div');
  host.className = BADGE_HOST_CLASS;
  host.style.display = 'inline-block';
  host.style.marginLeft = '4px';

  const shadow = host.attachShadow({ mode: 'closed' });
  const mountPoint = document.createElement('div');
  shadow.appendChild(mountPoint);

  card.appendChild(host);

  ReactDOM.createRoot(mountPoint).render(
    <ScoreBadge score={0} tier="DANGER" loading={true} />
  );
}

/** Inject a placeholder badge when no creator data is available */
function injectPlaceholderBadge(card: HTMLElement, onClick?: () => void): void {
  if (card.querySelector(`.${BADGE_HOST_CLASS}`)) return;

  const host = document.createElement('div');
  host.className = BADGE_HOST_CLASS;
  host.style.display = 'inline-block';
  host.style.marginLeft = '4px';

  const shadow = host.attachShadow({ mode: 'closed' });
  const mountPoint = document.createElement('div');
  shadow.appendChild(mountPoint);

  // Inject into the ticker row (div.flex.items-center.gap-2) if available
  const tickerRow = card.querySelector('.flex.items-center.gap-2');
  (tickerRow ?? card).appendChild(host);

  const style: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 10px',
    borderRadius: '14px',
    fontSize: '11px',
    fontWeight: 700,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: '#e0e7ff',
    backgroundColor: '#312e81',
    boxShadow: '0 0 8px rgba(99, 102, 241, 0.5)',
    lineHeight: '18px',
    cursor: onClick ? 'pointer' : 'default',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    animation: 'sentinelfi-pulse 2s ease-in-out infinite',
    letterSpacing: '0.3px',
  };

  ReactDOM.createRoot(mountPoint).render(
    <>
      <style>{`
        @keyframes sentinelfi-pulse {
          0%, 100% { box-shadow: 0 0 8px rgba(99, 102, 241, 0.5); }
          50% { box-shadow: 0 0 14px rgba(99, 102, 241, 0.8); }
        }
      `}</style>
      <span style={style} title="Scan with Sentinel" onClick={onClick}>
        🛡 Scan with Sentinel
      </span>
    </>
  );
}

/** Create or get global sidebar host element */
function getSidebarHost(): HTMLDivElement {
  if (!sidebarHost) {
    sidebarHost = document.createElement('div');
    sidebarHost.className = 'sentinelfi-sidebar-host';
    sidebarHost.style.position = 'fixed';
    sidebarHost.style.top = '0';
    sidebarHost.style.right = '0';
    sidebarHost.style.zIndex = '999999';

    const shadow = sidebarHost.attachShadow({ mode: 'open' });
    const mountPoint = document.createElement('div');
    shadow.appendChild(mountPoint);

    document.body.appendChild(sidebarHost);
    sidebarRoot = ReactDOM.createRoot(mountPoint);
  }
  return sidebarHost;
}

/** Open sidebar with full score details */
async function openSidebar(tokenAddress: string, creatorAddress?: string): Promise<void> {
  // Close if already open for this token (toggle behavior)
  if (currentOpenTokenAddress === tokenAddress) {
    closeSidebar();
    return;
  }

  currentOpenTokenAddress = tokenAddress;
  getSidebarHost(); // Ensure sidebar host exists

  // Show loading state immediately
  sidebarRoot?.render(
    <DetailSidebarPanelWithFullScoreBreakdown
      score={null}
      loading={true}
      onClose={closeSidebar}
    />
  );

  // Use token address as fallback when creator address unavailable
  const effectiveCreator = creatorAddress ?? tokenAddress;

  const request: FullScoreRequest = {
    action: 'score-full',
    tokenAddress: tokenAddress as `0x${string}`,
    creatorAddress: effectiveCreator as `0x${string}`,
  };

  try {
    const fullScore: FullScore = await chrome.runtime.sendMessage(request);

    // Only update if still open for this token
    if (currentOpenTokenAddress === tokenAddress) {
      sidebarRoot?.render(
        <DetailSidebarPanelWithFullScoreBreakdown
          score={fullScore}
          loading={false}
          onClose={closeSidebar}
        />
      );
    }
  } catch (err) {
    console.error('[SentinelFi] Failed to fetch full score:', err);
    closeSidebar();
  }
}

/** Close sidebar */
function closeSidebar(): void {
  currentOpenTokenAddress = null;
  sidebarRoot?.render(null);
}

/** Request scores from service worker and inject badges for given cards */
async function scoreAndInjectCards(cards: TokenCardData[]): Promise<void> {
  if (cards.length === 0) return;

  // Phase 1: Show loading skeletons immediately
  for (const card of cards) {
    injectLoadingBadge(card.element);
  }

  // Phase 2: Request quick scores from background service worker
  const request: ScoreRequest = {
    action: 'score-quick',
    tokens: cards.map((c) => ({
      tokenAddress: c.tokenAddress,
      creatorAddress: c.creatorAddress,
    })),
  };

  try {
    const response: ScoreResponse =
      await chrome.runtime.sendMessage(request);

    if (!response || !response.scores) return;

    for (const score of response.scores) {
      const card = cards.find(
        (c) => c.tokenAddress === score.tokenAddress
      );
      if (card) {
        // Remove loading skeleton
        card.element.querySelector(`.${BADGE_HOST_CLASS}`)?.remove();

        const tokenAddress = card.tokenAddress;
        const creatorAddress = card.creatorAddress;

        // Show placeholder badge when no real creator data available
        if (!creatorAddress) {
          injectPlaceholderBadge(card.element, () => openSidebar(tokenAddress));
        } else {
          injectBadge(
            card.element,
            score,
            tokenAddress,
            creatorAddress,
            () => openSidebar(tokenAddress, creatorAddress)
          );
        }
      }
    }

    // Phase 3: Background full scoring for visible tokens
    // Start background full scores for performance data collection
    startBackgroundFullScoring(cards);
  } catch (err) {
    console.error('[SentinelFi] Failed to score tokens:', err);
  }
}

/** Start background full scoring for visible tokens (two-phase rendering) */
async function startBackgroundFullScoring(cards: TokenCardData[]): Promise<void> {
  // Only score visible tokens to avoid overwhelming the service worker
  const visibleCards = cards.filter((card) => isElementVisible(card.element));

  for (const card of visibleCards) {
    if (!card.creatorAddress) continue;

    const request: FullScoreRequest = {
      action: 'score-full',
      tokenAddress: card.tokenAddress,
      creatorAddress: card.creatorAddress,
    };

    try {
      const fullScore: FullScore = await chrome.runtime.sendMessage(request);

      // Update badge with full score
      const host = card.element.querySelector(`.${BADGE_HOST_CLASS}`);
      if (host) {
        // Re-render badge with updated score
        host.remove();
        injectBadge(
          card.element,
          {
            tokenAddress: fullScore.tokenAddress,
            score: fullScore.score,
            tier: fullScore.tier,
            creatorTxCount: 0,
            topHolderPct: 0,
            timestamp: fullScore.timestamp,
          },
          card.tokenAddress,
          card.creatorAddress,
          () => openSidebar(card.tokenAddress, card.creatorAddress)
        );
      }
    } catch (err) {
      // Silently fail background scoring
      console.debug('[SentinelFi] Background full scoring failed:', err);
    }
  }
}

/** Check if element is visible in viewport */
function isElementVisible(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/** Create or get global toast host element */
function getToastHost(): HTMLDivElement {
  if (!toastHost) {
    toastHost = document.createElement('div');
    toastHost.className = 'sentinelfi-toast-host';
    toastHost.style.position = 'fixed';
    toastHost.style.top = '0';
    toastHost.style.right = '0';
    toastHost.style.zIndex = '999998';

    const shadow = toastHost.attachShadow({ mode: 'open' });
    const mountPoint = document.createElement('div');
    shadow.appendChild(mountPoint);

    document.body.appendChild(toastHost);
    toastRoot = ReactDOM.createRoot(mountPoint);
  }
  return toastHost;
}

/** Render toast stack with current alerts */
function renderToasts(): void {
  if (!toastRoot) return;
  toastRoot.render(
    <ToastNotificationStackContainer
      alerts={activeAlerts}
      onDismiss={dismissAlert}
    />
  );
}

/** Show new alert as toast notification */
function showAlert(alert: TokenAlert): void {
  activeAlerts = [alert, ...activeAlerts];
  getToastHost();
  renderToasts();
}

/** Dismiss alert by ID */
function dismissAlert(id: string): void {
  activeAlerts = activeAlerts.filter((a) => a.id !== id);
  renderToasts();
}

/** Setup alert listener for messages from background */
function setupAlertListener(): void {
  chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
    if (message.type === 'ALERT') {
      const alert = message.alert as TokenAlert;
      showAlert(alert);
    }
  });
}

/** Set up MutationObserver to detect new token cards added to the DOM */
function setupObserver(ctx: InstanceType<typeof ContentScriptContext>): void {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let isProcessing = false;

  const observer = new MutationObserver(() => {
    if (isProcessing) return; // Ignore mutations caused by our own badge injection
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      // Skip badge injection on detail pages (SPA navigation may change URL after observer setup)
      if (/\/project\/0x[a-fA-F0-9]{40}/i.test(window.location.pathname)) return;

      isProcessing = true;
      try {
        const allCards = findTokenCards();
        const newCards = allCards.filter(
          (c) => !c.element.querySelector(`.${BADGE_HOST_CLASS}`)
        );
        if (newCards.length > 0) {
          await scoreAndInjectCards(newCards);
        }
      } finally {
        isProcessing = false;
      }
    }, OBSERVER_DEBOUNCE_MS);
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Disconnect observer when content script is invalidated (extension update/reload)
  ctx.onInvalidated(() => {
    observer.disconnect();
    if (debounceTimer) clearTimeout(debounceTimer);
  });
}

export default defineContentScript({
  matches: ['https://robinpump.fun/*'],
  cssInjectionMode: 'ui',

  async main(ctx) {
    // Skip badge injection on detail pages (/project/0x...) — only one token, not a listing
    const isDetailPage = /\/project\/0x[a-fA-F0-9]{40}/i.test(window.location.pathname);
    if (isDetailPage) {
      // Still setup alert listener for toast notifications
      setupAlertListener();
      return;
    }

    // 1. Parse existing token cards on page
    const cards = findTokenCards();

    // 2. Score and inject badges
    await scoreAndInjectCards(cards);

    // 3. Watch for new cards (infinite scroll, SPA navigation)
    setupObserver(ctx);

    // 4. Setup alert listener for toast notifications
    setupAlertListener();
  },
});
