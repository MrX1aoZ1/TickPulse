'use client';

import { useState, useEffect } from 'react';
import { useTasks, taskApi } from '@/context/TaskContext';
import { useToast } from '@/context/ToastContext';
import {
  PlusIcon, PencilIcon, TrashIcon,
  CalendarIcon, RectangleStackIcon,
  Bars3Icon, CheckCircleIcon, XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
// 🎯 引入現代版 react-beautiful-dnd 拖曳組件
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const smartFilters = [
  { id: 'all', name: 'All Tasks', icon: RectangleStackIcon },
  { id: 'today', name: 'Today\'s Tasks', icon: CalendarIcon },
  { id: 'next7', name: 'Next 7 Days', icon: ClockIcon },
];

const statusFilters = [
  { id: 'completed', name: 'Completed', icon: CheckCircleIcon },
  { id: 'cancelled', name: 'Won\'t Do', icon: XCircleIcon },
  { id: 'deleted', name: 'Trash', icon: TrashIcon }
];

export default function CategoryList() {
  const { categories = [], dispatch, selectedCategoryId, selectedView, activeFilter } = useTasks();
  const { showSuccess, showError } = useToast();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const fetched = await taskApi.getAllCategories();
      if (Array.isArray(fetched)) {
        const transformed = fetched.map(cat => ({
          id: cat.id || cat.category_id,
          name: cat.category_name || cat.name || 'Unnamed Category',
          sort_order: cat.sort_order !== undefined && cat.sort_order !== null ? Number(cat.sort_order) : 0
        }));
        dispatch({ type: 'SET_CATEGORIES', payload: transformed });
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setIsLoading(false);
    }
  };
  fetchCategories();
}, [dispatch]);

  const handleSelectFilter = (filterId) => {
    dispatch({ type: 'SET_VIEW', payload: 'filter' });
    dispatch({ type: 'SET_FILTER', payload: filterId });
  };

  const handleSelectCategory = (id) => {
    dispatch({ type: 'SET_VIEW', payload: 'category' });
    dispatch({ type: 'SELECT_CATEGORY', payload: id });
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    try {
      const response = await taskApi.createCategory(trimmed);
      // 前端樂觀同步：直接使用後端幫我們算好的 MAX + 100 權重
      const newCat = {
        id: response?.category_id,
        name: response?.name || trimmed,
        sort_order: Number(response?.sort_order) || 0
      };

      dispatch({ type: 'ADD_CATEGORY', payload: newCat });
      setNewCategoryName('');
      setIsAdding(false);
      showSuccess('List created successfully');
    } catch (error) {
      showError('Failed to create list');
    }
  };

  const handleDeleteCategory = async (e, id) => {
    e.stopPropagation();
    if (id && id.toString().startsWith('inbox_')) return;
    if (confirm('Are you sure you want to delete this list?')) {
      try {
        await taskApi.deleteCategory(id);
        dispatch({ type: 'DELETE_CATEGORY', payload: id });
        showSuccess('List deleted');
      } catch (error) {
        showError('Failed to delete list');
      }
    }
  };

  const handleSaveEdit = async (e) => {
    if (e) e.preventDefault();
    const trimmed = editName.trim();
    if (!trimmed) return;
    try {
      await taskApi.updateCategory(editingId, trimmed);
      dispatch({ type: 'RENAME_CATEGORY', payload: { categoryId: editingId, newName: trimmed } });
      setEditingId(null);
      showSuccess('List renamed');
    } catch (error) {
      showError('Failed to rename list');
    }
  };

  // 🎯 核心拖曳釋放處理函數
  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination || destination.index === source.index) return;

    const reorderedCategories = Array.from(categories);
    const [removed] = reorderedCategories.splice(source.index, 1);
    reorderedCategories.splice(destination.index, 0, removed);

    let newOrder = 0.0;
    const idx = destination.index;
    console.log(newOrder);

    if (reorderedCategories.length === 1) {
      newOrder = 100;
    } else if (idx === 0) {
      // 拖曳到最頂端：比原本第一名再減 100
      newOrder = reorderedCategories[1].sort_order - 100;
    } else if (idx === reorderedCategories.length - 1) {
      // 拖曳到最底端：比原本最後一名再加 100
      newOrder = reorderedCategories[idx - 1].sort_order + 100;
    } else {
      // 夾在中間：取前一項與後一項 sort_order 的平均浮點數
      const prevOrder = reorderedCategories[idx - 1].sort_order;
      const nextOrder = reorderedCategories[idx + 1].sort_order;
      newOrder = (prevOrder + nextOrder) / 2;
    }

    // 1. 立即派發 Action 更新前端 UI (樂觀更新，流暢度滿分)
    dispatch({
      type: 'REORDER_CATEGORIES',
      payload: { categoryId: draggableId, newOrder: newOrder }
    });

    // 2. 非同步通知後端資料庫寫入新 Order
    try {
      await taskApi.updateCategoryOrder(draggableId, newOrder);
    } catch (error) {
      console.error('Failed to update category order:', error);
      showError('Failed to save list order');
    }
  };

  return (
    <div className="w-64 h-full bg-[#1e1e1e] text-zinc-300 flex flex-col py-4 border-r border-zinc-800/40 select-none">
      
      {/* 智能過濾器 */}
      <div className="space-y-0.5 px-2 mb-6">
        {smartFilters.map((filter) => {
          const isActive = selectedView === 'filter' && activeFilter === filter.id;
          return (
            <button
              key={filter.id}
              onClick={() => handleSelectFilter(filter.id)}
              className={`w-full flex items-center px-3 py-2 text-sm rounded-md transition-colors ${isActive
                  ? 'bg-zinc-800 text-white font-medium'
                  : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'
                }`}
            >
              <filter.icon className={`h-4 w-4 mr-3 ${isActive ? 'text-blue-400' : 'text-zinc-500'}`} />
              {filter.name}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-6">
        {/* 自訂分類區 (Lists) */}
        <div>
          <div className="px-3 mb-2 flex items-center justify-between text-xs font-bold text-zinc-600 tracking-wider uppercase">
            <span>Lists</span>
            <button onClick={() => setIsAdding(!isAdding)} className="text-zinc-500 hover:text-zinc-300">
              <PlusIcon className="h-3.5 w-3.5" />
            </button>
          </div>

          {isAdding && (
            <form onSubmit={handleAddCategory} className="px-2 mb-2">
              <input
                type="text"
                placeholder="New list..."
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                autoFocus
              />
            </form>
          )}

          {/* 🎯 DragDropContext 拖曳控制包裝層 */}
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="categories-droppable" type="CATEGORY">
              {(provided) => (
                <div 
                  className="space-y-0.5"
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {categories.map((category, index) => {
                    const isSelected = selectedView === 'category' && selectedCategoryId === category.id;
                    
                    return (
                      <Draggable 
                        key={category.id} 
                        draggableId={category.id.toString()} 
                        index={index}
                      >
                        {(dragProvided, snapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            onClick={() => handleSelectCategory(category.id)}
                            className={`group flex items-center justify-between px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors ${
                              isSelected ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'
                            } ${snapshot.isDragging ? 'bg-zinc-800/80 shadow-lg border border-zinc-700/40' : ''}`}
                            style={{ ...dragProvided.draggableProps.style }}
                          >
                            <div className="flex items-center min-w-0 flex-1">
                              <Bars3Icon className="h-4 w-4 mr-3 text-zinc-500 group-hover:text-zinc-400 flex-shrink-0" />
                              {editingId === category.id ? (
                                <input
                                  type="text"
                                  value={editName}
                                  onChange={e => setEditName(e.target.value)}
                                  onClick={e => e.stopPropagation()}
                                  className="bg-zinc-700 text-white border border-zinc-600 rounded px-1.5 py-0.5 text-xs w-32 focus:outline-none"
                                  autoFocus
                                  onBlur={handleSaveEdit}
                                  onKeyDown={e => e.key === 'Enter' && handleSaveEdit(e)}
                                />
                              ) : (
                                <span className="truncate">{category.name}</span>
                              )}
                            </div>

                            {category?.id && !category.id.toString().startsWith('inbox_') && (
                              <div className="hidden group-hover:flex items-center space-x-1 flex-shrink-0">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingId(category.id);
                                    setEditName(category.name);
                                  }}
                                  className="text-zinc-500 hover:text-blue-400 p-0.5"
                                >
                                  <PencilIcon className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => handleDeleteCategory(e, category.id)}
                                  className="text-zinc-500 hover:text-red-400 p-0.5"
                                >
                                  <TrashIcon className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>

        {/* 狀態過濾區 */}
        <div className="border-t border-zinc-800/40 pt-4">
          <div className="space-y-0.5">
            {statusFilters.map((filter) => {
              const isActive = selectedView === 'filter' && activeFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  onClick={() => handleSelectFilter(filter.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm rounded-md transition-colors ${isActive
                      ? 'bg-zinc-800 text-white font-medium'
                      : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'
                    }`}
                >
                  <filter.icon className={`h-4 w-4 mr-3 ${isActive ? 'text-blue-400' : 'text-zinc-500'}`} />
                  {filter.name}
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}