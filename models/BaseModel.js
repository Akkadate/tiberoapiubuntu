// models/BaseModel.js - Base class for database operations
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

    // Execute custom SQL
    async customQuery(sql) {
        return await this.executor.executeQuery(sql);
    }
}

module.exports = BaseModel;
