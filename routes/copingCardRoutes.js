const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const copingCardController = require('../controllers/copingCardController');

// Public
router.get('/', copingCardController.getCards);

// User (authenticated)
router.get('/my', auth, copingCardController.getMyCards);
router.post('/', auth, copingCardController.createCard);
router.put('/:id', auth, copingCardController.updateCard);
router.delete('/:id', auth, copingCardController.deleteCard);

// Bookmarks
router.get('/bookmarks/my', auth, copingCardController.getUserBookmarks);
router.post('/bookmarks/:cardId', auth, copingCardController.addBookmark);
router.delete('/bookmarks/:cardId', auth, copingCardController.removeBookmark);

// Admin (must come after auth)
router.get('/admin/pending', auth, copingCardController.getPendingCards);
router.put('/admin/approve/:id', auth, copingCardController.approveCard);
router.delete('/admin/reject/:id', auth, copingCardController.rejectCard);
router.delete('/admin/delete/:id', auth, copingCardController.adminDeleteCard);
router.delete('/admin/any/:id', auth, copingCardController.adminDeleteAnyCard);

module.exports = router;