import { Annotation } from "@langchain/langgraph";

export const LearnState = Annotation.Root({
  companyName: Annotation({ reducer: (_, b) => b, default: () => "" }),
  webResults: Annotation({ reducer: (_, b) => b, default: () => [] }),
  extracted: Annotation({ reducer: (_, b) => b, default: () => null }),
  profile: Annotation({ reducer: (_, b) => b, default: () => null }),
});
