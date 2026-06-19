import type { AnalysisResult, PerspectiveTypeAnalysis } from "./schema";
import {
  PERSPECTIVE_TYPES,
  securityPathLabel,
  stressPathLabel,
  taglineFor,
} from "./types";

export const SAMPLE_SCENARIO = "Buying a house for the first time with a fiancé";

// Prose written per type; tagline + shift paths are derived so they always
// match the canonical metadata (single source of truth).
type MockProse = Pick<
  PerspectiveTypeAnalysis,
  "summary" | "scenarioOutlook" | "stressResponse" | "securityResponse"
>;

const PROSE: Record<number, MockProse> = {
  1: {
    summary:
      "Sees the purchase as a responsibility to get right, weighing every clause and inspection against an internal standard of 'the correct way' to buy a home.",
    scenarioOutlook:
      "Frames the decision as a matter of doing it properly — comparing mortgage terms, checking the home for defects, and making sure both partners act responsibly. There is a right house and a right process, and their job is to find both.",
    stressResponse:
      "When unaware and under pressure, Type 1 becomes critical and rigid, fixating on flaws in listings or in the fiancé's choices. As Type 1 shifts toward Type 4 under stress, frustration turns inward into moodiness, resentment, and a feeling that the perfect home (and partnership) may be unreachable.",
    securityResponse:
      "When aware and grounded, Type 1 relaxes the inner critic and lets the search become enjoyable. As Type 1 shifts toward Type 7 in security, they grow spontaneous and open — willing to consider imperfect homes for their potential and to trust their partner's instincts.",
  },
  2: {
    summary:
      "Approaches the purchase through the relationship — what will make a warm home for the two of them and keep the fiancé feeling supported and happy.",
    scenarioOutlook:
      "Views the house as the foundation of a shared life and reads the process emotionally: Is my partner feeling cared for? Will this be a place where people feel welcome? Practical trade-offs are filtered through how they affect the relationship.",
    stressResponse:
      "When unaware, Type 2 over-gives, suppressing their own preferences to please the fiancé, then quietly keeps score. As Type 2 shifts toward Type 8 under stress, suppressed needs erupt into blunt, controlling demands about the budget or the decision.",
    securityResponse:
      "When aware, Type 2 voices their own wants as clearly as they tend to others'. As Type 2 shifts toward Type 4 in security, they connect honestly with what this home means to them personally, making the choice a genuine partnership rather than self-erasure.",
  },
  3: {
    summary:
      "Treats the purchase as a goal to win — the right home in the right area that signals a successful, on-track life together.",
    scenarioOutlook:
      "Approaches buying efficiently and image-consciously: resale value, neighborhood status, and a smooth, impressive process. They want a result they (and others) can admire, and they move fast to get it.",
    stressResponse:
      "When unaware, Type 3 prioritizes appearances over fit and may steamroll the fiancé to hit the target. As Type 3 shifts toward Type 9 under stress, drive collapses into disengagement and avoidance — going numb or stalling rather than facing a stuck negotiation.",
    securityResponse:
      "When aware, Type 3 slows down to ask what the two of them actually want, not what looks best. As Type 3 shifts toward Type 6 in security, they become loyal and collaborative, valuing the partnership and shared security over the optics of the win.",
  },
  4: {
    summary:
      "Wants a home with soul — a place that feels uniquely theirs and expresses the meaning of building a life with this particular person.",
    scenarioOutlook:
      "Sees beyond square footage to atmosphere, story, and authenticity. A house must feel emotionally right; a 'fine' but generic home can feel quietly devastating. They imagine the life that would unfold inside each space.",
    stressResponse:
      "When unaware, Type 4 romanticizes an out-of-reach home and feels that everything available is lacking. As Type 4 shifts toward Type 2 under stress, they over-focus on the fiancé's needs to feel indispensable, losing themselves while privately feeling misunderstood.",
    securityResponse:
      "When aware, Type 4 channels feeling into practical choices. As Type 4 shifts toward Type 1 in security, they get organized and objective — making peace with trade-offs and turning emotional vision into concrete, grounded decisions.",
  },
  5: {
    summary:
      "Researches the purchase exhaustively, wanting to understand the market, the financing, and the risks before committing scarce resources.",
    scenarioOutlook:
      "Treats home-buying as a problem to master through information: comps, interest rates, structural reports, total cost of ownership. Feels competent and safe only once they know more than enough, and guards their energy and money carefully.",
    stressResponse:
      "When unaware, Type 5 withdraws into analysis, detaching from the fiancé and delaying decisions to avoid feeling depleted. As Type 5 shifts toward Type 7 under stress, the mind scatters into too many options and impulsive, scattered thinking.",
    securityResponse:
      "When aware, Type 5 shares their knowledge generously and acts. As Type 5 shifts toward Type 8 in security, they become decisive and engaged — using their research to lead confidently and commit to a home with their partner.",
  },
  6: {
    summary:
      "Scans the whole purchase for what could go wrong — hidden costs, bad neighbors, market timing — to protect the two of them from a costly mistake.",
    scenarioOutlook:
      "Approaches buying with vigilant due diligence: worst-case scenarios, contingency clauses, trusted advisors. Security and trust are the real questions — can we rely on this lender, this agent, this house, and on each other through it?",
    stressResponse:
      "When unaware, Type 6 spirals into doubt and second-guessing, seeking endless reassurance or suspecting everyone's motives. As Type 6 shifts toward Type 3 under stress, they push for a fast decision to escape anxiety, prioritizing looking decisive over real comfort.",
    securityResponse:
      "When aware, Type 6 trusts their own judgment and their partner. As Type 6 shifts toward Type 9 in security, they settle into calm, steady confidence — able to weigh risks without being ruled by them and to move forward together peacefully.",
  },
  7: {
    summary:
      "Sees the purchase as an exciting new chapter full of possibility, focusing on the fun and freedom a new home could unlock.",
    scenarioOutlook:
      "Approaches buying with optimism and big-picture vision — imagining gatherings, projects, and adventures. Keeps options open and reframes obstacles as solvable, sometimes glossing over the tedious financial fine print.",
    stressResponse:
      "When unaware, Type 7 avoids the constraints and paperwork, chasing the most exciting listing while dodging commitment. As Type 7 shifts toward Type 1 under stress, the easygoing mood hardens into critical, perfectionistic impatience with the fiancé and the process.",
    securityResponse:
      "When aware, Type 7 brings joyful energy and follows through. As Type 7 shifts toward Type 5 in security, they slow down and go deep — researching carefully and making a focused, well-considered choice without losing their enthusiasm.",
  },
  8: {
    summary:
      "Takes charge of the purchase, ready to negotiate hard and make the big call to protect their partner and get a fair deal.",
    scenarioOutlook:
      "Approaches buying as a power game to win on their terms: control the negotiation, don't get taken advantage of, move decisively. Protecting the fiancé and the household is a matter of strength and directness.",
    stressResponse:
      "When unaware, Type 8 becomes domineering and confrontational, bulldozing the fiancé's input and the agent alike. As Type 8 shifts toward Type 5 under stress, they withdraw and go cold, retreating into private calculation and cutting others out of the decision.",
    securityResponse:
      "When aware, Type 8 uses their strength to protect rather than control. As Type 8 shifts toward Type 2 in security, they soften and become caring and generous — sharing the decision openly and making the fiancé a true equal partner.",
  },
  9: {
    summary:
      "Wants the home-buying process to feel harmonious and low-conflict, and a home that feels peaceful and comfortable for both of them.",
    scenarioOutlook:
      "Approaches buying by merging with the fiancé's wishes and seeking a calm, agreeable path. Prioritizes comfort and belonging over status, and would rather avoid friction than fight for a particular listing.",
    stressResponse:
      "When unaware, Type 9 goes along to avoid conflict, stays vague about preferences, and stalls decisions. As Type 9 shifts toward Type 6 under stress, they grow anxious and doubtful, fixating on worst cases while still struggling to take a clear position.",
    securityResponse:
      "When aware, Type 9 shows up with their own clear preferences. As Type 9 shifts toward Type 3 in security, they become focused and energized — driving the process forward and asserting what they want while keeping the partnership harmonious.",
  },
};

function buildMockType(n: number): PerspectiveTypeAnalysis {
  const meta = PERSPECTIVE_TYPES[n];
  return {
    typeNumber: n,
    typeName: meta.name,
    tagline: taglineFor(n),
    summary: PROSE[n].summary,
    scenarioOutlook: PROSE[n].scenarioOutlook,
    stressResponse: PROSE[n].stressResponse,
    stressPath: stressPathLabel(n),
    securityResponse: PROSE[n].securityResponse,
    securityPath: securityPathLabel(n),
  };
}

/** Full mock analysis for the sample scenario — keyed by canonical type order. */
export const HOME_BUYING_MOCK: Omit<AnalysisResult, "generatedAt"> = {
  scenario: SAMPLE_SCENARIO,
  types: [1, 2, 3, 4, 5, 6, 7, 8, 9].map(buildMockType),
};
