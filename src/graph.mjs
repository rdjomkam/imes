import { StateGraph } from "@langchain/langgraph";
import { AgentState } from "./state.mjs";
import { identificationNode } from "./nodes/identification.mjs";
import { contexteNode } from "./nodes/contexte.mjs";
import { signauxNode } from "./nodes/signaux.mjs";
import { concurrenceNode } from "./nodes/concurrence.mjs";
import { fonctionNode } from "./nodes/fonction.mjs";
import { angleNode } from "./nodes/angle.mjs";
import { redactionNode } from "./nodes/redaction.mjs";
import { objectionsNode } from "./nodes/objections.mjs";
import { assemblerNode } from "./nodes/assembler.mjs";

function withFallback(nodeFunc, title, index) {
  return async (state) => {
    try {
      return await nodeFunc(state);
    } catch (err) {
      console.error(`[node:${title}] ERROR:`, err.message);
      return {
        steps: {
          title,
          log: ["Analyse en mode dégradé", err.message.slice(0, 120)],
          sources: [],
          conclusion: `Étape ${index + 1} incomplète — données partielles.`,
          alert: false,
        },
      };
    }
  };
}

export function buildGraph() {
  const graph = new StateGraph(AgentState)
    .addNode("identification", withFallback(identificationNode, "Identification du compte", 0))
    .addNode("contexte", withFallback(contexteNode, "Collecte du contexte public", 1))
    .addNode("signaux", withFallback(signauxNode, "Analyse des signaux récents", 2))
    .addNode("concurrence", withFallback(concurrenceNode, "Cartographie concurrentielle", 3))
    .addNode("fonction", withFallback(fonctionNode, "Lecture de la fonction visée", 4))
    .addNode("angle", withFallback(angleNode, "Définition de l'angle d'approche", 5))
    .addNode("redaction", withFallback(redactionNode, "Rédaction du plan de contact", 6))
    .addNode("objections", withFallback(objectionsNode, "Anticipation des objections", 7))
    .addNode("assembler", assemblerNode)
    // START → identification → contexte → [signaux ‖ concurrence ‖ fonction] → angle → [redaction ‖ objections] → assembler → END
    .addEdge("__start__", "identification")
    .addEdge("identification", "contexte")
    .addEdge("contexte", "signaux")
    .addEdge("contexte", "concurrence")
    .addEdge("contexte", "fonction")
    .addEdge("signaux", "angle")
    .addEdge("concurrence", "angle")
    .addEdge("fonction", "angle")
    .addEdge("angle", "redaction")
    .addEdge("angle", "objections")
    .addEdge("redaction", "assembler")
    .addEdge("objections", "assembler")
    .addEdge("assembler", "__end__");

  return graph.compile();
}
