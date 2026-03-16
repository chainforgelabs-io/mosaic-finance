"use client";

import { create } from "zustand";
import type {
  Quote,
  NewsArticle,
  SocialSentiment,
  InvestorCommentary,
  CompanyProfile,
  HistoricalPrice,
  SectorPerformance,
  MarketMover,
  SearchResult,
  WatchlistItem,
} from "@/lib/market-data/types";

export type MarketTab = "overview" | "lookup" | "news" | "commentary";

interface MarketStore {
  activeTab: MarketTab;
  setActiveTab: (tab: MarketTab) => void;

  // Overview
  indexQuotes: Quote[];
  indexQuotesLoading: boolean;
  indexQuotesError: string | null;
  setIndexQuotes: (quotes: Quote[]) => void;
  setIndexQuotesLoading: (loading: boolean) => void;
  setIndexQuotesError: (error: string | null) => void;

  sectors: SectorPerformance[];
  sectorsLoading: boolean;
  setSectors: (sectors: SectorPerformance[]) => void;
  setSectorsLoading: (loading: boolean) => void;

  movers: { gainers: MarketMover[]; losers: MarketMover[] };
  moversLoading: boolean;
  setMovers: (movers: { gainers: MarketMover[]; losers: MarketMover[] }) => void;
  setMoversLoading: (loading: boolean) => void;

  watchlist: WatchlistItem[];
  setWatchlist: (items: WatchlistItem[]) => void;

  // Lookup
  searchQuery: string;
  searchResults: SearchResult[];
  searchLoading: boolean;
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: SearchResult[]) => void;
  setSearchLoading: (loading: boolean) => void;

  selectedSymbol: string | null;
  setSelectedSymbol: (symbol: string | null) => void;

  companyProfile: CompanyProfile | null;
  companyProfileLoading: boolean;
  setCompanyProfile: (profile: CompanyProfile | null) => void;
  setCompanyProfileLoading: (loading: boolean) => void;

  historicalPrices: HistoricalPrice[];
  historicalLoading: boolean;
  setHistoricalPrices: (prices: HistoricalPrice[]) => void;
  setHistoricalLoading: (loading: boolean) => void;

  // News
  newsArticles: NewsArticle[];
  newsLoading: boolean;
  newsError: string | null;
  setNewsArticles: (articles: NewsArticle[]) => void;
  setNewsLoading: (loading: boolean) => void;
  setNewsError: (error: string | null) => void;

  socialSentiment: SocialSentiment | null;
  socialLoading: boolean;
  setSocialSentiment: (sentiment: SocialSentiment | null) => void;
  setSocialLoading: (loading: boolean) => void;

  // Commentary
  commentaries: InvestorCommentary[];
  commentariesLoading: boolean;
  setCommentaries: (commentaries: InvestorCommentary[]) => void;
  setCommentariesLoading: (loading: boolean) => void;

  selectedPersona: string | null;
  setSelectedPersona: (persona: string | null) => void;
}

export const useMarketStore = create<MarketStore>((set) => ({
  activeTab: "overview",
  setActiveTab: (activeTab) => set({ activeTab }),

  indexQuotes: [],
  indexQuotesLoading: false,
  indexQuotesError: null,
  setIndexQuotes: (indexQuotes) => set({ indexQuotes, indexQuotesError: null }),
  setIndexQuotesLoading: (indexQuotesLoading) => set({ indexQuotesLoading }),
  setIndexQuotesError: (indexQuotesError) => set({ indexQuotesError }),

  sectors: [],
  sectorsLoading: false,
  setSectors: (sectors) => set({ sectors }),
  setSectorsLoading: (sectorsLoading) => set({ sectorsLoading }),

  movers: { gainers: [], losers: [] },
  moversLoading: false,
  setMovers: (movers) => set({ movers }),
  setMoversLoading: (moversLoading) => set({ moversLoading }),

  watchlist: [],
  setWatchlist: (watchlist) => set({ watchlist }),

  searchQuery: "",
  searchResults: [],
  searchLoading: false,
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSearchResults: (searchResults) => set({ searchResults }),
  setSearchLoading: (searchLoading) => set({ searchLoading }),

  selectedSymbol: null,
  setSelectedSymbol: (selectedSymbol) => set({ selectedSymbol }),

  companyProfile: null,
  companyProfileLoading: false,
  setCompanyProfile: (companyProfile) => set({ companyProfile }),
  setCompanyProfileLoading: (companyProfileLoading) => set({ companyProfileLoading }),

  historicalPrices: [],
  historicalLoading: false,
  setHistoricalPrices: (historicalPrices) => set({ historicalPrices }),
  setHistoricalLoading: (historicalLoading) => set({ historicalLoading }),

  newsArticles: [],
  newsLoading: false,
  newsError: null,
  setNewsArticles: (newsArticles) => set({ newsArticles, newsError: null }),
  setNewsLoading: (newsLoading) => set({ newsLoading }),
  setNewsError: (newsError) => set({ newsError }),

  socialSentiment: null,
  socialLoading: false,
  setSocialSentiment: (socialSentiment) => set({ socialSentiment }),
  setSocialLoading: (socialLoading) => set({ socialLoading }),

  commentaries: [],
  commentariesLoading: false,
  setCommentaries: (commentaries) => set({ commentaries }),
  setCommentariesLoading: (commentariesLoading) => set({ commentariesLoading }),

  selectedPersona: null,
  setSelectedPersona: (selectedPersona) => set({ selectedPersona }),
}));
