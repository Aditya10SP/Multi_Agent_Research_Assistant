import React, { useState, useEffect } from 'react';

const DetailedProgress = ({ jobId }) => {
  const [progress, setProgress] = useState({
    currentNode: '',
    status: '',
    steps: []
  });

  useEffect(() => {
    if (!jobId) return;

    const eventSource = new EventSource(`http://localhost:8000/research/${jobId}/status`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Map status to detailed steps
        const stepDetails = mapStatusToSteps(data);
        setProgress({
          currentNode: data.current_node || '',
          status: data.status || '',
          steps: stepDetails
        });
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => eventSource.close();
  }, [jobId]);

  const mapStatusToSteps = (data) => {
    const steps = [
      {
        id: 'planner',
        name: 'Research Planning',
        description: 'Breaking down the question into sub-questions',
        status: getStepStatus('planner', data),
        details: data.plan ? [
          `Generated ${data.plan.sub_questions?.length || 0} sub-questions`,
          `Strategy: ${data.plan.strategy || 'N/A'}`,
          `Keywords: ${data.plan.search_keywords?.join(', ') || 'N/A'}`
        ] : [],
        substeps: data.plan?.sub_questions?.map((q, i) => ({
          id: `subq-${i}`,
          text: q,
          status: 'complete'
        })) || []
      },
      {
        id: 'web_search',
        name: 'Web Search',
        description: 'Searching the web for relevant information',
        status: getStepStatus('web_search', data),
        details: [
          `Found ${data.web_results?.length || 0} web results`,
          data.web_results?.length > 0 ? 'Sources: ' + data.web_results.slice(0, 3).map(r => r.source).join(', ') : 'No web results (rate limited or no matches)'
        ],
        substeps: data.web_results?.map((result, i) => ({
          id: `web-${i}`,
          text: `${result.title} (${result.source})`,
          status: 'complete'
        })) || []
      },
      {
        id: 'paper_search',
        name: 'Academic Paper Search',
        description: 'Searching arXiv for academic papers',
        status: getStepStatus('paper_search', data),
        details: [
          `Found ${data.paper_results?.length || 0} academic papers`,
          data.paper_results?.length > 0 ? `Top paper: ${data.paper_results[0]?.title}` : 'Searching...'
        ],
        substeps: data.paper_results?.map((paper, i) => ({
          id: `paper-${i}`,
          text: `${paper.title} by ${paper.authors?.slice(0, 2).join(', ')}`,
          status: 'complete',
          url: paper.url
        })) || []
      },
      {
        id: 'document_reader',
        name: 'Document Analysis',
        description: 'Reading and summarizing documents using LLM',
        status: getStepStatus('document_reader', data),
        details: [
          `Processed ${data.document_summaries?.length || 0} documents`,
          `Using: Groq llama-3.1-8b-instant`,
          data.document_summaries?.length > 0 ? `Average summary length: ${Math.round(data.document_summaries.reduce((acc, s) => acc + s.summary.length, 0) / data.document_summaries.length)} chars` : 'Processing...'
        ],
        substeps: data.document_summaries?.map((summary, i) => ({
          id: `summary-${i}`,
          text: `${summary.source_type}: ${summary.source}`,
          status: 'complete',
          keyPoints: summary.key_points
        })) || []
      },
      {
        id: 'critic',
        name: 'Quality Evaluation',
        description: 'Evaluating research quality and identifying gaps',
        status: getStepStatus('critic', data),
        details: data.critic_feedback ? [
          `Quality Score: ${(data.critic_feedback.quality_score * 100).toFixed(0)}%`,
          `Source Credibility: ${(data.critic_feedback.source_credibility * 100).toFixed(0)}%`,
          `Gaps Found: ${data.critic_feedback.gaps?.length || 0}`,
          `Retry Needed: ${data.critic_feedback.retry_needed ? 'Yes' : 'No'}`
        ] : ['Evaluating...'],
        substeps: data.critic_feedback?.gaps?.map((gap, i) => ({
          id: `gap-${i}`,
          text: gap,
          status: 'warning'
        })) || []
      },
      {
        id: 'synthesizer',
        name: 'Report Generation',
        description: 'Synthesizing final research report using LLM',
        status: getStepStatus('synthesizer', data),
        details: data.final_report ? [
          `Using: Groq llama-3.3-70b-versatile`,
          `Key Findings: ${data.final_report.key_findings?.length || 0}`,
          `References: ${data.final_report.references?.length || 0}`,
          `Report Length: ${data.final_report.summary?.length || 0} chars`
        ] : ['Generating report...'],
        substeps: data.final_report?.key_findings?.map((finding, i) => ({
          id: `finding-${i}`,
          text: finding.statement,
          status: 'complete',
          confidence: finding.confidence
        })) || []
      }
    ];

    return steps;
  };

  const getStepStatus = (stepId, data) => {
    const currentNode = data.current_node || '';
    const status = data.status || '';

    // Define step order
    const stepOrder = ['planner', 'web_search', 'paper_search', 'document_reader', 'critic', 'synthesizer'];
    const currentIndex = stepOrder.indexOf(currentNode);
    const stepIndex = stepOrder.indexOf(stepId);

    if (status === 'complete' || status === 'failed') {
      return stepIndex <= stepOrder.length - 1 ? 'complete' : 'pending';
    }

    if (currentNode === stepId) {
      return 'in-progress';
    }

    if (stepIndex < currentIndex) {
      return 'complete';
    }

    return 'pending';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'complete':
        return (
          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'in-progress':
        return (
          <svg className="w-5 h-5 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'complete':
        return 'border-green-500 bg-green-50';
      case 'in-progress':
        return 'border-blue-500 bg-blue-50 shadow-lg';
      case 'warning':
        return 'border-yellow-500 bg-yellow-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  return (
    <div className="space-y-4 p-6 bg-gray-900 rounded-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Research Pipeline Progress</h2>
        <div className="text-sm text-gray-400">
          Status: <span className="text-blue-400 font-semibold">{progress.status}</span>
        </div>
      </div>

      <div className="space-y-6">
        {progress.steps.map((step, index) => (
          <div key={step.id} className="relative">
            {/* Connector line */}
            {index < progress.steps.length - 1 && (
              <div className="absolute left-6 top-12 w-0.5 h-full bg-gray-700 -z-10"></div>
            )}

            {/* Step card */}
            <div className={`border-2 rounded-lg p-4 transition-all duration-300 ${getStatusColor(step.status)}`}>
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="flex-shrink-0 mt-1">
                  {getStatusIcon(step.status)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{step.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      step.status === 'complete' ? 'bg-green-200 text-green-800' :
                      step.status === 'in-progress' ? 'bg-blue-200 text-blue-800' :
                      step.status === 'warning' ? 'bg-yellow-200 text-yellow-800' :
                      'bg-gray-200 text-gray-600'
                    }`}>
                      {step.status}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-3">{step.description}</p>

                  {/* Details */}
                  {step.details.length > 0 && (
                    <div className="bg-white bg-opacity-50 rounded p-3 mb-3">
                      <div className="text-xs font-semibold text-gray-700 mb-2">Details:</div>
                      <ul className="space-y-1">
                        {step.details.map((detail, i) => (
                          <li key={i} className="text-xs text-gray-700 flex items-start">
                            <span className="mr-2">•</span>
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Substeps */}
                  {step.substeps.length > 0 && (
                    <div className="mt-3">
                      <details className="group">
                        <summary className="cursor-pointer text-xs font-semibold text-gray-700 hover:text-gray-900 flex items-center">
                          <svg className="w-4 h-4 mr-1 transform group-open:rotate-90 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                          Show {step.substeps.length} items
                        </summary>
                        <div className="mt-2 ml-5 space-y-2 max-h-60 overflow-y-auto">
                          {step.substeps.map((substep) => (
                            <div key={substep.id} className="bg-white bg-opacity-70 rounded p-2 text-xs">
                              <div className="flex items-start gap-2">
                                <div className="flex-shrink-0 mt-0.5">
                                  {getStatusIcon(substep.status || 'complete')}
                                </div>
                                <div className="flex-1">
                                  <div className="text-gray-800">{substep.text}</div>
                                  {substep.confidence && (
                                    <div className="text-gray-600 mt-1">
                                      Confidence: <span className="font-semibold">{substep.confidence}</span>
                                    </div>
                                  )}
                                  {substep.keyPoints && substep.keyPoints.length > 0 && (
                                    <div className="mt-1 text-gray-600">
                                      Key points: {substep.keyPoints.slice(0, 2).join(', ')}
                                      {substep.keyPoints.length > 2 && '...'}
                                    </div>
                                  )}
                                  {substep.url && (
                                    <a href={substep.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline mt-1 inline-block">
                                      View source →
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Technical Info */}
      <div className="mt-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Technical Details</h3>
        <div className="grid grid-cols-2 gap-4 text-xs text-gray-400">
          <div>
            <span className="font-medium">Current Node:</span> {progress.currentNode || 'N/A'}
          </div>
          <div>
            <span className="font-medium">Job ID:</span> {jobId?.slice(0, 8)}...
          </div>
          <div>
            <span className="font-medium">LLM (Heavy):</span> llama-3.3-70b-versatile
          </div>
          <div>
            <span className="font-medium">LLM (Fast):</span> llama-3.1-8b-instant
          </div>
          <div>
            <span className="font-medium">Framework:</span> LangGraph + FastAPI
          </div>
          <div>
            <span className="font-medium">Search:</span> DuckDuckGo + arXiv
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailedProgress;
