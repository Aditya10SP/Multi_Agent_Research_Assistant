import React from 'react';
import { FileText, Globe, BookOpen, CheckCircle } from 'lucide-react';

const IntermediateResults = ({ events }) => {
  const renderEvent = (event) => {
    const { node, data } = event;

    switch (node) {
      case 'planner':
        return (
          <div className="flex items-start gap-3">
            <FileText className="text-blue-400 mt-1" size={20} />
            <div>
              <h4 className="font-medium text-slate-200">Research Plan Generated</h4>
              {data?.plan && (
                <ul className="mt-2 space-y-1 text-sm text-slate-400">
                  {data.plan.sub_questions?.map((q, i) => (
                    <li key={i}>• {q}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        );

      case 'web_search':
        return (
          <div className="flex items-start gap-3">
            <Globe className="text-green-400 mt-1" size={20} />
            <div>
              <h4 className="font-medium text-slate-200">Web Search Complete</h4>
              <p className="text-sm text-slate-400 mt-1">
                Found {data?.web_results_count || 0} web sources
              </p>
            </div>
          </div>
        );

      case 'paper_search':
        return (
          <div className="flex items-start gap-3">
            <BookOpen className="text-purple-400 mt-1" size={20} />
            <div>
              <h4 className="font-medium text-slate-200">Paper Search Complete</h4>
              <p className="text-sm text-slate-400 mt-1">
                Found {data?.paper_results_count || 0} academic papers
              </p>
            </div>
          </div>
        );

      case 'document_reader':
        return (
          <div className="flex items-start gap-3">
            <FileText className="text-yellow-400 mt-1" size={20} />
            <div>
              <h4 className="font-medium text-slate-200">Documents Summarized</h4>
              <p className="text-sm text-slate-400 mt-1">
                Processed {data?.summaries_count || 0} documents
              </p>
            </div>
          </div>
        );

      case 'critic':
        return (
          <div className="flex items-start gap-3">
            <CheckCircle className="text-orange-400 mt-1" size={20} />
            <div>
              <h4 className="font-medium text-slate-200">Quality Evaluation Complete</h4>
              <p className="text-sm text-slate-400 mt-1">Research quality assessed</p>
            </div>
          </div>
        );

      case 'synthesizer':
        return (
          <div className="flex items-start gap-3">
            <CheckCircle className="text-green-400 mt-1" size={20} />
            <div>
              <h4 className="font-medium text-slate-200">Report Generated</h4>
              <p className="text-sm text-slate-400 mt-1">Final research report ready</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full bg-slate-800 rounded-lg p-4 overflow-y-auto">
      <h3 className="text-lg font-semibold text-slate-200 mb-4">Progress</h3>
      <div className="space-y-4">
        {events.length === 0 ? (
          <p className="text-slate-400 text-sm">Waiting for research to start...</p>
        ) : (
          events.map((event, idx) => (
            <div key={idx} className="bg-slate-700 p-3 rounded-lg">
              {renderEvent(event)}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default IntermediateResults;
