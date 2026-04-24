const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const timeController = require('../controllers/timeController');

// 🔐 PROTECT ALL ROUTES BELOW
router.use(auth);

// People routes
router.get('/people', timeController.getPeople);
router.post('/people', timeController.addPerson);
router.put('/people/:id', timeController.editPerson);
router.delete('/people/:id', timeController.deletePerson);

// Time entry routes
router.get('/entries/date/:date', timeController.getEntriesForDate);
router.post('/entries', timeController.addTimeEntry);
router.get('/entries/monthly/:year/:month', timeController.getMonthlySummary);
router.get('/entries/all', timeController.getAllEntries);

module.exports = router;