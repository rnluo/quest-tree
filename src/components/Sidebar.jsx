import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, GripVertical, ChevronDown, ChevronUp, ChevronsDown, ChevronsUp, CheckSquare, Square } from 'lucide-react';
import { Reorder } from 'framer-motion';

const getMaskedValue = (val) => val.replace(/[^ ]/g, '*');

const MaskedInput = ({ value, onChange, className, type = "text", placeholder, wrapperClassName = "w-full", isPrivacyMode, ...props }) => {
  if (!isPrivacyMode) {
    return (
      <input
        type={type}
        value={value}
        onChange={onChange}
        className={`${className} ${wrapperClassName === 'flex-1' ? 'flex-1' : ''}`}
        placeholder={placeholder}
        {...props}
      />
    );
  }

  const maskedValue = getMaskedValue(value);

  return (
    <div className={`relative ${wrapperClassName}`}>
      <input
        type="text"
        value={maskedValue}
        readOnly
        className={`${className} absolute inset-0 z-0 text-black bg-white select-none pointer-events-none`}
        style={{ borderColor: 'transparent' }}
        tabIndex={-1}
      />
      <input
        type={type}
        value={value}
        onChange={onChange}
        className={`${className} relative z-10 bg-transparent focus:bg-transparent`}
        style={{ color: 'transparent', caretColor: 'black', backgroundColor: 'transparent' }}
        placeholder={placeholder}
        {...props}
      />
    </div>
  );
};

const MaskedTextarea = ({ value, onChange, className, placeholder, isPrivacyMode, wrapperClassName = 'relative w-full h-24', autoResize = false, style, ...props }) => {
  const interactiveRef = useRef(null);
  const underlayRef = useRef(null);

  useEffect(() => {
    if (autoResize && interactiveRef.current) {
      interactiveRef.current.style.height = 'auto';
      const h = interactiveRef.current.scrollHeight + 'px';
      interactiveRef.current.style.height = h;
      if (underlayRef.current) underlayRef.current.style.height = h;
    }
  }, [value, autoResize]);

  if (!isPrivacyMode) {
    return (
      <textarea
        ref={autoResize ? interactiveRef : undefined}
        value={value}
        onChange={onChange}
        className={className}
        placeholder={placeholder}
        style={{ ...(autoResize ? { overflow: 'hidden' } : {}), ...style }}
        {...props}
      />
    );
  }

  const maskedValue = getMaskedValue(value);

  return (
    <div className={wrapperClassName}>
      <textarea
        ref={underlayRef}
        value={maskedValue}
        readOnly
        className={`${className} absolute inset-0 z-0 text-black bg-white select-none pointer-events-none`}
        style={{ borderColor: 'transparent' }}
        tabIndex={-1}
      />
      <textarea
        ref={interactiveRef}
        value={value}
        onChange={onChange}
        className={`${className} relative z-10 bg-transparent focus:bg-transparent`}
        style={{ color: 'transparent', caretColor: 'black', backgroundColor: 'transparent', ...(autoResize ? { overflow: 'hidden' } : {}), ...style }}
        placeholder={placeholder}
        {...props}
      />
    </div>
  );
};

const Sidebar = ({ isOpen, onClose, selectedNode, onUpdateNode, onDeleteNode, isPrivacyMode }) => {
  const [localTitle, setLocalTitle] = useState('');
  const [localDescription, setLocalDescription] = useState('');
  const [localQuests, setLocalQuests] = useState([]);
  const [expandedQuests, setExpandedQuests] = useState(new Set());

  // Sync local state when selectedNode changes
  useEffect(() => {
    if (selectedNode) {
      setLocalTitle((prev) => (prev === selectedNode.data.title ? prev : (selectedNode.data.title || '')));
      setLocalDescription((prev) => (prev === selectedNode.data.description ? prev : (selectedNode.data.description || '')));
      setLocalQuests((prev) => {
        const isSame = JSON.stringify(prev) === JSON.stringify(selectedNode.data.quests);
        return isSame ? prev : (selectedNode.data.quests || []);
      });
    }
  }, [selectedNode?.id]); // Only trigger on node change, not data change

  const handleSave = () => {
    if (selectedNode) {
      onUpdateNode(selectedNode.id, {
        title: localTitle,
        description: localDescription,
        quests: localQuests
      });
    }
  };

  const addQuest = () => {
    const newQuest = {
      id: Date.now().toString(),
      text: 'New Task',
      completed: false
    };
    setLocalQuests([...localQuests, newQuest]);
  };

  const updateQuestText = (questId, text) => {
    setLocalQuests(localQuests.map(q => 
      q.id === questId ? { ...q, text } : q
    ));
  };

  const removeQuest = (questId) => {
    setLocalQuests(localQuests.filter(q => q.id !== questId));
    setExpandedQuests(prev => { const next = new Set(prev); next.delete(questId); return next; });
  };

  const toggleExpanded = (questId) => {
    setExpandedQuests(prev => {
      const next = new Set(prev);
      if (next.has(questId)) {
        next.delete(questId);
      } else {
        next.add(questId);
        // Default year to current year when first expanding
        setLocalQuests(lq => lq.map(q =>
          q.id === questId && !q.deadline?.year
            ? { ...q, deadline: { ...q.deadline, year: String(new Date().getFullYear()) } }
            : q
        ));
      }
      return next;
    });
  };

  const updateQuestDeadline = (questId, field, value) => {
    setLocalQuests(localQuests.map(q =>
      q.id === questId ? { ...q, deadline: { ...q.deadline, [field]: value } } : q
    ));
  };

  const updateQuestTaskDesc = (questId, value) => {
    setLocalQuests(localQuests.map(q =>
      q.id === questId ? { ...q, taskDescription: value } : q
    ));
  };

  const isDateValid = (deadline) => {
    if (!deadline?.year) return true;
    if (!deadline.month) return true;
    const m = parseInt(deadline.month);
    if (isNaN(m) || m < 1 || m > 12) return false;
    if (!deadline.day) return true;
    const d = parseInt(deadline.day);
    if (isNaN(d) || d < 1) return false;
    const date = new Date(parseInt(deadline.year), m - 1, d);
    return date.getMonth() === m - 1 && date.getDate() === d;
  };

  const padDeadlineField = (questId, field, value) => {
    if (!value) return;
    const num = parseInt(value);
    if (isNaN(num)) { updateQuestDeadline(questId, field, ''); return; }
    if (field === 'month' && (num < 1 || num > 12)) { updateQuestDeadline(questId, field, ''); return; }
    if (field === 'day') {
      // Validate day against month/year if available
      const quest = localQuests.find(q => q.id === questId);
      const m = parseInt(quest?.deadline?.month);
      const y = parseInt(quest?.deadline?.year) || new Date().getFullYear();
      const maxDay = m ? new Date(y, m, 0).getDate() : 31;
      if (num < 1 || num > maxDay) { updateQuestDeadline(questId, field, ''); return; }
    }
    updateQuestDeadline(questId, field, String(num).padStart(2, '0'));
  };

  const updateQuestField = (questId, field, value) => {
    setLocalQuests(localQuests.map(q =>
      q.id === questId ? { ...q, [field]: value } : q
    ));
  };

  const expandAll = () => {
    const currentYear = String(new Date().getFullYear());
    setLocalQuests(lq => lq.map(q =>
      !q.deadline?.year ? { ...q, deadline: { ...q.deadline, year: currentYear } } : q
    ));
    setExpandedQuests(new Set(localQuests.map(q => q.id)));
  };

  const collapseAll = () => setExpandedQuests(new Set());

  // Auto-save on changes (debounce could be better, but simple for now)
  useEffect(() => {
    if(selectedNode) {
        const timeoutId = setTimeout(() => {
            handleSave();
        }, 500);
        return () => clearTimeout(timeoutId);
    }
  }, [localTitle, localDescription, localQuests]);

  return (
    <>
      <style>{`.sidebar-scroll::-webkit-scrollbar { display: none; }`}</style>
    <div
      className="fixed left-0 top-0 bottom-0 bg-white border-r-2 border-black shadow-2xl z-50 flex flex-col font-mono"
      style={{
        width: '400px',
        minWidth: '400px',
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.15s ease-out',
      }}
    >
      <div className="px-6 py-4 border-b-2 border-black flex justify-between items-center bg-gray-50">
        <h2 className="font-bold text-lg uppercase">Details</h2>
        <button onClick={onClose} className="hover:bg-gray-200 p-1 rounded">
          <X size={20} />
        </button>
      </div>

      <div className="sidebar-scroll px-6 py-5 flex-1 overflow-y-scroll" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {selectedNode ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase mb-2 text-gray-500">Title</label>
                  <MaskedInput
                    isPrivacyMode={isPrivacyMode}
                    value={localTitle}
                    onChange={(e) => setLocalTitle(e.target.value)}
                    className="w-full p-2 border-2 border-gray-300 focus:border-black outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase mb-2 text-gray-500">Description</label>
                  <MaskedTextarea
                    isPrivacyMode={isPrivacyMode}
                    value={localDescription}
                    onChange={(e) => setLocalDescription(e.target.value)}
                    className="w-full p-2 border-2 border-gray-300 focus:border-black outline-none text-sm h-24 resize-none"
                    placeholder="Add descriptions..."
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold uppercase text-gray-500">Tasks</label>
                    <div className="flex items-center gap-1">
                      <button onClick={expandAll} className="text-gray-400 hover:text-black p-0.5" title="Expand all">
                        <ChevronsDown size={14} />
                      </button>
                      <button onClick={collapseAll} className="text-gray-400 hover:text-black p-0.5" title="Collapse all">
                        <ChevronsUp size={14} />
                      </button>
                      <button
                        onClick={addQuest}
                        className="flex items-center text-xs bg-black text-white px-2 py-1 hover:bg-gray-800 ml-1"
                      >
                        <Plus size={12} className="mr-1" /> Add
                      </button>
                    </div>
                  </div>
                  
                  <Reorder.Group axis="y" values={localQuests} onReorder={setLocalQuests} className="space-y-2">
                    {localQuests.map((quest) => {
                      const isExpanded = expandedQuests.has(quest.id);
                      return (
                        <Reorder.Item layout={false} key={quest.id} value={quest} className="flex flex-col bg-white border border-gray-100 rounded">
                          {/* Main row */}
                          <div className="flex items-center gap-2 p-1">
                            <GripVertical size={14} className="cursor-grab text-gray-400 shrink-0" />
                            <button
                              onClick={() => {
                                const updated = localQuests.map(q =>
                                  q.id === quest.id ? { ...q, completed: !q.completed } : q
                                );
                                setLocalQuests(updated);
                              }}
                              className={`shrink-0 flex items-center justify-center cursor-pointer ${quest.completed ? 'text-gray-500' : ''}`}
                            >
                              {quest.completed ? <CheckSquare size={16} /> : <Square size={16} />}
                            </button>
                            <MaskedInput
                              isPrivacyMode={isPrivacyMode}
                              value={quest.text}
                              onChange={(e) => updateQuestText(quest.id, e.target.value)}
                              wrapperClassName="flex-1"
                              className={`w-full p-1 border-b border-gray-200 focus:border-black outline-none text-sm ${quest.completed ? 'line-through text-gray-400' : ''}`}
                            />
                            <button
                              onClick={() => toggleExpanded(quest.id)}
                              className="text-gray-400 hover:text-black shrink-0"
                              title={isExpanded ? 'Collapse' : 'Expand'}
                            >
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                            <button onClick={() => removeQuest(quest.id)} className="text-gray-400 hover:text-red-500 shrink-0">
                              <Trash2 size={14} />
                            </button>
                          </div>

                          {/* Expanded: deadline + task description */}
                          {isExpanded && (
                            <div className="ml-2 px-2 pb-2 space-y-2 border-t border-gray-100 pt-2">
                              {/* Deadline */}
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-400 uppercase font-bold w-16 shrink-0">Due</span>
                                <input
                                  type="text"
                                  maxLength={4}
                                  placeholder="YYYY"
                                  value={quest.deadline?.year || ''}
                                  onChange={(e) => updateQuestDeadline(quest.id, 'year', e.target.value.replace(/\D/g, ''))}
                                  className="w-12 border-b border-gray-300 focus:border-black outline-none text-center text-xs py-0.5"
                                />
                                <span className="text-gray-400 text-xs">-</span>
                                <input
                                  type="text"
                                  maxLength={2}
                                  placeholder="MM"
                                  value={quest.deadline?.month || ''}
                                  onChange={(e) => updateQuestDeadline(quest.id, 'month', e.target.value.replace(/\D/g, ''))}
                                  onBlur={(e) => padDeadlineField(quest.id, 'month', e.target.value)}
                                  className="w-8 border-b border-gray-300 focus:border-black outline-none text-center text-xs py-0.5"
                                />
                                <span className="text-gray-400 text-xs">-</span>
                                <input
                                  type="text"
                                  maxLength={2}
                                  placeholder="DD"
                                  value={quest.deadline?.day || ''}
                                  onChange={(e) => updateQuestDeadline(quest.id, 'day', e.target.value.replace(/\D/g, ''))}
                                  onBlur={(e) => padDeadlineField(quest.id, 'day', e.target.value)}
                                  className="w-8 border-b border-gray-300 focus:border-black outline-none text-center text-xs py-0.5"
                                />
                              </div>

                              {/* Recurrence */}
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-400 uppercase font-bold w-16 shrink-0">Recur</span>
                                <input
                                  list={`recurrence-${quest.id}`}
                                  value={quest.recurrence || ''}
                                  onChange={(e) => updateQuestField(quest.id, 'recurrence', e.target.value)}
                                  className="flex-1 border border-gray-300 focus:border-black outline-none text-xs p-1"
                                />
                                <datalist id={`recurrence-${quest.id}`}>
                                  <option value="Constant" />
                                  <option value="Daily" />
                                  <option value="Weekly" />
                                  <option value="Monthly" />
                                </datalist>
                              </div>

                              {/* Relevance */}
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-400 uppercase font-bold w-16 shrink-0">Relev.</span>
                                <input
                                  list={`relevance-${quest.id}`}
                                  value={quest.relevance || ''}
                                  onChange={(e) => updateQuestField(quest.id, 'relevance', e.target.value)}
                                  className="flex-1 border border-gray-300 focus:border-black outline-none text-xs p-1"
                                />
                                <datalist id={`relevance-${quest.id}`}>
                                  <option value="Compulsory" />
                                  <option value="High" />
                                  <option value="Medium" />
                                  <option value="Low" />
                                  <option value="None" />
                                </datalist>
                              </div>

                              {/* Task description */}
                              <div className="flex items-start gap-1">
                                <span className="text-xs text-gray-400 uppercase font-bold w-16 shrink-0 pt-1">Note</span>
                                <MaskedTextarea
                                  isPrivacyMode={isPrivacyMode}
                                  value={quest.taskDescription || ''}
                                  onChange={(e) => updateQuestTaskDesc(quest.id, e.target.value)}
                                  className="w-full p-1 border border-gray-300 focus:border-black outline-none text-xs resize-none"
                                  wrapperClassName="relative flex-1"
                                  autoResize
                                  placeholder="Add note..."
                                />
                              </div>
                            </div>
                          )}
                        </Reorder.Item>
                      );
                    })}
                  </Reorder.Group>
                </div>

                <div className="pt-6 border-t border-gray-200">
                  <button
                    onClick={() => onDeleteNode(selectedNode.id)}
                    className="w-full flex items-center justify-center p-2 text-red-600 border border-red-200 hover:bg-red-50"
                  >
                    <Trash2 size={16} className="mr-2" /> Delete
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 mt-10">
                Select a node to edit details.
              </div>
            )}
      </div>
    </div>
    </>
  );
};

export default Sidebar;
