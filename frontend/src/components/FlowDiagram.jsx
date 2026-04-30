import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle, Clock, XCircle, AlertTriangle } from 'lucide-react';

const FlowDiagram = ({ nodeExecutions = [], currentNode }) => {
  const [activeNodes, setActiveNodes] = useState(new Set());
  const [completedNodes, setCompletedNodes] = useState(new Set());
  const [errorNodes, setErrorNodes] = useState(new Set());

  useEffect(() => {
    const completed = new Set();
    const errors = new Set();
    
    nodeExecutions.forEach(exec => {
      if (exec.error) {
        errors.add(exec.node);
      } else if (exec.completed_at) {
        completed.add(exec.node);
      }
    });
    
    setCompletedNodes(completed);
    setErrorNodes(errors);
    
    if (currentNode && !completed.has(currentNode)) {
      setActiveNodes(new Set([currentNode]));
    }
  }, [nodeExecutions, currentNode]);

  const getNodeStatus = (nodeName) => {
    if (errorNodes.has(nodeName)) return 'error';
    if (completedNodes.has(nodeName)) return 'completed';
    if (activeNodes.has(nodeName)) return 'active';
    return 'pending';
  };

  const getNodeExecution = (nodeName) => {
    return nodeExecutions.find(exec => exec.node === nodeName);
  };

  const Node = ({ name, label, description, color }) => {
    const status = getNodeStatus(name);
    const execution = getNodeExecution(name);
    
    const statusColors = {
      pending: 'bg-gray-700 border-gray-600 text-gray-400',
      active: `bg-${color}-900/30 border-${color}-500 text-white ring-2 ring-${color}-400 animate-pulse`,
      completed: `bg-${color}-900/50 border-${color}-600 text-white`,
      error: 'bg-red-900/50 border-red-600 text-white'
    };

    const StatusIcon = () => {
      switch (status) {
        case 'completed':
          return <CheckCircle className="w-5 h-5 text-green-400" />;
        case 'active':
          return <Clock className="w-5 h-5 text-blue-400 animate-spin" />;
        case 'error':
          return <XCircle className="w-5 h-5 text-red-400" />;
        default:
          return <div className="w-5 h-5 rounded-full border-2 border-gray-600" />;
      }
    };

    return (
      <div className={`relative border-2 rounded-lg p-4 min-w-[200px] transition-all duration-300 ${statusColors[status]}`}>
        <div className="flex items-start space-x-3">
          <StatusIcon />
          <div className="flex-1">
            <h4 className="font-semibold text-sm mb-1">{label}</h4>
            <p className="text-xs opacity-75">{description}</p>
            {execution && execution.completed_at && (
              <div className="mt-2 text-xs opacity-60">
                {((new Date(execution.completed_at) - new Date(execution.started_at)) / 1000).toFixed(2)}s
              </div>
            )}
          </div>
        </div>
        
        {/* Output summary badge */}
        {execution && execution.output && (
          <div className="mt-2 pt-2 border-t border-white/10">
            <div className="text-xs space-y-1">
              {execution.output.total_results !== undefined && (
                <div>📊 {execution.output.total_results} results</div>
              )}
              {execution.output.total_papers !== undefined && (
                <div>📄 {execution.output.total_papers} papers</div>
              )}
              {execution.output.total_summaries !== undefined && (
                <div>📝 {execution.output.total_summaries} summaries</div>
              )}
              {execution.output.num_sub_questions !== undefined && (
                <div>❓ {execution.output.num_sub_questions} questions</div>
              )}
              {execution.output.quality_score !== undefined && (
                <div>⭐ {(execution.output.feedback.quality_score * 100).toFixed(0)}% quality</div>
              )}
              {execution.output.num_key_findings !== undefined && (
                <div>🔍 {execution.output.num_key_findings} findings</div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const Arrow = ({ active = false, label = '' }) => (
    <div className="flex flex-col items-center justify-center mx-2">
      <ArrowRight 
        className={`w-8 h-8 transition-all duration-300 ${
          active ? 'text-blue-400 animate-pulse' : 'text-gray-600'
        }`} 
      />
      {label && (
        <span className="text-xs text-gray-500 mt-1">{label}</span>
      )}
    </div>
  );

  const ConditionalArrow = ({ condition, activeCondition }) => {
    const isRetry = condition === 'retry';
    const isActive = activeCondition === condition;
    
    return (
      <div className="flex flex-col items-center justify-center mx-2">
        <div className={`text-xs px-2 py-1 rounded mb-1 ${
          isActive ? 'bg-yellow-900/50 text-yellow-300' : 'bg-gray-800 text-gray-500'
        }`}>
          {condition}
        </div>
        <ArrowRight 
          className={`w-6 h-6 transition-all ${
            isActive ? 'text-yellow-400 animate-pulse' : 'text-gray-600'
          }`} 
        />
      </div>
    );
  };

  // Determine if critic triggered retry
  const criticExecution = getNodeExecution('critic');
  const criticDecision = criticExecution?.output?.decision || 'proceed';

  return (
    <div className="bg-slate-900 rounded-lg p-6 overflow-x-auto">
      <h3 className="text-xl font-bold text-white mb-6 flex items-center">
        <span className="mr-2">🔄</span>
        Agent Execution Flow Diagram
      </h3>

      {/* Legend */}
      <div className="flex items-center space-x-4 mb-6 text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-gray-700 border border-gray-600"></div>
          <span className="text-gray-400">Pending</span>
        </div>
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-blue-400" />
          <span className="text-gray-400">Active</span>
        </div>
        <div className="flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-green-400" />
          <span className="text-gray-400">Completed</span>
        </div>
        <div className="flex items-center space-x-2">
          <XCircle className="w-4 h-4 text-red-400" />
          <span className="text-gray-400">Error</span>
        </div>
      </div>

      {/* Main Flow */}
      <div className="space-y-8">
        {/* Row 1: Planner */}
        <div className="flex items-center justify-center">
          <div className="flex items-center">
            <div className="text-center">
              <div className="text-sm text-gray-400 mb-2">START</div>
              <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center text-white font-bold">
                ▶
              </div>
            </div>
            <Arrow active={getNodeStatus('planner') === 'active'} />
            <Node 
              name="planner"
              label="1. Planner"
              description="Breaks question into sub-questions"
              color="purple"
            />
          </div>
        </div>

        {/* Row 2: Search Agents */}
        <div className="flex items-center justify-center">
          <div className="flex items-center">
            <div className="w-[200px]"></div>
            <Arrow active={getNodeStatus('web_search') === 'active'} />
            <Node 
              name="web_search"
              label="2. Web Search"
              description="Searches DuckDuckGo"
              color="blue"
            />
            <Arrow active={getNodeStatus('paper_search') === 'active'} />
            <Node 
              name="paper_search"
              label="3. Paper Search"
              description="Searches ArXiv papers"
              color="cyan"
            />
          </div>
        </div>

        {/* Row 3: Document Reader */}
        <div className="flex items-center justify-center">
          <div className="flex items-center">
            <div className="w-[200px]"></div>
            <Arrow active={getNodeStatus('document_reader') === 'active'} />
            <div className="ml-[220px]">
              <Node 
                name="document_reader"
                label="4. Document Reader"
                description="Summarizes all sources"
                color="green"
              />
            </div>
          </div>
        </div>

        {/* Row 4: Critic with conditional routing */}
        <div className="flex items-center justify-center">
          <div className="flex items-center">
            <div className="w-[200px]"></div>
            <Arrow active={getNodeStatus('critic') === 'active'} />
            <div className="ml-[220px]">
              <Node 
                name="critic"
                label="5. Critic"
                description="Evaluates quality & decides"
                color="yellow"
              />
            </div>
          </div>
        </div>

        {/* Conditional routing visualization */}
        <div className="flex items-center justify-center">
          <div className="relative w-full max-w-4xl">
            {/* Decision point */}
            <div className="flex items-start justify-center space-x-8">
              {/* Retry path (loops back) */}
              <div className="flex flex-col items-center">
                <ConditionalArrow 
                  condition="retry" 
                  activeCondition={criticDecision}
                />
                <div className="text-xs text-gray-500 mt-2 text-center max-w-[150px]">
                  Quality &lt; 60%<br/>Retry count &lt; 1
                </div>
                {criticDecision === 'retry' && (
                  <div className="mt-4 text-yellow-400 text-xs flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    Looping back to Web Search
                  </div>
                )}
              </div>

              {/* Proceed path */}
              <div className="flex flex-col items-center">
                <ConditionalArrow 
                  condition="proceed" 
                  activeCondition={criticDecision}
                />
                <div className="text-xs text-gray-500 mt-2 text-center max-w-[150px]">
                  Quality ≥ 60%<br/>OR max retries reached
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Row 5: Synthesizer */}
        <div className="flex items-center justify-center">
          <div className="flex items-center">
            <div className="w-[200px]"></div>
            <Arrow active={getNodeStatus('synthesizer') === 'active'} />
            <div className="ml-[220px]">
              <Node 
                name="synthesizer"
                label="6. Synthesizer"
                description="Generates final report"
                color="pink"
              />
            </div>
            <Arrow active={getNodeStatus('synthesizer') === 'completed'} />
            <div className="text-center">
              <div className="text-sm text-gray-400 mb-2">END</div>
              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                ✓
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Execution Summary */}
      {nodeExecutions.length > 0 && (
        <div className="mt-8 pt-6 border-t border-gray-700">
          <h4 className="text-sm font-semibold text-white mb-3">Execution Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-gray-800 rounded p-3">
              <div className="text-gray-400 text-xs mb-1">Total Nodes</div>
              <div className="text-white font-semibold">{nodeExecutions.length}</div>
            </div>
            <div className="bg-green-900/30 rounded p-3">
              <div className="text-gray-400 text-xs mb-1">Completed</div>
              <div className="text-green-400 font-semibold">{completedNodes.size}</div>
            </div>
            <div className="bg-blue-900/30 rounded p-3">
              <div className="text-gray-400 text-xs mb-1">Active</div>
              <div className="text-blue-400 font-semibold">{activeNodes.size}</div>
            </div>
            <div className="bg-red-900/30 rounded p-3">
              <div className="text-gray-400 text-xs mb-1">Errors</div>
              <div className="text-red-400 font-semibold">{errorNodes.size}</div>
            </div>
          </div>
        </div>
      )}

      {/* State Flow Explanation */}
      <div className="mt-6 bg-gray-800/50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-white mb-2 flex items-center">
          <span className="mr-2">💡</span>
          How Data Flows
        </h4>
        <div className="text-xs text-gray-300 space-y-2">
          <div><strong className="text-purple-400">Planner:</strong> question → sub_questions</div>
          <div><strong className="text-blue-400">Web Search:</strong> sub_questions → web_results</div>
          <div><strong className="text-cyan-400">Paper Search:</strong> sub_questions → paper_results</div>
          <div><strong className="text-green-400">Document Reader:</strong> web_results + paper_results → document_summaries</div>
          <div><strong className="text-yellow-400">Critic:</strong> document_summaries → quality_score + decision (retry/proceed)</div>
          <div><strong className="text-pink-400">Synthesizer:</strong> document_summaries → final_report</div>
        </div>
      </div>
    </div>
  );
};

export default FlowDiagram;
