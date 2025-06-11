// models/CourseModel.js - COURSE table operations
const BaseModel = require('./BaseModel');

class CourseModel extends BaseModel {
    constructor() {
        super('COURSE');
    }

    // Get all courses
    async getAllCourses(limit = 100) {
        return await this.select('*', '', limit, 'COURSEID');
    }

    // Get courses by semester
    async getBySemester(semester, academicYear, limit = 50) {
        const conditions = `SEMESTER = ${semester} AND ACADEMICYEAR = ${academicYear}`;
        return await this.select('*', conditions, limit, 'COURSEID');
    }
}

module.exports = CourseModel;
