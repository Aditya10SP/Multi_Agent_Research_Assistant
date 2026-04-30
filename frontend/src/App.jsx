import React, { useState, useEffect } from 'react';
import axios from 'axios';
import SearchBar from './components/SearchBar';
import AgentGraph from './components/AgentGraph';
import IntermediateResults from './components/IntermediateResults';
import ReportViewer from './components/ReportViewer';
import HistorySidebar from './components/HistorySidebar';
import ComprehensiveProgress from './components/ComprehensiveProgress';
import { useSSE } from './hooks/useSSE';

const API_URL = 'http://localhost:8000';

function App() {
  const [currentJobId, setCurrentJobId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [finalReport, setFinalReport] = useState(null);
  const [history, setHistory] = useState([]);
  const [currentNode, setCurrentNode] = useState('');
  const [completedNodes, setCompletedNodes] = useState([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  const { events, connect, disconnect, reset } = useSSE();

  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  // Track current node from events
  useEffect(() => {
    if (events.length > 0) {
      const latestEvent = events[events.length - 1];
      
      if (latestEvent.event_type === 'node_update') {
        setCurrentNode(latestEvent.node);
        if (!completedNodes.includes(latestEvent.node)) {
          setCompletedNodes(prev => [...prev, latestEvent.node]);
        }
      }
      
      if (latestEvent.event_type === 'complete') {
        setIsLoading(false);
        if (latestEvent.status === 'complete') {
          fetchReport(currentJobId);
        }
      }
    }
  }, [events]);

  const loadHistory = async () => {
    try {
      const response = await axios.get(`${API_URL}/research/history`);
      setHistory(response.data.sessions || []);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const handleSearch = async (question, depth) => {
    try {
      setIsLoading(true);
      setFinalReport(null);
      setCurrentNode('');
      setCompletedNodes([]);
      reset();

      const response = await axios.post(`${API_URL}/research`, {
        question,
        depth
      });

      const jobId = response.data.job_id;
      setCurrentJobId(jobId);
      connect(jobId);
      
      // Reload history
      loadHistory();
    } catch (error) {
      console.error('Failed to start research:', error);
      setIsLoading(false);
      alert('Failed to start research. Please try again.');
    }
  };

  const fetchReport = async (jobId) => {
    try {
      const response = await axios.get(`${API_URL}/research/${jobId}/report`);
      setFinalReport(response.data.report);
      disconnect();
    } catch (error) {
      console.error('Failed to fetch report:', error);
    }
  };

  const handleSelectHistory = async (jobId) => {
    try {
      const response = await axios.get(`${API_URL}/research/${jobId}/report`);
      setFinalReport(response.data.report);
      setCurrentJobId(jobId);
      setIsHistoryOpen(false);
    } catch (error) {
      console.error('Failed to load historical report:', error);
      alert('Failed to load report. It may still be processing.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-100 mb-2">
            Multi-Agent Research Assistant
          </h1>
          <p className="text-slate-400">
            AI-powered research using specialized agents and LangGraph orchestration
          </p>
        </div>

        {/* Search Bar */}
        <SearchBar onSearch={handleSearch} isLoading={isLoading} />

        {/* Comprehensive Progress - Show when research is active or complete */}
        {currentJobId && (
          <div className="mt-6">
            <ComprehensiveProgress jobId={currentJobId} />
          </div>
        )}

        {/* Main Content Grid - Only show during active research */}
        {isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            {/* Agent Graph */}
            <div className="lg:col-span-1 h-96">
              <AgentGraph 
                currentNode={currentNode}
                completedNodes={completedNodes}
                failedNodes={[]}
              />
            </div>

            {/* Intermediate Results */}
            <div className="lg:col-span-2 h-96">
              <IntermediateResults events={events} />
            </div>
          </div>
        )}

        {/* Report Viewer */}
        {finalReport && (
          <div className="mt-6">
            <ReportViewer report={finalReport} />
          </div>
        )}
      </div>

      {/* History Sidebar */}
      <HistorySidebar
        history={history}
        onSelect={handleSelectHistory}
        isOpen={isHistoryOpen}
        onToggle={() => setIsHistoryOpen(!isHistoryOpen)}
      />
    </div>
  );
}

export default App;
