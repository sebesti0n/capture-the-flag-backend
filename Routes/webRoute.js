const express = require('express');
const router = express.Router();
const knex = require('knex')(require('../Configuration/knexfile')['development']);
const contestController = require('../WEbController/contestController')

router.get('/startContest',contestController.startEvent);
router.get('/riddle',contestController.riddleStoryLine);
router.post('/submit',contestController.onSubmit);

module.exports = router;
