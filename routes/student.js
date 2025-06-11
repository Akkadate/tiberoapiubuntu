// routes/student.js - Student routes
const express = require('express');
const router = express.Router();
const StudentModel = require('../models/StudentModel');

const studentModel = new StudentModel();

// GET /api/students - Get all students
router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const students = await studentModel.getAllStudents(limit);
        
        res.json({
            count: students.length,
            limit: limit,
            data: students
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/students/:id - Get student by ID
router.get('/:id', async (req, res) => {
    try {
        const studentId = req.params.id;
        const studentDetails = await studentModel.getStudentDetails(studentId);
        
        if (!studentDetails) {
            return res.status(404).json({
                error: 'Student not found',
                studentId: studentId
            });
        }
        
        res.json(studentDetails);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/students/search/:term - Search students
router.get('/search/:term', async (req, res) => {
    try {
        const searchTerm = req.params.term;
        const limit = parseInt(req.query.limit) || 20;
        
        const results = await studentModel.searchByName(searchTerm, limit);
        
        res.json({
            searchTerm: searchTerm,
            count: results.length,
            data: results
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/students/year/:year - Get students by graduation year
router.get('/year/:year', async (req, res) => {
    try {
        const year = parseInt(req.params.year);
        const limit = parseInt(req.query.limit) || 100;
        
        const students = await studentModel.getByGraduationYear(year, limit);
        
        res.json({
            graduationYear: year,
            count: students.length,
            data: students
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/students/paginate - Paginated students
router.get('/paginate', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const orderBy = req.query.orderBy || 'STUDENTID';
        
        const result = await studentModel.paginate(page, pageSize, '', orderBy);
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

