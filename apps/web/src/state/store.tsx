import {
  DEMO_LISTINGS,
  DEMO_NOW_ISO,
  DEMO_PRICE_BOOK,
  EMPTY_SEARCH,
  SEARCH_PRESETS,
  evaluateListing,
  formatGBP,
  money,
  suggestFromDecisions,
  type AlgorithmSuggestion,
  type BuildSnapshot,
  type EvaluatedDeal,
  type FeedbackAction,
  type PriceBookEntry,
  type SearchQuery,
  type ScoreWeights,
  DEFAULT_WEIGHTS,
} from '@abelprocure/core';
import { createContext, useContext, useMemo, useReducer, type Dispatch, type ReactNode } from 'react';

export interface InventoryItem {
  id: string;
  component: string;
  brand: string;
  model: string;
  source: string;
  ebayItemId?: string;
  purchaseDate: string;
  purchasePence: number;
  postagePence: number;
  landedPence: number;
  condition: string;
  status: string;
  buildId?: string;
  estimatedResalePence: number;
  actualResalePence?: number;
  soldDate?: string;
}

export interface BuildRecord {
  id: string;
  name: string;
  targetResalePence: number;
  slots: { slot: string; model: string; boughtPence: number | null; status: string }[];
}

export interface SavedSearch {
  id: string;
  name: string;
  query: SearchQuery;
  maxPricePence: number | null;
  minDealScore: number;
  frequency: string;
  notify: boolean;
  active: boolean;
  resultsSeen: number;
  watched: number;
  purchased: number;
}

export interface AppAlert {
  id: string;
  type: string;
  title: string;
  body: string;
  at: string;
  read: boolean;
  severity: 'critical' | 'opportunity' | 'info';
}

export interface BidPlanState {
  itemId: string;
  myMaxPence: number | null;
  manuallyBid: boolean;
}

export interface AppState {
  demoMode: boolean;
  deals: EvaluatedDeal[];
  ignored: string[];
  watchlist: string[];
  trackedAuctions: string[];
  bidPlans: BidPlanState[];
  feedback: { itemId: string; action: FeedbackAction; at: string; version: string }[];
  inventory: InventoryItem[];
  builds: BuildRecord[];
  purchases: InventoryItem[];
  savedSearches: SavedSearch[];
  alerts: AppAlert[];
  suggestions: AlgorithmSuggestion[];
  priceBook: PriceBookEntry[];
  weights: ScoreWeights;
  selectedDealId: string | null;
  searchDraft: SearchQuery;
  wizardStep: number;
}

const STORAGE_KEY = 'abelprocure-state-v2';

function demoBuilds(): BuildRecord[] {
  return [
    {
      id: 'build-4',
      name: 'Build 4',
      targetResalePence: 52000,
      slots: [
        { slot: 'Kit', model: 'Build 4 parts excluding GPU', boughtPence: 26893, status: 'ALLOCATED' },
        { slot: 'CPU', model: 'AMD Ryzen 5 PRO 2400G', boughtPence: null, status: 'ALLOCATED' },
        { slot: 'Motherboard', model: 'ASUS Prime B450M-A', boughtPence: null, status: 'ALLOCATED' },
        { slot: 'RAM', model: 'Corsair Vengeance LPX 16GB 2x8GB DDR4-3200', boughtPence: null, status: 'ALLOCATED' },
        { slot: 'Storage', model: 'XPG SX8200NP 1TB NVMe', boughtPence: null, status: 'ALLOCATED' },
        { slot: 'PSU', model: 'Corsair VS550 550W (older VS)', boughtPence: null, status: 'ALLOCATED' },
        { slot: 'Case', model: 'Sharkoon Rebel C50 RGB White', boughtPence: null, status: 'ALLOCATED' },
        { slot: 'Cooler', model: 'AMD Wraith Stealth', boughtPence: null, status: 'ALLOCATED' },
        { slot: 'GPU', model: '', boughtPence: null, status: 'NEEDED' },
      ],
    },
  ];
}

function snapshots(builds: BuildRecord[]): BuildSnapshot[] {
  return builds.map((b) => ({
    id: b.id,
    name: b.name,
    missingTypes: b.slots.filter((s) => s.status === 'NEEDED').map((s) => (s.slot === 'Motherboard' ? 'MOTHERBOARD' : s.slot.toUpperCase())),
    partsCost: money(b.slots.reduce((sum, s) => sum + (s.boughtPence ?? 0), 0)),
    projectedResale: money(b.targetResalePence),
    targetMargin: money(15000),
  }));
}

export function bootstrapState(): AppState {
  const builds = demoBuilds();
  const deals = DEMO_LISTINGS.map((listing) =>
    evaluateListing(listing, {
      now: DEMO_NOW_ISO,
      priceBook: DEMO_PRICE_BOOK,
      builds: snapshots(builds),
    }),
  ).sort((a, b) => b.score.total - a.score.total);

  return {
    demoMode: true,
    deals,
    ignored: [],
    watchlist: [deals[0]?.listing.itemId ?? ''],
    trackedAuctions: deals.filter((d) => d.listing.listingType.includes('AUCTION')).slice(0, 4).map((d) => d.listing.itemId),
    bidPlans: [],
    feedback: [],
    inventory: [
      {
        id: 'inv-gt1030',
        component: 'GPU',
        brand: 'Gigabyte',
        model: 'GeForce GT 1030 OC 2GB GDDR5',
        source: 'historical',
        purchaseDate: '2026-06-01',
        purchasePence: 3200,
        postagePence: 283,
        landedPence: 3483,
        condition: 'USED_GOOD',
        status: 'AVAILABLE',
        estimatedResalePence: 3000,
      },
    ],
    builds,
    purchases: [
      {
        id: 'ph-1',
        component: 'GPU',
        brand: 'Sapphire',
        model: 'RX 6600',
        source: 'eBay auction',
        purchaseDate: '2026-07-01',
        purchasePence: 7800,
        postagePence: 500,
        landedPence: 8300,
        condition: 'USED_VERY_GOOD',
        status: 'SOLD',
        estimatedResalePence: 12500,
        actualResalePence: 12200,
        soldDate: '2026-07-18',
      },
    ],
    savedSearches: SEARCH_PRESETS.slice(0, 5).map((p, i) => ({
      id: p.id,
      name: p.name,
      query: { ...EMPTY_SEARCH, keyword: p.query, ...p.filters },
      maxPricePence: 'maxLandedPence' in p.filters ? (p.filters.maxLandedPence as number) : null,
      minDealScore: 70,
      frequency: i === 0 ? '5m' : '15m',
      notify: true,
      active: true,
      resultsSeen: 40 - i * 5,
      watched: 8 - i,
      purchased: i === 0 ? 3 : 0,
    })),
    alerts: [
      {
        id: 'al-1',
        type: 'AUCTION_ENDING_5M',
        title: 'Auction ending in 5 minutes',
        body: 'Ryzen 5 5600 auction is below target.',
        at: DEMO_NOW_ISO,
        read: false,
        severity: 'critical',
      },
      {
        id: 'al-2',
        type: 'NEW_DEAL_SCORE_90_PLUS',
        title: 'New bargain found',
        body: 'RX 6600 Pulse scored exceptional in DEMO fixtures.',
        at: DEMO_NOW_ISO,
        read: false,
        severity: 'opportunity',
      },
    ],
    suggestions: [],
    priceBook: DEMO_PRICE_BOOK,
    weights: DEFAULT_WEIGHTS,
    selectedDealId: deals[0]?.listing.itemId ?? null,
    searchDraft: { ...EMPTY_SEARCH },
    wizardStep: 1,
  };
}

type Action =
  | { type: 'FEEDBACK'; itemId: string; action: FeedbackAction }
  | { type: 'WATCH'; itemId: string }
  | { type: 'TRACK'; itemId: string }
  | { type: 'IGNORE'; itemId: string }
  | { type: 'SET_MAX'; itemId: string; pence: number }
  | { type: 'MARK_BID'; itemId: string }
  | { type: 'ADD_TO_BUILD'; itemId: string; buildId: string }
  | { type: 'SET_SEARCH'; query: SearchQuery }
  | { type: 'SAVE_SEARCH'; name: string }
  | { type: 'TOGGLE_SEARCH'; id: string }
  | { type: 'SUGGESTION'; id: string; status: AlgorithmSuggestion['status'] }
  | { type: 'WEIGHTS'; weights: ScoreWeights }
  | { type: 'SELECT'; itemId: string }
  | { type: 'WIZARD'; step: number }
  | { type: 'READ_ALERT'; id: string }
  | { type: 'ADD_INVENTORY'; item: InventoryItem }
  | { type: 'UPDATE_PRICE_BOOK'; entry: PriceBookEntry };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'WATCH':
      return { ...state, watchlist: unique([...state.watchlist, action.itemId]) };
    case 'TRACK':
      return { ...state, trackedAuctions: unique([...state.trackedAuctions, action.itemId]) };
    case 'IGNORE':
      return { ...state, ignored: unique([...state.ignored, action.itemId]) };
    case 'SELECT':
      return { ...state, selectedDealId: action.itemId };
    case 'SET_MAX':
      return {
        ...state,
        bidPlans: [
          ...state.bidPlans.filter((b) => b.itemId !== action.itemId),
          { itemId: action.itemId, myMaxPence: action.pence, manuallyBid: false },
        ],
      };
    case 'MARK_BID':
      return {
        ...state,
        bidPlans: state.bidPlans.map((b) => (b.itemId === action.itemId ? { ...b, manuallyBid: true } : b)),
      };
    case 'FEEDBACK': {
      const feedback = [
        ...state.feedback,
        { itemId: action.itemId, action: action.action, at: new Date().toISOString(), version: 'PCDealScore-v1' },
      ];
      const decisions = feedback.map((f) => {
        const deal = state.deals.find((d) => d.listing.itemId === f.itemId);
        return {
          modelKey: deal?.component.model.value ?? 'unknown',
          action: f.action,
          landedPence: deal?.landed.landedCost.pence ?? 0,
          targetPence: deal?.target.recommendedMaxItemBid?.pence ?? null,
          sellerFeedbackPct: deal?.listing.seller.feedbackPercentage ?? null,
          listingType: deal?.listing.listingType ?? '',
        };
      });
      return {
        ...state,
        feedback,
        suggestions: suggestFromDecisions(
          decisions,
          Object.fromEntries(state.priceBook.map((p) => [p.displayName, p.desiredBuyPrice?.pence ?? null])),
        ),
      };
    }
    case 'ADD_TO_BUILD': {
      const deal = state.deals.find((d) => d.listing.itemId === action.itemId);
      if (!deal) return state;
      return {
        ...state,
        builds: state.builds.map((b) =>
          b.id === action.buildId
            ? {
                ...b,
                slots: b.slots.map((s) =>
                  s.status === 'NEEDED' && deal.component.componentType.value?.includes(s.slot.toUpperCase().slice(0, 3))
                    ? {
                        ...s,
                        model: deal.component.model.value ?? deal.listing.title,
                        boughtPence: deal.landed.landedCost.pence,
                        status: 'WATCHING',
                      }
                    : s,
                ),
              }
            : b,
        ),
      };
    }
    case 'SET_SEARCH':
      return { ...state, searchDraft: action.query };
    case 'SAVE_SEARCH':
      return {
        ...state,
        savedSearches: [
          ...state.savedSearches,
          {
            id: `ss-${Date.now()}`,
            name: action.name,
            query: state.searchDraft,
            maxPricePence: state.searchDraft.maxLandedPence ?? null,
            minDealScore: 70,
            frequency: '15m',
            notify: true,
            active: true,
            resultsSeen: 0,
            watched: 0,
            purchased: 0,
          },
        ],
      };
    case 'TOGGLE_SEARCH':
      return {
        ...state,
        savedSearches: state.savedSearches.map((s) => (s.id === action.id ? { ...s, active: !s.active } : s)),
      };
    case 'SUGGESTION':
      return {
        ...state,
        suggestions: state.suggestions.map((s) => (s.id === action.id ? { ...s, status: action.status } : s)),
      };
    case 'WEIGHTS':
      return { ...state, weights: action.weights };
    case 'WIZARD':
      return { ...state, wizardStep: action.step };
    case 'READ_ALERT':
      return { ...state, alerts: state.alerts.map((a) => (a.id === action.id ? { ...a, read: true } : a)) };
    case 'ADD_INVENTORY':
      return { ...state, inventory: [...state.inventory, action.item] };
    case 'UPDATE_PRICE_BOOK':
      return {
        ...state,
        priceBook: [...state.priceBook.filter((p) => p.modelKey !== action.entry.modelKey), action.entry],
      };
    default:
      return state;
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

const Ctx = createContext<{ state: AppState; dispatch: Dispatch<Action> } | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AppState;
        if (parsed.deals?.length) return { ...bootstrapState(), ...parsed, deals: bootstrapState().deals };
      }
    } catch {
      /* demo bootstrap */
    }
    return bootstrapState();
  });

  const persistable = useMemo(() => state, [state]);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...persistable, deals: [] }));
  } catch {
    /* ignore quota */
  }

  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}

export function useApp(): { state: AppState; dispatch: Dispatch<Action> } {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp outside provider');
  return ctx;
}

export function visibleDeals(state: AppState): EvaluatedDeal[] {
  return state.deals.filter((d) => !state.ignored.includes(d.listing.itemId));
}

export function moneyText(pence: number | null | undefined): string {
  if (pence === null || pence === undefined) return '—';
  return formatGBP(money(pence));
}
