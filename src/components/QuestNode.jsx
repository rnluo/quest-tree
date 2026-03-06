/* eslint-disable react/prop-types */
import React, { memo, useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { CheckSquare, Square, Plus, X, ChevronUp, ChevronDown } from 'lucide-react';

const QuestNode = ({ id, data, isConnectable }) => {
  const { 
      title, 
      quests, 
      onQuestToggle, 
      onTitleChange, 
      onQuestTextChange, 
      onQuestCounterChange, 
      onNodeCounterChange, 
      onAddQuest,
      onDeleteQuest,
      onDeleteNode,
      isDimmed, 
      counter,
      isInteractive,
      isPrivacyMode,
      showEnergyColumn,
      onQuestEnergyChange,
      onNodeEnergyChange
  } = data;
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState(title);
  const [isTitleHovered, setIsTitleHovered] = useState(false);
  const nodeRef = useRef(null);
  
  const displayTitle = isPrivacyMode && title ? title.replace(/[^ ]/g, '*') : title;
  
  const borderColor = isDimmed ? 'border-gray-400' : 'border-black';
  const textColor = isDimmed ? 'text-gray-500' : 'text-black';
  const headerBorder = isDimmed ? 'border-gray-400' : 'border-black';
  const handleColor = isDimmed ? '!bg-gray-400' : '!bg-black';

  useLayoutEffect(() => {
    if (nodeRef.current) {
        nodeRef.current.style.width = 'fit-content';
        const naturalWidth = nodeRef.current.offsetWidth;
        const step = 40; 
        const minWidth = 202; 
        let targetWidth = Math.ceil(naturalWidth / step) * step + 2;
        if (targetWidth < minWidth) targetWidth = minWidth;
        nodeRef.current.style.width = `${targetWidth}px`;
    }
  }, [title, quests, isEditingTitle, editingTitle, isPrivacyMode]);

  // Focus input when editing starts
  const titleInputRef = useRef(null);
  useEffect(() => {
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

  // Calculate counter groups
  const rows = [
    ...(title ? [{ 
        id: 'title', 
        counter, 
        isCompleted: isDimmed, 
        onUpdate: (c) => onNodeCounterChange && onNodeCounterChange(id, c) 
    }] : []),
    ...(quests || []).map(q => ({
        id: q.id,
        counter: q.counter,
        isCompleted: q.completed,
        onUpdate: (c) => onQuestCounterChange && onQuestCounterChange(id, q.id, c)
    }))
  ];

  const counterGroups = [];
  let currentGroup = null;

  rows.forEach((row, index) => {
    if (row.counter) {
        if (!currentGroup) {
            currentGroup = { startIndex: index, items: [] };
        }
        currentGroup.items.push(row);
    } else {
        if (currentGroup) {
            counterGroups.push(currentGroup);
            currentGroup = null;
        }
    }
  });
  if (currentGroup) {
      counterGroups.push(currentGroup);
  }

  const hasAnyCounter = rows.some(r => r.counter);

  const energyTopOffset = title ? 40 : 0;
  const energyRows = showEnergyColumn && quests && quests.length > 0
    ? quests.map((q) => ({
        id: q.id + '-e',
        energy: q.energy ?? 0,
        onUpdate: (val) => onQuestEnergyChange && onQuestEnergyChange(id, q.id, val)
      }))
    : [];

  return (
    <div 
        ref={nodeRef}
        className={`relative bg-transparent group font-mono ${textColor} box-border`}
        style={{ transform: 'translate(-1px, -1px)' }}
    >
      {/* Energy Column Overlay — rendered first (behind everything) */}
      {showEnergyColumn && energyRows.length > 0 && (
          <EnergyGroup
            rows={energyRows}
            topOffset={energyTopOffset}
            hasAnyCounter={hasAnyCounter}
            isDimmed={isDimmed}
            isInteractive={isInteractive}
          />
      )}

      {/* Counter Groups Overlay */}
      {counterGroups.map((group, i) => (
          <CounterGroup 
            key={i} 
            group={group} 
            isDimmed={isDimmed}
            isInteractive={isInteractive}
          />
      ))}

      {/* Inner container for visual style */}
      <div className={`bg-white border-2 shadow-lg rounded-sm ${borderColor}`}>
        {/* Header / Title */}
        {title ? (
            <div 
                className={`relative bg-white font-bold text-center tracking-wider cursor-text h-[39px] flex items-center justify-center ${hasQuests ? `${headerBorder}` : ''} ${textColor}`}
                style={{
                  borderBottomWidth: hasQuests ? '2px' : '0',
                  boxSizing: 'border-box' 
                }}
                onDoubleClick={() => {
                    setEditingTitle(title);
                    setIsEditingTitle(true);
                }}
                onMouseEnter={() => setIsTitleHovered(true)}
                onMouseLeave={() => setIsTitleHovered(false)}
            >
                {/* Remove Node Button (Right side) */}
                {isInteractive && (
                    <RemoveNodeButton 
                         isParentHovered={isTitleHovered}
                         onRemove={() => onDeleteNode && onDeleteNode(id)}
                         isNodeDimmed={isDimmed}
                    />
                )}

                {/* Add Counter Button for Title (Only if no counter exists) */}
                {isInteractive && !counter && (
                    <AddCounterButton 
                        isParentHovered={isTitleHovered}
                        onAdd={() => onNodeCounterChange && onNodeCounterChange(id, { current: 0, max: 0 })}
                        isNodeDimmed={isDimmed}
                    />
                )}

                {/* Add Task Button Handling for Node without Tasks (Hover on Title) */}
                {/* Logic: show if interactive, no quests, and title is hovered OR if Add button should be there?
                    Wait, if I use the placeholder controller logic again, it might work?
                    But let's stick to inline logic as debugged.
                */}
                {isInteractive && !hasQuests && isTitleHovered && (
                     <div 
                        className="absolute left-1/2 bottom-0 z-30"
                        style={{ transform: 'translate(-50%, 100%)', paddingTop: '10px' }}
                     >
                        <div className="relative">
                            <button 
                                 className={`rounded-full text-white p-0 flex items-center justify-center box-border transition-colors
                                    ${isDimmed ? 'bg-gray-400 hover:bg-gray-500' : 'bg-black hover:bg-gray-800'}
                                 `}
                                 style={{
                                     width: '20px',
                                     height: '20px'
                                 }}
                                 onClick={(e) => {
                                     e.stopPropagation();
                                     onAddQuest && onAddQuest(id);
                                 }}
                                 title="Add Task"
                            >
                                 <Plus size={14} strokeWidth={3} />
                            </button>
                             {/* Connector line for add task */}
                             <div 
                                className={`absolute left-1/2 bottom-full w-[2px] h-[10px] -translate-x-1/2 pointer-events-none
                                     ${isDimmed ? 'bg-gray-400' : 'bg-black'}
                                `} 
                            />
                        </div>
                     </div>
                )}

                {isEditingTitle ? (
                    <input
                        ref={titleInputRef}
                        type={isPrivacyMode ? "password" : "text"}
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
                    displayTitle
                )}
            </div>
        ) : null}

        {/* List of Quests */}
        <div className="flex flex-col bg-white">
            {quests && quests.length > 0 && (
            quests.map((quest, index) => {
                const isLast = index === quests.length - 1;
                return (
                    <QuestItem 
                        key={quest.id} 
                        quest={quest} 
                        nodeId={id}
                        isNodeDimmed={isDimmed}
                        isInteractive={isInteractive}
                        isPrivacyMode={isPrivacyMode}
                        isLast={isLast}
                        onToggle={onQuestToggle}
                        onTextChange={onQuestTextChange}
                        onCounterChange={onQuestCounterChange}
                        onDeleteQuest={onDeleteQuest}
                        onAddQuest={onAddQuest}
                    />
                );
            })
            )}

            {/* Empty placeholder if no quests? No, structure implies title is always there. */}
            
        </div>
      </div>
      
      {/* Add Task Button (Bottom Center) - Only show if interactive */}
      {/* Intentionally removed AddTaskButtonController to avoid duplication logic. 
          The button is now rendered inside the QuestItem or the Title block. 
          But wait, if we have quests, the button is in the LAST QuestItem.
          If we have NO quests, the button is in the Title block (added above).
          So we don't need this block anymore properly.
      */}
      {/* 
        Legacy/Duplicate block removed or kept empty.
        Actually, the QuestItem logic handles "isLast" to show the button.
        And the Title logic handles "!hasQuests" to show the button.
        So we have complete coverage.
      */}

      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className={`w-3 h-3 ${handleColor} !opacity-100 absolute left-1/2 -ml-1.5 -top-1.5 z-10`}
        style={{ transform: 'none' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className={`w-3 h-3 ${handleColor} !opacity-100 absolute left-1/2 -ml-1.5 -bottom-1.5 z-10`}
        style={{ transform: 'none' }} 
      />
    </div>
  );
};

const EnergyGroup = ({ rows, topOffset = 0, hasAnyCounter, isDimmed, isInteractive }) => {
    const numRows = rows.length;
    const height = numRows * 40 + 2;
    const rightEdge = hasAnyCounter ? 120 : 20;
    const boxLeft = -(rightEdge + 40);
    const connectorWidth = hasAnyCounter ? 120 : 20;

    return (
        <div
            className="absolute box-border z-[1] pointer-events-none"
            style={{
                left: `${boxLeft}px`,
                top: `${topOffset}px`,
                width: `${40 + connectorWidth}px`,
                height: `${height}px`,
            }}
        >
            {/* Connector lines */}
            <div className="absolute right-0 top-0 bottom-0 pointer-events-none" style={{ width: `${connectorWidth}px` }}>
                {rows.map((row, i) => (
                    <div
                        key={i}
                        className={`absolute h-[2px] w-full ${isDimmed ? 'bg-gray-400' : 'bg-black'}`}
                        style={{ top: `${i * 40 + 20}px`, transform: 'translateY(-50%)' }}
                    />
                ))}
            </div>
            {/* Main box */}
            <div
                className={`border-2 shadow-lg rounded-sm box-border pointer-events-auto overflow-hidden bg-white
                    ${isDimmed ? 'border-gray-400' : 'border-black'}
                `}
                style={{ width: '42px', height: '100%', position: 'relative' }}
            >
                {rows.map((row, i) => (
                    <div
                        key={i}
                        className="absolute w-full"
                        style={{ top: `${i * 40}px`, height: '40px' }}
                    >
                        <EnergyCell
                            value={row.energy}
                            onUpdate={row.onUpdate}
                            isDimmed={isDimmed}
                            isInteractive={isInteractive}
                        />
                    </div>
                ))}
                {/* Dividers as exact pixel lines on the container */}
                {rows.map((_, i) => i > 0 && (
                    <div
                        key={`div-${i}`}
                        className="absolute left-0 right-0 h-px bg-gray-200 pointer-events-none"
                        style={{ top: `${i * 40 - 1}px` }}
                    />
                ))}
            </div>
        </div>
    );
};

const ENERGY_COLORS = [
    null,                       // 0 — white (default bg)
    'rgba(0,153,255,0.15)',     // 1
    'rgba(0,153,255,0.32)',     // 2
    'rgba(0,153,255,0.50)',     // 3
    'rgba(0,153,255,0.72)',     // 4
    '#0099ff',                  // 5
];

const EnergyCell = ({ value, onUpdate, isDimmed, isInteractive }) => {
    const [isHovered, setIsHovered] = useState(false);
    const bgColor = !isDimmed && value > 0 ? ENERGY_COLORS[value] : undefined;
    const textColor = isDimmed ? 'text-gray-400' : value === 0 ? 'text-gray-300' : value >= 4 ? 'text-white' : 'text-black';

    return (
        <div
            className="w-full h-full flex flex-col items-center outline-none"
            style={{ backgroundColor: bgColor }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={(e) => e.stopPropagation()}
        >
            <button
                className={`w-full flex justify-center flex-1 items-center
                    ${isInteractive ? 'hover:bg-black/10 active:bg-black/20 cursor-pointer' : 'cursor-default'}`}
                onClick={(e) => {
                    e.stopPropagation();
                    if (isInteractive) onUpdate((value + 1) % 6);
                }}
                disabled={!isInteractive}
            >
                {isHovered && isInteractive && <ChevronUp size={10} className={textColor} />}
            </button>
            <div className={`absolute inset-0 flex items-center justify-center font-bold text-sm leading-none pointer-events-none ${textColor}`}>
                {value}
            </div>
            <button
                className={`w-full flex justify-center flex-1 items-center
                    ${isInteractive ? 'hover:bg-black/10 active:bg-black/20 cursor-pointer' : 'cursor-default'}`}
                onClick={(e) => {
                    e.stopPropagation();
                    if (isInteractive) onUpdate((value + 5) % 6);
                }}
                disabled={!isInteractive}
            >
                {isHovered && isInteractive && <ChevronDown size={10} className={textColor} />}
            </button>
        </div>
    );
};

const CounterGroup = ({ group, isDimmed, isInteractive }) => {
    const { startIndex, items } = group;
    // Calculate position
    const top = startIndex * 40;
    const height = items.length * 40 + 2;
    
    return (
        <div
            className="absolute left-0 box-border z-10"
            style={{
                top: `${top}px`,
                height: `${height}px`,
                transform: 'translateX(-100%)',
                paddingRight: '18px' // Gap for connector
            }}
        >
             {/* Connector Line - One line from the center of the group to the node? 
                 Or individual lines? 
                 User said: "add a 1-grid length black line between the counter and the node".
                 If merged, maybe a bracket or just a line from the middle if it represents the group.
                 However, these counters are for specific rows.
                 So we probably want individual lines for each row, OR if they are merged, maybe just stick the block there.
                 Let's stick with individual lines for clarity, or one big connector if that's what "bigger component" implies.
                 If I have a block of 3 counters, and I correspond to 3 rows.
                 Let's draw a line from each counter row to the node row.
             */}
             <div className="absolute right-0 top-0 bottom-0 w-[20px] pointer-events-none">
                {items.map((item, i) => {
                    // Logic changed: connector is grey ONLY if the entire node is dimmed.
                    // The 'isDimmed' prop passed to CounterGroup controls this.
                    // We access it via parent scope or prop if available.
                    // CounterGroup receives 'isDimmed', so we can use it.
                    
                    return (
                        <div 
                            key={i}
                            className={`absolute h-[2px] w-full ${isDimmed ? 'bg-gray-400' : 'bg-black'}`}
                            style={{
                                top: `${i * 40 + 20}px`,
                                transform: 'translateY(-50%)'
                            }}
                        />
                    );
                })}
             </div>

            {/* The Main Merged Box */}
            <div 
                className={`flex flex-col bg-white border-2 shadow-lg rounded-sm box-border w-[82px]
                    ${isDimmed ? 'border-gray-400' : 'border-black'}
                `}
                style={{ height: '100%' }}
            >
                {items.map((item, i) => (
                    <React.Fragment key={i}>
                        {i > 0 && <div className="h-[1px] bg-gray-200 w-full" />}
                        <div className="flex-1 w-full h-[40px] relative">
                            <CounterRow 
                                counter={item.counter} 
                                onUpdate={item.onUpdate} 
                                isRowCompleted={item.isCompleted}
                                isNodeDimmed={isDimmed}
                                isInteractive={isInteractive}
                            />
                        </div>
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

const CounterRow = ({ counter, onUpdate, isRowCompleted, isNodeDimmed, isInteractive }) => {
    const [isSelected, setIsSelected] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const ref = useRef(null);
    const { current: currentVal, max: maxVal } = counter;

    // Conditions for graying out numbers
    const isCounterFinished = currentVal >= maxVal;
    
    // Logic: 
    // If not interactive, it should look normal (unless completed/dimmed)?
    // User said "remove counter button still appearing after interactivity is off".
    // This implies `isInteractive` is false, but user can still see "Remove Button" on hover.
    
    const isGrayedOut = isRowCompleted || isCounterFinished;
    const numberColorClass = isGrayedOut ? 'text-gray-400' : 'text-black';

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (ref.current && !ref.current.contains(event.target)) {
                setIsSelected(false);
            }
        };
        if (isSelected) window.addEventListener('click', handleClickOutside, { capture: true });
        return () => window.removeEventListener('click', handleClickOutside, { capture: true });
    }, [isSelected]);

    const handleKeyDown = (e) => {
        if (isInteractive && isSelected && (e.key === 'Delete' || e.key === 'Backspace')) {
             e.stopPropagation();
             onUpdate(null);
        }
    };

    const updateCounter = (u) => {
        if (!isInteractive) return;
        onUpdate({ ...counter, ...u });
    };

    return (
        <div 
            ref={ref}
            tabIndex={-1}
            onKeyDown={handleKeyDown}
            className={`w-full h-full flex items-center bg-white outline-none ${isSelected ? 'bg-gray-50' : ''} group/counter`}
            onClick={(e) => {
                // If not interactive, maybe allow selection? 
                // But definitely stop propagation to prevent node drag if inside node (but counter is outside).
                e.stopPropagation();
                if (isInteractive) setIsSelected(true);
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
             {/* Remove Counter Button (only on hover AND interactive) */}
             {isHovered && isInteractive && (
                <div 
                    className="absolute top-0 h-full flex items-center justify-start p-0"
                    style={{ 
                        right: '100%', 
                        width: '31px', // 20px button + 10px gap
                        zIndex: 20,
                        pointerEvents: 'auto'
                    }}
                >
                    <button 
                        className={`rounded-full text-white p-0 flex items-center justify-center box-border transition-colors absolute left-0 top-1/2 -translate-y-1/2
                            ${isNodeDimmed ? 'bg-gray-400 hover:bg-gray-500' : 'bg-black hover:bg-gray-800'}
                        `}
                        style={{
                            width: '20px',
                            height: '20px'
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            onUpdate(null); // Remove
                        }}
                        title="Remove Counter"
                    >
                        <X size={14} strokeWidth={3} />
                    </button>
                    

                </div>
             )}

             {/* Current Value Control */}
             <div className="flex flex-col items-center w-1/2 h-full justify-center border-r border-gray-100 relative">
                    <button
                        className={`w-full flex justify-center flex-1 items-center h-1/2
                             ${isInteractive ? 'hover:bg-gray-100 active:bg-gray-200 cursor-pointer' : 'cursor-default'}
                             text-gray-600`}
                        onClick={(e) => {
                            e.stopPropagation();
                            updateCounter({ current: currentVal + 1 });
                        }}
                        disabled={!isInteractive}
                    >
                        {/* Only show chevron if hovered and interactive */}
                        {isHovered && isInteractive && <ChevronUp size={10} />}
                    </button>
                    
                    <div className={`absolute inset-0 flex items-center justify-center font-bold text-sm leading-none pointer-events-none ${numberColorClass}`}>
                        {currentVal}
                    </div>

                    <button
                        className={`w-full flex justify-center flex-1 items-center h-1/2
                             ${isInteractive ? 'hover:bg-gray-100 active:bg-gray-200 cursor-pointer' : 'cursor-default'}
                        text-gray-600`}
                        onClick={(e) => {
                            e.stopPropagation();
                            updateCounter({ current: Math.max(0, currentVal - 1) });
                        }}
                        disabled={!isInteractive}
                    >
                         {isHovered && isInteractive && <ChevronDown size={10} />}
                    </button>
            </div>
            
            {/* Max Value Control */}
            <div className="flex flex-col items-center w-1/2 h-full justify-center relative"> 
                    <button
                        className={`w-full flex justify-center flex-1 items-center h-1/2
                             ${isInteractive ? 'hover:bg-gray-100 active:bg-gray-200 cursor-pointer' : 'cursor-default'}
                        text-gray-600`}
                        onClick={(e) => {
                            e.stopPropagation();
                            updateCounter({ max: maxVal + 1 });
                        }}
                        disabled={!isInteractive}
                    >
                        {isHovered && isInteractive && <ChevronUp size={10} />}
                    </button>

                    <div className={`absolute inset-0 flex items-center justify-center font-bold text-sm leading-none pointer-events-none ${numberColorClass}`}>
                        {maxVal}
                    </div>

                    <button
                        className={`w-full flex justify-center flex-1 items-center h-1/2
                             ${isInteractive ? 'hover:bg-gray-100 active:bg-gray-200 cursor-pointer' : 'cursor-default'}
                        text-gray-600`}
                        onClick={(e) => {
                            e.stopPropagation();
                            updateCounter({ max: Math.max(0, maxVal - 1) });
                        }}
                        disabled={!isInteractive}
                    >
                        {isHovered && isInteractive && <ChevronDown size={10} />}
                    </button>
            </div>
        </div>
    );
};

// Component for Removing Row/Node (Right side)
const RemoveNodeButton = ({ isParentHovered, onRemove, isNodeDimmed }) => {
    if (!isParentHovered) return null;
    return (
        <div 
            className="absolute top-0 h-full flex items-center justify-end p-0"
            style={{ 
                left: '100%', 
                width: '31px', 
                zIndex: 20,
                pointerEvents: 'auto'
            }}
        >
            <button 
                className={`rounded-full text-white p-0 flex items-center justify-center box-border transition-colors absolute right-0 top-1/2 -translate-y-1/2
                    ${isNodeDimmed ? 'bg-gray-400 hover:bg-gray-500' : 'bg-black hover:bg-gray-800'}
                `}
                style={{
                    width: '20px',
                    height: '20px'
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                }}
                title="Remove"
            >
                <X size={14} strokeWidth={3} />
            </button>
        </div>
    );
};

// Helper for the "Add Task" button at the bottom
const AddTaskButtonController = () => null; // Placeholder to avoid reference errors if used elsewhere, though we integrated it.

const AddCounterButton = ({ isParentHovered, onAdd, isNodeDimmed }) => {
    if (!isParentHovered) return null;
    return (
        <div 
            className="absolute top-0 h-full flex items-center justify-start p-0"
            style={{ 
                right: '100%', 
                width: '31px', 
                zIndex: 20,
                pointerEvents: 'auto'
            }}
        >
            <button 
                className={`rounded-full text-white p-0 flex items-center justify-center box-border transition-colors absolute left-0 top-1/2 -translate-y-1/2
                    ${isNodeDimmed ? 'bg-gray-400 hover:bg-gray-500' : 'bg-black hover:bg-gray-800'}
                `}
                style={{
                    width: '20px',
                    height: '20px'
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    onAdd();
                }}
                title="Add Counter"
            >
                <Plus size={14} strokeWidth={3} />
            </button>
        </div>
    );
}

const QuestItem = ({ quest, nodeId, onToggle, onTextChange, onCounterChange, isNodeDimmed, isInteractive, isPrivacyMode, isLast, onDeleteQuest, onAddQuest }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [text, setText] = useState(quest.text);
    const [isHovered, setIsHovered] = useState(false);
    const inputRef = useRef(null);
    
    const displayText = isPrivacyMode ? quest.text.replace(/[^ ]/g, '*') : quest.text;

    useEffect(() => {
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
            className={`relative flex items-center p-2 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors cursor-pointer h-[40px] box-border ${isNodeDimmed ? 'text-gray-500' : ''} ${quest.completed ? 'text-gray-500 line-through' : ''}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Add Counter Button (Only if no counter exists) */}
            {isInteractive && !quest.counter && (
                <AddCounterButton 
                    isParentHovered={isHovered}
                    onAdd={() => onCounterChange && onCounterChange(nodeId, quest.id, { current: 0, max: 0 })}
                    isNodeDimmed={isNodeDimmed} 
                />
            )}
            
            {/* Remove Row Button (Right side) */}
            {isInteractive && (
                <RemoveNodeButton 
                     isParentHovered={isHovered}
                     onRemove={() => onDeleteQuest && onDeleteQuest(nodeId, quest.id)}
                     isNodeDimmed={isNodeDimmed}
                />
            )}
            
            {/* Add Task Button for Last Row */}
            {isInteractive && isLast && isHovered && (
                 <div 
                    className="absolute left-1/2 bottom-0 z-30"
                    style={{ transform: 'translate(-50%, 100%)', paddingTop: '10px' }}
                 >
                    <div className="relative">
                        <button 
                             className={`rounded-full text-white p-0 flex items-center justify-center box-border transition-colors
                                ${isNodeDimmed ? 'bg-gray-400 hover:bg-gray-500' : 'bg-black hover:bg-gray-800'}
                             `}
                             style={{
                                 width: '20px',
                                 height: '20px'
                             }}
                             onClick={(e) => {
                                 e.stopPropagation();
                                 onAddQuest && onAddQuest(nodeId);
                             }}
                             title="Add Task"
                        >
                             <Plus size={14} strokeWidth={3} />
                        </button>
                         <div 
                            className={`absolute left-1/2 bottom-full w-[2px] h-[10px] -translate-x-1/2 pointer-events-none
                                 ${isNodeDimmed ? 'bg-gray-400' : 'bg-black'}
                            `} 
                        />
                    </div>
                 </div>
            )}

            <div 
                className={`mr-2 flex-shrink-0 flex items-center justify-center h-full ${quest.completed ? 'text-gray-500' : ''}`}
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
                    e.stopPropagation(); 
                    setText(quest.text);
                    setIsEditing(true);
                }}
            >
                 {isEditing ? (
                    <input 
                        ref={inputRef}
                        type={isPrivacyMode ? "password" : "text"}
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
                    <span className={`${quest.completed ? 'line-through text-gray-500' : ''} w-full block`}>
                        {displayText}
                    </span>
                 )}
            </div>
        </div>
    );
};

export default memo(QuestNode);
