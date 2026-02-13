import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { CheckSquare, Square, MoreHorizontal } from 'lucide-react';

const QuestNode = ({ id, data, isConnectable }) => {
  const { title, quests, onQuestToggle, onTitleChange, onQuestTextChange, isDimmed } = data;
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [editingTitle, setEditingTitle] = React.useState(title);
  const nodeRef = React.useRef(null);
  
  const borderColor = isDimmed ? 'border-gray-400' : 'border-black';
  const textColor = isDimmed ? 'text-gray-500' : 'text-black';
  const headerBorder = isDimmed ? 'border-gray-400' : 'border-black';
  const handleColor = isDimmed ? '!bg-gray-400' : '!bg-black';

  React.useLayoutEffect(() => {
    if (nodeRef.current) {
        nodeRef.current.style.width = 'fit-content';
        const naturalWidth = nodeRef.current.offsetWidth;
        const step = 40; 
        const minWidth = 200; 
        let targetWidth = Math.ceil(naturalWidth / step) * step;
        if (targetWidth < minWidth) targetWidth = minWidth;
        nodeRef.current.style.width = `${targetWidth}px`;
    }
  }, [title, quests, isEditingTitle, editingTitle]);

  // Focus input when editing starts
  const titleInputRef = React.useRef(null);
  React.useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
        titleInputRef.current.focus();
    }
  }, [isEditingTitle]);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (editingTitle !== title && onTitleChange) {
        onTitleChange(id, editingTitle);
    }
  };

  const hasQuests = quests && quests.length > 0;

  return (
    <div 
        ref={nodeRef}
        className={`bg-white border-2 shadow-lg rounded-sm overflow-hidden font-mono ${borderColor} ${textColor}`}
    >
      {/* Header / Title */}
      {title ? (
        <div 
            className={`bg-white p-2 font-bold text-center tracking-wider cursor-text h-[40px] flex items-center justify-center ${hasQuests ? `border-b-2 ${headerBorder}` : ''} ${textColor}`}
            onDoubleClick={() => {
                setEditingTitle(title);
                setIsEditingTitle(true);
            }}
        >
            {isEditingTitle ? (
                <input
                    ref={titleInputRef}
                    className="w-full text-center outline-none bg-transparent nodrag"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={handleTitleSubmit}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleTitleSubmit();
                        if (e.key === 'Escape') {
                            setIsEditingTitle(false);
                            setEditingTitle(title);
                        }
                    }}
                />
            ) : (
                title
            )}
        </div>
      ) : null}

      {/* List of Quests */}
      <div className="flex flex-col bg-white">
        {quests && quests.length > 0 && (
          quests.map((quest, index) => (
             <QuestItem 
                key={quest.id} 
                quest={quest} 
                nodeId={id}
                onToggle={onQuestToggle}
                onTextChange={onQuestTextChange}
             />
          ))
        )}
      </div>

      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className={`w-3 h-3 ${handleColor} !opacity-100 absolute left-1/2 -ml-1.5 -top-1.5`}
        style={{ transform: 'none' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className={`w-3 h-3 ${handleColor} !opacity-100 absolute left-1/2 -ml-1.5 -bottom-1.5`}
        style={{ transform: 'none' }} 
      />
    </div>
  );
};

// Subcomponent for Quest Item to handle its own editing state
const QuestItem = ({ quest, nodeId, onToggle, onTextChange }) => {
    const [isEditing, setIsEditing] = React.useState(false);
    const [text, setText] = React.useState(quest.text);
    const inputRef = React.useRef(null);

    React.useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    const handleSubmit = () => {
        setIsEditing(false);
        if (text !== quest.text && onTextChange) {
            onTextChange(nodeId, quest.id, text);
        }
    };

    return (
        <div 
            className={`flex items-center p-2 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors cursor-pointer h-[40px] box-border ${quest.completed ? 'opacity-50' : ''}`}
        >
            <div 
                className="mr-2 flex-shrink-0 flex items-center justify-center h-full"
                onClick={(e) => {
                    e.stopPropagation();
                    onToggle && onToggle(nodeId, quest.id);
                }}
            >
             {quest.completed ? <CheckSquare size={16} /> : <Square size={16} />}
            </div>
            
            <div 
                className="flex-1 text-sm flex items-center"
                onDoubleClick={(e) => {
                    e.stopPropagation(); // Prevent Sidebar opening if needed, though QuestNode usually handles clicks.
                    setText(quest.text);
                    setIsEditing(true);
                }}
            >
                 {isEditing ? (
                    <input 
                        ref={inputRef}
                        className="w-full outline-none bg-transparent nodrag"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onBlur={handleSubmit}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSubmit();
                            if (e.key === 'Escape') {
                                setIsEditing(false);
                                setText(quest.text);
                            }
                        }}
                    />
                 ) : (
                    <span className={`${quest.completed ? 'line-through' : ''} w-full block`}>
                        {quest.text}
                    </span>
                 )}
            </div>
        </div>
    );
};

export default memo(QuestNode);
