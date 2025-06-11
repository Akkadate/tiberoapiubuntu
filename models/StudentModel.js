// models/StudentModel.js - STUDENT table operations
const BaseModel = require('./BaseModel');

class StudentModel extends BaseModel {
    constructor() {
        super('STUDENT');
        this.thaiColumns = ['STUDENTNAME', 'ADDRESS']; // คอลัมน์ที่มีภาษาไทย
    }

    // Get all students with Thai support
    async getAllStudents(limit = 50) {
        // Query for Thai columns using DUMP
        const thaiQuery = `
            SELECT STUDENTID, 
                   DUMP(STUDENTNAME) as STUDENTNAME_DUMP,
                   DUMP(ADDRESS) as ADDRESS_DUMP
            FROM STUDENT 
            WHERE ROWNUM <= ${limit}
        `;
        
        // Query for other columns
        const otherQuery = `
            SELECT STUDENTID, EMAIL, PHONE, REGISTDATE, STATUS
            FROM STUDENT 
            WHERE ROWNUM <= ${limit}
        `;
        
        const [thaiData, otherData] = await Promise.all([
            this.executor.executeQuery(thaiQuery).catch(() => []),
            this.executor.executeQuery(otherQuery).catch(() => [])
        ]);
        
        return this.executor.mergeDataByStudentId(thaiData, otherData);
    }

    // Search students by name (Thai support)
    async searchByName(searchTerm, limit = 20) {
        // สำหรับการค้นหาภาษาไทย อาจต้องใช้ LIKE หรือ custom function
        const sql = `
            SELECT STUDENTID, 
                   DUMP(STUDENTNAME) as STUDENTNAME_DUMP,
                   EMAIL, PHONE 
            FROM STUDENT 
            WHERE STUDENTNAME LIKE '%${searchTerm}%' 
            AND ROWNUM <= ${limit}
        `;
        
        return await this.customQuery(sql);
    }

    // Get student with all related data
    async getStudentDetails(studentId) {
        const student = await this.findById('STUDENTID', studentId);
        
        if (!student) return null;
        
        // Get related thesis data
        const thesisQuery = `
            SELECT THESISID, 
                   DUMP(THESISNAME) as THESISNAME_DUMP,
                   THESISNAMEENG, COMPLETEDATE
            FROM THESIS 
            WHERE STUDENTID = '${studentId}'
        `;
        
        const thesis = await this.customQuery(thesisQuery);
        
        return {
            student: student,
            thesis: thesis
        };
    }

    // Get students by graduation year
    async getByGraduationYear(year, limit = 100) {
        const conditions = `EXTRACT(YEAR FROM GRADUATIONDATE) = ${year}`;
        return await this.select('*', conditions, limit, 'GRADUATIONDATE DESC');
    }
}

module.exports = StudentModel;

