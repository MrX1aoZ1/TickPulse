'use client';

import { useState, useEffect } from 'react';
import { useTasks, taskApi } from '@/context/TaskContext';
import { useToast } from '@/context/ToastContext';
import {
  PlusIcon, PencilIcon, TrashIcon,
  CalendarIcon, InboxIcon, RectangleStackIcon,
  Bars3Icon, CheckCircleIcon, XCircleIcon,
  ClockIcon // 引入適合 Next 7 Days 的圖標
} from '@heroicons/react/24/outline';

// 頂部內建的智能過濾器（新增了 Next 7 Days）
const smartFilters = [
  { id: 'all', name: 'All Tasks', icon: RectangleStackIcon },
  { id: 'today', name: 'Today\'s Tasks', icon: CalendarIcon },
  { id: 'next7', name: 'Next 7 Days', icon: ClockIcon }, // 🎯 新增的 7 天過濾器
];

// 原本在底部的過濾器，現在定義好準備放到 Lists 下方
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

  // 初始化拉取真實分類資料
  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoading(true);
      try {
        const fetched = await taskApi.getAllCategories();
        if (Array.isArray(fetched)) {
          const transformed = fetched.map(cat => ({
            id: cat.id || cat.category_id,
            name: cat.category_name || cat.name || 'Unnamed Category'
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

  // 統一點擊過濾器處理
  const handleSelectFilter = (filterId) => {
    dispatch({ type: 'SET_VIEW', payload: 'filter' });
    dispatch({ type: 'SET_FILTER', payload: filterId });
  };

  // 點擊自訂分類
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
      console.log(response);
      const newCat = {
        id: response?.category_id,
        name: response?.name
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

  return (
    <div className="w-64 h-full bg-[#1e1e1e] text-zinc-300 flex flex-col py-4 border-r border-zinc-800/40 select-none">

      {/* 1. 內建過濾區 */}
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

      {/* 可滾動的下方區域（包含自訂 Lists 與 狀態過濾器） */}
      <div className="flex-1 overflow-y-auto px-2 space-y-6">

        {/* 2. 自訂分類區 (Lists) */}
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

          <div className="space-y-0.5">
            {categories.map((category) => {
              const isSelected = selectedView === 'category' && selectedCategoryId === category.id;
              return (
                <div
                  key={category.id}
                  onClick={() => handleSelectCategory(category.id)}
                  className={`group flex items-center justify-between px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors ${isSelected ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'
                    }`}
                >
                  <div className="flex items-center min-w-0 flex-1">
                    <Bars3Icon className="h-4 w-4 mr-3 text-zinc-500 group-hover:text-zinc-400" />
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
                    <div className="hidden group-hover:flex items-center space-x-1">
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
              );
            })}
          </div>
        </div>

        {/* 🎯 3. 狀態過濾區 (現在完美移到了自訂 Category 的正下方) */}
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