const express = require('express');
const router = express.Router();
const QuotaModel = require('../models/QuotaModel');

const quotaModel = new QuotaModel();

// GET /api/quota/debug - ทดสอบการเชื่อมต่อ
router.get('/debug', async (req, res) => {
    try {
        const testResult = await quotaModel.testConnection();
        res.json({
            message: 'Quota connection test',
            tableName: 'QUOTA',
            result: testResult
        });
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            message: 'Debug endpoint failed'
        });
    }
});

// GET /api/quota/structure - ดูโครงสร้างตาราง
router.get('/structure', async (req, res) => {
    try {
        const structure = await quotaModel.getTableStructure();
        res.json({
            message: 'QUOTA table structure',
            columns: structure
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/quota/stats - สถิติโควต้า
router.get('/stats', async (req, res) => {
    try {
        const stats = await quotaModel.getQuotaStats();
        res.json({
            message: 'Quota statistics',
            stats: stats
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/quota/count - นับจำนวนโควต้า
router.get('/count', async (req, res) => {
    try {
        const totalCount = await quotaModel.getTotalQuotaCount();
        
        res.json({
            message: 'Total quota count',
            table: 'QUOTA',
            total_quotas: totalCount
        });
    } catch (error) {
        console.error('Error counting quotas:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/quota - ดึงโควต้าทั้งหมด
router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const quotas = await quotaModel.getAllQuotas(limit);
        
        res.json({
            message: 'Quota data retrieved successfully',
            table: 'QUOTA',
            count: quotas.length,
            limit: limit,
            data: quotas
        });
    } catch (error) {
        console.error('Error getting quotas:', error);
        res.status(500).json({ 
            error: error.message,
            endpoint: '/api/quota',
            suggestion: 'Try /api/quota/debug first'
        });
    }
});

// GET /api/quota/year/:year - โควต้าตามปีการศึกษา
router.get('/year/:year', async (req, res) => {
    try {
        const acadYear = parseInt(req.params.year);
        const limit = parseInt(req.query.limit) || 50;
        
        const quotas = await quotaModel.getQuotasByYear(acadYear, limit);
        
        res.json({
            message: `Quotas for academic year ${acadYear}`,
            acadYear: acadYear,
            count: quotas.length,
            data: quotas
        });
    } catch (error) {
        console.error('Error getting quotas by year:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/quota/year/:year/semester/:semester - โควต้าตามเทอม
router.get('/year/:year/semester/:semester', async (req, res) => {
    try {
        const acadYear = parseInt(req.params.year);
        const semester = parseInt(req.params.semester);
        const limit = parseInt(req.query.limit) || 50;
        
        const quotas = await quotaModel.getQuotasBySemester(acadYear, semester, limit);
        
        res.json({
            message: `Quotas for ${acadYear}/${semester}`,
            acadYear: acadYear,
            semester: semester,
            count: quotas.length,
            data: quotas
        });
    } catch (error) {
        console.error('Error getting quotas by semester:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/quota/faculty/:facultyId - โควต้าตามคณะ
router.get('/faculty/:facultyId', async (req, res) => {
    try {
        const facultyId = req.params.facultyId.toUpperCase();
        const limit = parseInt(req.query.limit) || 50;
        
        const quotas = await quotaModel.getQuotasByFaculty(facultyId, limit);
        
        res.json({
            message: `Quotas for faculty ${facultyId}`,
            facultyId: facultyId,
            count: quotas.length,
            data: quotas
        });
    } catch (error) {
        console.error('Error getting quotas by faculty:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/quota/:id - ดึงโควต้าตาม QUOTAID
router.get('/:id', async (req, res) => {
    try {
        const quotaId = req.params.id;
        const quota = await quotaModel.getQuotaById(quotaId);
        
        if (!quota) {
            return res.status(404).json({
                error: 'Quota not found',
                quotaId: quotaId
            });
        }
        
        res.json({
            message: 'Quota found',
            quotaId: quotaId,
            data: quota
        });
    } catch (error) {
        console.error('Error getting quota by ID:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
