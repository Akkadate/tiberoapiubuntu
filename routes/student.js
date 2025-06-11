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
        const student = await studentModel.findById('STUDENTID', studentId);
        
        if (!student) {
            return res.status(404).json({
                error: 'Student not found',
                studentId: studentId
            });
        }
        
        res.json(student);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
