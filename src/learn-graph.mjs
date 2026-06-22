import { StateGraph } from "@langchain/langgraph";
import { LearnState } from "./learn-state.mjs";
import { researchNode } from "./learn-nodes/research.mjs";
import { extractNode } from "./learn-nodes/extract.mjs";
import { synthesizeNode } from "./learn-nodes/synthesize.mjs";

export function buildLearnGraph() {
  const graph = new StateGraph(LearnState)
    .addNode("research", researchNode)
    .addNode("extract", extractNode)
    .addNode("synthesize", synthesizeNode)
    .addEdge("__start__", "research")
    .addEdge("research", "extract")
    .addEdge("extract", "synthesize")
    .addEdge("synthesize", "__end__");

  return graph.compile();
}
