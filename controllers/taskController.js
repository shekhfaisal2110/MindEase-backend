// const Task = require('../models/Task');

// // Allowed fields for update (to prevent mass assignment)
// const ALLOWED_UPDATES = ['title', 'description', 'completed', 'dueDate', 'priority'];

// // Get tasks with pagination, filtering, and sorting
// exports.getTasks = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 20;
//     const skip = (page - 1) * limit;
//     const { completed, priority, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

//     // Build filter
//     const filter = { user: req.user._id };
//     if (completed !== undefined) filter.completed = completed === 'true';
//     if (priority) filter.priority = priority;

//     // Build sort
//     const sort = {};
//     sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

//     const [tasks, total] = await Promise.all([
//       Task.find(filter)
//         .sort(sort)
//         .skip(skip)
//         .limit(limit)
//         .select('title description completed dueDate priority createdAt')
//         .lean(),
//       Task.countDocuments(filter)
//     ]);

//     res.json({
//       tasks,
//       pagination: { page, limit, total, pages: Math.ceil(total / limit) }
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // Create a new task (with validation)
// exports.createTask = async (req, res) => {
//   try {
//     const { title, description, dueDate, priority } = req.body;
//     if (!title || title.trim().length === 0) {
//       return res.status(400).json({ message: 'Title is required' });
//     }
//     const task = new Task({
//       user: req.user._id,
//       title: title.trim(),
//       description: description?.trim() || '',
//       dueDate: dueDate || null,
//       priority: priority || 'medium'
//     });
//     await task.save();
//     res.status(201).json(task);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // Update task (only allowed fields, atomic)
// exports.updateTask = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const updates = {};
//     for (const field of ALLOWED_UPDATES) {
//       if (req.body[field] !== undefined) {
//         if (field === 'title') updates.title = req.body.title?.trim();
//         else if (field === 'description') updates.description = req.body.description?.trim();
//         else if (field === 'dueDate') updates.dueDate = req.body.dueDate || null;
//         else updates[field] = req.body[field];
//       }
//     }
//     if (Object.keys(updates).length === 0) {
//       return res.status(400).json({ message: 'No valid fields to update' });
//     }

//     const task = await Task.findOneAndUpdate(
//       { _id: id, user: req.user._id },
//       { $set: updates },
//       { new: true, lean: true }
//     );
//     if (!task) return res.status(404).json({ message: 'Task not found' });
//     res.json(task);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // Delete task
// exports.deleteTask = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const task = await Task.findOneAndDelete({ _id: id, user: req.user._id });
//     if (!task) return res.status(404).json({ message: 'Task not found' });
//     res.json({ message: 'Task deleted' });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };



// controllers/taskController.js
const Task = require('../models/Task');

// Allowed fields for update (to prevent mass assignment)
const ALLOWED_UPDATES = ['title', 'description', 'completed', 'dueDate', 'priority'];

// Get tasks with cursor‑based pagination, filtering, and sorting (no skip/limit)
exports.getTasks = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const cursor = req.query.cursor || null;   // last task _id from previous page
    const { completed, priority, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Build filter
    const filter = { user: req.user._id };
    if (completed !== undefined) filter.completed = completed === 'true';
    if (priority) filter.priority = priority;

    // Build sort object for cursor consistency
    const sort = {};
    let cursorField = '_id';
    if (sortBy === 'dueDate') {
      sort.dueDate = sortOrder === 'asc' ? 1 : -1;
      cursorField = 'dueDate';
    } else if (sortBy === 'priority') {
      // priority high → low, then dueDate asc, then _id
      sort.priority = sortOrder === 'asc' ? 1 : -1;
      sort.dueDate = 1;
      cursorField = '_id';
    } else {
      sort.createdAt = sortOrder === 'asc' ? 1 : -1;
      cursorField = '_id';
    }
    // Always tie-break with _id for stable ordering
    sort._id = sortOrder === 'asc' ? 1 : -1;

    // Apply cursor if present (using the field that determines order)
    if (cursor) {
      const [cursorValue, cursorId] = cursor.split('_');
      if (sortBy === 'dueDate') {
        filter.$or = [
          { dueDate: { $gt: new Date(cursorValue) } },
          { dueDate: new Date(cursorValue), _id: { $gt: cursorId } }
        ];
      } else {
        filter._id = { $gt: cursorId };
      }
    }

    const tasks = await Task.find(filter)
      .sort(sort)
      .limit(limit)
      .select('title description completed dueDate priority createdAt')
      .lean();

    // Build nextCursor (compound cursor if needed)
    let nextCursor = null;
    if (tasks.length === limit) {
      const last = tasks[tasks.length - 1];
      if (sortBy === 'dueDate') {
        nextCursor = `${last.dueDate?.toISOString()}_${last._id}`;
      } else {
        nextCursor = last._id;
      }
    }

    res.json({
      tasks,
      nextCursor,
      hasMore: !!nextCursor,
      limit
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a new task – uses model's static createTask
exports.createTask = async (req, res) => {
  try {
    const { title, description, dueDate, priority } = req.body;
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ message: 'Title is required' });
    }
    const task = await Task.createTask({
      user: req.user._id,
      title: title.trim(),
      description: (description || '').trim(),
      dueDate: dueDate || null,
      priority: priority || 'medium'
    });
    res.status(201).json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update task – atomic findOneAndUpdate using model static or direct
exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {};
    for (const field of ALLOWED_UPDATES) {
      if (req.body[field] !== undefined) {
        if (field === 'title') updates.title = req.body.title?.trim();
        else if (field === 'description') updates.description = req.body.description?.trim();
        else if (field === 'dueDate') updates.dueDate = req.body.dueDate || null;
        else if (field === 'completed') updates.completed = req.body.completed === true;
        else updates[field] = req.body[field];
      }
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    const task = await Task.findOneAndUpdate(
      { _id: id, user: req.user._id },
      { $set: updates },
      { new: true, lean: true, runValidators: false }
    );
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete task – uses model's deleteTask
exports.deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Task.deleteTask(id, req.user._id);
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Task not found' });
    res.json({ message: 'Task deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};