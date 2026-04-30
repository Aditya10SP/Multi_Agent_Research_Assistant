import React, { useState, useEffect } from 'react';
import { getAgentSteps } from '../utils/agentStepDefinitions';

const ComprehensiveProgress = ({ jobId }) => {
  const [progressData, setProgressData] = useState(null);
  const [expandedSteps, setExpandedSteps] = useState({});
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!jobId) return;

    const eventSource = new EventSource(`http://localhost:8000/research/${jobId}/status`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event_type === 'update') {
          setProgressData(data);
        }
        if (data.event_type === 'complete') {
          setIsComplete(true);
          // Keep the last state visible
        }
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => eventSource.close();
  }, [jobId]);

  const toggleStep = (stepId) => {
    setExpandedSteps(prev => ({
      ...prev,
      [stepId]: !prev[stepId]
    }));
  };

  const expandAll = () => {
    const allExpanded = {};
    agentSteps.forEach(step => {
      allExpanded[step.id] = true;
    });
    setExpandedSteps(allExpanded);
  };

  const collapseAll = () => {
    setExpandedSteps({});
  };

  if (!progressData) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-white">
        <div className="animate-pulse">Waiting for research to start...</div>
      </div>
    );
  }

  const agentSteps = getAgentSteps(progressData);

  return (
    <div className="bg-gray-900 rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Research Pipeline - Detailed Execution</h2>
          <p className="text-sm text-gray-400 mt-1">
            Comprehensive view of how each agent works and why
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-400">
            Job ID: <span className="text-blue-400 font-mono">{jobId?.slice(0, 13)}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={expandAll}
              className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>

      {isComplete && (
        <div className="bg-green-900 bg-opacity-20 border border-green-500 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div>
              <div className="text-green-400 font-semibold">Research Complete!</div>
              <div className="text-gray-300 text-sm">All steps below remain visible for review and learning</div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {agentSteps.map((step, index) => (
          <AgentStepCard
            key={step.id}
            step={step}
            index={index}
            isExpanded={expandedSteps[step.id]}
            onToggle={() => toggleStep(step.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default ComprehensiveProgress;

const AgentStepCard = ({ step, index, isExpanded, onToggle }) => {
  const getStatusColor = () => {
    switch (step.status) {
      case 'complete': return 'border-green-500 bg-green-900 bg-opacity-20';
      case 'in-progress': return 'border-blue-500 bg-blue-900 bg-opacity-20 shadow-lg shadow-blue-500/50';
      case 'pending': return 'border-gray-600 bg-gray-800 bg-opacity-50';
      case 'failed': return 'border-red-500 bg-red-900 bg-opacity-20';
      default: return 'border-gray-600 bg-gray-800';
    }
  };

  const getStatusIcon = () => {
    switch (step.status) {
      case 'complete':
        return (
          <svg className="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'in-progress':
        return (
          <svg className="w-6 h-6 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
      case 'failed':
        return (
          <svg className="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  return (
    <div className={`border-2 rounded-lg transition-all duration-300 ${getStatusColor()}`}>
      {/* Header */}
      <div 
        className="p-4 cursor-pointer hover:bg-opacity-30 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 mt-1">
            {getStatusIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-gray-400 font-mono text-sm">Step {index + 1}</span>
                <h3 className="text-xl font-bold text-white">{step.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                  step.status === 'complete' ? 'bg-green-500 text-white' :
                  step.status === 'in-progress' ? 'bg-blue-500 text-white animate-pulse' :
                  step.status === 'failed' ? 'bg-red-500 text-white' :
                  'bg-gray-600 text-gray-300'
                }`}>
                  {step.status.toUpperCase()}
                </span>
                <svg 
                  className={`w-5 h-5 text-gray-400 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <p className="text-gray-300 text-sm mb-2">{step.description}</p>
            {!isExpanded && step.quickSummary && (
              <div className="text-xs text-gray-400 mt-2">
                {step.quickSummary}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-700 p-6 space-y-6">
          {/* Purpose Section */}
          <Section title="🎯 Purpose & Role" icon="🎯">
            <p className="text-gray-300 leading-relaxed">{step.purpose}</p>
          </Section>

          {/* How It Works */}
          <Section title="⚙️ How It Works" icon="⚙️">
            <ol className="space-y-3">
              {step.howItWorks.map((item, i) => (
                <li key={i} className="flex gap-3 text-gray-300">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">
                    {i + 1}
                  </span>
                  <span className="flex-1">{item}</span>
                </li>
              ))}
            </ol>
          </Section>

          {/* Current Execution */}
          {step.execution && (
            <Section title="📊 Current Execution" icon="📊">
              <div className="space-y-3">
                {step.execution.map((item, i) => (
                  <div key={i} className="bg-gray-800 rounded p-3">
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400">▸</span>
                      <div className="flex-1">
                        <div className="text-white font-medium">{item.label}</div>
                        <div className="text-gray-400 text-sm mt-1">{item.value}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* NEW: Detailed Input/Output Tracking */}
          {step.inputOutput && (
            <>
              {/* Input Section */}
              <Section title="📥 Input" icon="📥">
                <div className="bg-gray-800 rounded-lg p-4 space-y-3">
                  <div className="text-sm text-gray-400 mb-3">{step.inputOutput.input.title}</div>
                  {step.inputOutput.input.data.map((item, i) => (
                    <div key={i} className="flex justify-between items-start border-b border-gray-700 pb-2 last:border-0">
                      <span className="text-gray-400 text-sm">{item.label}:</span>
                      <span className={`text-white text-sm font-mono ml-4 text-right ${
                        item.type === 'badge' ? 'px-2 py-1 bg-blue-600 rounded' : ''
                      }`}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </Section>

              {/* Processing Steps */}
              <Section title="⚙️ Processing Pipeline" icon="⚙️">
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-3">{step.inputOutput.processing.title}</div>
                  <div className="space-y-2">
                    {step.inputOutput.processing.steps.map((procStep, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold mt-0.5">
                          {i + 1}
                        </div>
                        <div className="flex-1 text-gray-300 text-sm">{procStep}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </Section>

              {/* Output Section */}
              <Section title="📤 Output" icon="📤">
                <div className="bg-gray-800 rounded-lg p-4 space-y-4">
                  <div className="text-sm text-gray-400 mb-3">{step.inputOutput.output.title}</div>
                  {step.inputOutput.output.data.map((item, i) => (
                    <div key={i} className="border-l-4 border-green-500 pl-4 py-2">
                      <div className="text-white font-semibold mb-1">{item.label}</div>
                      {item.type === 'list' && Array.isArray(item.value) ? (
                        <ul className="space-y-1 mt-2">
                          {item.value.map((v, j) => (
                            <li key={j} className="text-gray-300 text-sm flex items-start gap-2">
                              <span className="text-green-400 flex-shrink-0">•</span>
                              <span>{v}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-gray-300 text-sm">{item.value}</div>
                      )}
                      {item.explanation && (
                        <div className="text-xs text-gray-500 mt-2 italic">
                          → {item.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Section>

              {/* Transformation Explanation */}
              <Section title="🔄 Transformation" icon="🔄">
                <div className="bg-gradient-to-r from-blue-900 to-purple-900 bg-opacity-20 rounded-lg p-4 border border-blue-500">
                  <div className="text-gray-300 leading-relaxed">
                    {step.inputOutput.transformation.explanation}
                  </div>
                </div>
              </Section>
            </>
          )}

          {/* Why This Approach */}
          <Section title="💡 Why This Approach?" icon="💡">
            <div className="space-y-3">
              {step.whyThisApproach.map((reason, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-green-400 flex-shrink-0">✓</span>
                  <p className="text-gray-300">{reason}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* Alternative Approaches */}
          <Section title="🔄 Alternative Approaches Considered" icon="🔄">
            <div className="space-y-4">
              {step.alternatives.map((alt, i) => (
                <div key={i} className="bg-gray-800 rounded p-4">
                  <div className="flex items-start gap-3 mb-2">
                    <span className="text-yellow-400">⚠</span>
                    <h4 className="text-white font-semibold">{alt.name}</h4>
                  </div>
                  <p className="text-gray-400 text-sm ml-6 mb-2">{alt.description}</p>
                  <div className="ml-6 text-sm">
                    <span className="text-red-400 font-medium">Why not used:</span>
                    <span className="text-gray-300 ml-2">{alt.whyNot}</span>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Technical Details */}
          <Section title="🔧 Technical Implementation" icon="🔧">
            <div className="grid grid-cols-2 gap-4">
              {step.technical.map((tech, i) => (
                <div key={i} className="bg-gray-800 rounded p-3">
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{tech.label}</div>
                  <div className="text-white font-mono text-sm">{tech.value}</div>
                </div>
              ))}
            </div>
          </Section>

          {/* Output/Results */}
          {step.results && step.results.length > 0 && (
            <Section title="📤 Output & Results" icon="📤">
              <div className="space-y-2">
                {step.results.map((result, i) => (
                  <details key={i} className="bg-gray-800 rounded">
                    <summary className="p-3 cursor-pointer hover:bg-gray-750 transition-colors text-white font-medium">
                      {result.title} ({result.count} items)
                    </summary>
                    <div className="p-3 pt-0 space-y-2 max-h-60 overflow-y-auto">
                      {result.items.map((item, j) => (
                        <div key={j} className="bg-gray-900 rounded p-2 text-sm">
                          <div className="text-gray-300">{item}</div>
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </Section>
          )}

          {/* Decision Logic */}
          {step.decisionLogic && (
            <Section title="🧠 Decision Logic" icon="🧠">
              <div className="space-y-3">
                {step.decisionLogic.map((decision, i) => (
                  <div key={i} className="bg-gray-800 rounded p-4">
                    <div className="text-white font-medium mb-2">{decision.condition}</div>
                    <div className="text-gray-400 text-sm">{decision.action}</div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}
    </div>
  );
};

const Section = ({ title, children }) => (
  <div className="space-y-3">
    <h4 className="text-lg font-bold text-white flex items-center gap-2">
      {title}
    </h4>
    <div className="pl-4 border-l-2 border-gray-700">
      {children}
    </div>
  </div>
);
