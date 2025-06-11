// routes/thesis.js - Thesis routes
const express = require('express');
const router = express.Router();
const TiberoExecutor = require('../utils/tiberoExecutor');

const executor = new TiberoExecutor('NBU_DSN');

// GET /api/thesis - Get all thesis
router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        
        const thaiQuery = `SELECT STUDENTID, DUMP(THESISNAME) as THESISNAME_DUMP FROM THESIS WHERE ROWNUM <= ${limit}`;
        const otherQuery = `SELECT STUDENTID, THESISNAMEENG, COMPLETEDATE, ACADYEARTO, SEMESTERTO FROM THESIS WHERE ROWNUM <= ${limit}`;
        
        const [thaiData, otherData] = await Promise.all([
            executor.executeQuery(thaiQuery).catch(() => []),
            executor.executeQuery(otherQuery).catch(() => [])
        ]);
        
        const combinedData = executor.mergeDataByStudentId(thaiData, otherData);
        
        res.json({
            count: combinedData.length,
            limit: limit,
            data: combinedData
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/thesis/:limit - Get thesis with specific limit
router.get('/:limit', async (req, res) => {
    try {
        const limit = parseInt(req.params.limit) || 10;
        
        const thaiQuery = `SELECT STUDENTID, DUMP(THESISNAME) as THESISNAME_DUMP FROM THESIS WHERE ROWNUM <= ${limit}`;
        const otherQuery = `SELECT STUDENTID, THESISNAMEENG, COMPLETEDATE, ACADYEARTO, SEMESTERTO FROM THESIS WHERE ROWNUM <= ${limit}`;
        
        const [thaiData, otherData] = await Promise.all([
            executor.executeQuery(thaiQuery).catch(() => []),
            executor.executeQuery(otherQuery).catch(() => [])
        ]);
        
        const combinedData = executor.mergeDataByStudentId(thaiData, otherData);
        
        res.json({
            limit: limit,
            count: combinedData.length,
            data: combinedData
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
