import React from 'react';
import { Clock, ChevronLeft, ChevronRight } from 'lucide-react';

const HistorySidebar = ({ history, onSelect, isOpen, onToggle }) => {
  return (
    <>
      <button
        onClick={onToggle}
        className="fixed right-0 top-1/2 -translate-y-1/2 bg-slate-700 hover:bg-slate-600 p-2 rounded-l-lg transition-colors z-10"
      >
        {isOpen ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>

      <aside
        className={`fixed right-0 top-0 h-full bg-slate-800 border-l border-slate-700 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } w-80 overflow-y-auto z-20`}
      >
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={20} className="text-blue-400" />
            <h3 className="text-lg font-semibold text-slate-200">Research History</h3>
          </div>

          {history.length === 0 ? (
            <p className="text-slate-400 text-sm">No research history yet</p>
          ) : (
            <div className="space-y-2">
              {history.map((session) => (
                <button
                  key={session.job_id}
                  onClick={() => onSelect(session.job_id)}
                  className="w-full text-left p-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                >
                  <p className="text-slate-200 text-sm font-medium line-clamp-2 mb-2">
                    {session.question}
                  </p>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{new Date(session.created_at).toLocaleDateString()}</span>
                    <span className={`px-2 py-1 rounded ${
                      session.status === 'complete' ? 'bg-green-600' :
                      session.status === 'failed' ? 'bg-red-600' :
                      'bg-yellow-600'
                    } text-white`}>
                      {session.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default HistorySidebar;
