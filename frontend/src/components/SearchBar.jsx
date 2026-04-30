import React, { useState } from 'react';
import { Search } from 'lucide-react';

const SearchBar = ({ onSearch, isLoading }) => {
  const [question, setQuestion] = useState('');
  const [depth, setDepth] = useState('quick');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (question.trim()) {
      await onSearch(question, depth);
    }
  };

  return (
    <div className="w-full bg-slate-800 p-6 rounded-lg shadow-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-4">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Enter your research question..."
            className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !question.trim()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <Search size={20} />
            {isLoading ? 'Researching...' : 'Research'}
          </button>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-slate-300 text-sm">Depth:</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDepth('quick')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                depth === 'quick'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
              disabled={isLoading}
            >
              Quick
            </button>
            <button
              type="button"
              onClick={() => setDepth('deep')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                depth === 'deep'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
              disabled={isLoading}
            >
              Deep
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SearchBar;
