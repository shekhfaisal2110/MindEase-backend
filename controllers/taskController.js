// const Task = require('../models/Task');

// exports.getTasks = async (req, res) => {
//   try {
//     const tasks = await Task.find({ user: req.user._id }).sort({ createdAt: -1 });
//     res.json(tasks);
//   } catch (error) {
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// exports.createTask = async (req, res) => {
//   try {
//     const task = new Task({ ...req.body, user: req.user._id });
//     await task.save();
//     res.status(201).json(task);
//   } catch (error) {
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// exports.updateTask = async (req, res) => {
//   try {
//     const task = await Task.findOneAndUpdate(
//       { _id: req.params.id, user: req.user._id },
//       req.body,
//       { new: true }
//     );
//     if (!task) return res.status(404).json({ message: 'Task not found' });
//     res.json(task);
//   } catch (error) {
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// exports.deleteTask = async (req, res) => {
//   try {
//     const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.user._id });
//     if (!task) return res.status(404).json({ message: 'Task not found' });
//     res.json({ message: 'Task deleted' });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error' });
//   }
// };





const Task = require('../models/Task');

// Allowed fields for update (to prevent mass assignment)
const ALLOWED_UPDATES = ['title', 'description', 'completed', 'dueDate', 'priority'];

// Get tasks with pagination, filtering, and sorting
exports.getTasks = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { completed, priority, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Build filter
    const filter = { user: req.user._id };
    if (completed !== undefined) filter.completed = completed === 'true';
    if (priority) filter.priority = priority;

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select('title description completed dueDate priority createdAt')
        .lean(),
      Task.countDocuments(filter)
    ]);

    res.json({
      tasks,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a new task (with validation)
exports.createTask = async (req, res) => {
  try {
    const { title, description, dueDate, priority } = req.body;
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ message: 'Title is required' });
    }
    const task = new Task({
      user: req.user._id,
      title: title.trim(),
      description: description?.trim() || '',
      dueDate: dueDate || null,
      priority: priority || 'medium'
    });
    await task.save();
    res.status(201).json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update task (only allowed fields, atomic)
exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {};
    for (const field of ALLOWED_UPDATES) {
      if (req.body[field] !== undefined) {
        if (field === 'title') updates.title = req.body.title?.trim();
        else if (field === 'description') updates.description = req.body.description?.trim();
        else if (field === 'dueDate') updates.dueDate = req.body.dueDate || null;
        else updates[field] = req.body[field];
      }
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    const task = await Task.findOneAndUpdate(
      { _id: id, user: req.user._id },
      { $set: updates },
      { new: true, lean: true }
    );
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete task
exports.deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findOneAndDelete({ _id: id, user: req.user._id });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json({ message: 'Task deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};