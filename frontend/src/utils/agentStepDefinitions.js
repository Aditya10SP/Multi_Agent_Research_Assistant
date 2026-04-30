// Comprehensive agent step definitions with educational content

export const getAgentSteps = (progressData) => {
  const currentNode = progressData?.current_node || '';
  const status = progressData?.status || '';
  
  const stepOrder = ['planner', 'web_search', 'paper_search', 'document_reader', 'critic', 'synthesizer'];
  const currentIndex = stepOrder.indexOf(currentNode);

  const getStepStatus = (stepId) => {
    const stepIndex = stepOrder.indexOf(stepId);
    if (status === 'complete' || status === 'failed') {
      return stepIndex <= stepOrder.length - 1 ? 'complete' : 'pending';
    }
    if (currentNode === stepId) return 'in-progress';
    if (stepIndex < currentIndex) return 'complete';
    return 'pending';
  };

  return [
    {
      id: 'planner',
      name: 'Research Planner Agent',
      status: getStepStatus('planner'),
      description: 'Decomposes the research question into focused sub-questions and creates a search strategy',
      quickSummary: progressData?.plan ? 
        `Generated ${progressData.plan.sub_questions?.length || 0} sub-questions` : 
        'Planning research approach...',
      
      purpose: `The Planner Agent is the first step in the research pipeline. Its primary role is to break down complex, broad research questions into smaller, focused sub-questions that can be effectively answered through web search and academic paper analysis. This decomposition is crucial because it allows the system to gather comprehensive information from multiple angles rather than attempting to answer everything at once.`,
      
      howItWorks: [
        'Receives the user\'s research question and depth preference (quick=3 questions, deep=5 questions)',
        'Uses Groq\'s llama-3.3-70b-versatile LLM with temperature=0.3 for balanced creativity and consistency',
        'Loads the planner_prompt.txt template which instructs the LLM on how to decompose questions',
        'Sends the formatted prompt to the LLM and receives a JSON response',
        'Parses the JSON to extract sub-questions, strategy, estimated time, and search keywords',
        'Stores the plan in the shared state for downstream agents to use'
      ],
      
      execution: progressData?.plan ? [
        { label: 'Sub-questions Generated', value: progressData.plan.sub_questions?.length || 0 },
        { label: 'Strategy', value: progressData.plan.strategy || 'N/A' },
        { label: 'Search Keywords', value: progressData.plan.search_keywords?.join(', ') || 'N/A' },
        { label: 'Estimated Time', value: `${progressData.plan.estimated_time || 60} seconds` }
      ] : [],
      
      // NEW: Detailed Input/Output Tracking
      inputOutput: {
        input: {
          title: 'Input Received',
          data: [
            { label: 'Original Question', value: progressData?.question || 'N/A', type: 'text' },
            { label: 'Research Depth', value: progressData?.depth || 'N/A', type: 'badge' },
            { label: 'Number of Sub-questions to Generate', value: progressData?.depth === 'deep' ? '5' : '3', type: 'number' }
          ]
        },
        processing: {
          title: 'Processing Steps',
          steps: [
            'Load planner_prompt.txt template',
            'Format prompt with question, depth, and num_questions',
            'Send to Groq API (llama-3.3-70b-versatile, temp=0.3)',
            'Receive LLM response',
            'Parse JSON from response (handle markdown code blocks)',
            'Extract sub_questions, strategy, estimated_time, search_keywords',
            'Store in state.plan'
          ]
        },
        output: {
          title: 'Output Generated',
          data: progressData?.plan ? [
            { 
              label: 'Sub-questions', 
              value: progressData.plan.sub_questions, 
              type: 'list',
              explanation: 'These focused questions will be used by Web Search and Paper Search agents'
            },
            { 
              label: 'Strategy', 
              value: progressData.plan.strategy, 
              type: 'text',
              explanation: 'The research approach (quick or deep)'
            },
            { 
              label: 'Search Keywords', 
              value: progressData.plan.search_keywords, 
              type: 'list',
              explanation: 'Keywords extracted for search optimization'
            },
            { 
              label: 'Estimated Time', 
              value: `${progressData.plan.estimated_time} seconds`, 
              type: 'text',
              explanation: 'Predicted time to complete research'
            }
          ] : []
        },
        transformation: {
          title: 'How Input Became Output',
          explanation: `The Planner Agent took your question "${progressData?.question}" and used the llama-3.3-70b-versatile LLM to intelligently break it down. The LLM analyzed the question's complexity, identified key aspects that need research, and generated ${progressData?.plan?.sub_questions?.length || 0} focused sub-questions. Each sub-question targets a specific angle of your original question, ensuring comprehensive coverage.`
        }
      },
      
      whyThisApproach: [
        'Breaking down complex questions improves search relevance - specific queries return better results than broad ones',
        'Multiple sub-questions ensure comprehensive coverage of the topic from different angles',
        'Using a heavy LLM (70B parameters) ensures high-quality question decomposition with proper reasoning',
        'JSON output format ensures structured, parseable results that downstream agents can reliably use',
        'External prompt templates allow easy customization without code changes'
      ],
      
      alternatives: [
        {
          name: 'Single Direct Search',
          description: 'Search for the original question without decomposition',
          whyNot: 'Broad questions return generic results; decomposition provides focused, relevant information'
        },
        {
          name: 'Rule-Based Decomposition',
          description: 'Use predefined rules or templates to break down questions',
          whyNot: 'Cannot handle the variety and complexity of user questions; LLM provides flexible, context-aware decomposition'
        },
        {
          name: 'User-Provided Sub-questions',
          description: 'Ask the user to provide their own sub-questions',
          whyNot: 'Adds friction to user experience; users want automated research, not manual planning'
        }
      ],
      
      technical: [
        { label: 'LLM Model', value: 'llama-3.3-70b-versatile' },
        { label: 'Temperature', value: '0.3' },
        { label: 'Provider', value: 'Groq API' },
        { label: 'Prompt File', value: 'planner_prompt.txt' },
        { label: 'Output Format', value: 'JSON' },
        { label: 'State Key', value: 'plan' }
      ],
      
      results: progressData?.plan?.sub_questions ? [
        {
          title: 'Sub-questions',
          count: progressData.plan.sub_questions.length,
          items: progressData.plan.sub_questions
        }
      ] : [],
      
      decisionLogic: [
        {
          condition: 'If depth = "quick"',
          action: 'Generate exactly 3 sub-questions for faster research'
        },
        {
          condition: 'If depth = "deep"',
          action: 'Generate exactly 5 sub-questions for comprehensive analysis'
        },
        {
          condition: 'If LLM returns invalid JSON',
          action: 'Attempt to extract JSON from markdown code blocks, then parse'
        }
      ]
    },
    
    {
      id: 'web_search',
      name: 'Web Search Agent',
      status: getStepStatus('web_search'),
      description: 'Searches the web using DuckDuckGo for recent articles and information',
      quickSummary: progressData?.web_results ? 
        `Found ${progressData.web_results.length} web results` : 
        'Searching the web...',
      
      purpose: `The Web Search Agent gathers current, real-world information from the internet. It searches for each sub-question generated by the Planner to find recent articles, blog posts, news, and other web content. This provides up-to-date information that may not be available in academic papers, especially for rapidly evolving topics.`,
      
      howItWorks: [
        'Receives the list of sub-questions from the Planner\'s output',
        'For each sub-question, performs a DuckDuckGo search using the duckduckgo-search library',
        'Configures search with max_results=5 per query to get top relevant results',
        'Extracts title, URL, snippet, and source domain from each result',
        'Handles rate limiting gracefully (DuckDuckGo may return 202 Ratelimit)',
        'Aggregates all results into a list and stores in shared state'
      ],
      
      execution: progressData?.web_results ? [
        { label: 'Web Results Found', value: progressData.web_results.length },
        { label: 'Queries Executed', value: progressData?.plan?.sub_questions?.length || 0 },
        { label: 'Search Engine', value: 'DuckDuckGo' },
        { label: 'Rate Limited', value: progressData.web_results.length === 0 ? 'Yes (continuing with papers)' : 'No' }
      ] : [],
      
      // NEW: Detailed Input/Output Tracking
      inputOutput: {
        input: {
          title: 'Input Received from Planner',
          data: [
            { label: 'Sub-questions to Search', value: progressData?.plan?.sub_questions?.length || 0, type: 'number' },
            { label: 'Sub-questions List', value: progressData?.plan?.sub_questions || [], type: 'list' },
            { label: 'Max Results per Query', value: progressData?.depth === 'deep' ? '5' : '3', type: 'number' }
          ]
        },
        processing: {
          title: 'Processing Steps (for each sub-question)',
          steps: [
            'Take one sub-question from the plan',
            'Initialize DuckDuckGo search with 20s timeout',
            'Add 2-second delay between queries (rate limit prevention)',
            'Execute search query via DDGS API',
            'Receive search results (title, URL, snippet)',
            'Extract domain name as source',
            'Filter out duplicate URLs',
            'Store result with query reference',
            'Repeat for next sub-question',
            'Aggregate all results into web_results array'
          ]
        },
        output: {
          title: 'Output Generated',
          data: progressData?.web_results ? [
            { 
              label: 'Total Web Results', 
              value: progressData.web_results.length, 
              type: 'number',
              explanation: 'Unique web pages found across all sub-questions'
            },
            { 
              label: 'Results by Query', 
              value: progressData.web_results.map(r => `${r.title} (from: "${r.query}")`), 
              type: 'list',
              explanation: 'Each result is linked to the sub-question that found it'
            },
            { 
              label: 'Sources', 
              value: [...new Set(progressData.web_results.map(r => r.source))], 
              type: 'list',
              explanation: 'Unique domains found'
            }
          ] : [
            { 
              label: 'Status', 
              value: 'No results (likely rate limited)', 
              type: 'text',
              explanation: 'DuckDuckGo may have rate limited the requests. The system will continue with academic papers.'
            }
          ]
        },
        transformation: {
          title: 'How Input Became Output',
          explanation: progressData?.web_results?.length > 0 
            ? `The Web Search Agent took the ${progressData.plan?.sub_questions?.length || 0} sub-questions from the Planner and searched DuckDuckGo for each one. It found ${progressData.web_results.length} unique web pages. Each result includes the page title, URL, snippet, and which sub-question led to finding it. These results will be passed to the Document Reader for summarization.`
            : `The Web Search Agent attempted to search DuckDuckGo for the ${progressData?.plan?.sub_questions?.length || 0} sub-questions but was rate limited (DuckDuckGo's anti-bot protection). The system will continue with academic papers from arXiv, which don't have rate limits.`
        }
      },
      
      whyThisApproach: [
        'DuckDuckGo requires no API key, making the system accessible without additional setup',
        'Web search provides current information that academic papers may not cover',
        'Searching each sub-question separately ensures focused, relevant results',
        'Limiting to 5 results per query balances comprehensiveness with processing time',
        'Graceful rate limit handling ensures the pipeline continues even if web search fails'
      ],
      
      alternatives: [
        {
          name: 'Google Search API',
          description: 'Use Google Custom Search API for web results',
          whyNot: 'Requires API key and has usage limits; DuckDuckGo is free and sufficient for most queries'
        },
        {
          name: 'Bing Search API',
          description: 'Use Microsoft Bing Search API',
          whyNot: 'Requires API key and Azure subscription; adds complexity and cost'
        },
        {
          name: 'Web Scraping',
          description: 'Directly scrape websites without a search API',
          whyNot: 'Violates terms of service, unreliable, and difficult to maintain; search APIs provide structured data'
        },
        {
          name: 'Single Combined Query',
          description: 'Search once with all sub-questions combined',
          whyNot: 'Dilutes search relevance; separate queries for each sub-question yield better targeted results'
        }
      ],
      
      technical: [
        { label: 'Library', value: 'duckduckgo-search' },
        { label: 'Max Results/Query', value: '5' },
        { label: 'Timeout', value: '10 seconds' },
        { label: 'Rate Limit Handling', value: 'Graceful degradation' },
        { label: 'State Key', value: 'web_results' },
        { label: 'Execution', value: 'Sequential (after Planner)' }
      ],
      
      results: progressData?.web_results ? [
        {
          title: 'Web Sources',
          count: progressData.web_results.length,
          items: progressData.web_results.map(r => `${r.title} (${r.source})`)
        }
      ] : [],
      
      decisionLogic: [
        {
          condition: 'If DuckDuckGo returns 202 Ratelimit',
          action: 'Log error, continue with empty web results, rely on academic papers'
        },
        {
          condition: 'If search returns 0 results',
          action: 'Continue pipeline - paper search may still provide valuable information'
        },
        {
          condition: 'For each sub-question',
          action: 'Execute separate search to maintain query focus and relevance'
        }
      ]
    },
    
    {
      id: 'paper_search',
      name: 'Academic Paper Search Agent',
      status: getStepStatus('paper_search'),
      description: 'Searches arXiv for relevant academic papers and research',
      quickSummary: progressData?.paper_results ? 
        `Found ${progressData.paper_results.length} academic papers` : 
        'Searching academic databases...',
      
      purpose: `The Paper Search Agent finds peer-reviewed academic research from arXiv, one of the largest open-access repositories of scientific papers. Academic papers provide authoritative, in-depth analysis and are especially valuable for technical, scientific, and research-oriented questions. This agent ensures the research is grounded in scholarly work.`,
      
      howItWorks: [
        'Receives sub-questions from the Planner\'s output',
        'For each sub-question, queries the arXiv API using the arxiv Python library',
        'Configures search with max_results=100 per query, sorted by relevance',
        'Filters results to keep only the top 2-3 most relevant papers per sub-question',
        'Extracts title, authors, abstract, arXiv ID, and PDF URL from each paper',
        'Aggregates papers across all sub-questions and removes duplicates',
        'Stores final list in shared state for Document Reader to process'
      ],
      
      execution: progressData?.paper_results ? [
        { label: 'Papers Found', value: progressData.paper_results.length },
        { label: 'Queries Executed', value: progressData?.plan?.sub_questions?.length || 0 },
        { label: 'Database', value: 'arXiv' },
        { label: 'Total Available', value: 'Millions of papers searched' }
      ] : [],
      
      whyThisApproach: [
        'arXiv is free, open-access, and contains millions of papers across science, math, CS, and more',
        'Academic papers provide authoritative, peer-reviewed information with high credibility',
        'Searching each sub-question separately ensures papers are relevant to specific aspects',
        'Limiting to top 2-3 papers per query balances depth with processing time',
        'Using abstracts (not full PDFs) allows fast processing while capturing key information'
      ],
      
      alternatives: [
        {
          name: 'Google Scholar',
          description: 'Search Google Scholar for academic papers',
          whyNot: 'No official API; scraping violates terms of service and is unreliable'
        },
        {
          name: 'PubMed',
          description: 'Search PubMed for biomedical literature',
          whyNot: 'Limited to medical/biological topics; arXiv covers broader scientific domains'
        },
        {
          name: 'Semantic Scholar API',
          description: 'Use Semantic Scholar\'s API for paper search',
          whyNot: 'Requires API key and has rate limits; arXiv is simpler and sufficient'
        },
        {
          name: 'Full PDF Download',
          description: 'Download and parse full PDF papers',
          whyNot: 'Extremely slow and resource-intensive; abstracts contain sufficient information for summaries'
        }
      ],
      
      technical: [
        { label: 'Library', value: 'arxiv' },
        { label: 'Max Results/Query', value: '100 (filtered to top 2-3)' },
        { label: 'Sort Order', value: 'Relevance' },
        { label: 'Content Used', value: 'Abstract only' },
        { label: 'State Key', value: 'paper_results' },
        { label: 'Execution', value: 'Sequential (after Web Search)' }
      ],
      
      results: progressData?.paper_results ? [
        {
          title: 'Academic Papers',
          count: progressData.paper_results.length,
          items: progressData.paper_results.map(p => `${p.title} by ${p.authors?.slice(0, 2).join(', ')}${p.authors?.length > 2 ? ' et al.' : ''}`)
        }
      ] : [],
      
      decisionLogic: [
        {
          condition: 'For each sub-question',
          action: 'Search arXiv and keep top 2-3 most relevant papers'
        },
        {
          condition: 'If duplicate papers found across queries',
          action: 'Remove duplicates to avoid redundant processing'
        },
        {
          condition: 'If no papers found',
          action: 'Continue with web results only - not all topics have academic papers'
        }
      ]
    },
  
    // Continue with remaining agents
    {
      id: 'document_reader',
      name: 'Document Reader Agent',
      status: getStepStatus('document_reader'),
      description: 'Reads and summarizes each source document using LLM',
      quickSummary: progressData?.document_summaries ? 
        `Processed ${progressData.document_summaries.length} documents` : 
        'Reading and summarizing documents...',
      
      purpose: `The Document Reader Agent processes each source (web page or paper abstract) and extracts the most important information. It uses an LLM to read, understand, and summarize content, identifying key points that are relevant to the research question. This transforms raw text into structured, digestible summaries.`,
      
      howItWorks: [
        'Receives all web results and paper results from previous agents',
        'For each source, creates a prompt asking the LLM to summarize the content',
        'Uses Groq\'s llama-3.1-8b-instant (fast model) with temperature=0.1 for consistent extraction',
        'Extracts: source URL/ID, source type (web/paper), summary (2-3 sentences), and key points (3-5 bullets)',
        'Processes all sources and stores summaries in shared state',
        'These summaries become the foundation for the final report'
      ],
      
      execution: progressData?.document_summaries ? [
        { label: 'Documents Processed', value: progressData.document_summaries.length },
        { label: 'Web Sources', value: progressData.document_summaries.filter(s => s.source_type === 'web').length },
        { label: 'Paper Sources', value: progressData.document_summaries.filter(s => s.source_type === 'paper').length },
        { label: 'LLM Model', value: 'llama-3.1-8b-instant' }
      ] : [],
      
      whyThisApproach: [
        'LLM-based summarization captures semantic meaning better than keyword extraction',
        'Fast 8B model is sufficient for summarization tasks, reducing latency and cost',
        'Low temperature (0.1) ensures consistent, factual summaries without hallucination',
        'Structured output (summary + key points) makes information easy to synthesize later',
        'Processing all sources ensures comprehensive coverage of available information'
      ],
      
      alternatives: [
        {
          name: 'Keyword Extraction',
          description: 'Use TF-IDF or similar algorithms to extract keywords',
          whyNot: 'Misses semantic meaning and context; LLM understands content deeply'
        },
        {
          name: 'First N Sentences',
          description: 'Simply take the first few sentences as summary',
          whyNot: 'Introductions often lack key information; LLM identifies most important content'
        },
        {
          name: 'No Summarization',
          description: 'Pass full text to synthesis agent',
          whyNot: 'Would exceed LLM context limits and slow down synthesis; summaries are essential'
        },
        {
          name: 'Heavy Model for Summarization',
          description: 'Use llama-3.3-70b for all summaries',
          whyNot: 'Unnecessary for simple summarization; 8B model is fast and sufficient'
        }
      ],
      
      technical: [
        { label: 'LLM Model', value: 'llama-3.1-8b-instant' },
        { label: 'Temperature', value: '0.1' },
        { label: 'Provider', value: 'Groq API' },
        { label: 'Processing', value: 'Sequential per document' },
        { label: 'State Key', value: 'document_summaries' },
        { label: 'Output Structure', value: 'source, summary, key_points[]' }
      ],
      
      results: progressData?.document_summaries ? [
        {
          title: 'Document Summaries',
          count: progressData.document_summaries.length,
          items: progressData.document_summaries.map(s => 
            `[${s.source_type.toUpperCase()}] ${s.source}: ${s.summary.slice(0, 100)}...`
          )
        }
      ] : [],
      
      decisionLogic: [
        {
          condition: 'For each web result',
          action: 'Extract snippet/description and summarize using LLM'
        },
        {
          condition: 'For each paper result',
          action: 'Use abstract as input and extract key points using LLM'
        },
        {
          condition: 'If source has no content',
          action: 'Skip that source and continue with others'
        }
      ]
    },
    
    {
      id: 'critic',
      name: 'Quality Evaluation Agent (Critic)',
      status: getStepStatus('critic'),
      description: 'Evaluates research quality, identifies gaps, and decides if retry is needed',
      quickSummary: progressData?.critic_feedback ? 
        `Quality: ${(progressData.critic_feedback.quality_score * 100).toFixed(0)}%, Gaps: ${progressData.critic_feedback.gaps?.length || 0}` : 
        'Evaluating research quality...',
      
      purpose: `The Critic Agent acts as a quality control checkpoint. It analyzes all gathered information to assess whether the research adequately answers the original question. It identifies gaps, contradictions, and quality issues, then decides if the research should be retried with refined queries or if it's sufficient to proceed to synthesis.`,
      
      howItWorks: [
        'Receives all document summaries, web results, and paper results',
        'Uses Groq\'s llama-3.3-70b-versatile (heavy model) for sophisticated evaluation',
        'Loads critic_prompt.txt which instructs the LLM on evaluation criteria',
        'Analyzes: coverage (are all sub-questions answered?), contradictions, source quality',
        'Calculates quality scores: coverage score, source credibility, overall quality',
        'Determines if retry is needed: quality < 60% AND retry_count < 1 AND gaps exist',
        'Stores feedback in shared state for decision routing and final report metadata'
      ],
      
      execution: progressData?.critic_feedback ? [
        { label: 'Quality Score', value: `${(progressData.critic_feedback.quality_score * 100).toFixed(0)}%` },
        { label: 'Source Credibility', value: `${(progressData.critic_feedback.source_credibility * 100).toFixed(0)}%` },
        { label: 'Gaps Identified', value: progressData.critic_feedback.gaps?.length || 0 },
        { label: 'Retry Needed', value: progressData.critic_feedback.retry_needed ? 'Yes' : 'No' },
        { label: 'Retry Count', value: progressData.retry_count || 0 }
      ] : [],
      
      // NEW: Detailed Input/Output Tracking with Quality Score Calculation
      inputOutput: {
        input: {
          title: 'Input Received from Document Reader',
          data: [
            { label: 'Document Summaries', value: progressData?.document_summaries?.length || 0, type: 'number' },
            { label: 'Web Results', value: progressData?.web_results?.length || 0, type: 'number' },
            { label: 'Paper Results', value: progressData?.paper_results?.length || 0, type: 'number' },
            { label: 'Sub-questions to Cover', value: progressData?.plan?.sub_questions?.length || 0, type: 'number' },
            { label: 'Original Question', value: progressData?.question || 'N/A', type: 'text' }
          ]
        },
        processing: {
          title: 'Quality Score Calculation Steps',
          steps: [
            '1. Calculate Coverage Score:',
            '   → Formula: min(summaries / sub_questions, 1.0)',
            `   → Calculation: min(${progressData?.document_summaries?.length || 0} / ${progressData?.plan?.sub_questions?.length || 0}, 1.0)`,
            `   → Result: ${progressData?.critic_feedback ? ((Math.min((progressData.document_summaries?.length || 0) / (progressData.plan?.sub_questions?.length || 1), 1.0) * 100).toFixed(0)) : 0}%`,
            '',
            '2. Calculate Source Credibility Score:',
            '   → Papers: 0.9 points each (90% credibility)',
            '   → .edu/.gov/wikipedia: 0.9 points each (90% credibility)',
            '   → Other web: 0.6 points each (60% credibility)',
            `   → Papers: ${progressData?.paper_results?.length || 0} × 0.9 = ${((progressData?.paper_results?.length || 0) * 0.9).toFixed(2)}`,
            `   → Web: ${progressData?.web_results?.length || 0} sources (mixed credibility)`,
            `   → Average: ${progressData?.critic_feedback ? (progressData.critic_feedback.source_credibility * 100).toFixed(0) : 0}%`,
            '',
            '3. Calculate Overall Quality:',
            '   → Formula: (Coverage + Credibility) / 2',
            `   → Result: ${progressData?.critic_feedback ? (progressData.critic_feedback.quality_score * 100).toFixed(0) : 0}%`,
            '',
            '4. Send summaries to LLM for gap analysis',
            '5. LLM identifies gaps and contradictions',
            '6. Determine retry decision:',
            `   → Quality < 60%? ${progressData?.critic_feedback ? (progressData.critic_feedback.quality_score < 0.6 ? 'Yes' : 'No') : 'N/A'}`,
            `   → Retry count < 1? ${(progressData?.retry_count || 0) < 1 ? 'Yes' : 'No'}`,
            `   → Gaps exist? ${progressData?.critic_feedback?.gaps?.length > 0 ? 'Yes' : 'No'}`,
            `   → Decision: ${progressData?.critic_feedback?.retry_needed ? 'RETRY' : 'PROCEED'}`
          ]
        },
        output: {
          title: 'Output Generated',
          data: progressData?.critic_feedback ? [
            { 
              label: 'Overall Quality Score', 
              value: `${(progressData.critic_feedback.quality_score * 100).toFixed(0)}%`, 
              type: 'text',
              explanation: 'Average of Coverage Score and Source Credibility Score'
            },
            { 
              label: 'Coverage Score', 
              value: `${((Math.min((progressData.document_summaries?.length || 0) / (progressData.plan?.sub_questions?.length || 1), 1.0) * 100).toFixed(0))}%`, 
              type: 'text',
              explanation: 'Ratio of summaries to sub-questions (capped at 100%)'
            },
            { 
              label: 'Source Credibility Score', 
              value: `${(progressData.critic_feedback.source_credibility * 100).toFixed(0)}%`, 
              type: 'text',
              explanation: 'Weighted average based on source types'
            },
            { 
              label: 'Gaps Identified', 
              value: progressData.critic_feedback.gaps || [], 
              type: 'list',
              explanation: 'Missing information or unanswered aspects'
            },
            { 
              label: 'Contradictions', 
              value: progressData.critic_feedback.contradictions || [], 
              type: 'list',
              explanation: 'Conflicting information between sources'
            },
            { 
              label: 'Retry Decision', 
              value: progressData.critic_feedback.retry_needed ? 'RETRY (quality too low)' : 'PROCEED (quality sufficient)', 
              type: 'text',
              explanation: 'Whether to retry search or proceed to synthesis'
            }
          ] : []
        },
        transformation: {
          title: 'How Quality Scores Are Calculated',
          explanation: progressData?.critic_feedback 
            ? `The Critic calculated quality scores using two metrics: (1) Coverage Score = ${((Math.min((progressData.document_summaries?.length || 0) / (progressData.plan?.sub_questions?.length || 1), 1.0) * 100).toFixed(0))}% (we have ${progressData.document_summaries?.length || 0} summaries for ${progressData.plan?.sub_questions?.length || 0} sub-questions), and (2) Source Credibility = ${(progressData.critic_feedback.source_credibility * 100).toFixed(0)}% (based on ${progressData.paper_results?.length || 0} papers at 90% credibility and ${progressData.web_results?.length || 0} web sources at 60-90% credibility). The Overall Quality Score of ${(progressData.critic_feedback.quality_score * 100).toFixed(0)}% is the average of these two scores. ${progressData.critic_feedback.quality_score < 0.6 ? 'Since this is below 60%, a retry would be triggered if we haven\'t already retried.' : 'This is above 60%, so we proceed to synthesis.'}`
            : 'Calculating quality scores...'
        }
      },
      
      whyThisApproach: [
        'Automated quality control ensures consistent research standards',
        'Heavy LLM model provides nuanced evaluation of complex research',
        'Retry mechanism allows the system to self-correct when initial results are insufficient',
        'Quality scores provide transparency and help users assess report reliability',
        'Gap identification guides potential retry queries for better coverage'
      ],
      
      alternatives: [
        {
          name: 'No Quality Check',
          description: 'Always proceed to synthesis without evaluation',
          whyNot: 'Would produce low-quality reports when sources are insufficient or irrelevant'
        },
        {
          name: 'Rule-Based Evaluation',
          description: 'Use simple rules like "need X sources" or "need Y words"',
          whyNot: 'Cannot assess semantic quality, relevance, or coverage; LLM understands content'
        },
        {
          name: 'User Evaluation',
          description: 'Ask user to review and approve before synthesis',
          whyNot: 'Adds friction and delays; users want automated research'
        },
        {
          name: 'Unlimited Retries',
          description: 'Keep retrying until quality is perfect',
          whyNot: 'Could loop indefinitely; 1 retry balances quality with reasonable execution time'
        }
      ],
      
      technical: [
        { label: 'LLM Model', value: 'llama-3.3-70b-versatile' },
        { label: 'Temperature', value: '0.3' },
        { label: 'Provider', value: 'Groq API' },
        { label: 'Prompt File', value: 'critic_prompt.txt' },
        { label: 'Max Retries', value: '1' },
        { label: 'State Key', value: 'critic_feedback' }
      ],
      
      results: progressData?.critic_feedback?.gaps ? [
        {
          title: 'Identified Gaps',
          count: progressData.critic_feedback.gaps.length,
          items: progressData.critic_feedback.gaps
        }
      ] : [],
      
      decisionLogic: [
        {
          condition: 'If quality_score >= 0.6',
          action: 'Proceed to Synthesizer - research is sufficient'
        },
        {
          condition: 'If quality_score < 0.6 AND retry_count < 1 AND gaps exist',
          action: 'Retry: route back to Web Search with refined queries'
        },
        {
          condition: 'If quality_score < 0.6 BUT retry_count >= 1',
          action: 'Proceed to Synthesizer anyway - avoid infinite loops'
        },
        {
          condition: 'Coverage calculation',
          action: 'Ratio of summaries to sub-questions (more summaries = better coverage)'
        },
        {
          condition: 'Source credibility calculation',
          action: 'Papers = 0.9, .edu/.gov domains = 0.9, other web = 0.6'
        }
      ]
    },
    
    {
      id: 'synthesizer',
      name: 'Report Synthesis Agent',
      status: getStepStatus('synthesizer'),
      description: 'Generates the final structured research report with citations',
      quickSummary: progressData?.final_report ? 
        `Report complete: ${progressData.final_report.key_findings?.length || 0} findings, ${progressData.final_report.references?.length || 0} references` : 
        'Synthesizing final report...',
      
      purpose: `The Synthesizer Agent is the final step that creates the comprehensive research report. It takes all document summaries, evaluates them in context of the original question, and produces a well-structured report with an executive summary, key findings with citations, limitations, and a complete reference list. This is what the user ultimately receives.`,
      
      howItWorks: [
        'Receives all document summaries, critic feedback, and original question',
        'Uses Groq\'s llama-3.3-70b-versatile (heavy model) for sophisticated synthesis',
        'Loads synthesis_prompt.txt which instructs the LLM on report structure',
        'Generates: executive summary (200-500 words), key findings (3-10 items with citations), limitations',
        'Formats references from web results and paper results with proper citations',
        'Compiles evidence linking findings to specific source excerpts',
        'Adds metadata: generation timestamp, source count, quality score',
        'Stores final report in shared state and marks job as complete'
      ],
      
      execution: progressData?.final_report ? [
        { label: 'Key Findings', value: progressData.final_report.key_findings?.length || 0 },
        { label: 'References', value: progressData.final_report.references?.length || 0 },
        { label: 'Summary Length', value: `${progressData.final_report.summary?.length || 0} characters` },
        { label: 'Quality Score', value: `${(progressData.final_report.metadata?.quality_score * 100).toFixed(0)}%` }
      ] : [],
      
      // NEW: Detailed Input/Output Tracking
      inputOutput: {
        input: {
          title: 'Input Received from Document Reader & Critic',
          data: [
            { label: 'Document Summaries', value: progressData?.document_summaries?.length || 0, type: 'number' },
            { label: 'Web Sources', value: progressData?.web_results?.length || 0, type: 'number' },
            { label: 'Paper Sources', value: progressData?.paper_results?.length || 0, type: 'number' },
            { label: 'Quality Score from Critic', value: progressData?.critic_feedback ? `${(progressData.critic_feedback.quality_score * 100).toFixed(0)}%` : 'N/A', type: 'text' },
            { label: 'Original Question', value: progressData?.question || 'N/A', type: 'text' }
          ]
        },
        processing: {
          title: 'Processing Steps',
          steps: [
            'Load synthesis_prompt.txt template',
            'Format all document summaries into readable text',
            'Include source counts (web, papers, summaries)',
            'Send to Groq API (llama-3.3-70b-versatile, temp=0.3)',
            'LLM analyzes all summaries in context of original question',
            'LLM generates executive summary (200-500 words)',
            'LLM identifies 3-10 key findings',
            'For each finding: LLM assigns confidence based on criteria',
            'LLM links findings to source citations',
            'LLM identifies limitations and gaps',
            'Parse JSON response',
            'Format references with proper citations',
            'Compile evidence excerpts',
            'Add metadata (timestamp, quality score, source count)',
            'Store final report in state'
          ]
        },
        output: {
          title: 'Output Generated',
          data: progressData?.final_report ? [
            { 
              label: 'Executive Summary', 
              value: progressData.final_report.summary?.slice(0, 200) + '...', 
              type: 'text',
              explanation: 'Comprehensive answer to the original question'
            },
            { 
              label: 'Key Findings', 
              value: progressData.final_report.key_findings?.map(f => 
                `${f.statement} [${f.confidence} confidence${f.confidence_reasoning ? ': ' + f.confidence_reasoning : ''}]`
              ) || [], 
              type: 'list',
              explanation: 'Main discoveries with confidence levels and reasoning'
            },
            { 
              label: 'Confidence Calculation', 
              value: 'HIGH: 3+ sources including papers, consistent info | MEDIUM: 2 sources OR web-only OR minor inconsistencies | LOW: 1 source OR major uncertainties', 
              type: 'text',
              explanation: 'How the LLM determines confidence for each finding'
            },
            { 
              label: 'Limitations', 
              value: progressData.final_report.limitations || [], 
              type: 'list',
              explanation: 'Acknowledged gaps and uncertainties in the research'
            },
            { 
              label: 'Total References', 
              value: progressData.final_report.references?.length || 0, 
              type: 'number',
              explanation: 'Complete citation list for all sources used'
            }
          ] : []
        },
        transformation: {
          title: 'How Input Became Output',
          explanation: progressData?.final_report 
            ? `The Synthesizer Agent received ${progressData.document_summaries?.length || 0} document summaries and used the llama-3.3-70b-versatile LLM to synthesize them into a coherent report. The LLM analyzed all summaries, identified ${progressData.final_report.key_findings?.length || 0} key findings, and assigned confidence levels based on: (1) number of supporting sources, (2) source types (papers vs web), and (3) consistency of information. Each finding includes the confidence level and reasoning, plus citations to verify claims. The quality score of ${(progressData.final_report.metadata?.quality_score * 100).toFixed(0)}% from the Critic is included in the metadata.`
            : 'Synthesizing report...'
        }
      },
      
      whyThisApproach: [
        'Heavy LLM model ensures high-quality, coherent synthesis of complex information',
        'Structured output (summary, findings, limitations) makes report easy to navigate',
        'Citations link findings to sources, providing transparency and credibility',
        'Limitations section acknowledges gaps, setting appropriate expectations',
        'Metadata provides context about research quality and scope'
      ],
      
      alternatives: [
        {
          name: 'Simple Concatenation',
          description: 'Just combine all summaries into one document',
          whyNot: 'Would be disorganized and hard to read; synthesis creates coherent narrative'
        },
        {
          name: 'Template-Based Report',
          description: 'Fill in predefined template with extracted facts',
          whyNot: 'Too rigid; LLM synthesis adapts to content and creates natural flow'
        },
        {
          name: 'No Citations',
          description: 'Generate report without linking to sources',
          whyNot: 'Users cannot verify claims or explore sources; citations are essential for credibility'
        },
        {
          name: 'Fast Model for Synthesis',
          description: 'Use llama-3.1-8b-instant instead of 70B model',
          whyNot: 'Synthesis requires sophisticated reasoning; heavy model produces better quality'
        }
      ],
      
      technical: [
        { label: 'LLM Model', value: 'llama-3.3-70b-versatile' },
        { label: 'Temperature', value: '0.3' },
        { label: 'Provider', value: 'Groq API' },
        { label: 'Prompt File', value: 'synthesis_prompt.txt' },
        { label: 'Output Format', value: 'JSON' },
        { label: 'State Key', value: 'final_report' }
      ],
      
      results: progressData?.final_report?.key_findings ? [
        {
          title: 'Key Findings',
          count: progressData.final_report.key_findings.length,
          items: progressData.final_report.key_findings.map(f => 
            `${f.statement} [Confidence: ${f.confidence}]`
          )
        }
      ] : [],
      
      decisionLogic: [
        {
          condition: 'Always executes after Critic',
          action: 'Final step in pipeline - no conditional routing'
        },
        {
          condition: 'If synthesis succeeds',
          action: 'Mark job status as "complete" and store final report'
        },
        {
          condition: 'If synthesis fails',
          action: 'Mark job status as "failed" and log error'
        },
        {
          condition: 'Reference formatting',
          action: 'Papers get full citation (title, authors, arXiv ID), web gets title and URL'
        }
      ]
    }
  ];
};
