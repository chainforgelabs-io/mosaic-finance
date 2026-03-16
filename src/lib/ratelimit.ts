import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export const ratelimit = {
  conversation: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 m"),
  }),
  planGeneration: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1 h"),
  }),
  pdfDownload: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1 h"),
  }),
  upload: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '10 m'),
  }),
  marketQuotes: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, "1 m"),
  }),
  marketSearch: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "1 m"),
  }),
  marketNews: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(15, "1 m"),
  }),
  marketSocial: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 m"),
  }),
  marketCommentary: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1 m"),
  }),
};
