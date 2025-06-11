// routes/course.js - Course routes
const express = require('express');
const router = express.Router();
const CourseModel = require('../models/CourseModel');

const courseModel = new CourseModel();

// GET /api/courses - Get all courses
router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const courses = await courseModel.getAllCourses(limit);
        
        res.json({
            count: courses.length,
            limit: limit,
            data: courses
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/courses/:id - Get course by ID
router.get('/:id', async (req, res) => {
    try {
        const courseId = req.params.id;
        const course = await courseModel.findById('COURSEID', courseId);
        
        if (!course) {
            return res.status(404).json({
                error: 'Course not found',
                courseId: courseId
            });
        }
        
        res.json(course);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
