// ... existing code ...
import { useTaskContext } from '../context/TaskContext'; // Note: This might be different from useTasks

const priorities = ['high', 'medium', 'low'];

/**
 * @component TaskFilter
 * @description Component for filtering tasks based on priority.
 * Displays buttons for each priority level to filter the task list.
 * Uses `useTaskContext` for managing priority selection.
 */
export default function TaskFilter() {
  const { selectedPriority, selectPriority } = useTaskContext(); // Ensure this context is correctly used/defined

  return (
    <div>
      {priorities.map((priority) => (
        <button
          key={priority}
          onClick={() => selectPriority(priority)} // Assumes selectPriority is a function from useTaskContext
          style={{
            backgroundColor: selectedPriority === priority ? '#2563eb' : '#f3f4f6',
            color: selectedPriority === priority ? '#fff' : '#000',
            borderRadius: '12px',
            padding: '4px 12px',
            margin: '0 4px',
            border: 'none',
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
        >
          {priority}
        </button>
      ))}
    </div>
  );
}
