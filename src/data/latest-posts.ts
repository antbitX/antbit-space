// Curated latest posts from @antbit on X.
// The live X timeline embed gets blocked, so these are maintained by hand:
// text, the post URL, and a short time label. Keep the two most recent here.
export interface LatestPost {
  id: string;
  text: string;
  url: string;
  timeLabel: string;
}

export const LATEST_POSTS: LatestPost[] = [
  {
    id: "2103367656950964710",
    text: "All roads lead to $BTC.",
    url: "https://x.com/antbit/status/2103367656950964710",
    timeLabel: "Sep 25",
  },
  {
    id: "2102001935570092497",
    text: "Weekend: \u201cCan it hold $81k?\u201d Monday: $84,000 and looking at $85,000. Good morning.",
    url: "https://x.com/antbit/status/2102001935570092497",
    timeLabel: "Sep 21",
  },
];
