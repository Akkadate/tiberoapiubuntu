// models/StudentModel.js - STUDENT table operations
const BaseModel = require('./BaseModel');

class StudentModel extends BaseModel {
    constructor() {
        super('STUDENT');
    }

    // Get all students
    async getAllStudents(limit = 50) {
        return await this.select('*', '', limit, 'STUDENTID');
    }

    // Search students by name
    async searchByName(searchTerm, limit = 20) {
        const conditions = `STUDENTNAME LIKE '%${searchTerm}%'`;
        return await this.select('*', conditions, limit);
    }
}

module.exports = StudentModel;
