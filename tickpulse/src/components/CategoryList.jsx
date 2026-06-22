'use client';

import { useState, useEffect } from 'react';
import { useTasks } from '@/context/TaskContext';
import { taskApi } from '@/context/TaskContext';
import { useToast } from '@/context/ToastContext';
import { PlusIcon, PencilIcon, TrashIcon, FolderIcon } from '@heroicons/react/24/outline';

/**
 * @component CategoryList
 * @description Component for displaying and managing task categories.
 */
export default function CategoryList() {
  // 💡 安全防護：給予 categories 一個預設的空陣列 []，防止 .map() 報錯
  const { categories = [], dispatch, selectedCategoryId, selectedView } = useTasks();
  const { showSuccess, showError } = useToast();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 從後端拉取真實分類資料
  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const fetchedCategories = await taskApi.getAllCategories();
      // 💡 確保後端傳回的是陣列才進行 map
      if (Array.isArray(fetchedCategories)) {
        const transformedCategories = fetchedCategories.map(cat => ({
          // 相容後端傳回的 id 或 category_id 欄位
          id: cat.id || cat.category_id, 
          name: cat.category_name || cat.name || 'Unnamed Category'
        }));

        dispatch({
          type: 'SET_CATEGORIES',
          payload: transformedCategories
        });
      }
    } catch (error) {
      console.error('Failed to fetch categories from server:', error);
      showError('Failed to load categories from server');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAddCategory = async (e) => {
    e.preventDefault();
    const trimmedName = newCategoryName.trim();
    if (!trimmedName) return;

    try {
      const response = await taskApi.createCategory(trimmedName);
      // 假設後端回傳新建的物件 { id: '...', category_name: '...' }
      const newCat = {
        id: response.id || response.category_id,
        name: response.category_name || trimmedName
      };

      dispatch({ type: 'ADD_CATEGORY', payload: newCat });
      setNewCategoryName('');
      setIsAdding(false);
      showSuccess('Category created successfully');
    } catch (error) {
      showError('Failed to create category');
    }
  };

  const handleDeleteCategory = async (e, categoryId) => {
    e.stopPropagation();
    // 💡 防護機制：禁止刪除預設收件匣
    if (categoryId && categoryId.toString().startsWith('inbox_')) {
      showError('Cannot delete the default Inbox category');
      return;
    }

    if (confirm('Are you sure you want to delete this category?')) {
      try {
        await taskApi.deleteCategory(categoryId);
        dispatch({ type: 'DELETE_CATEGORY', payload: categoryId });
        showSuccess('Category deleted');
      } catch (error) {
        showError('Failed to delete category');
      }
    }
  };

  const handleStartEdit = (e, categoryId, currentName) => {
    e.stopPropagation();
    if (categoryId && categoryId.toString().startsWith('inbox_')) {
      showError('Cannot edit the default Inbox category');
      return;
    }
    setEditingId(categoryId);
    setEditName(currentName);
  };

  const handleSaveEdit = async (e) => {
    if (e) e.preventDefault();
    const trimmedName = editName.trim();
    if (!trimmedName || trimmedName === '') return;

    try {
      await taskApi.updateCategory(editingId, trimmedName);
      dispatch({
        type: 'RENAME_CATEGORY',
        payload: { categoryId: editingId, newName: trimmedName }
      });
      setEditingId(null);
      showSuccess('Category renamed');
    } catch (error) {
      showError('Failed to rename category');
    }
  };

  const handleCancelEdit = (e) => {
    if (e) e.stopPropagation();
    setEditingId(null);
  };

  return (
    <div className="mt-6">
      <div className="px-4 mb-2 flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
        <span>Categories</span>
        <button 
          onClick={() => setIsAdding(!isAdding)} 
          className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200"
        >
          <PlusIcon className="h-4 w-4" />
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAddCategory} className="px-4 mb-3">
          <input
            type="text"
            placeholder="Category name..."
            value={newCategoryName}
            onChange={e => setNewCategoryName(e.target.value)}
            className="w-full bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-black dark:text-white"
            autoFocus
          />
        </form>
      )}

      {isLoading && categories.length === 0 ? (
        <p className="px-4 text-xs text-gray-400">Loading...</p>
      ) : (
        <nav className="space-y-1 px-2">
          {/* 💡 這裡加上 Array.isArray 的終極保險，保證不報 map 錯誤 */}
          {Array.isArray(categories) && categories.map(category => {
            const isSelected = selectedView === 'category' && selectedCategoryId === category.id;
            return (
              <div
                key={category.id}
                onClick={() => {
                  dispatch({ type: 'SET_VIEW', payload: 'category' });
                  dispatch({ type: 'SELECT_CATEGORY', payload: category.id });
                }}
                className={`group flex items-center justify-between px-2 py-2 text-sm font-medium rounded-md cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-gray-100 dark:bg-zinc-800 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800/50 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center min-w-0">
                  <FolderIcon className={`mr-3 h-5 w-5 flex-shrink-0 ${isSelected ? 'text-blue-500' : 'text-gray-400'}`} />
                  {editingId === category.id ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onClick={e => e.stopPropagation()}
                      className="bg-white dark:bg-zinc-700 border border-gray-300 dark:border-zinc-600 rounded px-2 py-0.5 text-sm w-32 text-black dark:text-white"
                      autoFocus
                      onBlur={handleSaveEdit}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSaveEdit(e);
                        if (e.key === 'Escape') handleCancelEdit(e);
                      }}
                    />
                  ) : (
                    <span className="truncate">{category.name}</span>
                  )}
                </div>

                {/* 預設的 Inbox 不顯示刪除與編輯按鈕 */}
                {category.id && !category.id.toString().startsWith('inbox_') && (
                  <div className="flex-shrink-0 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={e => handleStartEdit(e, category.id, category.name)} className="text-gray-400 hover:text-blue-500 p-0.5">
                      <PencilIcon className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={e => handleDeleteCategory(e, category.id)} className="text-gray-400 hover:text-red-500 p-0.5">
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      )}
    </div>
  );
}