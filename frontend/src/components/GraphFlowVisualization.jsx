import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const GraphFlowVisualization = ({ nodeExecutions = [], currentNode }) => {
  const [expandedNodes, setExpandedNodes] = useState({});

  const toggleNode = (nodeIndex) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeIndex]: !prev[nodeIndex]
    }));
  };

  const getNodeStatus = (execution) => {
    if (execution.error) return 'error';
    if (execution.completed_at) return 'completed';
    return 'running';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'running':
        return <Clock className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const calculateDuration = (start, end) => {
    if (!start || !end) return 'N/A';
    const startTime = new Date(start);
    const endTime = new Date(end);
    const duration = (endTime - startTime) / 1000;
    return `${duration.toFixed(2)}s`;
  };

  const renderValue = (value, maxLength = 200) => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') {
      const str = JSON.stringify(value, null, 2);
      if (str.length > maxLength) {
        return (
          <pre className="text-xs bg-gray-800 p-2 rounded overflow-x-auto">
            {str.substring(0, maxLength)}...
          </pre>
        );
      }
      return (
        <pre className="text-xs bg-gray-800 p-2 rounded overflow-x-auto">
          {str}
        </pre>
      );
    }
    const str = String(value);
    if (str.length > maxLength) {
      return <span className="text-sm">{str.substring(0, maxLength)}...</span>;
    }
    return <span className="text-sm">{str}</span>;
  };

  const getNodeColor = (nodeName) => {
    const colors = {
      planner: 'border-purple-500 bg-purple-900/20',
      web_search: 'border-blue-500 bg-blue-900/20',
      paper_search: 'border-cyan-500 bg-cyan-900/20',
      document_reader: 'border-green-500 bg-green-900/20',
      critic: 'border-yellow-500 bg-yellow-900/20',
      synthesizer: 'border-pink-500 bg-pink-900/20',
    };
    return colors[nodeName] || 'border-gray-500 bg-gray-900/20';
  };

  const getNodeDescription = (nodeName) => {
    const descriptions = {
      planner: 'Breaks down the research question into sub-questions',
      web_search: 'Searches the web for relevant information',
      paper_search: 'Searches academic papers on ArXiv',
      document_reader: 'Reads and summarizes documents',
      critic: 'Evaluates research quality and identifies gaps',
      synthesizer: 'Generates the final research report',
    };
    return descriptions[nodeName] || 'Processing...';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Agent Execution Flow</h3>
        <span className="text-sm text-gray-400">
          {nodeExecutions.length} node{nodeExecutions.length !== 1 ? 's' : ''} executed
        </span>
      </div>

      <div className="space-y-3">
        {nodeExecutions.map((execution, index) => {
          const status = getNodeStatus(execution);
          const isExpanded = expandedNodes[index];
          const isActive = execution.node === currentNode && !execution.completed_at;

          return (
            <div
              key={index}
              className={`border-2 rounded-lg overflow-hidden transition-all ${getNodeColor(execution.node)} ${
                isActive ? 'ring-2 ring-white' : ''
              }`}
            >
              {/* Node Header */}
              <div
                className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => toggleNode(index)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                    {getStatusIcon(status)}
                    <div>
                      <h4 className="font-semibold text-white capitalize">
                        {execution.node.replace('_', ' ')}
                      </h4>
                      <p className="text-xs text-gray-400">{getNodeDescription(execution.node)}</p>
                    </div>
                  </div>
                  <div className="text-right text-xs text-gray-400">
                    <div>Started: {formatTimestamp(execution.started_at)}</div>
                    {execution.completed_at && (
                      <div>
                        Duration: {calculateDuration(execution.started_at, execution.completed_at)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-gray-700 bg-black/20">
                  {/* Input Section */}
                  <div className="p-4 border-b border-gray-700">
                    <h5 className="text-sm font-semibold text-blue-400 mb-2 flex items-center">
                      <span className="mr-2">📥</span> INPUT
                    </h5>
                    <div className="bg-gray-900/50 p-3 rounded">
                      {renderValue(execution.input)}
                    </div>
                  </div>

                  {/* Prompt Section (if available) */}
                  {execution.prompt_sent && (
                    <div className="p-4 border-b border-gray-700">
                      <h5 className="text-sm font-semibold text-purple-400 mb-2 flex items-center">
                        <span className="mr-2">💬</span> PROMPT SENT TO LLM
                      </h5>
                      <div className="bg-gray-900/50 p-3 rounded">
                        <pre className="text-xs text-gray-300 whitespace-pre-wrap">
                          {execution.prompt_sent}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Raw LLM Response (if available) */}
                  {execution.raw_llm_response && (
                    <div className="p-4 border-b border-gray-700">
                      <h5 className="text-sm font-semibold text-purple-400 mb-2 flex items-center">
                        <span className="mr-2">🤖</span> RAW LLM RESPONSE
                      </h5>
                      <div className="bg-gray-900/50 p-3 rounded">
                        <pre className="text-xs text-gray-300 whitespace-pre-wrap">
                          {execution.raw_llm_response}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Search Details (for search agents) */}
                  {execution.search_details && execution.search_details.length > 0 && (
                    <div className="p-4 border-b border-gray-700">
                      <h5 className="text-sm font-semibold text-cyan-400 mb-2 flex items-center">
                        <span className="mr-2">🔍</span> SEARCH DETAILS
                      </h5>
                      <div className="space-y-2">
                        {execution.search_details.map((detail, idx) => (
                          <div key={idx} className="bg-gray-900/50 p-3 rounded">
                            <div className="text-sm text-white mb-1">
                              <strong>Query:</strong> {detail.query}
                            </div>
                            <div className="text-xs text-gray-400">
                              Results found: {detail.results_found}
                            </div>
                            {detail.error && (
                              <div className="text-xs text-red-400 mt-1">
                                Error: {detail.error}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Output Section */}
                  {execution.output && (
                    <div className="p-4 border-b border-gray-700">
                      <h5 className="text-sm font-semibold text-green-400 mb-2 flex items-center">
                        <span className="mr-2">📤</span> OUTPUT
                      </h5>
                      <div className="bg-gray-900/50 p-3 rounded">
                        {renderValue(execution.output)}
                      </div>
                    </div>
                  )}

                  {/* Error Section */}
                  {execution.error && (
                    <div className="p-4 bg-red-900/20">
                      <h5 className="text-sm font-semibold text-red-400 mb-2 flex items-center">
                        <span className="mr-2">❌</span> ERROR
                      </h5>
                      <div className="bg-gray-900/50 p-3 rounded">
                        <pre className="text-xs text-red-300 whitespace-pre-wrap">
                          {execution.error}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {nodeExecutions.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No agent executions yet. Start a research query to see the flow.</p>
        </div>
      )}
    </div>
  );
};

export default GraphFlowVisualization;
