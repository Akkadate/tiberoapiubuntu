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

// GET /api/courses/:id/students - Get course with enrolled students
router.get('/:id/students', async (req, res) => {
    try {
        const courseId = req.params.id;
        const courseWithStudents = await courseModel.getCourseWithStudents(courseId);
        
        if (!courseWithStudents) {
            return res.status(404).json({
                error: 'Course not found',
                courseId: courseId
            });
        }
        
        res.json(courseWithStudents);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/courses/semester/:semester/year/:year - Get courses by semester
router.get('/semester/:semester/year/:year', async (req, res) => {
    try {
        const semester = parseInt(req.params.semester);
        const academicYear = parseInt(req.params.year);
        const limit = parseInt(req.query.limit) || 50;
        
        const courses = await courseModel.getBySemester(semester, academicYear, limit);
        
        res.json({
            semester: semester,
            academicYear: academicYear,
            count: courses.length,
            data: courses
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

