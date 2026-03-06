/* eslint-disable react/prop-types */
import React, { useState, useEffect, useRef } from 'react';
import { X, Settings, ArrowLeft, Send, Plus, Trash2, Pencil } from 'lucide-react';
import {
  buildGraphContext,
  callLLM,
  loadConversations,
  saveConversations,
  loadApiConfig,
  saveApiConfig,
  DEFAULT_SYSTEM_PROMPT,
} from '../llm';

const LLMPanel = ({ isOpen, onClose, nodes, edges }) => {
  const [view, setView] = useState('home'); // 'home' | 'active' | 'config'
  const [prevView, setPrevView] = useState('home');
  const [conversations, setConversations] = useState(loadConversations);
  const [activeConvId, setActiveConvId] = useState(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [apiConfig, setApiConfig] = useState(loadApiConfig);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const activeConv = conversations.find(c => c.id === activeConvId) ?? null;

  useEffect(() => { saveConversations(conversations); }, [conversations]);
  useEffect(() => { saveApiConfig(apiConfig); }, [apiConfig]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (view === 'active') {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 30);
    }
  }, [activeConv?.messages?.length, view]);

  // Focus input when panel opens or view changes to home/active
  useEffect(() => {
    if (isOpen && view !== 'config') {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, view]);

  const goToConfig = () => { setPrevView(view); setView('config'); };
  const goBack = () => setView(prevView);
  const goHome = () => { setView('home'); setActiveConvId(null); };
  const openConversation = (id) => { setActiveConvId(id); setView('active'); };

  const deleteConversation = (id, e) => {
    e.stopPropagation();
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeConvId === id) goHome();
  };

  const startRename = (id, name, e) => {
    e.stopPropagation();
    setRenamingId(id);
    setRenameValue(name);
  };

  const commitRename = (id) => {
    if (renameValue.trim()) {
      setConversations(prev => prev.map(c => c.id === id ? { ...c, name: renameValue.trim() } : c));
    }
    setRenamingId(null);
  };

  const updateApiConfig = (field, value) => setApiConfig(prev => ({ ...prev, [field]: value }));

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');

    const graphContext = buildGraphContext(nodes, edges, {
      focusOnly: apiConfig.focusOnly || false,
      ratedOnly: apiConfig.ratedOnly || false,
    });
    const sysPrompt =
      `${apiConfig.systemPrompt !== undefined ? apiConfig.systemPrompt : DEFAULT_SYSTEM_PROMPT}\n\nCurrent task graph:\n${graphContext}`;
    const userMsg = { role: 'user', content: text };

    let convId = activeConvId;
    let priorMessages = [];

    if (view !== 'active' || !activeConvId) {
      convId = `conv-${Date.now()}`;
      setConversations(prev => [{
        id: convId,
        name: text.slice(0, 50) + (text.length > 50 ? '…' : ''),
        messages: [userMsg],
        createdAt: Date.now(),
      }, ...prev]);
      setActiveConvId(convId);
      setView('active');
    } else {
      priorMessages = activeConv?.messages ?? [];
      setConversations(prev => prev.map(c =>
        c.id === convId ? { ...c, messages: [...c.messages, userMsg] } : c
      ));
    }

    setIsLoading(true);
    try {
      if (!apiConfig.apiKey) throw new Error('API key not set. Click the ⚙ settings icon to add your OpenAI API key.');
      const reply = await callLLM({
        apiKey: apiConfig.apiKey,
        model: apiConfig.model || 'gpt-4o-mini',
        baseUrl: apiConfig.baseUrl,
        systemPrompt: sysPrompt,
        messages: [...priorMessages, userMsg],
      });
      setConversations(prev => prev.map(c =>
        c.id === convId ? { ...c, messages: [...c.messages, { role: 'assistant', content: reply }] } : c
      ));
    } catch (err) {
      setConversations(prev => prev.map(c =>
        c.id === convId
          ? { ...c, messages: [...c.messages, { role: 'assistant', content: `⚠ ${err.message}` }] }
          : c
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Shared input bar ─────────────────────────────────────────
  const inputBar = (
    <div className="border-t-2 border-black px-6 py-4 flex flex-col gap-2 bg-gray-50 flex-shrink-0">
      {view === 'active' && (
        <button
          className="self-start text-xs font-bold uppercase tracking-wider flex items-center gap-1 hover:bg-gray-200 px-2 py-1 rounded-sm"
          onClick={goHome}
        >
          <Plus size={12} /> New Chat
        </button>
      )}
      <div className="flex gap-2 items-end">
        <textarea
          ref={inputRef}
          className="flex-1 border-2 border-black rounded-sm px-3 py-2 text-sm font-mono resize-none outline-none bg-white focus:bg-white"
          rows={3}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder={view === 'active' ? 'Reply… (Ctrl+Enter)' : 'Ask about your tasks… (Ctrl+Enter)'}
          disabled={isLoading}
        />
        <button
          className={`border-2 rounded-sm p-2 self-end transition-colors flex-shrink-0 ${
            isLoading || !input.trim()
              ? 'border-gray-300 text-gray-300 cursor-not-allowed bg-white'
              : 'border-black bg-black text-white hover:bg-gray-800'
          }`}
          onClick={sendMessage}
          disabled={isLoading || !input.trim()}
          title="Send (Ctrl+Enter)"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );

  // ── Header ───────────────────────────────────────────────────
  const header = (
    <div className="px-6 py-4 border-b-2 border-black flex items-center gap-2 bg-gray-50 flex-shrink-0">
      {view === 'config' ? (
        <>
          <button onClick={goBack} className="hover:bg-gray-200 p-1 rounded" title="Back">
            <ArrowLeft size={18} />
          </button>
          <h2 className="font-bold text-lg uppercase flex-1">Settings</h2>
        </>
      ) : view === 'active' ? (
        <>
          <button onClick={goHome} className="hover:bg-gray-200 p-1 rounded" title="All chats">
            <ArrowLeft size={18} />
          </button>
          <span className="flex-1 font-bold text-sm truncate">{activeConv?.name || 'Chat'}</span>
          <button onClick={goToConfig} className="hover:bg-gray-200 p-1 rounded" title="Settings">
            <Settings size={18} />
          </button>
        </>
      ) : (
        <>
          <h2 className="font-bold text-lg uppercase flex-1">Chat</h2>
          <button onClick={goToConfig} className="hover:bg-gray-200 p-1 rounded" title="Settings">
            <Settings size={18} />
          </button>
        </>
      )}
      <button onClick={onClose} className="hover:bg-gray-200 p-1 rounded">
        <X size={20} />
      </button>
    </div>
  );

  return (
    <>
      <style>{`.llm-scroll::-webkit-scrollbar { display: none; }`}</style>
      <div
        className="fixed right-0 top-0 bottom-0 bg-white border-l-2 border-black shadow-2xl z-50 flex flex-col font-mono"
        style={{
          width: '400px',
          minWidth: '400px',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.15s ease-out',
        }}
      >
        {header}

        {/* ── Config view ─────────────────────────────────────── */}
        {view === 'config' && (
          <div
            className="llm-scroll flex-1 px-6 py-5 overflow-y-scroll flex flex-col gap-5"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold uppercase tracking-wider">API Key</label>
              <input
                type="password"
                className="border-2 border-black rounded-sm px-3 py-2 text-sm font-mono outline-none focus:bg-gray-50"
                value={apiConfig.apiKey || ''}
                onChange={e => updateApiConfig('apiKey', e.target.value)}
                placeholder="sk-..."
                autoComplete="off"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold uppercase tracking-wider">Base URL</label>
              <input
                type="text"
                className="border-2 border-black rounded-sm px-3 py-2 text-sm font-mono outline-none focus:bg-gray-50"
                value={apiConfig.baseUrl || ''}
                onChange={e => updateApiConfig('baseUrl', e.target.value)}
                placeholder="https://api.openai.com/v1"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold uppercase tracking-wider">Model</label>
              <input
                type="text"
                className="border-2 border-black rounded-sm px-3 py-2 text-sm font-mono outline-none focus:bg-gray-50"
                value={apiConfig.model || ''}
                onChange={e => updateApiConfig('model', e.target.value)}
                placeholder="gpt-4o-mini"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-wider">Context Filters</label>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4 cursor-pointer accent-black flex-shrink-0"
                  checked={apiConfig.focusOnly || false}
                  onChange={e => updateApiConfig('focusOnly', e.target.checked)}
                />
                <span className="text-sm">Active goals only</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4 cursor-pointer accent-black flex-shrink-0"
                  checked={apiConfig.ratedOnly || false}
                  onChange={e => updateApiConfig('ratedOnly', e.target.checked)}
                />
                <span className="text-sm">Rated tasks only</span>
              </label>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider">System Prompt</label>
                <button
                  className="text-xs underline hover:no-underline"
                  onClick={() => updateApiConfig('systemPrompt', DEFAULT_SYSTEM_PROMPT)}
                >
                  Reset
                </button>
              </div>
              <textarea
                className="border-2 border-black rounded-sm px-3 py-2 text-sm font-mono outline-none focus:bg-gray-50 resize-none"
                rows={12}
                value={apiConfig.systemPrompt !== undefined ? apiConfig.systemPrompt : DEFAULT_SYSTEM_PROMPT}
                onChange={e => updateApiConfig('systemPrompt', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* ── Home view — conversation list ────────────────────── */}
        {view === 'home' && (
          <>
            <div
              className="llm-scroll flex-1 overflow-y-scroll"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {conversations.length === 0 ? (
                <div className="px-6 py-12 text-center text-sm text-gray-400">
                  No conversations yet.<br />Type a message below to start.
                </div>
              ) : (
                <ul>
                  {conversations.map(conv => (
                    <li
                      key={conv.id}
                      className="flex items-center gap-2 px-6 py-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer group/conv"
                      onClick={() => openConversation(conv.id)}
                    >
                      {renamingId === conv.id ? (
                        <input
                          autoFocus
                          className="flex-1 text-sm border-b-2 border-black outline-none bg-transparent"
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          onBlur={() => commitRename(conv.id)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') commitRename(conv.id);
                            if (e.key === 'Escape') setRenamingId(null);
                            e.stopPropagation();
                          }}
                          onClick={e => e.stopPropagation()}
                        />
                      ) : (
                        <span className="flex-1 text-sm truncate">{conv.name}</span>
                      )}
                      <button
                        className="p-1 hover:bg-gray-200 rounded opacity-0 group-hover/conv:opacity-100 transition-opacity flex-shrink-0"
                        onClick={e => startRename(conv.id, conv.name, e)}
                        title="Rename"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        className="p-1 hover:bg-gray-200 rounded opacity-0 group-hover/conv:opacity-100 transition-opacity flex-shrink-0"
                        onClick={e => deleteConversation(conv.id, e)}
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {inputBar}
          </>
        )}

        {/* ── Active chat view ─────────────────────────────────── */}
        {view === 'active' && (
          <>
            <div
              className="llm-scroll flex-1 overflow-y-scroll px-6 py-4 flex flex-col gap-3"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {(activeConv?.messages ?? []).map((msg, i) => (
                <div key={i} className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <span className="text-xs text-gray-400 uppercase tracking-wider px-1">
                    {msg.role === 'user' ? 'You' : 'Assistant'}
                  </span>
                  <div
                    className={`text-sm px-3 py-2 rounded-sm border-2 max-w-[85%] whitespace-pre-wrap break-words ${
                      msg.role === 'user'
                        ? 'border-black bg-black text-white'
                        : 'border-black bg-white text-black'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex flex-col gap-1 items-start">
                  <span className="text-xs text-gray-400 uppercase tracking-wider px-1">Assistant</span>
                  <div className="text-sm px-3 py-2 border-2 border-black rounded-sm text-gray-400 animate-pulse">
                    · · ·
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            {inputBar}
          </>
        )}
      </div>
    </>
  );
};

export default LLMPanel;
