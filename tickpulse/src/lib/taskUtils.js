/**
 * Filters an array of tasks based on a specified category.
 * @param {Array<Object>} tasks - The array of task objects to filter. Each task should have a 'status' and optionally 'isToday'.
 * @param {String} category - The category to filter by ('all', 'today', 'completed', 'abandoned').
 * @returns {Array<Object>} The filtered and sorted array of tasks.
 */
export const filterTasks = (tasks, category) => {
    switch (category) {
      case 'all':
        // Return all tasks that are not 'abandoned', with 'completed' tasks sorted to the end.
        return tasks
          .filter(task => task.status !== 'abandoned')
          .sort((a, b) => (a.status === 'completed' ? 1 : 0) - (b.status === 'completed' ? 1 : 0));
      case 'today':
        // Return tasks that are 'active' and marked as 'isToday'.
        return tasks.filter(task => task.status === 'active' && task.isToday);
      case 'completed':
        // Return tasks with 'completed' status.
        return tasks.filter(task => task.status === 'completed');
      case 'abandoned':
        // Return tasks with 'abandoned' status.
        return tasks.filter(task => task.status === 'abandoned');
      default:
        // If category is not recognized, return all tasks.
        return tasks;
    }
  };
  
  /**
   * Gets a user-friendly display name for a given task category key.
   * @param {String} category - The category key ('all', 'today', 'completed', 'abandoned').
   * @returns {String} The display name for the category, or an empty string if not found.
   */
  export const getCategoryName = (category) => {
    switch (category) {
      case 'all':
        return 'All Tasks';
      case 'today':
        return `Today's Tasks`;
      case 'completed':
        return 'Completed Tasks';
      case 'abandoned':
        return 'Abandoned Tasks';
      default:
        return ''; // Return empty for unknown categories
    }
  };