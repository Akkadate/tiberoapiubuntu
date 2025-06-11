const express = require('express');
const router = express.Router();
const BankModel = require('../models/BankModel');

const bankModel = new BankModel();

// GET /api/bank/debug - ทดสอบการเชื่อมต่อ
router.get('/debug', async (req, res) => {
    try {
        const testResult = await bankModel.testConnection();
        res.json({
            message: 'Bank connection test',
            tableName: 'BANK',
            result: testResult
        });
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            message: 'Debug endpoint failed'
        });
    }
});

// GET /api/bank/setup - ใส่ข้อมูลทดสอบ
router.get('/setup', async (req, res) => {
    try {
        const setupResult = await bankModel.insertTestData();
        res.json({
            message: 'Setup test data',
            result: setupResult
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/bank/structure - ดูโครงสร้างตาราง
router.get('/structure', async (req, res) => {
    try {
        const structure = await bankModel.getTableStructure();
        res.json({
            message: 'BANK table structure',
            columns: structure
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/bank/count - นับจำนวนธนาคาร
router.get('/count', async (req, res) => {
    try {
        const totalCount = await bankModel.getTotalBankCount();
        
        res.json({
            message: 'Total bank count',
            table: 'BANK',
            total_banks: totalCount
        });
    } catch (error) {
        console.error('Error counting banks:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/bank - ดึงธนาคารทั้งหมด
router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const banks = await bankModel.getAllBanks(limit);
        
        res.json({
            message: 'Bank data retrieved successfully',
            table: 'BANK',
            count: banks.length,
            limit: limit,
            data: banks
        });
    } catch (error) {
        console.error('Error getting banks:', error);
        res.status(500).json({ 
            error: error.message,
            endpoint: '/api/bank',
            suggestion: 'Try /api/bank/debug first, then /api/bank/setup if needed'
        });
    }
});

// GET /api/bank/:code - ดึงธนาคารตาม BANKCODE
router.get('/:code', async (req, res) => {
    try {
        const bankCode = req.params.code.toUpperCase();
        const bank = await bankModel.getBankByCode(bankCode);
        
        if (!bank) {
            return res.status(404).json({
                error: 'Bank not found',
                bankCode: bankCode
            });
        }
        
        res.json({
            message: 'Bank found',
            bankCode: bankCode,
            data: bank
        });
    } catch (error) {
        console.error('Error getting bank by code:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
