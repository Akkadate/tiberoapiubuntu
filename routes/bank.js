// routes/bank.js - Bank API routes
const express = require('express');
const router = express.Router();
const BankModel = require('../models/BankModel');

const bankModel = new BankModel();

// GET /api/bank - ดึงธนาคารทั้งหมด
router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const banks = await bankModel.getAllBanks(limit);
        
        res.json({
            message: 'Bank data retrieved successfully',
            count: banks.length,
            limit: limit,
            data: banks
        });
    } catch (error) {
        console.error('Error getting banks:', error);
        res.status(500).json({ 
            error: error.message,
            endpoint: '/api/bank'
        });
    }
});

// GET /api/bank/count - นับจำนวนธนาคาร
router.get('/count', async (req, res) => {
    try {
        const totalCount = await bankModel.getTotalBankCount();
        
        res.json({
            message: 'Total bank count',
            total_banks: totalCount
        });
    } catch (error) {
        console.error('Error counting banks:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/bank/search/:term - ค้นหาธนาคารตามชื่อ
router.get('/search/:term', async (req, res) => {
    try {
        const searchTerm = req.params.term;
        const limit = parseInt(req.query.limit) || 20;
        
        const banks = await bankModel.searchBankByName(searchTerm, limit);
        
        res.json({
            message: `Search results for: ${searchTerm}`,
            searchTerm: searchTerm,
            count: banks.length,
            data: banks
        });
    } catch (error) {
        console.error('Error searching banks:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/bank/fee/:maxFee - ธนาคารที่ค่าธรรมเนียมไม่เกินที่กำหนด
router.get('/fee/:maxFee', async (req, res) => {
    try {
        const maxFee = parseFloat(req.params.maxFee);
        const limit = parseInt(req.query.limit) || 50;
        
        const banks = await bankModel.getBanksByMaxFee(maxFee, limit);
        
        res.json({
            message: `Banks with transaction fee <= ${maxFee}`,
            maxFee: maxFee,
            count: banks.length,
            data: banks
        });
    } catch (error) {
        console.error('Error getting banks by fee:', error);
        res.status(500).json({ error: error.message });
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
