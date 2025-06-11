// models/BaseModel.js - Base class สำหรับ database operations
const TiberoExecutor = require('../utils/tiberoExecutor');

class BaseModel {
    constructor(tableName, dsn = 'NBU_DSN') {
        this.tableName = tableName;
        this.executor = new TiberoExecutor(dsn);
    }

    // Generic SELECT with conditions
    async select(columns = '*', conditions = '', limit = null, orderBy = '') {
        let sql = `SELECT ${columns} FROM ${this.tableName}`;
        
        if (conditions) {
            sql += ` WHERE ${conditions}`;
        }
        
        if (orderBy) {
            sql += ` ORDER BY ${orderBy}`;
        }
        
        if (limit) {
            sql += ` AND ROWNUM <= ${limit}`;
        }
        
        return await this.executor.executeQuery(sql);
    }

    // Count records
    async count(conditions = '') {
        let sql = `SELECT COUNT(*) as total_count FROM ${this.tableName}`;
        
        if (conditions) {
            sql += ` WHERE ${conditions}`;
        }
        
        const result = await this.executor.executeQuery(sql);
        return result[0]?.total_count || 0;
    }

    // Find by ID
    async findById(idColumn, idValue) {
        const conditions = `${idColumn} = '${idValue}'`;
        const result = await this.select('*', conditions, 1);
        return result.length > 0 ? result[0] : null;
    }

    // Search with pagination
    async paginate(page = 1, pageSize = 10, conditions = '', orderBy = '') {
        const offset = (page - 1) * pageSize;
        const total = await this.count(conditions);
        
        let sql = `SELECT * FROM ${this.tableName}`;
        
        if (conditions) {
            sql += ` WHERE ${conditions}`;
        }
        
        if (orderBy) {
            sql += ` ORDER BY ${orderBy}`;
        }
        
        // Tibero pagination using ROWNUM
        sql = `SELECT * FROM (
            SELECT rownum rn, a.* FROM (${sql}) a 
            WHERE rownum <= ${offset + pageSize}
        ) WHERE rn > ${offset}`;
        
        const data = await this.executor.executeQuery(sql);
        
        return {
            data: data,
            pagination: {
                page: page,
                pageSize: pageSize,
                total: total,
                totalPages: Math.ceil(total / pageSize),
                hasNext: page * pageSize < total,
                hasPrev: page > 1
            }
        };
    }

    // Execute custom SQL
    async customQuery(sql) {
        return await this.executor.executeQuery(sql);
    }
}

module.exports = BaseModel;

