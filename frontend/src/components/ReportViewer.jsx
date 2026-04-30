import React, { useState } from 'react';
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';

const ReportViewer = ({ report }) => {
  const [expandedSections, setExpandedSections] = useState(new Set(['summary']));

  const toggleSection = (section) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  if (!report) {
    return (
      <div className="bg-slate-800 rounded-lg p-8 text-center">
        <p className="text-slate-400">No report available yet. Start a research query to generate a report.</p>
      </div>
    );
  }

  const Section = ({ title, children, sectionKey }) => {
    const isExpanded = expandedSections.has(sectionKey);
    
    return (
      <div className="border border-slate-700 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full flex items-center justify-between p-4 bg-slate-700 hover:bg-slate-600 transition-colors"
        >
          <h3 className="text-lg font-semibold text-slate-200">{title}</h3>
          {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        </button>
        {isExpanded && (
          <div className="p-4 bg-slate-800">
            {children}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6 space-y-4">
      <h2 className="text-2xl font-bold text-slate-100 mb-6">Research Report</h2>

      <Section title="Summary" sectionKey="summary">
        <p className="text-slate-300 leading-relaxed">{report.summary}</p>
      </Section>

      <Section title="Key Findings" sectionKey="findings">
        <div className="space-y-4">
          {report.key_findings?.map((finding, idx) => (
            <div key={idx} className="bg-slate-700 p-4 rounded-lg">
              <p className="text-slate-200 mb-2">{finding.statement}</p>
              <div className="flex items-center gap-2 text-sm">
                <span className={`px-2 py-1 rounded ${
                  finding.confidence === 'high' ? 'bg-green-600' :
                  finding.confidence === 'medium' ? 'bg-yellow-600' :
                  'bg-orange-600'
                } text-white`}>
                  {finding.confidence} confidence
                </span>
                <span className="text-slate-400">
                  {finding.citations?.length || 0} citations
                </span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Limitations" sectionKey="limitations">
        <ul className="space-y-2">
          {report.limitations?.map((limitation, idx) => (
            <li key={idx} className="text-slate-300 flex items-start gap-2">
              <span className="text-yellow-400 mt-1">⚠</span>
              <span>{limitation}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="References" sectionKey="references">
        <div className="space-y-3">
          {report.references?.map((ref, idx) => (
            <div key={idx} className="bg-slate-700 p-3 rounded-lg">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-slate-200 font-medium">{ref.title}</p>
                  {ref.authors?.length > 0 && (
                    <p className="text-sm text-slate-400 mt-1">
                      {ref.authors.join(', ')}
                    </p>
                  )}
                  <span className={`inline-block mt-2 px-2 py-1 text-xs rounded ${
                    ref.source_type === 'paper' ? 'bg-purple-600' : 'bg-blue-600'
                  } text-white`}>
                    {ref.source_type}
                  </span>
                </div>
                <a
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <ExternalLink size={18} />
                </a>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
};

export default ReportViewer;
