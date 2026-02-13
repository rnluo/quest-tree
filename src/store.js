import { create } from 'zustand';
import { applyNodeChanges, applyEdgeChanges } from 'reactflow';
import { temporal } from 'zundo';

// Define initial state
const initialState = {
  nodes: [],
  edges: [],
};

const useStore = create(
  temporal(
    (set, get) => ({
      ...initialState,
      setNodes: (nodes) => {
        // Handle value or updater function
        const nextNodes = typeof nodes === 'function' ? nodes(get().nodes) : nodes;
        set({ nodes: nextNodes });
      },
      setEdges: (edges) => {
         const nextEdges = typeof edges === 'function' ? edges(get().edges) : edges;
        set({ edges: nextEdges });
      },
      // Bulk update handling for complex history
      setState: (state) => {
          set(state);
      },
      onNodesChange: (changes) => {
        set({
          nodes: applyNodeChanges(changes, get().nodes),
        });
      },
      onEdgesChange: (changes) => {
        set({
          edges: applyEdgeChanges(changes, get().edges),
        });
      },
      addNode: (node) => {
        set({
          nodes: [...get().nodes, node],
        });
      },
      updateNodeData: (nodeId, data) => {
        set({
          nodes: get().nodes.map((node) => {
            if (node.id === nodeId) {
              return { ...node, data: { ...node.data, ...data } };
            }
            return node;
          }),
        });
      },
    }),
    {
      limit: 100, // Limit history depth
      // Helper to exclude certain actions from history if needed, but we want most things
    }
  )
);

export default useStore;
