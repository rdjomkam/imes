import { Annotation } from "@langchain/langgraph";

export const AgentState = Annotation.Root({
  company: Annotation({ reducer: (_, b) => b, default: () => "" }),
  role: Annotation({ reducer: (_, b) => b, default: () => "" }),
  webResults: Annotation({ reducer: (_, b) => b, default: () => [] }),
  webSources: Annotation({ reducer: (_, b) => b, default: () => [] }),
  steps: Annotation({ reducer: (a, b) => [...a, b], default: () => [] }),
  dossier: Annotation({ reducer: (_, b) => b, default: () => null }),
});
