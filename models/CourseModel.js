// models/CourseModel.js - COURSE table operations
const BaseModel = require('./BaseModel');

class CourseModel extends BaseModel {
    constructor() {
        super('COURSE');
    }

    // Get all courses with Thai course names
    async getAllCourses(limit = 100) {
        const thaiQuery = `
            SELECT COURSEID, 
                   DUMP(COURSENAME) as COURSENAME_DUMP,
                   DUMP(DESCRIPTION) as DESCRIPTION_DUMP
            FROM COURSE 
            WHERE ROWNUM <= ${limit}
        `;
        
        const otherQuery = `
            SELECT COURSEID, COURSENAMEENG, CREDITS, 
                   SEMESTER, ACADEMICYEAR, STATUS
            FROM COURSE 
            WHERE ROWNUM <= ${limit}
        `;
        
        const [thaiData, otherData] = await Promise.all([
            this.executor.executeQuery(thaiQuery).catch(() => []),
            this.executor.executeQuery(otherQuery).catch(() => [])
        ]);
        
        return this.executor.mergeDataByCourseId(thaiData, otherData);
    }

    // Get courses by semester
    async getBySemester(semester, academicYear, limit = 50) {
        const conditions = `SEMESTER = ${semester} AND ACADEMICYEAR = ${academicYear}`;
        return await this.select('*', conditions, limit, 'COURSEID');
    }

    // Get course with enrolled students
    async getCourseWithStudents(courseId) {
        const course = await this.findById('COURSEID', courseId);
        
        if (!course) return null;
        
        const studentsQuery = `
            SELECT s.STUDENTID, 
                   DUMP(s.STUDENTNAME) as STUDENTNAME_DUMP,
                   e.ENROLLDATE, e.GRADE
            FROM STUDENT s
            JOIN ENROLLMENT e ON s.STUDENTID = e.STUDENTID
            WHERE e.COURSEID = '${courseId}'
            ORDER BY s.STUDENTID
        `;
        
        const students = await this.customQuery(studentsQuery);
        
        return {
            course: course,
            students: students,
            totalStudents: students.length
        };
    }
}

module.exports = CourseModel;

