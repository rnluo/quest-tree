import React, { useState, useCallback, useEffect, useMemo } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState, // We will replace these
  useEdgesState, // We will replace these
  Controls,
  Background,
  applyEdgeChanges,
  applyNodeChanges,
  MiniMap,
  getIncomers,
  getOutgoers,
  MarkerType,
  ControlButton,
  useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Plus } from 'lucide-react';
import Eye from './icons/Eye';
import EyeOff from './icons/EyeOff';
import Fit from './icons/Fit';
import FitFocused from './icons/FitFocused';
import Lock from './icons/Lock';
import LockOpen from './icons/LockOpen';
import QuestNode from './components/QuestNode';
import Sidebar from './components/Sidebar';
import useStore from './store'; // Import our new store

const nodeTypes = {
  questNode: QuestNode,
};

const FLOW_KEY = 'quest-flow-data-v1';

// We won't use these defaults directly in component state anymore
const initialNodes = [];
const initialEdges = [];

function QuestFlow() {
  // Use zustand store instead of useNodesState/useEdgesState
  const { 
    nodes, 
    edges, 
    onNodesChange, 
    onEdgesChange, 
    setNodes, 
    setEdges,
    addNode,
    updateNodeData, // We can use this helper from store
    setState 
  } = useStore((state) => state);
  
  const { undo, redo, past, future } = useStore.temporal.getState();
  const { fitView, screenToFlowPosition } = useReactFlow();
  
  // Subscribe to temporal state changes to trigger re-renders if needed, 
  // though we mainly need the functions.
  // Actually, to use shortcuts properly, we should wrap keyboard listeners.

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [focusMode, setFocusMode] = useState(true);
  const [isInteractive, setIsInteractive] = useState(true);

  // Derive selected node from source of truth
  const selectedNode = useMemo(() => 
    nodes.find(n => n.id === selectedNodeId) || null
  , [nodes, selectedNodeId]);

  // Load from local storage on mount - Needs to bypass Undo history initially?
  // Zundo records everything. To avoid recording initial load, we might clear history.
  useEffect(() => {
    const savedFlow = localStorage.getItem(FLOW_KEY);
    if (savedFlow) {
      const { nodes: savedNodes, edges: savedEdges } = JSON.parse(savedFlow);
      // We set state directly. Zundo will record this. 
      // Ideally we clear history after load, but for now it's okay to have "Load" as first step.
      setState({ 
          nodes: savedNodes || [], 
          edges: savedEdges || [] 
      });
      useStore.temporal.getState().clear(); // Clear history after loading
    }
  }, []); // Run once

  // Save to local storage whenever nodes/edges change
  useEffect(() => {
    if (nodes.length > 0 || edges.length > 0) {
      localStorage.setItem(FLOW_KEY, JSON.stringify({ nodes, edges }));
    }
  }, [nodes, edges]);

  // Keyboard Shortcuts for Undo/Redo
  useEffect(() => {
      const handleKeyDown = (e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
              if (e.shiftKey) {
                  redo();
              } else {
                  undo();
              }
          }
      };
      
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleQuestToggle = useCallback((nodeId, questId) => {
      // Logic moved to updateNodeData or we construct new data here
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;

      const updatedQuests = node.data.quests.map((q) => {
        if (q.id === questId) {
          return { ...q, completed: !q.completed };
        }
        return q;
      });
      
      updateNodeData(nodeId, { quests: updatedQuests });
  }, [nodes, updateNodeData]);

  const handleTitleChange = useCallback((nodeId, newTitle) => {
      updateNodeData(nodeId, { title: newTitle });
  }, [updateNodeData]);

  const handleQuestTextChange = useCallback((nodeId, questId, newText) => {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;

      const updatedQuests = node.data.quests.map((q) => {
        if (q.id === questId) {
          return { ...q, text: newText };
        }
        return q;
      });
      updateNodeData(nodeId, { quests: updatedQuests });
  }, [nodes, updateNodeData]);

  const handleQuestCounterChange = useCallback((nodeId, questId, newCounter) => {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;

      const updatedQuests = node.data.quests.map((q) => {
        if (q.id === questId) {
          return { ...q, counter: newCounter };
        }
        return q;
      });
      updateNodeData(nodeId, { quests: updatedQuests });
  }, [nodes, updateNodeData]);

  const handleNodeCounterChange = useCallback((nodeId, newCounter) => {
    updateNodeData(nodeId, { counter: newCounter });
  }, [updateNodeData]);

  const handleAddQuest = useCallback((nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    const newQuest = {
        id: `q-${Date.now()}`,
        text: 'New Task',
        completed: false
    };
    
    const currentQuests = node.data.quests || [];
    updateNodeData(nodeId, { quests: [...currentQuests, newQuest] });
  }, [nodes, updateNodeData]);

  const handleDeleteQuest = useCallback((nodeId, questId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    const currentQuests = node.data.quests || [];
    const updatedQuests = currentQuests.filter(q => q.id !== questId);
    updateNodeData(nodeId, { quests: updatedQuests });
  }, [nodes, updateNodeData]);

  const handleDeleteNode = useCallback((nodeId) => {
    const newNodes = nodes.filter((n) => n.id !== nodeId);
    const newEdges = edges.filter((e) => e.source !== nodeId && e.target !== nodeId);
    setNodes(newNodes);
    setEdges(newEdges);
  }, [nodes, edges, setNodes, setEdges]);

  const nodesWithHandlers = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        onQuestToggle: handleQuestToggle,
        onTitleChange: handleTitleChange,
        onQuestTextChange: handleQuestTextChange,
        onQuestCounterChange: handleQuestCounterChange,
        onNodeCounterChange: handleNodeCounterChange,
        onAddQuest: handleAddQuest,
        onDeleteQuest: handleDeleteQuest,
        onDeleteNode: handleDeleteNode,
        isInteractive: isInteractive,
      },
    }));
  }, [nodes, handleQuestToggle, handleTitleChange, handleQuestTextChange, handleQuestCounterChange, handleNodeCounterChange, handleAddQuest, handleDeleteQuest, handleDeleteNode, isInteractive]);


  const calculateGraphStyles = useCallback((currentNodes, currentEdges) => {
    // Pass 1: Local Completion
    const locallyCompleteIds = new Set();
    currentNodes.forEach(node => {
      const quests = node.data.quests || [];
      const isComplete = quests.length === 0 || quests.every(q => q.completed);
      if (isComplete) {
        locallyCompleteIds.add(node.id);
      }
    });

    // Pass 2: Semantic Completion
    const incomingMap = new Map(); // nodeId -> [parentIds]
    currentEdges.forEach(edge => {
        if (!incomingMap.has(edge.target)) incomingMap.set(edge.target, []);
        incomingMap.get(edge.target).push(edge.source);
    });

    const semanticCache = new Map(); // nodeId -> boolean
    const isSemanticallyComplete = (nodeId, visited = new Set()) => {
        if (visited.has(nodeId)) return false; 
        if (semanticCache.has(nodeId)) return semanticCache.get(nodeId);
        
        if (!locallyCompleteIds.has(nodeId)) {
            semanticCache.set(nodeId, false);
            return false;
        }

        const parents = incomingMap.get(nodeId) || [];
        if (parents.length === 0) {
            semanticCache.set(nodeId, true);
            return true;
        }

        visited.add(nodeId);
        const allParentsSemanticallyComplete = parents.every(pid => isSemanticallyComplete(pid, visited));
        visited.delete(nodeId);
        
        semanticCache.set(nodeId, allParentsSemanticallyComplete);
        return allParentsSemanticallyComplete;
    };

    // Calculate Active Status for Nodes:
    const activeNodeIds = new Set();
    currentNodes.forEach(node => {
        const parents = incomingMap.get(node.id) || [];
        
        if (locallyCompleteIds.has(node.id)) return; // Not active, it's done.

        const parentsComplete = parents.every(pid => isSemanticallyComplete(pid));
        if (parentsComplete) {
            activeNodeIds.add(node.id);
        }
    });

    // Lookahead for Focus Mode:
    const undimmedNodeIds = new Set(activeNodeIds);
    if (focusMode) {
        currentEdges.forEach(edge => {
            if (activeNodeIds.has(edge.source)) {
                undimmedNodeIds.add(edge.target);
            }
        });
    }

    // 1. Style Edges
    let styledEdges = currentEdges.map(edge => {
        const sourceNode = currentNodes.find(n => n.id === edge.source);
        if(!sourceNode) return edge;

        const sourceLocallyComplete = locallyCompleteIds.has(edge.source);
        const sourceIsActive = activeNodeIds.has(edge.source);

        let className = '';
        let markerColor = 'black'; 
        
        if (sourceLocallyComplete) {
            if (!focusMode) {
                className = '';
                markerColor = 'black';
            } else {
                className = 'edge-history';
                markerColor = '#9ca3af'; // gray-400
            }
        } else if (sourceIsActive) {
            className = 'edge-in-progress';
            markerColor = 'black';
        } else {
            className = 'edge-future';
            markerColor = '#9ca3af'; // gray-400
        }
        
        return {
            ...edge,
            className: className,
            markerEnd: { type: MarkerType.ArrowClosed, color: markerColor },
        };
    });

    // Sort edges so active ones are on top (z-index)
    styledEdges.sort((a, b) => {
        const getScore = (e) => {
            if (e.className === 'edge-in-progress') return 3;
            if (e.className === 'edge-history') return 2;
            return 1;
        };
        return getScore(a) - getScore(b);
    });

    // 2. Style Nodes
    const styledNodes = currentNodes.map(node => {
        const shouldDim = focusMode ? !undimmedNodeIds.has(node.id) : false;
        
        return {
            ...node,
            data: {
                ...node.data,
                isDimmed: shouldDim
            }
        };
    });

    return { edges: styledEdges, nodes: styledNodes };
  }, [focusMode]);

  const { nodes: renderNodes, edges: renderEdges } = useMemo(() => {
    return calculateGraphStyles(nodesWithHandlers, edges);
  }, [nodesWithHandlers, edges, calculateGraphStyles]);

  const handleFitFocused = useCallback(() => {
    const focusedNodes = renderNodes.filter((n) => !n.data.isDimmed);
    const targetNodes = focusedNodes.length > 0 ? focusedNodes : renderNodes;
    fitView({ nodes: targetNodes, duration: 800, padding: 0.2 });
  }, [renderNodes, fitView]);
  
  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: false, style: { strokeWidth: 2 } }, eds)),
    [setEdges]
  );
  
  const onEdgeDoubleClick = useCallback((event, edge) => {
    setEdges((eds) => eds.filter((e) => e.id !== edge.id));
  }, [setEdges]);

  // Pass handlers via store or kept locally
  // We keep updateNodeData in store, but delete is here for sidebar interaction
  const deleteNode = useCallback((nodeId) => {
    const nextNodes = nodes.filter((n) => n.id !== nodeId);
    const nextEdges = edges.filter((e) => e.source !== nodeId && e.target !== nodeId);
    // Atomic update for undo
    setState({ nodes: nextNodes, edges: nextEdges });
    
    setSidebarOpen(false);
    setSelectedNodeId(null);
  }, [nodes, edges, setState]);  
  
  // Need to update Sidebar save logic to use store update
  const onSidebarUpdateNode = useCallback((nodeId, newData) => {
       updateNodeData(nodeId, newData);
  }, [updateNodeData]);

  // Add Node Wrapper
  const handleAddNode = useCallback(() => {
    const id = `node_${Date.now()}`;
    
    // Calculate center of viewport
    const center = screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2
    });

    // Snap to grid (20px)
    const x = Math.round(center.x / 20) * 20;
    const y = Math.round(center.y / 20) * 20;

    const newNode = {
      id,
      type: 'questNode',
      position: { x, y },
      data: {
        title: 'New Goal',
        quests: [
          { id: 'start', text: 'New Task', completed: false }
        ],
      },
    };
    addNode(newNode);
    setSelectedNodeId(id);
    setSidebarOpen(true);
  }, [addNode, screenToFlowPosition]);
  
  // Node Click
  const onNodeClick = useCallback((event, node) => {
      setSelectedNodeId(node.id);
      setSidebarOpen(true);
  }, []);

  const onPaneClick = useCallback(() => {
      setSidebarOpen(false);
      setSelectedNodeId(null);
  }, []);


  return ( // main container
    <div className="w-full h-screen bg-white">
      <ReactFlow
        nodes={renderNodes}
        nodesDraggable={isInteractive}
        nodesConnectable={isInteractive}
        elementsSelectable={isInteractive}
        edges={renderEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeDoubleClick={onEdgeDoubleClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid={true}
        snapGrid={[20, 20]}
        deleteKeyCode={['Backspace', 'Delete']}
      >
        <Background gap={20} color="#e5e5e5" variant="lines" />
        <Background id="grid-2" gap={160} color="#ccc" variant="lines" />
        <Controls 
            className='!bg-white !border-black !border-2 !shadow-none [&>button]:!border-black [&>button]:!border-b-2 last:[&>button]:!border-b-0' 
            position="top-right" 
            style={{ marginTop: '190px', marginRight: '20px' }} 
            showZoom={false}
            showFitView={false}
            showInteractive={false}
        >
            <ControlButton onClick={() => setFocusMode(!focusMode)} title="Toggle Focus Mode">
              {focusMode ? <Eye strokeWidth={3} size="24px" className="!fill-transparent" /> : <EyeOff strokeWidth={3} size="24px" className="!fill-transparent" />}
            </ControlButton>
            <ControlButton onClick={() => setIsInteractive(!isInteractive)} title="Toggle Interactivity">
                {isInteractive ? <LockOpen strokeWidth={3} size="24px" className="!fill-transparent" /> : <Lock strokeWidth={3} size="24px" className="!fill-transparent" />}
            </ControlButton>
            <ControlButton onClick={() => fitView({ duration: 800, padding: 0.2 })} title="Fit View">
                <Fit strokeWidth={3} size="24px" className="!fill-transparent" />
            </ControlButton>
            <ControlButton onClick={handleFitFocused} title="Fit Focused Nodes">
              <FitFocused strokeWidth={3} size="24px" className="!fill-transparent" />
            </ControlButton>
        </Controls>
        <MiniMap 
            nodeColor="#000" 
            maskColor="rgba(240, 240, 240, 0.6)"
            className='!border-2 !border-black !bg-white'
            position="top-right"
            style={{ marginTop: '20px', marginRight: '20px' }}
        />
      </ReactFlow>

      {/* Floating Action Button */}
      <button
        onClick={handleAddNode}
        className="fixed bottom-8 right-8 bg-black text-white w-14 h-14 rounded-full shadow-2xl hover:bg-gray-800 transition-transform active:scale-95 z-40 flex items-center justify-center"
      >
        <Plus size={24} />
      </button>

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        selectedNode={selectedNode}
        onUpdateNode={onSidebarUpdateNode}
        onDeleteNode={deleteNode}
      />
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <QuestFlow />
    </ReactFlowProvider>
  );
}
