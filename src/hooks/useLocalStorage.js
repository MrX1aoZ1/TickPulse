import { useState, useEffect } from 'react';

export const useLocalStorage = (key, initialValue) => {
  // 初始化状态为 initialValue
  const [value, setValue] = useState(initialValue);

  // 在组件挂载后读取 localStorage
  useEffect(() => {
    // 检查 window 对象是否存在，确保在客户端环境执行
    if (typeof window !== 'undefined') {
      const storedValue = localStorage.getItem(key);
      if (storedValue) {
        setValue(JSON.parse(storedValue));
      }
    }
  }, [key]);

  // 每次 value 或 key 变化时更新 localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }, [key, value]);

  return [value, setValue];
};