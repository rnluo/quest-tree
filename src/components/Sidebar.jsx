import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, GripVertical } from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';

const Sidebar = ({ isOpen, onClose, selectedNode, onUpdateNode, onDeleteNode, isPrivacyMode }) => {
  const [localTitle, setLocalTitle] = useState('');
  const [localDescription, setLocalDescription] = useState('');
  const [localQuests, setLocalQuests] = useState([]);

  // Sync local state when selectedNode changes
  useEffect(() => {
    if (selectedNode) {
      setLocalTitle(selectedNode.data.title || '');
      setLocalDescription(selectedNode.data.description || '');
      setLocalQuests(selectedNode.data.quests || []);
    }
  }, [selectedNode]);

  // Helper functions for masking
  const getMaskedValue = (val) => val.replace(/[^ ]/g, '*');

  const MaskedInput = ({ value, onChange, className, type = "text", placeholder, wrapperClassName = "w-full", ...props }) => {
    if (!isPrivacyMode) {
      return (
        <input
          type={type}
          value={value}
          onChange={onChange}
          className={`${className} ${wrapperClassName === 'flex-1' ? 'flex-1' : ''}`} 
          // If wrapperClassName was meant for flex, pass it here too if not used in wrapper? 
          // Actually, if !isPrivacyMode, we return input directly. The calling code expects 'className' to handle layout.
          // IF the calling code relies on 'className' for layout (like flex-1), it works here.
          // BUT if we use MaskedInput, we might need to separate layout styles from visual styles.
          placeholder={placeholder}
          {...props}
        />
      );
    }

    const maskedValue = getMaskedValue(value);

    return (
      <div className={`relative ${wrapperClassName}`}>
        {/* Underlay (Text) */}
        <input
           type="text"
           value={maskedValue}
           readOnly
           className={`${className} absolute inset-0 z-0 text-black bg-white select-none pointer-events-none border-transparent`}
           style={{ borderColor: 'transparent' }} 
        />
        
        {/* Overlay (Interaction) */}
        <input 
            type={type}
            value={value}
            onChange={onChange}
            className={`${className} relative z-10 text-transparent caret-black bg-transparent focus:bg-transparent`}
            style={{ 
                color: 'transparent', 
                caretColor: 'black', 
                backgroundColor: 'transparent'
            }}
            placeholder={placeholder}
            {...props}
        />
      </div>
    );
  };

  const MaskedTextarea = ({ value, onChange, className, placeholder, ...props }) => {
    if (!isPrivacyMode) {
        return (
            <textarea
                value={value}
                onChange={onChange}
                className={className}
                placeholder={placeholder}
                {...props}
            />
        );
    }

    const maskedValue = getMaskedValue(value);

    return (
        <div className="relative w-full h-24">
             {/* Underlay */}
            <textarea
                value={maskedValue}
                readOnly
                className={`${className} absolute inset-0 z-0 text-black bg-white select-none pointer-events-none border-transparent`}
                 style={{ borderColor: 'transparent' }}
            />
             {/* Overlay */}
            <textarea
                value={value}
                onChange={onChange}
                className={`${className} relative z-10 text-transparent caret-black bg-transparent focus:bg-transparent`}
                style={{ 
                    color: 'transparent', 
                    caretColor: 'black',
                    backgroundColor: 'transparent' 
                }}
                placeholder={placeholder}
                {...props}
            />
        </div>
    );
  };
  
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
  };

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
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: 0 }}
          exit={{ x: '-100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed left-0 top-0 bottom-0 w-80 bg-white border-r-2 border-black shadow-2xl z-50 flex flex-col font-mono"
        >
          <div className="p-4 border-b-2 border-black flex justify-between items-center bg-gray-50">
            <h2 className="font-bold text-lg uppercase">Details</h2>
            <button onClick={onClose} className="hover:bg-gray-200 p-1 rounded">
              <X size={20} />
            </button>
          </div>

          <div className="p-4 flex-1 overflow-y-auto">
            {selectedNode ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase mb-2 text-gray-500">Title</label>
                  <MaskedInput
                    value={localTitle}
                    onChange={(e) => setLocalTitle(e.target.value)}
                    className="w-full p-2 border-2 border-gray-300 focus:border-black outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase mb-2 text-gray-500">Description</label>
                  <MaskedTextarea
                    value={localDescription}
                    onChange={(e) => setLocalDescription(e.target.value)}
                    className="w-full p-2 border-2 border-gray-300 focus:border-black outline-none font-sans text-sm h-24 resize-none"
                    placeholder="Add descriptions..."
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold uppercase text-gray-500">Tasks</label>
                    <button 
                      onClick={addQuest}
                      className="flex items-center text-xs bg-black text-white px-2 py-1 hover:bg-gray-800"
                    >
                      <Plus size={12} className="mr-1" /> Add
                    </button>
                  </div>
                  
                  <Reorder.Group axis="y" values={localQuests} onReorder={setLocalQuests} className="space-y-2">
                    {localQuests.map((quest) => (
                      <Reorder.Item key={quest.id} value={quest} className="flex items-center gap-2 bg-white relative">
                        <GripVertical size={14} className="cursor-grab text-gray-400 shrink-0" />
                        <input
                          type="checkbox"
                          checked={quest.completed}
                          onChange={() => {
                            const updated = localQuests.map(q => 
                              q.id === quest.id ? { ...q, completed: !q.completed } : q
                            );
                            setLocalQuests(updated);
                          }}
                          className="h-4 w-4 border-2 border-black rounded-none cursor-pointer shrink-0"
                        />
                        <MaskedInput
                          value={quest.text}
                          onChange={(e) => updateQuestText(quest.id, e.target.value)}
                          wrapperClassName="flex-1"
                          className={`w-full p-1 border-b border-gray-200 focus:border-black outline-none text-sm ${quest.completed ? 'line-through text-gray-400' : ''}`}
                        />
                        <button onClick={() => removeQuest(quest.id)} className="text-gray-400 hover:text-red-500 shrink-0">
                          <Trash2 size={14} />
                        </button>
                      </Reorder.Item>
                    ))}
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
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Sidebar;
