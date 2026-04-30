import React, { useMemo } from 'react';
import ReactFlow, { Background, Controls } from 'reactflow';
import 'reactflow/dist/style.css';

const AgentGraph = ({ currentNode, completedNodes = [], failedNodes = [] }) => {
  const nodes = useMemo(() => [
    { id: 'planner', data: { label: 'Planner' }, position: { x: 250, y: 0 }, type: 'default' },
    { id: 'web_search', data: { label: 'Web Search' }, position: { x: 100, y: 120 }, type: 'default' },
    { id: 'paper_search', data: { label: 'Paper Search' }, position: { x: 400, y: 120 }, type: 'default' },
    { id: 'document_reader', data: { label: 'Document Reader' }, position: { x: 250, y: 240 }, type: 'default' },
    { id: 'critic', data: { label: 'Critic' }, position: { x: 250, y: 360 }, type: 'default' },
    { id: 'synthesizer', data: { label: 'Synthesizer' }, position: { x: 250, y: 480 }, type: 'default' },
  ].map(node => ({
    ...node,
    className: failedNodes.includes(node.id) ? 'failed' : 
               completedNodes.includes(node.id) ? 'complete' : 
               currentNode === node.id ? 'active' : ''
  })), [currentNode, completedNodes, failedNodes]);

  const edges = useMemo(() => [
    { id: 'e1-2', source: 'planner', target: 'web_search', animated: currentNode === 'web_search' },
    { id: 'e1-3', source: 'planner', target: 'paper_search', animated: currentNode === 'paper_search' },
    { id: 'e2-4', source: 'web_search', target: 'document_reader', animated: currentNode === 'document_reader' },
    { id: 'e3-4', source: 'paper_search', target: 'document_reader', animated: currentNode === 'document_reader' },
    { id: 'e4-5', source: 'document_reader', target: 'critic', animated: currentNode === 'critic' },
    { id: 'e5-6', source: 'critic', target: 'synthesizer', animated: currentNode === 'synthesizer' },
  ], [currentNode]);

  return (
    <div className="h-full bg-slate-800 rounded-lg">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        attributionPosition="bottom-left"
      >
        <Background color="#475569" gap={16} />
        <Controls />
      </ReactFlow>
    </div>
  );
};

export default AgentGraph;
