const BaseModel = require('./BaseModel');

class QuotaModel extends BaseModel {
    constructor() {
        super('QUOTA');
    }

    // ดึงโควต้าทั้งหมดด้วย DUMP สำหรับภาษาไทย
    async getAllQuotas(limit = 100) {
        try {
            const sql = `
                SELECT QUOTAID, ACADYEAR, SEMESTER, FACULTYID, TOTALSEAT, ENROLLSEAT,
                       DUMP(QUOTANAME) as QUOTANAME_DUMP, QUOTACODE, SHOWWEBSTATUS, 
                       EXAMDATE, CENTERID, QUOTASTATUS
                FROM ${this.tableName} 
                WHERE ROWNUM <= ${limit} 
                ORDER BY QUOTAID
            `;
            console.log('Executing getAllQuotas SQL:', sql);
            return await this.customQuery(sql);
        } catch (error) {
            console.error('getAllQuotas error:', error);
            throw error;
        }
    }

    // ค้นหาโควต้าตาม QUOTAID
    async getQuotaById(quotaId) {
        try {
            const sql = `
                SELECT QUOTAID, ACADYEAR, SEMESTER, FACULTYID, TOTALSEAT, ENROLLSEAT,
                       DUMP(QUOTANAME) as QUOTANAME_DUMP, QUOTACODE, SHOWWEBSTATUS, 
                       EXAMDATE, CENTERID, QUOTASTATUS
                FROM ${this.tableName} 
                WHERE QUOTAID = '${quotaId}'
            `;
            const result = await this.customQuery(sql);
            return result.length > 0 ? result[0] : null;
        } catch (error) {
            console.error('getQuotaById error:', error);
            throw error;
        }
    }

    // ค้นหาโควต้าตามปีการศึกษา
    async getQuotasByYear(acadYear, limit = 50) {
        try {
            const sql = `
                SELECT QUOTAID, ACADYEAR, SEMESTER, FACULTYID, TOTALSEAT, ENROLLSEAT,
                       DUMP(QUOTANAME) as QUOTANAME_DUMP, QUOTACODE, SHOWWEBSTATUS, 
                       EXAMDATE, CENTERID, QUOTASTATUS
                FROM ${this.tableName} 
                WHERE ACADYEAR = ${acadYear}
                AND ROWNUM <= ${limit}
                ORDER BY SEMESTER, QUOTAID
            `;
            return await this.customQuery(sql);
        } catch (error) {
            console.error('getQuotasByYear error:', error);
            throw error;
        }
    }

    // ค้นหาโควต้าตามเทอม
    async getQuotasBySemester(acadYear, semester, limit = 50) {
        try {
            const sql = `
                SELECT QUOTAID, ACADYEAR, SEMESTER, FACULTYID, TOTALSEAT, ENROLLSEAT,
                       DUMP(QUOTANAME) as QUOTANAME_DUMP, QUOTACODE, SHOWWEBSTATUS, 
                       EXAMDATE, CENTERID, QUOTASTATUS
                FROM ${this.tableName} 
                WHERE ACADYEAR = ${acadYear} AND SEMESTER = ${semester}
                AND ROWNUM <= ${limit}
                ORDER BY QUOTAID
            `;
            return await this.customQuery(sql);
        } catch (error) {
            console.error('getQuotasBySemester error:', error);
            throw error;
        }
    }

    // ค้นหาโควต้าตาม faculty
    async getQuotasByFaculty(facultyId, limit = 50) {
        try {
            const sql = `
                SELECT QUOTAID, ACADYEAR, SEMESTER, FACULTYID, TOTALSEAT, ENROLLSEAT,
                       DUMP(QUOTANAME) as QUOTANAME_DUMP, QUOTACODE, SHOWWEBSTATUS, 
                       EXAMDATE, CENTERID, QUOTASTATUS
                FROM ${this.tableName} 
                WHERE FACULTYID = '${facultyId}'
                AND ROWNUM <= ${limit}
                ORDER BY ACADYEAR DESC, SEMESTER
            `;
            return await this.customQuery(sql);
        } catch (error) {
            console.error('getQuotasByFaculty error:', error);
            throw error;
        }
    }

    // ดู quota statistics
    async getQuotaStats() {
        try {
            const sql = `
                SELECT 
                    COUNT(*) as total_quotas,
                    SUM(TOTALSEAT) as total_seats,
                    SUM(ENROLLSEAT) as total_enrolled,
                    MIN(ACADYEAR) as min_year,
                    MAX(ACADYEAR) as max_year,
                    COUNT(DISTINCT FACULTYID) as total_faculties
                FROM ${this.tableName}
            `;
            const result = await this.customQuery(sql);
            return result[0] || {};
        } catch (error) {
            console.error('getQuotaStats error:', error);
            return {};
        }
    }

    // ทดสอบการเชื่อมต่อ
    async testConnection() {
        try {
            const countResult = await this.customQuery('SELECT COUNT(*) as count FROM QUOTA');
            const sampleResult = await this.customQuery('SELECT QUOTAID, DUMP(QUOTANAME) as QUOTANAME_DUMP, ACADYEAR FROM QUOTA WHERE ROWNUM <= 3');
            
            return { 
                success: true, 
                message: 'QUOTA table found!',
                count: countResult[0]?.count || 0,
                sample: sampleResult
            };
        } catch (error) {
            return { 
                success: false, 
                error: error.message 
            };
        }
    }

    // ดูโครงสร้างตาราง
    async getTableStructure() {
        try {
            const result = await this.customQuery(`
                SELECT column_name, data_type, data_length, nullable
                FROM user_tab_columns 
                WHERE table_name = 'QUOTA' 
                ORDER BY column_id
            `);
            return result;
        } catch (error) {
            return { error: error.message };
        }
    }

    // นับจำนวนโควต้าทั้งหมด
    async getTotalQuotaCount() {
        try {
            const result = await this.customQuery('SELECT COUNT(*) as total_count FROM QUOTA');
            return result[0]?.total_count || 0;
        } catch (error) {
            console.error('getTotalQuotaCount error:', error);
            return 0;
        }
    }
}

module.exports = QuotaModel;
